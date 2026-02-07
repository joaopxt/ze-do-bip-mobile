/**
 * Migration 001 - Schema Inicial
 * Cria tabelas de users e sessions para autenticação
 */

import * as SQLite from 'expo-sqlite';
import { Logger } from '../../utils/logger';

export async function migration001Initial(db: SQLite.SQLiteDatabase): Promise<void> {
  Logger.debug('[MIGRATION 001] Criando schema inicial...');

  // Tabela de usuários (cache local)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      cd_usuario TEXT PRIMARY KEY,
      nome TEXT,
      email TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Tabela de sessões
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cd_usuario TEXT NOT NULL,
      token TEXT NOT NULL,
      expires_at TEXT,
      login_em TEXT DEFAULT CURRENT_TIMESTAMP,
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY (cd_usuario) REFERENCES users(cd_usuario)
    );
  `);

  // Índice para busca rápida de sessão ativa
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(is_active, cd_usuario);
  `);

  Logger.debug('[MIGRATION 001] Schema inicial criado com sucesso');
}


