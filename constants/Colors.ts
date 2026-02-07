/**
 * Sistema de cores do Zé da Entrega
 * Baseado no protótipo Lovable - Teal/Orange industrial
 */

// Cores industriais principais
export const Colors = {
  // Cores principais do sistema
  primary: '#1ba8a5',      // Teal - header, botões principais
  primaryDark: '#158a87',   // Teal escuro - hover/pressed
  secondary: '#ff9500',     // Laranja - Ordem de Carga, destaques
  secondaryDark: '#e68600', // Laranja escuro - hover/pressed
  success: '#16a34a',       // Verde - entrega concluída, iniciar
  warning: '#f59e0b',       // Amarelo - alerta
  danger: '#dc2626',        // Vermelho - extraviado, erro
  info: '#3b82f6',          // Azul - finalizar entrega

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
  background: '#f8fafc',
  surface: '#ffffff',
  cardBackground: '#ffffff',

  // Cores de ação
  destructive: '#dc2626',

  // Textos
  text: '#1f2937',
  textSecondary: '#6b7280',
  textInverse: '#ffffff',

  // Status de volume
  volumePendente: '#f59e0b',
  volumeEntregue: '#16a34a',
  volumeExtraviado: '#dc2626',

  // Status de cliente
  clienteAguardando: '#9ca3af',
  clienteEmAndamento: '#3b82f6',
  clienteFinalizado: '#16a34a',
  clienteBloqueado: '#d1d5db',

  // Compatibilidade com tema do Expo
  light: {
    text: '#1f2937',
    background: '#f8fafc',
    tint: '#1ba8a5',
    icon: '#6b7280',
    tabIconDefault: '#6b7280',
    tabIconSelected: '#1ba8a5',
  },
  dark: {
    text: '#f9fafb',
    background: '#111827',
    tint: '#1ba8a5',
    icon: '#9ca3af',
    tabIconDefault: '#9ca3af',
    tabIconSelected: '#1ba8a5',
  },
};
