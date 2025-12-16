/**
 * Edge Function para excluir usuário do Supabase Auth e banco de dados
 * Requer service role key para acessar Admin API
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Criar cliente com service role para Admin API
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'user_id é obrigatório' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // 1. Excluir do banco de dados primeiro (cascata vai excluir dados relacionados)
    const { error: deleteError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', user_id);

    if (deleteError) {
      console.error('Erro ao excluir do banco:', deleteError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao excluir do banco de dados',
          details: deleteError.message 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // 2. Excluir do Supabase Auth usando Admin API
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (authError) {
      console.error('Erro ao excluir do Auth:', authError);
      // Não falhar se já foi excluído do banco, apenas logar o erro
      console.warn('Usuário excluído do banco, mas erro ao excluir do Auth:', authError.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Usuário excluído com sucesso',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error: any) {
    console.error('Erro ao excluir usuário:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Erro interno ao excluir usuário',
        details: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});




