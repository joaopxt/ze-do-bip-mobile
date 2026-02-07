/**
 * EntregaRepository - Zé da Entrega
 * CRUD completo para as tabelas de entrega no SQLite
 * Opera 100% offline — dados entram via SYNC DOWN, saem via SYNC UP
 */

import { Logger } from "../../utils/logger";
import { getDatabase } from "../database";
import {
  Carga,
  CargaVolume,
  Cliente,
  ContagemCarga,
  ContagemCliente,
  ContagemOrdem,
  Ordem,
  Rota,
  SyncDownPayload,
  SyncUpPayload,
  Volume,
} from "../../types/entrega";

// ============================================================
// CLASSE PRINCIPAL
// ============================================================

class EntregaRepository {

  // ============================================================
  // SYNC DOWN — Salva rota completa do backend no SQLite
  // ============================================================

  async salvarRotaCompleta(payload: SyncDownPayload): Promise<void> {
    const db = await getDatabase();

    try {
      await db.execAsync("BEGIN TRANSACTION");

      // 1. Limpar dados anteriores (uma rota por vez)
      await db.execAsync("DELETE FROM volume");
      await db.execAsync("DELETE FROM ordem");
      await db.execAsync("DELETE FROM cliente");
      await db.execAsync("DELETE FROM carga_volume");
      await db.execAsync("DELETE FROM carga");
      await db.execAsync("DELETE FROM rota");

      // 2. Inserir rota
      await db.runAsync(
        `INSERT INTO rota (id, motorista_id, motorista_nome, placa_veiculo, ordem_editavel, dt_sync_down, status)
         VALUES (?, ?, ?, ?, ?, ?, 'em_carga')`,
        [
          payload.rota.id,
          payload.rota.motorista_id,
          payload.rota.motorista_nome,
          payload.rota.placa_veiculo,
          payload.rota.ordem_editavel ? 1 : 0,
          new Date().toISOString(),
        ]
      );

      // 3. Inserir carga
      const totalVolumesCarga = payload.carga.volumes.length;
      await db.runAsync(
        `INSERT INTO carga (id, rota_id, total_volumes, volumes_bipados, volumes_pendentes, status)
         VALUES (?, ?, ?, 0, ?, 'aguardando')`,
        [payload.carga.id, payload.rota.id, totalVolumesCarga, totalVolumesCarga]
      );

      // 4. Inserir volumes da carga
      for (const vol of payload.carga.volumes) {
        await db.runAsync(
          `INSERT INTO carga_volume (id, carga_id, volume_id, codigo_barras, descricao, status)
           VALUES (?, ?, ?, ?, ?, 'pendente')`,
          [
            `cv_${vol.id}`,
            payload.carga.id,
            vol.id,
            vol.codigo_barras,
            vol.descricao,
          ]
        );
      }

      // 5. Inserir clientes + ordens + volumes
      for (const cli of payload.clientes) {
        const totalOrdens = cli.ordens.length;
        await db.runAsync(
          `INSERT INTO cliente (id, rota_id, nome_comercial, nome_formal, endereco, cidade, ordem_na_rota, total_ordens, ordens_finalizadas, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'aguardando')`,
          [
            cli.id,
            payload.rota.id,
            cli.nome_comercial,
            cli.nome_formal,
            cli.endereco,
            cli.cidade,
            cli.ordem_na_rota,
            totalOrdens,
          ]
        );

        for (const ord of cli.ordens) {
          const totalVolumes = ord.volumes.length;
          await db.runAsync(
            `INSERT INTO ordem (id, cliente_id, tipo, numero_nota, serie, total_volumes, volumes_resolvidos, status)
             VALUES (?, ?, ?, ?, ?, ?, 0, 'aguardando')`,
            [
              ord.id,
              cli.id,
              ord.tipo,
              ord.numero_nota,
              ord.serie,
              totalVolumes,
            ]
          );

          for (const vol of ord.volumes) {
            await db.runAsync(
              `INSERT INTO volume (id, ordem_id, codigo_barras, descricao, quantidade, status)
               VALUES (?, ?, ?, ?, ?, 'pendente')`,
              [vol.id, ord.id, vol.codigo_barras, vol.descricao, vol.quantidade]
            );
          }
        }
      }

      await db.execAsync("COMMIT");

      Logger.debug("[ENTREGA_REPO] Rota completa salva no SQLite", {
        rota: payload.rota.id,
        clientes: payload.clientes.length,
        volumesCarga: totalVolumesCarga,
      });
    } catch (error) {
      await db.execAsync("ROLLBACK");
      Logger.error("[ENTREGA_REPO] Erro ao salvar rota completa:", error);
      throw error;
    }
  }

  // ============================================================
  // ROTA
  // ============================================================

  async obterRotaAtiva(): Promise<Rota | null> {
    const db = await getDatabase();

    try {
      const row = await db.getFirstAsync<any>(
        `SELECT * FROM rota WHERE status != 'finalizada' ORDER BY created_at DESC LIMIT 1`
      );

      if (!row) return null;

      return {
        id: row.id,
        motorista_id: row.motorista_id,
        motorista_nome: row.motorista_nome,
        placa_veiculo: row.placa_veiculo || '',
        ordem_editavel: row.ordem_editavel === 1,
        dt_sync_down: row.dt_sync_down,
        dt_sync_up: row.dt_sync_up,
        status: row.status,
      };
    } catch (error) {
      Logger.error("[ENTREGA_REPO] Erro ao obter rota ativa:", error);
      return null;
    }
  }

  async atualizarStatusRota(rotaId: string, status: string): Promise<void> {
    const db = await getDatabase();

    try {
      await db.runAsync(
        `UPDATE rota SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [status, rotaId]
      );
      Logger.debug(`[ENTREGA_REPO] Rota ${rotaId} atualizada para ${status}`);
    } catch (error) {
      Logger.error("[ENTREGA_REPO] Erro ao atualizar status da rota:", error);
      throw error;
    }
  }

  // ============================================================
  // CARGA
  // ============================================================

  async obterCarga(rotaId: string): Promise<Carga | null> {
    const db = await getDatabase();

    try {
      const row = await db.getFirstAsync<any>(
        `SELECT * FROM carga WHERE rota_id = ? LIMIT 1`,
        [rotaId]
      );

      if (!row) return null;

      return {
        id: row.id,
        rota_id: row.rota_id,
        total_volumes: row.total_volumes,
        volumes_bipados: row.volumes_bipados,
        volumes_pendentes: row.volumes_pendentes,
        status: row.status,
        dt_inicio: row.dt_inicio,
        dt_fim: row.dt_fim,
      };
    } catch (error) {
      Logger.error("[ENTREGA_REPO] Erro ao obter carga:", error);
      return null;
    }
  }

  async obterVolumesCarga(cargaId: string): Promise<CargaVolume[]> {
    const db = await getDatabase();

    try {
      const rows = await db.getAllAsync<any>(
        `SELECT * FROM carga_volume WHERE carga_id = ? ORDER BY created_at ASC`,
        [cargaId]
      );

      return (rows || []).map((row: any) => ({
        id: row.id,
        carga_id: row.carga_id,
        volume_id: row.volume_id,
        codigo_barras: row.codigo_barras,
        descricao: row.descricao || '',
        status: row.status,
        dt_bipagem: row.dt_bipagem,
      }));
    } catch (error) {
      Logger.error("[ENTREGA_REPO] Erro ao obter volumes da carga:", error);
      return [];
    }
  }

  async biparVolumeCarga(cargaId: string, codigoBarras: string): Promise<{ sucesso: boolean; mensagem: string }> {
    const db = await getDatabase();

    try {
      // Verificar se existe e está pendente
      const volume = await db.getFirstAsync<any>(
        `SELECT * FROM carga_volume WHERE carga_id = ? AND codigo_barras = ? AND status = 'pendente' LIMIT 1`,
        [cargaId, codigoBarras]
      );

      if (!volume) {
        // Checar se já bipado
        const jaBipado = await db.getFirstAsync<any>(
          `SELECT * FROM carga_volume WHERE carga_id = ? AND codigo_barras = ? AND status = 'bipado' LIMIT 1`,
          [cargaId, codigoBarras]
        );

        if (jaBipado) {
          return { sucesso: false, mensagem: "Volume já bipado" };
        }
        return { sucesso: false, mensagem: "Volume não encontrado na carga" };
      }

      // Marcar como bipado
      const agora = new Date().toISOString();
      await db.runAsync(
        `UPDATE carga_volume SET status = 'bipado', dt_bipagem = ? WHERE id = ?`,
        [agora, volume.id]
      );

      // Atualizar contadores da carga
      await db.runAsync(
        `UPDATE carga SET
          volumes_bipados = (SELECT COUNT(*) FROM carga_volume WHERE carga_id = ? AND status = 'bipado'),
          volumes_pendentes = (SELECT COUNT(*) FROM carga_volume WHERE carga_id = ? AND status = 'pendente'),
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [cargaId, cargaId, cargaId]
      );

      Logger.debug(`[ENTREGA_REPO] Volume ${codigoBarras} bipado na carga`);
      return { sucesso: true, mensagem: "Volume bipado com sucesso" };
    } catch (error) {
      Logger.error("[ENTREGA_REPO] Erro ao bipar volume na carga:", error);
      return { sucesso: false, mensagem: "Erro ao bipar volume" };
    }
  }

  async iniciarCarga(cargaId: string): Promise<void> {
    const db = await getDatabase();

    try {
      await db.runAsync(
        `UPDATE carga SET status = 'em_andamento', dt_inicio = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [new Date().toISOString(), cargaId]
      );
      Logger.debug(`[ENTREGA_REPO] Carga ${cargaId} iniciada`);
    } catch (error) {
      Logger.error("[ENTREGA_REPO] Erro ao iniciar carga:", error);
      throw error;
    }
  }

  async finalizarCarga(cargaId: string): Promise<boolean> {
    const db = await getDatabase();

    try {
      // Verificar se todos bipados
      const pendentes = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM carga_volume WHERE carga_id = ? AND status = 'pendente'`,
        [cargaId]
      );

      if ((pendentes?.count || 0) > 0) {
        Logger.warn(`[ENTREGA_REPO] Carga ${cargaId} ainda tem ${pendentes?.count} pendentes`);
        return false;
      }

      await db.runAsync(
        `UPDATE carga SET status = 'finalizada', dt_fim = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [new Date().toISOString(), cargaId]
      );

      Logger.debug(`[ENTREGA_REPO] Carga ${cargaId} finalizada`);
      return true;
    } catch (error) {
      Logger.error("[ENTREGA_REPO] Erro ao finalizar carga:", error);
      return false;
    }
  }

  async obterContagemCarga(cargaId: string): Promise<ContagemCarga> {
    const db = await getDatabase();

    try {
      const row = await db.getFirstAsync<any>(
        `SELECT total_volumes, volumes_bipados, volumes_pendentes FROM carga WHERE id = ?`,
        [cargaId]
      );

      if (!row) return { total: 0, bipados: 0, pendentes: 0, percentual: 0 };

      const total = row.total_volumes || 0;
      const bipados = row.volumes_bipados || 0;

      return {
        total,
        bipados,
        pendentes: row.volumes_pendentes || 0,
        percentual: total > 0 ? Math.round((bipados / total) * 100) : 0,
      };
    } catch (error) {
      Logger.error("[ENTREGA_REPO] Erro ao obter contagem da carga:", error);
      return { total: 0, bipados: 0, pendentes: 0, percentual: 0 };
    }
  }

  // ============================================================
  // CLIENTES
  // ============================================================

  async obterClientesDaRota(rotaId: string): Promise<Cliente[]> {
    const db = await getDatabase();

    try {
      const rows = await db.getAllAsync<any>(
        `SELECT * FROM cliente WHERE rota_id = ? ORDER BY ordem_na_rota ASC`,
        [rotaId]
      );

      return (rows || []).map((row: any) => ({
        id: row.id,
        rota_id: row.rota_id,
        nome_comercial: row.nome_comercial,
        nome_formal: row.nome_formal || '',
        endereco: row.endereco || '',
        cidade: row.cidade || '',
        ordem_na_rota: row.ordem_na_rota,
        total_ordens: row.total_ordens,
        ordens_finalizadas: row.ordens_finalizadas,
        status: row.status,
        dt_inicio: row.dt_inicio,
        dt_fim: row.dt_fim,
      }));
    } catch (error) {
      Logger.error("[ENTREGA_REPO] Erro ao obter clientes da rota:", error);
      return [];
    }
  }

  async obterClienteById(clienteId: string): Promise<Cliente | null> {
    const db = await getDatabase();

    try {
      const row = await db.getFirstAsync<any>(
        `SELECT * FROM cliente WHERE id = ?`,
        [clienteId]
      );

      if (!row) return null;

      return {
        id: row.id,
        rota_id: row.rota_id,
        nome_comercial: row.nome_comercial,
        nome_formal: row.nome_formal || '',
        endereco: row.endereco || '',
        cidade: row.cidade || '',
        ordem_na_rota: row.ordem_na_rota,
        total_ordens: row.total_ordens,
        ordens_finalizadas: row.ordens_finalizadas,
        status: row.status,
        dt_inicio: row.dt_inicio,
        dt_fim: row.dt_fim,
      };
    } catch (error) {
      Logger.error("[ENTREGA_REPO] Erro ao obter cliente:", error);
      return null;
    }
  }

  async iniciarEntregaCliente(clienteId: string): Promise<void> {
    const db = await getDatabase();

    try {
      await db.runAsync(
        `UPDATE cliente SET status = 'em_andamento', dt_inicio = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [new Date().toISOString(), clienteId]
      );
      Logger.debug(`[ENTREGA_REPO] Entrega do cliente ${clienteId} iniciada`);
    } catch (error) {
      Logger.error("[ENTREGA_REPO] Erro ao iniciar entrega do cliente:", error);
      throw error;
    }
  }

  async finalizarEntregaCliente(clienteId: string): Promise<boolean> {
    const db = await getDatabase();

    try {
      // Verificar se todas as ordens estão finalizadas
      const naoFinalizadas = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM ordem WHERE cliente_id = ? AND status != 'finalizada'`,
        [clienteId]
      );

      if ((naoFinalizadas?.count || 0) > 0) {
        Logger.warn(`[ENTREGA_REPO] Cliente ${clienteId} ainda tem ${naoFinalizadas?.count} ordens não finalizadas`);
        return false;
      }

      await db.runAsync(
        `UPDATE cliente SET status = 'finalizado', dt_fim = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [new Date().toISOString(), clienteId]
      );

      Logger.debug(`[ENTREGA_REPO] Entrega do cliente ${clienteId} finalizada`);
      return true;
    } catch (error) {
      Logger.error("[ENTREGA_REPO] Erro ao finalizar entrega do cliente:", error);
      return false;
    }
  }

  async obterContagemCliente(clienteId: string): Promise<ContagemCliente> {
    const db = await getDatabase();

    try {
      const ordensRow = await db.getFirstAsync<any>(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'finalizada' THEN 1 ELSE 0 END) as finalizadas
         FROM ordem WHERE cliente_id = ?`,
        [clienteId]
      );

      const volumesRow = await db.getFirstAsync<any>(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN v.status = 'entregue' THEN 1 ELSE 0 END) as entregues,
          SUM(CASE WHEN v.status = 'extraviado' THEN 1 ELSE 0 END) as extraviados,
          SUM(CASE WHEN v.status = 'pendente' THEN 1 ELSE 0 END) as pendentes
         FROM volume v
         INNER JOIN ordem o ON o.id = v.ordem_id
         WHERE o.cliente_id = ?`,
        [clienteId]
      );

      return {
        totalOrdens: ordensRow?.total || 0,
        ordensFinalizadas: ordensRow?.finalizadas || 0,
        totalVolumes: volumesRow?.total || 0,
        volumesEntregues: volumesRow?.entregues || 0,
        volumesExtraviados: volumesRow?.extraviados || 0,
        volumesPendentes: volumesRow?.pendentes || 0,
      };
    } catch (error) {
      Logger.error("[ENTREGA_REPO] Erro ao obter contagem do cliente:", error);
      return {
        totalOrdens: 0,
        ordensFinalizadas: 0,
        totalVolumes: 0,
        volumesEntregues: 0,
        volumesExtraviados: 0,
        volumesPendentes: 0,
      };
    }
  }

  // ============================================================
  // ORDENS
  // ============================================================

  async obterOrdensCliente(clienteId: string): Promise<Ordem[]> {
    const db = await getDatabase();

    try {
      const rows = await db.getAllAsync<any>(
        `SELECT * FROM ordem WHERE cliente_id = ? ORDER BY tipo ASC, created_at ASC`,
        [clienteId]
      );

      return (rows || []).map((row: any) => ({
        id: row.id,
        cliente_id: row.cliente_id,
        tipo: row.tipo,
        numero_nota: row.numero_nota || '',
        serie: row.serie || '',
        total_volumes: row.total_volumes,
        volumes_resolvidos: row.volumes_resolvidos,
        status: row.status,
        dt_inicio: row.dt_inicio,
        dt_fim: row.dt_fim,
      }));
    } catch (error) {
      Logger.error("[ENTREGA_REPO] Erro ao obter ordens do cliente:", error);
      return [];
    }
  }

  async finalizarOrdem(ordemId: string): Promise<boolean> {
    const db = await getDatabase();

    try {
      // Verificar se todos os volumes estão resolvidos
      const pendentes = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM volume WHERE ordem_id = ? AND status = 'pendente'`,
        [ordemId]
      );

      if ((pendentes?.count || 0) > 0) {
        Logger.warn(`[ENTREGA_REPO] Ordem ${ordemId} ainda tem ${pendentes?.count} volumes pendentes`);
        return false;
      }

      const agora = new Date().toISOString();

      await db.runAsync(
        `UPDATE ordem SET status = 'finalizada', dt_fim = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [agora, ordemId]
      );

      // Atualizar contagem do cliente
      const ordem = await db.getFirstAsync<any>(
        `SELECT cliente_id FROM ordem WHERE id = ?`,
        [ordemId]
      );

      if (ordem) {
        await db.runAsync(
          `UPDATE cliente SET
            ordens_finalizadas = (SELECT COUNT(*) FROM ordem WHERE cliente_id = ? AND status = 'finalizada'),
            updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [ordem.cliente_id, ordem.cliente_id]
        );
      }

      Logger.debug(`[ENTREGA_REPO] Ordem ${ordemId} finalizada`);
      return true;
    } catch (error) {
      Logger.error("[ENTREGA_REPO] Erro ao finalizar ordem:", error);
      return false;
    }
  }

  async obterContagemOrdem(ordemId: string): Promise<ContagemOrdem> {
    const db = await getDatabase();

    try {
      const row = await db.getFirstAsync<any>(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'entregue' THEN 1 ELSE 0 END) as entregues,
          SUM(CASE WHEN status = 'extraviado' THEN 1 ELSE 0 END) as extraviados,
          SUM(CASE WHEN status = 'pendente' THEN 1 ELSE 0 END) as pendentes
         FROM volume WHERE ordem_id = ?`,
        [ordemId]
      );

      const total = row?.total || 0;
      const entregues = row?.entregues || 0;
      const extraviados = row?.extraviados || 0;

      return {
        total,
        entregues,
        extraviados,
        pendentes: row?.pendentes || 0,
        percentual: total > 0 ? Math.round(((entregues + extraviados) / total) * 100) : 0,
      };
    } catch (error) {
      Logger.error("[ENTREGA_REPO] Erro ao obter contagem da ordem:", error);
      return { total: 0, entregues: 0, extraviados: 0, pendentes: 0, percentual: 0 };
    }
  }

  // ============================================================
  // VOLUMES
  // ============================================================

  async obterVolumesOrdem(ordemId: string): Promise<Volume[]> {
    const db = await getDatabase();

    try {
      const rows = await db.getAllAsync<any>(
        `SELECT * FROM volume WHERE ordem_id = ? ORDER BY status ASC, created_at ASC`,
        [ordemId]
      );

      return (rows || []).map((row: any) => ({
        id: row.id,
        ordem_id: row.ordem_id,
        codigo_barras: row.codigo_barras,
        descricao: row.descricao || '',
        quantidade: row.quantidade || 1,
        status: row.status,
        observacao: row.observacao,
        dt_bipagem: row.dt_bipagem,
      }));
    } catch (error) {
      Logger.error("[ENTREGA_REPO] Erro ao obter volumes da ordem:", error);
      return [];
    }
  }

  async obterVolumesFaltantes(ordemId: string): Promise<Volume[]> {
    const db = await getDatabase();

    try {
      const rows = await db.getAllAsync<any>(
        `SELECT * FROM volume WHERE ordem_id = ? AND status = 'pendente' ORDER BY created_at ASC`,
        [ordemId]
      );

      return (rows || []).map((row: any) => ({
        id: row.id,
        ordem_id: row.ordem_id,
        codigo_barras: row.codigo_barras,
        descricao: row.descricao || '',
        quantidade: row.quantidade || 1,
        status: row.status,
        observacao: row.observacao,
        dt_bipagem: row.dt_bipagem,
      }));
    } catch (error) {
      Logger.error("[ENTREGA_REPO] Erro ao obter volumes faltantes:", error);
      return [];
    }
  }

  async biparVolumeEntrega(ordemId: string, codigoBarras: string): Promise<{ sucesso: boolean; mensagem: string }> {
    const db = await getDatabase();

    try {
      const volume = await db.getFirstAsync<any>(
        `SELECT * FROM volume WHERE ordem_id = ? AND codigo_barras = ? AND status = 'pendente' LIMIT 1`,
        [ordemId, codigoBarras]
      );

      if (!volume) {
        const jaBipado = await db.getFirstAsync<any>(
          `SELECT * FROM volume WHERE ordem_id = ? AND codigo_barras = ? AND status = 'entregue' LIMIT 1`,
          [ordemId, codigoBarras]
        );

        if (jaBipado) {
          return { sucesso: false, mensagem: "Volume já entregue" };
        }

        const extraviado = await db.getFirstAsync<any>(
          `SELECT * FROM volume WHERE ordem_id = ? AND codigo_barras = ? AND status = 'extraviado' LIMIT 1`,
          [ordemId, codigoBarras]
        );

        if (extraviado) {
          return { sucesso: false, mensagem: "Volume marcado como extraviado" };
        }

        return { sucesso: false, mensagem: "Volume não encontrado nesta ordem" };
      }

      const agora = new Date().toISOString();

      await db.runAsync(
        `UPDATE volume SET status = 'entregue', dt_bipagem = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [agora, volume.id]
      );

      // Atualizar contadores da ordem
      await db.runAsync(
        `UPDATE ordem SET
          volumes_resolvidos = (SELECT COUNT(*) FROM volume WHERE ordem_id = ? AND status != 'pendente'),
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [ordemId, ordemId]
      );

      Logger.debug(`[ENTREGA_REPO] Volume ${codigoBarras} entregue (ordem ${ordemId})`);
      return { sucesso: true, mensagem: "Volume entregue com sucesso" };
    } catch (error) {
      Logger.error("[ENTREGA_REPO] Erro ao bipar volume entrega:", error);
      return { sucesso: false, mensagem: "Erro ao bipar volume" };
    }
  }

  async marcarExtraviado(volumeId: string, observacao: string): Promise<boolean> {
    const db = await getDatabase();

    try {
      if (!observacao.trim()) {
        Logger.warn("[ENTREGA_REPO] Observação obrigatória para extraviado");
        return false;
      }

      const agora = new Date().toISOString();

      // Obter ordem_id antes de atualizar
      const volume = await db.getFirstAsync<any>(
        `SELECT ordem_id FROM volume WHERE id = ?`,
        [volumeId]
      );

      if (!volume) {
        Logger.warn(`[ENTREGA_REPO] Volume ${volumeId} não encontrado`);
        return false;
      }

      await db.runAsync(
        `UPDATE volume SET status = 'extraviado', observacao = ?, dt_bipagem = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [observacao.trim(), agora, volumeId]
      );

      // Atualizar contadores da ordem
      await db.runAsync(
        `UPDATE ordem SET
          volumes_resolvidos = (SELECT COUNT(*) FROM volume WHERE ordem_id = ? AND status != 'pendente'),
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [volume.ordem_id, volume.ordem_id]
      );

      Logger.debug(`[ENTREGA_REPO] Volume ${volumeId} marcado como extraviado`);
      return true;
    } catch (error) {
      Logger.error("[ENTREGA_REPO] Erro ao marcar volume como extraviado:", error);
      return false;
    }
  }

  // ============================================================
  // SYNC UP — Monta payload completo para enviar ao backend
  // ============================================================

  async montarPayloadSyncUp(rotaId: string): Promise<SyncUpPayload | null> {
    const db = await getDatabase();

    try {
      const rota = await db.getFirstAsync<any>(
        `SELECT * FROM rota WHERE id = ?`,
        [rotaId]
      );

      if (!rota) {
        Logger.error(`[ENTREGA_REPO] Rota ${rotaId} não encontrada para SYNC UP`);
        return null;
      }

      // Carga
      const carga = await db.getFirstAsync<any>(
        `SELECT * FROM carga WHERE rota_id = ?`,
        [rotaId]
      );

      const cargaVolumes = carga
        ? await db.getAllAsync<any>(
            `SELECT id, status, dt_bipagem FROM carga_volume WHERE carga_id = ?`,
            [carga.id]
          )
        : [];

      // Clientes + Ordens + Volumes
      const clientes = await db.getAllAsync<any>(
        `SELECT * FROM cliente WHERE rota_id = ? ORDER BY ordem_na_rota ASC`,
        [rotaId]
      );

      const clientesPayload = [];

      for (const cli of clientes || []) {
        const ordens = await db.getAllAsync<any>(
          `SELECT * FROM ordem WHERE cliente_id = ?`,
          [cli.id]
        );

        const ordensPayload = [];

        for (const ord of ordens || []) {
          const volumes = await db.getAllAsync<any>(
            `SELECT id, status, observacao, dt_bipagem FROM volume WHERE ordem_id = ?`,
            [ord.id]
          );

          ordensPayload.push({
            id: ord.id,
            status: ord.status,
            dt_inicio: ord.dt_inicio,
            dt_fim: ord.dt_fim,
            volumes: (volumes || []).map((v: any) => ({
              id: v.id,
              status: v.status,
              observacao: v.observacao,
              dt_bipagem: v.dt_bipagem,
            })),
          });
        }

        clientesPayload.push({
          id: cli.id,
          status: cli.status,
          dt_inicio: cli.dt_inicio,
          dt_fim: cli.dt_fim,
          ordens: ordensPayload,
        });
      }

      const payload: SyncUpPayload = {
        rota_id: rotaId,
        motorista_id: rota.motorista_id,
        dt_sync_down: rota.dt_sync_down || '',
        dt_sync_up: new Date().toISOString(),
        carga: {
          id: carga?.id || '',
          status: carga?.status || 'aguardando',
          dt_inicio: carga?.dt_inicio || null,
          dt_fim: carga?.dt_fim || null,
          volumes: (cargaVolumes || []).map((v: any) => ({
            id: v.id,
            status: v.status,
            dt_bipagem: v.dt_bipagem,
          })),
        },
        clientes: clientesPayload,
      };

      Logger.debug("[ENTREGA_REPO] Payload SYNC UP montado", {
        rota: rotaId,
        clientes: clientesPayload.length,
      });

      return payload;
    } catch (error) {
      Logger.error("[ENTREGA_REPO] Erro ao montar payload SYNC UP:", error);
      return null;
    }
  }

  // ============================================================
  // UTILIDADES
  // ============================================================

  async limparDadosEntrega(): Promise<void> {
    const db = await getDatabase();

    try {
      await db.execAsync("BEGIN TRANSACTION");
      await db.execAsync("DELETE FROM volume");
      await db.execAsync("DELETE FROM ordem");
      await db.execAsync("DELETE FROM cliente");
      await db.execAsync("DELETE FROM carga_volume");
      await db.execAsync("DELETE FROM carga");
      await db.execAsync("DELETE FROM rota");
      await db.execAsync("COMMIT");

      Logger.debug("[ENTREGA_REPO] Dados de entrega limpos");
    } catch (error) {
      await db.execAsync("ROLLBACK");
      Logger.error("[ENTREGA_REPO] Erro ao limpar dados de entrega:", error);
      throw error;
    }
  }

  async obterEstatisticasGerais(rotaId: string): Promise<{
    totalClientes: number;
    clientesFinalizados: number;
    totalOrdens: number;
    ordensFinalizadas: number;
    totalVolumes: number;
    volumesEntregues: number;
    volumesExtraviados: number;
    volumesPendentes: number;
  }> {
    const db = await getDatabase();

    try {
      const clientesRow = await db.getFirstAsync<any>(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'finalizado' THEN 1 ELSE 0 END) as finalizados
         FROM cliente WHERE rota_id = ?`,
        [rotaId]
      );

      const ordensRow = await db.getFirstAsync<any>(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN o.status = 'finalizada' THEN 1 ELSE 0 END) as finalizadas
         FROM ordem o
         INNER JOIN cliente c ON c.id = o.cliente_id
         WHERE c.rota_id = ?`,
        [rotaId]
      );

      const volumesRow = await db.getFirstAsync<any>(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN v.status = 'entregue' THEN 1 ELSE 0 END) as entregues,
          SUM(CASE WHEN v.status = 'extraviado' THEN 1 ELSE 0 END) as extraviados,
          SUM(CASE WHEN v.status = 'pendente' THEN 1 ELSE 0 END) as pendentes
         FROM volume v
         INNER JOIN ordem o ON o.id = v.ordem_id
         INNER JOIN cliente c ON c.id = o.cliente_id
         WHERE c.rota_id = ?`,
        [rotaId]
      );

      return {
        totalClientes: clientesRow?.total || 0,
        clientesFinalizados: clientesRow?.finalizados || 0,
        totalOrdens: ordensRow?.total || 0,
        ordensFinalizadas: ordensRow?.finalizadas || 0,
        totalVolumes: volumesRow?.total || 0,
        volumesEntregues: volumesRow?.entregues || 0,
        volumesExtraviados: volumesRow?.extraviados || 0,
        volumesPendentes: volumesRow?.pendentes || 0,
      };
    } catch (error) {
      Logger.error("[ENTREGA_REPO] Erro ao obter estatísticas gerais:", error);
      return {
        totalClientes: 0,
        clientesFinalizados: 0,
        totalOrdens: 0,
        ordensFinalizadas: 0,
        totalVolumes: 0,
        volumesEntregues: 0,
        volumesExtraviados: 0,
        volumesPendentes: 0,
      };
    }
  }
}

// Exportar instância singleton
export default new EntregaRepository();