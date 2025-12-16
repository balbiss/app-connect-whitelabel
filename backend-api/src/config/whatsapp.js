/**
 * Configuração da API WhatsApp
 */

import dotenv from 'dotenv';

dotenv.config();

export const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'https://weeb.inoovaweb.com.br';

console.log(`✅ WhatsApp API URL: ${WHATSAPP_API_URL}`);

