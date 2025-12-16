/**
 * Função de teste para verificar se o webhook está acessível
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const body = req.method === 'POST' ? await req.json() : null;
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook está acessível!',
        method: req.method,
        url: req.url,
        headers: Object.fromEntries(req.headers.entries()),
        body: body,
        timestamp: new Date().toISOString(),
      }),
      { headers: corsHeaders }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});




