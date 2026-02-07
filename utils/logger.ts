/**
 * Sistema de Logging Centralizado - Zé do Bip
 * 
 * Logs são exibidos APENAS em desenvolvimento (__DEV__)
 * Em produção, apenas erros críticos são logados
 */

const isDevelopment = __DEV__;

export const Logger = {
  /**
   * Log genérico (desenvolvimento apenas)
   */
  log: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.log(`[${new Date().toISOString()}] ${message}`, ...args);
    }
  },

  /**
   * Log de debug detalhado (desenvolvimento apenas)
   */
  debug: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.debug(`[${new Date().toISOString()}] 🔍 ${message}`, ...args);
    }
  },

  /**
   * Log de warning (desenvolvimento apenas)
   */
  warn: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.warn(`[${new Date().toISOString()}] ⚠️ ${message}`, ...args);
    }
  },

  /**
   * Log de erro (SEMPRE logado, mesmo em produção)
   * Pode ser integrado com Sentry/Firebase no futuro
   */
  error: (message: string, ...args: any[]) => {
    console.error(`[${new Date().toISOString()}] ❌ ${message}`, ...args);
    // TODO: Integrar com crash reporting (Sentry)
  },

  /**
   * Log de chamadas de API (desenvolvimento apenas)
   */
  api: (method: string, endpoint: string, ...args: any[]) => {
    if (isDevelopment) {
      console.log(`[${new Date().toISOString()}] 🌐 ${method} ${endpoint}`, ...args);
    }
  },

  /**
   * Log de ações do Store (desenvolvimento apenas)
   */
  store: (action: string, ...args: any[]) => {
    if (isDevelopment) {
      console.log(`[${new Date().toISOString()}] 🏪 ${action}`, ...args);
    }
  },

  /**
   * Log de autenticação (desenvolvimento apenas)
   */
  auth: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.log(`[${new Date().toISOString()}] 🔐 ${message}`, ...args);
    }
  },

  /**
   * Log de navegação (desenvolvimento apenas)
   */
  navigation: (screen: string, ...args: any[]) => {
    if (isDevelopment) {
      console.log(`[${new Date().toISOString()}] 🧭 Navegando para: ${screen}`, ...args);
    }
  }
};

/**
 * Helper para medir performance de operações
 */
export const Performance = {
  /**
   * Mede o tempo de execução de uma operação
   * 
   * @example
   * const endMeasure = Performance.measure('Carregar guardas');
   * await carregarGuardas();
   * endMeasure(); // Loga: "⏱️ Carregar guardas: 245.32ms"
   */
  measure: (label: string): (() => void) => {
    if (!isDevelopment) {
      return () => {}; // No-op em produção
    }
    
    const startTime = performance.now();
    return () => {
      const duration = performance.now() - startTime;
      Logger.debug(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
    };
  }
};

/**
 * Informações do ambiente de logging
 */
export const LoggerInfo = {
  isEnabled: isDevelopment,
  environment: isDevelopment ? 'development' : 'production',
  
  getConfig: () => ({
    isDevelopment,
    logsEnabled: isDevelopment,
    errorsAlwaysLogged: true,
    timestamp: true
  })
};

