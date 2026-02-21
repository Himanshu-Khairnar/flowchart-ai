"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if there was a previous session
    const savedFlowId = localStorage.getItem("flowchart-id");
    if (savedFlowId) {
      router.replace(`/flow/${savedFlowId}`);
    } else {
      // Create a temp local session or just stay at root
      // For this app, let's redirect to a default "new" flow if wanted,
      // or just render the FlowPage with no ID.
    }
  }, [router]);

  // For now, let's just render the FlowPage content without an ID at the root too
  // to maintain the "instant" feel.
  return <FlowPageContent />;
}

// Re-using the same content as FlowPage but with no initialId
import { useState, useRef, useCallback } from "react";
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

function FlowPageContent() {
  const router = useRouter();
  const [activeTool, setActiveTool] = useState<ToolType>("select");
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [currentFlowId, setCurrentFlowId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [user, setUser] = useState<User | null>(null);
  const [flowName, setFlowName] = useState<string>("Untitled Flowchart");
  const canvasRef = useRef<FlowCanvasHandle>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

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
  const handleLoadFlow = useCallback((id: string) => router.push(`/flow/${id}`), [router]);
  const handleNewFlow = useCallback(() => {
    localStorage.removeItem("flowchart-id");
    localStorage.removeItem("flowchart-data");
    canvasRef.current?.handleClear();
    setFlowName("Untitled Flowchart");
    router.push("/");
  }, [router]);
  const handleNameChange = useCallback((newName: string) => {
    setFlowName(newName);
    canvasRef.current?.updateName(newName);
  }, []);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <SidebarProvider style={{ height: "100vh", overflow: "hidden" }}>
      <AppSidebar
        onLoadFlow={handleLoadFlow}
        onNewFlow={handleNewFlow}
        currentFlowId={null}
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
          onFlowIdCreated={(id) => { setCurrentFlowId(id); router.push(`/flow/${id}`); }}
        />
        <FloatingToolbar
          activeTool={activeTool} onToolChange={setActiveTool}
          onAIClick={() => user ? setShowAIPanel(true) : setShowAuthModal(true)}
          saveStatus={saveStatus} onSave={() => canvasRef.current?.handleExport()}
          onExportImage={() => canvasRef.current?.handleExportImage()}
          onExportPDF={() => canvasRef.current?.handleExportPDF()}
          onManualSave={() => canvasRef.current?.handleManualSave()}
          onClear={handleNewFlow}
          user={user ? { email: user.email ?? "", username: user.user_metadata?.username ?? "" } : null}
          onSignIn={() => setShowAuthModal(true)} onSignOut={handleSignOut}
          flowName={flowName} onNameChange={handleNameChange}
          flowId={currentFlowId}
          onShare={() => setShowShareDialog(true)}
        />
        {showAIPanel && user && <AIPanel onClose={() => setShowAIPanel(false)} onFlowGenerated={handleFlowGenerated} />}
      </SidebarInset>
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} onSuccess={() => { setShowAuthModal(false); setShowAIPanel(true); }} />}
      {showShareDialog && currentFlowId && (
        <ShareDialog
          open={showShareDialog}
          onClose={() => setShowShareDialog(false)}
          flowId={currentFlowId}
          flowName={flowName}
        />
      )}
    </SidebarProvider>
  );
}
