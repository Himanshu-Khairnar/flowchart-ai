import { supabase, isSupabaseConfigured, getSessionSafe } from "@/lib/supabase";
import type { FlowData, SaveFlowResponse, LoadFlowResponse } from "@/types/flow";

// ─── helpers ──────────────────────────────────────────────────────────────────

async function getAuthenticatedUserId(): Promise<string | null> {
  const { session } = await getSessionSafe();
  return session?.user?.id ?? null;
}

function notConfigured() {
  console.warn("Supabase not configured");
  return false;
}

// ─── flows CRUD ───────────────────────────────────────────────────────────────

/**
 * Save (insert or update) a flow.
 * Requires the user to be signed in — returns an error otherwise.
 */
export async function saveFlowToDb(
  flowData: FlowData,
  flowId?: string
): Promise<SaveFlowResponse> {
  try {
    if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured" };

    const userId = await getAuthenticatedUserId();
    if (!userId) return { success: false, error: "Not authenticated" };

    if (flowId) {
      // UPDATE existing flow — no RETURNING needed; we already know the id.
      // Using RETURNING would require SELECT permission on the updated row,
      // which can fail for editor-collaborators even though the UPDATE itself succeeds.
      const { error } = await supabase
        .from("flows")
        .update({
          name: flowData.name ?? "Untitled Flow",
          description: flowData.description ?? "",
          flow_data: flowData,
        })
        .eq("id", flowId);

      if (error) throw error;
      return { success: true, id: flowId };
    } else {
      // INSERT new flow
      const { data, error } = await supabase
        .from("flows")
        .insert({
          owner_id: userId,
          name: flowData.name ?? "Untitled Flow",
          description: flowData.description ?? "",
          flow_data: flowData,
        })
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Insert returned no rows — check RLS policies");
      return { success: true, id: data.id };
    }
  } catch (error) {
    console.error("Error saving flow:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/** Load a single flow by id. Returns success:false (not an exception) when the row doesn't exist. */
export async function loadFlowFromDb(flowId: string): Promise<LoadFlowResponse> {
  try {
    if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured" };

    const { data, error } = await supabase
      .from("flows")
      .select("flow_data")
      .eq("id", flowId)
      .maybeSingle(); // returns null instead of error when 0 rows

    if (error) throw error;
    if (!data) return { success: false, error: "Flow not found" };
    return { success: true, data: data.flow_data as FlowData };
  } catch (error) {
    console.error("Error loading flow:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Get all flows accessible to the current user:
 *   - flows they own
 *   - flows they are a collaborator on
 */
export async function getAllFlows() {
  try {
    if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured", data: [] };

    const userId = await getAuthenticatedUserId();
    if (!userId) return { success: false, error: "Not authenticated", data: [] };

    // Owned flows
    const { data: owned, error: ownedErr } = await supabase
      .from("flows")
      .select("id, name, description, is_public, created_at, updated_at, owner_id")
      .eq("owner_id", userId)
      .order("updated_at", { ascending: false });

    if (ownedErr) throw ownedErr;

    // Collaborated flows (where user is a member but not owner)
    const { data: collabRows, error: collabErr } = await supabase
      .from("flow_collaborators")
      .select("flow_id, role, flows(id, name, description, is_public, created_at, updated_at, owner_id)")
      .eq("user_id", userId);

    if (collabErr) throw collabErr;

    const collaborated = (collabRows ?? [])
      .map((row: any) => ({ ...row.flows, role: row.role }))
      .filter((f: any) => f && f.owner_id !== userId); // exclude duplicates

    // Merge: owned first, then collaborated
    const all = [
      ...(owned ?? []).map((f) => ({ ...f, role: "owner" as const })),
      ...collaborated,
    ].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

    return { success: true, data: all };
  } catch (error) {
    console.error("Error fetching flows:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error", data: [] };
  }
}

/** Delete a flow (owner only — enforced by RLS). */
export async function deleteFlowFromDb(flowId: string) {
  try {
    if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured" };

    const { error } = await supabase.from("flows").delete().eq("id", flowId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error deleting flow:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/** Get a single flow's public status. */
export async function getFlowIsPublic(flowId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const { data, error } = await supabase
    .from("flows")
    .select("is_public")
    .eq("id", flowId)
    .maybeSingle();
  if (error) { console.error("getFlowIsPublic:", error); return false; }
  return data?.is_public ?? false;
}

/** Toggle a flow's public visibility (owner only). */
export async function toggleFlowPublic(
  flowId: string,
  isPublic: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured" };
    const { error } = await supabase
      .from("flows")
      .update({ is_public: isPublic })
      .eq("id", flowId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error toggling flow public:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// ─── collaborator management ──────────────────────────────────────────────────

export type CollaboratorRole = "viewer" | "editor";

export interface Collaborator {
  user_id: string;
  role: CollaboratorRole;
  created_at: string;
  email?: string;
}

/** List collaborators for a flow, including their emails. */
export async function getCollaborators(flowId: string): Promise<{ success: boolean; data?: Collaborator[]; error?: string }> {
  if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured" };

  const { data, error } = await supabase.rpc("get_flow_collaborators", { p_flow_id: flowId });

  if (error) {
    const msg = error.message || error.code || "Failed to load collaborators";
    console.error("get_flow_collaborators RPC error:", error.code, error.message);
    if (error.code === "42883" || msg.includes("does not exist")) {
      return { success: false, error: "DB function missing — run supabase-schema.sql in your Supabase project" };
    }
    return { success: false, error: msg };
  }

  const rows: Collaborator[] = (data ?? []).map((r: any) => ({
    user_id:    r.user_id,
    role:       r.role as CollaboratorRole,
    created_at: r.created_at,
    email:      r.email ?? undefined,
  }));

  return { success: true, data: rows };
}

/**
 * Invite a user to collaborate on a flow by their user_id.
 * Only the flow owner can call this (enforced by RLS).
 */
export async function addCollaborator(
  flowId: string,
  targetUserId: string,
  role: CollaboratorRole = "editor"
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured" };

    const invitedBy = await getAuthenticatedUserId();
    if (!invitedBy) return { success: false, error: "Not authenticated" };

    const { error } = await supabase
      .from("flow_collaborators")
      .upsert({ flow_id: flowId, user_id: targetUserId, role, invited_by: invitedBy });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error adding collaborator:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/** Remove a collaborator from a flow. */
export async function removeCollaborator(
  flowId: string,
  targetUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured" };

    const { error } = await supabase
      .from("flow_collaborators")
      .delete()
      .eq("flow_id", flowId)
      .eq("user_id", targetUserId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error removing collaborator:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Find a user's id by their email address.
 * Uses the `lookup_user_by_email` SECURITY DEFINER RPC so the anon
 * client cannot directly query auth.users.
 */
export async function findUserByEmail(
  email: string
): Promise<{ success: boolean; userId?: string; error?: string }> {
  if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured" };

  const { data, error } = await supabase.rpc("lookup_user_by_email", {
    p_email: email.trim().toLowerCase(),
  });

  if (error) {
    // PostgrestError has .message, .code, .details — not a native Error instance
    const msg = error.message || error.code || "RPC call failed";
    console.error("lookup_user_by_email RPC error:", error.code, error.message, error.details);
    // Function not found → remind to run the schema SQL
    if (error.code === "42883" || msg.includes("does not exist")) {
      return { success: false, error: "DB function missing — run supabase-schema.sql in your Supabase project" };
    }
    return { success: false, error: msg };
  }

  if (!data || (Array.isArray(data) && data.length === 0)) {
    return { success: false, error: "No account found with that email" };
  }

  const row = Array.isArray(data) ? data[0] : data;
  return { success: true, userId: (row as any).user_id };
}

/** Update a collaborator's role. */
export async function updateCollaboratorRole(
  flowId: string,
  targetUserId: string,
  role: CollaboratorRole
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured" };

    const { error } = await supabase
      .from("flow_collaborators")
      .update({ role })
      .eq("flow_id", flowId)
      .eq("user_id", targetUserId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error updating collaborator role:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
