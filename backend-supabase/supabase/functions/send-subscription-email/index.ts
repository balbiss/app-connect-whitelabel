/**
 * Edge Function para enviar email de confirmação de assinatura
 * Pode ser chamada do webhook da Cakto ou do painel admin
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: corsHeaders,
      });
    }

    // Verificar autenticação (opcional - pode ser chamada sem auth também)
    const authHeader = req.headers.get('Authorization');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    // Se não tiver Authorization header, usar Service Role Key diretamente
    // Isso permite chamadas do frontend autenticado ou do webhook
    if (!authHeader && !serviceRoleKey) {
      console.warn('⚠️ Nenhuma autenticação fornecida, mas continuando...');
    }

    const body = await req.json();
    const { user_id, email, name, plan, expires_at } = body;

    if (!email && !user_id) {
      return new Response(
        JSON.stringify({ error: 'email ou user_id é obrigatório' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar perfil se só tiver user_id
    let userEmail = email;
    let userName = name;
    
    if (!userEmail && user_id) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email, name')
        .eq('id', user_id)
        .single();
      
      if (profileError || !profile) {
        return new Response(
          JSON.stringify({ error: 'Usuário não encontrado' }),
          { status: 404, headers: corsHeaders }
        );
      }
      
      userEmail = profile.email;
      userName = profile.name || userName || 'Usuário';
    }

    if (!userEmail) {
      return new Response(
        JSON.stringify({ error: 'Email não encontrado' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Determinar URL do frontend
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const frontendUrl = Deno.env.get('FRONTEND_URL') || Deno.env.get('SITE_URL') || 'https://connect.inoovaweb.com.br';
    const loginUrl = frontendUrl.includes('http') 
      ? `${frontendUrl}/login`
      : `https://${frontendUrl}/login`;
    
    // Mapear nome do plano
    const planDisplay = plan === 'super_pro' ? 'SUPER PRO' : plan === 'pro' ? 'PRO' : plan?.toUpperCase() || 'PRO';
    
    // Formatar data de expiração
    let expiresAtFormatted = null;
    if (expires_at) {
      const date = new Date(expires_at);
      expiresAtFormatted = date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    }
    
    // Criar HTML do email (usando função inline para evitar problemas com arquivos externos)
    const emailHtml = createEmailHTML(userName, planDisplay, loginUrl, expiresAtFormatted);
    
    // Usar Resend API diretamente se tiver a API key
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey) {
      const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@connect.app';
      
      console.log('📧 Enviando email via Resend...');
      console.log('📧 De:', resendFromEmail);
      console.log('📧 Para:', userEmail);
      console.log('📧 Assunto: Assinatura Ativada - Connect');
      
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: resendFromEmail,
          to: userEmail,
          subject: '🎉 Assinatura Ativada - Connect',
          html: emailHtml,
        }),
      });
      
      if (resendResponse.ok) {
        const resendData = await resendResponse.json();
        console.log('✅ Email de confirmação enviado via Resend:', resendData.id);
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Email enviado com sucesso',
            email_id: resendData.id 
          }),
          { headers: corsHeaders }
        );
      } else {
        const errorText = await resendResponse.text();
        console.error('Erro ao enviar email via Resend:', errorText);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Resend API error: ${errorText}` 
          }),
          { status: 500, headers: corsHeaders }
        );
      }
    } else {
      // Se não tiver Resend, usar Supabase Auth para enviar magic link
      console.log('⚠️ RESEND_API_KEY não configurada. Tentando usar Supabase Auth...');
      
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: userEmail,
        options: {
          redirectTo: loginUrl,
        },
      });
      
      if (linkError) {
        console.error('Erro ao gerar link de autenticação:', linkError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Erro ao gerar link de login',
            details: linkError.message 
          }),
          { status: 500, headers: corsHeaders }
        );
      }
      
      console.log('✅ Link de login gerado:', linkData.properties.action_link);
      console.log('⚠️ Email customizado não enviado. Configure RESEND_API_KEY para enviar emails customizados.');
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Link de login gerado (email customizado não enviado - configure RESEND_API_KEY)',
          login_link: linkData.properties.action_link 
        }),
        { headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error('Erro ao enviar email de confirmação:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});

// Função auxiliar para criar HTML do email
function createEmailHTML(name: string, planDisplay: string, loginUrl: string, expiresAt: string | null): string {
  const expiresSection = expiresAt 
    ? `<p style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 14px;"><strong>Expira em:</strong> ${expiresAt}</p>`
    : '';
  
  return `<!DOCTYPE html>
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
              ${expiresSection}
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
</html>`;
}

