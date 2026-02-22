"use client";

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  ReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  Position,
  Handle,
  useReactFlow,
  ReactFlowProvider,
  BackgroundVariant,
  ConnectionLineType,
  ConnectionMode,
  MarkerType,
  NodeResizer,
  getNodesBounds,
  getViewportForBounds,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toPng } from "html-to-image";
import { saveFlowToDb, loadFlowFromDb } from "@/lib/db/flows";
import { supabase, getSessionSafe } from "@/lib/supabase";
import type { FlowData } from "@/types/flow";
import { ShapeNode } from "./nodes/ShapeNode";
import { StickyNoteNode } from "./nodes/StickyNoteNode";
import { DatabaseNode } from "./nodes/DatabaseNode";
import type { ToolType } from "./FloatingToolbar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function ProcessNode({
  data,
  id,
  selected,
  width,
  height,
}: {
  data: any;
  id: string;
  selected?: boolean;
  width?: number;
  height?: number;
}) {
  const w = width || 160;
  const h = height || 50;

  const onChange = useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) =>
      data.onChange?.(id, evt.target.value),
    [id, data],
  );

  return (
    <div
      className="bg-card border-2 border-border rounded-lg shadow-sm flex items-center justify-center box-border transition-shadow hover:shadow-md"
      style={{
        width: w,
        height: h,
        minWidth: 80,
        minHeight: 36,
      }}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={80}
        minHeight={36}
        lineStyle={{
          borderColor: "var(--primary)",
          borderWidth: 1,
          opacity: 0.6,
        }}
        handleStyle={{
          width: 8,
          height: 8,
          borderRadius: 2,
          background: "var(--primary)",
          border: "1.5px solid var(--background)",
        }}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="t"
        className="w-2 h-2 !bg-muted-foreground !border-2 !border-background hover:!bg-primary transition-colors"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="l"
        className="w-2 h-2 !bg-muted-foreground !border-2 !border-background hover:!bg-primary transition-colors"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="b"
        className="w-2 h-2 !bg-muted-foreground !border-2 !border-background hover:!bg-primary transition-colors"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="r"
        className="w-2 h-2 !bg-muted-foreground !border-2 !border-background hover:!bg-primary transition-colors"
      />

      <input
        className="nodrag bg-transparent border-none text-center text-sm font-medium w-[90%] outline-none text-card-foreground placeholder:text-muted-foreground/50"
        value={data.label || ""}
        onChange={onChange}
        placeholder="Process"
      />
    </div>
  );
}

function DecisionNode({
  data,
  id,
  selected,
  width,
  height,
}: {
  data: any;
  id: string;
  selected?: boolean;
  width?: number;
  height?: number;
}) {
  const w = width || 130;
  const h = height || 130;

  const onChange = useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) =>
      data.onChange?.(id, evt.target.value),
    [id, data],
  );

  return (
    <div
      style={{
        position: "relative",
        width: w,
        height: h,
        minWidth: 80,
        minHeight: 80,
      }}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={80}
        minHeight={80}
        lineStyle={{
          borderColor: "var(--chart-3)",
          borderWidth: 1,
          opacity: 0.6,
        }}
        handleStyle={{
          width: 8,
          height: 8,
          borderRadius: 2,
          background: "var(--chart-3)",
          border: "1.5px solid var(--background)",
        }}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="t"
        className="!bg-chart-3 !border-2 !border-background z-10 w-2 h-2"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="yes"
        className="!bg-emerald-500 !border-2 !border-background z-10 w-2 h-2"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="no"
        className="!bg-rose-500 !border-2 !border-background z-10 w-2 h-2"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="l"
        className="!bg-chart-3 !border-2 !border-background z-10 w-2 h-2"
      />

      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="absolute top-0 left-0 drop-shadow-sm"
        style={{ overflow: "visible" }}
      >
        <polygon
          points={`${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`}
          className="fill-card stroke-2 stroke-chart-3"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <input
          className="nodrag bg-transparent border-none text-center text-xs font-medium w-[60%] outline-none text-card-foreground placeholder:text-muted-foreground/50"
          value={data.label || ""}
          onChange={onChange}
          placeholder="Decision?"
        />
      </div>
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] font-bold text-emerald-600 pointer-events-none bg-background/80 px-1 rounded">
        Yes
      </div>
      <div className="absolute -right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-rose-600 pointer-events-none bg-background/80 px-1 rounded">
        No
      </div>
    </div>
  );
}

function TerminalNode({
  data,
  id,
  selected,
  width,
  height,
}: {
  data: any;
  id: string;
  selected?: boolean;
  width?: number;
  height?: number;
}) {
  const isStart = data.terminalType !== "end";
  // Using tailwind colors via style or className would be better, but dynamic is tricky.
  // We'll stick to CSS vars but cleaner.
  const color = isStart ? "var(--chart-2)" : "var(--destructive)";

  const w = width || 130;
  const h = height || 44;

  const onChange = useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) =>
      data.onChange?.(id, evt.target.value),
    [id, data],
  );

  return (
    <div
      className="bg-card border-2 rounded-full shadow-sm flex items-center justify-center box-border transition-shadow hover:shadow-md"
      style={{
        borderColor: color,
        width: w,
        height: h,
        minWidth: 80,
        minHeight: 32,
      }}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={80}
        minHeight={32}
        lineStyle={{ borderColor: color, borderWidth: 1, opacity: 0.6 }}
        handleStyle={{
          width: 8,
          height: 8,
          borderRadius: 2,
          background: color,
          border: "1.5px solid var(--background)",
        }}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="t"
        className="!border-2 !border-background w-2 h-2"
        style={{ background: color }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="l"
        className="!border-2 !border-background w-2 h-2"
        style={{ background: color }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="b"
        className="!border-2 !border-background w-2 h-2"
        style={{ background: color }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="r"
        className="!border-2 !border-background w-2 h-2"
        style={{ background: color }}
      />

      <input
        className="nodrag bg-transparent border-none text-center text-sm font-bold w-[80%] outline-none"
        style={{ color }}
        value={data.label || ""}
        onChange={onChange}
        placeholder={isStart ? "Start" : "End"}
      />
    </div>
  );
}

function InputNode({
  data,
  id,
  selected,
  width,
  height,
}: {
  data: any;
  id: string;
  selected?: boolean;
  width?: number;
  height?: number;
}) {
  return (
    <TerminalNode
      data={{ ...data, terminalType: "start" }}
      id={id}
      selected={selected}
      width={width}
      height={height}
    />
  );
}
function OutputNode({
  data,
  id,
  selected,
  width,
  height,
}: {
  data: any;
  id: string;
  selected?: boolean;
  width?: number;
  height?: number;
}) {
  return (
    <TerminalNode
      data={{ ...data, terminalType: "end" }}
      id={id}
      selected={selected}
      width={width}
      height={height}
    />
  );
}

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

function toolToNodeConfig(
  tool: ToolType,
): { type: string; data: Record<string, any> } | null {
  switch (tool) {
    case "process":
      return { type: "process", data: { label: "Process" } };
    case "decision":
      return { type: "decision", data: { label: "Decision?" } };
    case "terminal-start":
      return {
        type: "terminal",
        data: { label: "Start", terminalType: "start" },
      };
    case "terminal-end":
      return { type: "terminal", data: { label: "End", terminalType: "end" } };
    case "stickyNote":
      return {
        type: "stickyNote",
        data: { label: "Note...", color: "#fef08a" },
      };
    case "database":
      return {
        type: "database",
        data: {
          label: "table_name",
          columns: [
            { name: "id", type: "uuid", isPrimary: true },
            { name: "created_at", type: "timestamp" },
          ],
        },
      };
    default:
      if (tool.startsWith("shape-")) {
        const shape = tool.replace("shape-", "");
        return {
          type: "shape",
          data: { shape, label: shape, color: "primary" },
        };
      }
      return null;
  }
}

interface FlowContentProps {
  activeTool: ToolType;
  onToolUsed: () => void;
  onSaveStatusChange: (status: "saved" | "saving" | "unsaved") => void;
  onFlowIdCreated?: (id: string) => void;
  imperativeRef: React.Ref<FlowCanvasHandle>;
  initialId?: string;
}

export interface FlowCanvasHandle {
  handleExport: () => void;
  handleManualSave: () => void;
  handleClear: () => void;
  loadAIFlowchart: (data: FlowData) => void;
  updateName: (name: string) => void;
  getName: () => string;
  handleExportImage: () => void;
  handleExportViewport: () => void;
}

const nodeTypes: Record<string, React.ComponentType<any>> = {
  process: ProcessNode,
  decision: DecisionNode,
  terminal: TerminalNode,
  input: InputNode,
  output: OutputNode,
  shape: ShapeNode,
  stickyNote: StickyNoteNode,
  database: DatabaseNode,
};

function FlowContent({
  activeTool,
  onToolUsed,
  onSaveStatusChange,
  imperativeRef,
  initialId,
  onFlowIdCreated,
}: FlowContentProps) {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [flowName, setFlowName] = useState<string>("Untitled Flowchart");
  const [currentFlowId, setCurrentFlowId] = useState<string | null>(
    initialId || null,
  );
  const [saveError, setSaveError] = useState<string | null>(null);

  const { screenToFlowPosition, getNodes, getEdges, getViewport } =
    useReactFlow();
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const saveStatusRef = useRef<"saved" | "saving" | "unsaved">("saved");
  // Ref mirrors currentFlowId so auto-save can read it without being in the dep array
  const currentFlowIdRef = useRef<string | null>(initialId || null);
  // Prevents auto-save from firing during initial data load
  const isLoadingRef = useRef(false);
  // Ref for onFlowIdCreated so it never appears in auto-save deps
  // (inline arrow functions in the parent change identity every render, which would
  //  cancel the 3-second timer before the save ever completes)
  const onFlowIdCreatedRef = useRef(onFlowIdCreated);
  useEffect(() => {
    onFlowIdCreatedRef.current = onFlowIdCreated;
  }, [onFlowIdCreated]);

  const setSaveStatus = useCallback(
    (status: "saved" | "saving" | "unsaved") => {
      saveStatusRef.current = status;
      onSaveStatusChange(status);
    },
    [onSaveStatusChange],
  );

  const handleNodeChange = useCallback((nodeId: string, newLabel: string) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, label: newLabel } } : n,
      ),
    );
  }, []);

  const handleNodeDataChange = useCallback(
    (nodeId: string, newData: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n,
        ),
      );
    },
    [],
  );

  const attachCallbacks = useCallback(
    (nds: Node[]) =>
      nds.map((n) => ({
        ...n,
        data: {
          ...n.data,
          onChange: handleNodeChange,
          onDataChange: handleNodeDataChange,
        },
      })),
    [handleNodeChange, handleNodeDataChange],
  );

  useEffect(() => {
    const loadData = async () => {
      isLoadingRef.current = true;

      if (initialId) {
        setCurrentFlowId(initialId);
        currentFlowIdRef.current = initialId;
        const result = await loadFlowFromDb(initialId);
        if (result.success && result.data) {
          setNodes(attachCallbacks(result.data.nodes));
          setEdges(result.data.edges);
          if (result.data.name) setFlowName(result.data.name);
        } else {
          localStorage.removeItem("flowchart-id");
          localStorage.removeItem("flowchart-data");
          currentFlowIdRef.current = null;
          setCurrentFlowId(null);
          setNodes([]);
          setEdges([]);
          setFlowName("Untitled Flowchart");
        }
      } else {
        setCurrentFlowId(null);
        currentFlowIdRef.current = null;

        const savedFlow = localStorage.getItem("flowchart-data");
        const savedFlowId = localStorage.getItem("flowchart-id");

        if (savedFlowId && !initialId) {
          setNodes([]);
          setEdges([]);
          setFlowName("Untitled Flowchart");
        } else if (savedFlow) {
          try {
            const { nodes: sn, edges: se, name } = JSON.parse(savedFlow);
            setNodes(attachCallbacks(sn || []));
            setEdges(se || []);
            setFlowName(name || "Untitled Flowchart");
          } catch {
            setNodes([]);
            setEdges([]);
            setFlowName("Untitled Flowchart");
          }
        } else {
          setNodes([]);
          setEdges([]);
          setFlowName("Untitled Flowchart");
        }
      }

      setTimeout(() => {
        isLoadingRef.current = false;
      }, 200);
    };

    loadData();
  }, [initialId, attachCallbacks]);

  useEffect(() => {
    localStorage.setItem(
      "flowchart-data",
      JSON.stringify({ nodes, edges, name: flowName }),
    );
  }, [nodes, edges, flowName]);

  useEffect(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    if (isLoadingRef.current) return;

    if (nodes.length > 0 || edges.length > 0) {
      setSaveStatus("unsaved");
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      if (nodes.length === 0 && edges.length === 0) {
        setSaveStatus("saved");
        return;
      }

      const { session } = await getSessionSafe();
      if (!session?.user) {
        setSaveStatus("saved");
        return;
      }

      setSaveStatus("saving");
      const flowData: FlowData = {
        nodes,
        edges,
        name: flowName,
        updatedAt: new Date().toISOString(),
      };

      const result = await saveFlowToDb(
        flowData,
        currentFlowIdRef.current || undefined,
      );

      if (result.success && result.id) {
        setSaveStatus("saved");
        if (!currentFlowIdRef.current) {
          currentFlowIdRef.current = result.id;
          setCurrentFlowId(result.id);
          localStorage.setItem("flowchart-id", result.id);
          onFlowIdCreatedRef.current?.(result.id);
        }
      } else if (!result.success) {
        setSaveStatus("unsaved");
        console.error("Auto-save error:", result.error);
      }
    }, 1000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [nodes, edges, setSaveStatus, flowName]);

  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: {
          ...n.data,
          onChange: handleNodeChange,
          onDataChange: handleNodeDataChange,
        },
      })),
    );
  }, [handleNodeChange, handleNodeDataChange]);

  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!currentFlowId) return;

    const channel = supabase.channel(`room_${currentFlowId}`);

    channel
      .on("broadcast", { event: "nodes-change" }, ({ payload }) => {
        setNodes((nds) => applyNodeChanges(payload, nds));
      })
      .on("broadcast", { event: "edges-change" }, ({ payload }) => {
        setEdges((eds) => applyEdgeChanges(payload, eds));
      })
      .on("broadcast", { event: "node-add" }, ({ payload }) => {
        setNodes((nds) => [...nds, payload]);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [currentFlowId]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
    channelRef.current?.send({
      type: "broadcast",
      event: "nodes-change",
      payload: changes,
    });
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
    channelRef.current?.send({
      type: "broadcast",
      event: "edges-change",
      payload: changes,
    });
  }, []);

  const onConnect = useCallback((connection: Connection) => {
    const newEdge: Edge = {
      ...connection,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { strokeWidth: 2, stroke: "var(--muted-foreground)" },
      id: `edge-${Date.now()}`,
      animated: true,
    } as Edge;
    setEdges((eds) => addEdge(newEdge, eds));
    channelRef.current?.send({
      type: "broadcast",
      event: "edges-change",
      payload: [{ type: "add", item: newEdge }],
    });
  }, []);

  // Click on canvas to add shape (when a tool is active)
  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (activeTool === "select" || activeTool === "pan") return;
      const config = toolToNodeConfig(activeTool);
      if (!config) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const newNode: Node = {
        id: `node-${Date.now()}`,
        type: config.type,
        position: { x: position.x - 80, y: position.y - 40 },
        data: {
          ...config.data,
          onChange: handleNodeChange,
          onDataChange: handleNodeDataChange,
        },
      };
      setNodes((nds) => [...nds, newNode]);
      channelRef.current?.send({
        type: "broadcast",
        event: "node-add",
        payload: newNode,
      });
      onToolUsed();
    },
    [
      activeTool,
      screenToFlowPosition,
      handleNodeChange,
      handleNodeDataChange,
      onToolUsed,
    ],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activeTool !== "select") {
        onToolUsed(); // reset to select
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeTool, onToolUsed]);

  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify({ nodes, edges }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${flowName || "flowchart"}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges, flowName]);

  const getFullFlowCapture = useCallback(
    (outputWidth: number, outputHeight: number, padding = 40) => {
      const viewport = document.querySelector(
        ".react-flow__viewport",
      ) as HTMLElement;
      if (!viewport || nodes.length === 0) return null;

      const bounds = getNodesBounds(nodes);
      const { x, y, zoom } = getViewportForBounds(
        bounds,
        outputWidth,
        outputHeight,
        0.1,
        5,
        padding,
      );

      return {
        viewport,
        style: {
          width: `${outputWidth}px`,
          height: `${outputHeight}px`,
          transform: `translate(${x}px, ${y}px) scale(${zoom})`,
        } as React.CSSProperties,
        outputWidth,
        outputHeight,
      };
    },
    [nodes],
  );

  const handleExportImage = useCallback(() => {
    const bounds = nodes.length > 0 ? getNodesBounds(nodes) : null;
    const aspect = bounds ? bounds.width / bounds.height : 16 / 9;

    const OUTPUT_HEIGHT = 1080;
    const OUTPUT_WIDTH = Math.round(OUTPUT_HEIGHT * aspect);

    const capture = getFullFlowCapture(OUTPUT_WIDTH, OUTPUT_HEIGHT);
    if (!capture) return;

    toPng(capture.viewport, {
      backgroundColor: "var(--background)",
      width: capture.outputWidth,
      height: capture.outputHeight,
      style: capture.style,
    })
      .then((dataUrl) => {
        const link = document.createElement("a");
        link.download = `${flowName || "flowchart"}.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch(console.error);
  }, [flowName, nodes, getFullFlowCapture]);

  const handleExportViewport = useCallback(() => {
    const viewportEl = document.querySelector(
      ".react-flow__viewport",
    ) as HTMLElement;
    const container = document.querySelector(".react-flow") as HTMLElement;
    if (!viewportEl || !container) return;

    const { width, height } = container.getBoundingClientRect();
    const { x, y, zoom } = getViewport();
    const w = Math.round(width);
    const h = Math.round(height);

    const docStyle = getComputedStyle(document.documentElement);
    const bgColor = getComputedStyle(container).backgroundColor || "#ffffff";
    const fgColor = docStyle.getPropertyValue("color") || "#000000";

    toPng(viewportEl, {
      backgroundColor: bgColor,
      width: w,
      height: h,
      style: {
        width: `${w}px`,
        height: `${h}px`,
        transform: `translate(${x}px, ${y}px) scale(${zoom})`,
        color: fgColor,
      },
      filter: (node) => {
        if (node instanceof HTMLElement || node instanceof SVGElement) {
          const computed = getComputedStyle(node);
          if (node.tagName === "text" || node.tagName === "tspan") {
            (node as SVGElement).setAttribute(
              "fill",
              computed.color || fgColor,
            );
          }
        }
        return true;
      },
    })
      .then((dataUrl) => {
        const link = document.createElement("a");
        link.download = `${flowName || "flowchart"}.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch(console.error);
  }, [flowName, getViewport]);

  const handleManualSave = useCallback(async () => {
    const { session } = await getSessionSafe();
    if (!session?.user) {
      localStorage.setItem(
        "flowchart-data",
        JSON.stringify({ nodes, edges, name: flowName }),
      );
      setSaveStatus("saved");
      return;
    }
    setSaveStatus("saving");
    const flowData: FlowData = {
      nodes,
      edges,
      name: flowName,
      updatedAt: new Date().toISOString(),
    };
    const result = await saveFlowToDb(
      flowData,
      currentFlowIdRef.current || undefined,
    );
    if (result.success && result.id) {
      setSaveStatus("saved");
      if (!currentFlowIdRef.current) {
        currentFlowIdRef.current = result.id;
        setCurrentFlowId(result.id);
        localStorage.setItem("flowchart-id", result.id);
        onFlowIdCreatedRef.current?.(result.id);
      }
    } else {
      setSaveStatus("unsaved");
      setSaveError(result.error || "Unknown error occurred while saving.");
    }
  }, [nodes, edges, setSaveStatus, flowName]);

  const handleClear = useCallback(() => {
    localStorage.removeItem("flowchart-data");
    localStorage.removeItem("flowchart-id");
    currentFlowIdRef.current = null;
    setCurrentFlowId(null);
    setNodes([]);
    setEdges([]);
    setFlowName("Untitled Flowchart");
  }, []);

  const loadAIFlowchart = useCallback(
    (aiData: FlowData) => {
      const nodesWithHandlers = aiData.nodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          onChange: handleNodeChange,
          onDataChange: handleNodeDataChange,
        },
      }));
      setNodes(nodesWithHandlers);
      setEdges(aiData.edges);
      if (aiData.name) setFlowName(aiData.name);
      setSaveStatus("unsaved");
    },
    [handleNodeChange, handleNodeDataChange, setSaveStatus],
  );
  useImperativeHandle(imperativeRef, () => ({
    handleExport,
    handleManualSave,
    handleClear,
    loadAIFlowchart,
    updateName: (name: string) => setFlowName(name),
    getName: () => flowName,
    handleExportImage,
    handleExportViewport,
  }));

  const isDrawingTool = activeTool !== "select" && activeTool !== "pan";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        cursor: isDrawingTool ? "crosshair" : "default",
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={onPaneClick}
        deleteKeyCode="Delete"
        connectionLineType={ConnectionLineType.Bezier}
        defaultEdgeOptions={{
          style: { strokeWidth: 2, stroke: "var(--muted-foreground)" },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "var(--muted-foreground)",
          },
          animated: true,
        }}
        panOnDrag={activeTool === "pan" || activeTool === "select"}
        selectionOnDrag={activeTool === "select"}
        nodesDraggable={activeTool === "select"}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        connectionMode={ConnectionMode.Loose}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color="var(--muted-foreground)"
          style={{ opacity: 0.15 }}
        />
        <Controls
          style={{
            bottom: 20,
            right: 20,
            left: "auto",
            borderRadius: 12,
            border: "1px solid var(--border)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            overflow: "hidden",
            backgroundColor: "var(--card)",
            color: "var(--foreground)",
            padding: 2,
          }}
        />
        <MiniMap
          style={{
            bottom: 160,
            right: 20,
            borderRadius: 12,
            border: "1px solid var(--border)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            backgroundColor: "var(--card)",
          }}
          maskColor="var(--background)"
          nodeColor={() => "var(--muted)"}
        />
      </ReactFlow>

      <AlertDialog
        open={!!saveError}
        onOpenChange={(open) => !open && setSaveError(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save Failed</AlertDialogTitle>
            <AlertDialogDescription>{saveError}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Dismiss</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
interface FlowCanvasProps {
  activeTool: ToolType;
  onToolUsed: () => void;
  onSaveStatusChange: (status: "saved" | "saving" | "unsaved") => void;
  onFlowIdCreated?: (id: string) => void;
  initialId?: string;
}

export const FlowCanvas = forwardRef<FlowCanvasHandle, FlowCanvasProps>(
  (
    { activeTool, onToolUsed, onSaveStatusChange, initialId, onFlowIdCreated },
    ref,
  ) => {
    return (
      <ReactFlowProvider>
        <FlowContent
          activeTool={activeTool}
          onToolUsed={onToolUsed}
          onSaveStatusChange={onSaveStatusChange}
          imperativeRef={ref}
          initialId={initialId}
          onFlowIdCreated={onFlowIdCreated}
        />
      </ReactFlowProvider>
    );
  },
);

FlowCanvas.displayName = "FlowCanvas";
