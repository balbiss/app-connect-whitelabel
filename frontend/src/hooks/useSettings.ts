/**
 * Hook para gerenciar configurações do usuário
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface UserSettings {
  darkTheme: boolean;
  notifications: boolean;
  sounds: boolean;
  analytics: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  darkTheme: true,
  notifications: true,
  sounds: true,
  analytics: true,
};

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Carregar preferências do localStorage e do perfil
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Carregar do localStorage primeiro (mais rápido)
      const savedSettings = localStorage.getItem('user_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }

      // Carregar do perfil do usuário
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('settings')
          .eq('id', user.id)
          .single();

        if (profile?.settings) {
          const profileSettings = typeof profile.settings === 'string' 
            ? JSON.parse(profile.settings) 
            : profile.settings;
          const mergedSettings = { ...DEFAULT_SETTINGS, ...profileSettings };
          setSettings(mergedSettings);
          // Sincronizar com localStorage
          localStorage.setItem('user_settings', JSON.stringify(mergedSettings));
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    try {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);

      // Salvar no localStorage imediatamente
      localStorage.setItem('user_settings', JSON.stringify(newSettings));

      // Salvar no perfil do usuário
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ 
            settings: newSettings,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
      }

      // Aplicar efeitos imediatos
      if (key === 'notifications') {
        if (value) {
          requestNotificationPermission();
        }
      }

      if (key === 'sounds') {
        // Sons serão aplicados nas ações
      }

      return true;
    } catch (error) {
      console.error('Erro ao atualizar configuração:', error);
      toast.error('Erro ao salvar configuração');
      return false;
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast.success('Notificações ativadas!');
      } else {
        toast.warning('Permissão de notificações negada');
      }
    }
  };

  return {
    settings,
    loading,
    updateSetting,
    requestNotificationPermission,
  };
}

