/**
 * Integração com provedores de IA (OpenAI, Gemini, Grok)
 */

export type AIProvider = 'openai' | 'gemini' | 'grok';

export interface AIModel {
  id: string;
  name: string;
  description?: string;
}

export const AI_MODELS: Record<AIProvider, AIModel[]> = {
  openai: [
    { id: 'gpt-4', name: 'GPT-4', description: 'Mais avançado e preciso' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Versão otimizada do GPT-4' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Rápido e econômico' },
    { id: 'gpt-4o', name: 'GPT-4o', description: 'Otimizado para tarefas gerais' },
  ],
  gemini: [
    { id: 'gemini-pro', name: 'Gemini Pro', description: 'Modelo principal do Google' },
    { id: 'gemini-pro-vision', name: 'Gemini Pro Vision', description: 'Suporte a imagens' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Versão mais recente' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Rápido e eficiente' },
  ],
  grok: [
    { id: 'grok-beta', name: 'Grok Beta', description: 'Modelo beta do Grok' },
    { id: 'grok-2', name: 'Grok-2', description: 'Versão mais recente' },
  ],
};

export interface GenerateMessageParams {
  provider: AIProvider;
  apiKey: string;
  model: string;
  context: string;
  tone: string;
}

export async function generateMessageWithAI(params: GenerateMessageParams): Promise<string> {
  const { provider, apiKey, model, context, tone } = params;

  const toneInstructions: Record<string, string> = {
    profissional: 'Use um tom profissional e respeitoso',
    amigavel: 'Use um tom amigável e caloroso, com emojis quando apropriado',
    formal: 'Use um tom formal e cerimonioso',
    casual: 'Use um tom casual e descontraído',
    persuasivo: 'Use um tom persuasivo e convincente',
    educativo: 'Use um tom educativo e informativo',
  };

  const systemPrompt = `Você é um assistente especializado em criar mensagens para WhatsApp. 
Crie mensagens ${toneInstructions[tone] || 'profissionais'}.
Use as variáveis {{nome}} e {{telefone}} para personalização automática.
A mensagem deve ser clara, objetiva e adequada para WhatsApp.`;

  const userPrompt = `Crie uma mensagem sobre: ${context}
A mensagem deve ser ${toneInstructions[tone] || 'profissional'} e incluir as variáveis {{nome}} e {{telefone}} para personalização.`;

  try {
    switch (provider) {
      case 'openai':
        return await generateWithOpenAI(apiKey, model, systemPrompt, userPrompt);
      case 'gemini':
        return await generateWithGemini(apiKey, model, systemPrompt, userPrompt);
      case 'grok':
        return await generateWithGrok(apiKey, model, systemPrompt, userPrompt);
      default:
        throw new Error('Provedor não suportado');
    }
  } catch (error: any) {
    // Não logar erros de API no console para não poluir
    // Apenas relançar com mensagem mais amigável
    if (error?.message) {
      throw error;
    }
    throw new Error(`Erro ao gerar mensagem com ${provider}`);
  }
}

async function generateWithOpenAI(apiKey: string, model: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Erro desconhecido' } }));
    throw new Error(error.error?.message || 'Erro ao gerar mensagem com OpenAI');
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'Erro ao gerar mensagem';
}

async function generateWithGemini(apiKey: string, model: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: fullPrompt,
        }],
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Erro desconhecido' } }));
    throw new Error(error.error?.message || 'Erro ao gerar mensagem com Gemini');
  }

  const data = await response.json();
  return data.candidates[0]?.content?.parts[0]?.text || 'Erro ao gerar mensagem';
}

async function generateWithGrok(apiKey: string, model: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
  
  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'grok-beta',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      // Não fazer parse do erro para evitar logs desnecessários
      const errorMessage = response.status === 400 
        ? 'API key inválida ou modelo não disponível' 
        : response.status === 401 
        ? 'API key inválida'
        : response.status === 429 
        ? 'Limite de requisições excedido'
        : 'Erro ao gerar mensagem com Grok';
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content;
    
    if (!message) {
      throw new Error('Resposta da API vazia');
    }
    
    return message;
  } catch (error: any) {
    // Se for erro de rede, relançar com mensagem mais clara
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Erro de conexão. Verifique sua internet.');
    }
    // Relançar erro sem fazer parse adicional para evitar logs
    throw error;
  }
}

