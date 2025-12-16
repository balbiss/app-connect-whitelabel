/**
 * Hook para verificar e gerenciar permissões de administrador
 */

import { useAuth } from './useAuth';
import { useMemo } from 'react';

export function useAdmin() {
  const { profile, user } = useAuth();

  const isAdmin = useMemo(() => {
    // Verificar se profile existe
    if (!profile) {
      console.log('🔍 [useAdmin] Profile não carregado ainda');
      return false;
    }

    // Verificar de múltiplas formas (boolean true, string "true", ou email específico)
    const isAdminField = profile.is_admin === true || profile.is_admin === 'true' || String(profile.is_admin) === 'true';
    const isEmailMatch = profile.email === 'inoovawebpro@gmail.com';
    const adminCheck = isAdminField || isEmailMatch;
    
    // Debug log SEMPRE (não apenas em desenvolvimento)
    console.log('🔍 [useAdmin] Debug:', {
      email: profile.email,
      is_admin: profile.is_admin,
      is_admin_type: typeof profile.is_admin,
      isAdminField,
      isEmailMatch,
      adminCheck,
      profileKeys: Object.keys(profile),
    });
    
    return adminCheck;
  }, [profile]);

  return {
    isAdmin,
    profile,
    user,
  };
}

