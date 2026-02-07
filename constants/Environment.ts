/**
 * Configuração de Ambientes - Zé da Entrega
 * Sistema escalável para gerenciar múltiplos ambientes (teste, produção, desenvolvimento)
 *
 * IMPORTANTE: O sistema usa duas APIs diferentes:
 * - authUrl: ze-backend (autenticação JWT com sessões) - porta 3000
 * - baseUrl: ze-sandbox (guardas, produtos) - porta 3001
 */

import Constants from "expo-constants";
import { Logger } from "../utils/logger";

// Tipos para configuração de ambiente
export interface ApiConfig {
  // URL da API principal (guardas, produtos - API SIAC antiga)
  baseUrl: string;
  // URL do ze-backend (autenticação)
  authUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  name: string;
  description: string;
}

export interface EnvironmentConfig {
  api: ApiConfig;
  debug: boolean;
  logLevel: "none" | "error" | "warn" | "info" | "debug";
  features: {
    offlineMode: boolean;
    crashReporting: boolean;
    analytics: boolean;
  };
}

// Configurações por ambiente
const ENVIRONMENTS: Record<string, EnvironmentConfig> = {
  development: {
    api: {
      // ze-sandbox local para guardas (porta 3001)
      baseUrl: "http://localhost:3000",
      // ze-backend local para autenticação (porta 3000)
      authUrl: "http://localhost:3000",
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 30000,
      name: "API Desenvolvimento (ze-sandbox)",
      description:
        "Ambiente de desenvolvimento com ze-sandbox e ze-backend locais",
    },
    debug: true,
    logLevel: "debug",
    features: {
      offlineMode: true,
      crashReporting: false,
      analytics: false,
    },
  },

  test: {
    api: {
      // API de guardas (SIAC antiga)
      baseUrl: "https://api-stage-ze-do-bip.pecista.com.br",
      // ze-backend hospedado (quando disponível, usar a mesma URL por enquanto)
      authUrl: "https://api-stage-ze-do-bip.pecista.com.br",
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 30000,
      name: "API de Teste",
      description: "API de teste hospedada na AWS para validação",
    },
    debug: true,
    logLevel: "info",
    features: {
      offlineMode: true,
      crashReporting: false,
      analytics: false,
    },
  },

  staging: {
    api: {
      // API de guardas (SIAC antiga)
      baseUrl: "https://api-stage-ze-do-bip.pecista.com.br",
      // ze-backend hospedado
      authUrl: "https://api-stage-ze-do-bip.pecista.com.br",
      timeout: 25000,
      retryAttempts: 3,
      retryDelay: 20000,
      name: "API de Homologação",
      description: "API de homologação para testes finais",
    },
    debug: false,
    logLevel: "warn",
    features: {
      offlineMode: true,
      crashReporting: true,
      analytics: true,
    },
  },

  production: {
    api: {
      // API de guardas (SIAC antiga)
      baseUrl: "https://ze-do-bip.pecista.com.br",
      // ze-backend hospedado
      authUrl: "https://ze-do-bip.pecista.com.br",
      timeout: 20000,
      retryAttempts: 5,
      retryDelay: 15000,
      name: "API de Produção",
      description: "API de produção do SIAC",
    },
    debug: false,
    logLevel: "error",
    features: {
      offlineMode: false,
      crashReporting: true,
      analytics: true,
    },
  },
};

/**
 * Obter o ambiente atual
 * Prioridade: expo-constants > __DEV__ > fallback para 'test'
 */
function getCurrentEnvironment(): string {
  // 1. Verificar se foi definido via expo-constants (app.json)
  const envFromConfig = Constants.expoConfig?.extra?.environment;
  if (envFromConfig && ENVIRONMENTS[envFromConfig]) {
    return envFromConfig;
  }

  // 2. Verificar se foi definido via variável de ambiente do build
  const envFromBuild = Constants.expoConfig?.extra?.buildEnvironment;
  if (envFromBuild && ENVIRONMENTS[envFromBuild]) {
    return envFromBuild;
  }

  // 3. Fallback baseado em __DEV__
  if (__DEV__) {
    return "development";
  }

  // 4. Fallback final para teste
  return "test";
}

/**
 * Configuração atual do ambiente
 */
export const currentEnvironment = getCurrentEnvironment();
export const config: EnvironmentConfig = ENVIRONMENTS[currentEnvironment];

/**
 * Informações sobre o ambiente atual
 */
export const environmentInfo = {
  name: currentEnvironment,
  apiName: config.api.name,
  apiUrl: config.api.baseUrl,
  authUrl: config.api.authUrl,
  isProduction: currentEnvironment === "production",
  isDevelopment: currentEnvironment === "development",
  isTest: currentEnvironment === "test",
  isStaging: currentEnvironment === "staging",
  debugEnabled: config.debug,
  logLevel: config.logLevel,
};

/**
 * Validar se a configuração do ambiente está correta
 */
export function validateEnvironment(): boolean {
  try {
    if (!config) {
      Logger.error("ENV", "Configuração do ambiente não encontrada");
      return false;
    }

    if (!config.api.baseUrl) {
      Logger.error("ENV", "URL da API não configurada");
      return false;
    }

    if (!config.api.authUrl) {
      Logger.error("ENV", "URL de autenticação não configurada");
      return false;
    }

    // Em desenvolvimento, aceitar HTTP para IPs locais
    const isLocalDev =
      config.api.baseUrl.startsWith("http://localhost") ||
      config.api.baseUrl.startsWith("http://10.") ||
      config.api.baseUrl.startsWith("http://192.168.");

    if (!config.api.baseUrl.startsWith("https://") && !isLocalDev) {
      Logger.warn("ENV", "API não está usando HTTPS");
    }

    Logger.debug("ENV Configuração do ambiente validada:", {
      environment: currentEnvironment,
      api: config.api.name,
      apiUrl: config.api.baseUrl,
      authUrl: config.api.authUrl,
      debug: config.debug,
    });

    return true;
  } catch (error) {
    Logger.error("ENV", "Erro na validação do ambiente:", error);
    return false;
  }
}

/**
 * Obter configuração específica para desenvolvimento/debug
 */
export function getDebugInfo() {
  return {
    currentEnvironment,
    config,
    constants: {
      expoConfig: Constants.expoConfig?.extra,
      manifest: Constants.manifest2,
      deviceInfo: {
        platform: Constants.platform,
        deviceName: Constants.deviceName,
      },
    },
    availableEnvironments: Object.keys(ENVIRONMENTS),
  };
}

// Executar validação na inicialização
validateEnvironment();
