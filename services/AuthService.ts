/**
 * Authentication Service - Zé da Entrega v1.0
 * Apenas chamadas HTTP para autenticação (persistência movida para SQLite via AuthRepository)
 */

import { config, environmentInfo } from "../constants/Environment";
import AuthRepository, {
  SessaoCompleta,
} from "../database/repositories/AuthRepository";
import { Logger } from "../utils/logger";

// Interfaces para autenticação com ze-backend
export interface LoginRequest {
  cd_usuario: string;
  senha: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    cd_usuario: string;
    nome: string;
    token: string;
    expiresIn: number;
    roles: string[];
    permissions: string[];
    message: string;
  };
}

export interface ValidateTokenResponse {
  success: boolean;
  data: {
    valid: boolean;
    cd_usuario?: string;
    nome?: string;
    expires_at?: string;
  };
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

export interface LogoutAllResponse {
  success: boolean;
  message: string;
  sessionsInvalidated: number;
}

// Interface do usuário retornado pelo login
export interface Usuario {
  cd_usuario: string;
  token: string;
  nome?: string;
  email?: string;
  loginEm: string;
  expiresAt?: string;
  roles: string[];
  permissions: string[];
}

class AuthService {
  private authUrl: string;
  private timeout: number;
  private currentUser: string | null = null;

  constructor() {
    this.authUrl = config.api.authUrl;
    this.timeout = config.api.timeout;

    Logger.auth("Serviço inicializado", {
      ambiente: environmentInfo.name,
      authUrl: this.authUrl,
    });
  }

  /**
   * Define o usuário atual para inclusão no User-Agent
   * Isso permite rastrear qual usuário está fazendo requisições de qual dispositivo
   */
  setCurrentUser(cd_usuario: string | null): void {
    this.currentUser = cd_usuario;
    Logger.debug("[AUTH_SERVICE] User-Agent atualizado:", {
      cd_usuario: cd_usuario || "anonymous",
    });
  }

  /**
   * Obtém o User-Agent dinâmico com cd_usuario
   * Formato: ZeDaEntrega-Mobile/1.0 (user:123)
   */
  private getUserAgent(): string {
    if (this.currentUser) {
      return `ZeDaEntrega-Mobile/1.0 (user:${this.currentUser})`;
    }
    return "ZeDaEntrega-Mobile/1.0";
  }

  /**
   * Fazer requisição HTTP para autenticação (ze-backend)
   */
  private async makeAuthRequest<T>(
    endpoint: string,
    data?: any,
    method: "POST" | "GET" = "POST",
    token?: string
  ): Promise<T> {
    const url = `${this.authUrl}/auth${endpoint}`;
    const controller = new AbortController();

    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      Logger.auth(
        `Request: ${method} ${endpoint}`,
        data
          ? { ...data, senha: data.senha ? "[HIDDEN]" : undefined }
          : undefined
      );

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": this.getUserAgent(),
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        method,
        headers,
        body: method === "POST" && data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.message ||
          errorData.error?.message ||
          `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      Logger.debug(`Auth Response:`, responseData);

      return responseData as T;
    } catch (error) {
      clearTimeout(timeoutId);
      Logger.error(`Erro na requisição ${endpoint}`, error);
      throw error;
    }
  }

  /**
   * Login HTTP - Apenas faz a chamada de API
   * A persistência é feita pelo AuthContext via AuthRepository
   */
  async loginHTTP(cd_usuario: string, senha: string): Promise<Usuario> {
    try {
      if (environmentInfo.debugEnabled) {
        Logger.auth("[AUTH] Iniciando login no ze-backend...", { cd_usuario });
      }

      const response = await this.makeAuthRequest<LoginResponse>("/login", {
        cd_usuario,
        senha,
      });

      if (!response.success || !response.data?.token) {
        throw new Error(response.data?.message || "Falha na autenticação");
      }

      // Calcular expiração
      const expiresAt = new Date(
        Date.now() + response.data.expiresIn * 1000
      ).toISOString();

      const usuario: Usuario = {
        cd_usuario: response.data.cd_usuario,
        token: response.data.token,
        nome: response.data.nome || cd_usuario,
        email: `${cd_usuario}@grupobueno.com.br`,
        loginEm: new Date().toISOString(),
        expiresAt,
        roles: response.data.roles || [],
        permissions: response.data.permissions || [],
      };

      if (environmentInfo.debugEnabled) {
        Logger.auth("[AUTH] Login HTTP concluído com sucesso");
      }

      return usuario;
    } catch (error) {
      Logger.error("[AUTH] Erro no processo de login:", error);

      // Tratar erros específicos
      if (error instanceof Error) {
        if (error.message.includes("já está logado")) {
          throw new Error(
            "Usuário já está logado em outro dispositivo. Faça logout primeiro."
          );
        }
        if (error.message.includes("Usuário ou senha inválidos")) {
          throw new Error("Usuário ou senha inválidos");
        }
      }

      throw error;
    }
  }

  /**
   * Validar token JWT no ze-backend
   */
  async validarToken(token: string): Promise<boolean> {
    try {
      if (environmentInfo.debugEnabled) {
        Logger.auth("[AUTH] Validando token no ze-backend...");
      }

      const response = await this.makeAuthRequest<ValidateTokenResponse>(
        "/validate",
        { token }
      );

      const isValid = response.success && response.data?.valid === true;

      if (environmentInfo.debugEnabled) {
        Logger.auth(
          "[AUTH] Validação do token:",
          isValid ? "válido" : "inválido"
        );
      }

      return isValid;
    } catch (error) {
      Logger.error("[AUTH] Erro na validação do token:", error);
      return false;
    }
  }

  /**
   * Logout HTTP - Apenas faz a chamada de API
   */
  async logoutHTTP(token: string): Promise<void> {
    try {
      if (environmentInfo.debugEnabled) {
        Logger.auth("[AUTH] Fazendo logout no ze-backend...");
      }

      await this.makeAuthRequest<LogoutResponse>(
        "/logout",
        undefined,
        "POST",
        token
      );

      if (environmentInfo.debugEnabled) {
        Logger.auth("[AUTH] Logout no servidor realizado com sucesso");
      }
    } catch (error) {
      Logger.warn("[AUTH] Erro ao fazer logout no servidor:", error);
      // Não propagar erro - logout local deve continuar
    }
  }

  /**
   * Logout de todas as sessões HTTP
   */
  async logoutAllHTTP(
    cd_usuario: string,
    token?: string
  ): Promise<LogoutAllResponse> {
    try {
      if (environmentInfo.debugEnabled) {
        Logger.auth("[AUTH] Fazendo logout de todas as sessões...", {
          cd_usuario,
        });
      }

      const response = await this.makeAuthRequest<LogoutAllResponse>(
        "/logout-all",
        { cd_usuario },
        "POST",
        token
      );

      if (environmentInfo.debugEnabled) {
        Logger.auth("[AUTH] Logout de todas sessões realizado", response);
      }

      return response;
    } catch (error) {
      Logger.error("[AUTH] Erro ao fazer logout de todas sessões:", error);
      throw error;
    }
  }

  /**
   * Obter informações do serviço
   */
  getServiceInfo() {
    return {
      ambiente: environmentInfo.name,
      authUrl: this.authUrl,
      timeout: this.timeout,
      storage: "SQLite",
      features: {
        jwtAuth: true,
        sessionManagement: true,
        tokenValidation: true,
        remoteLogout: true,
      },
    };
  }

  // ============================================================
  // MÉTODOS DE COMPATIBILIDADE (usam AuthRepository)
  // Esses métodos permitem que outros services acessem dados de sessão
  // sem depender do AuthContext (que só funciona em componentes React)
  // ============================================================

  /**
   * Recuperar sessão ativa do SQLite
   * @returns Sessão completa ou null se não existir
   */
  async recuperarSessao(): Promise<SessaoCompleta | null> {
    try {
      const sessao = await AuthRepository.obterSessaoAtiva();
      return sessao;
    } catch (error) {
      Logger.error("[AUTH_SERVICE] Erro ao recuperar sessão:", error);
      return null;
    }
  }

  /**
   * Verificar se existe uma sessão ativa
   * @returns true se autenticado, false caso contrário
   */
  async isAutenticado(): Promise<boolean> {
    try {
      const sessao = await AuthRepository.obterSessaoAtiva();

      if (!sessao) {
        return false;
      }

      // Verificar expiração local
      if (sessao.expires_at && new Date(sessao.expires_at) < new Date()) {
        Logger.debug("[AUTH_SERVICE] Sessão expirada localmente");
        return false;
      }

      return true;
    } catch (error) {
      Logger.error("[AUTH_SERVICE] Erro ao verificar autenticação:", error);
      return false;
    }
  }

  /**
   * Obter token da sessão ativa
   * @returns Token JWT ou null se não existir sessão
   */
  async obterToken(): Promise<string | null> {
    try {
      const sessao = await AuthRepository.obterSessaoAtiva();
      return sessao?.token || null;
    } catch (error) {
      Logger.error("[AUTH_SERVICE] Erro ao obter token:", error);
      return null;
    }
  }

  /**
   * Obter cd_usuario da sessão ativa
   * @returns cd_usuario ou null se não existir sessão
   */
  async obterCdUsuario(): Promise<string | null> {
    try {
      const sessao = await AuthRepository.obterSessaoAtiva();
      return sessao?.cd_usuario || null;
    } catch (error) {
      Logger.error("[AUTH_SERVICE] Erro ao obter cd_usuario:", error);
      return null;
    }
  }
}

export default new AuthService();
