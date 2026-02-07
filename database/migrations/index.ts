/**
 * Sistema de Migrations - Zé da Entrega
 * Gerencia versões do schema do banco de dados
 */

import * as SQLite from "expo-sqlite";
import { Logger } from "../../utils/logger";
import { migration001Initial } from "./001_initial";
import { migration002SyncQueue } from "./002_sync_queue";
import { migration003AuthPermissions } from "./003_auth_permissions";
import { migration004Entrega } from "./004_entrega";

// Lista de migrations em ordem
const migrations = [
  { version: 1, name: "001_initial", run: migration001Initial },
  { version: 2, name: "002_sync_queue", run: migration002SyncQueue },
  { version: 3, name: "003_auth_permissions", run: migration003AuthPermissions },
  { version: 4, name: "004_entrega", run: migration004Entrega },
];

/**
 * Executa todas as migrations pendentes
 */
export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    // Criar tabela de controle de migrations
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        executed_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Obter versão atual
    const result = await db.getFirstAsync<{ max_version: number }>(
      "SELECT MAX(version) as max_version FROM migrations"
    );
    const currentVersion = result?.max_version || 0;

    Logger.debug(`[MIGRATIONS] Versão atual do banco: ${currentVersion}`);

    // Executar migrations pendentes
    for (const migration of migrations) {
      if (migration.version > currentVersion) {
        Logger.debug(`[MIGRATIONS] Executando migration ${migration.name}...`);

        await migration.run(db);

        // Registrar migration executada
        await db.runAsync(
          "INSERT INTO migrations (version, name) VALUES (?, ?)",
          [migration.version, migration.name]
        );

        Logger.debug(
          `[MIGRATIONS] Migration ${migration.name} executada com sucesso`
        );
      }
    }

    Logger.debug("[MIGRATIONS] Todas as migrations executadas");
  } catch (error) {
    Logger.error("[MIGRATIONS] Erro ao executar migrations:", error);
    throw error;
  }
}
