/**
 * AuthRepository - Zé do Bip
 * CRUD para users e sessions no SQLite
 */

import { Logger } from "../../utils/logger";
import { getDatabase } from "../database";

// Interfaces
export interface UserRecord {
  cd_usuario: string;
  nome: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface SessionRecord {
  id: number;
  cd_usuario: string;
  token: string;
  expires_at: string | null;
  login_em: string;
  is_active: number;
  roles: string; // JSON string
  permissions: string; // JSON string
}

export interface SessaoCompleta {
  cd_usuario: string;
  token: string;
  nome: string | null;
  email: string | null;
  expires_at: string | null;
  login_em: string;
  roles: string[]; // Parsed from JSON
  permissions: string[]; // Parsed from JSON
}

export interface DadosSessao {
  cd_usuario: string;
  token: string;
  nome?: string;
  email?: string;
  expiresAt?: string;
  roles?: string[];
  permissions?: string[];
}

class AuthRepository {
  /**
   * Salva ou atualiza um usuário no banco
   */
  async salvarUsuario(usuario: {
    cd_usuario: string;
    nome?: string;
    email?: string;
  }): Promise<void> {
    const db = await getDatabase();

    try {
      await db.runAsync(
        `INSERT OR REPLACE INTO users (cd_usuario, nome, email, updated_at) 
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
        [usuario.cd_usuario, usuario.nome || null, usuario.email || null]
      );

      Logger.debug("[AUTH_REPO] Usuário salvo:", usuario.cd_usuario);
    } catch (error) {
      Logger.error("[AUTH_REPO] Erro ao salvar usuário:", error);
      throw error;
    }
  }

  /**
   * Obtém um usuário pelo código
   */
  async obterUsuario(cd_usuario: string): Promise<UserRecord | null> {
    const db = await getDatabase();

    try {
      const result = await db.getFirstAsync<UserRecord>(
        "SELECT * FROM users WHERE cd_usuario = ?",
        [cd_usuario]
      );

      return result || null;
    } catch (error) {
      Logger.error("[AUTH_REPO] Erro ao obter usuário:", error);
      throw error;
    }
  }

  /**
   * Salva uma nova sessão (invalida sessões anteriores)
   */
  async salvarSessao(dados: DadosSessao): Promise<void> {
    const db = await getDatabase();

    try {
      // Iniciar transação
      await db.execAsync("BEGIN TRANSACTION");

      // Salvar/atualizar usuário
      await db.runAsync(
        `INSERT OR REPLACE INTO users (cd_usuario, nome, email, updated_at) 
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
        [dados.cd_usuario, dados.nome || null, dados.email || null]
      );

      // Invalidar sessões anteriores do usuário
      await db.runAsync(
        "UPDATE sessions SET is_active = 0 WHERE cd_usuario = ?",
        [dados.cd_usuario]
      );

      // Serializar roles e permissions como JSON
      const rolesJson = JSON.stringify(dados.roles || []);
      const permissionsJson = JSON.stringify(dados.permissions || []);

      // Criar nova sessão
      await db.runAsync(
        `INSERT INTO sessions (cd_usuario, token, expires_at, is_active, roles, permissions) 
         VALUES (?, ?, ?, 1, ?, ?)`,
        [
          dados.cd_usuario,
          dados.token,
          dados.expiresAt || null,
          rolesJson,
          permissionsJson,
        ]
      );

      // Commit transação
      await db.execAsync("COMMIT");

      Logger.debug("[AUTH_REPO] Sessão salva para usuário:", dados.cd_usuario);
    } catch (error) {
      // Rollback em caso de erro
      await db.execAsync("ROLLBACK");
      Logger.error("[AUTH_REPO] Erro ao salvar sessão:", error);
      throw error;
    }
  }

  /**
   * Obtém a sessão ativa do usuário
   */
  async obterSessaoAtiva(): Promise<SessaoCompleta | null> {
    const db = await getDatabase();

    try {
      // Interface para resultado raw do SQLite (roles/permissions como string JSON)
      interface SessaoRaw {
        cd_usuario: string;
        token: string;
        expires_at: string | null;
        login_em: string;
        nome: string | null;
        email: string | null;
        roles: string | null;
        permissions: string | null;
      }

      const result = await db.getFirstAsync<SessaoRaw>(
        `SELECT 
          s.cd_usuario,
          s.token,
          s.expires_at,
          s.login_em,
          s.roles,
          s.permissions,
          u.nome,
          u.email
         FROM sessions s
         LEFT JOIN users u ON u.cd_usuario = s.cd_usuario
         WHERE s.is_active = 1
         ORDER BY s.id DESC
         LIMIT 1`
      );

      if (result) {
        Logger.debug("[AUTH_REPO] Sessão ativa encontrada:", result.cd_usuario);

        // Parsear roles e permissions de JSON string para array
        const sessaoCompleta: SessaoCompleta = {
          cd_usuario: result.cd_usuario,
          token: result.token,
          expires_at: result.expires_at,
          login_em: result.login_em,
          nome: result.nome,
          email: result.email,
          roles: result.roles ? JSON.parse(result.roles) : [],
          permissions: result.permissions ? JSON.parse(result.permissions) : [],
        };

        Logger.debug("[AUTH_REPO] Roles:", sessaoCompleta.roles);
        Logger.debug("[AUTH_REPO] Permissions:", sessaoCompleta.permissions);

        return sessaoCompleta;
      } else {
        Logger.debug("[AUTH_REPO] Nenhuma sessão ativa encontrada");
      }

      return null;
    } catch (error) {
      Logger.error("[AUTH_REPO] Erro ao obter sessão ativa:", error);
      throw error;
    }
  }

  /**
   * Limpa TODAS as sessões do SQLite (DELETE, não apenas UPDATE)
   * Isso garante que não haja sessões órfãs no banco local
   */
  async limparSessoes(): Promise<void> {
    const db = await getDatabase();

    try {
      await db.runAsync("DELETE FROM sessions");
      Logger.debug("[AUTH_REPO] Todas as sessões foram DELETADAS do SQLite");
    } catch (error) {
      Logger.error("[AUTH_REPO] Erro ao limpar sessões:", error);
      throw error;
    }
  }

  /**
   * @deprecated Use limparSessoes() ao invés. Mantido para compatibilidade.
   */
  async invalidarSessao(): Promise<void> {
    await this.limparSessoes();
  }

  /**
   * Invalida todas as sessões de um usuário
   */
  async invalidarTodasSessoes(cd_usuario: string): Promise<void> {
    const db = await getDatabase();

    try {
      await db.runAsync(
        "UPDATE sessions SET is_active = 0 WHERE cd_usuario = ?",
        [cd_usuario]
      );
      Logger.debug(
        "[AUTH_REPO] Todas as sessões invalidadas para:",
        cd_usuario
      );
    } catch (error) {
      Logger.error("[AUTH_REPO] Erro ao invalidar sessões:", error);
      throw error;
    }
  }

  /**
   * Verifica se o token expirou localmente
   */
  async verificarExpiracao(): Promise<boolean> {
    const sessao = await this.obterSessaoAtiva();

    if (!sessao) {
      return true; // Sem sessão = expirado
    }

    if (!sessao.expires_at) {
      return false; // Sem data de expiração = não expirado
    }

    const agora = new Date();
    const expiracao = new Date(sessao.expires_at);

    return agora >= expiracao;
  }

  /**
   * Limpa todos os dados de autenticação (para reset)
   */
  async limparDados(): Promise<void> {
    const db = await getDatabase();

    try {
      await db.execAsync("BEGIN TRANSACTION");
      await db.execAsync("DELETE FROM sessions");
      await db.execAsync("DELETE FROM users");
      await db.execAsync("COMMIT");

      Logger.debug("[AUTH_REPO] Dados de autenticação limpos");
    } catch (error) {
      await db.execAsync("ROLLBACK");
      Logger.error("[AUTH_REPO] Erro ao limpar dados:", error);
      throw error;
    }
  }
}

// Exportar instância singleton
export default new AuthRepository();
