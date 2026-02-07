/**
 * Authorization Service - Zé da Entrega
 * Service para gerenciamento de usuários e roles
 * Refatorado para usar HttpClient com Axios
 */

import {
  ResultadoBuscaUsuario,
  RoleName,
  UsuarioPainel,
} from "@/app/painel/_types/painel";
import { Logger } from "@/utils/logger";
import { get, post, del } from "./HttpClient";

// Interfaces para respostas da API
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface UsuarioApiResponse {
  codoper?: string;
  cod_oper?: string; // Campo alternativo
  nome: string;
  role: string;
}

class AuthorizationService {
  constructor() {
    Logger.debug("[AUTH_SERVICE] Serviço inicializado com HttpClient");
  }

  /**
   * Buscar usuários com role ADMIN
   */
  async getAdminUsers(): Promise<UsuarioPainel[]> {
    try {
      Logger.api("GET", "/auth/admin/users/admin");

      const result = await get<ApiResponse<UsuarioApiResponse[]>>(
        "/auth/admin/users/admin",
        undefined,
        true // useAuthClient = true para usar authHttpClient
      );

      if (!result.success) {
        throw new Error("Resposta da API inválida");
      }

      Logger.debug(
        `[AUTH_SERVICE] ${result.data.length} admin(s) encontrado(s)`
      );

      return result.data.map((user) => {
        // Garantir que sempre usamos o codoper real, nunca o nome
        const codoper = user.codoper || user.cod_oper;
        // Normalizar role: converter para lowercase e validar
        const roleNormalizada = (user.role || "").toLowerCase().trim();
        const roleValida: RoleName =
          roleNormalizada === "admin" || roleNormalizada === "armazenista"
            ? (roleNormalizada as RoleName)
            : "armazenista"; // Default se inválido

        Logger.debug(`[AUTH_SERVICE] Mapeando admin:`, {
          nome: user.nome,
          codoper: user.codoper,
          cod_oper: user.cod_oper,
          codoperFinal: codoper,
          roleOriginal: user.role,
          roleNormalizada,
          roleValida,
        });

        if (!codoper) {
          Logger.warn(`[AUTH_SERVICE] Usuário sem codoper: ${user.nome}`);
          throw new Error(`Usuário ${user.nome} não possui codoper válido`);
        }

        return {
          codoper: codoper,
          nome: user.nome,
          role: roleValida,
        };
      });
    } catch (error) {
      Logger.error("[AUTH_SERVICE] Erro ao buscar admins", error);
      throw error;
    }
  }

  /**
   * Buscar usuários com role ARMAZENISTA (limitado a 10)
   */
  async getArmazenistaUsers(): Promise<UsuarioPainel[]> {
    try {
      Logger.api("GET", "/auth/admin/users/armazenista");

      const result = await get<ApiResponse<UsuarioApiResponse[]>>(
        "/auth/admin/users/armazenista",
        undefined,
        true // useAuthClient = true para usar authHttpClient
      );

      if (!result.success) {
        throw new Error("Resposta da API inválida");
      }

      Logger.debug(
        `[AUTH_SERVICE] ${result.data.length} armazenista(s) encontrado(s)`
      );

      // Limitar a 10 conforme especificação
      return result.data.map((user) => {
        // Garantir que sempre usamos o codoper real, nunca o nome
        const codoper = user.codoper || user.cod_oper;
        // Normalizar role: converter para lowercase e validar
        const roleNormalizada = (user.role || "").toLowerCase().trim();
        const roleValida: RoleName =
          roleNormalizada === "admin" || roleNormalizada === "armazenista"
            ? (roleNormalizada as RoleName)
            : "armazenista"; // Default se inválido

        Logger.debug(`[AUTH_SERVICE] Mapeando armazenista:`, {
          nome: user.nome,
          codoper: user.codoper,
          cod_oper: user.cod_oper,
          codoperFinal: codoper,
          roleOriginal: user.role,
          roleNormalizada,
          roleValida,
        });

        if (!codoper) {
          Logger.warn(`[AUTH_SERVICE] Usuário sem codoper: ${user.nome}`);
          throw new Error(`Usuário ${user.nome} não possui codoper válido`);
        }

        return {
          codoper: codoper,
          nome: user.nome,
          role: roleValida,
        };
      });
    } catch (error) {
      Logger.error("[AUTH_SERVICE] Erro ao buscar armazenistas", error);
      throw error;
    }
  }

  /**
   * Buscar módulos e permissões de um usuário específico
   * Retorna diretamente os dados sem wrapper de resposta
   */
  async getUserModules(codoper: string): Promise<ResultadoBuscaUsuario> {
    try {
      Logger.api("GET", `/auth/admin/users/${codoper}/modules`);

      // Backend retorna diretamente os dados, sem wrapper { success, data }
      const result = await get<ResultadoBuscaUsuario>(
        `/auth/admin/users/${codoper}/modules`,
        undefined,
        true // useAuthClient = true para usar authHttpClient
      );

      Logger.debug(
        `[AUTH_SERVICE] Usuário ${codoper} encontrado com role: ${
          result.role?.name || "nenhuma"
        }`
      );

      return result;
    } catch (error: any) {
      // Tratar erro 404 especificamente
      if (error?.status === 404) {
        throw new Error("Usuário não encontrado");
      }
      Logger.error(`[AUTH_SERVICE] Erro ao buscar usuário ${codoper}`, error);
      throw error;
    }
  }

  /**
   * Atribuir role a um usuário
   */
  async assignRoleToUser(
    codoper: string,
    roleId: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      Logger.debug(`[AUTH_SERVICE] Atribuindo role:`, {
        codoper,
        roleId,
        codoperLength: codoper.length,
        codoperType: typeof codoper,
      });

      Logger.api("POST", `/auth/admin/users/${codoper}/roles`, {
        role_id: roleId,
      });

      const result = await post<any>(
        `/auth/admin/users/${codoper}/roles`,
        { role_id: roleId },
        undefined,
        true // useAuthClient = true para usar authHttpClient
      );

      Logger.debug(
        `[AUTH_SERVICE] Role ${roleId} atribuída ao usuário ${codoper}`
      );

      return {
        success: true,
        message: result.message || "Role atribuída com sucesso",
      };
    } catch (error) {
      Logger.error(
        `[AUTH_SERVICE] Erro ao atribuir role ao usuário ${codoper}`,
        error
      );
      throw error;
    }
  }

  /**
   * Remover role de um usuário
   */
  async removeRoleFromUser(
    codoper: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      Logger.debug(`[AUTH_SERVICE] Removendo role do usuário:`, {
        codoper,
        codoperLength: codoper.length,
        codoperType: typeof codoper,
      });

      Logger.api("DELETE", `/auth/admin/users/${codoper}/roles`);

      const result = await del<any>(
        `/auth/admin/users/${codoper}/roles`,
        undefined,
        true // useAuthClient = true para usar authHttpClient
      );

      Logger.debug(
        `[AUTH_SERVICE] Role removida do usuário ${codoper}: ${result.success}`
      );

      return {
        success: result.success || false,
        message: result.message || "Role removida com sucesso",
      };
    } catch (error) {
      Logger.error(
        `[AUTH_SERVICE] Erro ao remover role do usuário ${codoper}`,
        error
      );
      throw error;
    }
  }
}

export default new AuthorizationService();
export const authorizationService = new AuthorizationService();
