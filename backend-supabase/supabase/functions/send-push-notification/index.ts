/**
 * Edge Function para enviar Push Notifications
 * Envia notificações push para usuários quando eventos importantes acontecem
 * 
 * Uso: Chamar quando campanha finalizar, pagamento confirmar, etc.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// @deno-types="https://esm.sh/@types/web-push@3.6.4/index.d.ts"
import * as webpush from 'https://esm.sh/web-push@3.6.5';

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com';

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, title, body, data, icon, tag } = await req.json();

    if (!userId || !title || !body) {
      return new Response(
        JSON.stringify({ success: false, error: 'userId, title e body são obrigatórios' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Buscar todas as subscriptions do usuário
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (subError) {
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`Usuário ${userId} não tem subscriptions de push`);
      return new Response(
        JSON.stringify({ success: true, message: 'Usuário não tem subscriptions', sent: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Enviar push para cada subscription
    let sentCount = 0;
    let failedCount = 0;

    // Configurar VAPID (se disponível)
    if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
        VAPID_SUBJECT,
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
      );
    }

    for (const subscription of subscriptions) {
      try {
        const pushPayload = JSON.stringify({
          title: title,
          body: body,
          icon: icon || '/favicon.ico',
          badge: '/favicon.ico',
          tag: tag || 'default',
          data: data || {},
          requireInteraction: false,
        });

        // Preparar subscription object
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: subscription.keys,
        };

        // Enviar push notification usando web-push library
        try {
          await webpush.sendNotification(pushSubscription, pushPayload);
          sentCount++;
          console.log(`Push enviado com sucesso para ${subscription.endpoint}`);
        } catch (webpushError: any) {
          // Tratar erros específicos do web-push
          if (webpushError.statusCode === 410) {
            // Subscription expirada/inválida - remover do banco
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('id', subscription.id);
            console.log(`Subscription inválida removida: ${subscription.id}`);
            failedCount++;
          } else if (webpushError.statusCode === 429) {
            // Rate limit - não remover, apenas logar
            console.warn(`Rate limit ao enviar push para ${subscription.endpoint}`);
            failedCount++;
          } else {
            failedCount++;
            console.error(`Erro ao enviar push para ${subscription.endpoint}:`, webpushError.statusCode, webpushError.message);
          }
        }
      } catch (error) {
        failedCount++;
        console.error(`Erro ao processar subscription ${subscription.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Push notifications enviadas: ${sentCount} sucesso, ${failedCount} falhas`,
        sent: sentCount,
        failed: failedCount,
        total: subscriptions.length,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    console.error('Erro na função send-push-notification:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});

