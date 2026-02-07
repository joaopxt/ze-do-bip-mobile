/**
 * Migration 004 - Schema Entrega
 * Cria tabelas para o módulo de entrega offline
 * Tabelas: rota, carga, carga_volume, cliente, ordem, volume
 */

import * as SQLite from 'expo-sqlite';
import { Logger } from '../../utils/logger';

export async function migration004Entrega(db: SQLite.SQLiteDatabase): Promise<void> {
  Logger.debug('[MIGRATION 004] Criando schema de entrega...');

  // Tabela ROTA - Uma rota por dia por motorista
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS rota (
      id TEXT PRIMARY KEY,
      motorista_id TEXT NOT NULL,
      motorista_nome TEXT NOT NULL,
      placa_veiculo TEXT DEFAULT '',
      ordem_editavel INTEGER DEFAULT 0,
      dt_sync_down TEXT,
      dt_sync_up TEXT,
      status TEXT DEFAULT 'pendente' CHECK(status IN ('pendente', 'em_carga', 'em_rota', 'finalizada')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Tabela CARGA - Carregamento no galpão
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS carga (
      id TEXT PRIMARY KEY,
      rota_id TEXT NOT NULL,
      total_volumes INTEGER DEFAULT 0,
      volumes_bipados INTEGER DEFAULT 0,
      volumes_pendentes INTEGER DEFAULT 0,
      status TEXT DEFAULT 'aguardando' CHECK(status IN ('aguardando', 'em_andamento', 'finalizada')),
      dt_inicio TEXT,
      dt_fim TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (rota_id) REFERENCES rota(id)
    );
  `);

  // Tabela CARGA_VOLUME - Volumes bipados na carga
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS carga_volume (
      id TEXT PRIMARY KEY,
      carga_id TEXT NOT NULL,
      volume_id TEXT,
      codigo_barras TEXT NOT NULL,
      descricao TEXT DEFAULT '',
      status TEXT DEFAULT 'pendente' CHECK(status IN ('pendente', 'bipado')),
      dt_bipagem TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (carga_id) REFERENCES carga(id)
    );
  `);

  // Tabela CLIENTE - Clientes da rota
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS cliente (
      id TEXT PRIMARY KEY,
      rota_id TEXT NOT NULL,
      nome_comercial TEXT NOT NULL,
      nome_formal TEXT DEFAULT '',
      endereco TEXT DEFAULT '',
      cidade TEXT DEFAULT '',
      ordem_na_rota INTEGER DEFAULT 0,
      total_ordens INTEGER DEFAULT 0,
      ordens_finalizadas INTEGER DEFAULT 0,
      status TEXT DEFAULT 'aguardando' CHECK(status IN ('aguardando', 'em_andamento', 'finalizado', 'bloqueado')),
      dt_inicio TEXT,
      dt_fim TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (rota_id) REFERENCES rota(id)
    );
  `);

  // Tabela ORDEM - Ordens de cada cliente (DESCARGA ou COLETA)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ordem (
      id TEXT PRIMARY KEY,
      cliente_id TEXT NOT NULL,
      tipo TEXT NOT NULL CHECK(tipo IN ('DESCARGA', 'COLETA')),
      numero_nota TEXT DEFAULT '',
      serie TEXT DEFAULT '',
      total_volumes INTEGER DEFAULT 0,
      volumes_resolvidos INTEGER DEFAULT 0,
      status TEXT DEFAULT 'aguardando' CHECK(status IN ('aguardando', 'em_andamento', 'finalizada')),
      dt_inicio TEXT,
      dt_fim TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cliente_id) REFERENCES cliente(id)
    );
  `);

  // Tabela VOLUME - Volumes de cada ordem
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS volume (
      id TEXT PRIMARY KEY,
      ordem_id TEXT NOT NULL,
      codigo_barras TEXT NOT NULL,
      descricao TEXT DEFAULT '',
      quantidade INTEGER DEFAULT 1,
      status TEXT DEFAULT 'pendente' CHECK(status IN ('pendente', 'entregue', 'extraviado')),
      observacao TEXT,
      dt_bipagem TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ordem_id) REFERENCES ordem(id)
    );
  `);

  // Índices para performance
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_carga_rota ON carga(rota_id);
    CREATE INDEX IF NOT EXISTS idx_carga_volume_carga ON carga_volume(carga_id);
    CREATE INDEX IF NOT EXISTS idx_carga_volume_barras ON carga_volume(codigo_barras);
    CREATE INDEX IF NOT EXISTS idx_cliente_rota ON cliente(rota_id);
    CREATE INDEX IF NOT EXISTS idx_cliente_ordem ON cliente(ordem_na_rota);
    CREATE INDEX IF NOT EXISTS idx_ordem_cliente ON ordem(cliente_id);
    CREATE INDEX IF NOT EXISTS idx_volume_ordem ON volume(ordem_id);
    CREATE INDEX IF NOT EXISTS idx_volume_barras ON volume(codigo_barras);
    CREATE INDEX IF NOT EXISTS idx_volume_status ON volume(status);
  `);

  Logger.debug('[MIGRATION 004] Schema de entrega criado com sucesso');
}
