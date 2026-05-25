import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { wordCategories, generateRoomCode } from "@/lib/words";
import { getClientId, getStoredName, setStoredName } from "@/lib/clientId";
import { toast } from "sonner";
import { Loader2, ArrowRight } from "lucide-react";
import ParticleBg from "@/components/ParticleBg";
import Stepper from "@/components/Stepper";
import type { Difficulty } from "@/lib/words";

type Mode = "menu" | "host" | "join";

const mono = "'Space Mono', monospace";
const rubik = "'Rubik', sans-serif";

export default function Home() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("menu");
  const [name, setName] = useState(getStoredName());
  const [code, setCode] = useState("");
  const [category, setCategory] = useState("Allgemein");
  const [imposterCount, setImposterCount] = useState(1);
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [busy, setBusy] = useState(false);

  const createRoom = async () => {
    if (!name.trim()) return toast.error("Bitte gib einen Namen ein");
    setBusy(true);
    try {
      setStoredName(name.trim());
      const clientId = getClientId();
      let roomCode = "";
      let roomId: string | null = null;
      for (let i = 0; i < 5 && !roomId; i++) {
        roomCode = generateRoomCode();
        const { data, error } = await supabase
          .from("rooms")
          .insert({ code: roomCode, host_id: clientId, category, imposter_count: imposterCount })
          .select("id")
          .single();
        if (!error && data) roomId = data.id;
      }
      if (!roomId) { toast.error("Raum konnte nicht erstellt werden"); setBusy(false); return; }
      const { error: pErr } = await supabase.from("players").insert({
        room_id: roomId, client_id: clientId, name: name.trim(), is_host: true,
      });
      if (pErr) { toast.error("Beitritt fehlgeschlagen."); setBusy(false); return; }
      try { sessionStorage.setItem(`room_diff_${roomCode}`, difficulty); } catch { /* ignore */ }
      navigate(`/room/${roomCode}`);
    } catch (e) {
      console.error(e);
      toast.error("Unerwarteter Fehler");
      setBusy(false);
    }
  };

  const joinRoom = async () => {
    if (!name.trim()) return toast.error("Bitte gib einen Namen ein");
    if (!code.trim()) return toast.error("Bitte gib den Raum-Code ein");
    setBusy(true);
    setStoredName(name.trim());
    const upper = code.trim().toUpperCase();
    const { data: room, error } = await supabase
      .from("rooms").select("id, state").eq("code", upper).maybeSingle();
    if (error || !room) { setBusy(false); return toast.error("Raum nicht gefunden"); }
    if (room.state !== "lobby") { setBusy(false); return toast.error("Das Spiel hat bereits begonnen"); }
    const clientId = getClientId();
    const { data: existing } = await supabase
      .from("players").select("id").eq("room_id", room.id).eq("client_id", clientId).maybeSingle();
    if (!existing) {
      const { error: insErr } = await supabase.from("players").insert({
        room_id: room.id, client_id: clientId, name: name.trim(), is_host: false,
      });
      if (insErr) { setBusy(false); return toast.error("Beitritt fehlgeschlagen"); }
    }
    navigate(`/room/${upper}`);
  };

  const inputStyle = {
    background: "hsl(var(--game-input-bg))",
    border: "1px solid hsl(var(--game-border))",
    color: "hsl(var(--game-text))",
    borderRadius: 2,
  };

  return (
    <div
      className="flex min-h-screen w-full flex-col md:flex-row page-enter"
      style={{ background: "hsl(var(--game-bg-start))", color: "hsl(var(--game-text))" }}
    >
      {/* LEFT — Brand */}
      <aside
        className="relative flex md:w-1/2 items-center justify-center px-8 py-16 md:py-12 border-b md:border-b-0 md:border-r overflow-hidden"
        style={{
          borderColor: "hsl(var(--game-card-bg))",
          background:
            "radial-gradient(ellipse at center, hsla(var(--game-accent),0.10), hsl(var(--game-bg-start)) 65%)",
        }}
      >
        <ParticleBg count={22} />
        <div className="relative z-10">
          <div
            className="absolute -top-16 -left-10 h-40 w-40 rounded-full blur-3xl animate-logo-pulse"
            style={{ background: "hsl(var(--game-accent))", opacity: 0.18 }}
          />
          <h1
            className="relative text-5xl md:text-6xl font-bold tracking-tighter uppercase leading-[0.95] animate-logo-pulse"
            style={{ fontFamily: mono }}
          >
            Silent<br />
            <span style={{ color: "hsl(var(--game-accent))" }}>Imposter</span>
          </h1>
          <div className="mt-5 h-[3px] w-12" style={{ background: "hsl(var(--game-accent))" }} />
          <p
            className="mt-6 text-xs uppercase tracking-[0.25em]"
            style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}
          >
            // Underground Party Protocol
          </p>
        </div>
      </aside>

      {/* RIGHT — Actions */}
      <main className="flex md:w-1/2 items-center justify-center px-8 py-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2 animate-fade-in">
            <p
              className="text-xs font-bold tracking-widest uppercase italic"
              style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}
            >
              Session Select
            </p>
            <h2 className="text-xl font-medium" style={{ fontFamily: rubik }}>
              {mode === "menu" ? "Was willst du tun?"
                : mode === "host" ? "Neuen Raum erstellen"
                : "Raum beitreten"}
            </h2>
          </div>

          {mode === "menu" && (
            <div className="grid gap-4">
              {[
                { title: "Server hosten", tag: "Host Panel", primary: true, onClick: () => setMode("host") },
                { title: "Server beitreten", tag: "Client Access", onClick: () => setMode("join") },
                { title: "Lokal spielen", tag: "Pass & Play · 1 Gerät", onClick: () => navigate("/local") },
                { title: "Gegen KI spielen", tag: "Neural Net · Singleplayer", onClick: () => navigate("/ai") },
                { title: "Wie spielt man?", tag: "Anleitung · ❓", onClick: () => navigate("/instructions") },
              ].map((item, i) => (
                <div key={item.title} style={{ animation: `slide-up 0.5s ${i * 80}ms cubic-bezier(0.16,1,0.3,1) both` }}>
                  <ActionCard {...item} />
                </div>
              ))}
            </div>
          )}

          {mode !== "menu" && (
            <div className="space-y-4 animate-fade-in">
              <Field label="Dein Name">
                <Input
                  value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Wie heißt du?" maxLength={20}
                  className="term-input" style={inputStyle}
                />
              </Field>

              {mode === "host" && (
                <>
                  <Field label="Thema">
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="term-input" style={inputStyle}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.keys(wordCategories).map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Schwierigkeit">
                    <DifficultyTabs value={difficulty} onChange={setDifficulty} />
                  </Field>

                  <Field label="Anzahl Imposter">
                    <Stepper value={imposterCount} onChange={setImposterCount} min={1} max={4} />
                  </Field>

                  <PrimaryButton onClick={createRoom} disabled={busy}>
                    {busy ? <><Loader2 className="h-4 w-4 animate-spin mr-2 inline" /> Erstelle...</> : "Raum erstellen"}
                  </PrimaryButton>
                </>
              )}

              {mode === "join" && (
                <>
                  <Field label="Raum-Code">
                    <Input
                      value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="6-stelliger Code" maxLength={6}
                      className="text-center text-2xl tracking-[0.4em] font-bold term-input"
                      style={{ ...inputStyle, fontFamily: mono }}
                    />
                  </Field>
                  <PrimaryButton onClick={joinRoom} disabled={busy}>
                    {busy ? <><Loader2 className="h-4 w-4 animate-spin mr-2 inline" /> Verbinde...</> : "Beitreten"}
                  </PrimaryButton>
                </>
              )}

              <Button
                variant="ghost" onClick={() => setMode("menu")}
                className="w-full text-xs uppercase tracking-widest"
                style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}
              >
                ← Zurück
              </Button>
            </div>
          )}

          <div
            className="flex items-center space-x-3 pt-4 border-t"
            style={{ borderColor: "hsl(var(--game-card-bg))" }}
          >
            <div className="h-2 w-2 rounded-full animate-pulse" style={{ background: "hsl(var(--game-accent))" }} />
            <span
              className="text-[10px] uppercase tracking-tighter"
              style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}
            >
              System ready: listening for commands
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] uppercase tracking-widest"
        style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

export function DifficultyTabs({ value, onChange }: { value: Difficulty; onChange: (v: Difficulty) => void }) {
  const opts: { v: Difficulty; label: string }[] = [
    { v: "easy", label: "Leicht" },
    { v: "normal", label: "Normal" },
    { v: "hard", label: "Schwer" },
  ];
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {opts.map((o) => {
        const active = value === o.v;
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            className="py-2.5 text-[11px] uppercase tracking-widest transition-all active:scale-95"
            style={{
              fontFamily: mono,
              background: active ? "hsla(var(--game-accent),0.15)" : "hsl(var(--game-input-bg))",
              border: `1px solid ${active ? "hsl(var(--game-accent))" : "hsl(var(--game-border))"}`,
              color: active ? "hsl(var(--game-accent))" : "hsl(var(--game-text))",
              borderRadius: 2,
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function ActionCard({
  title, tag, primary, onClick,
}: { title: string; tag: string; primary?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex items-center justify-between overflow-hidden p-5 text-left transition-all hover:-translate-y-0.5 active:scale-[0.98] ${primary ? "animate-glow-pulse" : ""}`}
      style={{
        borderRadius: 2,
        border: `${primary ? "2px" : "1px"} solid ${primary ? "hsl(var(--game-accent))" : "hsl(var(--game-card-bg))"}`,
        background: primary
          ? "linear-gradient(135deg, hsla(var(--game-accent),0.10), hsl(var(--game-card-bg)))"
          : "transparent",
        boxShadow: primary ? "0 0 24px -6px hsla(var(--game-accent),0.45)" : "none",
      }}
      onMouseEnter={(e) => { if (!primary) e.currentTarget.style.borderColor = "hsl(var(--game-accent))"; }}
      onMouseLeave={(e) => { if (!primary) e.currentTarget.style.borderColor = "hsl(var(--game-card-bg))"; }}
    >
      <div className="relative z-10">
        <span className="block text-[10px] uppercase tracking-widest"
          style={{ fontFamily: mono, color: primary ? "hsl(var(--game-accent))" : "hsl(var(--game-secondary))" }}>
          {tag}
        </span>
        <span className={`block ${primary ? "text-xl" : "text-lg"} font-medium`}
          style={{ fontFamily: rubik, color: "hsl(var(--game-text))" }}>
          {title}
        </span>
      </div>
      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" style={{ color: "hsl(var(--game-accent))" }} />
    </button>
  );
}

function PrimaryButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="btn-press w-full py-4 px-6 text-sm font-bold uppercase tracking-wider disabled:opacity-50"
      style={{
        fontFamily: mono,
        background: "hsl(var(--game-accent))",
        color: "hsl(0 0% 8%)",
        borderRadius: 2,
        boxShadow: "var(--game-button-shadow)",
      }}
    >
      {children}
    </button>
  );
}
