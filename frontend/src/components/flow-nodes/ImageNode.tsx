import { memo } from "react";
import { Handle, Position, NodeProps, useNodeId, useReactFlow } from "reactflow";
import { Image, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const ImageNode = memo(({ data, selected, id }: NodeProps) => {
  const nodeId = useNodeId();
  const { setNodes } = useReactFlow();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    const deleteEvent = new CustomEvent("deleteNode", { detail: { nodeId: id } });
    window.dispatchEvent(deleteEvent);
  };

  const handleImageUrlChange = (value: string) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              imageUrl: value,
            },
          };
        }
        return node;
      })
    );
  };

  const handleCaptionChange = (value: string) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              caption: value,
            },
          };
        }
        return node;
      })
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.match(/^image\/(jpeg|jpg|png)$/i)) {
      alert('Apenas imagens JPEG ou PNG são suportadas');
      return;
    }

    // Converter para base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      handleImageUrlChange(base64);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      className={`px-3 py-2 shadow-lg rounded-lg border-2 min-w-[200px] max-w-[250px] bg-gradient-to-br from-pink-600/20 to-pink-800/20 relative ${
        selected ? "border-pink-400" : "border-pink-600/50"
      }`}
    >
      {/* Botão deletar */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDelete}
        className="absolute -top-2 -right-2 h-5 w-5 p-0 rounded-full bg-red-500/80 hover:bg-red-500 border border-red-400 z-10"
        title="Deletar (ou pressione Delete/Backspace)"
      >
        <X className="w-3 h-3 text-white" />
      </Button>
      <Handle type="target" position={Position.Top} className="w-2.5 h-2.5" />
      
      <div className="flex items-center gap-1.5 mb-1.5">
        <Image className="w-3.5 h-3.5 text-pink-400" />
        <div className="font-semibold text-xs text-white">Imagem</div>
      </div>

      <div className="space-y-1.5">
        <div>
          <Label className="text-[10px] text-gray-300">Imagem (URL ou Base64)</Label>
          <Input
            type="text"
            value={data.imageUrl || ""}
            onChange={(e) => handleImageUrlChange(e.target.value)}
            placeholder="data:image/jpeg;base64,... ou URL"
            className="mt-0.5 text-[10px] bg-black/30 border-pink-500/30 text-white h-6"
          />
          <Input
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            onChange={handleFileChange}
            className="mt-1 text-[10px] bg-black/30 border-pink-500/30 text-white h-6"
          />
        </div>
        <div>
          <Label className="text-[10px] text-gray-300">Legenda (opcional)</Label>
          <Textarea
            value={data.caption || ""}
            onChange={(e) => handleCaptionChange(e.target.value)}
            placeholder="Legenda da imagem..."
            className="mt-0.5 text-[10px] bg-black/30 border-pink-500/30 text-white h-12 resize-none"
            rows={2}
          />
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5" />
    </div>
  );
});

ImageNode.displayName = "ImageNode";



