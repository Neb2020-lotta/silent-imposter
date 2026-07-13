import { supabase } from "@/integrations/supabase/client";

export type BanEntry = {
  ip: string;
  kind: "ban" | "timeout";
  reason: string | null;
  expires_at: string | null;
  created_at?: string;
};

async function call(body: unknown) {
  return supabase.functions.invoke("moderation", { body });
}

export async function checkMe(): Promise<{ ip: string; entry: BanEntry | null } | null> {
  const { data, error } = await call({ action: "check" });
  if (error || !data) return null;
  return data as { ip: string; entry: BanEntry | null };
}

export async function listBans(): Promise<BanEntry[]> {
  const { data, error } = await call({ action: "list" });
  if (error || !data) throw new Error(((data as { error?: string })?.error) ?? "list_failed");
  return (data as { entries: BanEntry[] }).entries;
}

export async function addBan(
  ip: string,
  kind: "ban" | "timeout",
  minutes?: number,
  reason?: string,
) {
  const { data, error } = await call({ action: "add", ip, kind, minutes, reason });
  if (error || (data as { error?: string })?.error) {
    throw new Error(((data as { error?: string })?.error) ?? "add_failed");
  }
}

export async function removeBan(ip: string) {
  const { data, error } = await call({ action: "remove", ip });
  if (error || (data as { error?: string })?.error) {
    throw new Error(((data as { error?: string })?.error) ?? "remove_failed");
  }
}
