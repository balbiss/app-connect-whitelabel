import { useState, useEffect } from 'react';

/**
 * Hook para detectar se está em modo desktop
 * Desktop = tela >= 1024px
 */
export function useDesktopMode() {
  const [isDesktop, setIsDesktop] = useState(false);
  const [screenWidth, setScreenWidth] = useState(0);

  useEffect(() => {
    // Função para verificar tamanho da tela
    const checkDesktop = () => {
      const width = window.innerWidth;
      setScreenWidth(width);
      setIsDesktop(width >= 1024); // Desktop = 1024px ou mais
    };

    // Verificar na montagem
    checkDesktop();

    // Adicionar listener para mudanças de tamanho
    window.addEventListener('resize', checkDesktop);

    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  return {
    isDesktop,
    isMobile: !isDesktop,
    screenWidth,
  };
}


