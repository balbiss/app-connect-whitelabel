import { memo } from "react";
import { Handle, Position, NodeProps, useNodeId, useReactFlow } from "reactflow";
import { Video, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const VideoNode = memo(({ data, selected, id }: NodeProps) => {
  const nodeId = useNodeId();
  const { setNodes } = useReactFlow();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    const deleteEvent = new CustomEvent("deleteNode", { detail: { nodeId: id } });
    window.dispatchEvent(deleteEvent);
  };

  const handleVideoUrlChange = (value: string) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              videoUrl: value,
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
    if (!file.type.match(/^video\//i)) {
      alert('Apenas vídeos são suportados');
      return;
    }

    // Converter para base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      handleVideoUrlChange(base64);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      className={`px-3 py-2 shadow-lg rounded-lg border-2 min-w-[200px] max-w-[250px] bg-gradient-to-br from-red-600/20 to-red-800/20 relative ${
        selected ? "border-red-400" : "border-red-600/50"
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
        <Video className="w-3.5 h-3.5 text-red-400" />
        <div className="font-semibold text-xs text-white">Vídeo</div>
      </div>

      <div className="space-y-1.5">
        <div>
          <Label className="text-[10px] text-gray-300">Vídeo (URL ou Base64)</Label>
          <Input
            type="text"
            value={data.videoUrl || ""}
            onChange={(e) => handleVideoUrlChange(e.target.value)}
            placeholder="data:video/mp4;base64,... ou URL"
            className="mt-0.5 text-[10px] bg-black/30 border-red-500/30 text-white h-6"
          />
          <Input
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            className="mt-1 text-[10px] bg-black/30 border-red-500/30 text-white h-6"
          />
        </div>
        <div>
          <Label className="text-[10px] text-gray-300">Legenda (opcional)</Label>
          <Textarea
            value={data.caption || ""}
            onChange={(e) => handleCaptionChange(e.target.value)}
            placeholder="Legenda do vídeo..."
            className="mt-0.5 text-[10px] bg-black/30 border-red-500/30 text-white h-12 resize-none"
            rows={2}
          />
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5" />
    </div>
  );
});

VideoNode.displayName = "VideoNode";



