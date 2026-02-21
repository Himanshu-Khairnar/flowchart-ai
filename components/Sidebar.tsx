"use client";

import { useEffect, useState } from "react";
import { getAllFlows, deleteFlowFromDb } from "@/lib/db/flows";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  Plus, Trash, FileText, Clock, GitBranch, SignIn,
} from "@phosphor-icons/react";

interface AppSidebarProps {
  onLoadFlow: (flowId: string) => void;
  onNewFlow: () => void;
  currentFlowId: string | null;
  user: any;
  flowName?: string;
  onSignIn?: () => void;
}

function getRelativeTime(dateString: string) {
  try {
    const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (diff < 60)    return "just now";
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch { return "unknown"; }
}

export function AppSidebar({ onLoadFlow, onNewFlow, currentFlowId, user, flowName, onSignIn }: AppSidebarProps) {
  const [flows, setFlows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFlows = async () => {
    if (!user) return;
    setLoading(true);
    const result = await getAllFlows();
    if (result.success && result.data) setFlows(result.data);
    setLoading(false);
  };

  useEffect(() => { fetchFlows(); }, [user, currentFlowId]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this flowchart?")) return;
    const result = await deleteFlowFromDb(id);
    if (result.success) {
      setFlows((f) => f.filter((x) => x.id !== id));
      if (currentFlowId === id) onNewFlow();
    }
  };

  return (
    <Sidebar collapsible="offcanvas">
      {/* ── Header ── */}
      <SidebarHeader className="h-14 flex-row items-center gap-2.5 border-b border-sidebar-border/60 px-4">
        <div className="w-7 h-7 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
          <GitBranch size={14} weight="bold" className="text-sidebar-primary-foreground" />
        </div>
        <span className="font-bold text-sm tracking-tight text-sidebar-foreground flex-1">FlowAI</span>
        <Button
          onClick={onNewFlow}
          size="icon-sm"
          variant="ghost"
          className="text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          title="New flowchart"
        >
          <Plus size={16} weight="bold" />
        </Button>
      </SidebarHeader>

      {/* ── New button ── */}
      <div className="px-3 pt-3 pb-2">
        <Button
          onClick={onNewFlow}
          size="sm"
          className="w-full gap-1.5 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
        >
          <Plus size={14} weight="bold" />
          New Flowchart
        </Button>
      </div>

      <SidebarSeparator />

      {/* ── Flow list ── */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold text-sidebar-foreground/40 uppercase tracking-widest">
            My Charts
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {!user ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 px-4 text-center opacity-50">
                <FileText size={28} className="text-sidebar-foreground/40" />
                <p className="text-xs text-sidebar-foreground/60 leading-snug">
                  Sign in to save &amp; access your charts
                </p>
              </div>
            ) : loading && flows.length === 0 ? (
              <div className="py-10 text-center text-xs text-sidebar-foreground/30 animate-pulse">Loading…</div>
            ) : flows.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 opacity-40">
                <FileText size={28} />
                <p className="text-xs font-medium">No saved charts yet</p>
              </div>
            ) : (
              <SidebarMenu>
                {flows.map((flow) => {
                  const isActive = currentFlowId === flow.id;
                  const displayName = isActive && flowName ? flowName : (flow.name || "Untitled Flow");
                  return (
                    <SidebarMenuItem key={flow.id}>
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => onLoadFlow(flow.id)}
                        className="h-auto py-2 gap-2"
                      >
                        {/* Avatar */}
                        <div className={[
                          "w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold",
                          isActive
                            ? "bg-sidebar-primary text-sidebar-primary-foreground"
                            : "bg-sidebar-border/60 text-sidebar-foreground/50",
                        ].join(" ")}>
                          {displayName.charAt(0).toUpperCase()}
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-[13px] font-medium truncate leading-tight">{displayName}</p>
                          <div className="flex items-center gap-1 mt-0.5 text-[10px] opacity-50">
                            <Clock size={10} />
                            <span>{flow.updated_at ? getRelativeTime(flow.updated_at) : "—"}</span>
                          </div>
                        </div>
                      </SidebarMenuButton>

                      {/* Delete action */}
                      <SidebarMenuAction
                        onClick={(e) => handleDelete(e, flow.id)}
                        title="Delete"
                        className="hover:bg-destructive/15 hover:text-destructive"
                      >
                        <Trash size={13} weight="bold" />
                      </SidebarMenuAction>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── Footer ── */}
      <SidebarFooter className="border-t border-sidebar-border/60 p-3">
        {user ? (
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-7 h-7 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground text-xs font-bold shrink-0">
              {user.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-sidebar-foreground truncate">
                {user.user_metadata?.username || user.email?.split("@")[0]}
              </p>
              <p className="text-[10px] text-sidebar-foreground/45 truncate">{user.email}</p>
            </div>
          </div>
        ) : onSignIn ? (
          <button
            onClick={onSignIn}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <SignIn size={14} weight="bold" />
            Sign in
          </button>
        ) : null}
      </SidebarFooter>
    </Sidebar>
  );
}
