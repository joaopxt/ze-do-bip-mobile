/**
 * API Service - Zé do Bip
 * Gateway principal para comunicação com APIs (teste/produção)
 * Refatorado para usar HttpClient com Axios
 */

import { config, environmentInfo } from "../constants/Environment";
import { StatusConexao } from "../types/siac";
import { Logger } from "../utils/logger";
import { get, post, httpClient } from "./HttpClient";

// Interfaces para as respostas da API de teste
interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  metadata: {
    timestamp: string;
    loja: string;
    regiao: string;
    [key: string]: any;
  };
}

interface GuardaData {
  sq_guarda: string;
  nu_nota: string;
  sg_serie: string;
  cd_fornece: string;
  fornecedor: string;
  dt_entrada: string;
  hr_entrada: string;
  dt_iniguar: string | null;
  hr_iniguar: string | null;
  dt_fimguar: string | null;
  hr_fimguar: string | null;
  SKUs: number;
  status: "Pendente" | "Iniciado" | "Finalizado";
}

interface GuardaDetalhesData {
  cd_fornece: string;
  cd_loja: string;
  dt_emissao: string;
  dt_fimguar: string;
  dt_iniguar: string;
  estoquistas: Array<{
    cd_estoquista: string;
    estoquista: string;
    qt_itens: number;
  }>;
  hr_emissao: string;
  hr_fimguar: string;
  hr_iniguar: string;
  fornecedor: string;
  nu_nota: string;
  produtos: Array<{
    cd_fabrica: string;
    cd_produto: string;
    cod_barras: string;
    endereco: string;
    no_produto: string;
    quantidade: number;
    id: string;
  }>;
  sg_serie: string;
  sq_guarda: string;
}

interface ListaGuardasResponse {
  data: GuardaData[];
  success: boolean;
  total: number;
}

class ApiService {
  private baseUrl: string;
  private timeout: number;
  private maxRetries: number;
  private retryDelay: number;
  private ambiente: string;

  constructor() {
    // Configurações dinâmicas baseadas no ambiente
    this.baseUrl = config.api.baseUrl;
    this.timeout = config.api.timeout;
    this.maxRetries = config.api.retryAttempts;
    this.retryDelay = config.api.retryDelay;
    this.ambiente = environmentInfo.name;

    Logger.api("CONFIG", "Inicialização com HttpClient", {
      ambiente: environmentInfo.name,
      apiName: config.api.name,
      baseUrl: this.baseUrl,
      timeout: `${this.timeout}ms`,
      retries: this.maxRetries,
      retryDelay: `${this.retryDelay}ms`,
    });
  }

  /**
   * Listar guardas por usuário (API v2.0)
   */
  async listarGuardas(
    cd_usuario: string
  ): Promise<ApiResponse<ListaGuardasResponse>> {
    try {
      Logger.api("GET", `/guardas?cd_usuario=${cd_usuario}`, { cd_usuario });

      if (!cd_usuario) {
        throw new Error("Código do usuário é obrigatório");
      }

      const response = await get<ApiResponse<ListaGuardasResponse>>(
        `/guardas?cd_usuario=${cd_usuario}`
      );

      // Verificar estrutura da resposta conforme documentação
      if (!response.success || !response.data) {
        throw new Error("Resposta da API inválida");
      }

      Logger.debug(
        `${response.data?.data.length} guarda(s) encontrada(s) para usuário ${cd_usuario}`
      );

      if (response.data?.data.length > 0) {
        Logger.debug(`Fornecedor primeira guarda: ${response.data.data[0].fornecedor}`);
      }

      return response;
    } catch (error) {
      Logger.error("Erro ao listar guardas", error);
      throw error;
    }
  }

  /**
   * Obter detalhes de uma guarda específica
   */
  async obterDetalhesGuarda(
    sq_guarda: string
  ): Promise<ApiResponse<{ data: GuardaDetalhesData }>> {
    try {
      Logger.api("GET", `/guardas/${sq_guarda}`);

      const response = await get<ApiResponse<{ data: GuardaDetalhesData }>>(
        `/guardas/${sq_guarda}`
      );

      // Verificar estrutura da resposta
      if (!response.success || !response.data?.data) {
        throw new Error("Resposta da API inválida");
      }

      const produtos = response.data.data.produtos || [];
      Logger.debug(`Guarda ${sq_guarda}: ${produtos.length} produto(s)`);

      return response;
    } catch (error) {
      Logger.error(`Erro ao obter detalhes da guarda ${sq_guarda}`, error);
      throw error;
    }
  }

  /**
   * Finalizar uma guarda
   */
  async finalizarGuarda(sq_guarda: string): Promise<ApiResponse<any>> {
    try {
      Logger.api("POST", `/guardas/${parseInt(sq_guarda)}/finalizar`);

      const response = await post<ApiResponse<any>>(
        `/guardas/${parseInt(sq_guarda)}/finalizar`,
        { cd_loja: "01" }
      );

      Logger.debug(`Guarda ${sq_guarda} finalizada com sucesso`);

      return response;
    } catch (error) {
      Logger.error(`Erro ao finalizar guarda ${sq_guarda}`, error);

      // Tratar erros específicos da API v2.0
      if (error instanceof Error) {
        if (error.message.includes("ALREADY_FINISHED")) {
          throw new Error("Guarda já foi finalizada");
        }
      }

      throw error;
    }
  }

  /**
   * Testar conectividade com a API
   */
  async testarConectividade(): Promise<{
    online: boolean;
    latencia?: number;
    erro?: string;
  }> {
    try {
      Logger.debug("Testando conectividade com API...");

      const startTime = Date.now();

      await get("/health");

      const latencia = Date.now() - startTime;

      Logger.debug(`API online! Latência: ${latencia}ms`);

      return {
        online: true,
        latencia,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      Logger.warn("API offline", errorMessage);

      return {
        online: false,
        erro: errorMessage,
      };
    }
  }

  /**
   * Obter status da conexão atual
   */
  getStatusConexao(): StatusConexao {
    // Por enquanto sempre tentamos online primeiro
    // Fallback será implementado no GuardaService
    return StatusConexao.ONLINE;
  }

  /**
   * Iniciar guarda na API (v2.0)
   */
  async iniciarGuarda(sq_guarda: string): Promise<ApiResponse<any>> {
    try {
      const body = {
        cd_loja: "01", // Sempre loja 01 conforme especificação
      };

      Logger.api("POST", `/guardas/${sq_guarda}/iniciar`, body);

      const response = await post<any>(
        `/guardas/${parseInt(sq_guarda)}/iniciar`,
        body
      );

      Logger.debug(`Guarda ${sq_guarda} iniciada com sucesso na API`);

      return {
        success: true,
        data: response,
        metadata: {
          timestamp: new Date().toISOString(),
          loja: "01",
          regiao: "BR",
        },
      };
    } catch (error) {
      Logger.error("Erro ao iniciar guarda", error);
      return {
        success: false,
        data: {
          error: error instanceof Error ? error.message : "Erro desconhecido",
        },
        metadata: {
          timestamp: new Date().toISOString(),
          loja: "01",
          regiao: "BR",
        },
      };
    }
  }

  /**
   * Obter contagem de produtos bipados de uma guarda
   */
  async obterContagemBipados(sq_guarda: string): Promise<ApiResponse<{
    bipados: number;
    naoBipados: number;
    total: number;
    percentualBipado: number;
  }>> {
    try {
      Logger.api("GET", `/guardas/${sq_guarda}/contagem-bipados`);

      const response = await get<ApiResponse<{
        bipados: number;
        naoBipados: number;
        total: number;
        percentualBipado: number;
      }>>(`/guardas/${sq_guarda}/contagem-bipados`);

      if (!response.success) {
        throw new Error("Resposta da API inválida");
      }

      Logger.debug(`Contagem guarda ${sq_guarda}: ${response.data.bipados}/${response.data.total} (${response.data.percentualBipado}%)`);

      return response;
    } catch (error) {
      Logger.error(`Erro ao obter contagem de bipados da guarda ${sq_guarda}`, error);
      throw error;
    }
  }

  /**
   * Obter informações da API atual
   */
  getApiInfo() {
    return {
      ambiente: environmentInfo.name.toUpperCase(),
      baseUrl: this.baseUrl,
      apiName: config.api.name,
      descricao: config.api.description,
      isProduction: environmentInfo.isProduction,
      debugEnabled: environmentInfo.debugEnabled,
      timeout: `${this.timeout / 1000}s`,
      retries: this.maxRetries,
      retryDelay: `${this.retryDelay / 1000}s`,
      features: config.features,
      httpClient: "Axios",
    };
  }
}

export default new ApiService();
export const apiService = new ApiService();
