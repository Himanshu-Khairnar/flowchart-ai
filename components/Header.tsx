"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AIGenerateDialog } from "@/components/AIGenerateDialog";
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
import { Plus, Save, FileJson } from "lucide-react";
import type { FlowData } from "@/types/flow";

export function Header() {
  const [showNewConfirm, setShowNewConfirm] = useState(false);
  const [newError, setNewError] = useState<string | null>(null);

  const handleExport = () => {
    if (typeof window !== "undefined" && (window as any).flowchartSave) {
      (window as any).flowchartSave();
    }
  };

  const handleManualSave = () => {
    if (typeof window !== "undefined" && (window as any).flowchartManualSave) {
      (window as any).flowchartManualSave();
    }
  };

  const handleNew = async () => {
    try {
      localStorage.removeItem("flowchart-data");
      localStorage.removeItem("flowchart-id");
      window.location.href = "/";
    } catch (error) {
      setNewError("Failed to start a new flowchart. Please try again.");
      console.error(error);
    } finally {
      setShowNewConfirm(false);
    }
  };

  const handleAIGenerated = (flowData: FlowData) => {
    if (typeof window !== "undefined" && (window as any).flowchartLoadAI) {
      (window as any).flowchartLoadAI(flowData);
    }
  };

  return (
    <>
      <header className="h-14 border-b border-border bg-card px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">Flowchart AI</h1>
          <span className="text-xs text-muted-foreground">
            Auto-saves to database
          </span>
        </div>

        <div className="flex items-center gap-2">
          <AIGenerateDialog onFlowGenerated={handleAIGenerated} />
          <Button variant="outline" size="sm" onClick={handleManualSave} className="gap-1.5">
            <Save size={14} />
            Save Now
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
            <FileJson size={14} />
            Export JSON
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowNewConfirm(true)} className="gap-1.5">
            <Plus size={14} />
            New
          </Button>
        </div>
      </header>

      <AlertDialog open={showNewConfirm} onOpenChange={setShowNewConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start a new flowchart?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear the current canvas. Make sure you have saved your work before starting a new flowchart.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleNew} className="bg-primary text-primary-foreground hover:bg-primary/90">
              New Flowchart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!newError} onOpenChange={(open) => !open && setNewError(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Error</AlertDialogTitle>
            <AlertDialogDescription>{newError}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Dismiss</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
