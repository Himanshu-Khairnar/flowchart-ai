"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { FlowData } from "@/types/flow";

interface AIGenerateDialogProps {
  onFlowGenerated: (flowData: FlowData) => void;
}

export function AIGenerateDialog({ onFlowGenerated }: AIGenerateDialogProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a description");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-flowchart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate flowchart");
      }

      // Pass the generated flow data to parent
      onFlowGenerated(data.flowData);

      // Close dialog and reset
      setOpen(false);
      setPrompt("");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsGenerating(false);
    }
  };

  const examplePrompts = [
    "Create a user login flow with validation",
    "Build a payment processing flowchart",
    "Design an order fulfillment process",
    "Show a bug fixing workflow",
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <span>✨</span> AI Generate
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Generate Flowchart with AI</DialogTitle>
          <DialogDescription>
            Describe your process and let AI create a flowchart for you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Prompt Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Describe your flowchart
            </label>
            <Textarea
              placeholder="e.g., Create a flowchart for user registration process with email verification"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Example Prompts */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Example prompts:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {examplePrompts.map((example, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="justify-start text-xs h-auto py-2"
                  onClick={() => setPrompt(example)}
                >
                  {example}
                </Button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <span className="animate-spin mr-2">⚙️</span>
                Generating...
              </>
            ) : (
              <>
                <span className="mr-2">✨</span>
                Generate Flowchart
              </>
            )}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <p>
            💡 Tip: Be specific about steps, decisions, and outcomes for better
            results.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
