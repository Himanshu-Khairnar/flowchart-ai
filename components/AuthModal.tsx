"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";

interface AuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function AuthModal({ onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const switchMode = (next: "login" | "signup") => {
    setMode(next);
    setError(null);
    setInfo(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onSuccess();
        onClose();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username } },
        });
        if (error) throw error;
        setInfo("Check your email to confirm your account, then log in.");
        setMode("login");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={true}
      onOpenChange={(open: boolean) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="p-0 gap-0 overflow-hidden sm:max-w-sm"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="bg-primary px-6 pt-6 pb-5 relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 rounded-md flex items-center justify-center bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground transition-colors text-base leading-none"
          >
            ×
          </button>
          <div className="flex items-center gap-2 mb-1">
            <Star size={20} className="text-primary-foreground/80" />
            <DialogTitle className="text-primary-foreground text-base font-semibold">
              {mode === "login" ? "Welcome back" : "Create account"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-primary-foreground/70 text-xs">
            {mode === "login"
              ? "Sign in to use AI flowchart generation"
              : "Sign up to unlock AI generation"}
          </DialogDescription>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {(["login", "signup"] as const).map((tab: "login" | "signup") => (
            <button
              key={tab}
              type="button"
              onClick={() => switchMode(tab)}
              className={[
                "flex-1 py-3 text-xs font-semibold transition-colors border-b-2 -mb-px",
                mode === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {tab === "login" ? "Log In" : "Sign Up"}
            </button>
          ))}
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="px-6 pt-5 pb-6 flex flex-col gap-4"
        >
          {/* Info banner */}
          {info && (
            <div className="rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
              {info}
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          {/* Username — signup only */}
          {mode === "signup" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="auth-username" className="text-xs">
                Username
              </Label>
              <Input
                id="auth-username"
                type="text"
                value={username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setUsername(e.target.value)
                }
                required
                placeholder="yourname"
                autoComplete="username"
              />
            </div>
          )}

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="auth-email" className="text-xs">
              Email
            </Label>
            <Input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setEmail(e.target.value)
              }
              required
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="auth-password" className="text-xs">
              Password
            </Label>
            <Input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPassword(e.target.value)
              }
              required
              placeholder="••••••••"
              minLength={6}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full mt-1"
            size="default"
          >
            {loading
              ? "Please wait…"
              : mode === "login"
                ? "Log In"
                : "Create Account"}
          </Button>

          {/* Switch mode */}
          <p className="text-center text-xs text-muted-foreground">
            {mode === "login"
              ? "Don't have an account? "
              : "Already have an account? "}
            <button
              type="button"
              onClick={() => switchMode(mode === "login" ? "signup" : "login")}
              className="text-primary font-semibold hover:underline underline-offset-2"
            >
              {mode === "login" ? "Sign up" : "Log in"}
            </button>
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
