/**
 * Edge Function para fazer proxy das requisições para a API WhatsApp
 * Resolve problemas de CORS fazendo requisições do servidor
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const WHATSAPP_API_URL = Deno.env.get('WHATSAPP_API_URL') || 'https://weeb.inoovaweb.com.br';
const WHATSAPP_API_KEY = Deno.env.get('WHATSAPP_API_KEY') || '44507d94623ef3c92c7c8b908b786836';

serve(async (req) => {
  // CORS headers para todas as respostas
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, token, x-auth-type, x-instance-token',
  };

  // Lidar com requisições OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Permitir POST, GET, DELETE, PUT
    if (!['POST', 'GET', 'DELETE', 'PUT'].includes(req.method)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders,
          } 
        }
      );
    }

    // Obter URL e método da requisição
    const url = new URL(req.url);
    const path = url.searchParams.get('path') || '';
    const method = req.method;

    if (!path) {
      return new Response(
        JSON.stringify({ success: false, error: 'Path parameter is required' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders,
          } 
        }
      );
    }

    // Obter headers da requisição original
    const headers: Record<string, string> = {};
    
    // Determinar qual header de autenticação usar
    const authHeader = req.headers.get('x-auth-type');
    const instanceToken = req.headers.get('x-instance-token') || '';
    
    if (authHeader === 'admin') {
      // Endpoints admin usam API Key diretamente (sem Bearer)
      // Priorizar WHATSAPP_API_KEY das env vars, usar instanceToken como fallback
      const adminKey = WHATSAPP_API_KEY || instanceToken;
      if (!adminKey) {
        console.error('Erro: WHATSAPP_API_KEY não configurado e instanceToken vazio');
        return new Response(
          JSON.stringify({ success: false, error: 'Admin API key not configured' }),
          { 
            status: 500, 
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders,
            } 
          }
        );
      }
      headers['Authorization'] = adminKey;
      headers['accept'] = 'application/json';
    } else if (instanceToken) {
      // Endpoints de usuário usam token
      headers['token'] = instanceToken;
    }

    // Copiar Content-Type se existir
    const contentType = req.headers.get('content-type');
    if (contentType) {
      headers['Content-Type'] = contentType;
    }

    // Log para debug (apenas em desenvolvimento)
    console.log('Proxy request:', {
      path,
      method,
      authType: authHeader,
      hasToken: !!instanceToken,
      headers: Object.keys(headers),
    });

    // Obter body se existir
    let body: string | undefined;
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      body = await req.text();
    }

    // Fazer requisição para a API WhatsApp
    const apiUrl = `${WHATSAPP_API_URL}${path}`;
    const response = await fetch(apiUrl, {
      method,
      headers,
      body,
    });

    // Obter resposta
    const responseData = await response.text();
    
    // Tentar parsear como JSON
    let jsonData;
    try {
      jsonData = JSON.parse(responseData);
    } catch {
      jsonData = responseData;
    }

    // Retornar resposta com CORS habilitado
    return new Response(
      typeof jsonData === 'string' ? jsonData : JSON.stringify(jsonData),
      {
        status: response.status,
        headers: {
          'Content-Type': response.headers.get('content-type') || 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error('Erro no proxy:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
  }
});
