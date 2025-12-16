/**
 * Cron Jobs - Tarefas agendadas
 * Substitui os cron jobs do Supabase (pg_cron)
 */

import cron from 'node-cron';
import dotenv from 'dotenv';
import { executeScheduledCampaigns } from '../services/campaigns.js';

dotenv.config();

console.log('🕐 Iniciando cron jobs...');

// Executar campanhas agendadas a cada minuto
// Substitui: cron job execute-scheduled-disparos
cron.schedule('* * * * *', async () => {
  try {
    console.log(`[${new Date().toISOString()}] Executando campanhas agendadas...`);
    
    // Chamar diretamente a função (não precisa de HTTP)
    // Isso evita problemas de rede entre containers
    const result = await executeScheduledCampaigns();
    
    console.log(`✅ Campanhas processadas: ${result.processed || 0}`);
  } catch (error) {
    console.error('Erro no cron job de campanhas:', error);
    console.error('Detalhes:', error.message);
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

