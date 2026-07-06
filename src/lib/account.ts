import { supabase } from "@/integrations/supabase/client";

const TOKEN_KEY = "imposter_account_token";
const USERNAME_KEY = "imposter_account_username";
const ID_KEY = "imposter_account_id";
const REMEMBER_IP_KEY = "imposter_remember_ip";

export type Account = { token: string; accountId: string; username: string };

export function getAccount(): Account | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const username = localStorage.getItem(USERNAME_KEY);
  const accountId = localStorage.getItem(ID_KEY);
  if (!token || !username || !accountId) return null;
  return { token, username, accountId };
}

function saveAccount(a: Account) {
  localStorage.setItem(TOKEN_KEY, a.token);
  localStorage.setItem(USERNAME_KEY, a.username);
  localStorage.setItem(ID_KEY, a.accountId);
  window.dispatchEvent(new Event("account-changed"));
}

export function clearAccount() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USERNAME_KEY);
  localStorage.removeItem(ID_KEY);
  window.dispatchEvent(new Event("account-changed"));
}

export function getRememberIp(): boolean {
  return localStorage.getItem(REMEMBER_IP_KEY) === "1";
}
export function setRememberIp(v: boolean) {
  localStorage.setItem(REMEMBER_IP_KEY, v ? "1" : "0");
}

async function fetchIp(): Promise<string | null> {
  try {
    const r = await fetch("https://api.ipify.org?format=json");
    const j = await r.json();
    return j.ip ?? null;
  } catch {
    return null;
  }
}

export async function registerAccount(username: string, password: string, rememberIp: boolean) {
  const ip = rememberIp ? await fetchIp() : null;
  const { data, error } = await (supabase.rpc as any)("account_register", {
    p_username: username,
    p_password: password,
    p_ip: ip,
  });
  if (error) throw error;
  const row = (data as any[])[0];
  const acc: Account = { token: row.token, accountId: row.account_id, username: row.username };
  saveAccount(acc);
  setRememberIp(rememberIp);
  return acc;
}

export async function loginAccount(username: string, password: string, rememberIp: boolean) {
  const ip = rememberIp ? await fetchIp() : null;
  const { data, error } = await (supabase.rpc as any)("account_login", {
    p_username: username,
    p_password: password,
    p_ip: ip,
  });
  if (error) throw error;
  const rows = data as any[];
  if (!rows || rows.length === 0) throw new Error("invalid_credentials");
  const row = rows[0];
  const acc: Account = { token: row.token, accountId: row.account_id, username: row.username };
  saveAccount(acc);
  setRememberIp(rememberIp);
  return acc;
}

export async function tryIpAutoLogin(): Promise<Account | null> {
  if (getAccount()) return getAccount();
  if (!getRememberIp()) return null;
  const ip = await fetchIp();
  if (!ip) return null;
  const { data, error } = await (supabase.rpc as any)("account_login_by_ip", { p_ip: ip });
  if (error) return null;
  const rows = data as any[];
  if (!rows || rows.length === 0) return null;
  const row = rows[0];
  const acc: Account = { token: row.token, accountId: row.account_id, username: row.username };
  saveAccount(acc);
  return acc;
}

export async function logoutAccount() {
  const acc = getAccount();
  if (acc) {
    try {
      await (supabase.rpc as any)("account_logout", { p_token: acc.token });
    } catch {}
  }
  clearAccount();
}

export type Friend = {
  other_id: string;
  username: string;
  status: "pending" | "accepted";
  direction: "incoming" | "outgoing";
};

export async function listFriends(): Promise<Friend[]> {
  const acc = getAccount();
  if (!acc) return [];
  const { data, error } = await (supabase.rpc as any)("friend_list", { p_token: acc.token });
  if (error) throw error;
  return (data as any[]) ?? [];
}

export async function sendFriendRequest(username: string) {
  const acc = getAccount();
  if (!acc) throw new Error("not_authenticated");
  const { error } = await (supabase.rpc as any)("friend_request", {
    p_token: acc.token,
    p_target_username: username,
  });
  if (error) throw error;
}

export async function acceptFriend(requesterId: string) {
  const acc = getAccount();
  if (!acc) throw new Error("not_authenticated");
  const { error } = await (supabase.rpc as any)("friend_accept", {
    p_token: acc.token,
    p_requester_id: requesterId,
  });
  if (error) throw error;
}

export async function removeFriend(otherId: string) {
  const acc = getAccount();
  if (!acc) throw new Error("not_authenticated");
  const { error } = await (supabase.rpc as any)("friend_remove", {
    p_token: acc.token,
    p_other_id: otherId,
  });
  if (error) throw error;
}
