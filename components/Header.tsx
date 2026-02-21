"use client";

import { Button } from "@/components/ui/button";
import { AIGenerateDialog } from "@/components/AIGenerateDialog";
import type { FlowData } from "@/types/flow";

export function Header() {
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

  const handleClear = () => {
    if (confirm("Clear all nodes and edges? This will reset the flowchart.")) {
      localStorage.removeItem("flowchart-data");
      localStorage.removeItem("flowchart-id");
      window.location.reload();
    }
  };

  const handleAIGenerated = (flowData: FlowData) => {
    if (typeof window !== "undefined" && (window as any).flowchartLoadAI) {
      (window as any).flowchartLoadAI(flowData);
    }
  };

  return (
    <header className="h-14 border-b border-border bg-card px-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Flowchart AI</h1>
        <span className="text-xs text-muted-foreground">
          Auto-saves to database
        </span>
      </div>

      <div className="flex items-center gap-2">
        <AIGenerateDialog onFlowGenerated={handleAIGenerated} />
        <Button variant="outline" size="sm" onClick={handleManualSave}>
          Save Now
        </Button>
        <Button variant="outline" size="sm" onClick={handleExport}>
          Export JSON
        </Button>
        <Button variant="outline" size="sm" onClick={handleClear}>
          Clear
        </Button>
      </div>
    </header>
  );
}
