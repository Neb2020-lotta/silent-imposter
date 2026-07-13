import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const mono = "'Space Mono', monospace";

const inputStyle: React.CSSProperties = {
  background: "hsl(var(--game-input-bg))",
  border: "1px solid hsl(var(--game-border))",
  color: "hsl(var(--game-text))",
  borderRadius: 2,
};

type AccountRow = { id: string; username: string; last_ip: string | null; created_at: string };

async function call(body: unknown) {
  return supabase.functions.invoke("moderation", { body });
}

export default function AccountManager({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<Record<string, { name: string; pw: string }>>({});
  const [playerNames, setPlayerNames] = useState<{ name: string; count: number; last: string }[]>([]);
  const [showPlayers, setShowPlayers] = useState(false);

  const loadPlayerNames = async () => {
    const { data, error } = await supabase
      .from("players")
      .select("name, joined_at")
      .order("joined_at", { ascending: false })
      .limit(2000);
    if (error) return toast.error("Fehler beim Laden der Spielernamen");
    const map = new Map<string, { count: number; last: string }>();
    for (const r of (data ?? []) as { name: string; joined_at: string }[]) {
      const cur = map.get(r.name);
      if (cur) cur.count += 1;
      else map.set(r.name, { count: 1, last: r.joined_at });
    }
    setPlayerNames(
      Array.from(map.entries())
        .map(([name, v]) => ({ name, count: v.count, last: v.last }))
        .sort((a, b) => b.last.localeCompare(a.last)),
    );
  };

  const load = async () => {
    setLoading(true);
    const { data, error } = await call({ action: "accounts_list" });
    setLoading(false);
    const errMsg = error?.message ?? (data as { error?: string })?.error;
    if (errMsg) {
      if (String(errMsg).includes("Failed to fetch") || String(errMsg).includes("NetworkError")) {
        toast.error("Server nicht erreichbar");
      } else {
        toast.error(`Fehler beim Laden: ${errMsg}`);
      }
      return;
    }
    setRows((data as { accounts: AccountRow[] }).accounts);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 animate-fade-in"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-5 animate-scale-in"
        style={{
          background: "hsl(var(--game-card-bg))",
          border: "1px solid hsl(var(--game-accent))",
          borderRadius: 2,
          boxShadow: "0 20px 60px -10px hsl(var(--game-accent) / 0.4)",
        }}
      >
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest" style={{ fontFamily: mono, color: "hsl(var(--game-accent))" }}>
            // Account Management
          </p>
          <button
            onClick={onClose}
            className="text-xs uppercase transition-transform hover:rotate-90 hover:scale-110"
            style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}
          >
            ✕
          </button>
        </div>

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
            className="px-3 py-2 text-[10px] uppercase tracking-widest press-feedback transition-transform hover:scale-110 hover:rotate-180"
            style={{ fontFamily: mono, border: "1px solid hsl(var(--game-border))", color: "hsl(var(--game-accent))", borderRadius: 2 }}
          >
            {loading ? "..." : "↻"}
          </button>
        </div>

        <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}>
          {filtered.length} von {rows.length}
        </p>

        {filtered.map((r, idx) => (
          <div
            key={r.id}
            className="p-3 space-y-2 animate-fade-in transition-all hover:border-[hsl(var(--game-accent))]"
            style={{
              border: "1px solid hsl(var(--game-border))",
              borderRadius: 2,
              animationDelay: `${Math.min(idx, 20) * 25}ms`,
              animationFillMode: "both",
            }}
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <p className="text-sm font-bold" style={{ fontFamily: mono }}>{r.username}</p>
                <p className="text-[10px]" style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}>
                  {r.last_ip ?? "–"} · {new Date(r.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => del(r)}
                className="px-3 py-1.5 text-[10px] uppercase tracking-widest press-feedback transition-all hover:scale-105"
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
                className="px-3 py-2 text-[10px] uppercase tracking-widest press-feedback whitespace-nowrap transition-transform hover:scale-105"
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
                className="px-3 py-2 text-[10px] uppercase tracking-widest press-feedback whitespace-nowrap transition-transform hover:scale-105"
                style={{ fontFamily: mono, background: "hsl(var(--game-accent))", color: "hsl(0 0% 8%)", borderRadius: 2 }}
              >
                Setzen
              </button>
            </div>
          </div>
        ))}

        <div className="pt-3" style={{ borderTop: "1px solid hsl(var(--game-border))" }}>
          <button
            onClick={() => {
              const next = !showPlayers;
              setShowPlayers(next);
              if (next && playerNames.length === 0) loadPlayerNames();
            }}
            className="w-full px-3 py-2 text-[10px] uppercase tracking-widest press-feedback transition-all hover:scale-[1.01]"
            style={{ fontFamily: mono, border: "1px solid hsl(var(--game-border))", color: "hsl(var(--game-accent))", borderRadius: 2 }}
          >
            {showPlayers ? "▼" : "▶"} Alle Spielernamen ({playerNames.length || "…"})
          </button>
          {showPlayers && (
            <div className="mt-2 space-y-1 max-h-72 overflow-y-auto animate-fade-in">
              <div className="flex justify-end">
                <button
                  onClick={loadPlayerNames}
                  className="px-2 py-1 text-[10px] uppercase tracking-widest transition-transform hover:scale-110"
                  style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}
                >
                  ↻ Aktualisieren
                </button>
              </div>
              {playerNames
                .filter((p) => p.name.toLowerCase().includes(filter.toLowerCase()))
                .map((p, idx) => (
                  <div
                    key={p.name}
                    className="flex items-center justify-between px-2 py-1.5 animate-fade-in"
                    style={{
                      border: "1px solid hsl(var(--game-border))",
                      borderRadius: 2,
                      animationDelay: `${Math.min(idx, 30) * 15}ms`,
                      animationFillMode: "both",
                    }}
                  >
                    <span className="text-xs font-bold" style={{ fontFamily: mono }}>{p.name}</span>
                    <span className="text-[10px]" style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}>
                      {p.count}× · {new Date(p.last).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              {playerNames.length === 0 && (
                <p className="text-[10px] text-center py-3" style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}>
                  Keine Spielernamen gefunden
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
