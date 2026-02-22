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
  MessageCircle as ChatTeardrop,
} from "lucide-react";
import type { FlowData } from "@/types/flow";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Logo } from "@/components/Logo";

type SidebarTab = "recent" | "ai";

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
  const [flows, setFlows] = useState<any[]>([]);
  const [loadingFlows, setLoadingFlows] = useState(false);

  const [activeTab, setActiveTab] = useState<SidebarTab>(
    externalTab ?? "recent",
  );

  const [sessions, setSessions] = useState<SessionView[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [flowToDelete, setFlowToDelete] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const useSupabase = !!user && isSupabaseConfigured();

  useEffect(() => {
    if (externalTab && externalTab !== activeTab) setActiveTab(externalTab);
  }, [externalTab]);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessions, activeSessionId, isGenerating]);

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

  const handleDeleteFlow = async () => {
    if (!flowToDelete) return;
    const result = await deleteFlowFromDb(flowToDelete);
    if (result.success) {
      setFlows((f) => f.filter((x) => x.id !== flowToDelete));
      if (currentFlowId === flowToDelete) onNewFlow();
    }
    setFlowToDelete(null);
  };

  const handleTabChange = (tab: SidebarTab) => {
    setActiveTab(tab);
    onActiveTabChange?.(tab);
    if (tab === "ai") setTimeout(() => textareaRef.current?.focus(), 80);
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;

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

   const handleGenerate = async () => {
    if (!prompt.trim()) {
      setAiError("Please enter a description");
      return;
    }
    if (!user) {
      onSignIn?.();
      return;
    }

     if (!activeSessionId && sessions.length >= 3) {
      setAiError(
        "You've reached the 3-session limit. Delete an old session to start a new one.",
      );
      return;
    }
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

     const contextMessages = activeSession
      ? activeSession.messages
          .slice(-8)
          .map((m) => ({ role: m.role, content: m.content }))
      : [];

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

       if (useSupabase) {
        const currentSession = updatedSessions.find((s) => s.id === sessionId);
        const allMessages = [...(currentSession?.messages ?? []), assistantMsg];

        if (sessionId?.startsWith("temp-")) {
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

   const isAIContentOverflowHidden = activeTab === "ai" && !!activeSession;

   return (
    <Sidebar collapsible="offcanvas" className="border-r border-sidebar-border bg-sidebar">
       <SidebarHeader className="h-14 flex-row items-center gap-2.5 border-b border-sidebar-border/50 px-4">
        <Logo className="w-7 h-7 text-primary" />
        <span className="font-bold text-sm tracking-tight text-sidebar-foreground flex-1">
          FlowAI
        </span>
        <Button
          onClick={onNewFlow}
          size="icon-sm"
          variant="ghost"
          className="h-8 w-8 rounded-full hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          title="New flowchart"
        >
          <Plus size={18} />
        </Button>
      </SidebarHeader>
       
       <div className="px-3 py-2">
         <div className="flex p-1 bg-sidebar-accent/50 rounded-lg">
          <button
            onClick={() => handleTabChange("recent")}
            className={[
              "flex-1 py-1.5 text-xs font-medium rounded-md transition-all duration-200",
              activeTab === "recent"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            Recent
          </button>
          <button
            onClick={() => handleTabChange("ai")}
            className={[
              "flex-1 py-1.5 text-xs font-medium rounded-md transition-all duration-200 flex items-center justify-center gap-1.5",
              activeTab === "ai"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            <Sparkles size={12} className={activeTab === "ai" ? "text-primary" : ""} />
            AI Chat
          </button>
        </div>
       </div>

       <SidebarContent
        className={isAIContentOverflowHidden ? "overflow-hidden" : ""}
      >
         {activeTab === "recent" && (
          <SidebarGroup className="pt-0">
            <SidebarGroupLabel className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider px-4 mt-2 mb-1">
              My Charts
            </SidebarGroupLabel>

            <SidebarGroupContent>
              {!user ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 px-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                    <FileText size={24} className="text-muted-foreground/40" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Sign in to save</p>
                    <p className="text-xs text-muted-foreground leading-snug">
                      Your flowcharts will be saved to your account
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={onSignIn} className="mt-2 h-8 text-xs">
                    Sign In
                  </Button>
                </div>
              ) : loadingFlows && flows.length === 0 ? (
                <div className="py-12 flex flex-col items-center gap-2 text-muted-foreground/40">
                  <RotateCw size={16} className="animate-spin" />
                  <span className="text-xs">Loading flows...</span>
                </div>
              ) : flows.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 opacity-60">
                  <FileText size={28} className="text-muted-foreground" />
                  <p className="text-xs font-medium text-muted-foreground">No saved charts yet</p>
                </div>
              ) : (
                <SidebarMenu className="px-2 gap-1">
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
                          className="h-auto py-2.5 px-3 gap-3 rounded-lg hover:bg-sidebar-accent group"
                        >
                          <div
                            className={[
                              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold border transition-colors",
                              isActive
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background border-border text-muted-foreground group-hover:border-primary/30 group-hover:text-primary",
                            ].join(" ")}
                          >
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0 text-left space-y-0.5">
                            <p className="text-[13px] font-medium truncate leading-none text-foreground">
                              {displayName}
                            </p>
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <Clock size={10} />
                              <span>
                                {flow.updated_at
                                  ? getRelativeTime(flow.updated_at)
                                  : "—"}
                              </span>
                            </div>
                          </div>
                        </SidebarMenuButton>

                        <SidebarMenuAction
                          onClick={(e) => {
                            e.stopPropagation();
                            setFlowToDelete(flow.id);
                          }}
                          title="Delete"
                          className="right-2 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                        >
                          <Trash2 size={14} />
                        </SidebarMenuAction>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {activeTab === "ai" && (
          <>
            {!user ? (
              <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center h-full">
                <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center mb-2">
                  <Sparkles size={32} className="text-primary" />
                </div>
                <div className="space-y-2">
                  <p className="text-base font-semibold text-foreground">
                    AI Flowchart Generator
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Describe any process and let AI build the flowchart for you instantly.
                  </p>
                </div>
                <Button size="sm" onClick={onSignIn} className="gap-2 mt-4 w-full">
                  <LogIn size={14} />
                  Sign in to use AI
                </Button>
              </div>
            ) : 
            activeSession ? (
              <div className="flex flex-col h-full min-h-0 bg-background/50">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 shrink-0 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
                  <button
                    onClick={handleNewSession}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-accent transition-colors shrink-0 -ml-2"
                    title="Back to sessions"
                  >
                    <ArrowLeft size={16} className="text-muted-foreground" />
                  </button>
                  <p className="text-sm font-semibold text-foreground truncate flex-1">
                    {activeSession.title}
                  </p>
                </div>

                {activeSession.messages.length > 2 && (
                  <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10 text-[11px] text-primary/80 flex items-center gap-2 shrink-0">
                    <Sparkles
                      size={12}
                      className="text-primary shrink-0"
                    />
                    <span>
                      AI remembers the last {Math.floor(activeSession.messages.length / 2)} exchanges
                    </span>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 no-scrollbar">
                  {activeSession.messages.map((msg, i) => (
                    <div
                      key={i}
                      className={
                        msg.role === "user"
                          ? "flex justify-end pl-8"
                          : "flex justify-start pr-8"
                      }
                    >
                      <div
                        className={[
                          "rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm max-w-full break-words",
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-card border border-border text-card-foreground rounded-bl-sm",
                        ].join(" ")}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}

                  {isGenerating && (
                    <div className="flex justify-start pr-8">
                      <div className="bg-card border border-border text-card-foreground rounded-2xl rounded-bl-sm px-4 py-3 text-sm shadow-sm">
                        <div className="flex items-center gap-2">
                          <RotateCw size={14} className="animate-spin text-primary" />
                          <span className="opacity-70">
                            Thinking...
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-4 pt-2 shrink-0 bg-background">
                  {aiError && (
                    <div className="mb-3 px-3 py-2 rounded-lg border border-destructive/20 bg-destructive/5 text-destructive text-xs font-medium">
                      {aiError}
                    </div>
                  )}
                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey))
                          handleGenerate();
                      }}
                      placeholder="Describe changes or a new flow..."
                      rows={1}
                      className="w-full pl-4 pr-12 py-3 rounded-xl border border-input bg-background text-sm shadow-sm resize-none focus:ring-1 focus:ring-primary focus:border-primary transition-all min-h-[46px] max-h-[120px]"
                      style={{ height: prompt ? 'auto' : '46px' }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                      }}
                    />
                    <button
                      onClick={handleGenerate}
                      disabled={isGenerating || !prompt.trim()}
                      className="absolute right-2 bottom-2 w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                      title="Send (⌘↵)"
                    >
                      {isGenerating ? (
                        <RotateCw size={14} className="animate-spin" />
                      ) : (
                        <Send size={14} />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2 px-1">
                    <span
                      className={[
                        "text-[10px] font-medium",
                        activeSession.messages.filter((m) => m.role === "user")
                          .length >= 9
                          ? "text-destructive"
                          : "text-muted-foreground/60",
                      ].join(" ")}
                    >
                      {
                        activeSession.messages.filter((m) => m.role === "user")
                          .length
                      }
                      /10 messages
                    </span>
                    <span className="text-[10px] text-muted-foreground/60">
                      ⌘ + Enter to send
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="px-4 pt-4 pb-2 flex flex-col gap-3">
                  {aiError && (
                    <div className="px-3 py-2 rounded-lg border border-destructive/20 bg-destructive/5 text-destructive text-xs font-medium">
                      {aiError}
                    </div>
                  )}
                  
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-foreground">Create New Flowchart</p>
                    <textarea
                      ref={textareaRef}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey))
                          handleGenerate();
                      }}
                      placeholder="e.g. User registration flow with email verification and error handling..."
                      rows={3}
                      className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground/70 resize-none focus:ring-1 focus:ring-primary focus:border-primary transition-all shadow-sm"
                    />
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {EXAMPLE_PROMPTS.map((ex) => (
                      <button
                        key={ex}
                        onClick={() => setPrompt(ex)}
                        className={[
                          "px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all duration-200",
                          prompt === ex
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border bg-card hover:border-primary/40 hover:text-foreground text-muted-foreground",
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
                    className="w-full gap-2 shadow-sm mt-1"
                  >
                    {isGenerating ? (
                      <>
                        <RotateCw size={14} className="animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} /> Generate Flowchart
                      </>
                    )}
                  </Button>
                  
                  <div className="flex items-center justify-between px-1">
                    <span
                      className={[
                        "text-[10px] font-medium",
                        sessions.length >= 3
                          ? "text-destructive"
                          : "text-muted-foreground/60",
                      ].join(" ")}
                    >
                      {sessions.length}/3 sessions
                    </span>
                  </div>
                </div>

                <div className="px-4 py-2">
                  <div className="h-px bg-border/60" />
                </div>

                {loadingSessions ? (
                  <div className="py-8 text-center text-xs text-muted-foreground animate-pulse">
                    Loading sessions...
                  </div>
                ) : sessions.length > 0 ? (
                  <SidebarGroup>
                    <SidebarGroupLabel className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider px-4">
                      Past Sessions
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                      <SidebarMenu className="px-2 gap-1">
                        {sessions.map((session) => (
                          <SidebarMenuItem key={session.id}>
                            <SidebarMenuButton
                              onClick={() => handleSelectSession(session.id)}
                              className="h-auto py-3 px-3 gap-3 rounded-lg hover:bg-sidebar-accent group items-start"
                            >
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-sidebar-accent border border-sidebar-border text-muted-foreground">
                                <ChatTeardrop size={14} />
                              </div>
                              <div className="flex-1 min-w-0 text-left space-y-0.5">
                                <p className="text-[13px] font-medium truncate leading-none text-foreground">
                                  {session.title}
                                </p>
                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                  <Clock size={10} />
                                  <span className="shrink-0">
                                    {getRelativeTime(session.createdAt)}
                                  </span>
                                </div>
                              </div>
                            </SidebarMenuButton>

                            <SidebarMenuAction
                              onClick={(e) =>
                                handleDeleteSession(e, session.id)
                              }
                              title="Delete session"
                              className="right-2 top-3 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                            >
                              <Trash2 size={14} />
                            </SidebarMenuAction>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 py-12 opacity-50">
                    <MessageCircle size={32} className="text-muted-foreground/50" />
                    <p className="text-xs font-medium text-muted-foreground">No past sessions</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/50 p-4 bg-sidebar">
        {user ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 px-1">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground text-sm font-bold shrink-0 shadow-sm border border-primary/20">
                {user.email?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate leading-none mb-1.5">
                  {user.user_metadata?.username || user.email?.split("@")[0] || "User"}
                </p>
                <p className="text-[11px] text-muted-foreground truncate leading-none">
                  {user.email || "No email provided"}
                </p>
              </div>
            </div>
            
            {onSignOut && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSignOut}
                className="w-full justify-start gap-2 h-9 text-xs font-medium text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5 transition-all"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </Button>
            )}
          </div>
        ) : onSignIn ? (
          <Button
            onClick={onSignIn}
            className="w-full gap-2 shadow-sm"
            variant="outline"
          >
            <LogIn size={14} />
            Sign In
          </Button>
        ) : null}
      </SidebarFooter>

      <AlertDialog open={!!flowToDelete} onOpenChange={(open) => !open && setFlowToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Flowchart?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this flowchart and all its contents.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFlow}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}
