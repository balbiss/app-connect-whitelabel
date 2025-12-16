/**
 * Configuração do cliente Supabase
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados');
  console.error('SUPABASE_URL:', supabaseUrl ? '✅ Configurado' : '❌ Faltando');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Configurado' : '❌ Faltando');
  throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios');
}

// Verificar se a chave parece válida (começa com eyJ)
if (!supabaseServiceKey.startsWith('eyJ')) {
  console.error('⚠️ ATENÇÃO: SUPABASE_SERVICE_ROLE_KEY não parece ser uma chave JWT válida');
  console.error('Chave recebida (primeiros 20 caracteres):', supabaseServiceKey.substring(0, 20));
}

// Cliente com Service Role Key (bypass RLS)
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Cliente com Anon Key (para operações com RLS)
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
export const supabaseAnon = supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : supabase;

console.log('✅ Cliente Supabase configurado');

