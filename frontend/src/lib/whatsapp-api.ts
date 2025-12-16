/**
 * Serviço de API WhatsApp (WUZAPI)
 * Integração com https://weeb.inoovaweb.com.br/
 * Usa Edge Function do Supabase para evitar problemas de CORS
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const API_URL = import.meta.env.VITE_WHATSAPP_API_URL || 'https://weeb.inoovaweb.com.br';
const API_KEY = import.meta.env.VITE_WHATSAPP_API_KEY || '';

// Usar Edge Function do Supabase como proxy para evitar CORS
const USE_PROXY = true;
const PROXY_URL = `${SUPABASE_URL}/functions/v1/whatsapp-proxy`;

/**
 * Traduz mensagens de erro técnicas para mensagens amigáveis em português
 */
export function translateErrorMessage(error: string | undefined | null): string {
  if (!error) {
    return 'Erro ao processar solicitação. Tente novamente.';
  }

  const errorLower = error.toLowerCase();

  // Erros relacionados a timeout/conexão
  if (errorLower.includes('timeout') || errorLower.includes('timed out')) {
    return 'Tempo de conexão esgotado. Verifique sua internet e tente novamente.';
  }

  // Erros relacionados a device/list
  if (errorLower.includes('device list') || errorLower.includes('usync query') || errorLower.includes('info query')) {
    return 'Erro de conexão com o WhatsApp. Verifique se a instância está online.';
  }

  // Erros relacionados a conexão
  if (errorLower.includes('connection') || errorLower.includes('connect') || errorLower.includes('disconnect')) {
    return 'Erro de conexão. Verifique se a instância está conectada.';
  }

  // Erros relacionados a autenticação
  if (errorLower.includes('auth') || errorLower.includes('unauthorized') || errorLower.includes('token')) {
    return 'Erro de autenticação. Verifique as configurações da instância.';
  }

  // Erros relacionados a número inválido
  if (errorLower.includes('invalid number') || errorLower.includes('número inválido') || errorLower.includes('phone')) {
    return 'Número de telefone inválido. Verifique o formato do número.';
  }

  // Erros relacionados a WhatsApp não encontrado
  if (errorLower.includes('not found') || errorLower.includes('não encontrado') || errorLower.includes('whatsapp')) {
    return 'Número não encontrado no WhatsApp.';
  }

  // Erros genéricos de envio
  if (errorLower.includes('send') || errorLower.includes('enviar') || errorLower.includes('message')) {
    return 'Erro ao enviar mensagem. Tente novamente.';
  }

  // Se não encontrar padrão específico, retornar mensagem genérica
  return 'Erro ao processar solicitação. Tente novamente.';
}

export interface CreateInstanceRequest {
  name: string;
  token: string;
  webhook?: string;
  events?: string[];
  history?: boolean;
}

export interface CreateInstanceResponse {
  success: boolean;
  code: number;
  data?: {
    id: string;
    name: string;
    token: string;
  };
  message?: string;
  error?: string;
}

export interface QRCodeResponse {
  success: boolean;
  code: number;
  data?: {
    QRCode?: string; // API retorna QRCode (não qr)
    qr?: string; // Fallback
  };
  message?: string;
}

export interface StatusResponse {
  success: boolean;
  code: number;
  data?: {
    Connected?: boolean; // API retorna Connected (não connected)
    LoggedIn?: boolean; // API retorna LoggedIn (não loggedIn)
    connected?: boolean; // Fallback
    loggedIn?: boolean; // Fallback
    avatar?: string;
    name?: string;
    phone?: string;
  };
}

export interface SendMessageResponse {
  success: boolean;
  code: number;
  data?: {
    messageId: string;
    id: string;
  };
  message?: string;
  error?: string;
}

/**
 * Gera token aleatório para instância
 */
export function generateInstanceToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Valida e normaliza número de telefone para WUZAPI
 * Formato esperado pela API: código do país + número (sem sinal de +)
 * Exemplo: 5511964945854 (Brasil), 5491155553934 (Argentina)
 * 
 * A documentação mostra: "Required: Country code (e.g. 5491155553934 for Argentina)"
 * "Do not prefix with a plus sign (+), as natively whatsapp requires no plus sign prefix."
 * 
 * IMPORTANTE: A documentação mostra exemplo com 13 dígitos (Argentina)
 * Para Brasil: 55 + DDD (2) + número completo (8 ou 9 dígitos) = 12 ou 13 dígitos
 * NÃO remover o 9 do celular - manter número completo
 */
export function validateAndNormalizePhone(phone: string): { valid: boolean; normalized: string; error?: string } {
  // Remove caracteres não numéricos (incluindo espaços, hífens, parênteses, etc.)
  let cleaned = phone.replace(/\D/g, '');
  
  // Remove sinal de + se houver (a API não aceita)
  cleaned = cleaned.replace(/^\+/, '');
  
  // Verifica se está vazio
  if (!cleaned || cleaned.length === 0) {
    return { valid: false, normalized: '', error: 'Número de telefone não pode estar vazio' };
  }
  
  // Se tem menos de 10 dígitos, é inválido
  if (cleaned.length < 10) {
    return { valid: false, normalized: cleaned, error: 'Número muito curto. Deve ter pelo menos 10 dígitos' };
  }
  
  // Se o número já começa com código do país (55 para Brasil, 54 para Argentina, etc.)
  // e tem 12 ou mais dígitos, manter como está (já está no formato internacional)
  // A documentação mostra exemplo com 13 dígitos, então aceitar 12 ou 13 dígitos
  if (cleaned.length >= 12) {
    // Número já está no formato internacional - apenas retornar limpo
    return { valid: true, normalized: cleaned };
  }
  
  // Se tem 10 ou 11 dígitos e não começa com código do país, assumir Brasil (55)
  if (cleaned.length === 10 || cleaned.length === 11) {
    // Se não começa com 55, adicionar código do país Brasil
    if (!cleaned.startsWith('55')) {
      cleaned = '55' + cleaned;
    }
  }
  
  // Retornar número normalizado
  // A API aceita qualquer número no formato internacional (código do país + número)
  return { valid: true, normalized: cleaned };
}

/**
 * Normaliza número de telefone para formato WUZAPI
 * Formato esperado: código do país + número (sem sinal de +)
 * Exemplo: 5511964945854 (Brasil), 5491155553934 (Argentina)
 * 
 * Garante que o número tenha código do país antes de enviar
 * Segundo a documentação: "Required: Country code (e.g. 5491155553934 for Argentina)"
 * "Do not prefix with a plus sign (+), as natively whatsapp requires no plus sign prefix."
 * 
 * IMPORTANTE: Para números brasileiros, o formato é 55 + DDD + número completo
 * Exemplo: 5511964945854 = 55 (país) + 11 (DDD) + 964945854 (número com 9 dígitos)
 */
export function cleanPhoneNumber(phone: string): string {
  // Remove caracteres não numéricos (incluindo espaços, hífens, parênteses, etc.)
  let cleaned = phone.replace(/\D/g, '');
  
  // Remove sinal de + se houver (a API não aceita)
  cleaned = cleaned.replace(/^\+/, '');
  
  // Se está vazio, retornar como está
  if (!cleaned || cleaned.length === 0) {
    return phone.replace(/\D/g, '').replace(/^\+/, '');
  }
  
  // Se já começa com código do país (55 para Brasil, 54 para Argentina, etc.)
  if (cleaned.startsWith('55')) {
    // Número brasileiro
    // Formato esperado pela WUZAPI: 55 + DDD (2 dígitos) + número completo
    // A documentação mostra exemplo: 5491155553934 (Argentina) = 13 dígitos
    // Para Brasil: 55 + DDD (2) + número (8 ou 9 dígitos) = 12 ou 13 dígitos
    // IMPORTANTE: NÃO remover o 9 do celular - manter número completo
    // Exemplo: 5511964945854 = 55 (país) + 11 (DDD) + 964945854 (número com 9 dígitos) = 13 dígitos
    
    // Se tem 12 ou 13 dígitos, está no formato correto
    if (cleaned.length === 12 || cleaned.length === 13) {
      return cleaned;
    }
    
    // Se tem 14 dígitos, pode ter um 9 duplicado - remover apenas se for claramente duplicado
    if (cleaned.length === 14) {
      const ddd = cleaned.substring(2, 4); // DDD (2 dígitos após o 55)
      const afterDdd = cleaned.substring(4); // Tudo após o DDD
      
      // Se após o DDD começa com 99 (dois noves), pode ser duplicado
      // Exemplo: 55119964945854 -> 5511964945854
      if (afterDdd.startsWith('99') && afterDdd.length === 10) {
        // Remover o primeiro 9 duplicado
        cleaned = '55' + ddd + afterDdd.substring(1);
      }
      return cleaned;
    }
  }
  
  // Se não começa com código do país, adicionar código do Brasil (55)
  if (!cleaned.startsWith('55') && !cleaned.match(/^5[4-9]/)) {
    // Se tem 10 ou 11 dígitos, assumir formato brasileiro (DDD + número)
    if (cleaned.length === 10 || cleaned.length === 11) {
      cleaned = '55' + cleaned;
    } else if (cleaned.length < 10) {
      // Se tem menos de 10 dígitos, adicionar código do país mesmo assim
      cleaned = '55' + cleaned;
    }
  }
  
  return cleaned;
}

/**
 * Formata número de telefone com sufixo JID do WhatsApp
 * Adiciona "@s.whatsapp.net" ao final do número
 */
export function formatPhoneWithJID(phone: string): string {
  // Se já tiver o sufixo, extrair o número, normalizar e adicionar o sufixo novamente
  if (phone.includes('@s.whatsapp.net')) {
    const numberPart = phone.split('@')[0];
    const cleaned = cleanPhoneNumber(numberPart);
    return `${cleaned}@s.whatsapp.net`;
  }
  // Se não tiver o sufixo, normalizar e adicionar
  const cleaned = cleanPhoneNumber(phone);
  return `${cleaned}@s.whatsapp.net`;
}

/**
 * Classe de serviço para API WhatsApp
 */
export class WhatsAppApiService {
  private apiUrl: string;
  private apiKey: string;

  constructor(apiUrl: string = API_URL, apiKey: string = API_KEY) {
    this.apiUrl = apiUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
  }

  /**
   * Criar instância na API
   */
  async createInstance(
    name: string,
    token: string,
    webhook?: string
  ): Promise<CreateInstanceResponse> {
    try {
      // Formato correto conforme documentação da API
      const body = {
        name,
        token,
        webhook: webhook || '',
        events: 'All', // String, não array
        history: 0, // Número, não boolean
      };

      if (USE_PROXY && PROXY_URL) {
        // Usar Edge Function como proxy
        const { supabase } = await import('./supabase');
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(`${PROXY_URL}?path=/admin/users`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token || ''}`,
            'Content-Type': 'application/json',
            'x-auth-type': 'admin',
            'x-instance-token': this.apiKey, // API Key vai no header customizado
          },
          body: JSON.stringify(body),
        });

        return await response.json();
      } else {
        // Chamada direta (pode dar erro de CORS)
        const response = await fetch(`${this.apiUrl}/admin/users`, {
          method: 'POST',
          headers: {
            'Authorization': this.apiKey, // Sem "Bearer"
            'Content-Type': 'application/json',
            'accept': 'application/json',
          },
          body: JSON.stringify(body),
        });

        return await response.json();
      }
    } catch (error) {
      return {
        success: false,
        code: 500,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Deletar instância
   */
  async deleteInstance(instanceId: string, full: boolean = false): Promise<boolean> {
    try {
      const endpoint = full ? `/admin/users/${instanceId}/full` : `/admin/users/${instanceId}`;
      
      if (USE_PROXY && PROXY_URL) {
        const { supabase } = await import('./supabase');
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(`${PROXY_URL}?path=${endpoint}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session?.access_token || ''}`,
            'x-auth-type': 'admin',
            'x-instance-token': this.apiKey,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: errorText };
          }
          console.error('Erro ao deletar instância na API:', response.status, errorData);
          return false;
        }

        const result = await response.json();
        console.log('Resultado da deleção:', result);
        return result.success === true || result.code === 200 || response.status === 200;
      } else {
        const response = await fetch(`${this.apiUrl}${endpoint}`, {
          method: 'DELETE',
          headers: {
            'Authorization': this.apiKey,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Erro ao deletar instância na API:', response.status, errorText);
          return false;
        }

        const result = await response.json();
        return result.success === true || result.code === 200 || response.status === 200;
      }
    } catch (error) {
      console.error('Erro ao deletar instância:', error);
      return false;
    }
  }

  /**
   * Iniciar conexão
   */
  async connectInstance(token: string, immediate: boolean = true): Promise<{ success: boolean; alreadyConnected?: boolean; error?: string }> {
    try {
      // Body conforme documentação: Subscribe (opcional) e Immediate (opcional)
      const body = {
        Immediate: immediate,
      };

      if (USE_PROXY && PROXY_URL) {
        const { supabase } = await import('./supabase');
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(`${PROXY_URL}?path=/session/connect`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token || ''}`,
            'Content-Type': 'application/json',
            'x-auth-type': 'user',
            'x-instance-token': token,
          },
          body: JSON.stringify(body),
        });

        // Verificar se a resposta foi bem-sucedida
        if (!response.ok) {
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: errorText };
          }
          
          // Verificar se é "already connected" - mesmo com status 500, isso não é erro fatal
          const errorMsg = (errorData.error || errorData.message || '').toString().toLowerCase();
          if (errorMsg.includes('already connected') || 
              errorMsg.includes('alreadyconnected') ||
              errorMsg.includes('already logged in')) {
            console.log('Instância já conectada (status 500), continuando...');
            return { success: true, alreadyConnected: true };
          }
          
          console.error('Erro ao conectar instância:', response.status, errorData);
          return { 
            success: false, 
            error: errorData.error || errorData.message || 'Erro ao conectar instância' 
          };
        }

        const result = await response.json();
        
        // Se a resposta não foi bem-sucedida, verificar se é "already connected"
        if (!result.success && response.status === 200) {
          // Pode ser que a API retorne 200 mesmo com "already connected"
          const errorMsg = result.error || result.message || '';
          if (errorMsg.toLowerCase().includes('already connected') || 
              errorMsg.toLowerCase().includes('alreadyconnected')) {
            result.alreadyConnected = true;
            result.success = true; // Tratar como sucesso para continuar
          }
        }
        
        return result;
      } else {
        const response = await fetch(`${this.apiUrl}/session/connect`, {
          method: 'POST',
          headers: {
            'token': token,
            'Content-Type': 'application/json',
            'accept': 'application/json',
          },
          body: JSON.stringify(body),
        });

        const result = await response.json();
        
        // Se a resposta não foi bem-sucedida, verificar se é "already connected"
        if (!result.success && response.status === 200) {
          // Pode ser que a API retorne 200 mesmo com "already connected"
          const errorMsg = result.error || result.message || '';
          if (errorMsg.toLowerCase().includes('already connected') || 
              errorMsg.toLowerCase().includes('alreadyconnected')) {
            result.alreadyConnected = true;
            result.success = true; // Tratar como sucesso para continuar
          }
        }
        
        return result;
      }
    } catch (error) {
      return { success: false };
    }
  }

  /**
   * Obter QR Code
   */
  async getQRCode(token: string): Promise<QRCodeResponse> {
    try {
      if (USE_PROXY && PROXY_URL) {
        const { supabase } = await import('./supabase');
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(`${PROXY_URL}?path=/session/qr`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session?.access_token || ''}`,
            'x-auth-type': 'user',
            'x-instance-token': token,
          },
        });

        // Verificar se a resposta foi bem-sucedida
        if (!response.ok) {
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: errorText };
          }
          console.error('Erro ao obter QR Code:', response.status, errorData);
          return {
            success: false,
            code: response.status,
            message: errorData.error || errorData.message || 'Erro ao obter QR Code',
            data: undefined,
          };
        }

        const result = await response.json();
        
        // Log da resposta completa para debug
        console.log('Resposta completa do getQRCode:', {
          success: result.success,
          code: result.code,
          hasData: !!result.data,
          hasQRCode: !!result.data?.QRCode,
          hasQr: !!result.data?.qr,
          qrCodeLength: result.data?.QRCode?.length || 0,
          qrLength: result.data?.qr?.length || 0,
        });
        
        // Normalizar resposta: API retorna QRCode, mas pode retornar qr também
        if (result.data?.QRCode && !result.data.qr) {
          result.data.qr = result.data.QRCode;
        }
        
        // Se a resposta foi bem-sucedida mas o QR code está vazio, ainda é sucesso
        // (pode ser que já esteja logado, mas isso é tratado no componente)
        if (result.success && (!result.data?.qr && !result.data?.QRCode)) {
          // QR code vazio - instância pode já estar logada
          console.log('QR Code vazio - instância pode já estar logada');
        } else if (result.success && (result.data?.qr || result.data?.QRCode)) {
          console.log('QR Code obtido com sucesso!', {
            length: (result.data?.qr || result.data?.QRCode)?.length,
            startsWith: (result.data?.qr || result.data?.QRCode)?.substring(0, 50),
          });
        }
        
        return result;
      } else {
        const response = await fetch(`${this.apiUrl}/session/qr`, {
          method: 'GET',
          headers: {
            'token': token,
          },
        });

        const result = await response.json();
        // Normalizar resposta
        if (result.data?.QRCode && !result.data.qr) {
          result.data.qr = result.data.QRCode;
        }
        return result;
      }
    } catch (error) {
      return {
        success: false,
        code: 500,
        message: error instanceof Error ? error.message : 'Erro ao obter QR Code',
      };
    }
  }

  /**
   * Verificar status da conexão
   */
  async getStatus(token: string): Promise<StatusResponse> {
    try {
      if (USE_PROXY && PROXY_URL) {
        const { supabase } = await import('./supabase');
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(`${PROXY_URL}?path=/session/status`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session?.access_token || ''}`,
            'x-auth-type': 'user',
            'x-instance-token': token,
          },
        });

        const result = await response.json();
        // Normalizar resposta: API retorna Connected/LoggedIn
        if (result.data) {
          if (result.data.Connected !== undefined && result.data.connected === undefined) {
            result.data.connected = result.data.Connected;
          }
          if (result.data.LoggedIn !== undefined && result.data.loggedIn === undefined) {
            result.data.loggedIn = result.data.LoggedIn;
          }
        }
        return result;
      } else {
        const response = await fetch(`${this.apiUrl}/session/status`, {
          method: 'GET',
          headers: {
            'token': token,
          },
        });

        const result = await response.json();
        // Normalizar resposta
        if (result.data) {
          if (result.data.Connected !== undefined && result.data.connected === undefined) {
            result.data.connected = result.data.Connected;
          }
          if (result.data.LoggedIn !== undefined && result.data.loggedIn === undefined) {
            result.data.loggedIn = result.data.LoggedIn;
          }
        }
        return result;
      }
    } catch (error) {
      return {
        success: false,
        code: 500,
      };
    }
  }

  /**
   * Conectar via código de telefone
   */
  async pairPhone(token: string, phone: string): Promise<{ success: boolean; code?: string; LinkingCode?: string; data?: { LinkingCode?: string }; error?: string; message?: string }> {
    try {
      const cleanPhone = formatPhoneWithJID(phone);
      
      if (USE_PROXY && PROXY_URL) {
        const { supabase } = await import('./supabase');
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(`${PROXY_URL}?path=/session/pairphone`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token || ''}`,
            'Content-Type': 'application/json',
            'x-auth-type': 'user',
            'x-instance-token': token,
          },
          body: JSON.stringify({
            phone: cleanPhone,
          }),
        });

        const result = await response.json();
        // Normalizar resposta: API retorna LinkingCode em data.LinkingCode (formato: "9H3J-H3J8")
        if (result.success && result.data?.LinkingCode) {
          result.code = result.data.LinkingCode;
          result.LinkingCode = result.data.LinkingCode; // Também manter no nível raiz para compatibilidade
        }
        return result;
      } else {
        const response = await fetch(`${this.apiUrl}/session/pairphone`, {
          method: 'POST',
          headers: {
            'token': token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone: cleanPhone,
          }),
        });

        const result = await response.json();
        // Normalizar resposta: API retorna LinkingCode em data.LinkingCode (formato: "9H3J-H3J8")
        if (result.success && result.data?.LinkingCode) {
          result.code = result.data.LinkingCode;
          result.LinkingCode = result.data.LinkingCode; // Também manter no nível raiz para compatibilidade
        }
        return result;
      }
    } catch (error) {
      return { success: false };
    }
  }

  /**
   * Desconectar
   */
  async disconnect(token: string): Promise<boolean> {
    try {
      if (USE_PROXY && PROXY_URL) {
        const { supabase } = await import('./supabase');
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(`${PROXY_URL}?path=/session/disconnect`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token || ''}`,
            'x-auth-type': 'user',
            'x-instance-token': token,
          },
        });

        // Tentar ler a resposta mesmo se o status não for OK
        let result;
        try {
          const responseText = await response.text();
          result = responseText ? JSON.parse(responseText) : {};
        } catch (parseError) {
          // Se não conseguir parsear, criar objeto vazio
          result = {};
        }

        // Verificar se a desconexão foi bem-sucedida mesmo com status 500
        // A API pode retornar 500 mas ainda ter sucesso na desconexão
        if (result.success === true) {
          return true;
        }

        // Se o status não for OK, verificar se é um erro conhecido que pode ser ignorado
        if (!response.ok) {
          const errorMsg = (result.error || result.message || '').toString().toLowerCase();
          
          // Se já estiver desconectado, considerar como sucesso
          if (errorMsg.includes('already disconnected') || 
              errorMsg.includes('not connected') ||
              errorMsg.includes('already disconnected')) {
            console.log('Instância já estava desconectada');
            return true;
          }
          
          // Se for outro erro, logar mas não falhar completamente
          console.warn('Erro ao desconectar (status não OK):', response.status, result);
          
          // Mesmo assim, tentar retornar true se a resposta indicar sucesso
          if (result.data?.Details || result.Details) {
            return true;
          }
        }

        return result.success === true;
      } else {
        const response = await fetch(`${this.apiUrl}/session/disconnect`, {
          method: 'POST',
          headers: {
            'token': token,
          },
        });

        const result = await response.json();
        return result.success === true;
      }
    } catch (error) {
      console.error('Erro ao desconectar:', error);
      // Em caso de erro de rede, ainda tentar atualizar o status localmente
      // O usuário pode tentar novamente se necessário
      return false;
    }
  }

  /**
   * Logout (termina sessão e força novo QR code)
   */
  async logout(token: string): Promise<boolean> {
    try {
      if (USE_PROXY && PROXY_URL) {
        const { supabase } = await import('./supabase');
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(`${PROXY_URL}?path=/session/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token || ''}`,
            'x-auth-type': 'user',
            'x-instance-token': token,
          },
        });

        if (!response.ok) {
          console.error('Erro ao fazer logout:', response.status);
          return false;
        }

        const result = await response.json();
        return result.success === true;
      } else {
        const response = await fetch(`${this.apiUrl}/session/logout`, {
          method: 'POST',
          headers: {
            'token': token,
          },
        });

        const result = await response.json();
        return result.success === true;
      }
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      return false;
    }
  }

  /**
   * Enviar mensagem de texto
   */
  async sendText(
    token: string,
    phoneNumber: string,
    message: string
  ): Promise<SendMessageResponse> {
    try {
      const cleanPhone = formatPhoneWithJID(phoneNumber);
      
      // Log para debug (apenas em desenvolvimento)
      if (process.env.NODE_ENV === 'development') {
        console.log('[sendText] Número original:', phoneNumber, '-> Formatado:', cleanPhone);
      }
      
      if (USE_PROXY && PROXY_URL) {
        const { supabase } = await import('./supabase');
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(`${PROXY_URL}?path=/chat/send/text`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token || ''}`,
            'Content-Type': 'application/json',
            'x-auth-type': 'user',
            'x-instance-token': token,
          },
          body: JSON.stringify({
            Phone: cleanPhone,
            Body: message,
          }),
        });

        return await response.json();
      } else {
        const response = await fetch(`${this.apiUrl}/chat/send/text`, {
          method: 'POST',
          headers: {
            'token': token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            Phone: cleanPhone,
            Body: message,
          }),
        });

        return await response.json();
      }
    } catch (error) {
      return {
        success: false,
        code: 500,
        error: error instanceof Error ? error.message : 'Erro ao enviar mensagem',
      };
    }
  }

  /**
   * Enviar mensagem de texto para grupo
   * Usa o JID do grupo (formato: 120363312246943103@g.us)
   */
  async sendTextToGroup(
    token: string,
    groupJID: string,
    message: string
  ): Promise<SendMessageResponse> {
    try {
      // O JID do grupo já está no formato correto (ex: 120363312246943103@g.us)
      // Não precisa normalizar como número de telefone
      
      if (USE_PROXY && PROXY_URL) {
        const { supabase } = await import('./supabase');
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(`${PROXY_URL}?path=/chat/send/text`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token || ''}`,
            'Content-Type': 'application/json',
            'x-auth-type': 'user',
            'x-instance-token': token,
          },
          body: JSON.stringify({
            Phone: groupJID, // JID do grupo (ex: 120363312246943103@g.us)
            Body: message,
          }),
        });

        return await response.json();
      } else {
        const response = await fetch(`${this.apiUrl}/chat/send/text`, {
          method: 'POST',
          headers: {
            'token': token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            Phone: groupJID, // JID do grupo (ex: 120363312246943103@g.us)
            Body: message,
          }),
        });

        return await response.json();
      }
    } catch (error) {
      return {
        success: false,
        code: 500,
        error: error instanceof Error ? error.message : 'Erro ao enviar mensagem para grupo',
      };
    }
  }

  /**
   * Enviar imagem
   * WUZAPI suporta apenas JPEG e PNG para imagens
   */
  async sendImage(
    token: string,
    phoneNumber: string,
    imageBase64: string,
    caption?: string
  ): Promise<SendMessageResponse> {
    try {
      const cleanPhone = formatPhoneWithJID(phoneNumber);
      
      // Extrair dados base64 e validar formato
      let base64Data: string;
      let mimeType: string = 'image/jpeg';
      
      if (imageBase64.startsWith('data:')) {
        // Extrair mime type do data URL
        const match = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          mimeType = match[1].toLowerCase();
          base64Data = match[2];
        } else {
          // Se não conseguir extrair, tentar pegar tudo após a vírgula
          const parts = imageBase64.split(',');
          if (parts.length > 1) {
            base64Data = parts[1];
            // Tentar extrair mime type do primeiro parte
            const mimeMatch = parts[0].match(/data:([^;]+)/);
            if (mimeMatch) {
              mimeType = mimeMatch[1].toLowerCase();
            }
          } else {
            base64Data = imageBase64;
          }
        }
      } else {
        base64Data = imageBase64;
      }
      
      // Normalizar mime type
      if (mimeType === 'image/jpg') {
        mimeType = 'image/jpeg';
      }
      
      // Validar formato - WUZAPI suporta apenas JPEG e PNG
      if (mimeType && !mimeType.match(/^image\/(jpeg|png)$/i)) {
        return {
          success: false,
          code: 400,
          error: `Formato de imagem não suportado: ${mimeType}. Use apenas JPEG ou PNG.`,
        };
      }
      
      // Validar se base64 é válido (não vazio)
      if (!base64Data || base64Data.trim().length === 0) {
        return {
          success: false,
          code: 400,
          error: 'Dados da imagem (base64) estão vazios ou inválidos.',
        };
      }
      
      // Garantir formato completo com mime type correto
      // Se não tiver mime type, assumir JPEG
      if (!mimeType || mimeType === 'image/jpeg' || mimeType === 'image/png') {
        mimeType = mimeType || 'image/jpeg';
      }
      
      const imageData = `data:${mimeType};base64,${base64Data}`;

      const payload: any = {
        Phone: cleanPhone,
        Image: imageData,
      };

      if (caption) payload.Caption = caption;

      if (USE_PROXY && PROXY_URL) {
        const { supabase } = await import('./supabase');
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(`${PROXY_URL}?path=/chat/send/image`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token || ''}`,
            'Content-Type': 'application/json',
            'x-auth-type': 'user',
            'x-instance-token': token,
          },
          body: JSON.stringify(payload),
        });

        return await response.json();
      } else {
        const response = await fetch(`${this.apiUrl}/chat/send/image`, {
          method: 'POST',
          headers: {
            'token': token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        return await response.json();
      }
    } catch (error) {
      return {
        success: false,
        code: 500,
        error: error instanceof Error ? error.message : 'Erro ao enviar imagem',
      };
    }
  }

  /**
   * Enviar vídeo
   */
  async sendVideo(
    token: string,
    phoneNumber: string,
    videoBase64: string,
    caption?: string
  ): Promise<SendMessageResponse> {
    try {
      const cleanPhone = formatPhoneWithJID(phoneNumber);
      
      const videoData = videoBase64.startsWith('data:')
        ? videoBase64
        : `data:video/mp4;base64,${videoBase64}`;

      const payload: any = {
        Phone: cleanPhone,
        Video: videoData,
      };

      if (caption) payload.Caption = caption;

      if (USE_PROXY && PROXY_URL) {
        const { supabase } = await import('./supabase');
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(`${PROXY_URL}?path=/chat/send/video`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token || ''}`,
            'Content-Type': 'application/json',
            'x-auth-type': 'user',
            'x-instance-token': token,
          },
          body: JSON.stringify(payload),
        });

        return await response.json();
      } else {
        const response = await fetch(`${this.apiUrl}/chat/send/video`, {
          method: 'POST',
          headers: {
            'token': token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        return await response.json();
      }
    } catch (error) {
      return {
        success: false,
        code: 500,
        error: error instanceof Error ? error.message : 'Erro ao enviar vídeo',
      };
    }
  }

  /**
   * Enviar documento
   */
  async sendDocument(
    token: string,
    phoneNumber: string,
    documentBase64: string,
    fileName: string,
    mimeType?: string
  ): Promise<SendMessageResponse> {
    try {
      const cleanPhone = formatPhoneWithJID(phoneNumber);
      
      // IMPORTANTE: Documento deve usar application/octet-stream
      const documentData = documentBase64.startsWith('data:')
        ? documentBase64.replace(/^data:[^;]+;base64,/, 'data:application/octet-stream;base64,')
        : `data:application/octet-stream;base64,${documentBase64}`;

      const payload: any = {
        Phone: cleanPhone,
        Document: documentData,
        FileName: fileName,
      };

      if (mimeType) payload.MimeType = mimeType;

      if (USE_PROXY && PROXY_URL) {
        const { supabase } = await import('./supabase');
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(`${PROXY_URL}?path=/chat/send/document`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token || ''}`,
            'Content-Type': 'application/json',
            'x-auth-type': 'user',
            'x-instance-token': token,
          },
          body: JSON.stringify(payload),
        });

        return await response.json();
      } else {
        const response = await fetch(`${this.apiUrl}/chat/send/document`, {
          method: 'POST',
          headers: {
            'token': token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        return await response.json();
      }
    } catch (error) {
      return {
        success: false,
        code: 500,
        error: error instanceof Error ? error.message : 'Erro ao enviar documento',
      };
    }
  }

  /**
   * Enviar imagem para grupo
   * Usa o JID do grupo diretamente (não normaliza como número)
   */
  async sendImageToGroup(
    token: string,
    groupJID: string,
    imageBase64: string,
    caption?: string
  ): Promise<SendMessageResponse> {
    try {
      // Extrair dados base64 e validar formato
      let base64Data: string;
      let mimeType: string = 'image/jpeg';
      
      if (imageBase64.startsWith('data:')) {
        const match = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          mimeType = match[1].toLowerCase();
          base64Data = match[2];
        } else {
          const parts = imageBase64.split(',');
          if (parts.length > 1) {
            base64Data = parts[1];
            const mimeMatch = parts[0].match(/data:([^;]+)/);
            if (mimeMatch) {
              mimeType = mimeMatch[1].toLowerCase();
            }
          } else {
            base64Data = imageBase64;
          }
        }
      } else {
        base64Data = imageBase64;
      }
      
      if (mimeType === 'image/jpg') {
        mimeType = 'image/jpeg';
      }
      
      if (mimeType && !mimeType.match(/^image\/(jpeg|png)$/i)) {
        return {
          success: false,
          code: 400,
          error: `Formato de imagem não suportado: ${mimeType}. Use apenas JPEG ou PNG.`,
        };
      }
      
      if (!base64Data || base64Data.trim().length === 0) {
        return {
          success: false,
          code: 400,
          error: 'Dados da imagem (base64) estão vazios ou inválidos.',
        };
      }
      
      if (!mimeType || mimeType === 'image/jpeg' || mimeType === 'image/png') {
        mimeType = mimeType || 'image/jpeg';
      }
      
      const imageData = `data:${mimeType};base64,${base64Data}`;

      const payload: any = {
        Phone: groupJID, // JID do grupo diretamente
        Image: imageData,
      };

      if (caption) payload.Caption = caption;

      if (USE_PROXY && PROXY_URL) {
        const { supabase } = await import('./supabase');
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(`${PROXY_URL}?path=/chat/send/image`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token || ''}`,
            'Content-Type': 'application/json',
            'x-auth-type': 'user',
            'x-instance-token': token,
          },
          body: JSON.stringify(payload),
        });

        return await response.json();
      } else {
        const response = await fetch(`${this.apiUrl}/chat/send/image`, {
          method: 'POST',
          headers: {
            'token': token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        return await response.json();
      }
    } catch (error) {
      return {
        success: false,
        code: 500,
        error: error instanceof Error ? error.message : 'Erro ao enviar imagem para grupo',
      };
    }
  }

  /**
   * Enviar vídeo para grupo
   * Usa o JID do grupo diretamente (não normaliza como número)
   */
  async sendVideoToGroup(
    token: string,
    groupJID: string,
    videoBase64: string,
    caption?: string
  ): Promise<SendMessageResponse> {
    try {
      const videoData = videoBase64.startsWith('data:')
        ? videoBase64
        : `data:video/mp4;base64,${videoBase64}`;

      const payload: any = {
        Phone: groupJID, // JID do grupo diretamente
        Video: videoData,
      };

      if (caption) payload.Caption = caption;

      if (USE_PROXY && PROXY_URL) {
        const { supabase } = await import('./supabase');
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(`${PROXY_URL}?path=/chat/send/video`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token || ''}`,
            'Content-Type': 'application/json',
            'x-auth-type': 'user',
            'x-instance-token': token,
          },
          body: JSON.stringify(payload),
        });

        return await response.json();
      } else {
        const response = await fetch(`${this.apiUrl}/chat/send/video`, {
          method: 'POST',
          headers: {
            'token': token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        return await response.json();
      }
    } catch (error) {
      return {
        success: false,
        code: 500,
        error: error instanceof Error ? error.message : 'Erro ao enviar vídeo para grupo',
      };
    }
  }

  /**
   * Enviar documento para grupo
   * Usa o JID do grupo diretamente (não normaliza como número)
   */
  async sendDocumentToGroup(
    token: string,
    groupJID: string,
    documentBase64: string,
    fileName: string,
    mimeType?: string
  ): Promise<SendMessageResponse> {
    try {
      const documentData = documentBase64.startsWith('data:')
        ? documentBase64.replace(/^data:[^;]+;base64,/, 'data:application/octet-stream;base64,')
        : `data:application/octet-stream;base64,${documentBase64}`;

      const payload: any = {
        Phone: groupJID, // JID do grupo diretamente
        Document: documentData,
        FileName: fileName,
      };

      if (mimeType) payload.MimeType = mimeType;

      if (USE_PROXY && PROXY_URL) {
        const { supabase } = await import('./supabase');
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(`${PROXY_URL}?path=/chat/send/document`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token || ''}`,
            'Content-Type': 'application/json',
            'x-auth-type': 'user',
            'x-instance-token': token,
          },
          body: JSON.stringify(payload),
        });

        return await response.json();
      } else {
        const response = await fetch(`${this.apiUrl}/chat/send/document`, {
          method: 'POST',
          headers: {
            'token': token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        return await response.json();
      }
    } catch (error) {
      return {
        success: false,
        code: 500,
        error: error instanceof Error ? error.message : 'Erro ao enviar documento para grupo',
      };
    }
  }

  /**
   * Enviar áudio para grupo
   * Usa o JID do grupo diretamente (não normaliza como número)
   */
  async sendAudioToGroup(
    token: string,
    groupJID: string,
    audioBase64: string,
    ptt: boolean = false
  ): Promise<SendMessageResponse> {
    try {
      const audioData = audioBase64.startsWith('data:')
        ? audioBase64
        : `data:audio/ogg;base64,${audioBase64}`;

      const payload: any = {
        Phone: groupJID, // JID do grupo diretamente
        Audio: audioData,
      };

      if (ptt) payload.PTT = true;

      if (USE_PROXY && PROXY_URL) {
        const { supabase } = await import('./supabase');
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(`${PROXY_URL}?path=/chat/send/audio`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token || ''}`,
            'Content-Type': 'application/json',
            'x-auth-type': 'user',
            'x-instance-token': token,
          },
          body: JSON.stringify(payload),
        });

        return await response.json();
      } else {
        const response = await fetch(`${this.apiUrl}/chat/send/audio`, {
          method: 'POST',
          headers: {
            'token': token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        return await response.json();
      }
    } catch (error) {
      return {
        success: false,
        code: 500,
        error: error instanceof Error ? error.message : 'Erro ao enviar áudio para grupo',
      };
    }
  }

  /**
   * Enviar áudio
   */
  async sendAudio(
    token: string,
    phoneNumber: string,
    audioBase64: string,
    ptt: boolean = false
  ): Promise<SendMessageResponse> {
    try {
      const cleanPhone = formatPhoneWithJID(phoneNumber);
      
      // Áudio deve estar em formato opus (audio/ogg)
      const audioData = audioBase64.startsWith('data:')
        ? audioBase64
        : `data:audio/ogg;base64,${audioBase64}`;

      const payload: any = {
        Phone: cleanPhone,
        Audio: audioData,
      };

      if (ptt) payload.PTT = true;

      if (USE_PROXY && PROXY_URL) {
        const { supabase } = await import('./supabase');
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(`${PROXY_URL}?path=/chat/send/audio`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token || ''}`,
            'Content-Type': 'application/json',
            'x-auth-type': 'user',
            'x-instance-token': token,
          },
          body: JSON.stringify(payload),
        });

        return await response.json();
      } else {
        const response = await fetch(`${this.apiUrl}/chat/send/audio`, {
          method: 'POST',
          headers: {
            'token': token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        return await response.json();
      }
    } catch (error) {
      return {
        success: false,
        code: 500,
        error: error instanceof Error ? error.message : 'Erro ao enviar áudio',
      };
    }
  }

  /**
   * Obter configuração do webhook
   */
  async getWebhook(token: string): Promise<{
    success: boolean;
    data?: {
      webhook?: string;
      subscribe?: string[];
      active?: boolean;
    };
    error?: string;
  }> {
    try {
      if (USE_PROXY && PROXY_URL) {
        const { supabase } = await import('./supabase');
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(`${PROXY_URL}?path=/webhook`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session?.access_token || ''}`,
            'x-auth-type': 'user',
            'x-instance-token': token,
          },
        });

        if (!response.ok) {
          return { success: false, error: 'Erro ao obter webhook' };
        }

        const result = await response.json();
        
        if (result.success && result.data) {
          return {
            success: true,
            data: {
              webhook: result.data.webhook || result.data.WebhookURL,
              subscribe: result.data.subscribe || result.data.Events || [],
              active: result.data.active !== false,
            },
          };
        }
        
        return { success: false };
      } else {
        const response = await fetch(`${this.apiUrl}/webhook`, {
          method: 'GET',
          headers: {
            'token': token,
          },
        });

        if (!response.ok) {
          return { success: false, error: 'Erro ao obter webhook' };
        }

        const result = await response.json();
        
        if (result.success && result.data) {
          return {
            success: true,
            data: {
              webhook: result.data.webhook || result.data.WebhookURL,
              subscribe: result.data.subscribe || result.data.Events || [],
              active: result.data.active !== false,
            },
          };
        }
        
        return { success: false };
      }
    } catch (error) {
      console.error('Erro ao obter webhook:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erro ao obter webhook' };
    }
  }

  /**
   * Configurar webhook
   */
  async setWebhook(
    token: string,
    webhookUrl: string,
    events: string[]
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      if (USE_PROXY && PROXY_URL) {
        const { supabase } = await import('./supabase');
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(`${PROXY_URL}?path=/webhook`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token || ''}`,
            'Content-Type': 'application/json',
            'x-auth-type': 'user',
            'x-instance-token': token,
          },
          body: JSON.stringify({
            webhook: webhookUrl,
            events: events,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return { 
            success: false, 
            error: errorData.error || errorData.message || 'Erro ao configurar webhook' 
          };
        }

        const result = await response.json();
        return { success: result.success !== false };
      } else {
        const response = await fetch(`${this.apiUrl}/webhook`, {
          method: 'POST',
          headers: {
            'token': token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            webhook: webhookUrl,
            events: events,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return { 
            success: false, 
            error: errorData.error || errorData.message || 'Erro ao configurar webhook' 
          };
        }

        const result = await response.json();
        return { success: result.success !== false };
      }
    } catch (error) {
      console.error('Erro ao configurar webhook:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro ao configurar webhook' 
      };
    }
  }

  /**
   * Atualizar webhook
   */
  async updateWebhook(
    token: string,
    webhookUrl: string,
    events: string[],
    active: boolean = true
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      console.log('🔧 updateWebhook - Iniciando configuração:', {
        webhookUrl,
        events,
        active,
        useProxy: USE_PROXY,
        proxyUrl: PROXY_URL
      });

      if (USE_PROXY && PROXY_URL) {
        const { supabase } = await import('./supabase');
        const { data: { session } } = await supabase.auth.getSession();
        
        const requestBody = {
          webhook: webhookUrl,
          events: events,
          Active: active,
        };

        console.log('📤 Enviando requisição via PROXY:', {
          url: `${PROXY_URL}?path=/webhook`,
          method: 'PUT',
          body: requestBody
        });

        const response = await fetch(`${PROXY_URL}?path=/webhook`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session?.access_token || ''}`,
            'Content-Type': 'application/json',
            'x-auth-type': 'user',
            'x-instance-token': token,
          },
          body: JSON.stringify(requestBody),
        });

        console.log('📥 Resposta recebida:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ Erro na resposta:', errorData);
          return { 
            success: false, 
            error: errorData.error || errorData.message || 'Erro ao atualizar webhook' 
          };
        }

        const result = await response.json();
        console.log('✅ Resultado final:', result);
        return { success: result.success !== false };
      } else {
        const requestBody = {
          webhook: webhookUrl,
          events: events,
          Active: active,
        };

        console.log('📤 Enviando requisição DIRETA:', {
          url: `${this.apiUrl}/webhook`,
          method: 'PUT',
          body: requestBody
        });

        const response = await fetch(`${this.apiUrl}/webhook`, {
          method: 'PUT',
          headers: {
            'token': token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        console.log('📥 Resposta recebida:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ Erro na resposta:', errorData);
          return { 
            success: false, 
            error: errorData.error || errorData.message || 'Erro ao atualizar webhook' 
          };
        }

        const result = await response.json();
        console.log('✅ Resultado final:', result);
        return { success: result.success !== false };
      }
    } catch (error) {
      console.error('💥 Exceção ao atualizar webhook:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro ao atualizar webhook' 
      };
    }
  }

  /**
   * Verificar se números têm WhatsApp
   * POST /user/check
   */
  async checkUser(
    token: string,
    phoneNumbers: string[]
  ): Promise<{
    success: boolean;
    data?: {
      Users: Array<{
        IsInWhatsapp: boolean;
        JID: string;
        Query: string;
        VerifiedName?: string;
      }>;
    };
    error?: string;
  }> {
    try {
      // Normalizar números antes de verificar e adicionar sufixo JID
      const normalizedPhones = phoneNumbers.map(phone => formatPhoneWithJID(phone));

      if (USE_PROXY && PROXY_URL) {
        const { supabase } = await import('./supabase');
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(`${PROXY_URL}?path=/user/check`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token || ''}`,
            'Content-Type': 'application/json',
            'x-auth-type': 'user',
            'x-instance-token': token,
          },
          body: JSON.stringify({
            Phone: normalizedPhones,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return {
            success: false,
            error: errorData.error || errorData.message || 'Erro ao verificar números',
          };
        }

        const result = await response.json();
        return result;
      } else {
        const response = await fetch(`${this.apiUrl}/user/check`, {
          method: 'POST',
          headers: {
            'token': token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            Phone: normalizedPhones,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return {
            success: false,
            error: errorData.error || errorData.message || 'Erro ao verificar números',
          };
        }

        const result = await response.json();
        return result;
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao verificar números',
      };
    }
  }

  /**
   * Listar grupos
   * GET /group/list
   */
  async listGroups(token: string): Promise<{
    success: boolean;
    data?: {
      Groups: Array<{
        JID: string;
        Name: string;
        Participants: Array<{
          JID: string;
          IsAdmin: boolean;
          IsSuperAdmin: boolean;
        }>;
        OwnerJID: string;
        GroupCreated: string;
        IsAnnounce: boolean;
        IsEphemeral: boolean;
        IsLocked: boolean;
      }>;
    };
    error?: string;
  }> {
    try {
      if (USE_PROXY && PROXY_URL) {
        const { supabase } = await import('./supabase');
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(`${PROXY_URL}?path=/group/list`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session?.access_token || ''}`,
            'x-auth-type': 'user',
            'x-instance-token': token,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return {
            success: false,
            error: errorData.error || errorData.message || 'Erro ao listar grupos',
          };
        }

        const result = await response.json();
        return result;
      } else {
        const response = await fetch(`${this.apiUrl}/group/list`, {
          method: 'GET',
          headers: {
            'token': token,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return {
            success: false,
            error: errorData.error || errorData.message || 'Erro ao listar grupos',
          };
        }

        const result = await response.json();
        return result;
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao listar grupos',
      };
    }
  }

  /**
   * Obter JID e LID para um número de WhatsApp
   * GET /user/lid/{phone}
   */
  async getLID(token: string, phone: string): Promise<{
    success: boolean;
    data?: {
      jid?: string;
      lid?: string;
    };
    error?: string;
  }> {
    try {
      // Remover sufixos e normalizar número
      let cleanPhone = phone;
      if (phone.includes('@')) {
        cleanPhone = phone.split('@')[0];
      }
      cleanPhone = cleanPhoneNumber(cleanPhone);

      if (USE_PROXY && PROXY_URL) {
        const { supabase } = await import('./supabase');
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(`${PROXY_URL}?path=/user/lid/${cleanPhone}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session?.access_token || ''}`,
            'x-auth-type': 'user',
            'x-instance-token': token,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return {
            success: false,
            error: errorData.error || errorData.message || 'Erro ao obter JID/LID',
          };
        }

        const result = await response.json();
        return result;
      } else {
        const response = await fetch(`${this.apiUrl}/user/lid/${cleanPhone}`, {
          method: 'GET',
          headers: {
            'token': token,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return {
            success: false,
            error: errorData.error || errorData.message || 'Erro ao obter JID/LID',
          };
        }

        const result = await response.json();
        return result;
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao obter JID/LID',
      };
    }
  }

  /**
   * Obter todos os contatos da conta
   * GET /user/contacts
   */
  async getContacts(token: string): Promise<{
    success: boolean;
    data?: {
      [jid: string]: {
        BusinessName?: string;
        FirstName?: string;
        Found: boolean;
        FullName?: string;
        PushName?: string;
      };
    };
    error?: string;
  }> {
    try {
      if (USE_PROXY && PROXY_URL) {
        const { supabase } = await import('./supabase');
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(`${PROXY_URL}?path=/user/contacts`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session?.access_token || ''}`,
            'x-auth-type': 'user',
            'x-instance-token': token,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return {
            success: false,
            error: errorData.error || errorData.message || 'Erro ao obter contatos',
          };
        }

        const result = await response.json();
        return result;
      } else {
        const response = await fetch(`${this.apiUrl}/user/contacts`, {
          method: 'GET',
          headers: {
            'token': token,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return {
            success: false,
            error: errorData.error || errorData.message || 'Erro ao obter contatos',
          };
        }

        const result = await response.json();
        return result;
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao obter contatos',
      };
    }
  }

  /**
   * Deletar webhook
   */
  async deleteWebhook(token: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      if (USE_PROXY && PROXY_URL) {
        const { supabase } = await import('./supabase');
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(`${PROXY_URL}?path=/webhook`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session?.access_token || ''}`,
            'x-auth-type': 'user',
            'x-instance-token': token,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return { 
            success: false, 
            error: errorData.error || errorData.message || 'Erro ao deletar webhook' 
          };
        }

        const result = await response.json();
        return { success: result.success !== false };
      } else {
        const response = await fetch(`${this.apiUrl}/webhook`, {
          method: 'DELETE',
          headers: {
            'token': token,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return { 
            success: false, 
            error: errorData.error || errorData.message || 'Erro ao deletar webhook' 
          };
        }

        const result = await response.json();
        return { success: result.success !== false };
      }
    } catch (error) {
      console.error('Erro ao deletar webhook:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro ao deletar webhook' 
      };
    }
  }

}

// Instância singleton
export const whatsappApi = new WhatsAppApiService();


