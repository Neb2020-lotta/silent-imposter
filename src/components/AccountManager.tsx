import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getAdminToken, clearAdminToken, setAdminToken } from "@/lib/moderation";

const mono = "'Space Mono', monospace";
const rubik = "'Rubik', sans-serif";

const inputStyle: React.CSSProperties = {
  background: "hsl(var(--game-input-bg))",
  border: "1px solid hsl(var(--game-border))",
  color: "hsl(var(--game-text))",
  borderRadius: 2,
};

type AccountRow = { id: string; username: string; last_ip: string | null; created_at: string };

async function call(body: unknown) {
  return supabase.functions.invoke("moderation", {
    body,
    headers: { "x-admin-token": getAdminToken() },
  });
}

export default function AccountManager({ onClose }: { onClose: () => void }) {
  const [token, setToken] = useState(getAdminToken());
  const [tokenDraft, setTokenDraft] = useState("");
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<Record<string, { name: string; pw: string }>>({});

  const load = async () => {
    if (!getAdminToken()) return;
    setLoading(true);
    const { data, error } = await call({ action: "accounts_list" });
    setLoading(false);
    const errMsg = error?.message ?? (data as { error?: string })?.error;
    if (errMsg) {
      if (String(errMsg).includes("unauthorized")) {
        toast.error("Admin-Token ist ungültig");
        clearAdminToken();
        setToken("");
      } else if (String(errMsg).includes("Failed to fetch") || String(errMsg).includes("NetworkError")) {
        toast.error("Server nicht erreichbar");
      } else {
        toast.error(`Fehler beim Laden: ${errMsg}`);
      }
      return;
    }
    setRows((data as { accounts: AccountRow[] }).accounts);
  };

  useEffect(() => {
    if (token) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const submitToken = () => {
    const t = tokenDraft.trim();
    if (!t) return;
    setAdminToken(t);
    setToken(t);
    setTokenDraft("");
  };

  const setField = (id: string, key: "name" | "pw", val: string) =>
    setEditing((s) => ({ ...s, [id]: { name: s[id]?.name ?? "", pw: s[id]?.pw ?? "", [key]: val } }));

  const saveName = async (row: AccountRow) => {
    const nn = (editing[row.id]?.name ?? "").trim();
    if (!nn || nn === row.username) return;
    const { data, error } = await call({ action: "accounts_rename", account_id: row.id, username: nn });
    const err = error?.message ?? (data as { error?: string })?.error;
    if (err) {
      if (err.includes("username_taken")) toast.error("Name bereits vergeben");
      else if (err.includes("invalid_username")) toast.error("Ungültiger Name (2–24 Zeichen)");
      else toast.error("Fehler beim Umbenennen");
      return;
    }
    toast.success("Name geändert");
    setEditing((s) => ({ ...s, [row.id]: { ...s[row.id], name: "" } }));
    load();
  };

  const savePw = async (row: AccountRow) => {
    const pw = editing[row.id]?.pw ?? "";
    if (pw.length < 4) return toast.error("Passwort ≥ 4 Zeichen");
    const { data, error } = await call({ action: "accounts_set_password", account_id: row.id, password: pw });
    if (error || (data as { error?: string })?.error) return toast.error("Fehler");
    toast.success("Passwort gesetzt (Sessions gelöscht)");
    setEditing((s) => ({ ...s, [row.id]: { ...s[row.id], pw: "" } }));
  };

  const del = async (row: AccountRow) => {
    if (!confirm(`Account "${row.username}" wirklich löschen?`)) return;
    const { data, error } = await call({ action: "accounts_delete", account_id: row.id });
    if (error || (data as { error?: string })?.error) return toast.error("Fehler");
    toast.success("Gelöscht");
    load();
  };

  const filtered = rows.filter((r) => r.username.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
      style={{ background: "rgba(0,0,0,0.85)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-5"
        style={{
          background: "hsl(var(--game-card-bg))",
          border: "1px solid hsl(var(--game-accent))",
          borderRadius: 2,
        }}
      >
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest" style={{ fontFamily: mono, color: "hsl(var(--game-accent))" }}>
            // Account Management
          </p>
          <button onClick={onClose} className="text-xs uppercase" style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}>
            ✕
          </button>
        </div>

        {!token && (
          <div className="space-y-3">
            <p className="text-sm" style={{ fontFamily: rubik, color: "hsl(var(--game-secondary))" }}>
              Admin-Token eingeben.
            </p>
            <Input
              type="password"
              value={tokenDraft}
              onChange={(e) => setTokenDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitToken()}
              placeholder="MODERATION_ADMIN_TOKEN"
              style={inputStyle}
            />
            <button
              onClick={submitToken}
              className="w-full py-3 text-sm font-bold uppercase tracking-wider press-feedback"
              style={{ fontFamily: mono, background: "hsl(var(--game-accent))", color: "hsl(0 0% 8%)", borderRadius: 2 }}
            >
              Freischalten
            </button>
          </div>
        )}

        {token && (
          <>
            <p className="text-[10px]" style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}>
              Passwörter sind gehasht (bcrypt) und nicht lesbar. Du kannst sie hier neu setzen.
            </p>
            <div className="flex items-center gap-2">
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Nach Name filtern…"
                style={inputStyle}
              />
              <button
                onClick={load}
                className="px-3 py-2 text-[10px] uppercase tracking-widest press-feedback"
                style={{ fontFamily: mono, border: "1px solid hsl(var(--game-border))", color: "hsl(var(--game-accent))", borderRadius: 2 }}
              >
                {loading ? "..." : "↻"}
              </button>
            </div>

            <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}>
              {filtered.length} von {rows.length}
            </p>

            {filtered.map((r) => (
              <div key={r.id} className="p-3 space-y-2" style={{ border: "1px solid hsl(var(--game-border))", borderRadius: 2 }}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm font-bold" style={{ fontFamily: mono }}>{r.username}</p>
                    <p className="text-[10px]" style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}>
                      {r.last_ip ?? "–"} · {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => del(r)}
                    className="px-3 py-1.5 text-[10px] uppercase tracking-widest press-feedback"
                    style={{ fontFamily: mono, border: "1px solid hsl(0 70% 55%)", color: "hsl(0 70% 55%)", borderRadius: 2 }}
                  >
                    Löschen
                  </button>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={editing[r.id]?.name ?? ""}
                    onChange={(e) => setField(r.id, "name", e.target.value)}
                    placeholder="Neuer Name"
                    maxLength={24}
                    style={inputStyle}
                  />
                  <button
                    onClick={() => saveName(r)}
                    className="px-3 py-2 text-[10px] uppercase tracking-widest press-feedback whitespace-nowrap"
                    style={{ fontFamily: mono, border: "1px solid hsl(var(--game-accent))", color: "hsl(var(--game-accent))", borderRadius: 2 }}
                  >
                    Umbenennen
                  </button>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={editing[r.id]?.pw ?? ""}
                    onChange={(e) => setField(r.id, "pw", e.target.value)}
                    placeholder="Neues Passwort (min. 4)"
                    style={inputStyle}
                  />
                  <button
                    onClick={() => savePw(r)}
                    className="px-3 py-2 text-[10px] uppercase tracking-widest press-feedback whitespace-nowrap"
                    style={{ fontFamily: mono, background: "hsl(var(--game-accent))", color: "hsl(0 0% 8%)", borderRadius: 2 }}
                  >
                    Setzen
                  </button>
                </div>
              </div>
            ))}

            <button
              onClick={() => { clearAdminToken(); setToken(""); }}
              className="w-full text-[10px] uppercase tracking-widest py-2"
              style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}
            >
              Admin-Token vergessen
            </button>
          </>
        )}
      </div>
    </div>
  );
}
