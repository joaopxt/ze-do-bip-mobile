/**
 * Hook customizado para gerenciar entrada de dados do scanner USB
 */

import { Logger } from '@/utils/logger';
import { useCallback, useRef, useState } from 'react';

interface UseScannerInputOptions {
  onCodigoCompleto: (codigo: string) => void;
  tamanhoMinimo?: number;
  timeoutMs?: number;
}

export const useScannerInput = ({ 
  onCodigoCompleto, 
  tamanhoMinimo = 8,
  timeoutMs = 500 
}: UseScannerInputOptions) => {
  const [valorAtual, setValorAtual] = useState('');
  const [ultimoProcessado, setUltimoProcessado] = useState('');
  
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const limparTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const processarCodigo = useCallback((codigo: string) => {
    const codigoLimpo = codigo.trim();
    
    Logger.debug('[SCANNER_HOOK] Processando código:', codigoLimpo, 'Tamanho:', codigoLimpo.length);
    
    // Evitar reprocessamento
    if (codigoLimpo === ultimoProcessado) {
      Logger.debug('[SCANNER_HOOK] Código já processado - ignorando');
      return;
    }
    
    // Verificar tamanho mínimo básico (sem limitações específicas)
    if (codigoLimpo.length < tamanhoMinimo) {
      Logger.debug('[SCANNER_HOOK] Código muito curto - aguardando mais caracteres');
      return;
    }
    
    // Remover limitação EAN-13 - aceitar qualquer padrão válido
    Logger.debug('[SCANNER_HOOK] Código aceito - processando:', codigoLimpo);
    
    setUltimoProcessado(codigoLimpo);
    onCodigoCompleto(codigoLimpo);
    
    // Limpar input IMEDIATAMENTE após processamento
    setValorAtual('');
    // Reset da proteção após um breve momento para evitar reprocessamento duplo
    setTimeout(() => {
      setUltimoProcessado('');
    }, 50);
  }, [onCodigoCompleto, tamanhoMinimo, ultimoProcessado]);

  const handleInputChange = useCallback((novoTexto: string) => {
    Logger.debug('[SCANNER_HOOK] Texto recebido:', novoTexto, 'Tamanho:', novoTexto.length);
    
    setValorAtual(novoTexto);
    
    // NÃO usar timeout automático - confiar apenas no Enter nativo
    // O scanner USB envia Enter quando termina, igual ao navegador
  }, []);

  const handleSubmitManual = useCallback((event?: any) => {
    // SOLUÇÃO: Capturar valor diretamente do evento, não do estado
    const codigoDoEvento = event?.nativeEvent?.text || valorAtual;
    const codigoAtual = codigoDoEvento.trim();
    
    Logger.debug('[SCANNER_HOOK]  Enter pressionado');
    Logger.debug('[SCANNER_HOOK] - Valor do evento:', event?.nativeEvent?.text);
    Logger.debug('[SCANNER_HOOK] - Valor do estado:', valorAtual);
    Logger.debug('[SCANNER_HOOK] - Valor escolhido:', codigoAtual, 'Tamanho:', codigoAtual.length);
    
    // Limpar qualquer timeout pendente
    limparTimeout();
    
    if (codigoAtual) {
      // Reset para permitir reprocessamento
      setUltimoProcessado('');
      
      // Processar IMEDIATAMENTE - sem delays
      Logger.debug('[SCANNER_HOOK] Processamento instantâneo iniciado');
      processarCodigo(codigoAtual);
    } else {
      Logger.debug('[SCANNER_HOOK] Código vazio - ignorando Enter');
    }
  }, [valorAtual, limparTimeout, processarCodigo]);

  const resetar = useCallback(() => {
    Logger.debug('[SCANNER_HOOK] Resetando scanner input');
    limparTimeout();
    setValorAtual('');
    setUltimoProcessado('');
  }, [limparTimeout]);

  // Cleanup quando hook for desmontado
  const cleanup = useCallback(() => {
    limparTimeout();
  }, [limparTimeout]);

  return {
    valorAtual,
    handleInputChange,
    handleSubmitManual,
    resetar,
    cleanup
  };
};