import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  addBan,
  clearAdminToken,
  getAdminToken,
  listBans,
  removeBan,
  setAdminToken,
  type BanEntry,
} from "@/lib/moderation";

const mono = "'Space Mono', monospace";
const rubik = "'Rubik', sans-serif";

const inputStyle: React.CSSProperties = {
  background: "hsl(var(--game-input-bg))",
  border: "1px solid hsl(var(--game-border))",
  color: "hsl(var(--game-text))",
  borderRadius: 2,
};

export default function BanManager({ onClose }: { onClose: () => void }) {
  const [token, setToken] = useState(getAdminToken());
  const [tokenDraft, setTokenDraft] = useState("");
  const [entries, setEntries] = useState<BanEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [ip, setIp] = useState("");
  const [kind, setKind] = useState<"ban" | "timeout">("ban");
  const [minutes, setMinutes] = useState(10);
  const [reason, setReason] = useState("");

  const load = async () => {
    if (!getAdminToken()) return;
    setLoading(true);
    try {
      setEntries(await listBans());
    } catch (e) {
      const msg = String((e as Error)?.message ?? e);
      if (msg.includes("unauthorized")) {
        toast.error("Admin-Token ist ungültig");
        clearAdminToken();
        setToken("");
      } else if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
        toast.error("Server nicht erreichbar");
      } else {
        toast.error(`Fehler beim Laden: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
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

  const handleAdd = async () => {
    const clean = ip.trim();
    if (!clean) return toast.error("IP fehlt");
    try {
      await addBan(clean, kind, kind === "timeout" ? minutes : undefined, reason.trim() || undefined);
      toast.success(kind === "ban" ? "Gebannt" : "Timeout gesetzt");
      setIp("");
      setReason("");
      load();
    } catch {
      toast.error("Konnte nicht speichern");
    }
  };

  const handleRemove = async (target: string) => {
    try {
      await removeBan(target);
      toast.success("Entbannt");
      load();
    } catch {
      toast.error("Konnte nicht entfernen");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
      style={{ background: "rgba(0,0,0,0.85)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5"
        style={{
          background: "hsl(var(--game-card-bg))",
          border: "1px solid hsl(var(--game-accent))",
          borderRadius: 2,
        }}
      >
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest" style={{ fontFamily: mono, color: "hsl(var(--game-accent))" }}>
            // Ban Management · IP
          </p>
          <button onClick={onClose} className="text-xs uppercase" style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}>
            ✕
          </button>
        </div>

        {!token && (
          <div className="space-y-3">
            <p className="text-sm" style={{ fontFamily: rubik, color: "hsl(var(--game-secondary))" }}>
              Admin-Token eingeben (einmalig lokal gespeichert).
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
            <div className="space-y-3 p-4" style={{ border: "1px solid hsl(var(--game-border))", borderRadius: 2 }}>
              <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}>
                Neuer Eintrag
              </p>
              <Input
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                placeholder="IP-Adresse (z. B. 1.2.3.4)"
                style={inputStyle}
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setKind("ban")}
                  className="py-2 text-xs uppercase tracking-widest press-feedback"
                  style={{
                    fontFamily: mono,
                    borderRadius: 2,
                    background: kind === "ban" ? "hsl(var(--game-accent))" : "transparent",
                    color: kind === "ban" ? "hsl(0 0% 8%)" : "hsl(var(--game-text))",
                    border: "1px solid hsl(var(--game-border))",
                  }}
                >
                  Ban (permanent)
                </button>
                <button
                  onClick={() => setKind("timeout")}
                  className="py-2 text-xs uppercase tracking-widest press-feedback"
                  style={{
                    fontFamily: mono,
                    borderRadius: 2,
                    background: kind === "timeout" ? "hsl(var(--game-accent))" : "transparent",
                    color: kind === "timeout" ? "hsl(0 0% 8%)" : "hsl(var(--game-text))",
                    border: "1px solid hsl(var(--game-border))",
                  }}
                >
                  Timeout
                </button>
              </div>
              {kind === "timeout" && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-widest" style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}>
                    Minuten:
                  </span>
                  <Input
                    type="number"
                    min={1}
                    max={525600}
                    value={minutes}
                    onChange={(e) => setMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{ ...inputStyle, width: 120 }}
                  />
                </div>
              )}
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Grund (optional)"
                maxLength={200}
                style={inputStyle}
              />
              <button
                onClick={handleAdd}
                className="w-full py-3 text-sm font-bold uppercase tracking-wider press-feedback"
                style={{ fontFamily: mono, background: "hsl(var(--game-accent))", color: "hsl(0 0% 8%)", borderRadius: 2 }}
              >
                Hinzufügen
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}>
                  Aktive Einträge ({entries.length})
                </p>
                <button onClick={load} className="text-[10px] uppercase tracking-widest" style={{ fontFamily: mono, color: "hsl(var(--game-accent))" }}>
                  {loading ? "..." : "↻ Aktualisieren"}
                </button>
              </div>
              {entries.length === 0 && (
                <p className="text-xs py-6 text-center" style={{ fontFamily: rubik, color: "hsl(var(--game-secondary))" }}>
                  Keine Einträge
                </p>
              )}
              {entries.map((e) => (
                <div
                  key={e.ip}
                  className="flex items-center justify-between p-3 gap-3"
                  style={{ border: "1px solid hsl(var(--game-border))", borderRadius: 2 }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate" style={{ fontFamily: mono }}>{e.ip}</p>
                    <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}>
                      {e.kind}
                      {e.expires_at && ` · bis ${new Date(e.expires_at).toLocaleString()}`}
                    </p>
                    {e.reason && (
                      <p className="text-xs truncate" style={{ fontFamily: rubik, color: "hsl(var(--game-secondary))" }}>
                        {e.reason}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemove(e.ip)}
                    className="px-3 py-1.5 text-[10px] uppercase tracking-widest press-feedback"
                    style={{
                      fontFamily: mono,
                      border: "1px solid hsl(var(--game-accent))",
                      color: "hsl(var(--game-accent))",
                      borderRadius: 2,
                    }}
                  >
                    Entbannen
                  </button>
                </div>
              ))}
            </div>

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
