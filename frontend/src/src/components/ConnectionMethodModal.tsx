import { memo, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, Phone } from "lucide-react";

interface ConnectionMethodModalProps {
  open: boolean;
  onClose: () => void;
  onSelectMethod: (method: 'qr' | 'phone') => void;
  instanceName: string;
}

export const ConnectionMethodModal = memo(({ 
  open, 
  onClose, 
  onSelectMethod,
  instanceName 
}: ConnectionMethodModalProps) => {
  const handleSelectQR = useCallback(() => {
    onSelectMethod('qr');
  }, [onSelectMethod]);

  const handleSelectPhone = useCallback(() => {
    onSelectMethod('phone');
  }, [onSelectMethod]);
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full p-0 bg-[hsl(var(--bg-primary))] border-border/50">
        <div className="glass rounded-2xl p-6 space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-xl font-bold">Conectar Instância</h2>
            <p className="text-sm text-muted-foreground mt-1">{instanceName}</p>
          </div>

          {/* Métodos de Conexão */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              Escolha o método de conexão:
            </p>
            
            <Button
              onClick={handleSelectQR}
              className="w-full h-20 bg-gradient-to-r from-accent-purple to-accent-cyan hover:opacity-90 transition-opacity active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <QrCode className="w-6 h-6" />
                <div className="text-left">
                  <p className="font-semibold">QR Code</p>
                  <p className="text-xs opacity-90">Escaneie com o WhatsApp</p>
                </div>
              </div>
            </Button>

            <Button
              onClick={handleSelectPhone}
              className="w-full h-20 bg-gradient-to-r from-accent-cyan to-accent-purple hover:opacity-90 transition-opacity active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <Phone className="w-6 h-6" />
                <div className="text-left">
                  <p className="font-semibold">Código de Pareamento</p>
                  <p className="text-xs opacity-90">Digite o código no WhatsApp</p>
                </div>
              </div>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});
ConnectionMethodModal.displayName = 'ConnectionMethodModal';

