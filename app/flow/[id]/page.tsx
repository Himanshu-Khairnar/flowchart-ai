"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { FlowCanvas, type FlowCanvasHandle } from "@/components/FlowCanvas";
import { FloatingToolbar, type ToolType } from "@/components/FloatingToolbar";
import { AppSidebar } from "@/components/Sidebar";
import { AIPanel } from "@/components/AIPanel";
import { AuthModal } from "@/components/AuthModal";
import { ShareDialog } from "@/components/ShareDialog";
import { supabase } from "@/lib/supabase";
import type { FlowData } from "@/types/flow";
import type { User } from "@supabase/supabase-js";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export default function FlowPage() {
  const { id } = useParams();
  const router = useRouter();
  const flowId = typeof id === "string" ? id : undefined;

  const [activeTool, setActiveTool] = useState<ToolType>("select");
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [user, setUser] = useState<User | null>(null);
  const [flowName, setFlowName] = useState<string>("Untitled Flowchart");
  const canvasRef = useRef<FlowCanvasHandle>(null);

  // Listen to Supabase auth state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Sync name from canvas if it changes (e.g. on load)
  useEffect(() => {
    const interval = setInterval(() => {
      const name = canvasRef.current?.getName();
      if (name && name !== flowName) {
        setFlowName(name);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [flowName]);

  const handleToolUsed = useCallback(() => {
    setActiveTool("select");
  }, []);

  const handleFlowGenerated = useCallback((flowData: FlowData) => {
    canvasRef.current?.loadAIFlowchart(flowData);
    if (flowData.name) setFlowName(flowData.name);
  }, []);

  const handleLoadFlow = useCallback((targetId: string) => {
    router.push(`/flow/${targetId}`);
  }, [router]);

  const handleNewFlow = useCallback(() => {
    // Clear stale IDs so the root page doesn't redirect back to this flow
    localStorage.removeItem("flowchart-id");
    localStorage.removeItem("flowchart-data");
    router.push("/");
  }, [router]);

  const handleNameChange = useCallback((newName: string) => {
    setFlowName(newName);
    canvasRef.current?.updateName(newName);
  }, []);

  const handleAIClick = useCallback(() => {
    if (!user) {
      setShowAuthModal(true);
    } else {
      setShowAIPanel(true);
    }
  }, [user]);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <SidebarProvider style={{ height: "100vh", overflow: "hidden" }}>
      <AppSidebar
        onLoadFlow={handleLoadFlow}
        onNewFlow={handleNewFlow}
        currentFlowId={flowId || null}
        user={user}
        flowName={flowName}
        onSignIn={() => setShowAuthModal(true)}
      />

      <SidebarInset className="relative h-full overflow-hidden">
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
          onExportImage={() => canvasRef.current?.handleExportImage()}
          onExportPDF={() => canvasRef.current?.handleExportPDF()}
          onManualSave={() => canvasRef.current?.handleManualSave()}
          onClear={handleNewFlow}
          user={user ? { email: user.email ?? "", username: user.user_metadata?.username ?? "" } : null}
          onSignIn={() => setShowAuthModal(true)}
          onSignOut={handleSignOut}
          flowName={flowName}
          onNameChange={handleNameChange}
          flowId={flowId}
          onShare={() => setShowShareDialog(true)}
        />

        {showAIPanel && user && (
          <AIPanel
            onClose={() => setShowAIPanel(false)}
            onFlowGenerated={handleFlowGenerated}
          />
        )}
      </SidebarInset>

      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            setShowAuthModal(false);
            setShowAIPanel(true);
          }}
        />
      )}

      {showShareDialog && flowId && (
        <ShareDialog
          open={showShareDialog}
          onClose={() => setShowShareDialog(false)}
          flowId={flowId}
          flowName={flowName}
        />
      )}
    </SidebarProvider>
  );
}
