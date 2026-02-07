/**
 * Utilitários para verificação de permissões e níveis de acesso
 * 
 * Módulos disponíveis:
 * - guarda: Módulo de guarda (armazenista, admin)
 * - enderecamento: Módulo de endereçamento (admin)
 * - painel: Painel administrativo (admin)
 * 
 * Roles disponíveis:
 * - armazenista: Usuário padrão
 * - admin: Administrador (acesso total)
 */

import { AuthUsuario } from "@/contexts/AuthContext";

/**
 * Verifica se o usuário é administrador
 */
export function isAdmin(usuario: AuthUsuario | null): boolean {
  if (!usuario) return false;
  return usuario.roles?.includes("admin") || false;
}

/**
 * Verifica se o usuário tem uma permissão específica
 */
export function hasPermission(usuario: AuthUsuario | null, permission: string): boolean {
  if (!usuario) return false;
  return usuario.permissions?.includes(permission) || false;
}

/**
 * Verifica se o usuário tem uma role específica
 */
export function hasRole(usuario: AuthUsuario | null, role: string): boolean {
  if (!usuario) return false;
  return usuario.roles?.includes(role) || false;
}

/**
 * Verifica se o usuário tem permissão para acessar o módulo de guardas
 */
export function podeAcessarGuardas(usuario: AuthUsuario | null): boolean {
  return hasPermission(usuario, "guarda");
}

/**
 * Verifica se o usuário tem permissão para acessar o módulo de endereçamento
 */
export function podeAcessarEnderecamento(usuario: AuthUsuario | null): boolean {
  return hasPermission(usuario, "enderecamento");
}

/**
 * Verifica se o usuário tem permissão para acessar o painel de controle
 */
export function podeAcessarPainel(usuario: AuthUsuario | null): boolean {
  return hasPermission(usuario, "painel");
}

