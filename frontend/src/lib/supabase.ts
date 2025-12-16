/**
 * Cliente Supabase para comunicação com backend
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // Detectar sessão na URL (hash)
    flowType: 'pkce', // Usar PKCE para melhor segurança
  },
  global: {
    headers: {
      'X-Client-Info': 'connect-whatsapp-saas',
    },
  },
  db: {
    schema: 'public',
  },
});

// Tipos para as tabelas
export interface Profile {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  plan: 'pro' | 'super_pro' | 'teste' | null;
  cakto_customer_id: string | null;
  cakto_subscription_id: string | null;
  subscription_status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'paused' | null;
  subscription_ends_at: string | null;
  max_connections: number;
  daily_disparos_limit: number | null;
  daily_disparos_count: number;
  last_disparos_reset_date: string;
  trial_ends_at: string | null;
  google_id: string | null;
  avatar_url: string | null;
  ai_provider: 'openai' | 'gemini' | 'grok' | null;
  ai_api_key: string | null;
  ai_model: string | null;
  is_admin: boolean | null;
  is_blocked: boolean | null;
  reseller_id: string | null; // ID do vendedor que trouxe este usuário
  settings: {
    darkTheme?: boolean;
    notifications?: boolean;
    sounds?: boolean;
    analytics?: boolean;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface Connection {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  platform: string;
  status: 'offline' | 'connecting' | 'online' | 'disconnected';
  api_instance_id: string | null;
  api_instance_token: string;
  avatar_url: string | null;
  qr_code: string | null;
  last_connected_at: string | null;
  messages_sent: number;
  active_days: number;
  created_at: string;
  updated_at: string;
}

export interface Disparo {
  id: string;
  user_id: string;
  connection_id: string;
  campaign_name: string;
  platform: string;
  message_variations: string[];
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  pending_count: number;
  delivered_count: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'failed' | 'paused' | 'cancelled';
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  delay_min: number;
  delay_max: number;
  created_at: string;
  updated_at: string;
}

export interface DisparoRecipient {
  id: string;
  disparo_id: string;
  name: string | null;
  phone_number: string;
  message_variation_id: number | null;
  personalized_message: string | null;
  media_url: string | null;
  media_type: 'image' | 'video' | 'document' | 'audio' | null;
  status: 'pending' | 'sent' | 'failed' | 'delivered';
  sent_at: string | null;
  delivered_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  read: boolean;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
  read_at: string | null;
}


