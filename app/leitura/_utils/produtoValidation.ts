/**
 * Validações de Produto - Leitura
 * Funções puras para validação de produtos
 */

import { Produto } from '@/types/siac';
import { ProdutoProblemas } from '../types';

/**
 * Verifica se um produto tem problemas que impedem ou dificultam a leitura
 */
export const temProblemas = (produto: Produto): ProdutoProblemas => {
  const enderecoProblematico = produto.endereco === '22222' || produto.endereco === '11111';
  
  // Converter ID para string antes de verificar (pode vir como número da API)
  const idStr = produto.id != null ? String(produto.id).trim() : '';
  const semId = idStr === '';
  
  // Verificar se tem pelo menos um código de barras válido
  const codigosBarras = Array.isArray(produto.codigoBarras) 
    ? produto.codigoBarras 
    : produto.codigoBarras 
      ? [produto.codigoBarras] 
      : [];
  const semCodigoBarras = codigosBarras.length === 0 || codigosBarras.every(cb => !cb || String(cb).trim() === '');
  
  return {
    enderecoProblematico,
    semId,
    semCodigoBarras,
    temAlgumProblema: enderecoProblematico || semId || semCodigoBarras,
    bloqueado: semCodigoBarras // Bloqueia apenas se não tem código de barras
  };
};

/**
 * Calcula o progresso da leitura de uma guarda
 */
export const calcularProgresso = (produtos: Produto[]): number => {
  if (produtos.length === 0) return 0;
  const produtosConcluidos = produtos.filter(p => p.concluido).length;
  return (produtosConcluidos / produtos.length) * 100;
};

