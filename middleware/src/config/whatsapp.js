/**
 * Configuração da API WhatsApp (Wuazap)
 */

const whatsappConfig = {
  url: process.env.WHATSAPP_API_URL || 'https://weeb.inoovaweb.com.br',
  timeout: 30000, // 30 segundos
};

export default whatsappConfig;

