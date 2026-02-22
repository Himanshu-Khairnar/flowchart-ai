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
import { Sparkles, Loader2, Wand2, Lightbulb } from "lucide-react";
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
      onFlowGenerated(data.flowData);

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
        <Button size="sm" className="gap-2 bg-primary/10 text-primary hover:bg-primary/20 shadow-none border-0">
          <Sparkles size={16} />
          AI Generate
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Wand2 size={20} />
            </div>
            <DialogTitle>Generate Flowchart with AI</DialogTitle>
          </div>
          <DialogDescription>
            Describe your process in plain English and let AI visualize it for you instantly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Textarea
              placeholder="e.g., Create a flowchart for a user registration process that includes email verification, error handling for duplicate emails, and a welcome email step."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="resize-none text-sm leading-relaxed"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Lightbulb size={12} className="text-amber-500" />
              <span>Try these examples:</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {examplePrompts.map((example, i) => (
                <button
                  key={i}
                  className="text-left text-xs px-3 py-2 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors truncate border border-transparent hover:border-border"
                  onClick={() => setPrompt(example)}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs p-3 rounded-md font-medium">
              {error}
            </div>
          )}

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating Flowchart...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Generate Flowchart
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
