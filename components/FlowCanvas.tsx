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
import { saveFlowToDb, loadFlowFromDb } from "@/lib/db/flows";
import { supabase, getSessionSafe } from "@/lib/supabase";
import type { FlowData } from "@/types/flow";
import { ShapeNode } from "./nodes/ShapeNode";
import { StickyNoteNode } from "./nodes/StickyNoteNode";
import { DatabaseNode } from "./nodes/DatabaseNode";
import type { ToolType } from "./FloatingToolbar";
import { toPng } from "html-to-image";

// ─── Process Node ────────────────────────────────────────────────────────────
function ProcessNode({ data, id, selected, width, height }: { data: any; id: string; selected?: boolean; width?: number; height?: number }) {
  // Use explicit size only when NodeResizer has set one (> 0); else fall back to natural CSS
  const w = width  || 160;
  const h = height || 50;

  const onChange = useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) => data.onChange?.(id, evt.target.value),
    [id, data]
  );

  return (
    <div
      style={{
        background: "var(--card)", border: "2px solid var(--border)", borderRadius: "var(--radius)",
        width: w, height: h, minWidth: 80, minHeight: 36,
        boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={80} minHeight={36}
        lineStyle={{ borderColor: "var(--primary)", borderWidth: 1, opacity: 0.6 }}
        handleStyle={{ width: 8, height: 8, borderRadius: 2, background: "var(--primary)", border: "1.5px solid var(--background)" }}
      />
      <Handle type="source" position={Position.Top}    id="t" style={{ background: "var(--border)", border: "2px solid var(--background)" }} />
      <Handle type="source" position={Position.Left}   id="l" style={{ background: "var(--border)", border: "2px solid var(--background)" }} />
      <Handle type="source" position={Position.Bottom} id="b" style={{ background: "var(--border)", border: "2px solid var(--background)" }} />
      <Handle type="source" position={Position.Right}  id="r" style={{ background: "var(--border)", border: "2px solid var(--background)" }} />
      
      <input
        className="nodrag"
        value={data.label || ""}
        onChange={onChange}
        placeholder="Process"
        style={{
          background: "transparent", border: "none", textAlign: "center",
          fontSize: 13, fontWeight: 500, width: "90%", outline: "none", color: "var(--foreground)",
        }}
      />
    </div>
  );
}

// ─── Decision Node ────────────────────────────────────────────────────────────
function DecisionNode({ data, id, selected, width, height }: { data: any; id: string; selected?: boolean; width?: number; height?: number }) {
  const w = width  || 130;
  const h = height || 130;

  const onChange = useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) => data.onChange?.(id, evt.target.value),
    [id, data]
  );

  return (
    <div style={{ position: "relative", width: w, height: h, minWidth: 80, minHeight: 80 }}>
      <NodeResizer
        isVisible={selected}
        minWidth={80} minHeight={80}
        lineStyle={{ borderColor: "var(--chart-3)", borderWidth: 1, opacity: 0.6 }}
        handleStyle={{ width: 8, height: 8, borderRadius: 2, background: "var(--chart-3)", border: "1.5px solid var(--background)" }}
      />
      <Handle type="source" position={Position.Top}    id="t" style={{ background: "var(--chart-3)", border: "2px solid var(--background)", zIndex: 10 }} />
      <Handle type="source" position={Position.Bottom} id="yes" style={{ background: "var(--chart-2)", border: "2px solid var(--background)", zIndex: 10 }} />
      <Handle type="source" position={Position.Right}  id="no"  style={{ background: "var(--destructive)", border: "2px solid var(--background)", zIndex: 10 }} />
      <Handle type="source" position={Position.Left}   id="l" style={{ background: "var(--chart-3)", border: "2px solid var(--background)", zIndex: 10 }} />
      
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: "absolute", top: 0, left: 0 }}>
        <polygon
          points={`${w / 2},4 ${w - 4},${h / 2} ${w / 2},${h - 4} 4,${h / 2}`}
          fill="var(--card)" stroke="var(--chart-3)" strokeWidth="2"
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <input
          className="nodrag"
          value={data.label || ""}
          onChange={onChange}
          placeholder="Decision?"
          style={{
            background: "transparent", border: "none", textAlign: "center",
            fontSize: 12, fontWeight: 500, width: "70%", outline: "none", color: "var(--foreground)",
          }}
        />
      </div>
      <div style={{ position: "absolute", bottom: -16, left: "50%", transform: "translateX(-50%)", fontSize: 9, color: "var(--chart-2)", fontWeight: 600, pointerEvents: "none" }}>Yes</div>
      <div style={{ position: "absolute", right: -20, top: "50%", transform: "translateY(-50%)", fontSize: 9, color: "var(--destructive)", fontWeight: 600, pointerEvents: "none" }}>No</div>
    </div>
  );
}

// ─── Terminal Node (Start / End) ──────────────────────────────────────────────
function TerminalNode({ data, id, selected, width, height }: { data: any; id: string; selected?: boolean; width?: number; height?: number }) {
  const isStart = data.terminalType !== "end";
  const color   = isStart ? "var(--chart-2)" : "var(--destructive)";
  const bgColor = isStart ? "var(--background)" : "var(--background)";
  const w = width  || 130;
  const h = height || 44;

  const onChange = useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) => data.onChange?.(id, evt.target.value),
    [id, data]
  );

  return (
    <div
      style={{
        background: bgColor, border: `2px solid ${color}`,
        borderRadius: "100px",
        width: w, height: h, minWidth: 80, minHeight: 32,
        boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `0 2px 8px rgba(0,0,0,0.05)`,
      }}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={80} minHeight={32}
        lineStyle={{ borderColor: color, borderWidth: 1, opacity: 0.6 }}
        handleStyle={{ width: 8, height: 8, borderRadius: 2, background: color, border: "1.5px solid var(--background)" }}
      />
      <Handle type="source" position={Position.Top}    id="t" style={{ background: color, border: "2px solid var(--background)" }} />
      <Handle type="source" position={Position.Left}   id="l" style={{ background: color, border: "2px solid var(--background)" }} />
      <Handle type="source" position={Position.Bottom} id="b" style={{ background: color, border: "2px solid var(--background)" }} />
      <Handle type="source" position={Position.Right}  id="r" style={{ background: color, border: "2px solid var(--background)" }} />
      
      <input
        className="nodrag"
        value={data.label || ""}
        onChange={onChange}
        placeholder={isStart ? "Start" : "End"}
        style={{
          background: "transparent", border: "none", textAlign: "center",
          fontSize: 13, fontWeight: 600, width: "80%", outline: "none", color,
        }}
      />
    </div>
  );
}

// ─── Override built-in input/output with TerminalNode ────────────────────────
function InputNode({ data, id, selected, width, height }: { data: any; id: string; selected?: boolean; width?: number; height?: number }) {
  return <TerminalNode data={{ ...data, terminalType: "start" }} id={id} selected={selected} width={width} height={height} />;
}
function OutputNode({ data, id, selected, width, height }: { data: any; id: string; selected?: boolean; width?: number; height?: number }) {
  return <TerminalNode data={{ ...data, terminalType: "end" }} id={id} selected={selected} width={width} height={height} />;
}

// ─── Initial state ────────────────────────────────────────────────────────────
const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toolToNodeConfig(tool: ToolType): { type: string; data: Record<string, any> } | null {
  switch (tool) {
    case "process":
      return { type: "process", data: { label: "Process" } };
    case "decision":
      return { type: "decision", data: { label: "Decision?" } };
    case "terminal-start":
      return { type: "terminal", data: { label: "Start", terminalType: "start" } };
    case "terminal-end":
      return { type: "terminal", data: { label: "End", terminalType: "end" } };
    case "stickyNote":
      return { type: "stickyNote", data: { label: "Note...", color: "#fef08a" } };
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
        return { type: "shape", data: { shape, label: shape, color: "primary" } };
      }
      return null;
  }
}

// ─── FlowContent ──────────────────────────────────────────────────────────────
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

function FlowContent({ activeTool, onToolUsed, onSaveStatusChange, imperativeRef, initialId, onFlowIdCreated }: FlowContentProps) {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [flowName, setFlowName] = useState<string>("Untitled Flowchart");
  const [currentFlowId, setCurrentFlowId] = useState<string | null>(initialId || null);
  const { screenToFlowPosition, getNodes, getEdges, getViewport } = useReactFlow();
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
  useEffect(() => { onFlowIdCreatedRef.current = onFlowIdCreated; }, [onFlowIdCreated]);

  const setSaveStatus = useCallback(
    (status: "saved" | "saving" | "unsaved") => {
      saveStatusRef.current = status;
      onSaveStatusChange(status);
    },
    [onSaveStatusChange]
  );

  // Node label change handler
  const handleNodeChange = useCallback((nodeId: string, newLabel: string) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, label: newLabel } } : n
      )
    );
  }, []);

  // Generic full-data change handler (used by DatabaseNode for column edits)
  const handleNodeDataChange = useCallback((nodeId: string, newData: Record<string, unknown>) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n
      )
    );
  }, []);

  const attachCallbacks = useCallback((nds: Node[]) =>
    nds.map((n) => ({
      ...n,
      data: { ...n.data, onChange: handleNodeChange, onDataChange: handleNodeDataChange },
    })), [handleNodeChange, handleNodeDataChange]);

  // Handle ID changes, loading data, and state resets
  useEffect(() => {
    const loadData = async () => {
      isLoadingRef.current = true;

      if (initialId) {
        // Load specific flow from DB
        setCurrentFlowId(initialId);
        currentFlowIdRef.current = initialId;
        const result = await loadFlowFromDb(initialId);
        if (result.success && result.data) {
          setNodes(attachCallbacks(result.data.nodes));
          setEdges(result.data.edges);
          if (result.data.name) setFlowName(result.data.name);
        } else {
          // Flow not found (deleted or stale ID) — reset to blank
          localStorage.removeItem("flowchart-id");
          localStorage.removeItem("flowchart-data");
          currentFlowIdRef.current = null;
          setCurrentFlowId(null);
          setNodes([]);
          setEdges([]);
          setFlowName("Untitled Flowchart");
        }
      } else {
        // We are at root (New Flow)
        setCurrentFlowId(null);
        currentFlowIdRef.current = null;

        // Try to recover last unsaved session from localStorage
        const savedFlow = localStorage.getItem("flowchart-data");
        const savedFlowId = localStorage.getItem("flowchart-id");

        if (savedFlowId && !initialId) {
          // Root means a new blank flow — stay clean
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

      // Give React a tick to flush state updates before re-enabling auto-save
      setTimeout(() => {
        isLoadingRef.current = false;
      }, 200);
    };

    loadData();
  }, [initialId, attachCallbacks]);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem("flowchart-data", JSON.stringify({ nodes, edges, name: flowName }));
  }, [nodes, edges, flowName]);

  // Auto-save to DB
  useEffect(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    // Skip auto-save while the initial data is being loaded to avoid false "unsaved" status
    if (isLoadingRef.current) return;

    // Only mark as unsaved if there is actual content to save
    if (nodes.length > 0 || edges.length > 0) {
      setSaveStatus("unsaved");
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      // Don't auto-create empty flows in DB
      if (nodes.length === 0 && edges.length === 0) {
        setSaveStatus("saved");
        return;
      }

      // Skip DB save when not signed in — data is still in localStorage
      const { session } = await getSessionSafe();
      if (!session?.user) {
        setSaveStatus("saved"); // localStorage already persists it
        return;
      }

      setSaveStatus("saving");
      const flowData: FlowData = {
        nodes,
        edges,
        name: flowName,
        updatedAt: new Date().toISOString(),
      };

      // Use ref so changing currentFlowId doesn't re-trigger this effect
      const result = await saveFlowToDb(flowData, currentFlowIdRef.current || undefined);

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
    }, 3000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
    // currentFlowId and onFlowIdCreated intentionally excluded — read via refs
    // to prevent the timer from being cancelled on every parent re-render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, setSaveStatus, flowName]);

  // Keep onChange callbacks updated
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, onChange: handleNodeChange, onDataChange: handleNodeDataChange },
      }))
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

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
      channelRef.current?.send({
        type: "broadcast",
        event: "nodes-change",
        payload: changes,
      });
    },
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
      channelRef.current?.send({
        type: "broadcast",
        event: "edges-change",
        payload: changes,
      });
    },
    []
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge = { ...connection, markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 1.5 }, id: `edge-${Date.now()}` };
      setEdges((eds) => addEdge(newEdge, eds));
      channelRef.current?.send({
        type: "broadcast",
        event: "edges-change",
        payload: [{ type: "add", item: newEdge }],
      });
    },
    []
  );

  // Click on canvas to add shape (when a tool is active)
  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (activeTool === "select" || activeTool === "pan") return;
      const config = toolToNodeConfig(activeTool);
      if (!config) return;

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const newNode: Node = {
        id: `node-${Date.now()}`,
        type: config.type,
        position: { x: position.x - 80, y: position.y - 40 },
        data: { ...config.data, onChange: handleNodeChange, onDataChange: handleNodeDataChange },
      };
      setNodes((nds) => [...nds, newNode]);
      channelRef.current?.send({
        type: "broadcast",
        event: "node-add",
        payload: newNode,
      });
      onToolUsed();
    },
    [activeTool, screenToFlowPosition, handleNodeChange, handleNodeDataChange, onToolUsed]
  );

  // Esc cancels active tool
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

  // Compute a viewport transform that fits ALL nodes into a given output size.
  // Returns null when there are no nodes to export.
  const getFullFlowCapture = useCallback(
    (outputWidth: number, outputHeight: number, padding = 40) => {
      const viewport = document.querySelector(".react-flow__viewport") as HTMLElement;
      if (!viewport || nodes.length === 0) return null;

      const bounds = getNodesBounds(nodes);
      const { x, y, zoom } = getViewportForBounds(
        bounds,
        outputWidth,
        outputHeight,
        0.1,   // minZoom
        4,     // maxZoom
        padding
      );

      return {
        viewport,
        style: {
          width:  `${outputWidth}px`,
          height: `${outputHeight}px`,
          transform: `translate(${x}px, ${y}px) scale(${zoom})`,
        } as React.CSSProperties,
        outputWidth,
        outputHeight,
      };
    },
    [nodes]
  );

  const handleExportImage = useCallback(() => {
    // Compute dimensions that preserve the content's aspect ratio at 2× resolution
    const bounds = nodes.length > 0 ? getNodesBounds(nodes) : null;
    const aspect = bounds ? bounds.width / bounds.height : 16 / 9;

    const OUTPUT_HEIGHT = 1080;
    const OUTPUT_WIDTH  = Math.round(OUTPUT_HEIGHT * aspect);

    const capture = getFullFlowCapture(OUTPUT_WIDTH, OUTPUT_HEIGHT);
    if (!capture) return;

    toPng(capture.viewport, {
      backgroundColor: "var(--background)",
      width:  capture.outputWidth,
      height: capture.outputHeight,
      style:  capture.style,
    }).then((dataUrl) => {
      const link = document.createElement("a");
      link.download = `${flowName || "flowchart"}.png`;
      link.href = dataUrl;
      link.click();
    }).catch(console.error);
  }, [flowName, nodes, getFullFlowCapture]);

  const handleExportViewport = useCallback(() => {
    const viewportEl = document.querySelector(".react-flow__viewport") as HTMLElement;
    const container  = document.querySelector(".react-flow") as HTMLElement;
    if (!viewportEl || !container) return;

    const { width, height } = container.getBoundingClientRect();
    const { x, y, zoom } = getViewport();
    const w = Math.round(width);
    const h = Math.round(height);

    // Resolve actual background + foreground colors so SVG text/edges use the correct theme color
    const docStyle = getComputedStyle(document.documentElement);
    const bgColor  = getComputedStyle(container).backgroundColor || "#ffffff";
    const fgColor  = docStyle.getPropertyValue("color") || "#000000";

    toPng(viewportEl, {
      backgroundColor: bgColor,
      width:  w,
      height: h,
      style: {
        width:     `${w}px`,
        height:    `${h}px`,
        transform: `translate(${x}px, ${y}px) scale(${zoom})`,
        color:     fgColor,
      },
      // Inline SVG fill/stroke for edge labels so they don't fall back to SVG default black
      filter: (node) => {
        if (node instanceof HTMLElement || node instanceof SVGElement) {
          const computed = getComputedStyle(node);
          if (node.tagName === "text" || node.tagName === "tspan") {
            (node as SVGElement).setAttribute("fill", computed.color || fgColor);
          }
        }
        return true;
      },
    }).then((dataUrl) => {
      const link = document.createElement("a");
      link.download = `${flowName || "flowchart"}.png`;
      link.href = dataUrl;
      link.click();
    }).catch(console.error);
  }, [flowName, getViewport]);

  const handleManualSave = useCallback(async () => {
    const { session } = await getSessionSafe();
    if (!session?.user) {
      // Save to localStorage only — data is already auto-saved there, but
      // an explicit manual save also forces a flush and shows "saved" briefly
      localStorage.setItem(
        "flowchart-data",
        JSON.stringify({ nodes, edges, name: flowName })
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
    const result = await saveFlowToDb(flowData, currentFlowIdRef.current || undefined);
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
      alert("Save failed: " + (result.error || "Unknown error"));
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
        data: { ...n.data, onChange: handleNodeChange, onDataChange: handleNodeDataChange },
      }));
      setNodes(nodesWithHandlers);
      setEdges(aiData.edges);
      if (aiData.name) setFlowName(aiData.name);
      // Mark unsaved so auto-save picks it up (AI-generated content should be saved)
      setSaveStatus("unsaved");
    },
    [handleNodeChange, handleNodeDataChange, setSaveStatus]
  );

  // Expose methods via imperative handle
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
          style: { strokeWidth: 1.5, stroke: "#94a3b8" },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
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
          gap={20}
          size={1}
          color="#94a3b8"
          style={{ opacity: 0.4 }}
        />
        <Controls
          style={{
            bottom: 16,
            right: 16,
            left: "auto",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.08)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            overflow: "hidden",
          }}
        />
        <MiniMap
          style={{
            bottom: 16,
            right: 120,
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.08)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
          maskColor="rgba(148, 163, 184, 0.2)"
        />
      </ReactFlow>
    </div>
  );
}

// ─── Public component with forwardRef ─────────────────────────────────────────
interface FlowCanvasProps {
  activeTool: ToolType;
  onToolUsed: () => void;
  onSaveStatusChange: (status: "saved" | "saving" | "unsaved") => void;
  onFlowIdCreated?: (id: string) => void;
  initialId?: string;
}

export const FlowCanvas = forwardRef<FlowCanvasHandle, FlowCanvasProps>(
  ({ activeTool, onToolUsed, onSaveStatusChange, initialId, onFlowIdCreated }, ref) => {
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
  }
);

FlowCanvas.displayName = "FlowCanvas";
