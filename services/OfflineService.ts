/**
 * Offline Service - Zé do Bip
 * Fallback mínimo quando a API de teste não estiver disponível
 */

import { Logger } from '../utils/logger';

class OfflineService {
  private isOfflineMode = false;

  constructor() {
    Logger.warn('OfflineService inicializado como fallback');
  }

  /**
   * Ativar modo offline
   */
  enableOfflineMode() {
    this.isOfflineMode = true;
    Logger.warn('Modo offline ativado - usando fallback local');
  }

  /**
   * Desativar modo offline
   */
  disableOfflineMode() {
    this.isOfflineMode = false;
    Logger.warn('Modo offline desativado - voltando para API');
  }

  /**
   * Verificar se está em modo offline
   */
  isOffline(): boolean {
    return this.isOfflineMode;
  }

  /**
   * Listar guardas (fallback mínimo)
   */
  async listarGuardas(): Promise<any> {
    Logger.warn('[OFFLINE] Retornando dados de fallback para guardas...');
    
    // Simular delay da rede
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      success: true,
      data: {
        data: [],
        success: true,
        total: 0
      },
      metadata: {
        cd_loja: "01",
        regiao: "DF", 
        loja: "PECISTA",
        total: 0,
        timestamp: new Date().toISOString(),
        mode: "OFFLINE_FALLBACK"
      }
    };
  }

  /**
   * Obter detalhes de guarda (fallback)
   */
  async obterDetalhesGuarda(sq_guarda: string): Promise<any> {
    Logger.warn(`[OFFLINE] Fallback para detalhes da guarda ${sq_guarda}...`);
    
    // Simular delay da rede
    await new Promise(resolve => setTimeout(resolve, 500));

    throw new Error('Guarda não encontrada no modo offline. Conecte-se à internet para acessar dados reais.');
  }

  /**
   * Finalizar guarda (não disponível offline)
   */
  async finalizarGuarda(sq_guarda: string): Promise<any> {
    Logger.warn(`[OFFLINE] Tentativa de finalizar guarda ${sq_guarda} offline...`);
    
    throw new Error('Não é possível finalizar guardas no modo offline. Conecte-se à internet.');
  }

  /**
   * Verificar status de conectividade (sempre offline quando ativo)
   */
  async verificarConectividade(): Promise<{
    online: boolean;
    modo: string;
    observacao: string;
  }> {
    return {
      online: false,
      modo: 'OFFLINE_FALLBACK',
      observacao: 'Serviço de fallback ativo. API principal indisponível.'
    };
  }

  /**
   * Obter informações do modo offline
   */
  getInfo() {
    return {
      mode: 'OFFLINE_FALLBACK',
      description: 'Serviço de fallback para quando a API de teste não estiver disponível',
      limitations: [
        'Lista de guardas vazia',
        'Detalhes de guarda não disponíveis',
        'Finalização de guardas bloqueada',
        'Dados limitados para desenvolvimento'
      ],
      status: this.isOfflineMode ? 'ATIVO' : 'INATIVO'
    };
  }
}

export default new OfflineService(); 