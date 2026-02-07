/**
 * Types para o módulo de Painel de Controle
 */

export interface Permissao {
  id: string;
  nome: string;
  descricao: string;
  modulo: 'guardas' | 'enderecamento' | 'painel';
}

export interface UsuarioPermissao {
  cd_usuario: string;
  nome: string;
  email?: string;
  nivel: 'ADMIN' | 'OPERADOR' | 'VISUALIZADOR';
  permissoes: Permissao[];
  ativo: boolean;
}

// Placeholder para dados estáticos iniciais
export interface UsuarioPermissaoPlaceholder {
  cd_usuario: string;
  nome: string;
  email?: string;
  nivel: string;
  ativo: boolean;
}


