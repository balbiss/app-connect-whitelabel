import { memo } from "react";
import { Handle, Position, NodeProps, useNodeId, useReactFlow } from "reactflow";
import { MessageSquare, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export const MessageNode = memo(({ data, selected, id }: NodeProps) => {
  const nodeId = useNodeId();
  const { setNodes } = useReactFlow();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    const deleteEvent = new CustomEvent("deleteNode", { detail: { nodeId: id } });
    window.dispatchEvent(deleteEvent);
  };

  const handleTextChange = (value: string) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              text: value,
            },
          };
        }
        return node;
      })
    );
  };

  return (
    <div
      className={`px-3 py-2 shadow-lg rounded-lg border-2 min-w-[200px] max-w-[250px] bg-gradient-to-br from-purple-600/20 to-purple-800/20 relative ${
        selected ? "border-purple-400" : "border-purple-600/50"
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
        <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
        <div className="font-semibold text-xs text-white">Mensagem</div>
      </div>

      <div className="space-y-1.5">
        <div>
          <Label className="text-[10px] text-gray-300">Texto</Label>
          <Textarea
            value={data.text || ""}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Digite a mensagem..."
            className="mt-0.5 text-[10px] bg-black/30 border-purple-500/30 text-white h-16 resize-none"
            rows={2}
          />
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5" />
    </div>
  );
});

MessageNode.displayName = "MessageNode";

