/**
 * Types para o módulo de Painel de Controle
 * Gerenciamento de usuários e roles
 */

// Roles disponíveis no sistema
export type RoleName = "admin" | "armazenista";

// Role completa com ID
export interface Role {
  id: number;
  name: RoleName;
  description?: string;
}

// Usuário retornado pelas APIs de admin/armazenista
export interface UsuarioPainel {
  codoper: string;
  nome: string;
  role: RoleName;
}

// Mudança pendente de role (para salvar em lote)
export interface MudancaRole {
  codoper: string;
  nome: string;
  roleAtual: RoleName;
  novaRole: RoleName | null; // null indica remoção de role
  roleId: number | null; // null quando remover role
  semRoleOriginal?: boolean; // Indica se o usuário não tinha role originalmente
  removerRole?: boolean; // Indica se a ação é remover a role
}

// Permissão individual (conforme novo formato do backend)
export interface PermissaoPainel {
  id: number;
  name: string;
  description: string;
  module: string;
  source: "role" | "custom";
}

// Resultado da busca de usuário por código
export interface ResultadoBuscaUsuario {
  codoper: string;
  nomeUsuario: string;
  role: {
    id: number;
    name: string;
    description: string;
  } | null;
  permissions: PermissaoPainel[];
  modules: string[];
}

// Estado do painel de controle
export interface EstadoPainel {
  admins: UsuarioPainel[];
  armazenistas: UsuarioPainel[];
  mudancasPendentes: Map<string, MudancaRole>;
  resultadoBusca: ResultadoBuscaUsuario | null;
  isLoading: boolean;
  isSaving: boolean;
  isBuscando: boolean;
  erro: string | null;
}

// Mapeamento de roles para IDs (conforme backend)
// IMPORTANTE: armazenista = 1, admin = 2
export const ROLES_MAP: Record<RoleName, number> = {
  armazenista: 1,
  admin: 2,
};

// Lista de roles para o dropdown
export const ROLES_DISPONIVEIS: Role[] = [
  { id: 1, name: "armazenista", description: "Operador de armazém" },
  { id: 2, name: "admin", description: "Administrador do sistema" },
];
