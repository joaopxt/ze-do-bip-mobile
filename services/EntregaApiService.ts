/**
 * Entrega API Service - Zé da Entrega
 * Serviço de sincronização de rotas (sync-down/sync-up)
 *
 * Endpoints:
 * - POST /entrega/sync-down — Puxa rota completa do backend para offline
 * - POST /entrega/sync-up — Envia resultados de entrega pro backend
 * - GET /entrega/health — Testa conectividade
 * - GET /entrega/rota-disponivel — Verifica se há rota disponível
 *
 * DEV_MODE: Usa mock data com delay de 1s quando __DEV__ é true
 */

import { config } from "@/constants/Environment";
import { Logger } from "@/utils/logger";
import { get, post } from "./HttpClient";
import { SyncDownPayload, SyncUpPayload } from "@/types/entrega";

// ============================================================
// TIPOS INTERNOS
// ============================================================

interface SyncDownResponse {
  success: boolean;
  data: SyncDownPayload;
}

interface SyncUpResponse {
  success: boolean;
}

interface HealthCheckResponse {
  online: boolean;
  latencia?: number;
}

interface RotaDisponibilidadeResponse {
  disponivel: boolean;
  rota_id?: string;
}

// ============================================================
// MOCK DATA (Development Mode)
// ============================================================

/**
 * Gera payload mock realista para testes locais
 */
function generateMockSyncDownPayload(motoristaId: string): SyncDownPayload {
  const rotaId = "rota_dev_001";
  const cargaId = "carga_dev_001";

  // 5 volumes na carga geral
  const volumes_carga = [
    { id: "vol_dev_001", codigo_barras: "VOL001", descricao: "Bebidas Energética" },
    { id: "vol_dev_002", codigo_barras: "VOL002", descricao: "Água Mineral 1.5L" },
    { id: "vol_dev_003", codigo_barras: "VOL003", descricao: "Refrigerante 2L" },
    { id: "vol_dev_004", codigo_barras: "VOL004", descricao: "Suco Natural" },
    { id: "vol_dev_005", codigo_barras: "VOL005", descricao: "Cerveja Premium" },
  ];

  // 3 clientes com ordens variadas
  const clientes: SyncDownPayload["clientes"] = [
    {
      id: "cli_dev_001",
      nome_comercial: "Mercado Premium São Paulo",
      nome_formal: "Mercado Premium Ltda.",
      endereco: "Av. Paulista, 1000 - Apto 501",
      cidade: "São Paulo",
      ordem_na_rota: 1,
      ordens: [
        {
          id: "ord_dev_001",
          tipo: "DESCARGA",
          numero_nota: "NF-001234",
          serie: "A",
          volumes: [
            { id: "vol_cli1_001", codigo_barras: "VOL001", descricao: "Bebidas Energética", quantidade: 12 },
            { id: "vol_cli1_002", codigo_barras: "VOL002", descricao: "Água Mineral 1.5L", quantidade: 24 },
          ],
        },
        {
          id: "ord_dev_002",
          tipo: "COLETA",
          numero_nota: "NF-001235",
          serie: "A",
          volumes: [
            { id: "vol_cli1_003", codigo_barras: "VOL003", descricao: "Refrigerante 2L", quantidade: 6 },
          ],
        },
      ],
    },
    {
      id: "cli_dev_002",
      nome_comercial: "Distribuidora Central da Zona Norte",
      nome_formal: "Distribuidora Central Ltda.",
      endereco: "Rua das Flores, 456 - Sala 302",
      cidade: "São Paulo",
      ordem_na_rota: 2,
      ordens: [
        {
          id: "ord_dev_003",
          tipo: "DESCARGA",
          numero_nota: "NF-001236",
          serie: "A",
          volumes: [
            { id: "vol_cli2_001", codigo_barras: "VOL004", descricao: "Suco Natural", quantidade: 18 },
            { id: "vol_cli2_002", codigo_barras: "VOL005", descricao: "Cerveja Premium", quantidade: 30 },
          ],
        },
      ],
    },
    {
      id: "cli_dev_003",
      nome_comercial: "Comércio e Alimentos Brasil",
      nome_formal: "Comércio e Alimentos Brasil S.A.",
      endereco: "Rua do Comércio, 789 - Sala 1",
      cidade: "Guarulhos",
      ordem_na_rota: 3,
      ordens: [
        {
          id: "ord_dev_004",
          tipo: "DESCARGA",
          numero_nota: "NF-001237",
          serie: "A",
          volumes: [
            { id: "vol_cli3_001", codigo_barras: "VOL001", descricao: "Bebidas Energética", quantidade: 6 },
          ],
        },
        {
          id: "ord_dev_005",
          tipo: "COLETA",
          numero_nota: "NF-001238",
          serie: "B",
          volumes: [
            { id: "vol_cli3_002", codigo_barras: "VOL002", descricao: "Água Mineral 1.5L", quantidade: 12 },
            { id: "vol_cli3_003", codigo_barras: "VOL003", descricao: "Refrigerante 2L", quantidade: 4 },
          ],
        },
      ],
    },
  ];

  return {
    rota: {
      id: rotaId,
      motorista_id: motoristaId,
      motorista_nome: "Motorista Dev",
      placa_veiculo: "ABC-1234",
      ordem_editavel: false,
    },
    carga: {
      id: cargaId,
      volumes: volumes_carga,
    },
    clientes,
  };
}

/**
 * Aguarda delay (simula latência de rede)
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// SERVIÇO
// ============================================================

class EntregaApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.api.baseUrl;
    Logger.debug(`[ENTREGA_API] Inicializado com baseUrl: ${this.baseUrl}`);
  }

  /**
   * SYNC DOWN - Puxa rota completa do backend
   * POST /entrega/sync-down
   * Body: { motorista_id: string }
   * Response: { success: boolean, data: SyncDownPayload }
   */
  async syncDown(motoristaId: string): Promise<SyncDownPayload> {
    try {
      Logger.api("POST", "/entrega/sync-down", { motorista_id: motoristaId });

      if (!motoristaId) {
        throw new Error("motorista_id é obrigatório");
      }

      // DEV MODE - Retorna mock data com delay
      if (__DEV__) {
        Logger.debug("[ENTREGA_API] DEV_MODE: Usando mock data para sync-down");
        await delay(1000);

        const mockData = generateMockSyncDownPayload(motoristaId);
        Logger.debug(
          `[ENTREGA_API] Mock sync-down: rota=${mockData.rota.id}, clientes=${mockData.clientes.length}, volumes=${mockData.carga.volumes.length}`
        );

        return mockData;
      }

      // PRODUÇÃO - Chamada real à API
      const response = await post<SyncDownResponse>("/entrega/sync-down", {
        motorista_id: motoristaId,
      });

      if (!response.success || !response.data) {
        throw new Error("Resposta inválida do servidor (sync-down)");
      }

      Logger.debug(
        `[ENTREGA_API] Sync-down realizado: rota=${response.data.rota.id}, clientes=${response.data.clientes.length}`
      );

      return response.data;
    } catch (error) {
      Logger.error("[ENTREGA_API] Erro ao fazer sync-down", error);
      throw error;
    }
  }

  /**
   * SYNC UP - Envia resultados pro backend
   * POST /entrega/sync-up
   * Body: SyncUpPayload
   * Response: { success: boolean }
   */
  async syncUp(payload: SyncUpPayload): Promise<boolean> {
    try {
      Logger.api("POST", "/entrega/sync-up", {
        rota_id: payload.rota_id,
        motorista_id: payload.motorista_id,
      });

      if (!payload.rota_id || !payload.motorista_id) {
        throw new Error("rota_id e motorista_id são obrigatórios");
      }

      // DEV MODE - Simula resposta com delay
      if (__DEV__) {
        Logger.debug("[ENTREGA_API] DEV_MODE: Simulando sync-up bem-sucedido");
        await delay(1000);

        Logger.debug(
          `[ENTREGA_API] Mock sync-up: rota=${payload.rota_id}, clientes=${payload.clientes.length}`
        );

        return true;
      }

      // PRODUÇÃO - Chamada real à API
      const response = await post<SyncUpResponse>("/entrega/sync-up", payload);

      if (!response.success) {
        throw new Error("Sync-up falhou no servidor");
      }

      Logger.debug(`[ENTREGA_API] Sync-up realizado com sucesso: rota=${payload.rota_id}`);

      return true;
    } catch (error) {
      Logger.error("[ENTREGA_API] Erro ao fazer sync-up", error);
      throw error;
    }
  }

  /**
   * Testar conectividade com endpoint de entrega
   * GET /entrega/health
   */
  async testarConectividade(): Promise<{ online: boolean; latencia?: number }> {
    try {
      Logger.debug("[ENTREGA_API] Testando conectividade...");

      const startTime = Date.now();

      // DEV MODE - Retorna sempre online com latência simulada
      if (__DEV__) {
        await delay(200);
        const latencia = Date.now() - startTime;
        Logger.debug(`[ENTREGA_API] DEV_MODE: Online simulado, latência=${latencia}ms`);
        return { online: true, latencia };
      }

      // PRODUÇÃO
      await get<HealthCheckResponse>("/entrega/health");

      const latencia = Date.now() - startTime;
      Logger.debug(`[ENTREGA_API] API online, latência=${latencia}ms`);

      return { online: true, latencia };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.warn(`[ENTREGA_API] Conectividade falhou: ${errorMessage}`);

      return {
        online: false,
      };
    }
  }

  /**
   * Verificar se há rota disponível para o motorista
   * GET /entrega/rota-disponivel?motorista_id=xxx
   * Response: { disponivel: boolean, rota_id?: string }
   */
  async verificarRotaDisponivel(
    motoristaId: string
  ): Promise<{ disponivel: boolean; rotaId?: string }> {
    try {
      Logger.api(
        "GET",
        `/entrega/rota-disponivel?motorista_id=${motoristaId}`,
        undefined
      );

      if (!motoristaId) {
        throw new Error("motorista_id é obrigatório");
      }

      // DEV MODE - Retorna sempre true com rota mock
      if (__DEV__) {
        Logger.debug("[ENTREGA_API] DEV_MODE: Simulando rota disponível");
        await delay(300);

        return {
          disponivel: true,
          rotaId: "rota_dev_001",
        };
      }

      // PRODUÇÃO
      const response = await get<RotaDisponibilidadeResponse>(
        `/entrega/rota-disponivel?motorista_id=${motoristaId}`
      );

      Logger.debug(
        `[ENTREGA_API] Verificação rota: disponível=${response.disponivel}, rota_id=${response.rota_id || "N/A"}`
      );

      return {
        disponivel: response.disponivel,
        rotaId: response.rota_id,
      };
    } catch (error) {
      Logger.error("[ENTREGA_API] Erro ao verificar disponibilidade de rota", error);
      throw error;
    }
  }
}

export default new EntregaApiService();
export const entregaApiService = new EntregaApiService();
