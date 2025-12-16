/**
 * Edge Function para receber webhooks da Cakto
 * Atualiza status de pagamento e assinatura
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CAKTO_SECRET = Deno.env.get('CAKTO_WEBHOOK_SECRET') || '';

serve(async (req) => {
  // Headers CORS para permitir requisições de qualquer origem
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-cakto-signature',
    'Content-Type': 'application/json',
  };

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Responder imediatamente para evitar timeout
  const startTime = Date.now();
  console.log('=== WEBHOOK RECEBIDO ===', new Date().toISOString());
  console.log('URL:', req.url);
  console.log('Headers recebidos:', Object.fromEntries(req.headers.entries()));

  try {
    // Verificar método
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: corsHeaders,
      });
    }

    // Ler body primeiro (antes de processar em background)
    const body = await req.json();
    console.log('=== WEBHOOK RECEBIDO ===');
    console.log('Body completo:', JSON.stringify(body, null, 2));
    
    // Tentar diferentes formatos que a Cakto pode enviar
    let eventType = body.event_type || body.type || body.event || body.action;
    
    // Mapear eventos específicos da Cakto
    if (eventType === 'purchase_approved' || eventType === 'purchase.approved') {
      eventType = 'payment.paid';
    } else if (eventType === 'purchase_failed' || eventType === 'purchase.failed') {
      eventType = 'payment.failed';
    } else if (eventType === 'subscription_canceled' || eventType === 'subscription.canceled' || eventType === 'subscription_cancelled') {
      eventType = 'subscription.canceled';
    } else if (eventType === 'subscription_expired' || eventType === 'subscription.expired') {
      eventType = 'subscription.expired';
    }
    
    // Se ainda não tiver eventType, verificar se é um objeto direto com dados de pagamento
    if (!eventType) {
      // Verificar se tem campos que indicam pagamento aprovado
      if (body.status === 'paid' || body.status === 'approved' || body.payment_status === 'paid') {
        eventType = 'payment.paid';
      } else if (body.status === 'failed' || body.payment_status === 'failed') {
        eventType = 'payment.failed';
      } else if (body.subscription_id && !body.payment_id) {
        // Se tem subscription_id mas não payment_id, pode ser criação de assinatura
        eventType = 'subscription.created';
      } else {
        // Tentar inferir pelo formato do body
        if (body.payment_id || body.paymentId || body.id) {
          eventType = 'payment.paid'; // Assumir pagamento aprovado se tiver payment_id ou id
        }
      }
    }
    
    const data = body.data || body;
    
    console.log('Event Type detectado:', eventType || 'undefined');
    console.log('Data:', JSON.stringify(data, null, 2));
    
    // Se ainda não tiver eventType, logar para debug
    if (!eventType) {
      console.warn('⚠️ Event Type não detectado! Body completo:', JSON.stringify(body, null, 2));
      // Tentar processar como payment.paid por padrão se tiver dados de pagamento
      if (body.payment_id || body.paymentId || body.customer_id || body.customerId) {
        eventType = 'payment.paid';
        console.log('⚠️ Assumindo payment.paid baseado nos dados recebidos');
      }
    }

    // Verificar assinatura do webhook (se necessário)
    const signature = req.headers.get('x-cakto-signature');
    if (CAKTO_SECRET && signature) {
      // Implementar verificação de assinatura se a Cakto usar
      // const isValid = verifySignature(body, signature, CAKTO_SECRET);
      // if (!isValid) {
      //   return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      //     status: 401,
      //   });
      // }
    }

    // Processar webhook de forma assíncrona (não bloquear resposta)
    const processWebhook = async () => {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Processar diferentes tipos de eventos
        switch (eventType) {
          case 'payment.paid':
          case 'payment.completed':
          case 'purchase_approved':
          case 'purchase.approved':
            await handlePaymentPaid(supabase, data);
            break;

          case 'payment.failed':
          case 'payment.refunded':
          case 'purchase_failed':
          case 'purchase.failed':
            await handlePaymentFailed(supabase, data);
            break;

          case 'subscription.created':
          case 'subscription.activated':
            await handleSubscriptionCreated(supabase, data);
            break;

          case 'subscription.canceled':
          case 'subscription.expired':
            await handleSubscriptionCanceled(supabase, data);
            break;

          case 'subscription.renewed':
            await handleSubscriptionRenewed(supabase, data);
            break;

          default:
            console.log('⚠️ Unhandled event type:', eventType);
            // Se não tiver eventType definido, tentar processar como payment.paid
            if (!eventType || eventType === 'undefined') {
              console.log('⚠️ Tentando processar como payment.paid por padrão...');
              await handlePaymentPaid(supabase, data);
            }
        }
        
        const endTime = Date.now();
        console.log(`✅ Webhook processado em ${endTime - startTime}ms`);
      } catch (error) {
        console.error('Erro ao processar webhook:', error);
      }
    };

    // Processar webhook em background (não bloquear resposta)
    processWebhook().catch(err => console.error('Erro no processamento assíncrono:', err));

    // Responder imediatamente (antes de processar)
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Webhook recebido e sendo processado',
      timestamp: new Date().toISOString()
    }), {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('Erro no webhook:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
});

// Handler para pagamento aprovado
async function handlePaymentPaid(supabase: any, data: any) {
  console.log('=== WEBHOOK PAYMENT.PAID RECEBIDO ===');
  console.log('Dados recebidos:', JSON.stringify(data, null, 2));
  
  // Aceitar diferentes formatos de campos (camelCase, snake_case, etc)
  // Formato Cakto: data.customer.email, data.subscription.id, data.id, data.offer.id
  const customer_id = data.customer_id || data.customerId || (data.customer && data.customer.id) || data.customer;
  const subscription_id = data.subscription_id || data.subscriptionId || (data.subscription && data.subscription.id) || data.subscription;
  const payment_id = data.payment_id || data.paymentId || data.payment || data.id;
  const amount = data.amount || data.value || data.total || data.price || data.baseAmount;
  const plan = data.plan || data.plan_name || data.planName || (data.offer && data.offer.id) || (data.product && data.product.id) || data.product_name || data.productName;
  const metadata = data.metadata || data.meta || {};
  // Formato Cakto: data.customer.email
  const customer_email = data.customer_email || data.customerEmail || (data.customer && data.customer.email) || data.email;
  const email = data.email || customer_email || (data.customer && data.customer.email);

  // Buscar usuário pelo customer_id ou metadata[user_id] ou email
  let profile = null;
  
  // 1. Tentar pelo customer_id
  if (customer_id) {
    console.log('Buscando perfil por customer_id:', customer_id);
    const { data: profileByCustomer, error: errorCustomer } = await supabase
      .from('profiles')
      .select('*')
      .eq('cakto_customer_id', customer_id)
      .single();
    
    if (errorCustomer) {
      console.log('Erro ao buscar por customer_id:', errorCustomer);
    } else {
      profile = profileByCustomer;
      console.log('Perfil encontrado por customer_id:', profile?.id);
    }
  }

  // 2. Tentar pelo metadata[user_id]
  if (!profile && metadata?.user_id) {
    console.log('Buscando perfil por metadata[user_id]:', metadata.user_id);
    const { data: profileByMetadata, error: errorMetadata } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', metadata.user_id)
      .single();
    
    if (errorMetadata) {
      console.log('Erro ao buscar por metadata[user_id]:', errorMetadata);
    } else {
      profile = profileByMetadata;
      console.log('Perfil encontrado por metadata[user_id]:', profile?.id);
    }
  }

  // 3. Tentar pelo email (customer_email ou email)
  if (!profile && (customer_email || email)) {
    const emailToSearch = customer_email || email;
    console.log('Buscando perfil por email:', emailToSearch);
    const { data: profileByEmail, error: errorEmail } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', emailToSearch)
      .single();
    
    if (errorEmail) {
      console.log('Erro ao buscar por email:', errorEmail);
    } else {
      profile = profileByEmail;
      console.log('Perfil encontrado por email:', profile?.id);
    }
  }

  if (!profile) {
    console.error('❌ PERFIL NÃO ENCONTRADO!');
    console.error('customer_id:', customer_id);
    console.error('metadata:', metadata);
    console.error('email:', customer_email || email);
    console.error('Dados completos recebidos:', JSON.stringify(data, null, 2));
    return;
  }

  console.log('✅ Perfil encontrado:', profile.id, profile.email);

  // Determinar o plano
  // Mapear IDs da Cakto para planos
  // "36f3bmf" = PRO, "schmi6m" = SUPER PRO (verificar no Plans.tsx)
  let finalPlan = plan || metadata?.plan || 'pro';
  
  // Se o plano for um ID da Cakto, mapear para o nome do plano
  if (finalPlan === '36f3bmf' || finalPlan === '641100') {
    finalPlan = 'pro';
  } else if (finalPlan === 'schmi6m' || finalPlan === '641106') {
    finalPlan = 'super_pro';
  }
  
  // Se o plano vier do nome do produto/offer
  if (typeof finalPlan === 'string') {
    const planLower = finalPlan.toLowerCase();
    if (planLower.includes('super') || planLower.includes('super pro')) {
      finalPlan = 'super_pro';
    } else if (planLower.includes('teste') || planLower.includes('trial') || planLower.includes('test')) {
      finalPlan = 'teste';
    } else if (planLower.includes('pro')) {
      finalPlan = 'pro';
    }
  }
  
  console.log('Plano determinado:', finalPlan);

  // Registrar pagamento
  console.log('Registrando pagamento...');
  const { error: paymentError } = await supabase.from('pagamentos').insert({
    user_id: profile.id,
    cakto_payment_id: payment_id,
    cakto_subscription_id: subscription_id,
    cakto_customer_id: customer_id,
    amount: amount,
    plan: finalPlan,
    status: 'paid',
    paid_at: new Date().toISOString(),
  });

  if (paymentError) {
    console.error('Erro ao registrar pagamento:', paymentError);
  } else {
    console.log('✅ Pagamento registrado com sucesso');
  }

  // Atualizar perfil
  console.log('Atualizando perfil...');
  
  // Preparar dados de atualização baseado no plano
  const updateData: any = {
    subscription_status: 'active',
    cakto_subscription_id: subscription_id,
    cakto_customer_id: customer_id || profile.cakto_customer_id, // Salvar customer_id se não tiver
    plan: finalPlan,
  };

  // Configurar limites baseado no plano
  if (finalPlan === 'pro') {
    updateData.max_connections = 2;
    updateData.daily_disparos_limit = null; // Ilimitado
  } else if (finalPlan === 'super_pro') {
    updateData.max_connections = 4;
    updateData.daily_disparos_limit = null; // Ilimitado
  } else if (finalPlan === 'teste') {
    updateData.max_connections = 1;
    updateData.daily_disparos_limit = 20; // 20 disparos por dia
    updateData.daily_disparos_count = 0; // Resetar contador
    updateData.last_disparos_reset_date = new Date().toISOString().split('T')[0]; // Data atual
    // Definir expiração em 3 dias
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 3);
    updateData.trial_ends_at = trialEndDate.toISOString();
  } else {
    updateData.max_connections = 2;
    updateData.daily_disparos_limit = null;
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', profile.id);

  if (profileError) {
    console.error('Erro ao atualizar perfil:', profileError);
  } else {
    console.log('✅ Perfil atualizado com sucesso!');
    console.log('Subscription Status: active');
    console.log('Plan:', finalPlan);
    
    // Extrair subscription_ends_at dos dados
    const subscription_ends_at = data.subscription_ends_at || data.expires_at || data.expiresAt || 
                                 (data.subscription && data.subscription.expires_at) || null;
    
    // Enviar email de confirmação de assinatura
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
      const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-subscription-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''}`,
        },
        body: JSON.stringify({
          user_id: profile.id,
          email: profile.email,
          name: profile.name || 'Usuário',
          plan: finalPlan,
          expires_at: subscription_ends_at,
        }),
      });

      if (emailResponse.ok) {
        console.log('✅ Email de confirmação enviado');
      } else {
        console.warn('⚠️ Erro ao enviar email:', await emailResponse.text());
      }
    } catch (emailError) {
      console.error('Erro ao enviar email de confirmação:', emailError);
      // Não falhar o webhook se o email falhar
    }
  }
}

// Handler para pagamento falhado
async function handlePaymentFailed(supabase: any, data: any) {
  const { customer_id, payment_id, subscription_id, metadata } = data;

  // Buscar usuário pelo customer_id ou metadata[user_id]
  let profile = null;
  
  if (customer_id) {
    const { data: profileByCustomer } = await supabase
      .from('profiles')
      .select('*')
      .eq('cakto_customer_id', customer_id)
      .single();
    profile = profileByCustomer;
  }

  // Se não encontrou pelo customer_id, tentar pelo metadata[user_id]
  if (!profile && metadata?.user_id) {
    const { data: profileByMetadata } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', metadata.user_id)
      .single();
    profile = profileByMetadata;
  }

  if (!profile) return;

  // Registrar pagamento falhado
  await supabase.from('pagamentos').insert({
    user_id: profile.id,
    cakto_payment_id: payment_id,
    cakto_subscription_id: subscription_id,
    cakto_customer_id: customer_id,
    amount: data.amount || 0,
    plan: profile.plan,
    status: 'failed',
  });

  // Atualizar status da assinatura
  await supabase
    .from('profiles')
    .update({
      subscription_status: 'past_due',
    })
    .eq('id', profile.id);
}

// Handler para assinatura criada
async function handleSubscriptionCreated(supabase: any, data: any) {
  const { customer_id, subscription_id, plan, metadata } = data;

  // Buscar usuário pelo customer_id ou metadata[user_id]
  let profile = null;
  
  if (customer_id) {
    const { data: profileByCustomer } = await supabase
      .from('profiles')
      .select('*')
      .eq('cakto_customer_id', customer_id)
      .single();
    profile = profileByCustomer;
  }

  // Se não encontrou pelo customer_id, tentar pelo metadata[user_id]
  if (!profile && metadata?.user_id) {
    const { data: profileByMetadata } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', metadata.user_id)
      .single();
    profile = profileByMetadata;
  }

  if (!profile) return;

  await supabase
    .from('profiles')
    .update({
      cakto_subscription_id: subscription_id,
      cakto_customer_id: customer_id || profile.cakto_customer_id,
      subscription_status: 'active',
      plan: plan || metadata?.plan || 'pro',
      subscription_ends_at: data.expires_at || null,
    })
    .eq('id', profile.id);
}

// Handler para assinatura cancelada
async function handleSubscriptionCanceled(supabase: any, data: any) {
  console.log('=== WEBHOOK SUBSCRIPTION.CANCELED RECEBIDO ===');
  console.log('Dados recebidos:', JSON.stringify(data, null, 2));
  
  // Aceitar diferentes formatos de campos (camelCase, snake_case, etc)
  // Formato Cakto: data.customer.email, data.subscription.id
  const customer_id = data.customer_id || data.customerId || (data.customer && data.customer.id) || data.customer;
  const subscription_id = data.subscription_id || data.subscriptionId || (data.subscription && data.subscription.id) || data.subscription;
  const metadata = data.metadata || data.meta || {};
  // Formato Cakto: data.customer.email
  const customer_email = data.customer_email || data.customerEmail || (data.customer && data.customer.email) || data.email;
  const email = data.email || customer_email || (data.customer && data.customer.email);
  const canceled_at = data.canceled_at || data.canceledAt || (data.subscription && data.subscription.canceledAt) || data.canceledAt;
  const expires_at = data.expires_at || data.expiresAt || (data.subscription && data.subscription.next_payment_date) || data.expires_at;

  // Buscar usuário pelo customer_id, metadata[user_id] ou email
  let profile = null;
  
  // 1. Tentar pelo customer_id
  if (customer_id) {
    console.log('Buscando perfil por customer_id:', customer_id);
    const { data: profileByCustomer, error: errorCustomer } = await supabase
      .from('profiles')
      .select('*')
      .eq('cakto_customer_id', customer_id)
      .single();
    
    if (errorCustomer) {
      console.log('Erro ao buscar por customer_id:', errorCustomer);
    } else {
      profile = profileByCustomer;
      console.log('Perfil encontrado por customer_id:', profile?.id);
    }
  }

  // 2. Tentar pelo subscription_id
  if (!profile && subscription_id) {
    console.log('Buscando perfil por subscription_id:', subscription_id);
    const { data: profileBySubscription, error: errorSubscription } = await supabase
      .from('profiles')
      .select('*')
      .eq('cakto_subscription_id', subscription_id)
      .single();
    
    if (errorSubscription) {
      console.log('Erro ao buscar por subscription_id:', errorSubscription);
    } else {
      profile = profileBySubscription;
      console.log('Perfil encontrado por subscription_id:', profile?.id);
    }
  }

  // 3. Tentar pelo metadata[user_id]
  if (!profile && metadata?.user_id) {
    console.log('Buscando perfil por metadata[user_id]:', metadata.user_id);
    const { data: profileByMetadata, error: errorMetadata } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', metadata.user_id)
      .single();
    
    if (errorMetadata) {
      console.log('Erro ao buscar por metadata[user_id]:', errorMetadata);
    } else {
      profile = profileByMetadata;
      console.log('Perfil encontrado por metadata[user_id]:', profile?.id);
    }
  }

  // 4. Tentar pelo email (customer_email ou email)
  if (!profile && (customer_email || email)) {
    const emailToSearch = customer_email || email;
    console.log('Buscando perfil por email:', emailToSearch);
    const { data: profileByEmail, error: errorEmail } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', emailToSearch)
      .single();
    
    if (errorEmail) {
      console.log('Erro ao buscar por email:', errorEmail);
    } else {
      profile = profileByEmail;
      console.log('Perfil encontrado por email:', profile?.id);
    }
  }

  if (!profile) {
    console.error('❌ PERFIL NÃO ENCONTRADO PARA CANCELAMENTO!');
    console.error('customer_id:', customer_id);
    console.error('subscription_id:', subscription_id);
    console.error('metadata:', metadata);
    console.error('email:', customer_email || email);
    console.error('Dados completos recebidos:', JSON.stringify(data, null, 2));
    return;
  }

  console.log('✅ Perfil encontrado para cancelamento:', profile.id, profile.email);

  // Atualizar status da assinatura para canceled
  // Manter o plano atual mas desativar o acesso
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      subscription_status: 'canceled',
      subscription_ends_at: expires_at || canceled_at || null,
      // Manter o plano atual, mas o usuário não terá acesso até reativar
      // max_connections permanece o mesmo, mas não poderá criar novas conexões
    })
    .eq('id', profile.id);

  if (profileError) {
    console.error('Erro ao cancelar assinatura:', profileError);
  } else {
    console.log('✅ Assinatura cancelada com sucesso!');
    console.log('Subscription Status: canceled');
    console.log('Subscription Ends At:', expires_at || canceled_at || 'N/A');
  }
}

// Handler para assinatura renovada
async function handleSubscriptionRenewed(supabase: any, data: any) {
  const { customer_id, subscription_id, expires_at, metadata } = data;

  // Buscar usuário pelo customer_id ou metadata[user_id]
  let profile = null;
  
  if (customer_id) {
    const { data: profileByCustomer } = await supabase
      .from('profiles')
      .select('*')
      .eq('cakto_customer_id', customer_id)
      .single();
    profile = profileByCustomer;
  }

  // Se não encontrou pelo customer_id, tentar pelo metadata[user_id]
  if (!profile && metadata?.user_id) {
    const { data: profileByMetadata } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', metadata.user_id)
      .single();
    profile = profileByMetadata;
  }

  if (!profile) return;

  await supabase
    .from('profiles')
    .update({
      subscription_status: 'active',
      subscription_ends_at: expires_at || null,
    })
    .eq('id', profile.id);
}

// Função para enviar email de confirmação de assinatura
async function sendSubscriptionActivatedEmail(
  supabase: any,
  profile: any,
  plan: string,
  expiresAt: string | null
) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    // Tentar obter URL do frontend das variáveis de ambiente ou usar padrão
    const frontendUrl = Deno.env.get('FRONTEND_URL') || Deno.env.get('SITE_URL') || 'https://connect.inoovaweb.com.br';
    
    // Determinar URL de login
    const loginUrl = frontendUrl.includes('http') 
      ? `${frontendUrl}/login`
      : `https://${frontendUrl}/login`;
    
    // Mapear nome do plano
    const planDisplay = plan === 'super_pro' ? 'SUPER PRO' : plan === 'pro' ? 'PRO' : plan.toUpperCase();
    
    // Formatar data de expiração
    let expiresAtFormatted = null;
    if (expiresAt) {
      const date = new Date(expiresAt);
      expiresAtFormatted = date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    }
    
    // Ler template de email
    const templatePath = new URL('../templates-email/assinatura-ativada.html', import.meta.url);
    let emailHtml = '';
    try {
      emailHtml = await Deno.readTextFile(templatePath);
    } catch (templateError) {
      // Se não conseguir ler o template, criar HTML inline
      console.warn('Não foi possível ler o template, usando HTML inline');
      emailHtml = createEmailHTML(profile.name || 'Usuário', planDisplay, loginUrl, expiresAtFormatted);
    }
    
    // Substituir variáveis no template
    emailHtml = emailHtml
      .replace(/\{\{name\}\}/g, profile.name || 'Usuário')
      .replace(/\{\{plan\}\}/g, plan)
      .replace(/\{\{plan_display\}\}/g, planDisplay)
      .replace(/\{\{login_url\}\}/g, loginUrl)
      .replace(/\{\{expires_at\}\}/g, expiresAtFormatted || '');
    
    // Remover blocos condicionais não usados
    if (!expiresAtFormatted) {
      emailHtml = emailHtml.replace(/\{\{#if expires_at\}\}[\s\S]*?\{\{\/if\}\}/g, '');
    } else {
      emailHtml = emailHtml.replace(/\{\{#if expires_at\}\}/g, '').replace(/\{\{\/if\}\}/g, '');
    }
    
    // Usar Resend API diretamente se tiver a API key
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey) {
      const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@connect.app';
      
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: resendFromEmail,
          to: profile.email,
          subject: '🎉 Assinatura Ativada - Connect',
          html: emailHtml,
        }),
      });
      
      if (resendResponse.ok) {
        const resendData = await resendResponse.json();
        console.log('✅ Email de confirmação enviado via Resend:', resendData.id);
      } else {
        const errorText = await resendResponse.text();
        console.error('Erro ao enviar email via Resend:', errorText);
        throw new Error(`Resend API error: ${errorText}`);
      }
    } else {
      // Se não tiver Resend, usar Supabase Auth para enviar email customizado
      // Nota: O Supabase Auth não tem API direta para emails customizados
      // Vamos usar o Supabase para enviar um email de reset como workaround
      console.log('⚠️ RESEND_API_KEY não configurada. Tentando usar Supabase Auth...');
      
      // Gerar link de magic link para login
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: profile.email,
        options: {
          redirectTo: loginUrl,
        },
      });
      
      if (linkError) {
        console.error('Erro ao gerar link de autenticação:', linkError);
        throw linkError;
      }
      
      // Enviar email usando Supabase Auth (vai usar o template padrão, mas com o link)
      // Nota: Isso enviará um email de magic link padrão, não o template customizado
      console.log('✅ Link de login gerado:', linkData.properties.action_link);
      console.log('⚠️ Email customizado não enviado. Configure RESEND_API_KEY para enviar emails customizados.');
      console.log('Email deveria ser enviado para:', profile.email);
      console.log('Login URL:', loginUrl);
    }
  } catch (error) {
    console.error('Erro ao enviar email de confirmação:', error);
    // Não lançar erro para não quebrar o webhook
  }
}

// Função auxiliar para criar HTML do email inline (fallback)
function createEmailHTML(name: string, planDisplay: string, loginUrl: string, expiresAt: string | null): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Assinatura Ativada - Connect</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">🎉 Assinatura Ativada!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px; background-color: #ffffff;">
              <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 24px;">Olá, ${name}!</h2>
              <p style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 16px;">Sua assinatura do plano <strong style="color: #667eea;">${planDisplay}</strong> foi ativada com sucesso! 🚀</p>
              <p style="margin: 0 0 30px 0; color: #4a4a4a; font-size: 16px;">Acesse sua conta e comece a usar agora mesmo!</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 0 0 30px 0;">
                    <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600;">Acessar Minha Conta</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; word-break: break-all; color: #667eea; font-size: 14px; padding: 12px; background-color: #f8f9fa; border-radius: 6px;">${loginUrl}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
