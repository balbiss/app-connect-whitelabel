/**
 * Design System - Constantes padronizadas
 * Centraliza espaçamentos, tamanhos de fonte e breakpoints
 */

// Breakpoints (Tailwind CSS padrão)
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// Espaçamentos padronizados
export const spacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
  '3xl': '4rem',   // 64px
} as const;

// Tamanhos de fonte padronizados
export const fontSizes = {
  xs: '0.75rem',   // 12px
  sm: '0.875rem',  // 14px
  base: '1rem',    // 16px
  lg: '1.125rem',  // 18px
  xl: '1.25rem',   // 20px
  '2xl': '1.5rem', // 24px
  '3xl': '1.875rem', // 30px
  '4xl': '2.25rem',  // 36px
} as const;

// Border radius padronizados
export const borderRadius = {
  sm: '0.25rem',   // 4px
  md: '0.5rem',    // 8px
  lg: '0.75rem',   // 12px
  xl: '1rem',      // 16px
  '2xl': '1.5rem', // 24px
  full: '9999px',
} as const;

// Transições padronizadas
export const transitions = {
  fast: '150ms',
  normal: '200ms',
  slow: '300ms',
  slower: '500ms',
} as const;

// Z-index padronizados
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
} as const;

// Classes utilitárias para responsividade
export const responsiveClasses = {
  // Padding
  padding: {
    mobile: 'px-4 py-3',
    tablet: 'sm:px-6 sm:py-4',
    desktop: 'lg:px-8 lg:py-6',
  },
  // Gap
  gap: {
    mobile: 'gap-2',
    tablet: 'sm:gap-3',
    desktop: 'lg:gap-4',
  },
  // Text size
  text: {
    mobile: 'text-sm',
    tablet: 'sm:text-base',
    desktop: 'lg:text-lg',
  },
  // Container max-width
  container: {
    mobile: 'max-w-full',
    tablet: 'sm:max-w-2xl',
    desktop: 'lg:max-w-4xl',
  },
} as const;



