/**
 * Cron Jobs - Tarefas agendadas
 * Substitui os cron jobs do Supabase (pg_cron)
 */

import cron from 'node-cron';
import dotenv from 'dotenv';
import { executeScheduledCampaigns } from '../services/campaigns.js';

dotenv.config();

const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:3001';

console.log('🕐 Iniciando cron jobs...');

// Executar campanhas agendadas a cada minuto
// Substitui: cron job execute-scheduled-disparos
cron.schedule('* * * * *', async () => {
  try {
    console.log(`[${new Date().toISOString()}] Executando campanhas agendadas...`);
    
    // Chamar a API local (ou pode chamar diretamente a função)
    const response = await fetch(`${BACKEND_API_URL}/api/campaigns/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Erro ao executar campanhas:', error);
      return;
    }

    const result = await response.json();
    console.log(`✅ Campanhas processadas: ${result.processed || 0}`);
  } catch (error) {
    console.error('Erro no cron job de campanhas:', error);
  }
}, {
  scheduled: true,
  timezone: 'UTC',
});

console.log('✅ Cron jobs iniciados:');
console.log('   - Executar campanhas agendadas: a cada minuto');

// Manter processo vivo
process.on('SIGTERM', () => {
  console.log('🛑 Encerrando cron jobs...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Encerrando cron jobs...');
  process.exit(0);
});

