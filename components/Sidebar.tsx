"use client";

import { useEffect, useState, useRef } from "react";
import {
  getAllFlows,
  deleteFlowFromDb,
  toggleFlowPublic,
} from "@/lib/db/flows";
import {
  getAISessions,
  createAISession,
  updateAISession,
  deleteAISession,
  type AISession,
  type AIMessage,
} from "@/lib/db/sessions";
import { getSessionSafe, isSupabaseConfigured } from "@/lib/supabase";
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
  Plus,
  Trash2,
  FileText,
  Clock,
  GitBranch,
  LogIn,
  LogOut,
  Sparkles,
  RotateCw,
  MessageCircle,
  ArrowLeft,
  Send,
  Globe,
} from "lucide-react";
import type { FlowData } from "@/types/flow";

// ── Types ─────────────────────────────────────────────────────
type SidebarTab = "recent" | "ai";

// ── LocalStorage fallback (when not signed in) ───────────────
const LS_KEY = "flowai-ai-sessions";

interface LSSession {
  id: string;
  title: string;
  createdAt: string;
  messages: AIMessage[];
  summary?: string;
  is_public: boolean;
}

function lsLoad(): LSSession[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}
function lsSave(s: LSSession[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch {}
}

// ── Utils ─────────────────────────────────────────────────────
function getRelativeTime(dateString: string) {
  try {
    const diff = Math.floor(
      (Date.now() - new Date(dateString).getTime()) / 1000,
    );
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return "unknown";
  }
}

const EXAMPLE_PROMPTS = [
  "User login flow",
  "Payment processing",
  "CI/CD pipeline",
  "Password reset",
];

// ── Unified session shape used in component ───────────────────
interface SessionView {
  id: string;
  title: string;
  createdAt: string;
  messages: AIMessage[];
  summary?: string;
  is_public: boolean;
}

function toView(s: AISession): SessionView {
  return {
    id: s.id,
    title: s.title,
    createdAt: s.created_at,
    messages: (s.messages as AIMessage[]) ?? [],
    summary: s.summary,
    is_public: s.is_public,
  };
}

// ── Props ─────────────────────────────────────────────────────
interface AppSidebarProps {
  onLoadFlow: (flowId: string) => void;
  onNewFlow: () => void;
  currentFlowId: string | null;
  user: any;
  flowName?: string;
  onSignIn?: () => void;
  onSignOut?: () => void;
  onFlowGenerated: (flowData: FlowData) => void;
  activeTab?: SidebarTab;
  onActiveTabChange?: (tab: SidebarTab) => void;
}

// ── Component ─────────────────────────────────────────────────
export function AppSidebar({
  onLoadFlow,
  onNewFlow,
  currentFlowId,
  user,
  flowName,
  onSignIn,
  onSignOut,
  onFlowGenerated,
  activeTab: externalTab,
  onActiveTabChange,
}: AppSidebarProps) {
  // Recent-tab state
  const [flows, setFlows] = useState<any[]>([]);
  const [loadingFlows, setLoadingFlows] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<SidebarTab>(
    externalTab ?? "recent",
  );

  // AI state
  const [sessions, setSessions] = useState<SessionView[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const useSupabase = !!user && isSupabaseConfigured();

  // ── Sync external tab ──
  useEffect(() => {
    if (externalTab && externalTab !== activeTab) setActiveTab(externalTab);
  }, [externalTab]);

  // ── Load sessions (Supabase or localStorage) ──
  const fetchSessions = async () => {
    if (useSupabase) {
      setLoadingSessions(true);
      const data = await getAISessions();
      setSessions(data.map(toView));
      setLoadingSessions(false);
    } else {
      setSessions(lsLoad() as SessionView[]);
    }
  };
  useEffect(() => {
    fetchSessions();
  }, [user]);

  // ── Scroll messages to bottom ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessions, activeSessionId, isGenerating]);

  // ── Load flows ──
  const fetchFlows = async () => {
    if (!user) return;
    setLoadingFlows(true);
    const result = await getAllFlows();
    if (result.success && result.data) setFlows(result.data);
    setLoadingFlows(false);
  };
  useEffect(() => {
    fetchFlows();
  }, [user, currentFlowId]);

  // ── Delete flow ──
  const handleDeleteFlow = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this flowchart?")) return;
    const result = await deleteFlowFromDb(id);
    if (result.success) {
      setFlows((f) => f.filter((x) => x.id !== id));
      if (currentFlowId === id) onNewFlow();
    }
  };

  // ── Tab change ──
  const handleTabChange = (tab: SidebarTab) => {
    setActiveTab(tab);
    onActiveTabChange?.(tab);
    if (tab === "ai") setTimeout(() => textareaRef.current?.focus(), 80);
  };

  // ── Active session derived ──
  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;

  // ── Session helpers ──
  const handleNewSession = () => {
    setActiveSessionId(null);
    setPrompt("");
    setAiError(null);
    setTimeout(() => textareaRef.current?.focus(), 80);
  };

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    setPrompt("");
    setAiError(null);
  };

  const handleDeleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (useSupabase) {
      await deleteAISession(id);
    } else {
      lsSave(lsLoad().filter((s) => s.id !== id));
    }
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id) setActiveSessionId(null);
  };

  // ── Generate flowchart ──
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setAiError("Please enter a description");
      return;
    }
    if (!user) {
      onSignIn?.();
      return;
    }

    // Limit: 3 sessions per user
    if (!activeSessionId && sessions.length >= 3) {
      setAiError(
        "You've reached the 3-session limit. Delete an old session to start a new one.",
      );
      return;
    }

    // Limit: 10 messages per session (user messages only)
    if (activeSession) {
      const userMsgCount = activeSession.messages.filter(
        (m) => m.role === "user",
      ).length;
      if (userMsgCount >= 10) {
        setAiError(
          "This session has reached the 10-message limit. Start a new session to continue.",
        );
        return;
      }
    }

    setIsGenerating(true);
    setAiError(null);

    const userMsg: AIMessage = {
      role: "user",
      content: prompt.trim(),
      timestamp: new Date().toISOString(),
    };

    // Build context from current session (last 8 messages before this one)
    const contextMessages = activeSession
      ? activeSession.messages
          .slice(-8)
          .map((m) => ({ role: m.role, content: m.content }))
      : [];

    // Optimistically create/update session in state
    let sessionId = activeSessionId;
    let updatedSessions = [...sessions];

    if (!sessionId) {
      const tempId = `temp-${Date.now()}`;
      const newSession: SessionView = {
        id: tempId,
        title:
          prompt.trim().length > 48
            ? prompt.trim().slice(0, 45) + "…"
            : prompt.trim(),
        createdAt: new Date().toISOString(),
        messages: [userMsg],
        is_public: false,
      };
      updatedSessions = [newSession, ...updatedSessions];
      setSessions(updatedSessions);
      setActiveSessionId(tempId);
      sessionId = tempId;
    } else {
      updatedSessions = updatedSessions.map((s) =>
        s.id === sessionId ? { ...s, messages: [...s.messages, userMsg] } : s,
      );
      setSessions(updatedSessions);
    }
    setPrompt("");

    try {
      const { session } = await getSessionSafe();
      const res = await fetch("/api/generate-flowchart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({
          prompt: userMsg.content,
          context: contextMessages,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate");

      onFlowGenerated(data.flowData);

      const nodeCount = data.flowData?.nodes?.length ?? 0;
      const edgeCount = data.flowData?.edges?.length ?? 0;
      const flowTitle = data.flowData?.name || "Untitled";

      const assistantMsg: AIMessage = {
        role: "assistant",
        content: `Generated "${flowTitle}" — ${nodeCount} nodes, ${edgeCount} connections.`,
        timestamp: new Date().toISOString(),
      };
      const summary = `${flowTitle} · ${nodeCount} nodes`;

      // Persist to Supabase or localStorage
      if (useSupabase) {
        const currentSession = updatedSessions.find((s) => s.id === sessionId);
        const allMessages = [...(currentSession?.messages ?? []), assistantMsg];

        if (sessionId?.startsWith("temp-")) {
          // Create in Supabase and get real ID
          const realId = await createAISession(
            updatedSessions.find((s) => s.id === sessionId)?.title ?? flowTitle,
            allMessages,
          );
          if (realId) {
            updatedSessions = updatedSessions.map((s) =>
              s.id === sessionId
                ? { ...s, id: realId, messages: allMessages, summary }
                : s,
            );
            setSessions(updatedSessions);
            setActiveSessionId(realId);
          } else {
            updatedSessions = updatedSessions.map((s) =>
              s.id === sessionId ? { ...s, messages: allMessages, summary } : s,
            );
            setSessions(updatedSessions);
          }
        } else {
          await updateAISession(sessionId!, { messages: allMessages, summary });
          updatedSessions = updatedSessions.map((s) =>
            s.id === sessionId ? { ...s, messages: allMessages, summary } : s,
          );
          setSessions(updatedSessions);
        }
      } else {
        // localStorage
        updatedSessions = updatedSessions.map((s) =>
          s.id === sessionId
            ? { ...s, messages: [...s.messages, assistantMsg], summary }
            : s,
        );
        setSessions(updatedSessions);
        lsSave(updatedSessions as LSSession[]);
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Derived ──
  const isAIContentOverflowHidden = activeTab === "ai" && !!activeSession;

  // ── Render ────────────────────────────────────────────────────
  return (
    <Sidebar collapsible="offcanvas">
      {/* ── Header ── */}
      <SidebarHeader className="h-14 flex-row items-center gap-2.5 border-b border-sidebar-border/60 px-4">
        <div className="w-7 h-7 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
          <GitBranch size={14} className="text-sidebar-primary-foreground" />
        </div>
        <span className="font-bold text-sm tracking-tight text-sidebar-foreground flex-1">
          FlowAI
        </span>
        <Button
          onClick={onNewFlow}
          size="icon-sm"
          variant="ghost"
          className="text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          title="New flowchart"
        >
          <Plus size={16} />
        </Button>
      </SidebarHeader>

      {/* ── Tabs ── */}
      <div className="flex border-b border-sidebar-border/60 shrink-0">
        <button
          onClick={() => handleTabChange("recent")}
          className={[
            "flex-1 py-2.5 text-[11px] font-semibold tracking-wide transition-colors",
            activeTab === "recent"
              ? "text-sidebar-foreground border-b-2 border-sidebar-primary"
              : "text-sidebar-foreground/45 hover:text-sidebar-foreground",
          ].join(" ")}
        >
          Recent
        </button>
        <button
          onClick={() => handleTabChange("ai")}
          className={[
            "flex-1 py-2.5 text-[11px] font-semibold tracking-wide transition-colors flex items-center justify-center gap-1",
            activeTab === "ai"
              ? "text-sidebar-foreground border-b-2 border-sidebar-primary"
              : "text-sidebar-foreground/45 hover:text-sidebar-foreground",
          ].join(" ")}
        >
          <Sparkles size={11} />
          AI Flowchart
        </button>
      </div>

      {/* ── Content ── */}
      <SidebarContent
        className={isAIContentOverflowHidden ? "overflow-hidden" : ""}
      >
        {/* ══ RECENT TAB ══ */}
        {activeTab === "recent" && (
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
              ) : loadingFlows && flows.length === 0 ? (
                <div className="py-10 text-center text-xs text-sidebar-foreground/30 animate-pulse">
                  Loading…
                </div>
              ) : flows.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-10 opacity-40">
                  <FileText size={28} />
                  <p className="text-xs font-medium">No saved charts yet</p>
                </div>
              ) : (
                <SidebarMenu>
                  {flows.map((flow) => {
                    const isActive = currentFlowId === flow.id;
                    const displayName =
                      isActive && flowName
                        ? flowName
                        : flow.name || "Untitled Flow";
                    return (
                      <SidebarMenuItem key={flow.id}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => onLoadFlow(flow.id)}
                          className="h-auto py-2 gap-2"
                        >
                          <div
                            className={[
                              "w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold",
                              isActive
                                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                                : "bg-sidebar-border/60 text-sidebar-foreground/50",
                            ].join(" ")}
                          >
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <div className="flex items-center gap-1">
                              <p className="text-[13px] font-medium truncate leading-tight flex-1">
                                {displayName}
                              </p>
                              
                            </div>
                            <div className="flex items-center gap-1 mt-0.5 text-[10px] opacity-50">
                              <Clock size={10} />
                              <span>
                                {flow.updated_at
                                  ? getRelativeTime(flow.updated_at)
                                  : "—"}
                              </span>
                            </div>
                          </div>
                        </SidebarMenuButton>

                        {/* Delete */}
                        <SidebarMenuAction
                          onClick={(e) => handleDeleteFlow(e, flow.id)}
                          title="Delete"
                          className="hover:bg-destructive/15 hover:text-destructive"
                        >
                          <Trash2 size={13} />
                        </SidebarMenuAction>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* ══ AI TAB ══ */}
        {activeTab === "ai" && (
          <>
            {/* Not signed in */}
            {!user ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 px-5 text-center">
                <div className="w-11 h-11 rounded-xl bg-sidebar-primary/10 flex items-center justify-center">
                  <Sparkles size={22} className="text-sidebar-primary" />
                </div>
                <p className="text-sm font-semibold text-sidebar-foreground">
                  AI Flowchart Generator
                </p>
                <p className="text-xs text-sidebar-foreground/50 leading-relaxed">
                  Sign in to generate flowcharts from natural language.
                </p>
                <Button size="sm" onClick={onSignIn} className="gap-1.5 mt-1">
                  <LogIn size={13} />
                  Sign in to use AI
                </Button>
              </div>
            ) : /* Active session: chat view */
            activeSession ? (
              <div className="flex flex-col h-full min-h-0">
                {/* Session header */}
                <div className="flex items-center gap-2 px-3 py-2 border-b border-sidebar-border/40 shrink-0">
                  <button
                    onClick={handleNewSession}
                    className="w-6 h-6 flex items-center justify-center rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors shrink-0"
                    title="Back to sessions"
                  >
                    <ArrowLeft size={13} />
                  </button>
                  <p className="text-xs font-medium text-sidebar-foreground truncate flex-1">
                    {activeSession.title}
                  </p>
                </div>

                {/* Context summary banner — shown when session has prior history */}
                {activeSession.messages.length > 2 && (
                  <div className="mx-3 mt-2 px-2.5 py-1.5 rounded-lg bg-sidebar-primary/8 border border-sidebar-primary/15 text-[10px] text-sidebar-foreground/60 flex items-center gap-1.5 shrink-0">
                    <Sparkles
                      size={9}
                      className="text-sidebar-primary shrink-0"
                    />
                    <span>
                      AI has context of{" "}
                      {Math.floor(activeSession.messages.length / 2)} previous
                      exchange{activeSession.messages.length > 3 ? "s" : ""}
                    </span>
                  </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2.5 no-scrollbar">
                  {activeSession.messages.map((msg, i) => (
                    <div
                      key={i}
                      className={
                        msg.role === "user"
                          ? "flex justify-end"
                          : "flex justify-start"
                      }
                    >
                      <div
                        className={[
                          "max-w-[88%] rounded-2xl px-3 py-2 text-[12px] leading-relaxed",
                          msg.role === "user"
                            ? "bg-sidebar-primary text-sidebar-primary-foreground rounded-br-sm"
                            : "bg-sidebar-accent text-sidebar-foreground rounded-bl-sm",
                        ].join(" ")}
                      >
                        {msg.content}
                        <div className="mt-1 text-[9px] opacity-45">
                          {getRelativeTime(msg.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))}

                  {isGenerating && (
                    <div className="flex justify-start">
                      <div className="bg-sidebar-accent text-sidebar-foreground rounded-2xl rounded-bl-sm px-3 py-2 text-[12px]">
                        <div className="flex items-center gap-1.5">
                          <RotateCw size={11} className="animate-spin" />
                          <span className="opacity-60">
                            Generating flowchart…
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="px-3 pb-3 pt-2 border-t border-sidebar-border/40 shrink-0">
                  {aiError && (
                    <div className="mb-2 px-2.5 py-1.5 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-[11px]">
                      {aiError}
                    </div>
                  )}
                  <div className="flex gap-2 items-end">
                    <textarea
                      ref={textareaRef}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey))
                          handleGenerate();
                      }}
                      placeholder="Describe another flowchart…"
                      rows={2}
                      className="flex-1 px-2.5 py-2 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground text-[12px] leading-relaxed resize-none outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-sans"
                    />
                    <button
                      onClick={handleGenerate}
                      disabled={isGenerating || !prompt.trim()}
                      className="w-8 h-8 rounded-xl bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center disabled:opacity-35 hover:bg-sidebar-primary/90 transition-colors shrink-0"
                      title="Generate (⌘↵)"
                    >
                      {isGenerating ? (
                        <RotateCw size={16} className="animate-spin" />
                      ) : (
                        <Sparkles size={16} />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span
                      className={[
                        "text-[9px] font-medium",
                        activeSession.messages.filter((m) => m.role === "user")
                          .length >= 9
                          ? "text-destructive/70"
                          : "text-muted-foreground/40",
                      ].join(" ")}
                    >
                      {
                        activeSession.messages.filter((m) => m.role === "user")
                          .length
                      }
                      /10 messages
                    </span>
                    <span className="text-[9px] text-muted-foreground/40">
                      ⌘↵ to send
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Session list + new chat */
              <div className="flex flex-col">
                {/* New chat input */}
                <div className="px-3 pt-3 pb-2 flex flex-col gap-2">
                  {aiError && (
                    <div className="px-2.5 py-1.5 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-[11px]">
                      {aiError}
                    </div>
                  )}
                  <textarea
                    ref={textareaRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey))
                        handleGenerate();
                    }}
                    placeholder="Describe your flowchart…&#10;e.g. User login with email verification"
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground text-[12px] leading-relaxed resize-none outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all font-sans"
                  />

                  <div className="flex flex-wrap gap-1">
                    {EXAMPLE_PROMPTS.map((ex) => (
                      <button
                        key={ex}
                        onClick={() => setPrompt(ex)}
                        className={[
                          "px-2 py-0.5 rounded-full border text-[10px] font-medium transition-all",
                          prompt === ex
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-muted/50 text-muted-foreground hover:border-primary/50 hover:text-foreground",
                        ].join(" ")}
                      >
                        {ex}
                      </button>
                    ))}
                  </div>

                  <Button
                    onClick={handleGenerate}
                    disabled={
                      isGenerating || !prompt.trim() || sessions.length >= 3
                    }
                    size="sm"
                    className="w-full gap-1.5"
                  >
                    {isGenerating ? (
                      <>
                        <RotateCw size={12} className="animate-spin" />{" "}
                        Generating…
                      </>
                    ) : (
                      <>
                        <Sparkles size={12} /> Generate Flowchart
                      </>
                    )}
                  </Button>
                  <div className="flex items-center justify-between mt-0.5">
                    <span
                      className={[
                        "text-[9px] font-medium",
                        sessions.length >= 3
                          ? "text-destructive/70"
                          : "text-muted-foreground/40",
                      ].join(" ")}
                    >
                      {sessions.length}/3 sessions
                    </span>
                    <span className="text-[9px] text-muted-foreground/40">
                      ⌘↵ to generate
                    </span>
                  </div>
                </div>

                <SidebarSeparator />

                {/* Past sessions */}
                {loadingSessions ? (
                  <div className="py-6 text-center text-xs text-sidebar-foreground/30 animate-pulse">
                    Loading sessions…
                  </div>
                ) : sessions.length > 0 ? (
                  <SidebarGroup>
                    <SidebarGroupLabel className="text-[10px] font-bold text-sidebar-foreground/40 uppercase tracking-widest">
                      Past Sessions
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {sessions.map((session) => (
                          <SidebarMenuItem key={session.id}>
                            <SidebarMenuButton
                              onClick={() => handleSelectSession(session.id)}
                              className="h-auto py-2 gap-2"
                            >
                              <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-sidebar-border/60">
                                <ChatTeardrop
                                  size={12}
                                  className="text-sidebar-foreground/50"
                                />
                              </div>
                              <div className="flex-1 min-w-0 text-left">
                                <div className="flex items-center gap-1">
                                  <p className="text-[12px] font-medium truncate leading-tight flex-1">
                                    {session.title}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 mt-0.5 text-[10px] opacity-50">
                                  <Clock size={9} />
                                  <span className="shrink-0">
                                    {getRelativeTime(session.createdAt)}
                                  </span>
                                  {session.summary && (
                                    <span className="truncate">
                                      · {session.summary}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </SidebarMenuButton>

                            {/* Delete */}
                            <SidebarMenuAction
                              onClick={(e) =>
                                handleDeleteSession(e, session.id)
                              }
                              title="Delete session"
                              className="hover:bg-destructive/15 hover:text-destructive"
                            >
                              <Trash2 size={12} />
                            </SidebarMenuAction>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 py-8 opacity-40">
                    <Sparkles size={24} />
                    <p className="text-xs font-medium">No past sessions</p>
                    <p className="text-[10px] text-center leading-snug px-4">
                      Generate a flowchart to start a session
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </SidebarContent>

      {/* ── Footer ── */}
      <SidebarFooter className="border-t border-sidebar-border/60 p-3">
        {user ? (
          <div className="flex items-center gap-2 px-1">
            <div className="w-7 h-7 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground text-xs font-bold shrink-0">
              {user.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-sidebar-foreground truncate">
                {user.user_metadata?.username || user.email?.split("@")[0]}
              </p>
              <p className="text-[10px] text-sidebar-foreground/45 truncate">
                {user.email}
              </p>
            </div>
            {onSignOut && (
              <button
                onClick={onSignOut}
                title="Sign out"
                className="w-7 h-7 flex items-center justify-center rounded-lg text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors shrink-0"
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
        ) : onSignIn ? (
          <button
            onClick={onSignIn}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <LogIn size={14} />
            Sign in
          </button>
        ) : null}
      </SidebarFooter>
    </Sidebar>
  );
}
