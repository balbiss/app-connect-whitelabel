import { memo } from "react";
import { Handle, Position, NodeProps, useNodeId, useReactFlow } from "reactflow";
import { GitBranch, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export const ConditionNode = memo(({ data, selected, id }: NodeProps) => {
  const nodeId = useNodeId();
  const { setNodes } = useReactFlow();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    const deleteEvent = new CustomEvent("deleteNode", { detail: { nodeId: id } });
    window.dispatchEvent(deleteEvent);
  };

  const updateData = (field: string, value: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              [field]: value,
            },
          };
        }
        return node;
      })
    );
  };

  return (
    <div
      className={`px-3 py-2 shadow-lg rounded-lg border-2 min-w-[220px] max-w-[260px] bg-gradient-to-br from-amber-600/20 to-amber-800/20 relative ${
        selected ? "border-amber-400" : "border-amber-600/50"
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
        <GitBranch className="w-3.5 h-3.5 text-amber-400" />
        <div className="font-semibold text-xs text-white">Condição</div>
      </div>

      <div className="space-y-1.5">
        <div>
          <Label className="text-[10px] text-gray-300">Variável</Label>
          <Input
            value={data.variable || ""}
            onChange={(e) => updateData("variable", e.target.value)}
            placeholder="user_message"
            className="mt-0.5 text-[10px] bg-black/30 border-amber-500/30 text-white h-6"
          />
        </div>

        <div>
          <Label className="text-[10px] text-gray-300">Operador</Label>
          <Select
            value={data.operator || "contains"}
            onValueChange={(value) => updateData("operator", value)}
          >
            <SelectTrigger className="mt-0.5 text-[10px] bg-black/30 border-amber-500/30 text-white h-6">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="equals">Igual a</SelectItem>
              <SelectItem value="contains">Contém</SelectItem>
              <SelectItem value="startsWith">Começa com</SelectItem>
              <SelectItem value="endsWith">Termina com</SelectItem>
              <SelectItem value="greaterThan">Maior que</SelectItem>
              <SelectItem value="lessThan">Menor que</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-[10px] text-gray-300">Valor</Label>
          <Input
            value={data.value || ""}
            onChange={(e) => updateData("value", e.target.value)}
            placeholder="valor"
            className="mt-0.5 text-[10px] bg-black/30 border-amber-500/30 text-white h-6"
          />
        </div>
      </div>

      <div className="mt-2 flex gap-1.5">
        <div className="flex-1">
          <div className="text-[10px] text-green-400 mb-0.5">✓ Sim</div>
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            className="w-2.5 h-2.5 bg-green-500"
            style={{ left: "25%" }}
          />
        </div>
        <div className="flex-1">
          <div className="text-[10px] text-red-400 mb-0.5">✗ Não</div>
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            className="w-2.5 h-2.5 bg-red-500"
            style={{ left: "75%" }}
          />
        </div>
      </div>
    </div>
  );
});

ConditionNode.displayName = "ConditionNode";

