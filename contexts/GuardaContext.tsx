/**
 * GuardaContext - Zé do Bip
 * Context API para gerenciamento de guardas
 *
 * ESTRATÉGIA:
 * - Backend (ze-sandbox) é a fonte da verdade
 * - Context apenas gerencia estado local e delega ao GuardaService
 * - Sem persistência offline nesta fase (será implementado depois)
 */

import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import GuardaService, { ContagemBipados, GuardasPorStatus } from "../services/GuardaService";
import { Guarda } from "../types/siac";
import { Logger } from "../utils/logger";
import { useAuth } from "./AuthContext";

// Interface do Context
interface GuardaContextData {
  // Estado de leitura
  guardas: {
    disponiveis: Guarda[];
    emAndamento: Guarda[];
    finalizadas: Guarda[];
  };
  guardaAtual: Guarda | null;

  // Estado de loading
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingDetalhes: boolean;

  // Estado de conexão
  isOnline: boolean;

  // Ações de leitura
  carregarGuardas: () => Promise<void>;
  refreshGuardas: () => Promise<void>;
  selecionarGuarda: (guardaId: string) => Promise<Guarda | null>;
  limparGuardaAtual: () => void;
  obterContagemBipados: (guardaId: string) => Promise<ContagemBipados | null>;

  // Ações de escrita (delegam ao service)
  iniciarGuarda: (guardaId: string) => Promise<boolean>;
  finalizarGuarda: (guardaId: string) => Promise<boolean>;
}

// Criar Context
const GuardaContext = createContext<GuardaContextData | undefined>(undefined);

// Props do Provider
interface GuardaProviderProps {
  children: ReactNode;
}

/**
 * GuardaProvider - Provedor de guardas
 */
export function GuardaProvider({ children }: GuardaProviderProps) {
  const { usuario, isLoggedIn } = useAuth();

  // Estado das guardas
  const [guardas, setGuardas] = useState<GuardasPorStatus>({
    disponiveis: [],
    emAndamento: [],
    finalizadas: [],
  });
  const [guardaAtual, setGuardaAtual] = useState<Guarda | null>(null);

  // Estado de loading
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingDetalhes, setIsLoadingDetalhes] = useState(false);

  // Estado de conexão
  const [isOnline, setIsOnline] = useState(true);

  /**
   * Carregar guardas do servidor
   */
  const carregarGuardas = useCallback(async () => {
    if (!isLoggedIn || !usuario) {
      Logger.debug("[GUARDA_CTX] Usuário não logado, não carregando guardas");
      return;
    }

    try {
      setIsLoading(true);
      Logger.debug("[GUARDA_CTX] Carregando guardas...");

      // Verificar conectividade
      const online = await GuardaService.verificarConectividade();
      setIsOnline(online);

      if (!online) {
        Logger.warn("[GUARDA_CTX] Offline - não é possível carregar guardas");
        return;
      }

      // Carregar guardas do backend
      const resultado = await GuardaService.listarGuardas(usuario.cd_usuario);

      setGuardas(resultado);

      Logger.debug("[GUARDA_CTX] Guardas carregadas:", {
        disponiveis: resultado.disponiveis.length,
        emAndamento: resultado.emAndamento.length,
        finalizadas: resultado.finalizadas.length,
      });
    } catch (error) {
      Logger.error("[GUARDA_CTX] Erro ao carregar guardas:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn, usuario]);

  /**
   * Refresh das guardas (pull-to-refresh)
   */
  const refreshGuardas = useCallback(async () => {
    if (!isLoggedIn || !usuario) {
      return;
    }

    try {
      setIsRefreshing(true);
      Logger.debug("[GUARDA_CTX] Atualizando guardas...");

      const online = await GuardaService.verificarConectividade();
      setIsOnline(online);

      if (!online) {
        Logger.warn("[GUARDA_CTX] Offline - não é possível atualizar guardas");
        return;
      }

      const resultado = await GuardaService.listarGuardas(usuario.cd_usuario);
      setGuardas(resultado);

      Logger.debug("[GUARDA_CTX] Guardas atualizadas");
    } catch (error) {
      Logger.error("[GUARDA_CTX] Erro ao atualizar guardas:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [isLoggedIn, usuario]);

  /**
   * Selecionar uma guarda (carregar detalhes)
   */
  const selecionarGuarda = useCallback(
    async (guardaId: string): Promise<Guarda | null> => {
      try {
        setIsLoadingDetalhes(true);
        Logger.debug(`[GUARDA_CTX] Selecionando guarda ${guardaId}...`);

        const guarda = await GuardaService.obterDetalhesGuarda(guardaId);

        if (guarda) {
          setGuardaAtual(guarda);
          Logger.debug(
            `[GUARDA_CTX] Guarda selecionada: ${guarda.id} (${guarda.produtos.length} produtos)`
          );
        } else {
          Logger.warn(`[GUARDA_CTX] Guarda ${guardaId} não encontrada`);
        }

        return guarda;
      } catch (error) {
        Logger.error(
          `[GUARDA_CTX] Erro ao selecionar guarda ${guardaId}:`,
          error
        );
        return null;
      } finally {
        setIsLoadingDetalhes(false);
      }
    },
    []
  );

  /**
   * Limpar guarda atual
   */
  const limparGuardaAtual = useCallback(() => {
    setGuardaAtual(null);
  }, []);

  /**
   * Obter contagem de produtos bipados
   */
  const obterContagemBipados = useCallback(
    async (guardaId: string): Promise<ContagemBipados | null> => {
      try {
        Logger.debug(`[GUARDA_CTX] Obtendo contagem de bipados da guarda ${guardaId}...`);
        const contagem = await GuardaService.obterContagemBipados(guardaId);
        return contagem;
      } catch (error) {
        Logger.error(`[GUARDA_CTX] Erro ao obter contagem de bipados:`, error);
        return null;
      }
    },
    []
  );

  /**
   * Iniciar uma guarda
   */
  const iniciarGuarda = useCallback(
    async (guardaId: string): Promise<boolean> => {
      try {
        Logger.debug(`[GUARDA_CTX] Iniciando guarda ${guardaId}...`);

        const sucesso = await GuardaService.iniciarGuarda(guardaId);

        if (sucesso) {
          // Recarregar guardas para atualizar estado
          await refreshGuardas();
          Logger.debug(`[GUARDA_CTX] Guarda ${guardaId} iniciada com sucesso`);
        }

        return sucesso;
      } catch (error) {
        Logger.error(`[GUARDA_CTX] Erro ao iniciar guarda ${guardaId}:`, error);
        return false;
      }
    },
    [refreshGuardas]
  );

  /**
   * Finalizar uma guarda
   */
  const finalizarGuarda = useCallback(
    async (guardaId: string): Promise<boolean> => {
      try {
        Logger.debug(`[GUARDA_CTX] Finalizando guarda ${guardaId}...`);

        const sucesso = await GuardaService.finalizarGuarda(guardaId);

        if (sucesso) {
          // Recarregar guardas para atualizar estado
          await refreshGuardas();
          // Limpar guarda atual se era a que foi finalizada
          if (guardaAtual?.id === guardaId) {
            setGuardaAtual(null);
          }
          Logger.debug(
            `[GUARDA_CTX] Guarda ${guardaId} finalizada com sucesso`
          );
        }

        return sucesso;
      } catch (error) {
        Logger.error(
          `[GUARDA_CTX] Erro ao finalizar guarda ${guardaId}:`,
          error
        );
        return false;
      }
    },
    [refreshGuardas, guardaAtual]
  );

  // Carregar guardas quando usuário logar
  useEffect(() => {
    if (isLoggedIn && usuario) {
      Logger.debug("[GUARDA_CTX] Usuário logado, carregando guardas...");
      carregarGuardas();
    } else {
      // Limpar estado quando deslogar
      setGuardas({
        disponiveis: [],
        emAndamento: [],
        finalizadas: [],
      });
      setGuardaAtual(null);
    }
  }, [isLoggedIn, usuario, carregarGuardas]);

  const value: GuardaContextData = {
    guardas,
    guardaAtual,
    isLoading,
    isRefreshing,
    isLoadingDetalhes,
    isOnline,
    carregarGuardas,
    refreshGuardas,
    selecionarGuarda,
    limparGuardaAtual,
    obterContagemBipados,
    iniciarGuarda,
    finalizarGuarda,
  };

  return (
    <GuardaContext.Provider value={value}>{children}</GuardaContext.Provider>
  );
}

/**
 * Hook useGuardas - Acesso ao contexto de guardas
 */
export function useGuardas(): GuardaContextData {
  const context = useContext(GuardaContext);

  if (!context) {
    throw new Error("useGuardas deve ser usado dentro de um GuardaProvider");
  }

  return context;
}

export default GuardaContext;
