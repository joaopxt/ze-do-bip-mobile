/**
 * EntregaContext - Zé da Entrega
 * Context API para gerenciamento do fluxo de entrega
 *
 * ESTRATÉGIA OFFLINE RADICAL (FASE 3):
 * - SQLite é a FONTE DE VERDADE
 * - Toda mutação passa por EntregaRepository primeiro
 * - React state é refrescado do SQLite após cada operação
 * - SYNC DOWN: Puxa rota completa do backend para SQLite
 * - SYNC UP: Envia resultados do SQLite para backend
 * - Sem chamadas de rede entre SYNC DOWN e SYNC UP
 */

import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  Carga,
  CargaVolume,
  Cliente,
  ContagemCarga,
  ContagemCliente,
  ContagemOrdem,
  EntregaState,
  FaseEntrega,
  Ordem,
  Rota,
  Volume,
} from "../types/entrega";
import { Logger } from "../utils/logger";
import { useAuth } from "./AuthContext";
import EntregaRepository from "../database/repositories/EntregaRepository";
import EntregaApiService from "../services/EntregaApiService";

// ============================================================
// INTERFACE DO CONTEXT
// ============================================================

interface EntregaContextData {
  // Estado global
  state: EntregaState;
  fase: FaseEntrega;

  // Rota
  rota: Rota | null;
  carga: Carga | null;
  clientes: Cliente[];

  // Loading states
  isLoading: boolean;
  isSyncing: boolean;

  // FASE CARGA - Ações no galpão
  iniciarCarga: () => Promise<boolean>;
  biparVolumeCarga: (codigoBarras: string) => Promise<{ sucesso: boolean; mensagem: string }>;
  finalizarCarga: () => Promise<boolean>;
  getContagemCarga: () => ContagemCarga;
  getVolumesCarga: () => CargaVolume[];

  // FASE ROTA - Ações por cliente
  getClienteById: (clienteId: string) => Cliente | null;
  getOrdensCliente: (clienteId: string) => Ordem[];
  getVolumesOrdem: (ordemId: string) => Volume[];
  getVolumesFaltantes: (ordemId: string) => Volume[];
  getContagemCliente: (clienteId: string) => ContagemCliente;
  getContagemOrdem: (ordemId: string) => ContagemOrdem;

  // Ações de entrega
  iniciarEntregaCliente: (clienteId: string) => Promise<boolean>;
  biparVolumeEntrega: (ordemId: string, codigoBarras: string) => Promise<{ sucesso: boolean; mensagem: string }>;
  marcarExtraviado: (volumeId: string, observacao: string) => Promise<boolean>;
  finalizarOrdem: (ordemId: string) => Promise<boolean>;
  finalizarEntregaCliente: (clienteId: string) => Promise<boolean>;

  // SYNC
  executarSyncDown: () => Promise<boolean>;
  executarSyncUp: () => Promise<boolean>;

  // Utilidades
  limparEstado: () => void;
}

// ============================================================
// CONTEXT + PROVIDER
// ============================================================

const EntregaContext = createContext<EntregaContextData | undefined>(undefined);

interface EntregaProviderProps {
  children: ReactNode;
}

export function EntregaProvider({ children }: EntregaProviderProps) {
  const { usuario, isLoggedIn } = useAuth();

  // Estado principal
  const [fase, setFase] = useState<FaseEntrega>('LOGIN');
  const [rota, setRota] = useState<Rota | null>(null);
  const [carga, setCarga] = useState<Carga | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [ordens, setOrdens] = useState<Ordem[]>([]);
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [cargaVolumes, setCargaVolumes] = useState<CargaVolume[]>([]);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  // ============================================================
  // CORE HELPER: Recarregar estado do SQLite
  // ============================================================

  const recarregarEstadoDoSQLite = useCallback(async () => {
    try {
      Logger.debug('[ENTREGA_CTX] Refrescando estado do SQLite...');

      // 1. Obter rota ativa
      const rotaAtiva = await EntregaRepository.obterRotaAtiva();
      setRota(rotaAtiva);

      if (!rotaAtiva) {
        setCarga(null);
        setClientes([]);
        setOrdens([]);
        setVolumes([]);
        setCargaVolumes([]);
        Logger.debug('[ENTREGA_CTX] Nenhuma rota ativa');
        return;
      }

      // 2. Obter carga da rota
      const cargaData = await EntregaRepository.obterCarga(rotaAtiva.id);
      setCarga(cargaData);

      // 3. Obter volumes da carga (se existir)
      if (cargaData) {
        const cvs = await EntregaRepository.obterVolumesCarga(cargaData.id);
        setCargaVolumes(cvs);
      } else {
        setCargaVolumes([]);
      }

      // 4. Obter clientes da rota
      const clientesData = await EntregaRepository.obterClientesDaRota(rotaAtiva.id);
      setClientes(clientesData);

      // 5. Obter todas as ordens e volumes
      const allOrdens: Ordem[] = [];
      const allVolumes: Volume[] = [];

      for (const cli of clientesData) {
        const ordensCliente = await EntregaRepository.obterOrdensCliente(cli.id);
        allOrdens.push(...ordensCliente);

        for (const ord of ordensCliente) {
          const volumesOrdem = await EntregaRepository.obterVolumesOrdem(ord.id);
          allVolumes.push(...volumesOrdem);
        }
      }

      setOrdens(allOrdens);
      setVolumes(allVolumes);

      // 6. Determinar fase baseado no status da rota
      if (rotaAtiva.status === 'em_carga') {
        setFase('CARGA');
      } else if (rotaAtiva.status === 'em_rota') {
        setFase('ROTA');
      } else if (rotaAtiva.status === 'finalizada') {
        setFase('CONCLUIDA');
      } else {
        setFase('SYNC_DOWN');
      }

      Logger.debug('[ENTREGA_CTX] Estado refrescado do SQLite', {
        rotaId: rotaAtiva.id,
        clientes: clientesData.length,
        ordens: allOrdens.length,
        volumes: allVolumes.length,
      });
    } catch (error) {
      Logger.error('[ENTREGA_CTX] Erro ao recarregar estado do SQLite:', error);
    }
  }, []);

  // ============================================================
  // ON MOUNT - Verificar rota existente no SQLite
  // ============================================================

  useEffect(() => {
    if (isLoggedIn) {
      Logger.debug('[ENTREGA_CTX] User logado, verificando rota existente no SQLite...');
      recarregarEstadoDoSQLite();
    }
  }, [isLoggedIn, recarregarEstadoDoSQLite]);

  // ============================================================
  // SYNC DOWN - Puxa dados do backend para SQLite
  // ============================================================

  const executarSyncDown = useCallback(async (): Promise<boolean> => {
    try {
      setIsSyncing(true);
      setFase('SYNC_DOWN');
      setLastError(null);
      Logger.debug('[ENTREGA_CTX] Executando SYNC DOWN...');

      if (!usuario?.cd_usuario) {
        throw new Error('Motorista ID não disponível');
      }

      // 1. Chamar API para obter payload
      const payload = await EntregaApiService.syncDown(usuario.cd_usuario);
      if (!payload) {
        throw new Error('Payload vazio do SYNC DOWN');
      }

      // 2. Salvar tudo no SQLite via Repository
      await EntregaRepository.salvarRotaCompleta(payload);

      // 3. Refrescar estado React do SQLite
      await recarregarEstadoDoSQLite();

      // 4. Avançar para CARGA
      setFase('CARGA');
      Logger.debug('[ENTREGA_CTX] SYNC DOWN concluído com sucesso');
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro no SYNC DOWN';
      Logger.error('[ENTREGA_CTX] Erro no SYNC DOWN:', error);
      setLastError(msg);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [usuario, recarregarEstadoDoSQLite]);

  // ============================================================
  // SYNC UP - Envia resultados para o backend (FASE 8)
  // ============================================================

  const executarSyncUp = useCallback(async (): Promise<boolean> => {
    try {
      setIsSyncing(true);
      setFase('SYNC_UP');
      setLastError(null);
      Logger.debug('[ENTREGA_CTX] Executando SYNC UP...');

      if (!rota) {
        throw new Error('Nenhuma rota ativa para SYNC UP');
      }

      // 1. Montar payload do SQLite
      const payload = await EntregaRepository.montarPayloadSyncUp(rota.id);
      if (!payload) {
        throw new Error('Erro ao montar payload SYNC UP');
      }

      // 2. Enviar ao backend
      await EntregaApiService.syncUp(payload);

      // 3. Marcar rota como finalizada no SQLite
      await EntregaRepository.atualizarStatusRota(rota.id, 'finalizada');

      // 4. Refrescar estado
      await recarregarEstadoDoSQLite();

      // 5. Avançar para CONCLUIDA
      setFase('CONCLUIDA');
      Logger.debug('[ENTREGA_CTX] SYNC UP concluído com sucesso');
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro no SYNC UP';
      Logger.error('[ENTREGA_CTX] Erro no SYNC UP:', error);
      setLastError(msg);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [rota, recarregarEstadoDoSQLite]);

  // ============================================================
  // FASE CARGA - Operações no galpão
  // ============================================================

  const iniciarCarga = useCallback(async (): Promise<boolean> => {
    try {
      Logger.debug('[ENTREGA_CTX] Iniciando carga...');
      if (!carga) return false;

      await EntregaRepository.iniciarCarga(carga.id);
      await recarregarEstadoDoSQLite();

      return true;
    } catch (error) {
      Logger.error('[ENTREGA_CTX] Erro ao iniciar carga:', error);
      return false;
    }
  }, [carga, recarregarEstadoDoSQLite]);

  const biparVolumeCarga = useCallback(async (
    codigoBarras: string
  ): Promise<{ sucesso: boolean; mensagem: string }> => {
    try {
      Logger.debug(`[ENTREGA_CTX] Bipando volume na carga: ${codigoBarras}`);

      if (!carga) {
        return { sucesso: false, mensagem: 'Sem carga ativa' };
      }

      const resultado = await EntregaRepository.biparVolumeCarga(carga.id, codigoBarras);

      if (resultado.sucesso) {
        await recarregarEstadoDoSQLite();
      }

      return resultado;
    } catch (error) {
      Logger.error('[ENTREGA_CTX] Erro ao bipar volume na carga:', error);
      return { sucesso: false, mensagem: 'Erro ao bipar volume' };
    }
  }, [carga, recarregarEstadoDoSQLite]);

  const finalizarCarga = useCallback(async (): Promise<boolean> => {
    try {
      Logger.debug('[ENTREGA_CTX] Finalizando carga...');
      if (!carga) return false;

      const sucesso = await EntregaRepository.finalizarCarga(carga.id);

      if (sucesso && rota) {
        await EntregaRepository.atualizarStatusRota(rota.id, 'em_rota');
        setFase('ROTA');
      }

      await recarregarEstadoDoSQLite();

      Logger.debug('[ENTREGA_CTX] Carga finalizada, iniciando rota');
      return sucesso;
    } catch (error) {
      Logger.error('[ENTREGA_CTX] Erro ao finalizar carga:', error);
      return false;
    }
  }, [carga, rota, recarregarEstadoDoSQLite]);

  const getContagemCarga = useCallback((): ContagemCarga => {
    if (!carga) {
      return { total: 0, bipados: 0, pendentes: 0, percentual: 0 };
    }

    return {
      total: carga.total_volumes,
      bipados: carga.volumes_bipados,
      pendentes: carga.volumes_pendentes,
      percentual: carga.total_volumes > 0 ? Math.round((carga.volumes_bipados / carga.total_volumes) * 100) : 0,
    };
  }, [carga]);

  const getVolumesCarga = useCallback((): CargaVolume[] => {
    return cargaVolumes;
  }, [cargaVolumes]);

  // ============================================================
  // FASE ROTA - Operações por cliente
  // ============================================================

  const getClienteById = useCallback((clienteId: string): Cliente | null => {
    return clientes.find(c => c.id === clienteId) || null;
  }, [clientes]);

  const getOrdensCliente = useCallback((clienteId: string): Ordem[] => {
    return ordens.filter(o => o.cliente_id === clienteId);
  }, [ordens]);

  const getVolumesOrdem = useCallback((ordemId: string): Volume[] => {
    return volumes.filter(v => v.ordem_id === ordemId);
  }, [volumes]);

  const getVolumesFaltantes = useCallback((ordemId: string): Volume[] => {
    return volumes.filter(v => v.ordem_id === ordemId && v.status === 'pendente');
  }, [volumes]);

  const getContagemCliente = useCallback((clienteId: string): ContagemCliente => {
    const ordensDoCliente = ordens.filter(o => o.cliente_id === clienteId);
    const volumesDoCliente = volumes.filter(v =>
      ordensDoCliente.some(o => o.id === v.ordem_id)
    );

    return {
      totalOrdens: ordensDoCliente.length,
      ordensFinalizadas: ordensDoCliente.filter(o => o.status === 'finalizada').length,
      totalVolumes: volumesDoCliente.length,
      volumesEntregues: volumesDoCliente.filter(v => v.status === 'entregue').length,
      volumesExtraviados: volumesDoCliente.filter(v => v.status === 'extraviado').length,
      volumesPendentes: volumesDoCliente.filter(v => v.status === 'pendente').length,
    };
  }, [ordens, volumes]);

  const getContagemOrdem = useCallback((ordemId: string): ContagemOrdem => {
    const volumesDaOrdem = volumes.filter(v => v.ordem_id === ordemId);
    const total = volumesDaOrdem.length;
    const entregues = volumesDaOrdem.filter(v => v.status === 'entregue').length;
    const extraviados = volumesDaOrdem.filter(v => v.status === 'extraviado').length;
    const pendentes = volumesDaOrdem.filter(v => v.status === 'pendente').length;

    return {
      total,
      entregues,
      extraviados,
      pendentes,
      percentual: total > 0 ? Math.round(((entregues + extraviados) / total) * 100) : 0,
    };
  }, [volumes]);

  // ============================================================
  // AÇÕES DE ENTREGA
  // ============================================================

  const iniciarEntregaCliente = useCallback(async (clienteId: string): Promise<boolean> => {
    try {
      Logger.debug(`[ENTREGA_CTX] Iniciando entrega do cliente ${clienteId}`);

      await EntregaRepository.iniciarEntregaCliente(clienteId);
      await recarregarEstadoDoSQLite();

      return true;
    } catch (error) {
      Logger.error(`[ENTREGA_CTX] Erro ao iniciar entrega do cliente ${clienteId}:`, error);
      return false;
    }
  }, [recarregarEstadoDoSQLite]);

  const biparVolumeEntrega = useCallback(async (
    ordemId: string,
    codigoBarras: string,
  ): Promise<{ sucesso: boolean; mensagem: string }> => {
    try {
      Logger.debug(`[ENTREGA_CTX] Bipando volume entrega: ${codigoBarras} (ordem ${ordemId})`);

      const resultado = await EntregaRepository.biparVolumeEntrega(ordemId, codigoBarras);

      if (resultado.sucesso) {
        await recarregarEstadoDoSQLite();
      }

      return resultado;
    } catch (error) {
      Logger.error('[ENTREGA_CTX] Erro ao bipar volume entrega:', error);
      return { sucesso: false, mensagem: 'Erro ao bipar volume' };
    }
  }, [recarregarEstadoDoSQLite]);

  const marcarExtraviado = useCallback(async (
    volumeId: string,
    observacao: string,
  ): Promise<boolean> => {
    try {
      if (!observacao.trim()) {
        Logger.warn('[ENTREGA_CTX] Observação obrigatória para volume extraviado');
        return false;
      }

      Logger.debug(`[ENTREGA_CTX] Marcando volume ${volumeId} como extraviado`);

      const sucesso = await EntregaRepository.marcarExtraviado(volumeId, observacao);

      if (sucesso) {
        await recarregarEstadoDoSQLite();
      }

      return sucesso;
    } catch (error) {
      Logger.error(`[ENTREGA_CTX] Erro ao marcar volume ${volumeId} como extraviado:`, error);
      return false;
    }
  }, [recarregarEstadoDoSQLite]);

  const finalizarOrdem = useCallback(async (ordemId: string): Promise<boolean> => {
    try {
      Logger.debug(`[ENTREGA_CTX] Finalizando ordem ${ordemId}`);

      const sucesso = await EntregaRepository.finalizarOrdem(ordemId);

      if (sucesso) {
        await recarregarEstadoDoSQLite();
      }

      return sucesso;
    } catch (error) {
      Logger.error(`[ENTREGA_CTX] Erro ao finalizar ordem ${ordemId}:`, error);
      return false;
    }
  }, [recarregarEstadoDoSQLite]);

  const finalizarEntregaCliente = useCallback(async (clienteId: string): Promise<boolean> => {
    try {
      Logger.debug(`[ENTREGA_CTX] Finalizando entrega do cliente ${clienteId}`);

      const sucesso = await EntregaRepository.finalizarEntregaCliente(clienteId);

      if (sucesso) {
        await recarregarEstadoDoSQLite();
      }

      return sucesso;
    } catch (error) {
      Logger.error(`[ENTREGA_CTX] Erro ao finalizar entrega do cliente ${clienteId}:`, error);
      return false;
    }
  }, [recarregarEstadoDoSQLite]);

  // ============================================================
  // LIMPAR ESTADO
  // ============================================================

  const limparEstado = useCallback(async () => {
    try {
      Logger.debug('[ENTREGA_CTX] Limpando estado');
      await EntregaRepository.limparDadosEntrega();

      setFase('LOGIN');
      setRota(null);
      setCarga(null);
      setClientes([]);
      setOrdens([]);
      setVolumes([]);
      setCargaVolumes([]);
      setLastError(null);
    } catch (error) {
      Logger.error('[ENTREGA_CTX] Erro ao limpar estado:', error);
    }
  }, []);

  // Limpar estado quando deslogar
  useEffect(() => {
    if (!isLoggedIn) {
      limparEstado();
    }
  }, [isLoggedIn, limparEstado]);

  // ============================================================
  // STATE COMPOSTO
  // ============================================================

  const state: EntregaState = {
    fase,
    rota,
    carga,
    clientes,
    isSyncing,
    lastError,
  };

  const value: EntregaContextData = {
    state,
    fase,
    rota,
    carga,
    clientes,
    isLoading,
    isSyncing,
    iniciarCarga,
    biparVolumeCarga,
    finalizarCarga,
    getContagemCarga,
    getVolumesCarga,
    getClienteById,
    getOrdensCliente,
    getVolumesOrdem,
    getVolumesFaltantes,
    getContagemCliente,
    getContagemOrdem,
    iniciarEntregaCliente,
    biparVolumeEntrega,
    marcarExtraviado,
    finalizarOrdem,
    finalizarEntregaCliente,
    executarSyncDown,
    executarSyncUp,
    limparEstado,
  };

  return (
    <EntregaContext.Provider value={value}>{children}</EntregaContext.Provider>
  );
}

// ============================================================
// HOOK
// ============================================================

export function useEntrega(): EntregaContextData {
  const context = useContext(EntregaContext);

  if (!context) {
    throw new Error("useEntrega deve ser usado dentro de um EntregaProvider");
  }

  return context;
}

export default EntregaContext;
