/**
 * Hook para gerenciar estado do Painel de Controle
 * Carrega listas, gerencia mudanças e salva alterações
 */

import { useToast } from "@/contexts/ToastContext";
import AuthorizationService from "@/services/AuthorizationService";
import { Logger } from "@/utils/logger";
import { useCallback, useEffect, useState } from "react";
import {
  MudancaRole,
  ResultadoBuscaUsuario,
  RoleName,
  ROLES_MAP,
  UsuarioPainel,
} from "../_types/painel";

interface UsePainelControleReturn {
  // Estado
  admins: UsuarioPainel[];
  adminsCompletos: UsuarioPainel[];
  armazenistas: UsuarioPainel[];
  armazenistasCompletos: UsuarioPainel[];
  mudancasPendentes: Map<string, MudancaRole>;
  resultadoBusca: ResultadoBuscaUsuario | null;
  isLoading: boolean;
  isSaving: boolean;
  isBuscando: boolean;
  erro: string | null;

  // Ações
  carregarDados: () => Promise<void>;
  buscarUsuario: (codoper: string) => Promise<void>;
  alterarRole: (
    codoper: string,
    nome: string,
    roleAtual: RoleName,
    novaRole: RoleName,
    semRoleOriginal?: boolean
  ) => void;
  removerRole: (codoper: string, nome: string, roleAtual: RoleName) => void;
  removerMudanca: (codoper: string) => void;
  salvarMudancas: () => Promise<void>;
  limparBusca: () => void;
  carregarMaisAdmins: () => void;
  carregarMaisArmazenistas: () => void;
  temMudancasPendentes: boolean;
  quantidadeMudancas: number;
  temMaisAdmins: boolean;
  temMaisArmazenistas: boolean;
}

export function usePainelControle(): UsePainelControleReturn {
  const { showToast } = useToast();

  // Estados principais - dados completos do backend
  const [adminsCompletos, setAdminsCompletos] = useState<UsuarioPainel[]>([]);
  const [armazenistasCompletos, setArmazenistasCompletos] = useState<
    UsuarioPainel[]
  >([]);

  // Estados de exibição - apenas os itens visíveis (paginados)
  const [admins, setAdmins] = useState<UsuarioPainel[]>([]);
  const [armazenistas, setArmazenistas] = useState<UsuarioPainel[]>([]);

  const [mudancasPendentes, setMudancasPendentes] = useState<
    Map<string, MudancaRole>
  >(new Map());
  const [resultadoBusca, setResultadoBusca] =
    useState<ResultadoBuscaUsuario | null>(null);

  // Estados de loading
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isBuscando, setIsBuscando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Constantes de paginação
  const ITENS_POR_PAGINA = 10;

  /**
   * Carregar listas de admins e armazenistas
   */
  const carregarDados = useCallback(async () => {
    setIsLoading(true);
    setErro(null);

    try {
      Logger.debug("[PAINEL] Carregando dados...");

      const [adminsData, armazenistasData] = await Promise.all([
        AuthorizationService.getAdminUsers(),
        AuthorizationService.getArmazenistaUsers(),
      ]);

      // Armazenar dados completos
      setAdminsCompletos(adminsData);
      setArmazenistasCompletos(armazenistasData);

      // Exibir apenas primeira página (10 itens)
      setAdmins(adminsData.slice(0, ITENS_POR_PAGINA));
      setArmazenistas(armazenistasData.slice(0, ITENS_POR_PAGINA));

      Logger.debug(
        `[PAINEL] Dados carregados: ${
          adminsData.length
        } admins (exibindo ${Math.min(ITENS_POR_PAGINA, adminsData.length)}), ${
          armazenistasData.length
        } armazenistas (exibindo ${Math.min(
          ITENS_POR_PAGINA,
          armazenistasData.length
        )})`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro ao carregar dados";
      setErro(errorMessage);
      Logger.error("[PAINEL] Erro ao carregar dados", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Buscar usuário por código
   */
  const buscarUsuario = useCallback(
    async (codoper: string) => {
      if (!codoper.trim()) {
        showToast("Digite o código do usuário", "warning");
        return;
      }

      setIsBuscando(true);
      setErro(null);
      setResultadoBusca(null);

      try {
        Logger.debug(`[PAINEL] Buscando usuário ${codoper}...`);

        const resultado = await AuthorizationService.getUserModules(codoper);
        setResultadoBusca(resultado);

        Logger.debug(
          `[PAINEL] Usuário ${codoper} encontrado: ${
            resultado.role?.name || "sem role"
          }`
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Erro ao buscar usuário";
        setErro(errorMessage);
        showToast(errorMessage, "error");
        Logger.error(`[PAINEL] Erro ao buscar usuário ${codoper}`, error);
      } finally {
        setIsBuscando(false);
      }
    },
    [showToast]
  );

  /**
   * Registrar mudança de role (não salva imediatamente)
   */
  const alterarRole = useCallback(
    (
      codoper: string,
      nome: string,
      roleAtual: RoleName,
      novaRole: RoleName,
      semRoleOriginal: boolean = false
    ) => {
      Logger.debug(`[PAINEL] alterarRole chamado:`, {
        codoper,
        nome,
        roleAtual,
        novaRole,
        roleId: ROLES_MAP[novaRole],
        semRoleOriginal,
        rolesMap: ROLES_MAP,
      });

      setMudancasPendentes((prev) => {
        const novoMap = new Map(prev);
        const mudancaAnterior = prev.get(codoper);

        // Se o usuário não tinha role originalmente, sempre adicionar como mudança
        // (nunca remover, pois não há "estado original" para voltar)
        if (semRoleOriginal) {
          const mudanca: MudancaRole = {
            codoper,
            nome,
            roleAtual,
            novaRole,
            roleId: ROLES_MAP[novaRole],
            semRoleOriginal: true,
          };
          novoMap.set(codoper, mudanca);
          Logger.debug(
            `[PAINEL] Mudança registrada (sem role original): ${codoper} -> ${novaRole} (roleId: ${mudanca.roleId})`
          );
          return novoMap;
        }

        // Se voltou para a role original, remover da lista de mudanças
        if (roleAtual === novaRole) {
          novoMap.delete(codoper);
          Logger.debug(
            `[PAINEL] Mudança removida para ${codoper} (voltou para ${roleAtual})`
          );
        } else {
          // Adicionar/atualizar mudança
          const mudanca: MudancaRole = {
            codoper,
            nome,
            roleAtual,
            novaRole,
            roleId: ROLES_MAP[novaRole],
            semRoleOriginal: false,
          };
          novoMap.set(codoper, mudanca);
          Logger.debug(
            `[PAINEL] Mudança registrada: ${codoper} ${roleAtual} -> ${novaRole} (roleId: ${mudanca.roleId})`
          );
        }

        return novoMap;
      });
    },
    []
  );

  /**
   * Registrar remoção de role (não salva imediatamente)
   */
  const removerRole = useCallback(
    (codoper: string, nome: string, roleAtual: RoleName) => {
      Logger.debug(`[PAINEL] removerRole chamado:`, {
        codoper,
        nome,
        roleAtual,
      });

      setMudancasPendentes((prev) => {
        const novoMap = new Map(prev);

        // Adicionar/atualizar mudança para remover role
        const mudanca: MudancaRole = {
          codoper,
          nome,
          roleAtual,
          novaRole: null, // null indica remoção
          roleId: null, // null quando remover
          removerRole: true,
          semRoleOriginal: false,
        };
        novoMap.set(codoper, mudanca);
        Logger.debug(
          `[PAINEL] Remoção de role registrada: ${codoper} (role atual: ${roleAtual})`
        );

        return novoMap;
      });
    },
    []
  );

  /**
   * Remover uma mudança pendente
   */
  const removerMudanca = useCallback((codoper: string) => {
    setMudancasPendentes((prev) => {
      const novoMap = new Map(prev);
      novoMap.delete(codoper);
      return novoMap;
    });
  }, []);

  /**
   * Salvar todas as mudanças pendentes
   */
  const salvarMudancas = useCallback(async () => {
    if (mudancasPendentes.size === 0) {
      showToast("Nenhuma mudança para salvar", "warning");
      return;
    }

    setIsSaving(true);
    setErro(null);

    const mudancas = Array.from(mudancasPendentes.values());
    const resultados: { codoper: string; sucesso: boolean; erro?: string }[] =
      [];

    try {
      Logger.debug(`[PAINEL] Salvando ${mudancas.length} mudança(s)...`);

      // Processar mudanças sequencialmente para evitar sobrecarga
      for (const mudanca of mudancas) {
        try {
          if (mudanca.removerRole) {
            // Remover role
            Logger.debug(
              `[PAINEL] Removendo role de ${mudanca.codoper} (role atual: ${mudanca.roleAtual})`
            );
            await AuthorizationService.removeRoleFromUser(mudanca.codoper);
            resultados.push({ codoper: mudanca.codoper, sucesso: true });
            Logger.debug(`[PAINEL] Role removida de ${mudanca.codoper}`);
          } else {
            // Atribuir role
            Logger.debug(
              `[PAINEL] Atualizando role para ${mudanca.codoper}: ${mudanca.roleAtual} -> ${mudanca.novaRole} (roleId: ${mudanca.roleId})`
            );
            if (mudanca.roleId === null || mudanca.novaRole === null) {
              throw new Error(
                "roleId e novaRole não podem ser null para atribuição"
              );
            }
            await AuthorizationService.assignRoleToUser(
              mudanca.codoper,
              mudanca.roleId
            );
            resultados.push({ codoper: mudanca.codoper, sucesso: true });
            Logger.debug(`[PAINEL] Role atualizada para ${mudanca.codoper}`);
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Erro desconhecido";
          resultados.push({
            codoper: mudanca.codoper,
            sucesso: false,
            erro: errorMessage,
          });
          Logger.error(`[PAINEL] Erro ao processar ${mudanca.codoper}:`, error);
        }
      }

      // Contar sucessos e falhas
      const sucessos = resultados.filter((r) => r.sucesso).length;
      const falhas = resultados.filter((r) => !r.sucesso);

      // Se houve erros, resetar tudo e recarregar
      if (falhas.length > 0) {
        // Limpar todas as mudanças pendentes
        setMudancasPendentes(new Map());
        // Recarregar dados para resetar estado
        await carregarDados();
        // Mostrar erro
        const mensagemErro =
          falhas.length === mudancas.length
            ? `Erro ao salvar: ${falhas[0].erro}`
            : `${sucessos} sucesso(s), ${falhas.length} falha(s)`;
        showToast(mensagemErro, "error");
        Logger.debug(
          `[PAINEL] Salvamento falhou: ${sucessos} sucessos, ${falhas.length} falhas`
        );
        return;
      }

      // Se tudo deu certo, limpar mudanças e recarregar
      setMudancasPendentes(new Map());
      await carregarDados();

      // Mostrar sucesso
      const acoes =
        mudancas.filter((m) => m.removerRole).length > 0
          ? "ação(ões)"
          : "role(s) atualizada(s)";
      showToast(`${sucessos} ${acoes} processada(s) com sucesso!`, "success");

      Logger.debug(`[PAINEL] Salvamento concluído: ${sucessos} sucessos`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro ao salvar mudanças";
      setErro(errorMessage);
      // Resetar estado em caso de erro
      setMudancasPendentes(new Map());
      await carregarDados();
      showToast(errorMessage, "error");
      Logger.error("[PAINEL] Erro ao salvar mudanças", error);
    } finally {
      setIsSaving(false);
    }
  }, [mudancasPendentes, carregarDados, showToast]);

  /**
   * Limpar resultado da busca
   */
  const limparBusca = useCallback(() => {
    setResultadoBusca(null);
  }, []);

  /**
   * Carregar mais admins (próxima página)
   */
  const carregarMaisAdmins = useCallback(() => {
    const totalExibido = admins.length;
    const proximosItens = adminsCompletos.slice(
      totalExibido,
      totalExibido + ITENS_POR_PAGINA
    );

    if (proximosItens.length > 0) {
      setAdmins((prev) => [...prev, ...proximosItens]);
      Logger.debug(
        `[PAINEL] Carregados mais ${
          proximosItens.length
        } admin(s). Total exibido: ${admins.length + proximosItens.length}`
      );
    }
  }, [admins, adminsCompletos]);

  /**
   * Carregar mais armazenistas (próxima página)
   */
  const carregarMaisArmazenistas = useCallback(() => {
    const totalExibido = armazenistas.length;
    const proximosItens = armazenistasCompletos.slice(
      totalExibido,
      totalExibido + ITENS_POR_PAGINA
    );

    if (proximosItens.length > 0) {
      setArmazenistas((prev) => [...prev, ...proximosItens]);
      Logger.debug(
        `[PAINEL] Carregados mais ${
          proximosItens.length
        } armazenista(s). Total exibido: ${
          armazenistas.length + proximosItens.length
        }`
      );
    }
  }, [armazenistas, armazenistasCompletos]);

  // Calcular se há mais itens para carregar
  const temMaisAdmins = admins.length < adminsCompletos.length;
  const temMaisArmazenistas =
    armazenistas.length < armazenistasCompletos.length;

  // Carregar dados ao montar
  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  return {
    // Estado
    admins,
    adminsCompletos,
    armazenistas,
    armazenistasCompletos,
    mudancasPendentes,
    resultadoBusca,
    isLoading,
    isSaving,
    isBuscando,
    erro,

    // Ações
    carregarDados,
    buscarUsuario,
    alterarRole,
    removerRole,
    removerMudanca,
    salvarMudancas,
    limparBusca,
    carregarMaisAdmins,
    carregarMaisArmazenistas,

    // Helpers
    temMudancasPendentes: mudancasPendentes.size > 0,
    quantidadeMudancas: mudancasPendentes.size,
    temMaisAdmins,
    temMaisArmazenistas,
  };
}
