-- ============================================
-- TEMPLATES DE MENSAGENS DE NOTIFICAÇÃO
-- ============================================

-- Adicionar campos de templates de mensagens na tabela appointment_settings
ALTER TABLE public.appointment_settings
ADD COLUMN IF NOT EXISTS message_template_confirmed TEXT,
ADD COLUMN IF NOT EXISTS message_template_completed TEXT,
ADD COLUMN IF NOT EXISTS message_template_cancelled TEXT,
ADD COLUMN IF NOT EXISTS message_template_no_show TEXT,
ADD COLUMN IF NOT EXISTS message_template_professional_confirmed TEXT,
ADD COLUMN IF NOT EXISTS message_template_professional_completed TEXT,
ADD COLUMN IF NOT EXISTS message_template_professional_cancelled TEXT,
ADD COLUMN IF NOT EXISTS message_template_professional_no_show TEXT;

-- Valores padrão para mensagens de cliente
UPDATE public.appointment_settings
SET 
  message_template_confirmed = COALESCE(message_template_confirmed, '🔔 *Atualização do seu Agendamento*\n\n✅ Seu agendamento foi *confirmado*!\n\n📅 *Data:* {{date}}\n🕐 *Horário:* {{time}}\n💼 *Serviço:* {{service}}\n💰 *Valor Total:* {{amount}}\n\nEstamos ansiosos para atendê-lo! 🎯'),
  message_template_completed = COALESCE(message_template_completed, '🔔 *Atualização do seu Agendamento*\n\n✅ Seu agendamento foi *concluído*!\n\n📅 *Data:* {{date}}\n🕐 *Horário:* {{time}}\n💼 *Serviço:* {{service}}\n💰 *Valor Total:* {{amount}}\n\nObrigado por escolher nossos serviços! 🙏'),
  message_template_cancelled = COALESCE(message_template_cancelled, '🔔 *Atualização do seu Agendamento*\n\n❌ Seu agendamento foi *cancelado*.\n\n📅 *Data:* {{date}}\n🕐 *Horário:* {{time}}\n💼 *Serviço:* {{service}}\n💰 *Valor Total:* {{amount}}\n\nEntre em contato conosco se tiver dúvidas.'),
  message_template_no_show = COALESCE(message_template_no_show, '🔔 *Atualização do seu Agendamento*\n\n⚠️ Seu agendamento foi marcado como *não compareceu*.\n\n📅 *Data:* {{date}}\n🕐 *Horário:* {{time}}\n💼 *Serviço:* {{service}}\n💰 *Valor Total:* {{amount}}\n\nEntre em contato conosco se tiver dúvidas.')
WHERE message_template_confirmed IS NULL OR message_template_completed IS NULL OR message_template_cancelled IS NULL OR message_template_no_show IS NULL;

-- Valores padrão para mensagens de profissional
UPDATE public.appointment_settings
SET 
  message_template_professional_confirmed = COALESCE(message_template_professional_confirmed, '🔔 *Atualização de Agendamento*\n\n✅ Agendamento *confirmado*:\n\n👤 *Cliente:* {{client_name}}\n📞 *Telefone:* {{client_phone}}\n📅 *Data:* {{date}}\n🕐 *Horário:* {{time}}\n💼 *Serviço:* {{service}}\n💰 *Valor Total:* {{amount}}\n\nPrepare-se para o atendimento! 🎯'),
  message_template_professional_completed = COALESCE(message_template_professional_completed, '🔔 *Atualização de Agendamento*\n\n✅ Agendamento *concluído*:\n\n👤 *Cliente:* {{client_name}}\n📞 *Telefone:* {{client_phone}}\n📅 *Data:* {{date}}\n🕐 *Horário:* {{time}}\n💼 *Serviço:* {{service}}\n💰 *Valor Total:* {{amount}}\n\nAtendimento finalizado com sucesso! ✅'),
  message_template_professional_cancelled = COALESCE(message_template_professional_cancelled, '🔔 *Atualização de Agendamento*\n\n❌ Agendamento *cancelado*:\n\n👤 *Cliente:* {{client_name}}\n📞 *Telefone:* {{client_phone}}\n📅 *Data:* {{date}}\n🕐 *Horário:* {{time}}\n💼 *Serviço:* {{service}}\n💰 *Valor Total:* {{amount}}'),
  message_template_professional_no_show = COALESCE(message_template_professional_no_show, '🔔 *Atualização de Agendamento*\n\n⚠️ Cliente *não compareceu*:\n\n👤 *Cliente:* {{client_name}}\n📞 *Telefone:* {{client_phone}}\n📅 *Data:* {{date}}\n🕐 *Horário:* {{time}}\n💼 *Serviço:* {{service}}\n💰 *Valor Total:* {{amount}}')
WHERE message_template_professional_confirmed IS NULL OR message_template_professional_completed IS NULL OR message_template_professional_cancelled IS NULL OR message_template_professional_no_show IS NULL;


