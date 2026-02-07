/**
 * SyncQueueRepository - Zé do Bip
 * Gerencia fila de ações offline para sincronização quando online
 */

import { Logger } from "../../utils/logger";
import { getDatabase } from "../database";

// Tipos de ações que podem ser enfileiradas
export type SyncActionType = "LOGOUT" | "LOGOUT_ALL";

// Status das ações na fila
export type SyncStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

// Interface para uma ação na fila
export interface SyncQueueItem {
  id: number;
  action_type: SyncActionType;
  payload: string;
  created_at: string;
  retry_count: number;
  last_error: string | null;
  status: SyncStatus;
}

// Interface para payload de logout
export interface LogoutPayload {
  token: string;
  cd_usuario: string;
}

class SyncQueueRepository {
  /**
   * Adiciona uma ação à fila de sincronização
   */
  async enfileirar(actionType: SyncActionType, payload: object): Promise<void> {
    const db = await getDatabase();

    try {
      await db.runAsync(
        `INSERT INTO sync_queue (action_type, payload, status) VALUES (?, ?, 'PENDING')`,
        [actionType, JSON.stringify(payload)]
      );

      Logger.debug("[SYNC_QUEUE] Ação enfileirada:", { actionType, payload });
    } catch (error) {
      Logger.error("[SYNC_QUEUE] Erro ao enfileirar ação:", error);
      throw error;
    }
  }

  /**
   * Obtém todas as ações pendentes
   */
  async obterPendentes(): Promise<SyncQueueItem[]> {
    const db = await getDatabase();

    try {
      const result = await db.getAllAsync<SyncQueueItem>(
        `SELECT * FROM sync_queue WHERE status = 'PENDING' ORDER BY created_at ASC`
      );

      return result || [];
    } catch (error) {
      Logger.error("[SYNC_QUEUE] Erro ao obter ações pendentes:", error);
      return [];
    }
  }

  /**
   * Marca uma ação como concluída
   */
  async marcarConcluida(id: number): Promise<void> {
    const db = await getDatabase();

    try {
      await db.runAsync(
        `UPDATE sync_queue SET status = 'COMPLETED' WHERE id = ?`,
        [id]
      );

      Logger.debug("[SYNC_QUEUE] Ação marcada como concluída:", id);
    } catch (error) {
      Logger.error("[SYNC_QUEUE] Erro ao marcar ação como concluída:", error);
    }
  }

  /**
   * Marca uma ação como falha e incrementa retry_count
   */
  async marcarFalha(id: number, erro: string): Promise<void> {
    const db = await getDatabase();

    try {
      await db.runAsync(
        `UPDATE sync_queue SET status = 'FAILED', retry_count = retry_count + 1, last_error = ? WHERE id = ?`,
        [erro, id]
      );

      Logger.debug("[SYNC_QUEUE] Ação marcada como falha:", { id, erro });
    } catch (error) {
      Logger.error("[SYNC_QUEUE] Erro ao marcar ação como falha:", error);
    }
  }

  /**
   * Reseta ações com falha para tentar novamente (máximo 3 tentativas)
   */
  async resetarFalhasParaRetry(): Promise<void> {
    const db = await getDatabase();

    try {
      await db.runAsync(
        `UPDATE sync_queue SET status = 'PENDING' WHERE status = 'FAILED' AND retry_count < 3`
      );

      Logger.debug("[SYNC_QUEUE] Ações com falha resetadas para retry");
    } catch (error) {
      Logger.error("[SYNC_QUEUE] Erro ao resetar falhas:", error);
    }
  }

  /**
   * Remove ações concluídas (limpeza)
   */
  async limparConcluidas(): Promise<void> {
    const db = await getDatabase();

    try {
      await db.runAsync(`DELETE FROM sync_queue WHERE status = 'COMPLETED'`);
      Logger.debug("[SYNC_QUEUE] Ações concluídas removidas");
    } catch (error) {
      Logger.error("[SYNC_QUEUE] Erro ao limpar concluídas:", error);
    }
  }

  /**
   * Verifica se há ações pendentes na fila
   */
  async temPendentes(): Promise<boolean> {
    const db = await getDatabase();

    try {
      const result = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM sync_queue WHERE status = 'PENDING'`
      );

      return (result?.count || 0) > 0;
    } catch (error) {
      Logger.error("[SYNC_QUEUE] Erro ao verificar pendentes:", error);
      return false;
    }
  }
}

// Exportar instância singleton
export default new SyncQueueRepository();
