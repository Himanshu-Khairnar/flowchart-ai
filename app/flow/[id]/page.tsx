"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { FlowCanvas, type FlowCanvasHandle } from "@/components/FlowCanvas";
import { FloatingToolbar, type ToolType } from "@/components/FloatingToolbar";
import { AppSidebar } from "@/components/Sidebar";
import { AuthModal } from "@/components/AuthModal";
import { supabase, getSessionSafe, consumeAuthNotice } from "@/lib/supabase";
import { getFlowIsPublic, toggleFlowPublic } from "@/lib/db/flows";
import type { FlowData } from "@/types/flow";
import type { User } from "@supabase/supabase-js";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export default function FlowPage() {
  const { id } = useParams();
  const router = useRouter();
  const flowId = typeof id === "string" ? id : undefined;

  const [activeTool, setActiveTool] = useState<ToolType>("select");
  const [sidebarTab, setSidebarTab] = useState<"recent" | "ai">("recent");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [user, setUser] = useState<User | null>(null);
  const [flowName, setFlowName] = useState<string>("Untitled Flowchart");
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const canvasRef = useRef<FlowCanvasHandle>(null);

  // Load is_public for this flow
  useEffect(() => {
    if (flowId) getFlowIsPublic(flowId).then(setIsPublic);
  }, [flowId]);

  // Auth state
  useEffect(() => {
    getSessionSafe().then(({ session }) => {
      setUser(session?.user ?? null);
      if (consumeAuthNotice()) {
        setAuthNotice("Your session expired. Please sign in again.");
        setTimeout(() => setAuthNotice(null), 6000);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Sync name from canvas
  useEffect(() => {
    const interval = setInterval(() => {
      const name = canvasRef.current?.getName();
      if (name && name !== flowName) setFlowName(name);
    }, 1000);
    return () => clearInterval(interval);
  }, [flowName]);

  const handleToolUsed = useCallback(() => setActiveTool("select"), []);

  const handleFlowGenerated = useCallback((flowData: FlowData) => {
    canvasRef.current?.loadAIFlowchart(flowData);
    if (flowData.name) setFlowName(flowData.name);
  }, []);

  const handleLoadFlow = useCallback((targetId: string) => {
    router.push(`/flow/${targetId}`);
  }, [router]);

  const handleNewFlow = useCallback(() => {
    localStorage.removeItem("flowchart-id");
    localStorage.removeItem("flowchart-data");
    router.push("/");
  }, [router]);

  const handleNameChange = useCallback((newName: string) => {
    setFlowName(newName);
    canvasRef.current?.updateName(newName);
  }, []);

  // AI button in toolbar → always open sidebar AI tab (sign-in prompt is inside the tab)
  const handleAIClick = useCallback(() => {
    setSidebarTab("ai");
  }, []);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const handleTogglePublic = useCallback(async (next: boolean) => {
    if (!flowId) return;
    setIsPublic(next);
    await toggleFlowPublic(flowId, next);
  }, [flowId]);

  return (
    <SidebarProvider style={{ height: "100vh", overflow: "hidden" }}>
      <AppSidebar
        onLoadFlow={handleLoadFlow}
        onNewFlow={handleNewFlow}
        currentFlowId={flowId || null}
        user={user}
        flowName={flowName}
        onSignIn={() => setShowAuthModal(true)}
        onSignOut={handleSignOut}
        onFlowGenerated={handleFlowGenerated}
        activeTab={sidebarTab}
        onActiveTabChange={setSidebarTab}
      />

      <SidebarInset className="relative h-full overflow-hidden">
        {authNotice && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 rounded-full border border-amber-300/60 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-900 shadow-sm">
            {authNotice}
          </div>
        )}
        <FlowCanvas
          ref={canvasRef}
          activeTool={activeTool}
          onToolUsed={handleToolUsed}
          onSaveStatusChange={setSaveStatus}
          onFlowIdCreated={(newId) => router.push(`/flow/${newId}`)}
          initialId={flowId}
        />

        <FloatingToolbar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          onAIClick={handleAIClick}
          saveStatus={saveStatus}
          onSave={() => canvasRef.current?.handleExport()}
          onExportViewport={() => canvasRef.current?.handleExportViewport()}
          onManualSave={() => canvasRef.current?.handleManualSave()}
          onClear={handleNewFlow}
          user={user ? { email: user.email ?? "", username: user.user_metadata?.username ?? "" } : null}
          flowName={flowName}
          onNameChange={handleNameChange}
          flowId={flowId}
          isPublic={isPublic}
          onTogglePublic={handleTogglePublic}
        />
      </SidebarInset>

      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            setShowAuthModal(false);
            setSidebarTab("ai");
          }}
        />
      )}

    </SidebarProvider>
  );
}
