import { supabase, isSupabaseConfigured, getSessionSafe } from "@/lib/supabase";

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface AISession {
  id: string;
  title: string;
  messages: AIMessage[];
  summary?: string;
  is_public: boolean;
  created_at: string;
  updated_at?: string;
}

async function getUserId(): Promise<string | null> {
  const { session } = await getSessionSafe();
  return session?.user?.id ?? null;
}

export async function getAISessions(): Promise<AISession[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from("ai_sessions")
    .select("id, title, messages, summary, is_public, created_at, updated_at")
    .order("updated_at", { ascending: false });
  if (error) { console.error("getAISessions:", error); return []; }
  return (data ?? []) as AISession[];
}

export async function createAISession(
  title: string,
  messages: AIMessage[]
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const userId = await getUserId();
  if (!userId) return null;
  const { data, error } = await supabase
    .from("ai_sessions")
    .insert({ user_id: userId, title, messages })
    .select("id")
    .maybeSingle();
  if (error) { console.error("createAISession:", error); return null; }
  return data?.id ?? null;
}

export async function updateAISession(
  id: string,
  patch: Partial<Pick<AISession, "messages" | "summary" | "title" | "is_public">>
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase.from("ai_sessions").update(patch).eq("id", id);
  if (error) console.error("updateAISession:", error);
}

export async function deleteAISession(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase.from("ai_sessions").delete().eq("id", id);
  if (error) console.error("deleteAISession:", error);
}

export async function toggleSessionPublic(id: string, isPublic: boolean): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase
    .from("ai_sessions")
    .update({ is_public: isPublic })
    .eq("id", id);
  if (error) console.error("toggleSessionPublic:", error);
}
