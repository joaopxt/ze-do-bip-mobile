/**
 * Migration 003 - Adicionar roles e permissions
 * Adiciona colunas para armazenar roles e permissions do usuário
 */

import * as SQLite from 'expo-sqlite';
import { Logger } from '../../utils/logger';

export async function migration003AuthPermissions(db: SQLite.SQLiteDatabase): Promise<void> {
  Logger.debug('[MIGRATION 003] Adicionando colunas de roles e permissions...');

  // Adicionar coluna roles (armazenada como JSON string)
  await db.execAsync(`
    ALTER TABLE sessions ADD COLUMN roles TEXT DEFAULT '[]';
  `);

  // Adicionar coluna permissions (armazenada como JSON string)
  await db.execAsync(`
    ALTER TABLE sessions ADD COLUMN permissions TEXT DEFAULT '[]';
  `);

  Logger.debug('[MIGRATION 003] Colunas de roles e permissions adicionadas com sucesso');
}
