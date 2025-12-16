import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";

interface PhoneMockupProps {
  message: string;
  recipientName?: string;
  recipientPhone?: string;
  className?: string;
}

export const PhoneMockup = memo(({ message, recipientName = "Maria", recipientPhone = "", className }: PhoneMockupProps) => {
  // Obter data e hora atual formatadas (memoizado para evitar recálculo)
  const { formattedDate, formattedTime } = useMemo(() => {
    const now = new Date();
    return {
      formattedDate: now.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      }),
      formattedTime: now.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
  }, []);
  
  // Personalizar mensagem (memoizado)
  const processedMessage = useMemo(() => {
    let msg = message.replace(/\{\{\s*nome\s*\}\}/gi, recipientName);
    msg = msg.replace(/\{\{\s*telefone\s*\}\}/gi, recipientPhone);
    msg = msg.replace(/\{\{\s*numero\s*\}\}/gi, recipientPhone);
    msg = msg.replace(/\{\{\s*data\s*\}\}/gi, formattedDate);
    msg = msg.replace(/\{\{\s*hora\s*\}\}/gi, formattedTime);
    return msg;
  }, [message, recipientName, recipientPhone, formattedDate, formattedTime]);

  return (
    <div className={cn("glass rounded-2xl p-4", className)}>
      <div className="text-xs text-muted-foreground mb-2">Preview WhatsApp</div>
      <div className="bg-[#0a0a0f] rounded-xl p-4 space-y-2">
        <div className="flex justify-end">
          <div className="bg-[#005c4b] text-white rounded-lg rounded-tr-none p-3 max-w-[80%]">
            <p className="text-sm whitespace-pre-wrap">{processedMessage || "Sua mensagem aparecerá aqui..."}</p>
          </div>
        </div>
      </div>
    </div>
  );
});
PhoneMockup.displayName = 'PhoneMockup';
