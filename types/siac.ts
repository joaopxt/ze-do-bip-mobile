/**
 * Types para integração com API SIAC
 * Baseado na documentação dos endpoints fornecidos
 */

// Response do endpoint GUARDA_LISTA (API v2.0)
export interface GuardaAPI {
  sq_guarda: string; // Sequencial da guarda (ID único)
  nu_nota: string; // Número da nota
  sg_serie: string; // Série
  cd_fornece: string; // Código do fornecedor
  fornecedor: string; // Nome do fornecedor (novo nome)
  dt_entrada: string; // Data de entrada (novo)
  hr_entrada: string; // Hora de entrada (novo)
  dt_iniguar: string | null; // Data início da guarda (pode ser null)
  hr_iniguar: string | null; // Hora início da guarda (pode ser null)
  dt_fimguar: string | null; // Data fim da guarda (pode ser null)
  hr_fimguar: string | null; // Hora fim da guarda (pode ser null)
  SKUs: number; // Quantidade de SKUs (substituiu qtd_itens)
  status: "Pendente" | "Iniciado" | "Finalizado"; // Status específicos v2.0
}

// Response do endpoint GUARDA_DETALHES
export interface ProdutoAPI {
  cd_fabrica: string; // Código de fábrica
  cd_produto: string; // Código do produto
  cod_barras: string[]; // Array de códigos de barras (múltiplos códigos por SKU)
  endereco: string; // Endereço de armazenagem
  no_produto: string; // Nome/descrição do produto
  quantidade: number; // Quantidade do produto
  id_endereco: string; // ID do endereço
  id: string; // ID único do produto na nota
  item: string; // Número do item na nota
}

export interface EstoquistaAPI {
  cd_estoquista: string; // Código do estoquista
  estoquista: string; // Nome do estoquista
  qt_itens: number; // Quantidade de itens para este estoquista
}

export interface GuardaDetalhesAPI {
  cd_fornece: string;
  cd_loja: string;
  dt_emissao: string;
  dt_fimguar: string;
  dt_iniguar: string;
  estoquistas: EstoquistaAPI[];
  hr_emissao: string;
  hr_fimguar: string;
  hr_iniguar: string;
  fornecedor: string;
  nu_nota: string;
  produtos: ProdutoAPI[];
  sg_serie: string;
  sq_guarda: string;
}

// Response genérico da API SIAC
export interface SiacApiResponse<T> {
  data: T;
  success?: boolean;
  total?: number;
  message?: string;
}

// Request bodies
export interface GuardaListaRequest {
  // Body vazio para listar guardas
}

export interface GuardaDetalhesRequest {
  sq_guarda: string;
}

export interface GuardaFinalizarRequest {
  sq_guarda: string;
}

// Response específicos
export type GuardaListaResponse = SiacApiResponse<GuardaAPI[]>[];
export type GuardaDetalhesResponse = SiacApiResponse<GuardaDetalhesAPI>[];
export type GuardaFinalizarResponse = SiacApiResponse<{
  message: string;
  sq_guarda: string;
}>[];

// Types internos do app (conversão da API v2.0)
export interface Guarda {
  id: string; // sq_guarda
  numero: string; // nu_nota
  fornecedor: string; // no_fornece
  codigoFornecedor: string; // cd_fornece
  serie: string; // sg_serie
  dataEntrada: string; // dt_entrada
  horaEntrada: string; // hr_entrada
  dataInicio?: string; // dt_iniguar
  horaInicio?: string; // hr_iniguar
  dataFim?: string; // dt_fimguar
  horaFim?: string; // hr_fimguar
  quantidadeItens: number; // SKUs (novo nome)
  status: "DISPONIVEL" | "EM_ANDAMENTO" | "FINALIZADA"; // Mapeado de API v2.0
  produtos: Produto[];
  estoquistas?: Estoquista[];
  criadaEm: string;
  iniciadaEm?: string;
  concluidaEm?: string;
  operadorId?: string;
  // Novos campos v2.0
  podeIniciar: boolean; // Se pode ser iniciada
  podeTrabalhar: boolean; // Se pode trabalhar com produtos
  podeFinalizar: boolean; // Se pode ser finalizada

  // Controle local para sincronização de início
  iniciadaLocalmente?: boolean; // Marcador se foi iniciada localmente (antes da API confirmar)
  timestampInicioLocal?: string; // Timestamp do início local para timeout

  // Controle local para sincronização de finalização
  finalizadaLocalmente?: boolean; // Marcador se foi finalizada localmente (antes da API confirmar)
  timestampFinalizacaoLocal?: string; // Timestamp da finalização local para timeout
}

export interface Produto {
  id: string; // ID único da API (produto.id)
  cdProduto: string; // cd_produto (pode duplicar)
  idEndereco: string; // id_endereco da API
  codigoFabrica: string; // cd_fabrica
  codigoBarras: string[]; // Array de códigos de barras (múltiplos códigos por SKU)
  descricao: string; // no_produto
  endereco: string; // endereco
  quantidade: number; // quantidade
  quantidadeLida: number; // controle interno
  concluido: boolean; // controle interno
  bipado: boolean; // status do backend (se foi bipado)
  dataLeitura?: string; // timestamp da leitura
  item: string; // item
}

export interface Estoquista {
  codigo: string; // cd_estoquista
  nome: string; // estoquista
  quantidadeItens: number; // qt_itens
}

// Enum para status de conexão
export enum StatusConexao {
  ONLINE = "ONLINE",
  OFFLINE = "OFFLINE",
  ERRO = "ERRO",
}

// Type para controle de estado da API
export interface EstadoApi {
  status: StatusConexao;
  ultimaTentativa?: Date;
  tentativasErro: number;
  mensagemErro?: string;
  usandoFallback: boolean;
}
