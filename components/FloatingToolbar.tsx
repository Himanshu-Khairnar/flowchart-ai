"use client";

import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  Zap,
  Hand,
  Square,
  Circle,
  Diamond,
  Pill,
  Play,
  Square as Stop,
  Pentagon,
  Hexagon,
  Triangle,
  Star,
  Cloud,
  FileText,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ArrowLeftRight,
  StickyNote,
  Database,
  Sparkles,
  Save,
  Download,
  Trash2,
  Globe,
  Lock,
  ArrowUpLeft,
  Image,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";

export type ToolType =
  | "select"
  | "pan"
  | "process"
  | "decision"
  | "terminal-start"
  | "terminal-end"
  | "shape-square"
  | "shape-circle"
  | "shape-diamond"
  | "shape-pill"
  | "shape-parallelogram"
  | "shape-hexagon"
  | "shape-triangle"
  | "shape-star"
  | "shape-cloud"
  | "shape-document"
  | "shape-pentagon"
  | "shape-arrow-right"
  | "shape-arrow-left"
  | "shape-arrow-up"
  | "shape-arrow-down"
  | "shape-arrow-left-right"
  | "stickyNote"
  | "database";

interface FloatingToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  onAIClick: () => void;
  saveStatus: "saved" | "saving" | "unsaved";
  onSave: () => void;
  onExportViewport: () => void;
  onManualSave: () => void;
  onClear: () => void;
  user: { email: string; username?: string } | null;
  flowName: string;
  onNameChange: (name: string) => void;
  flowId?: string | null;
  isPublic?: boolean;
  onTogglePublic?: (isPublic: boolean) => void;
}

interface ToolButton {
  id: ToolType;
  label: string;
  icon: React.ReactNode;
}

const toolGroups: { label: string; tools: ToolButton[] }[] = [
  {
    label: "Tools",
    tools: [
      {
        id: "select",
        label: "Select (V)",
        icon: <ArrowUpLeft size={18} />,
      },
      {
        id: "pan",
        label: "Pan (H)",
        icon: <Hand size={18} />,
      },
    ],
  },
  {
    label: "Flow",
    tools: [
      {
        id: "process",
        label: "Process (P)",
        icon: <Square size={18} />,
      },
      {
        id: "decision",
        label: "Decision (D)",
        icon: <Diamond size={18} />,
      },
      {
        id: "terminal-start",
        label: "Start (S)",
        icon: <Play size={18} style={{ color: "var(--chart-2)" }} />,
      },
      {
        id: "terminal-end",
        label: "End (E)",
        icon: <Stop size={18} style={{ color: "var(--destructive)" }} />,
      },
    ],
  },
  {
    label: "Shapes",
    tools: [
      {
        id: "shape-square",
        label: "Rectangle (R)",
        icon: <Square size={18} />,
      },
      { id: "shape-circle", label: "Circle (C)", icon: <Circle size={18} /> },
      { id: "shape-diamond", label: "Diamond", icon: <Diamond size={18} /> },
      { id: "shape-pill", label: "Pill", icon: <Pill size={18} /> },
      {
        id: "shape-parallelogram",
        label: "Parallelogram",
        icon: <Square size={18} style={{ transform: "skewX(-12deg)" }} />,
      },
      {
        id: "shape-hexagon",
        label: "Hexagon (X)",
        icon: <Hexagon size={18} />,
      },
      {
        id: "shape-triangle",
        label: "Triangle (T)",
        icon: <Triangle size={18} />,
      },
      { id: "shape-star", label: "Star", icon: <Star size={18} /> },
      { id: "shape-cloud", label: "Cloud", icon: <Cloud size={18} /> },
      { id: "shape-document", label: "Document", icon: <FileText size={18} /> },
      {
        id: "shape-pentagon",
        label: "Pentagon",
        icon: <Pentagon size={18} />,
      },
      {
        id: "shape-arrow-right",
        label: "Arrow →",
        icon: <ArrowRight size={18} />,
      },
      {
        id: "shape-arrow-left",
        label: "Arrow ←",
        icon: <ArrowLeft size={18} />,
      },
      { id: "shape-arrow-up", label: "Arrow ↑", icon: <ArrowUp size={18} /> },
      {
        id: "shape-arrow-down",
        label: "Arrow ↓",
        icon: <ArrowDown size={18} />,
      },
      {
        id: "shape-arrow-left-right",
        label: "Arrow ↔",
        icon: <ArrowLeftRight size={18} />,
      },
    ],
  },
  {
    label: "Extras",
    tools: [
      {
        id: "stickyNote",
        label: "Sticky Note (N)",
        icon: <StickyNote size={18} />,
      },
      { id: "database", label: "Database (B)", icon: <Database size={18} /> },
    ],
  },
];

// Keyboard shortcut → tool mapping
const KEY_SHORTCUTS: Record<string, ToolType> = {
  v: "select",
  h: "pan",
  p: "process",
  d: "decision",
  s: "terminal-start",
  e: "terminal-end",
  r: "shape-square",
  c: "shape-circle",
  x: "shape-hexagon",
  t: "shape-triangle",
  n: "stickyNote",
  b: "database",
};

const SAVE_DOT: Record<string, string> = {
  saved: "bg-emerald-500",
  "saved-local": "bg-sky-400",
  saving: "bg-amber-400 animate-pulse",
  unsaved: "bg-muted-foreground/50",
};
const SAVE_LABEL: Record<string, string> = {
  saved: "Saved",
  "saved-local": "Local",
  saving: "Saving…",
  unsaved: "Unsaved",
};

export function FloatingToolbar({
  activeTool,
  onToolChange,
  onAIClick,
  saveStatus,
  onSave,
  onExportViewport,
  onManualSave,
  onClear,
  user,
  flowName,
  onNameChange,
  flowId,
  isPublic,
  onTogglePublic,
}: FloatingToolbarProps) {
  const [tooltip, setTooltip] = useState<string | null>(null);
  const { open: sidebarOpen } = useSidebar();

  // Keyboard shortcuts for tools
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't fire when typing in inputs / textareas
      const tag = (e.target as HTMLElement).tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (e.target as HTMLElement).isContentEditable
      )
        return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      const tool = KEY_SHORTCUTS[e.key.toLowerCase()];
      if (tool) onToolChange(tool);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onToolChange]);

  // Effective save status label — show "Local" when not signed in and status is "saved"
  const effectiveSaveStatus =
    saveStatus === "saved" && !user ? "saved-local" : saveStatus;

  return (
    <>
      {/* ── Bottom toolbar ───────────────────────────────────────── */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-0.5 bg-popover border border-border rounded-2xl shadow-xl px-1.5 py-1 max-w-[95vw] overflow-x-auto">
        {toolGroups.map((group, gi) => (
          <div key={group.label} className="flex items-center gap-0.5">
            {gi > 0 && <div className="w-px h-5 bg-border/70 mx-1" />}
            {group.tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => onToolChange(tool.id)}
                onMouseEnter={() => setTooltip(tool.label)}
                onMouseLeave={() => setTooltip(null)}
                title={tool.label}
                className={[
                  "relative w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150",
                  activeTool === tool.id
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60",
                ].join(" ")}
              >
                <span className={activeTool === tool.id ? "scale-105" : ""}>
                  {tool.icon}
                </span>
                {activeTool === tool.id && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>
        ))}

        {/* Divider + AI button */}
        <div className="w-px h-5 bg-border/70 mx-1" />
        <button
          onClick={onAIClick}
          onMouseEnter={() =>
            setTooltip(user ? "AI Generate" : "Sign in to use AI")
          }
          onMouseLeave={() => setTooltip(null)}
          className={[
            "relative w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150",
            user
              ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
              : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground",
          ].join(" ")}
        >
          <Sparkles size={16} />
          {!user && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-400 border-2 border-popover text-[7px] flex items-center justify-center">
              🔒
            </span>
          )}
        </button>
      </div>

      {/* ── Top HUD ──────────────────────────────────────────────── */}
      <div
        className="fixed top-0 right-0 z-[90] h-14 flex items-center justify-between px-4 md:px-3 bg-background/95 backdrop-blur-sm border-b border-border transition-[left] duration-200 ease-linear"
        style={{ left: sidebarOpen ? "var(--sidebar-width, 16rem)" : "0px" }}
      >
        {/* Left: sidebar toggle + name + save status */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <SidebarTrigger className="shrink-0 text-muted-foreground hover:text-foreground" />
          <input
            value={flowName}
            onChange={(e) => onNameChange(e.target.value)}
            className="text-sm font-semibold text-foreground bg-transparent border-none outline-none px-2 py-1 rounded-md hover:bg-accent/50 focus:bg-accent transition-colors min-w-0 max-w-[200px] truncate"
            placeholder="Untitled Flowchart"
          />
          <div
            className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium shrink-0"
            title={
              effectiveSaveStatus === "saved-local"
                ? "Saved to browser storage — sign in to sync to cloud"
                : undefined
            }
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${SAVE_DOT[effectiveSaveStatus]}`}
            />
            {SAVE_LABEL[effectiveSaveStatus]}
          </div>
        </div>

        {/* Right: actions + user */}
        <div className="flex items-center gap-1.5">
          {/* Save */}
          <Button
            variant="outline"
            size="sm"
            onClick={onManualSave}
            className="gap-1.5 h-8 text-xs"
          >
            <Save size={14} />
            <span className="hidden sm:inline">Save</span>
          </Button>

          {/* Export */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-8 text-xs"
              >
                <Download size={14} />
                <span className="hidden sm:inline">Export</span>
                <ChevronDown size={9} className="opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onClick={onSave}
                className="gap-2 cursor-pointer text-xs"
              >
                <FileText size={13} /> Export as JSON
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onExportViewport}
                className="gap-2 cursor-pointer text-xs"
              >
                <Image size={13} /> Export as PNG
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Public / Private toggle — only when flow is saved and user owns it */}
          {flowId && user && onTogglePublic && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTogglePublic(!isPublic)}
              title={
                isPublic
                  ? "Public — click to make private"
                  : "Private — click to make public"
              }
              className={[
                "gap-1.5 h-8 text-xs",
                isPublic
                  ? "border-emerald-400/60 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                  : "",
              ].join(" ")}
            >
              {isPublic ? <Globe size={14} /> : <Lock size={14} />}
              <span className="hidden sm:inline">
                {isPublic ? "Public" : "Private"}
              </span>
            </Button>
          )}

          {/* New / Clear */}
          <Button
            variant="outline"
            size="sm"
            onClick={onClear}
            className="gap-1.5 h-8 text-xs"
          >
            <Trash2 size={14} />
            <span className="hidden md:inline">New</span>
          </Button>
        </div>
      </div>

      {/* ── Tooltip ───────────────────────────────────────────────── */}
      {tooltip && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-[200] bg-popover border border-border text-foreground text-xs font-medium px-2.5 py-1 rounded-lg shadow-md pointer-events-none whitespace-nowrap">
          {tooltip}
        </div>
      )}
    </>
  );
}
