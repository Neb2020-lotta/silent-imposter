import { supabase } from "@/integrations/supabase/client";

export type BanEntry = {
  ip: string;
  kind: "ban" | "timeout";
  reason: string | null;
  expires_at: string | null;
  created_at?: string;
};

const ADMIN_TOKEN_KEY = "silent_imposter_mod_token";

export function getAdminToken(): string {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setAdminToken(t: string) {
  try {
    localStorage.setItem(ADMIN_TOKEN_KEY, t);
  } catch {
    /* ignore */
  }
}

export function clearAdminToken() {
  try {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

async function call(body: unknown, withToken = false) {
  const headers: Record<string, string> = {};
  if (withToken) headers["x-admin-token"] = getAdminToken();
  return supabase.functions.invoke("moderation", { body, headers });
}

export async function checkMe(): Promise<{ ip: string; entry: BanEntry | null } | null> {
  const { data, error } = await call({ action: "check" });
  if (error || !data) return null;
  return data as { ip: string; entry: BanEntry | null };
}

export async function listBans(): Promise<BanEntry[]> {
  const { data, error } = await call({ action: "list" }, true);
  if (error || !data) throw new Error(((data as { error?: string })?.error) ?? "list_failed");
  return (data as { entries: BanEntry[] }).entries;
}

export async function addBan(
  ip: string,
  kind: "ban" | "timeout",
  minutes?: number,
  reason?: string,
) {
  const { data, error } = await call(
    { action: "add", ip, kind, minutes, reason },
    true,
  );
  if (error || (data as { error?: string })?.error) {
    throw new Error(((data as { error?: string })?.error) ?? "add_failed");
  }
}

export async function removeBan(ip: string) {
  const { data, error } = await call({ action: "remove", ip }, true);
  if (error || (data as { error?: string })?.error) {
    throw new Error(((data as { error?: string })?.error) ?? "remove_failed");
  }
}
