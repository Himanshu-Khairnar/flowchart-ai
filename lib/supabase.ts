import { createClient, type AuthError } from "@supabase/supabase-js";

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || "";

function getStorageKey(url: string): string | null {
  if (!url) return null;
  try {
    const hostname = new URL(url).hostname;
    const projectRef = hostname.split(".")[0];
    return projectRef ? `sb-${projectRef}-auth-token` : null;
  } catch {
    return null;
  }
}

const storageKey = getStorageKey(supabaseUrl);

function cleanupStaleAuth() {
  if (typeof window === "undefined" || !storageKey) return;
  const raw = localStorage.getItem(storageKey);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as { refresh_token?: string };
    if (!parsed?.refresh_token) {
      localStorage.removeItem(storageKey);
    }
  } catch {
    localStorage.removeItem(storageKey);
  }
}

cleanupStaleAuth();

// Create Supabase client
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  storageKey ? { auth: { storageKey } } : undefined
);

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};

function isRefreshTokenMissingError(error: AuthError | null) {
  if (!error) return false;
  return /refresh token not found|invalid refresh token/i.test(error.message);
}

export async function getSessionSafe(): Promise<{
  session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"] | null;
}> {
  const { data, error } = await supabase.auth.getSession();
  if (!error) return { session: data.session };

  if (isRefreshTokenMissingError(error)) {
    if (typeof window !== "undefined" && storageKey) {
      localStorage.removeItem(storageKey);
      sessionStorage.setItem("auth-session-expired", "1");
    }
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // best effort: local storage cleanup already done
    }
    return { session: null };
  }

  console.warn("Supabase getSession error:", error.message);
  return { session: null };
}

export function consumeAuthNotice(): "session-expired" | null {
  if (typeof window === "undefined") return null;
  const flag = sessionStorage.getItem("auth-session-expired");
  if (!flag) return null;
  sessionStorage.removeItem("auth-session-expired");
  return "session-expired";
}
