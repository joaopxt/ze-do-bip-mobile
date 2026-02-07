/**
 * Types e Interfaces - Leitura de Produtos
 */

import { Produto } from '@/types/siac';

export type EstadoLeitura = 'aguardando_codigo' | 'contando_produto' | 'aguardando_endereco';
export type TipoInicial = 'produto' | 'endereco';

export interface ProdutoProblemas {
  enderecoProblematico: boolean;
  semId: boolean;
  semCodigoBarras: boolean;
  temAlgumProblema: boolean;
  bloqueado: boolean;
}

export interface LeituraState {
  estadoLeitura: EstadoLeitura;
  produtoAtual: Produto | null;
  enderecoFiltro: string | null;
  tipoInicial: TipoInicial | null;
  contadorModal: boolean;
  enderecoModal: boolean;
  quantidadeContada: number;
  quantidadeManual: string;
  valorModalInput: string;
  valorEnderecoInput: string;
  erro: string;
  finalizandoGuarda: boolean;
}

