/**
 * Sistema de cores industrial do Zé do Bip
 * Migrado do MVP Lovable para manter consistência visual
 */

// Cores industriais principais
export const Colors = {
  // Cores principais do sistema
  primary: '#1e40af',      // Azul industrial
  success: '#16a34a',      // Verde operacional
  warning: '#f59e0b',      // Amarelo alerta
  danger: '#dc2626',       // Vermelho erro
  
  // Escala de cinzas
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  
  // Backgrounds e superfícies
  background: '#ffffff',
  surface: '#f8fafc',
  cardBackground: '#ffffff',
  
  // Cores de ação
  destructive: '#dc2626',
  
  // Textos
  text: '#1f2937',
  textSecondary: '#6b7280',
  textInverse: '#ffffff',
  
  // Compatibilidade com tema do Expo (para componentes existentes)
  light: {
    text: '#1f2937',
    background: '#ffffff',
    tint: '#1e40af',
    icon: '#6b7280',
    tabIconDefault: '#6b7280',
    tabIconSelected: '#1e40af',
  },
  dark: {
    text: '#f9fafb',
    background: '#111827',
    tint: '#3b82f6',
    icon: '#9ca3af',
    tabIconDefault: '#9ca3af',
    tabIconSelected: '#3b82f6',
  },
};
