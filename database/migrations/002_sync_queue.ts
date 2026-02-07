/**
 * Migration 002 - Sync Queue
 * Cria tabela para enfileirar ações offline que serão sincronizadas quando online
 */

import * as SQLite from "expo-sqlite";
import { Logger } from "../../utils/logger";

export async function migration002SyncQueue(
  db: SQLite.SQLiteDatabase
): Promise<void> {
  Logger.debug("[MIGRATION 002] Criando tabela sync_queue...");

  // Tabela de fila de sincronização offline
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      retry_count INTEGER DEFAULT 0,
      last_error TEXT,
      status TEXT DEFAULT 'PENDING'
    );
  `);

  // Índice para buscar ações pendentes
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
  `);

  Logger.debug("[MIGRATION 002] Tabela sync_queue criada com sucesso");
}
