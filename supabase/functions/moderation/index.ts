import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);


const IpSchema = z
  .string()
  .min(3)
  .max(64)
  .regex(/^[0-9a-fA-F:.]+$/, "invalid ip");

const BodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("check") }),
  z.object({ action: z.literal("list") }),
  z.object({
    action: z.literal("add"),
    ip: IpSchema,
    kind: z.enum(["ban", "timeout"]),
    minutes: z.number().int().min(1).max(60 * 24 * 365).optional(),
    reason: z.string().max(200).optional(),
  }),
  z.object({ action: z.literal("remove"), ip: IpSchema }),
  z.object({ action: z.literal("accounts_list") }),
  z.object({ action: z.literal("accounts_rename"), account_id: z.string().uuid(), username: z.string().trim().min(2).max(24) }),
  z.object({ action: z.literal("accounts_set_password"), account_id: z.string().uuid(), password: z.string().min(4).max(200) }),
  z.object({ action: z.literal("accounts_delete"), account_id: z.string().uuid() }),
]);

function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    "unknown";
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}




async function purgeExpired() {
  await supabase
    .from("moderation_bans")
    .delete()
    .not("expires_at", "is", null)
    .lt("expires_at", new Date().toISOString());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let raw: unknown;
  try {
    const text = await req.text();
    if (text.length > 4096) return json({ error: "payload_too_large" }, 413);
    raw = text ? JSON.parse(text) : {};
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) return json({ error: "invalid_input" }, 400);
  const body = parsed.data;

  await purgeExpired();

  if (body.action === "check") {
    const ip = getClientIp(req);
    const { data } = await supabase
      .from("moderation_bans")
      .select("ip, kind, reason, expires_at")
      .eq("ip", ip)
      .maybeSingle();
    return json({ ip, entry: data ?? null });
  }




  if (body.action === "list") {
    const { data, error } = await supabase
      .from("moderation_bans")
      .select("ip, kind, reason, expires_at, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) return json({ error: "db_error" }, 500);
    return json({ entries: data ?? [] });
  }

  if (body.action === "add") {
    const expires_at =
      body.kind === "timeout"
        ? new Date(Date.now() + (body.minutes ?? 10) * 60_000).toISOString()
        : null;
    const { error } = await supabase.from("moderation_bans").upsert(
      {
        ip: body.ip,
        kind: body.kind,
        reason: body.reason ?? null,
        expires_at,
      },
      { onConflict: "ip" },
    );
    if (error) return json({ error: "db_error" }, 500);
    return json({ ok: true });
  }

  if (body.action === "remove") {
    const { error } = await supabase.from("moderation_bans").delete().eq("ip", body.ip);
    if (error) return json({ error: "db_error" }, 500);
    return json({ ok: true });
  }

  if (body.action === "accounts_list") {
    const { data, error } = await supabase.schema("game_internal" as never).rpc("admin_list_accounts");
    if (error) return json({ error: "db_error", detail: error.message }, 500);
    return json({ accounts: data ?? [] });
  }

  if (body.action === "accounts_rename") {
    const { error } = await supabase.schema("game_internal" as never).rpc("admin_rename_account", {
      p_account_id: body.account_id, p_new_username: body.username,
    });
    if (error) return json({ error: error.message.includes("username_taken") ? "username_taken" : error.message.includes("invalid_username") ? "invalid_username" : "db_error" }, 400);
    return json({ ok: true });
  }

  if (body.action === "accounts_set_password") {
    const { error } = await supabase.schema("game_internal" as never).rpc("admin_set_password", {
      p_account_id: body.account_id, p_new_password: body.password,
    });
    if (error) return json({ error: "db_error", detail: error.message }, 500);
    return json({ ok: true });
  }

  if (body.action === "accounts_delete") {
    const { error } = await supabase.schema("game_internal" as never).rpc("admin_delete_account", {
      p_account_id: body.account_id,
    });
    if (error) return json({ error: "db_error", detail: error.message }, 500);
    return json({ ok: true });
  }

  return json({ error: "unknown_action" }, 400);
});
