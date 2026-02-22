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
  Plus,
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
        icon: <Play size={18} className="text-emerald-500" />,
      },
      {
        id: "terminal-end",
        label: "End (E)",
        icon: <Stop size={18} className="text-red-500" />,
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

  const effectiveSaveStatus =
    saveStatus === "saved" && !user ? "saved-local" : saveStatus;

  return (
    <>
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-0.5 bg-background/80 backdrop-blur-xl border border-border/50 rounded-full shadow-2xl px-2 py-1.5 max-w-[95%] overflow-x-auto ring-1 ring-black/5 dark:ring-white/5 transition-all">
        {toolGroups.map((group, gi) => (
          <div key={group.label} className="flex items-center gap-0.5">
            {gi > 0 && <div className="w-px h-5 bg-border mx-1" />}
            {group.tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => onToolChange(tool.id)}
                onMouseEnter={() => setTooltip(tool.label)}
                onMouseLeave={() => setTooltip(null)}
                title={tool.label}
                className={[
                  "relative w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200",
                  activeTool === tool.id
                    ? "bg-primary text-primary-foreground shadow-sm scale-105"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                ].join(" ")}
              >
                {/* Scale icons down slightly */}
                <div className="scale-90">
                  {tool.icon}
                </div>
              </button>
            ))}
          </div>
        ))}
      </div>

      <div
        className="absolute top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-4 bg-background/80 backdrop-blur-md border-b border-border/50"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <SidebarTrigger className="shrink-0 text-muted-foreground hover:text-foreground transition-colors" />
          <div className="h-6 w-px bg-border/60" />
          <input
            value={flowName}
            onChange={(e) => onNameChange(e.target.value)}
            className="text-sm font-medium text-foreground bg-transparent border-none outline-none px-2 py-1 rounded-md hover:bg-muted/50 focus:bg-muted transition-colors min-w-0 max-w-[240px] truncate"
            placeholder="Untitled Flowchart"
          />
          <div
            className="hidden sm:flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/80 shrink-0 select-none"
            title={
              effectiveSaveStatus === "saved-local"
                ? "Saved to browser storage — sign in to sync to cloud"
                : undefined
            }
          >
            <span
              className={`w-2 h-2 rounded-full ${SAVE_DOT[effectiveSaveStatus]} shadow-sm`}
            />
            {SAVE_LABEL[effectiveSaveStatus]}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Save */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onManualSave}
            className="gap-2 h-9 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <Save size={16} />
            <span className="hidden sm:inline">Save</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 h-9 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <Download size={16} />
                <span className="hidden sm:inline">Export</span>
                <ChevronDown size={10} className="opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={onSave}
                className="gap-2 cursor-pointer text-xs"
              >
                <FileText size={14} /> Export JSON
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onExportViewport}
                className="gap-2 cursor-pointer text-xs"
              >
                <Image size={14} /> Export PNG
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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
                "gap-2 h-9 text-xs border-dashed",
                isPublic
                  ? "border-emerald-500/50 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                  : "text-muted-foreground",
              ].join(" ")}
            >
              {isPublic ? <Globe size={14} /> : <Lock size={14} />}
              <span className="hidden sm:inline">
                {isPublic ? "Public" : "Private"}
              </span>
            </Button>
          )}

          <div className="h-6 w-px bg-border/60 mx-1" />

          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="gap-2 h-9 text-xs font-medium hover:bg-muted"
          >
            <Plus size={16} />
            <span className="hidden md:inline">New</span>
          </Button>
        </div>
      </div>

      {tooltip && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[200] bg-foreground text-background text-xs font-medium px-3 py-1.5 rounded-full shadow-lg pointer-events-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-200">
          {tooltip}
        </div>
      )}
    </>
  );
}
