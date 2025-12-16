/**
 * Edge Function para processar mensagens do WhatsApp e executar fluxos de chatbot
 * 
 * Esta função:
 * 1. Recebe mensagens do WhatsApp API (via webhook ou polling)
 * 2. Verifica se há fluxo ativo para essa instância/mensagem
 * 3. Executa o fluxo correspondente
 * 4. Envia respostas automáticas
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const WHATSAPP_API_URL = Deno.env.get('WHATSAPP_API_URL') || 'https://weeb.inoovaweb.com.br';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface FlowNode {
  id: string;
  type: 'message' | 'condition' | 'wait' | 'action' | 'end' | 'image' | 'video' | 'audio';
  data: any;
  next?: string[];
}

interface FlowData {
  nodes: FlowNode[];
  edges: Array<{ id: string; from: string; to: string; sourceHandle?: string | null }>;
  startNode?: string;
}

serve(async (req) => {
  // Log inicial - SEMPRE executado (mesmo antes de qualquer processamento)
  const timestamp = new Date().toISOString();
  console.log('========================================');
  console.log(`=== WHATSAPP CHATBOT FUNÇÃO CHAMADA ===`);
  console.log(`Timestamp: ${timestamp}`);
  console.log(`Método: ${req.method}`);
  console.log(`URL: ${req.url}`);
  console.log('Headers recebidos:', JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2));
  console.log('========================================');

  if (req.method === 'OPTIONS') {
    console.log('Retornando OPTIONS (CORS preflight)');
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Log para POST requests
  if (req.method === 'POST') {
    console.log('✅ Requisição POST recebida - Processando...');
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    console.log('Supabase URL configurado:', !!supabaseUrl);
    console.log('Service Key configurado:', !!supabaseServiceKey);

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('Cliente Supabase criado');

    // Receber dados da mensagem do WhatsApp
    let body: any;
    try {
      const bodyText = await req.text();
      console.log('Body recebido (texto):', bodyText);
      body = bodyText ? JSON.parse(bodyText) : {};
      console.log('=== WEBHOOK RECEBIDO ===');
      console.log('Body completo:', JSON.stringify(body, null, 2));
    } catch (parseError) {
      console.error('Erro ao parsear JSON:', parseError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao parsear body JSON' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Extrair dados da mensagem (formato WuzAPI real)
    // WuzAPI envia: body.event.Info, body.instanceName, body.userID
    let instanceToken: string | null = null;
    let from: string | null = null;
    // IMPORTANTE: Inicializar como string vazia, não null, para evitar erros de "before initialization"
    let messageText: string = '';
    let messageType: string = 'text';
    let messageId: string | null = null;
    let instanceName: string | null = null;

    // Formato WuzAPI (formato real que o WuzAPI envia)
    if (body.body?.event || body.event) {
      const event = body.body?.event || body.event;
      const eventInfo = event?.Info || {};
      const eventMessage = event?.Message || {};
      
      // Extrair dados do formato WuzAPI
      // No formato do n8n, pode estar em body.body.instanceName ou body.instanceName
      instanceName = body.body?.instanceName || body.instanceName || null;
      const userID = body.body?.userID || body.userID || null;
      
      console.log('🔍 Dados do WuzAPI:', {
        instanceName,
        userID,
        hasEvent: !!event,
        hasInfo: !!eventInfo,
        hasMessage: !!eventMessage
      });
      
      // Extrair remetente
      from = eventInfo.Sender || eventInfo.Chat || null;
      
      // Extrair texto da mensagem (WuzAPI pode enviar em diferentes formatos)
      messageText = 
        eventMessage.extendedTextMessage?.text ||
        eventMessage.conversation ||
        eventMessage.imageMessage?.caption ||
        eventMessage.videoMessage?.caption ||
        eventMessage.documentMessage?.caption ||
        eventMessage.audioMessage?.caption ||
        eventMessage.stickerMessage?.caption ||
        '';
      
      // Tipo da mensagem
      messageType = eventInfo.Type || 'text';
      
      // ID da mensagem
      messageId = eventInfo.ID || null;
      
      console.log('📨 Formato WuzAPI detectado:', {
        instanceName,
        userID,
        from,
        messageText,
        messageType
      });
      
      // Buscar token pela instanceName ou userID
      if (instanceName) {
        const { data: connByName } = await supabase
          .from('connections')
          .select('api_instance_token')
          .eq('name', instanceName)
          .limit(1);
        
        if (connByName && connByName.length > 0) {
          instanceToken = connByName[0].api_instance_token;
          console.log('✅ Token encontrado pelo nome da instância:', instanceName);
        }
      }
      
      // Se não encontrou pelo nome, tentar pelo userID (api_instance_id)
      if (!instanceToken && userID) {
        const { data: connByID } = await supabase
          .from('connections')
          .select('api_instance_token')
          .eq('api_instance_id', userID)
          .limit(1);
        
        if (connByID && connByID.length > 0) {
          instanceToken = connByID[0].api_instance_token;
          console.log('✅ Token encontrado pelo userID:', userID);
        }
      }
    } else {
      // Formato antigo (para compatibilidade)
      instanceToken = 
        body.token || 
        body.instance_token || 
        body.instanceToken || 
        body.data?.token ||
        body.data?.instance_token ||
        req.headers.get('x-instance-token') ||
        req.headers.get('token');
      
      from = 
        body.from || 
        body.Phone || 
        body.phone || 
        body.data?.from ||
        body.data?.Phone ||
        body.data?.phone ||
        body.key?.remoteJid?.replace('@s.whatsapp.net', '') + '@s.whatsapp.net';
      
      messageText = 
        body.body || 
        body.message || 
        body.text || 
        body.messageText ||
        body.data?.body ||
        body.data?.message ||
        body.data?.text ||
        body.message?.conversation ||
        body.message?.extendedTextMessage?.text;
      
      messageType = body.type || body.data?.type || 'text';
      messageId = body.id || body.messageId || body.data?.id;
    }

    console.log('Dados extraídos:', { instanceToken, from, messageText, messageType, messageId, instanceName });

    // Se não encontrou token, tentar buscar pelo instanceName ou userID
    if (!instanceToken) {
      console.log('⚠️ Token não encontrado diretamente. Buscando pelo instanceName ou userID...');
      
      // Tentar buscar pelo instanceName (nome da conexão)
      if (instanceName) {
        const { data: connByName } = await supabase
          .from('connections')
          .select('api_instance_token, api_instance_id')
          .eq('name', instanceName)
          .limit(1);
        
        if (connByName && connByName.length > 0) {
          instanceToken = connByName[0].api_instance_token;
          console.log('✅ Token encontrado pelo nome da instância:', instanceName);
        } else {
          console.log('❌ Nenhuma conexão encontrada com o nome:', instanceName);
        }
      }
      
      // Se ainda não encontrou, tentar pelo userID (api_instance_id)
      if (!instanceToken && body.body?.userID) {
        const userID = body.body.userID;
        const { data: connByID } = await supabase
          .from('connections')
          .select('api_instance_token')
          .eq('api_instance_id', userID)
          .limit(1);
        
        if (connByID && connByID.length > 0) {
          instanceToken = connByID[0].api_instance_token;
          console.log('✅ Token encontrado pelo userID:', userID);
        }
      }
    }

    if (!instanceToken) {
      console.error('❌ Token não encontrado! Verifique:');
      console.error('- instanceName:', instanceName);
      console.error('- userID:', body.body?.userID || body.userID);
      console.error('- Body completo:', JSON.stringify(body, null, 2));
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Token da instância não encontrado',
          debug: {
            instanceName,
            userID: body.body?.userID || body.userID,
            body_keys: Object.keys(body)
          }
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (!from || !messageText) {
      console.error('❌ Dados incompletos:', { from, messageText });
      console.error('Body completo para debug:', JSON.stringify(body, null, 2));
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Dados incompletos: from ou messageText faltando',
          debug: { from, messageText, body_structure: Object.keys(body) }
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Limpar número do telefone
    // Formato WuzAPI pode ser: "5511984388245:49@s.whatsapp.net" ou "5511984388245@s.whatsapp.net"
    let cleanPhone = from;
    
    // Remover sufixos do WhatsApp
    cleanPhone = cleanPhone.replace('@s.whatsapp.net', '').replace('@g.us', '');
    
    // Remover parte após ":" (device ID do WuzAPI)
    if (cleanPhone.includes(':')) {
      cleanPhone = cleanPhone.split(':')[0];
    }
    
    // Remover tudo que não é dígito
    cleanPhone = cleanPhone.replace(/\D/g, '');
    
    console.log('📞 Telefone original:', from);
    console.log('📞 Telefone limpo:', cleanPhone);

    // Buscar conexão pela api_instance_token (a tabela connections usa api_instance_token, não token)
    console.log('🔍 Buscando conexão com token:', instanceToken);
    const { data: connections, error: connError } = await supabase
      .from('connections')
      .select('id, user_id, api_instance_token, status')
      .eq('api_instance_token', instanceToken);
    
    console.log('Resultado da busca:', { 
      encontradas: connections?.length || 0, 
      erro: connError?.message 
    });
    
    const connection = connections && connections.length > 0 ? connections[0] : null;

    if (connError || !connection) {
      console.error('❌ Conexão não encontrada!');
      console.error('Token usado na busca:', instanceToken);
      console.error('Erro do Supabase:', JSON.stringify(connError, null, 2));
      console.error('Tentando buscar todas as conexões para debug...');
      
      // Debug: listar algumas conexões (apenas para debug)
      const { data: allConnections } = await supabase
        .from('connections')
        .select('id, name, api_instance_token, status')
        .limit(5);
      console.log('Primeiras 5 conexões no banco:', JSON.stringify(allConnections, null, 2));
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Conexão não encontrada',
          debug: {
            token_procurado: instanceToken,
            erro: connError?.message || 'Conexão não encontrada'
          }
        }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('✅ Conexão encontrada:', {
      id: connection.id,
      status: connection.status
    });

    if (connection.status !== 'online') {
      console.log('Conexão não está online, ignorando mensagem');
      return new Response(
        JSON.stringify({ success: true, message: 'Conexão offline, mensagem ignorada' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Verificar se há conversa ativa para este contato
    const { data: activeConversation, error: convError } = await supabase
      .from('chatbot_conversations')
      .select('*, chatbot_flows(*)')
      .eq('connection_id', connection.id)
      .eq('contact_phone', cleanPhone)
      .eq('status', 'active')
      .maybeSingle(); // Usar maybeSingle para não dar erro se não encontrar

    if (convError) {
      console.error('Erro ao buscar conversa:', convError);
    }

    let conversation = activeConversation;
    let flow = activeConversation?.chatbot_flows;
    
    // Se encontrou conversa, verificar se está em um nó wait ou condition e processar
    if (conversation && conversation.current_node_id) {
      const flowData = (flow?.flow_data as FlowData) || { nodes: [], edges: [] };
      const currentNode = flowData.nodes.find(n => n.id === conversation.current_node_id);
      
      // Se está em um nó wait e recebeu uma nova mensagem, avançar para o próximo nó
      if (currentNode?.type === 'wait') {
        console.log('📨 Nova mensagem recebida durante wait. Avançando para próximo nó...');
        
        // Encontrar próximo nó após o wait
        const nextEdge = flowData.edges.find(e => e.from === conversation.current_node_id);
        if (nextEdge) {
          console.log(`   Avançando de wait (${conversation.current_node_id}) para: ${nextEdge.to}`);
          // Atualizar conversa para o próximo nó antes de processar
          await supabase
            .from('chatbot_conversations')
            .update({ current_node_id: nextEdge.to })
            .eq('id', conversation.id);
          conversation.current_node_id = nextEdge.to;
        } else {
          console.warn('   ⚠️ Nenhum próximo nó encontrado após wait');
        }
      }
      
      // Se está em um nó condition, avaliar a condição com a nova mensagem recebida
      if (currentNode?.type === 'condition') {
        console.log('🔀 ===== NOVA MENSAGEM RECEBIDA DURANTE CONDIÇÃO =====');
        console.log(`   Nó de condição: ${conversation.current_node_id}`);
        console.log(`   Mensagem recebida: "${messageText}"`);
        
        // Atualizar variáveis com a nova mensagem ANTES de avaliar
        const updatedVariables = { ...conversation.variables };
        updatedVariables.user_message = messageText;
        updatedVariables.last_message_at = new Date().toISOString();
        
        console.log(`   Variáveis atualizadas:`, JSON.stringify(updatedVariables, null, 2));
        
        // Avaliar condição com a nova mensagem
        const condition = currentNode.data;
        const conditionResult = evaluateCondition(condition, updatedVariables, messageText);
        
        console.log(`   Resultado da condição: ${conditionResult ? '✅ VERDADEIRO' : '❌ FALSO'}`);
        
        // Encontrar próximo nó baseado no resultado
        const targetHandle = conditionResult ? 'true' : 'false';
        console.log(`   Procurando edge com sourceHandle="${targetHandle}"...`);
        
        const pathEdge = flowData.edges.find(e => 
          e.from === conversation.current_node_id && 
          e.sourceHandle === targetHandle
        );
        
        if (pathEdge) {
          console.log(`   ✅ Edge encontrado com sourceHandle="${targetHandle}": ${pathEdge.to}`);
          // Atualizar conversa para o próximo nó antes de processar
          await supabase
            .from('chatbot_conversations')
            .update({ 
              current_node_id: pathEdge.to,
              variables: updatedVariables
            })
            .eq('id', conversation.id);
          conversation.current_node_id = pathEdge.to;
          conversation.variables = updatedVariables;
        } else {
          // Fallback: tentar por ordem
          console.log(`   ⚠️ Edge com sourceHandle não encontrado. Tentando fallback...`);
          const nodeEdges = flowData.edges.filter(e => e.from === conversation.current_node_id).sort((a, b) => a.id.localeCompare(b.id));
          console.log(`   Edges disponíveis:`, nodeEdges.map(e => ({ id: e.id, to: e.to, sourceHandle: e.sourceHandle })));
          
          if (nodeEdges.length >= 2) {
            const trueEdge = nodeEdges.find(e => e.sourceHandle === 'true') || nodeEdges[0];
            const falseEdge = nodeEdges.find(e => e.sourceHandle === 'false') || nodeEdges[1];
            const nextNode = conditionResult ? trueEdge.to : falseEdge.to;
            console.log(`   ✅ Usando fallback: caminho ${conditionResult ? 'verdadeiro' : 'falso'} -> ${nextNode}`);
            await supabase
              .from('chatbot_conversations')
              .update({ 
                current_node_id: nextNode,
                variables: updatedVariables
              })
              .eq('id', conversation.id);
            conversation.current_node_id = nextNode;
            conversation.variables = updatedVariables;
          } else if (nodeEdges.length === 1) {
            console.log(`   ⚠️ Apenas um edge encontrado, usando: ${nodeEdges[0].to}`);
            await supabase
              .from('chatbot_conversations')
              .update({ 
                current_node_id: nodeEdges[0].to,
                variables: updatedVariables
              })
              .eq('id', conversation.id);
            conversation.current_node_id = nodeEdges[0].to;
            conversation.variables = updatedVariables;
          } else {
            console.error('   ❌ Nenhum edge encontrado após condição!');
          }
        }
        
        console.log(`🔀 ===== FIM DO PROCESSAMENTO DA CONDIÇÃO =====`);
      }
    }

    // Se não tem conversa ativa, verificar se deve iniciar um fluxo
    if (!conversation) {
      console.log('📋 Nenhuma conversa ativa encontrada. Verificando fluxos...');
      // Verificar triggers de fluxos
      const { data: flows, error: flowsError } = await supabase
        .from('chatbot_flows')
        .select('*')
        .eq('user_id', connection.user_id)
        .eq('is_active', true)
        .eq('connection_id', connection.id);
      
      console.log(`🔍 Fluxos encontrados: ${flows?.length || 0}`);
      if (flowsError) {
        console.error('Erro ao buscar fluxos:', flowsError);
      }
      if (flows && flows.length > 0) {
        console.log('Fluxos ativos:', flows.map(f => ({ id: f.id, name: f.name, trigger: f.trigger_type })));
      }

      if (flows && flows.length > 0) {
        // Verificar qual fluxo deve ser ativado
        for (const candidateFlow of flows) {
          let shouldActivate = false;

          switch (candidateFlow.trigger_type) {
            case 'first_message':
              // Verificar se é primeira mensagem deste contato
              const { count } = await supabase
                .from('chatbot_messages')
                .select('*', { count: 'exact', head: true })
                .eq('connection_id', connection.id)
                .eq('contact_phone', cleanPhone);
              
              if ((count || 0) === 0) {
                shouldActivate = true;
              }
              break;

            case 'keyword':
              // Verificar se mensagem contém palavras-chave
              if (candidateFlow.trigger_keywords && candidateFlow.trigger_keywords.length > 0) {
                const lowerMessage = messageText.toLowerCase();
                shouldActivate = candidateFlow.trigger_keywords.some(keyword => 
                  lowerMessage.includes(keyword.toLowerCase())
                );
              }
              break;

            case 'campaign_response':
              // Verificar se é resposta a uma campanha específica
              // (implementar lógica para verificar se mensagem é resposta a campanha)
              // Por enquanto, vamos ativar se tiver trigger_campaign_id
              if (candidateFlow.trigger_campaign_id) {
                shouldActivate = true; // Simplificado - pode melhorar verificando histórico
              }
              break;

            case 'manual':
              // Não ativa automaticamente
              shouldActivate = false;
              break;
          }

          if (shouldActivate) {
            flow = candidateFlow;
            break;
          }
        }
      }

      // Se encontrou fluxo para ativar, criar conversa
      if (flow) {
        const { data: newConversation, error: convError } = await supabase
          .from('chatbot_conversations')
          .insert({
            flow_id: flow.id,
            connection_id: connection.id,
            user_id: connection.user_id,
            contact_phone: cleanPhone,
            current_node_id: (() => {
              const flowData = flow.flow_data as FlowData;
              // Se tiver startNode definido, usar
              if (flowData.startNode) return flowData.startNode;
              // Caso contrário, procurar primeiro nó de mensagem ou mídia
              const firstMessageNode = flowData.nodes.find(n => 
                n.type === 'message' || n.type === 'image' || n.type === 'video' || n.type === 'audio'
              );
              return firstMessageNode?.id || flowData.nodes[0]?.id || null;
            })(),
            status: 'active',
            variables: {},
          })
          .select()
          .single();

        if (convError) {
          console.error('Erro ao criar conversa:', convError);
        } else {
          conversation = newConversation;
        }
      }
    }

    // Se não tem conversa ativa, não processar
    if (!conversation || !flow) {
      console.log('Nenhum fluxo ativo para esta mensagem');
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhum fluxo ativo' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Salvar mensagem recebida
    const { error: saveMsgError } = await supabase
      .from('chatbot_messages')
      .insert({
        conversation_id: conversation.id,
        connection_id: connection.id,
        direction: 'inbound',
        message_text: messageText,
        message_type: messageType,
      });
    
    if (saveMsgError) {
      console.error('Erro ao salvar mensagem recebida:', saveMsgError);
    }

    // Atualizar variável user_message
    // Garantir que messageText sempre tenha um valor (já inicializada como string vazia)
    const variables = conversation.variables || {};
    variables.user_message = messageText || '';
    variables.last_message_at = new Date().toISOString();
    
    console.log(`📝 Variáveis atualizadas: user_message = "${variables.user_message}"`);
    
    // VERIFICAR PALAVRA-CHAVE DE SAÍDA (finalizar fluxo antes do final)
    const flowSettings = flow.settings || {};
    const exitKeyword = flowSettings.exit_keyword;
    
    if (exitKeyword && exitKeyword.trim()) {
      const lowerMessage = messageText.toLowerCase().trim();
      const lowerKeyword = exitKeyword.toLowerCase().trim();
      
      console.log(`🔍 Verificando palavra-chave de saída: "${lowerKeyword}"`);
      console.log(`   Mensagem recebida: "${lowerMessage}"`);
      
      // Verificar se a mensagem contém a palavra-chave (case-insensitive)
      if (lowerMessage.includes(lowerKeyword)) {
        console.log(`🚪 Palavra-chave de saída detectada! Finalizando fluxo imediatamente...`);
        
        // Finalizar conversa
        await supabase
          .from('chatbot_conversations')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            current_node_id: null,
            variables: variables,
          })
          .eq('id', conversation.id);
        
        // Enviar mensagem de confirmação (opcional)
        const tokenToUse = connection.api_instance_token || instanceToken;
        let phoneToSend = cleanPhone;
        if (!phoneToSend.includes('@')) {
          phoneToSend = `${phoneToSend}@s.whatsapp.net`;
        }
        
        try {
          await fetch(`${WHATSAPP_API_URL}/chat/send/text`, {
            method: 'POST',
            headers: {
              'token': tokenToUse,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              Phone: phoneToSend,
              Body: 'Fluxo finalizado. Obrigado!',
            }),
          });
        } catch (error) {
          console.error('Erro ao enviar mensagem de finalização:', error);
        }
        
        console.log(`✅ Fluxo finalizado por palavra-chave de saída.`);
        return new Response(
          JSON.stringify({ success: true, message: 'Fluxo finalizado por palavra-chave de saída' }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      } else {
        console.log(`   Palavra-chave de saída não encontrada. Continuando fluxo...`);
      }
    }
    
    // VERIFICAR PALAVRA-CHAVE DE TRANSFERÊNCIA PARA HUMANO
    const transferKeyword = flowSettings.transfer_keyword;
    
    if (transferKeyword && transferKeyword.trim()) {
      const lowerMessage = messageText.toLowerCase().trim();
      const lowerKeyword = transferKeyword.toLowerCase().trim();
      
      console.log(`🔍 Verificando palavra-chave de transferência: "${lowerKeyword}"`);
      console.log(`   Mensagem recebida: "${lowerMessage}"`);
      
      // Verificar se a mensagem contém a palavra-chave (case-insensitive)
      if (lowerMessage.includes(lowerKeyword)) {
        console.log(`👤 Palavra-chave de transferência detectada! Transferindo para atendente humano...`);
        
        // Enviar mensagem para o lead
        const tokenToUse = connection.api_instance_token || instanceToken;
        let phoneToSend = cleanPhone;
        if (!phoneToSend.includes('@')) {
          phoneToSend = `${phoneToSend}@s.whatsapp.net`;
        }
        
        const transferMessage = "Entendido! Vou transferir você para um atendente humano. Aguarde um momento...";
        
        try {
          await fetch(`${WHATSAPP_API_URL}/chat/send/text`, {
            method: 'POST',
            headers: {
              'token': tokenToUse,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              Phone: phoneToSend,
              Body: transferMessage,
            }),
          });
        } catch (error) {
          console.error('Erro ao enviar mensagem de transferência:', error);
        }
        
        // Criar notificação para o usuário
        try {
          await supabase
            .from('notifications')
            .insert({
              user_id: connection.user_id,
              type: 'info',
              title: 'Lead solicitou atendimento humano',
              message: `Um lead (${cleanPhone}) solicitou falar com atendente humano no fluxo "${flow.name}".`,
              reference_type: 'chatbot_conversation',
              reference_id: conversation.id,
            });
          
          console.log('✅ Notificação criada para o usuário');
        } catch (error) {
          console.error('Erro ao criar notificação:', error);
        }
        
        // Enviar push notification
        try {
          const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              userId: connection.user_id,
              title: 'Lead solicitou atendimento humano',
              body: `Um lead (${cleanPhone}) quer falar com você no fluxo "${flow.name}".`,
              data: {
                type: 'chatbot_transfer',
                conversationId: conversation.id,
                contactPhone: cleanPhone,
                flowName: flow.name,
              },
            }),
          });
          
          if (pushResponse.ok) {
            console.log('✅ Push notification enviada');
          }
        } catch (error) {
          console.error('Erro ao enviar push notification:', error);
        }
        
        // Marcar conversa como transferida
        await supabase
          .from('chatbot_conversations')
          .update({
            status: 'transferred',
            current_node_id: null,
            variables: variables,
          })
          .eq('id', conversation.id);
        
        console.log(`✅ Conversa transferida para atendente humano.`);
        return new Response(
          JSON.stringify({ success: true, message: 'Lead transferido para atendente humano' }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      } else {
        console.log(`   Palavra-chave de transferência não encontrada. Continuando fluxo...`);
      }
    }

    // Executar fluxo
    const flowData = flow.flow_data as FlowData;
    
    // IMPORTANTE: Se conversation.current_node_id existe, usar ele (não resetar para início!)
    // Só usar startNode se for uma conversa nova (current_node_id é null)
    let currentNodeId = conversation.current_node_id;
    
    console.log(`📍 Estado da conversa:`);
    console.log(`   conversation.current_node_id: ${conversation.current_node_id}`);
    console.log(`   flowData.startNode: ${flowData.startNode}`);
    
    // Se não tem current_node_id (conversa nova), usar startNode
    if (!currentNodeId) {
      console.log('   ⚠️ current_node_id é null. Usando startNode para iniciar fluxo.');
      currentNodeId = flowData.startNode;
      
      // Se não tiver startNode, procurar primeiro nó de mensagem ou mídia
      if (!currentNodeId) {
        const firstMessageNode = flowData.nodes.find(n => 
          n.type === 'message' || n.type === 'image' || n.type === 'video' || n.type === 'audio'
        );
        currentNodeId = firstMessageNode?.id || flowData.nodes[0]?.id || null;
      }
    } else {
      console.log(`   ✅ Continuando do nó atual: ${currentNodeId}`);
    }
    
    if (!currentNodeId) {
      console.error('❌ Nó inicial não encontrado no fluxo');
      return new Response(
        JSON.stringify({ success: false, error: 'Fluxo sem nó inicial' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    
    console.log(`🚀 Iniciando execução do fluxo a partir do nó: ${currentNodeId}`);

    // Função auxiliar para encontrar próximo nó usando edges
    const getNextNodeId = (nodeId: string, conditionResult?: boolean): string | null => {
      const currentNode = flowData.nodes.find(n => n.id === nodeId);
      const edges = flowData.edges || [];
      
      console.log(`🔍 Buscando próximo nó para: ${nodeId} (tipo: ${currentNode?.type})`);
      
      // Para condições, SEMPRE usar edges (não usar next do nó)
      if (currentNode?.type === 'condition' && conditionResult !== undefined) {
        console.log(`   🔀 ===== BUSCANDO PRÓXIMO NÓ APÓS CONDIÇÃO =====`);
        console.log(`   Resultado da condição: ${conditionResult ? '✅ VERDADEIRO' : '❌ FALSO'}`);
        console.log(`   Nó atual: ${nodeId}`);
        
        // Buscar TODOS os edges deste nó primeiro
        const allNodeEdges = edges.filter(e => e.from === nodeId);
        console.log(`   📊 Total de edges encontrados: ${allNodeEdges.length}`);
        console.log(`   📋 Edges detalhados:`, JSON.stringify(allNodeEdges.map(e => ({ 
          id: e.id, 
          from: e.from, 
          to: e.to, 
          sourceHandle: e.sourceHandle 
        })), null, 2));
        
        // Buscar edge com sourceHandle correto (true ou false)
        const targetHandle = conditionResult ? 'true' : 'false';
        console.log(`   🔍 Procurando edge com sourceHandle="${targetHandle}"...`);
        
        const pathEdge = allNodeEdges.find(e => e.sourceHandle === targetHandle);
        
        if (pathEdge) {
          console.log(`   ✅ Edge encontrado com sourceHandle="${targetHandle}": ${pathEdge.to}`);
          return pathEdge.to;
        }
        
        console.log(`   ⚠️ Edge com sourceHandle="${targetHandle}" não encontrado. Tentando fallback...`);
        
        // Fallback: se não encontrou por sourceHandle, tentar por ordem
        // IMPORTANTE: Ordenar edges por ID para garantir ordem consistente
        const sortedEdges = allNodeEdges.sort((a, b) => a.id.localeCompare(b.id));
        console.log(`   📋 Edges ordenados:`, sortedEdges.map(e => ({ id: e.id, to: e.to, sourceHandle: e.sourceHandle })));
        
        if (sortedEdges.length >= 2) {
          // Primeiro edge = true, segundo edge = false
          // Mas vamos verificar se algum tem sourceHandle definido
          const trueEdge = sortedEdges.find(e => e.sourceHandle === 'true') || sortedEdges[0];
          const falseEdge = sortedEdges.find(e => e.sourceHandle === 'false') || sortedEdges[1];
          
          const nextNode = conditionResult ? trueEdge.to : falseEdge.to;
          console.log(`   ✅ Usando fallback (ordem): caminho ${conditionResult ? 'verdadeiro' : 'falso'} -> ${nextNode}`);
          console.log(`   🔀 ===== FIM DA BUSCA =====`);
          return nextNode;
        } else if (sortedEdges.length === 1) {
          console.log(`   ⚠️ Apenas um edge encontrado, usando: ${sortedEdges[0].to}`);
          console.log(`   🔀 ===== FIM DA BUSCA =====`);
          return sortedEdges[0].to;
        }
        
        console.error('   ❌ Nenhum edge encontrado para condição!');
        console.log(`   🔀 ===== FIM DA BUSCA (ERRO) =====`);
        return null;
      }
      
      // Para outros nós, usar edges primeiro, depois next como fallback
      const nextEdge = edges.find(e => e.from === nodeId);
      if (nextEdge) {
        console.log(`   ✅ Edge encontrado: ${nextEdge.to}`);
        return nextEdge.to;
      }
      
      // Fallback: usar next do nó (compatibilidade)
      if (currentNode?.next && currentNode.next.length > 0) {
        console.log(`   ⚠️ Usando next do nó (fallback): ${currentNode.next[0]}`);
        return currentNode.next[0];
      }
      
      console.warn(`   ❌ Nenhum próximo nó encontrado para ${nodeId}`);
      return null;
    };

    // Função auxiliar para formatar número
    const formatPhone = (): string => {
      let phoneToSend = cleanPhone;
      if (!phoneToSend.includes('@')) {
        phoneToSend = `${phoneToSend}@s.whatsapp.net`;
      }
      if (phoneToSend.includes(':')) {
        const [numberPart] = phoneToSend.split(':');
        phoneToSend = numberPart.includes('@') ? numberPart : `${numberPart}@s.whatsapp.net`;
      }
      return phoneToSend;
    };

    // Função para enviar mensagem de texto
    const sendMessage = async (text: string): Promise<boolean> => {
      const tokenToUse = connection.api_instance_token || instanceToken;
      const phoneToSend = formatPhone();
      
      try {
        const sendResponse = await fetch(`${WHATSAPP_API_URL}/chat/send/text`, {
          method: 'POST',
          headers: {
            'token': tokenToUse,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            Phone: phoneToSend,
            Body: text,
          }),
        });

        const sendResult = await sendResponse.json();
        
        if (sendResponse.ok && sendResult.code === 200 && sendResult.data?.Details === 'Sent') {
          await supabase
            .from('chatbot_messages')
            .insert({
              conversation_id: conversation.id,
              connection_id: connection.id,
              direction: 'outbound',
              message_text: text,
              message_type: 'text',
            });
          return true;
        }
        return false;
      } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        return false;
      }
    };

    // Função para enviar imagem
    const sendImage = async (imageUrl: string, caption?: string): Promise<boolean> => {
      const tokenToUse = connection.api_instance_token || instanceToken;
      const phoneToSend = formatPhone();
      
      try {
        // Se for URL, converter para base64 (simplificado - em produção, fazer fetch)
        let imageData = imageUrl;
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
          // Em produção, fazer fetch da URL e converter para base64
          console.warn('URL de imagem não suportada diretamente. Use base64.');
          return false;
        }
        
        // Garantir formato data:image
        if (!imageData.startsWith('data:')) {
          imageData = `data:image/jpeg;base64,${imageData}`;
        }

        const payload: any = {
          Phone: phoneToSend,
          Image: imageData,
        };
        if (caption) payload.Caption = caption;

        const sendResponse = await fetch(`${WHATSAPP_API_URL}/chat/send/image`, {
          method: 'POST',
          headers: {
            'token': tokenToUse,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const sendResult = await sendResponse.json();
        
        if (sendResponse.ok && sendResult.code === 200 && sendResult.data?.Details === 'Sent') {
          await supabase
            .from('chatbot_messages')
            .insert({
              conversation_id: conversation.id,
              connection_id: connection.id,
              direction: 'outbound',
              message_text: caption || '[Imagem]',
              message_type: 'image',
            });
          return true;
        }
        return false;
      } catch (error) {
        console.error('Erro ao enviar imagem:', error);
        return false;
      }
    };

    // Função para enviar vídeo
    const sendVideo = async (videoUrl: string, caption?: string): Promise<boolean> => {
      const tokenToUse = connection.api_instance_token || instanceToken;
      const phoneToSend = formatPhone();
      
      try {
        let videoData = videoUrl;
        if (videoUrl.startsWith('http://') || videoUrl.startsWith('https://')) {
          console.warn('URL de vídeo não suportada diretamente. Use base64.');
          return false;
        }
        
        if (!videoData.startsWith('data:')) {
          videoData = `data:video/mp4;base64,${videoData}`;
        }

        const payload: any = {
          Phone: phoneToSend,
          Video: videoData,
        };
        if (caption) payload.Caption = caption;

        const sendResponse = await fetch(`${WHATSAPP_API_URL}/chat/send/video`, {
          method: 'POST',
          headers: {
            'token': tokenToUse,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const sendResult = await sendResponse.json();
        
        if (sendResponse.ok && sendResult.code === 200 && sendResult.data?.Details === 'Sent') {
          await supabase
            .from('chatbot_messages')
            .insert({
              conversation_id: conversation.id,
              connection_id: connection.id,
              direction: 'outbound',
              message_text: caption || '[Vídeo]',
              message_type: 'video',
            });
          return true;
        }
        return false;
      } catch (error) {
        console.error('Erro ao enviar vídeo:', error);
        return false;
      }
    };

    // Função para enviar áudio
    const sendAudio = async (audioUrl: string): Promise<boolean> => {
      const tokenToUse = connection.api_instance_token || instanceToken;
      const phoneToSend = formatPhone();
      
      try {
        let audioData = audioUrl;
        if (audioUrl.startsWith('http://') || audioUrl.startsWith('https://')) {
          console.warn('URL de áudio não suportada diretamente. Use base64.');
          return false;
        }
        
        if (!audioData.startsWith('data:')) {
          audioData = `data:audio/mp3;base64,${audioData}`;
        }

        const payload = {
          Phone: phoneToSend,
          Audio: audioData,
        };

        const sendResponse = await fetch(`${WHATSAPP_API_URL}/chat/send/audio`, {
          method: 'POST',
          headers: {
            'token': tokenToUse,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const sendResult = await sendResponse.json();
        
        if (sendResponse.ok && sendResult.code === 200 && sendResult.data?.Details === 'Sent') {
          await supabase
            .from('chatbot_messages')
            .insert({
              conversation_id: conversation.id,
              connection_id: connection.id,
              direction: 'outbound',
              message_text: '[Áudio]',
              message_type: 'audio',
            });
          return true;
        }
        return false;
      } catch (error) {
        console.error('Erro ao enviar áudio:', error);
        return false;
      }
    };

    // Executar fluxo em loop até encontrar wait ou end
    let shouldContinue = true;
    let finalNodeId: string | null = currentNodeId;
    
    while (shouldContinue && currentNodeId) {
      const currentNode = flowData.nodes.find(n => n.id === currentNodeId);
      if (!currentNode) {
        console.error('Nó não encontrado:', currentNodeId);
        break;
      }

      console.log(`Executando nó [${currentNode.type}] ID: ${currentNodeId}`);

      switch (currentNode.type) {
        case 'message':
          // Enviar mensagem e continuar automaticamente
          // IMPORTANTE: Usar nome diferente para não sombrear messageText do escopo superior
          const messageContent = replaceVariables(currentNode.data.text || '', variables);
          if (messageContent) {
            await sendMessage(messageContent);
            // Pequeno delay entre mensagens
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          finalNodeId = getNextNodeId(currentNodeId);
          currentNodeId = finalNodeId;
          break;

        case 'condition':
          // IMPORTANTE: Nó de condição deve PARAR e aguardar resposta do usuário
          // A condição será avaliada quando uma nova mensagem chegar (já processada acima)
          console.log(`⏸️ Nó de condição encontrado. Aguardando resposta do usuário...`);
          console.log(`   Nó ID: ${currentNodeId}`);
          console.log(`   Variável: "${currentNode.data.variable || 'user_message'}"`);
          console.log(`   Operador: "${currentNode.data.operator || 'equals'}"`);
          console.log(`   Valor esperado: "${currentNode.data.value || ''}"`);
          
          // Salvar estado: manter no nó de condição para aguardar resposta
          await supabase
            .from('chatbot_conversations')
            .update({
              current_node_id: currentNodeId, // Manter no nó de condição
              variables: variables,
              last_interaction_at: new Date().toISOString(),
            })
            .eq('id', conversation.id);
          
          console.log(`   ✅ Estado salvo. Aguardando próxima mensagem do usuário para avaliar condição.`);
          
          // PARAR a execução - aguardar nova mensagem
          shouldContinue = false;
          finalNodeId = currentNodeId; // Manter no nó de condição
          break;

        case 'wait':
          // Aguardar o tempo configurado e continuar automaticamente
          const timeoutSeconds = currentNode.data.timeout || 300; // Default 5 minutos
          console.log(`⏳ Nó de espera encontrado. Aguardando ${timeoutSeconds} segundos...`);
          
          // Encontrar próximo nó ANTES de aguardar
          const nextNodeAfterWait = getNextNodeId(currentNodeId);
          console.log(`   Próximo nó após wait será: ${nextNodeAfterWait || 'NENHUM (erro!)'}`);
          
          // IMPORTANTE: Salvar estado antes de aguardar (para que se nova mensagem chegar, saiba onde está)
          if (nextNodeAfterWait) {
            console.log(`💾 Salvando estado: aguardando timeout, próximo nó será: ${nextNodeAfterWait}`);
            await supabase
              .from('chatbot_conversations')
              .update({
                current_node_id: currentNodeId, // Manter no wait enquanto aguarda
                variables: variables,
                last_interaction_at: new Date().toISOString(),
              })
              .eq('id', conversation.id);
          } else {
            console.error('❌ ERRO: Nenhum próximo nó encontrado após wait! O fluxo pode parar aqui.');
          }
          
          // Aguardar o timeout
          await new Promise(resolve => setTimeout(resolve, timeoutSeconds * 1000));
          
          console.log(`✅ Timeout de ${timeoutSeconds} segundos concluído. Continuando fluxo...`);
          
          // Continuar para o próximo nó após o timeout
          if (nextNodeAfterWait) {
            finalNodeId = nextNodeAfterWait;
            currentNodeId = finalNodeId;
            console.log(`   ✅ Avançando para próximo nó: ${finalNodeId}`);
            
            // IMPORTANTE: Salvar imediatamente após o wait terminar
            // Isso garante que se uma nova mensagem chegar, o estado estará correto
            console.log(`💾 Salvando estado imediatamente após wait terminar...`);
            const { error: saveAfterWaitError } = await supabase
              .from('chatbot_conversations')
              .update({
                current_node_id: finalNodeId,
                variables: variables,
                last_interaction_at: new Date().toISOString(),
              })
              .eq('id', conversation.id);
            
            if (saveAfterWaitError) {
              console.error('   ❌ Erro ao salvar após wait:', saveAfterWaitError);
            } else {
              console.log(`   ✅ Estado salvo: current_node_id = ${finalNodeId}`);
              // Atualizar o objeto conversation local também
              conversation.current_node_id = finalNodeId;
            }
          } else {
            console.error('   ❌ ERRO: Não há próximo nó! O fluxo vai parar.');
            finalNodeId = null;
            currentNodeId = null;
            shouldContinue = false;
          }
          break;

        case 'action':
          // Executar ação e continuar
          await executeAction(currentNode.data, variables, connection, cleanPhone, supabase);
          finalNodeId = getNextNodeId(currentNodeId);
          currentNodeId = finalNodeId;
          break;

        case 'image':
          // Enviar imagem e continuar automaticamente
          const imageUrl = replaceVariables(currentNode.data.imageUrl || '', variables);
          const imageCaption = currentNode.data.caption ? replaceVariables(currentNode.data.caption, variables) : undefined;
          if (imageUrl) {
            await sendImage(imageUrl, imageCaption);
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          finalNodeId = getNextNodeId(currentNodeId);
          currentNodeId = finalNodeId;
          break;

        case 'video':
          // Enviar vídeo e continuar automaticamente
          const videoUrl = replaceVariables(currentNode.data.videoUrl || '', variables);
          const videoCaption = currentNode.data.caption ? replaceVariables(currentNode.data.caption, variables) : undefined;
          if (videoUrl) {
            await sendVideo(videoUrl, videoCaption);
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          finalNodeId = getNextNodeId(currentNodeId);
          currentNodeId = finalNodeId;
          break;

        case 'audio':
          // Enviar áudio e continuar automaticamente
          const audioUrl = replaceVariables(currentNode.data.audioUrl || '', variables);
          if (audioUrl) {
            await sendAudio(audioUrl);
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          finalNodeId = getNextNodeId(currentNodeId);
          currentNodeId = finalNodeId;
          break;

        case 'transfer':
          // Transferir para atendente humano
          console.log(`👤 Nó de transferência encontrado. Transferindo para atendente humano...`);
          
          const transferMessage = replaceVariables(
            currentNode.data.message || "Entendido! Vou transferir você para um atendente humano. Aguarde um momento...",
            variables
          );
          
          // Enviar mensagem para o lead
          await sendMessage(transferMessage);
          
          // Criar notificação para o usuário
          try {
            const { error: notifError } = await supabase
              .from('notifications')
              .insert({
                user_id: connection.user_id,
                type: 'info',
                title: 'Lead solicitou atendimento humano',
                message: `Um lead (${cleanPhone}) solicitou falar com atendente humano no fluxo "${flow.name}".`,
                reference_type: 'chatbot_conversation',
                reference_id: conversation.id,
              });
            
            if (notifError) {
              console.error('Erro ao criar notificação:', notifError);
            } else {
              console.log('✅ Notificação criada para o usuário');
            }
          } catch (error) {
            console.error('Erro ao criar notificação:', error);
          }
          
          // Enviar push notification
          try {
            const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                userId: connection.user_id,
                title: 'Lead solicitou atendimento humano',
                body: `Um lead (${cleanPhone}) quer falar com você no fluxo "${flow.name}".`,
                data: {
                  type: 'chatbot_transfer',
                  conversationId: conversation.id,
                  contactPhone: cleanPhone,
                  flowName: flow.name,
                },
              }),
            });
            
            if (pushResponse.ok) {
              console.log('✅ Push notification enviada');
            }
          } catch (error) {
            console.error('Erro ao enviar push notification:', error);
          }
          
          // Marcar conversa como transferida
          await supabase
            .from('chatbot_conversations')
            .update({
              status: 'transferred',
              current_node_id: null,
              variables: variables,
            })
            .eq('id', conversation.id);
          
          console.log('✅ Conversa transferida para atendente humano.');
          return new Response(
            JSON.stringify({ success: true, message: 'Lead transferido para atendente humano' }),
            { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );

        case 'end':
          // Finalizar conversa
          await supabase
            .from('chatbot_conversations')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              current_node_id: null,
            })
            .eq('id', conversation.id);
          
          console.log('✅ Conversa finalizada.');
          return new Response(
            JSON.stringify({ success: true, message: 'Conversa finalizada' }),
            { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );

        default:
          console.warn('Tipo de nó desconhecido:', currentNode.type);
          shouldContinue = false;
          break;
      }

      // Se não há próximo nó, parar
      if (!currentNodeId) {
        console.log('⚠️ Nenhum próximo nó encontrado. Finalizando execução do fluxo.');
        shouldContinue = false;
      }
      
      // Proteção: evitar voltar para o início se não encontrar próximo nó
      if (!currentNodeId && finalNodeId) {
        console.log(`⚠️ Mantendo no nó atual: ${finalNodeId}`);
        currentNodeId = finalNodeId; // Manter no nó atual em vez de voltar ao início
      }
    }

    // Atualizar conversa com o estado final
    // IMPORTANTE: Se finalNodeId for null, manter o current_node_id atual (não resetar para início)
    // NUNCA salvar null se já tinha um current_node_id (isso faria voltar ao início)
    let nodeIdToSave = finalNodeId;
    
    console.log(`💾 ===== SALVANDO ESTADO DA CONVERSA =====`);
    console.log(`   conversation.id: ${conversation.id}`);
    console.log(`   conversation.current_node_id (atual no banco): ${conversation.current_node_id}`);
    console.log(`   finalNodeId (após processamento): ${finalNodeId}`);
    
    // Se finalNodeId é null mas tinha um current_node_id, manter o atual
    if (!nodeIdToSave && conversation.current_node_id) {
      console.log(`⚠️ finalNodeId é null, mas mantendo current_node_id atual: ${conversation.current_node_id}`);
      nodeIdToSave = conversation.current_node_id;
    }
    
    // Se ainda é null, pode ser que o fluxo terminou (end node)
    // Nesse caso, deixar null para marcar como finalizado
    
    console.log(`   nodeIdToSave (vai salvar): ${nodeIdToSave}`);
    
    if (!nodeIdToSave) {
      console.warn(`⚠️ ATENÇÃO: Salvando null! Isso fará o fluxo voltar ao início na próxima mensagem!`);
      console.warn(`   Se o fluxo não terminou (end node), isso é um problema.`);
    }
    
    const { error: updateConvError } = await supabase
      .from('chatbot_conversations')
      .update({
        current_node_id: nodeIdToSave, // Pode ser null se o fluxo terminou (end node)
        variables: variables,
        last_interaction_at: new Date().toISOString(),
      })
      .eq('id', conversation.id);
    
    if (updateConvError) {
      console.error('❌ Erro ao atualizar conversa:', updateConvError);
    } else {
      console.log(`✅ Estado da conversa salvo com sucesso: current_node_id = ${nodeIdToSave}`);
      console.log(`💾 ===== FIM DO SALVAMENTO =====`);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Fluxo processado' }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error) {
    console.error('=== ERRO NO CHATBOT ===');
    console.error('Tipo do erro:', error?.constructor?.name);
    console.error('Mensagem:', error instanceof Error ? error.message : String(error));
    console.error('Stack:', error instanceof Error ? error.stack : 'N/A');
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});

// Função auxiliar para substituir variáveis
function replaceVariables(text: string, variables: Record<string, any>): string {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
  }
  return result;
}

// Função para avaliar condições
function evaluateCondition(condition: any, variables: Record<string, any>, userMessage: string): boolean {
  console.log(`   🔍 ===== AVALIANDO CONDIÇÃO (FUNÇÃO) =====`);
  console.log(`   Condição recebida:`, JSON.stringify(condition, null, 2));
  console.log(`   Variáveis disponíveis:`, JSON.stringify(variables, null, 2));
  console.log(`   Mensagem do usuário: "${userMessage}"`);
  
  const variable = condition.variable || 'user_message';
  const operator = condition.operator || 'equals';
  const value = condition.value || '';

  console.log(`   Variável a buscar: "${variable}"`);
  console.log(`   Operador: "${operator}"`);
  console.log(`   Valor esperado: "${value}"`);

  // Buscar valor da variável, se não encontrar, usar a mensagem do usuário
  let variableValue = variables[variable];
  console.log(`   Valor da variável "${variable}": "${variableValue}"`);
  
  if (variableValue === undefined || variableValue === null || variableValue === '') {
    console.log(`   ⚠️ Variável vazia ou não encontrada. Usando mensagem do usuário: "${userMessage}"`);
    variableValue = userMessage;
  }

  console.log(`   📊 Valor final para comparação: "${variableValue}"`);
  console.log(`   📊 Comparando: "${variableValue}" ${operator} "${value}"`);

  let result = false;
  
  switch (operator) {
    case 'equals':
      result = String(variableValue).toLowerCase().trim() === String(value).toLowerCase().trim();
      console.log(`   ✅ Resultado equals: ${result}`);
      break;
    case 'contains':
      const varLower = String(variableValue).toLowerCase().trim();
      const valLower = String(value).toLowerCase().trim();
      result = varLower.includes(valLower);
      console.log(`   ✅ Resultado contains: ${result}`);
      console.log(`   Procurando "${valLower}" em "${varLower}"`);
      break;
    case 'startsWith':
      result = String(variableValue).toLowerCase().trim().startsWith(String(value).toLowerCase().trim());
      console.log(`   ✅ Resultado startsWith: ${result}`);
      break;
    case 'endsWith':
      result = String(variableValue).toLowerCase().trim().endsWith(String(value).toLowerCase().trim());
      console.log(`   ✅ Resultado endsWith: ${result}`);
      break;
    case 'greaterThan':
      result = Number(variableValue) > Number(value);
      console.log(`   ✅ Resultado greaterThan: ${result}`);
      break;
    case 'lessThan':
      result = Number(variableValue) < Number(value);
      console.log(`   ✅ Resultado lessThan: ${result}`);
      break;
    default:
      console.warn(`   ⚠️ Operador desconhecido: ${operator}`);
      result = false;
  }
  
  console.log(`   🎯 RESULTADO FINAL DA CONDIÇÃO: ${result ? '✅ VERDADEIRO' : '❌ FALSO'}`);
  console.log(`   🔍 ===== FIM DA AVALIAÇÃO =====`);
  
  return result;
}

// Função para executar ações
async function executeAction(
  actionData: any,
  variables: Record<string, any>,
  connection: any,
  contactPhone: string,
  supabase: any
): Promise<void> {
  const actionType = actionData.action;

  switch (actionType) {
    case 'save_variable':
      // Salvar variável
      variables[actionData.variable] = actionData.value || variables.user_message;
      break;

    case 'send_email':
      // Enviar email (implementar se necessário)
      console.log('Ação: Enviar email', actionData);
      break;

    case 'create_lead':
      // Criar lead (implementar se necessário)
      console.log('Ação: Criar lead', actionData);
      break;

    case 'transfer_to_human':
      // Transferir para humano
      await supabase
        .from('chatbot_conversations')
        .update({
          status: 'transferred',
        })
        .eq('connection_id', connection.id)
        .eq('contact_phone', contactPhone)
        .eq('status', 'active');
      break;

    default:
      console.log('Ação não reconhecida:', actionType);
  }
}

