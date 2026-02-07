/**
 * AuthContext - Zé da Entrega
 * Context API para gerenciamento de autenticação com SQLite
 *
 * ESTRATÉGIA DE SESSÃO:
 * 1. Online PRIMEIRO: Se conectado, validar token no servidor
 * 2. Offline como FALLBACK: Se sem conexão, confiar no token local (se não expirado)
 * 3. Limpar sessões: Ao fazer logout ou quando sessão inválida, DELETE da tabela
 * 4. Sync Queue: Ações offline são enfileiradas para sincronização quando online
 */

import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { config } from "../constants/Environment";
import AuthRepository, {
  SessaoCompleta,
} from "../database/repositories/AuthRepository";
import SyncQueueRepository, {
  LogoutPayload,
} from "../database/repositories/SyncQueueRepository";
import AuthService from "../services/AuthService";
import { Logger } from "../utils/logger";

// Interface do usuário no Context
export interface AuthUsuario {
  cd_usuario: string;
  token: string;
  nome?: string;
  email?: string;
  loginEm: string;
  expiresAt?: string;
  roles: string[];
  permissions: string[];
}

// Interface do Context
interface AuthContextData {
  // Estado
  usuario: AuthUsuario | null;
  isLoggedIn: boolean;
  isLoading: boolean;

  // Ações
  login: (credenciais: {
    cd_usuario: string;
    senha: string;
  }) => Promise<boolean>;
  logout: () => Promise<void>;
  logoutAll: (cd_usuario?: string) => Promise<boolean>;
  recuperarSessao: () => Promise<void>;

  // Utilitários
  obterToken: () => Promise<string | null>;
  
  // Helpers de autorização
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

// Criar Context
const AuthContext = createContext<AuthContextData | undefined>(undefined);

// Props do Provider
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider - Provedor de autenticação
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [usuario, setUsuario] = useState<AuthUsuario | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Converte sessão do SQLite para AuthUsuario
   */
  const sessaoParaUsuario = (sessao: SessaoCompleta): AuthUsuario => ({
    cd_usuario: sessao.cd_usuario,
    token: sessao.token,
    nome: sessao.nome || undefined,
    email: sessao.email || undefined,
    loginEm: sessao.login_em,
    expiresAt: sessao.expires_at || undefined,
    roles: sessao.roles || [],
    permissions: sessao.permissions || [],
  });

  /**
   * Verificar conectividade com o BACKEND DE AUTENTICAÇÃO
   */
  const verificarConexaoBackend = async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const authUrl = config.api.authUrl;
      Logger.debug("[AUTH_CTX] Verificando conexão com backend:", authUrl);

      const response = await fetch(`${authUrl}/auth/health`, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const isOnline = response.ok;
      Logger.debug("[AUTH_CTX] Backend respondeu:", {
        status: response.status,
        ok: isOnline,
      });

      return isOnline;
    } catch (error) {
      Logger.warn(
        "[AUTH_CTX] Backend não está acessível:",
        error instanceof Error ? error.message : "Erro desconhecido"
      );
      return false;
    }
  };

  /**
   * Processar fila de sincronização (executar ações pendentes)
   * IMPORTANTE: Deve ser chamado SEMPRE que online, independente de ter sessão
   */
  const processarFilaSincronizacao = async (): Promise<void> => {
    try {
      // Resetar falhas anteriores para retry
      await SyncQueueRepository.resetarFalhasParaRetry();

      const pendentes = await SyncQueueRepository.obterPendentes();

      if (pendentes.length === 0) {
        Logger.debug(
          "[AUTH_CTX] Nenhuma ação pendente na fila de sincronização"
        );
        return;
      }

      Logger.auth(
        `[AUTH_CTX] [SYNC] Processando ${pendentes.length} ação(ões) pendente(s)...`
      );

      for (const item of pendentes) {
        try {
          const payload = JSON.parse(item.payload) as LogoutPayload;

          switch (item.action_type) {
            case "LOGOUT":
              Logger.auth(
                "[AUTH_CTX] [SYNC] Executando logout pendente:",
                payload.cd_usuario
              );
              await AuthService.logoutHTTP(payload.token);
              await SyncQueueRepository.marcarConcluida(item.id);
              Logger.auth("[AUTH_CTX] [SYNC] Logout sincronizado com sucesso");
              break;

            case "LOGOUT_ALL":
              Logger.auth(
                "[AUTH_CTX] [SYNC] Executando logout-all pendente:",
                payload.cd_usuario
              );
              await AuthService.logoutAllHTTP(payload.token);
              await SyncQueueRepository.marcarConcluida(item.id);
              Logger.auth(
                "[AUTH_CTX] [SYNC] Logout-all sincronizado com sucesso"
              );
              break;

            default:
              Logger.warn(
                "[AUTH_CTX] [SYNC] Tipo de ação desconhecido:",
                item.action_type
              );
          }
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : "Erro desconhecido";
          Logger.error("[AUTH_CTX] [SYNC] Erro ao processar ação:", errorMsg);
          await SyncQueueRepository.marcarFalha(item.id, errorMsg);
        }
      }

      // Limpar ações concluídas
      await SyncQueueRepository.limparConcluidas();
    } catch (error) {
      Logger.error(
        "[AUTH_CTX] Erro ao processar fila de sincronização:",
        error
      );
    }
  };

  /**
   * Limpar estado local e SQLite
   */
  const limparEstadoLocal = useCallback(async () => {
    try {
      await AuthRepository.limparSessoes();
      AuthService.setCurrentUser(null);
      setUsuario(null);
      setIsLoggedIn(false);
      Logger.auth("[AUTH_CTX] Estado local limpo");
    } catch (error) {
      Logger.error("[AUTH_CTX] Erro ao limpar estado local:", error);
      AuthService.setCurrentUser(null);
      setUsuario(null);
      setIsLoggedIn(false);
    }
  }, []);

  /**
   * Definir usuário logado
   */
  const definirUsuarioLogado = useCallback((authUsuario: AuthUsuario) => {
    setUsuario(authUsuario);
    setIsLoggedIn(true);
    AuthService.setCurrentUser(authUsuario.cd_usuario);
    Logger.auth("[AUTH_CTX] Usuário logado:", {
      cd_usuario: authUsuario.cd_usuario,
      nome: authUsuario.nome,
    });
  }, []);

  /**
   * Recuperar sessão do SQLite
   *
   * FLUXO ATUALIZADO:
   * 1. Verificar conexão com backend
   * 2. Se ONLINE: processar fila de sincronização PRIMEIRO (logouts pendentes)
   * 3. Buscar sessão no SQLite
   * 4. Se não existe sessão -> ir para login
   * 5. Se existe sessão:
   *    - ONLINE: Validar token no servidor
   *    - OFFLINE: Verificar expiração local
   */
  const recuperarSessao = useCallback(async () => {
    try {
      setIsLoading(true);
      Logger.auth("[AUTH_CTX] ========== RECUPERANDO SESSÃO ==========");

      // 1. Verificar conexão com o BACKEND DE AUTENTICAÇÃO PRIMEIRO
      const online = await verificarConexaoBackend();
      Logger.auth(
        "[AUTH_CTX] Status de conexão com backend:",
        online ? "ONLINE" : "OFFLINE"
      );

      // 2. Se ONLINE: processar fila de sincronização ANTES de qualquer coisa
      // Isso garante que logouts pendentes sejam executados antes do novo login
      if (online) {
        Logger.auth("[AUTH_CTX] [ONLINE] Processando fila de sincronização...");
        await processarFilaSincronizacao();
      }

      // 3. Buscar sessão ativa no SQLite
      const sessao = await AuthRepository.obterSessaoAtiva();

      // 4. Se não existe sessão local -> limpar e ir para login
      if (!sessao) {
        Logger.auth("[AUTH_CTX] Nenhuma sessão encontrada no SQLite");
        await limparEstadoLocal();
        Logger.auth(
          "[AUTH_CTX] ========== FIM RECUPERAÇÃO (sem sessão) =========="
        );
        return;
      }

      Logger.auth("[AUTH_CTX] Sessão encontrada:", {
        cd_usuario: sessao.cd_usuario,
        expires_at: sessao.expires_at,
      });

      // 5. Validar sessão baseado no status de conexão
      if (online) {
        // ========== MODO ONLINE ==========
        Logger.auth("[AUTH_CTX] [ONLINE] Validando token no servidor...");

        try {
          const tokenValido = await AuthService.validarToken(sessao.token);

          if (tokenValido) {
            Logger.auth("[AUTH_CTX] [ONLINE] Token VÁLIDO no servidor");
            const authUsuario = sessaoParaUsuario(sessao);
            definirUsuarioLogado(authUsuario);
          } else {
            Logger.warn(
              "[AUTH_CTX] [ONLINE] Token INVÁLIDO no servidor - limpando sessão"
            );
            await limparEstadoLocal();
          }
        } catch (error) {
          Logger.warn(
            "[AUTH_CTX] [ONLINE] Erro ao validar token, tratando como offline:",
            error
          );

          // Fallback para verificação local
          if (sessao.expires_at && new Date(sessao.expires_at) < new Date()) {
            Logger.auth("[AUTH_CTX] [FALLBACK] Token expirado localmente");
            await limparEstadoLocal();
          } else {
            Logger.auth(
              "[AUTH_CTX] [FALLBACK] Usando sessão local (erro de conexão)"
            );
            const authUsuario = sessaoParaUsuario(sessao);
            definirUsuarioLogado(authUsuario);
          }
        }
      } else {
        // ========== MODO OFFLINE ==========
        Logger.auth("[AUTH_CTX] [OFFLINE] Verificando expiração local...");

        if (sessao.expires_at && new Date(sessao.expires_at) < new Date()) {
          Logger.auth("[AUTH_CTX] [OFFLINE] Token EXPIRADO localmente");
          await limparEstadoLocal();
        } else {
          Logger.auth(
            "[AUTH_CTX] [OFFLINE] Token válido localmente - modo offline"
          );
          const authUsuario = sessaoParaUsuario(sessao);
          definirUsuarioLogado(authUsuario);
        }
      }

      Logger.auth("[AUTH_CTX] ========== FIM RECUPERAÇÃO ==========");
    } catch (error) {
      Logger.error("[AUTH_CTX] Erro crítico ao recuperar sessão:", error);
      await limparEstadoLocal();
    } finally {
      setIsLoading(false);
    }
  }, [limparEstadoLocal, definirUsuarioLogado]);

  /**
   * Login
   */
  const login = useCallback(
    async (credenciais: {
      cd_usuario: string;
      senha: string;
    }): Promise<boolean> => {
      try {
        Logger.auth("[AUTH_CTX] Iniciando login...", {
          cd_usuario: credenciais.cd_usuario,
        });

        // Processar fila de sincronização ANTES do login
        // Isso garante que logouts pendentes sejam executados
        const online = await verificarConexaoBackend();
        if (online) {
          Logger.auth("[AUTH_CTX] Processando fila antes do login...");
          await processarFilaSincronizacao();
        }

        // Limpar sessões anteriores antes de fazer novo login
        await AuthRepository.limparSessoes();

        // Chamar API de login (requer conexão)
        const usuarioAPI = await AuthService.loginHTTP(
          credenciais.cd_usuario,
          credenciais.senha
        );

        // Salvar no SQLite
        await AuthRepository.salvarSessao({
          cd_usuario: usuarioAPI.cd_usuario,
          token: usuarioAPI.token,
          nome: usuarioAPI.nome,
          email: usuarioAPI.email,
          expiresAt: usuarioAPI.expiresAt,
          roles: usuarioAPI.roles,
          permissions: usuarioAPI.permissions,
        });

        // Atualizar estado
        const authUsuario: AuthUsuario = {
          cd_usuario: usuarioAPI.cd_usuario,
          token: usuarioAPI.token,
          nome: usuarioAPI.nome,
          email: usuarioAPI.email,
          loginEm: usuarioAPI.loginEm,
          expiresAt: usuarioAPI.expiresAt,
          roles: usuarioAPI.roles,
          permissions: usuarioAPI.permissions,
        };

        definirUsuarioLogado(authUsuario);

        Logger.auth("[AUTH_CTX] Login realizado com sucesso");
        return true;
      } catch (error) {
        Logger.error("[AUTH_CTX] Erro no login:", error);
        throw error;
      }
    },
    [definirUsuarioLogado]
  );

  /**
   * Logout
   * - Se ONLINE: faz logout no servidor + limpa local
   * - Se OFFLINE: enfileira logout para sincronização + limpa local
   */
  const logout = useCallback(async () => {
    try {
      setIsLoading(true); // Mostrar loading durante logout
      Logger.auth("[AUTH_CTX] Realizando logout...");

      // Obter sessão atual para logout
      const sessao = await AuthRepository.obterSessaoAtiva();

      if (sessao?.token) {
        // Verificar se está online
        const online = await verificarConexaoBackend();

        if (online) {
          // ONLINE: fazer logout no servidor
          try {
            await AuthService.logoutHTTP(sessao.token);
            Logger.auth("[AUTH_CTX] Logout no servidor realizado");
          } catch (error) {
            Logger.warn("[AUTH_CTX] Erro ao fazer logout no servidor:", error);
            // Se falhar online, enfileirar para retry
            await SyncQueueRepository.enfileirar("LOGOUT", {
              token: sessao.token,
              cd_usuario: sessao.cd_usuario,
            } as LogoutPayload);
            Logger.auth(
              "[AUTH_CTX] Logout enfileirado para sincronização posterior"
            );
          }
        } else {
          // OFFLINE: enfileirar logout para quando voltar online
          Logger.auth(
            "[AUTH_CTX] [OFFLINE] Enfileirando logout para sincronização..."
          );
          await SyncQueueRepository.enfileirar("LOGOUT", {
            token: sessao.token,
            cd_usuario: sessao.cd_usuario,
          } as LogoutPayload);
          Logger.auth("[AUTH_CTX] Logout enfileirado com sucesso");
        }
      }

      // SEMPRE limpar estado local e SQLite (independente de online/offline)
      await limparEstadoLocal();

      Logger.auth("[AUTH_CTX] Logout realizado com sucesso (local limpo)");
    } catch (error) {
      Logger.error("[AUTH_CTX] Erro no logout:", error);
      // Mesmo com erro, limpar estado local
      await limparEstadoLocal();
    } finally {
      setIsLoading(false);
    }
  }, [limparEstadoLocal]);

  /**
   * Logout de todas as sessões
   * - Se ONLINE: faz logout-all no servidor + limpa local
   * - Se OFFLINE: enfileira logout-all para sincronização + limpa local
   */
  const logoutAll = useCallback(
    async (cd_usuario_force?: string): Promise<boolean> => {
      let success = false;
      try {
        setIsLoading(true); // Mostrar loading durante logout
        Logger.auth("[AUTH_CTX] Realizando logout de todas as sessões...", {
          user: cd_usuario_force || "sessão atual",
        });

        const sessao = await AuthRepository.obterSessaoAtiva();

        // Determinar qual usuário deslogar (forçado ou da sessão)
        const cdUsuarioTarget = cd_usuario_force || sessao?.cd_usuario;
        const token = sessao?.token;

        if (cdUsuarioTarget) {
          const online = await verificarConexaoBackend();

          if (online) {
            try {
              // Tenta chamar o serviço mesmo se não tiver token (backend pode permitir)
              const response = await AuthService.logoutAllHTTP(
                cdUsuarioTarget,
                token
              );
              Logger.auth(
                "[AUTH_CTX] Logout-all no servidor realizado",
                response
              );
              success = response.success;
            } catch (error) {
              Logger.warn(
                "[AUTH_CTX] Erro ao fazer logout-all no servidor:",
                error
              );
              // Se tiver token/sessão, enfileira. Se for force logout sem sessão, talvez não adiante enfileirar se o sync depender de sessão?
              // Assumindo que sync depende de token para outras coisas, mas aqui vamos enfileirar se tivermos dados suficientes.
              if (token) {
                await SyncQueueRepository.enfileirar("LOGOUT_ALL", {
                  token: token,
                  cd_usuario: cdUsuarioTarget,
                } as LogoutPayload);
              }
            }
          } else {
            if (token) {
              Logger.auth(
                "[AUTH_CTX] [OFFLINE] Enfileirando logout-all para sincronização..."
              );
              await SyncQueueRepository.enfileirar("LOGOUT_ALL", {
                token: token,
                cd_usuario: cdUsuarioTarget,
              } as LogoutPayload);
              // Em offline, consideramos que a ação foi "aceita" (enfileirada)?
              // Para o caso de "Force Login", precisamos que o servidor tenha liberado.
              // Se estiver offline, não liberou. Então retornamos false para o Force Login.
            } else {
              Logger.warn(
                "[AUTH_CTX] [OFFLINE] Não é possível enfileirar logout-all sem token (force logout offline)"
              );
            }
          }
        }

        // Limpar TODOS os dados locais
        await AuthRepository.limparDados();
        AuthService.setCurrentUser(null);
        setUsuario(null);
        setIsLoggedIn(false);

        Logger.auth(
          "[AUTH_CTX] Logout de todas as sessões realizado (local limpo)"
        );

        return success;
      } catch (error) {
        Logger.error("[AUTH_CTX] Erro no logout de todas sessões:", error);
        AuthService.setCurrentUser(null);
        setUsuario(null);
        setIsLoggedIn(false);
        // Retorna false em caso de erro crítico
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Obter token atual
   */
  const obterToken = useCallback(async (): Promise<string | null> => {
    const sessao = await AuthRepository.obterSessaoAtiva();
    return sessao?.token || null;
  }, []);

  /**
   * Verificar se o usuário possui uma permissão específica
   */
  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!usuario) return false;
      return usuario.permissions.includes(permission);
    },
    [usuario]
  );

  /**
   * Verificar se o usuário possui um role específico
   */
  const hasRole = useCallback(
    (role: string): boolean => {
      if (!usuario) return false;
      return usuario.roles.includes(role);
    },
    [usuario]
  );

  // Recuperar sessão ao montar
  useEffect(() => {
    recuperarSessao();
  }, [recuperarSessao]);

  const value: AuthContextData = {
    usuario,
    isLoggedIn,
    isLoading,
    login,
    logout,
    logoutAll,
    recuperarSessao,
    obterToken,
    hasPermission,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook useAuth - Acesso ao contexto de autenticação
 */
export function useAuth(): AuthContextData {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }

  return context;
}

export default AuthContext;
