/**
 * Inicialização do SQLite Database - Zé do Bip
 * Gerencia conexão e migrations do banco de dados local
 */

import * as SQLite from 'expo-sqlite';
import { Logger } from '../utils/logger';
import { runMigrations } from './migrations';

const DATABASE_NAME = 'ze-do-bip.db';

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Obtém a instância do banco de dados
 * Inicializa e executa migrations se necessário
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) {
    return db;
  }

  try {
    Logger.debug('[DATABASE] Abrindo banco de dados...');
    db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    
    // Executar migrations
    await runMigrations(db);
    
    Logger.debug('[DATABASE] Banco de dados inicializado com sucesso');
    return db;
  } catch (error) {
    Logger.error('[DATABASE] Erro ao inicializar banco de dados:', error);
    throw error;
  }
}

/**
 * Fecha a conexão com o banco de dados
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    try {
      await db.closeAsync();
      db = null;
      Logger.debug('[DATABASE] Conexão com banco de dados fechada');
    } catch (error) {
      Logger.error('[DATABASE] Erro ao fechar banco de dados:', error);
    }
  }
}

/**
 * Reseta o banco de dados (útil para desenvolvimento)
 */
export async function resetDatabase(): Promise<void> {
  try {
    if (db) {
      await db.closeAsync();
      db = null;
    }
    
    await SQLite.deleteDatabaseAsync(DATABASE_NAME);
    Logger.debug('[DATABASE] Banco de dados resetado');
    
    // Reinicializar
    await getDatabase();
  } catch (error) {
    Logger.error('[DATABASE] Erro ao resetar banco de dados:', error);
    throw error;
  }
}

export { db };


