import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { addBan, listBans, removeBan, type BanEntry } from "@/lib/moderation";

const mono = "'Space Mono', monospace";
const rubik = "'Rubik', sans-serif";

const inputStyle: React.CSSProperties = {
  background: "hsl(var(--game-input-bg))",
  border: "1px solid hsl(var(--game-border))",
  color: "hsl(var(--game-text))",
  borderRadius: 2,
};

export default function BanManager({ onClose }: { onClose: () => void }) {
  const [entries, setEntries] = useState<BanEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [ip, setIp] = useState("");
  const [kind, setKind] = useState<"ban" | "timeout">("ban");
  const [minutes, setMinutes] = useState(10);
  const [reason, setReason] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      setEntries(await listBans());
    } catch (e) {
      const msg = String((e as Error)?.message ?? e);
      if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
        toast.error("Server nicht erreichbar");
      } else {
        toast.error(`Fehler beim Laden: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 animate-fade-in"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5 animate-scale-in"
        style={{
          background: "hsl(var(--game-card-bg))",
          border: "1px solid hsl(var(--game-accent))",
          borderRadius: 2,
          boxShadow: "0 20px 60px -10px hsl(var(--game-accent) / 0.4)",
        }}
      >
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest" style={{ fontFamily: mono, color: "hsl(var(--game-accent))" }}>
            // Ban Management · IP
          </p>
          <button
            onClick={onClose}
            className="text-xs uppercase transition-transform hover:rotate-90 hover:scale-110"
            style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 p-4 animate-fade-in" style={{ border: "1px solid hsl(var(--game-border))", borderRadius: 2 }}>
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
              className="py-2 text-xs uppercase tracking-widest press-feedback transition-all duration-200 hover:scale-[1.02]"
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
              className="py-2 text-xs uppercase tracking-widest press-feedback transition-all duration-200 hover:scale-[1.02]"
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
            <div className="flex items-center gap-2 animate-fade-in">
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
            className="w-full py-3 text-sm font-bold uppercase tracking-wider press-feedback transition-transform hover:scale-[1.02]"
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
            <button
              onClick={load}
              className="text-[10px] uppercase tracking-widest transition-transform hover:scale-110"
              style={{ fontFamily: mono, color: "hsl(var(--game-accent))" }}
            >
              {loading ? "..." : "↻ Aktualisieren"}
            </button>
          </div>
          {entries.length === 0 && (
            <p className="text-xs py-6 text-center" style={{ fontFamily: rubik, color: "hsl(var(--game-secondary))" }}>
              Keine Einträge
            </p>
          )}
          {entries.map((e, idx) => (
            <div
              key={e.ip}
              className="flex items-center justify-between p-3 gap-3 animate-fade-in transition-all hover:border-[hsl(var(--game-accent))]"
              style={{
                border: "1px solid hsl(var(--game-border))",
                borderRadius: 2,
                animationDelay: `${idx * 30}ms`,
                animationFillMode: "both",
              }}
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
                className="px-3 py-1.5 text-[10px] uppercase tracking-widest press-feedback transition-all hover:scale-105"
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
      </div>
    </div>
  );
}
