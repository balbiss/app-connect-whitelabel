import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Background,
  Controls,
  MiniMap,
  Connection,
  useNodesState,
  useEdgesState,
  NodeTypes,
  BackgroundVariant,
  ReactFlowInstance,
} from "reactflow";
import "reactflow/dist/style.css";
import { MessageNode } from "./flow-nodes/MessageNode";
import { ConditionNode } from "./flow-nodes/ConditionNode";
import { WaitNode } from "./flow-nodes/WaitNode";
import { ActionNode } from "./flow-nodes/ActionNode";
import { EndNode } from "./flow-nodes/EndNode";
import { ImageNode } from "./flow-nodes/ImageNode";
import { VideoNode } from "./flow-nodes/VideoNode";
import { AudioNode } from "./flow-nodes/AudioNode";
import { TransferNode } from "./flow-nodes/TransferNode";
import { Button } from "@/components/ui/button";
import { Save, Play, Plus, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { toast } from "sonner";

const nodeTypes: NodeTypes = {
  message: MessageNode,
  condition: ConditionNode,
  wait: WaitNode,
  action: ActionNode,
  end: EndNode,
  image: ImageNode,
  video: VideoNode,
  audio: AudioNode,
  transfer: TransferNode,
};

interface FlowBuilderProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onSave: (nodes: Node[], edges: Edge[]) => void;
  onClose?: () => void;
}

export function FlowBuilder({ initialNodes = [], initialEdges = [], onSave, onClose }: FlowBuilderProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  // Listener para deletar nós via botão X
  useEffect(() => {
    const handleDeleteNode = (e: Event) => {
      const customEvent = e as CustomEvent;
      const nodeId = customEvent.detail?.nodeId;
      if (nodeId) {
        setNodes((nds) => nds.filter((n) => n.id !== nodeId));
        setEdges((eds) =>
          eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
        );
      }
    };

    window.addEventListener("deleteNode", handleDeleteNode as EventListener);
    return () => {
      window.removeEventListener("deleteNode", handleDeleteNode as EventListener);
    };
  }, [setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      console.log('🔗 Conexão criada:', {
        source: params.source,
        target: params.target,
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle,
      });
      
      // IMPORTANTE: Garantir que sourceHandle seja preservado (especialmente para condições: true/false)
      // O addEdge do React Flow já preserva o sourceHandle, mas vamos garantir explicitamente
      setEdges((eds) => {
        const newEdge = addEdge({
          ...params,
          // Preservar sourceHandle explicitamente
          sourceHandle: params.sourceHandle,
        }, eds);
        
        console.log('✅ Edge adicionado:', newEdge.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
        })));
        
        return newEdge;
      });
    },
    [setEdges]
  );

  const addNode = useCallback(
    (type: string) => {
      // Pegar viewport atual para adicionar nó próximo ao centro da visualização
      const viewport = reactFlowInstance?.getViewport();
      const centerX = viewport ? -viewport.x / viewport.zoom + window.innerWidth / 2 : 400;
      const centerY = viewport ? -viewport.y / viewport.zoom + window.innerHeight / 2 : 300;
      
      const newNode: Node = {
        id: `node_${Date.now()}`,
        type,
        position: {
          x: centerX - 100,
          y: centerY - 50,
        },
        data: getDefaultNodeData(type),
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes, reactFlowInstance]
  );

  const handleZoomIn = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomIn();
    }
  }, [reactFlowInstance]);

  const handleZoomOut = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomOut();
    }
  }, [reactFlowInstance]);

  const handleFitView = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.fitView();
    }
  }, [reactFlowInstance]);

  const handleSave = useCallback(() => {
    // Validar que há pelo menos um nó inicial
    const hasStartNode = nodes.some((n) => 
      n.type === "message" || 
      n.type === "image" || 
      n.type === "video" || 
      n.type === "audio" || 
      n.type === "end"
    );
    if (!hasStartNode) {
      toast.error("Adicione pelo menos um nó de mensagem, mídia ou fim");
      return;
    }

    // Converter nodes e edges para o formato do banco
    const flowData = {
      nodes: nodes.map((node) => ({
        id: node.id,
        type: node.type,
        data: node.data,
        next: edges
          .filter((e) => e.source === node.id)
          .map((e) => e.target),
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        from: edge.source,
        to: edge.target,
      })),
      startNode: nodes.find((n) => 
        n.type === "message" || 
        n.type === "image" || 
        n.type === "video" || 
        n.type === "audio"
      )?.id || nodes[0]?.id,
    };

    onSave(nodes, edges);
    toast.success("Fluxo salvo com sucesso!");
  }, [nodes, edges, onSave]);

  return (
    <div className="flex flex-col h-full w-full min-h-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-white/10 bg-black/30">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-white">Editor de Fluxo</h3>
          
          {/* Botões de Zoom */}
          <div className="flex items-center gap-1 border border-white/20 rounded-lg p-1 bg-black/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              className="h-8 w-8 p-0 hover:bg-white/10"
              title="Diminuir zoom"
            >
              <ZoomOut className="w-4 h-4 text-white" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFitView}
              className="h-8 w-8 p-0 hover:bg-white/10"
              title="Ajustar visualização"
            >
              <Maximize2 className="w-4 h-4 text-white" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              className="h-8 w-8 p-0 hover:bg-white/10"
              title="Aumentar zoom"
            >
              <ZoomIn className="w-4 h-4 text-white" />
            </Button>
          </div>

          {/* Botões de Adicionar Blocos */}
          <div className="flex gap-1 border border-white/20 rounded-lg p-1 bg-black/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => addNode("message")}
              className="h-8 text-xs px-2 text-white hover:bg-white/10"
            >
              <Plus className="w-3 h-3 mr-1" />
              Mensagem
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => addNode("condition")}
              className="h-8 text-xs px-2 text-white hover:bg-white/10"
            >
              <Plus className="w-3 h-3 mr-1" />
              Condição
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => addNode("wait")}
              className="h-8 text-xs px-2 text-white hover:bg-white/10"
            >
              <Plus className="w-3 h-3 mr-1" />
              Aguardar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => addNode("action")}
              className="h-8 text-xs px-2 text-white hover:bg-white/10"
            >
              <Plus className="w-3 h-3 mr-1" />
              Ação
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => addNode("end")}
              className="h-8 text-xs px-2 text-white hover:bg-white/10"
            >
              <Plus className="w-3 h-3 mr-1" />
              Fim
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => addNode("transfer")}
              className="h-8 text-xs px-2 text-white hover:bg-white/10"
            >
              <Plus className="w-3 h-3 mr-1" />
              Transferir
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => addNode("image")}
              className="h-8 text-xs px-2 text-white hover:bg-white/10"
            >
              <Plus className="w-3 h-3 mr-1" />
              Imagem
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => addNode("video")}
              className="h-8 text-xs px-2 text-white hover:bg-white/10"
            >
              <Plus className="w-3 h-3 mr-1" />
              Vídeo
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => addNode("audio")}
              className="h-8 text-xs px-2 text-white hover:bg-white/10"
            >
              <Plus className="w-3 h-3 mr-1" />
              Áudio
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={handleSave}
            className="bg-gradient-to-r from-accent-purple to-accent-cyan h-10 text-sm px-6 font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            <Save className="w-5 h-5 mr-2" />
            Salvar Fluxo
          </Button>
        </div>
      </div>

      {/* Flow Canvas */}
      <div className="flex-1 relative w-full h-full" style={{ height: "calc(100vh - 120px)" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onInit={(instance) => {
            setReactFlowInstance(instance);
            // Não fazer fitView automaticamente - manter posições salvas
            // Se não tiver nós, fazer fitView
            if (nodes.length === 0) {
              setTimeout(() => instance.fitView(), 100);
            }
          }}
          className="bg-gradient-to-br from-gray-900 to-black"
          zoomOnScroll={true}
          zoomOnPinch={true}
          zoomOnDoubleClick={false}
          panOnScroll={false}
          panOnDrag={true}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          minZoom={0.1}
          maxZoom={3}
          onNodesDelete={(nodesToDelete) => {
            // Remover edges conectados aos nós deletados
            const nodeIds = nodesToDelete.map((n) => n.id);
            setEdges((eds) =>
              eds.filter(
                (edge) => !nodeIds.includes(edge.source) && !nodeIds.includes(edge.target)
              )
            );
          }}
          deleteKeyCode={["Backspace", "Delete"]}
          nodesDraggable={true}
          nodesConnectable={true}
        >
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              switch (node.type) {
                case "message":
                  return "#8b5cf6";
                case "condition":
                  return "#f59e0b";
                case "wait":
                  return "#3b82f6";
                case "action":
                  return "#10b981";
                case "end":
                  return "#ef4444";
                case "image":
                  return "#ec4899";
                case "video":
                  return "#dc2626";
                case "audio":
                  return "#eab308";
                case "transfer":
                  return "#2563eb"; // Azul para transferência
                default:
                  return "#6b7280";
              }
            }}
            className="bg-black/50"
          />
        </ReactFlow>
      </div>
    </div>
  );
}

function getDefaultNodeData(type: string): any {
  switch (type) {
    case "message":
      return { text: "Olá! Como posso ajudar?" };
    case "condition":
      return {
        variable: "user_message",
        operator: "contains",
        value: "",
        true_path: "",
        false_path: "",
      };
    case "wait":
      return { timeout: 300 };
    case "action":
      return {
        action: "save_variable",
        variable: "",
        value: "",
      };
    case "image":
      return { imageUrl: "", caption: "" };
    case "video":
      return { videoUrl: "", caption: "" };
    case "audio":
      return { audioUrl: "" };
    case "transfer":
      return { 
        message: "Entendido! Vou transferir você para um atendente humano. Aguarde um momento..." 
      };
    case "end":
      return {};
    default:
      return {};
  }
}

