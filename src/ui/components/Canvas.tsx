import { useCallback, useMemo, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useSimulationStore } from "../../store/simulationStore";
import { SystemNode, type SystemNodeData } from "./SystemNode";
import { ENVIRONMENT_NODE_ID, type PartType } from "../../engine";

const nodeTypes = { systemNode: SystemNode };

interface CanvasProps {
  selectedEdgeType: string | null;
  onEdgePlaced: () => void;
}

function CanvasInner({ selectedEdgeType, onEdgePlaced }: CanvasProps) {
  const graph = useSimulationStore((s) => s.graph);
  const library = useSimulationStore((s) => s.library);
  const addNode = useSimulationStore((s) => s.addNode);
  const addEdge = useSimulationStore((s) => s.addEdge);
  const removeNode = useSimulationStore((s) => s.removeNode);
  const removeEdge = useSimulationStore((s) => s.removeEdge);
  const moveNode = useSimulationStore((s) => s.moveNode);
  const { screenToFlowPosition } = useReactFlow();
  const [pendingSource, setPendingSource] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ nodes: string[]; edges: string[] }>({ nodes: [], edges: [] });

  const partTypeById = useMemo(() => {
    const map = new Map<string, PartType>();
    for (const p of library?.partTypes ?? []) map.set(p.id, p);
    return map;
  }, [library]);

  const nodes: Node<SystemNodeData>[] = useMemo(
    () =>
      graph.nodes.map((n) => {
        const part = partTypeById.get(n.partType);
        return {
          id: n.id,
          type: "systemNode",
          position: { x: n.x, y: n.y },
          draggable: !n.locked,
          data: {
            label: n.label ?? part?.name ?? n.partType,
            color: part?.color ?? "#888",
            locked: !!n.locked,
            quantities: n.quantities,
            library: library!,
            isPendingSource: pendingSource === n.id,
          },
        };
      }),
    [graph.nodes, partTypeById, library, pendingSource],
  );

  const edges: Edge[] = useMemo(
    () =>
      graph.edges.map((e) => {
        const part = partTypeById.get(e.partType);
        const hasFlowRule = (part?.rules ?? []).some((r) => r.kind === "diffusion" || r.kind === "fixedFlow");
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          type: "straight",
          animated: hasFlowRule,
          label: part?.name,
          style: { stroke: part?.color ?? "#888", strokeWidth: 2 },
          labelStyle: { fill: "var(--fg-muted)", fontSize: 11 },
        };
      }),
    [graph.edges, partTypeById],
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const partType = event.dataTransfer.getData("application/x-part-type");
      if (!partType) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      addNode(partType, position.x, position.y);
    },
    [addNode, screenToFlowPosition],
  );

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (node.id === ENVIRONMENT_NODE_ID && !selectedEdgeType) return;
      if (selectedEdgeType) {
        if (!pendingSource) {
          setPendingSource(node.id);
          return;
        }
        if (pendingSource === node.id) {
          setPendingSource(null);
          return;
        }
        const created = addEdge(selectedEdgeType, pendingSource, node.id);
        setPendingSource(null);
        if (created) onEdgePlaced();
        return;
      }
      setSelected({ nodes: [node.id], edges: [] });
    },
    [selectedEdgeType, pendingSource, addEdge, onEdgePlaced],
  );

  const onEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    setSelected({ nodes: [], edges: [edge.id] });
  }, []);

  const onNodeDragStop = useCallback(
    (_event: unknown, node: Node) => {
      moveNode(node.id, node.position.x, node.position.y);
    },
    [moveNode],
  );

  const onPaneClick = useCallback(() => {
    setPendingSource(null);
    setSelected({ nodes: [], edges: [] });
  }, []);

  const deleteSelected = useCallback(() => {
    for (const id of selected.nodes) removeNode(id);
    for (const id of selected.edges) removeEdge(id);
    setSelected({ nodes: [], edges: [] });
  }, [selected, removeNode, removeEdge]);

  return (
    <div
      className="canvas-wrapper"
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key === "Delete" || e.key === "Backspace") deleteSelected();
        if (e.key === "Escape") onPaneClick();
      }}
      tabIndex={0}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={() => {}}
        onEdgesChange={() => {}}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={onPaneClick}
        nodesConnectable={false}
        fitView
      >
        <Background gap={24} />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable />
      </ReactFlow>
      {selectedEdgeType && (
        <div className="canvas-hint">
          {pendingSource ? "Click the second node to connect it." : "Click the first node to start a connection."}
        </div>
      )}
    </div>
  );
}

export function Canvas(props: CanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
