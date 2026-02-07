/**
 * HttpClient - Cliente HTTP genérico usando Axios
 * Centraliza todas as chamadas de API com:
 * - Token JWT automático no header Authorization
 * - Timeout configurável
 * - Interceptors para logging e tratamento de erros
 * - Retry automático em caso de falha
 */

import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { config as envConfig } from "@/constants/Environment";
import { Logger } from "@/utils/logger";
import AuthService from "./AuthService";

// Tipos para configuração do cliente
export interface HttpClientConfig {
  baseURL: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

// Tipo para resposta de erro padronizada
export interface HttpError {
  message: string;
  status?: number;
  code?: string;
  data?: any;
}

/**
 * Cria uma instância do cliente HTTP com configurações padrão
 */
function createHttpClient(clientConfig?: Partial<HttpClientConfig>): AxiosInstance {
  const baseURL = clientConfig?.baseURL || envConfig.api.baseUrl;
  const timeout = clientConfig?.timeout || envConfig.api.timeout;

  const instance = axios.create({
    baseURL,
    timeout,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "ZeDaEntrega-Mobile/1.0",
    },
  });

  // Interceptor de REQUEST - Adiciona token automaticamente
  instance.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      // Obter token de autenticação
      const token = await AuthService.obterToken();

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Log da requisição
      Logger.api(
        config.method?.toUpperCase() || "GET",
        `${config.baseURL}${config.url}`,
        config.data
      );

      return config;
    },
    (error: AxiosError) => {
      Logger.error("[HTTP_CLIENT] Erro na configuração da requisição:", error);
      return Promise.reject(error);
    }
  );

  // Interceptor de RESPONSE - Trata erros e loga respostas
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      Logger.debug(
        `[HTTP_CLIENT] Response ${response.status}: ${response.config.url}`
      );
      return response;
    },
    (error: AxiosError) => {
      const httpError = formatHttpError(error);
      Logger.error(
        `[HTTP_CLIENT] Erro ${httpError.status}: ${httpError.message}`,
        { url: error.config?.url }
      );
      return Promise.reject(httpError);
    }
  );

  return instance;
}

/**
 * Formata erro do Axios para formato padronizado
 */
function formatHttpError(error: AxiosError): HttpError {
  if (error.response) {
    // Erro de resposta do servidor (4xx, 5xx)
    const data = error.response.data as any;
    return {
      message: data?.message || data?.error || error.message,
      status: error.response.status,
      code: error.code,
      data: data,
    };
  } else if (error.request) {
    // Requisição foi feita mas não houve resposta (timeout, rede)
    if (error.code === "ECONNABORTED") {
      return {
        message: "Timeout: servidor não respondeu a tempo",
        code: "TIMEOUT",
      };
    }
    return {
      message: "Erro de conexão: servidor não acessível",
      code: "NETWORK_ERROR",
    };
  } else {
    // Erro na configuração da requisição
    return {
      message: error.message || "Erro desconhecido",
      code: "REQUEST_ERROR",
    };
  }
}

// ============================================================
// INSTÂNCIAS PRÉ-CONFIGURADAS
// ============================================================

/**
 * Cliente HTTP para API principal (ze-sandbox)
 * Usado para: guardas, produtos, bipagem
 */
export const httpClient = createHttpClient({
  baseURL: envConfig.api.baseUrl,
});

/**
 * Cliente HTTP para API de autenticação (ze-backend)
 * Usado para: roles, permissões, módulos de administração
 */
export const authHttpClient = createHttpClient({
  baseURL: envConfig.api.authUrl,
});

// ============================================================
// FUNÇÕES UTILITÁRIAS PARA CHAMADAS DE API
// ============================================================

/**
 * GET request genérico
 */
export async function get<T>(
  url: string,
  config?: AxiosRequestConfig,
  useAuthClient = false
): Promise<T> {
  const client = useAuthClient ? authHttpClient : httpClient;
  const response = await client.get<T>(url, config);
  return response.data;
}

/**
 * POST request genérico
 */
export async function post<T>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig,
  useAuthClient = false
): Promise<T> {
  const client = useAuthClient ? authHttpClient : httpClient;
  const response = await client.post<T>(url, data, config);
  return response.data;
}

/**
 * PUT request genérico
 */
export async function put<T>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig,
  useAuthClient = false
): Promise<T> {
  const client = useAuthClient ? authHttpClient : httpClient;
  const response = await client.put<T>(url, data, config);
  return response.data;
}

/**
 * DELETE request genérico
 */
export async function del<T>(
  url: string,
  config?: AxiosRequestConfig,
  useAuthClient = false
): Promise<T> {
  const client = useAuthClient ? authHttpClient : httpClient;
  const response = await client.delete<T>(url, config);
  return response.data;
}

/**
 * PATCH request genérico
 */
export async function patch<T>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig,
  useAuthClient = false
): Promise<T> {
  const client = useAuthClient ? authHttpClient : httpClient;
  const response = await client.patch<T>(url, data, config);
  return response.data;
}

// Export default com todas as funções
export default {
  httpClient,
  authHttpClient,
  get,
  post,
  put,
  del,
  patch,
  createHttpClient,
};
