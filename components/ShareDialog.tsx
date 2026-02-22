"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getCollaborators,
  addCollaborator,
  removeCollaborator,
  updateCollaboratorRole,
  findUserByEmail,
  type Collaborator,
  type CollaboratorRole,
} from "@/lib/db/flows";
import { supabase, getSessionSafe } from "@/lib/supabase";
import {
  UserPlus,
  Copy,
  Check,
  ChevronDown,
  Trash2,
  Crown,
  Edit,
  Eye,
  RotateCw,
  Users,
} from "lucide-react";

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  flowId: string;
  flowName: string;
}

const ROLE_LABELS: Record<CollaboratorRole, string> = {
  editor: "Can edit",
  viewer: "Can view",
};

const ROLE_ICONS: Record<CollaboratorRole, React.ReactNode> = {
  editor: <PencilSimple size={12} />,
  viewer: <Eye size={12} />,
};

export function ShareDialog({
  open,
  onClose,
  flowId,
  flowName,
}: ShareDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CollaboratorRole>("editor");
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    getSessionSafe().then(({ session }) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
  }, []);

  const loadCollaborators = useCallback(async () => {
    if (!flowId) return;
    setIsLoading(true);
    const result = await getCollaborators(flowId);
    if (result.success) {
      setCollaborators(result.data ?? []);
    } else if (result.error) {
      setError(result.error);
    }
    setIsLoading(false);
  }, [flowId]);

  useEffect(() => {
    if (open) {
      setEmail("");
      setError(null);
      loadCollaborators();
    }
  }, [open, loadCollaborators]);

  const handleInvite = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError("Enter an email address");
      return;
    }

    // Prevent inviting someone already in the list
    const alreadyAdded = collaborators.find(
      (c) => c.email?.toLowerCase() === trimmed,
    );
    if (alreadyAdded) {
      setError(
        `${trimmed} is already a collaborator (${ROLE_LABELS[alreadyAdded.role]})`,
      );
      return;
    }

    setIsInviting(true);
    setError(null);

    // Step 1: look up the user by email
    const lookup = await findUserByEmail(trimmed);
    if (!lookup.success || !lookup.userId) {
      setError(lookup.error ?? "No account found with that email");
      setIsInviting(false);
      return;
    }

    // Step 2: add them as collaborator
    const result = await addCollaborator(flowId, lookup.userId, role);
    if (!result.success) {
      setError(result.error ?? "Failed to invite");
      setIsInviting(false);
      return;
    }

    setEmail("");
    await loadCollaborators();
    setIsInviting(false);
  };

  const handleRemove = async (userId: string) => {
    await removeCollaborator(flowId, userId);
    setCollaborators((prev) => prev.filter((c) => c.user_id !== userId));
  };

  const handleRoleChange = async (
    userId: string,
    newRole: CollaboratorRole,
  ) => {
    await updateCollaboratorRole(flowId, userId, newRole);
    setCollaborators((prev) =>
      prev.map((c) => (c.user_id === userId ? { ...c, role: newRole } : c)),
    );
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0">
        {/* Header */}
        <div className="bg-primary px-5 py-4">
          <DialogHeader>
            <DialogTitle className="text-primary-foreground flex items-center gap-2 text-base">
              <div className="w-7 h-7 rounded-lg bg-primary-foreground/20 flex items-center justify-center shrink-0">
                <Users size={14} className="text-primary-foreground" />
              </div>
              Share "{flowName}"
            </DialogTitle>
            <p className="text-primary-foreground/65 text-[11px] mt-0.5">
              Invite collaborators by email — changes sync in real time
            </p>
          </DialogHeader>
        </div>

        <div className="p-5 flex flex-col gap-5">
          {/* Invite row */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-semibold text-foreground/70">
              Invite by email
            </Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                className="flex-1 h-9 text-sm"
              />
              {/* Role picker */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 h-9 shrink-0 text-xs px-3"
                  >
                    {ROLE_ICONS[role]}
                    {ROLE_LABELS[role]}
                    <ChevronDown size={9} className="opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem
                    onClick={() => setRole("editor")}
                    className="gap-2 text-xs cursor-pointer"
                  >
                    <PencilSimple size={12} /> Can edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setRole("viewer")}
                    className="gap-2 text-xs cursor-pointer"
                  >
                    <Eye size={12} /> Can view
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                size="sm"
                onClick={handleInvite}
                disabled={isInviting || !email.trim()}
                className="gap-1.5 h-9 text-xs shrink-0"
              >
                {isInviting ? (
                  <ArrowClockwise size={13} className="animate-spin" />
                ) : (
                  <UserPlus size={13} />
                )}
                Invite
              </Button>
            </div>

            {error && (
              <p className="text-[11px] text-destructive bg-destructive/10 border border-destructive/20 px-3 py-1.5 rounded-lg">
                {error}
              </p>
            )}
          </div>

          {/* Copy link */}
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/60 border border-border">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground">
                Share link
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {window.location.href}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="gap-1.5 h-8 text-xs shrink-0"
            >
              {copied ? (
                <Check size={13} className="text-emerald-500" />
              ) : (
                <Copy size={13} />
              )}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>

          {/* Collaborators list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                People with access
              </p>
              {isLoading && (
                <ArrowClockwise
                  size={11}
                  className="animate-spin text-muted-foreground/50"
                />
              )}
            </div>

            {collaborators.length === 0 && !isLoading ? (
              <p className="text-xs text-muted-foreground/50 text-center py-4">
                No collaborators yet — invite someone above
              </p>
            ) : (
              <div className="space-y-1">
                {collaborators.map((c) => (
                  <div
                    key={c.user_id}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-accent/40 transition-colors group"
                  >
                    {/* Avatar */}
                    <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                      {(c.email ?? c.user_id).charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-foreground truncate">
                        {c.email ?? c.user_id.slice(0, 8) + "…"}
                      </p>
                    </div>

                    {/* Role selector */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 h-7 text-[11px] text-muted-foreground hover:text-foreground px-2"
                        >
                          {ROLE_ICONS[c.role]}
                          {ROLE_LABELS[c.role]}
                          <ChevronDown size={8} className="opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem
                          onClick={() => handleRoleChange(c.user_id, "editor")}
                          className="gap-2 text-xs cursor-pointer"
                        >
                          <PencilSimple size={12} /> Can edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleRoleChange(c.user_id, "viewer")}
                          className="gap-2 text-xs cursor-pointer"
                        >
                          <Eye size={12} /> Can view
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Remove */}
                    <button
                      onClick={() => handleRemove(c.user_id)}
                      className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all shrink-0"
                      title="Remove"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Owner note */}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground/60">
            <Crown size={11} />
            <span>
              You are the owner — collaborators see this flow in their sidebar
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
