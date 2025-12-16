/**
 * Edge Function para gerar token de autenticação Sync Pay
 * Busca credenciais automaticamente do system_settings (configuradas pelo admin)
 * Retorna: { access_token, token_type, expires_in, expires_at }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SYNC_PAY_API_URL = 'https://api.syncpayments.com.br';

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
    // Buscar credenciais do system_settings (configuradas pelo admin)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: settings, error: settingsError } = await supabaseClient
      .from('system_settings')
      .select('key, value')
      .in('key', ['syncpay_client_id', 'syncpay_client_secret']);

    if (settingsError || !settings || settings.length !== 2) {
      console.error('Erro ao buscar credenciais do Sync Pay:', settingsError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Credenciais do Sync Pay não configuradas. Entre em contato com o suporte.' 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Extrair valores do JSONB
    const clientIdSetting = settings.find(s => s.key === 'syncpay_client_id');
    const clientSecretSetting = settings.find(s => s.key === 'syncpay_client_secret');

    console.log('Client ID Setting:', clientIdSetting);
    console.log('Client Secret Setting:', clientSecretSetting ? { ...clientSecretSetting, value: '***OCULTO***' } : null);

    // O value é JSONB - Supabase pode retornar como string JSON ou objeto
    let client_id: string = '';
    let client_secret: string = '';
    
    try {
      // Tentar extrair do JSONB
      if (clientIdSetting?.value) {
        if (typeof clientIdSetting.value === 'string') {
          // Se for string, pode ser JSON string ou string direta
          try {
            const parsed = JSON.parse(clientIdSetting.value);
            client_id = typeof parsed === 'string' ? parsed : String(parsed);
          } catch {
            // Se não for JSON válido, usar como string direta
            client_id = clientIdSetting.value;
          }
        } else {
          // Se já for objeto/valor direto
          client_id = String(clientIdSetting.value);
        }
      }

      if (clientSecretSetting?.value) {
        if (typeof clientSecretSetting.value === 'string') {
          try {
            const parsed = JSON.parse(clientSecretSetting.value);
            client_secret = typeof parsed === 'string' ? parsed : String(parsed);
          } catch {
            client_secret = clientSecretSetting.value;
          }
        } else {
          client_secret = String(clientSecretSetting.value);
        }
      }

      console.log('Client ID extraído:', client_id ? client_id.substring(0, 10) + '...' : 'VAZIO');
      console.log('Client Secret extraído:', client_secret ? '***OCULTO***' : 'VAZIO');
    } catch (e) {
      console.error('Erro ao extrair credenciais:', e);
      client_id = String(clientIdSetting?.value || '');
      client_secret = String(clientSecretSetting?.value || '');
    }

    if (!client_id || !client_secret) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Credenciais do Sync Pay não configuradas. Entre em contato com o suporte.' 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Gerar token de autenticação
    const response = await fetch(`${SYNC_PAY_API_URL}/api/partner/v1/auth-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id,
        client_secret,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Erro ao gerar token Sync Pay:', errorData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao gerar token de autenticação',
          details: errorData
        }),
        { status: response.status, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const tokenData = await response.json();

    return new Response(
      JSON.stringify({
        success: true,
        ...tokenData,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    console.error('Erro ao gerar token Sync Pay:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Erro interno ao gerar token',
        details: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});

