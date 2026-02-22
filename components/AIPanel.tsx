"use client";

import { useState, useRef, useEffect } from "react";
import type { FlowData } from "@/types/flow";
import {  getSessionSafe } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Sparkles, X, RotateCw } from "lucide-react";

interface AIPanelProps {
  onClose: () => void;
  onFlowGenerated: (flowData: FlowData) => void;
}

const EXAMPLE_PROMPTS = [
  "User login flow with email validation",
  "Payment processing with error handling",
  "Order fulfillment — cart to delivery",
  "CI/CD pipeline with tests & deployment",
  "Microservices architecture overview",
  "Password reset flow",
];

export function AIPanel({ onClose, onFlowGenerated }: AIPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startPosX: number;
    startPosY: number;
  } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!initialized) {
      const pw = panelRef.current?.offsetWidth || 460;
      const ph = panelRef.current?.offsetHeight || 420;
      setPos({
        x: (window.innerWidth - pw) / 2,
        y: (window.innerHeight - ph) / 2,
      });
      setInitialized(true);
      setTimeout(() => textareaRef.current?.focus(), 80);
    }
  }, [initialized]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: pos.x,
      startPosY: pos.y,
    };
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging || !dragRef.current) return;
      setPos({
        x: dragRef.current.startPosX + (e.clientX - dragRef.current.startX),
        y: dragRef.current.startPosY + (e.clientY - dragRef.current.startY),
      });
    };
    const onUp = () => setIsDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isDragging]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a description");
      return;
    }
    setIsGenerating(true);
    setError(null);
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
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate");
      onFlowGenerated(data.flowData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[199] bg-black/20 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div
        ref={panelRef}
        style={{
          position: "fixed",
          left: initialized ? pos.x : "50%",
          top: initialized ? pos.y : "50%",
          transform: initialized ? "none" : "translate(-50%,-50%)",
          zIndex: 200,
          width: 460,
          maxWidth: "calc(100vw - 32px)",
        }}
        className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
      >
        <div
          onMouseDown={onMouseDown}
          style={{ cursor: isDragging ? "grabbing" : "grab" }}
          className="select-none bg-primary px-4 py-3 flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
              <Sparkles size={15} className="text-primary-foreground" />
            </div>
            <div>
              <p className="text-primary-foreground font-semibold text-sm leading-tight">
                AI Flowchart Generator
              </p>
              <p className="text-primary-foreground/65 text-[11px] leading-tight">
                Describe your process — drag to move
              </p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="w-7 h-7 rounded-md flex items-center justify-center bg-primary-foreground/15 hover:bg-primary-foreground/30 text-primary-foreground transition-colors"
          >
            <X size={13} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey))
                  handleGenerate();
              }}
              placeholder="e.g. Create a user registration flow with email verification, database storage, and error handling…"
              rows={4}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground text-sm leading-relaxed resize-none outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-sans"
            />
            <span className="absolute bottom-2.5 right-3 text-[10px] text-muted-foreground/60 pointer-events-none select-none">
              ⌘↵
            </span>
          </div>

          <div>
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-2">
              Quick examples
            </p>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLE_PROMPTS.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setPrompt(ex)}
                  className={[
                    "px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all",
                    prompt === ex
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/50 text-muted-foreground hover:border-primary/50 hover:text-foreground",
                  ].join(" ")}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="px-3 py-2 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs">
              {error}
            </div>
          )}

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            size="lg"
            className="w-full gap-2 font-semibold"
          >
            {isGenerating ? (
              <>
                <RotateCw size={15} className="animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles size={15} />
                Generate Flowchart
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
