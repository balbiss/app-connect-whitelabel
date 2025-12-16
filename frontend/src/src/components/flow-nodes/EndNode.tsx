import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { StopCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export const EndNode = memo(({ data, selected, id }: NodeProps) => {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    const deleteEvent = new CustomEvent("deleteNode", { detail: { nodeId: id } });
    window.dispatchEvent(deleteEvent);
  };

  return (
    <div
      className={`px-3 py-2 shadow-lg rounded-lg border-2 min-w-[160px] max-w-[200px] bg-gradient-to-br from-red-600/20 to-red-800/20 relative ${
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
      
      <div className="flex items-center gap-1.5">
        <StopCircle className="w-4 h-4 text-red-400" />
        <div className="font-semibold text-xs text-white">Fim</div>
      </div>
      
      <div className="text-[10px] text-gray-400 mt-1.5">
        Finaliza conversa
      </div>
    </div>
  );
});

EndNode.displayName = "EndNode";

