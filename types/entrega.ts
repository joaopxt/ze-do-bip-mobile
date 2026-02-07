/**
 * Types do módulo Entrega - Zé da Entrega
 * Modela rota, clientes, ordens e volumes para operação 100% offline
 */

// ============================================================
// STATUS ENUMS
// ============================================================

export type RotaStatus = 'pendente' | 'em_carga' | 'em_rota' | 'finalizada';
export type CargaStatus = 'aguardando' | 'em_andamento' | 'finalizada';
export type ClienteStatus = 'aguardando' | 'em_andamento' | 'finalizado' | 'bloqueado';
export type OrdemStatus = 'aguardando' | 'em_andamento' | 'finalizada';
export type OrdemTipo = 'DESCARGA' | 'COLETA';
export type VolumeStatus = 'pendente' | 'entregue' | 'extraviado';

// ============================================================
// MODELOS PRINCIPAIS (espelham SQLite)
// ============================================================

export interface Rota {
  id: string;
  motorista_id: string;
  motorista_nome: string;
  placa_veiculo: string;
  ordem_editavel: boolean;
  dt_sync_down: string | null;
  dt_sync_up: string | null;
  status: RotaStatus;
}

export interface Carga {
  id: string;
  rota_id: string;
  total_volumes: number;
  volumes_bipados: number;
  volumes_pendentes: number;
  status: CargaStatus;
  dt_inicio: string | null;
  dt_fim: string | null;
}

export interface Cliente {
  id: string;
  rota_id: string;
  nome_comercial: string;   // nome de fachada
  nome_formal: string;      // razão social
  endereco: string;
  cidade: string;
  ordem_na_rota: number;
  total_ordens: number;
  ordens_finalizadas: number;
  status: ClienteStatus;
  dt_inicio: string | null;
  dt_fim: string | null;
}

export interface Ordem {
  id: string;
  cliente_id: string;
  tipo: OrdemTipo;
  numero_nota: string;
  serie: string;
  total_volumes: number;
  volumes_resolvidos: number;  // entregue + extraviado
  status: OrdemStatus;
  dt_inicio: string | null;
  dt_fim: string | null;
}

export interface Volume {
  id: string;
  ordem_id: string;
  codigo_barras: string;
  descricao: string;
  quantidade: number;
  status: VolumeStatus;
  observacao: string | null;  // obrigatório se extraviado
  dt_bipagem: string | null;
}

export interface CargaVolume {
  id: string;
  carga_id: string;
  volume_id: string;
  codigo_barras: string;
  descricao: string;
  status: 'pendente' | 'bipado';
  dt_bipagem: string | null;
}

// ============================================================
// CONTAGEM / RESUMO
// ============================================================

export interface ContagemCarga {
  total: number;
  bipados: number;
  pendentes: number;
  percentual: number;
}

export interface ContagemCliente {
  totalOrdens: number;
  ordensFinalizadas: number;
  totalVolumes: number;
  volumesEntregues: number;
  volumesExtraviados: number;
  volumesPendentes: number;
}

export interface ContagemOrdem {
  total: number;
  entregues: number;
  extraviados: number;
  pendentes: number;
  percentual: number;
}

// ============================================================
// SYNC DOWN / UP PAYLOADS
// ============================================================

export interface SyncDownPayload {
  rota: {
    id: string;
    motorista_id: string;
    motorista_nome: string;
    placa_veiculo: string;
    ordem_editavel: boolean;
  };
  carga: {
    id: string;
    volumes: Array<{
      id: string;
      codigo_barras: string;
      descricao: string;
    }>;
  };
  clientes: Array<{
    id: string;
    nome_comercial: string;
    nome_formal: string;
    endereco: string;
    cidade: string;
    ordem_na_rota: number;
    ordens: Array<{
      id: string;
      tipo: OrdemTipo;
      numero_nota: string;
      serie: string;
      volumes: Array<{
        id: string;
        codigo_barras: string;
        descricao: string;
        quantidade: number;
      }>;
    }>;
  }>;
}

export interface SyncUpPayload {
  rota_id: string;
  motorista_id: string;
  dt_sync_down: string;
  dt_sync_up: string;
  carga: {
    id: string;
    status: CargaStatus;
    dt_inicio: string | null;
    dt_fim: string | null;
    volumes: Array<{
      id: string;
      status: 'pendente' | 'bipado';
      dt_bipagem: string | null;
    }>;
  };
  clientes: Array<{
    id: string;
    status: ClienteStatus;
    dt_inicio: string | null;
    dt_fim: string | null;
    ordens: Array<{
      id: string;
      status: OrdemStatus;
      dt_inicio: string | null;
      dt_fim: string | null;
      volumes: Array<{
        id: string;
        status: VolumeStatus;
        observacao: string | null;
        dt_bipagem: string | null;
      }>;
    }>;
  }>;
}

// ============================================================
// ESTADO GLOBAL DA ENTREGA (para Context)
// ============================================================

export type FaseEntrega = 'LOGIN' | 'SYNC_DOWN' | 'CARGA' | 'ROTA' | 'SYNC_UP' | 'CONCLUIDA';

export interface EntregaState {
  fase: FaseEntrega;
  rota: Rota | null;
  carga: Carga | null;
  clientes: Cliente[];
  isSyncing: boolean;
  lastError: string | null;
}
