import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { wordCategories, generateRoomCode } from "@/lib/words";
import { getClientId, getStoredName, setStoredName } from "@/lib/clientId";
import { toast } from "sonner";
import { Settings as Gear } from "lucide-react";
import { sfx } from "@/lib/sounds";

type Mode = "menu" | "host" | "join";

export default function Home() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("menu");
  const [name, setName] = useState(getStoredName());
  const [code, setCode] = useState("");
  const [category, setCategory] = useState("Alle Wörter");
  const [busy, setBusy] = useState(false);

  const createRoom = async () => {
    if (!name.trim()) return toast.error("Bitte gib einen Namen ein");
    setBusy(true);
    try {
      setStoredName(name.trim());
      const clientId = getClientId();
      let roomCode = "";
      let roomId: string | null = null;
      let lastError: unknown = null;
      for (let i = 0; i < 5 && !roomId; i++) {
        roomCode = generateRoomCode();
        const { data, error } = await supabase
          .from("rooms")
          .insert({ code: roomCode, host_id: clientId, category, imposter_count: 1 })
          .select("id")
          .single();
        if (!error && data) roomId = data.id;
        else lastError = error;
      }
      if (!roomId) {
        console.error("Room creation failed:", lastError);
        toast.error("Raum konnte nicht erstellt werden");
        setBusy(false);
        return;
      }
      const { error: pErr } = await supabase.from("players").insert({
        room_id: roomId,
        client_id: clientId,
        name: name.trim(),
        is_host: true,
      });
      if (pErr) {
        console.error("Player insert failed:", pErr);
        toast.error("Beitritt fehlgeschlagen. Bitte versuche es erneut.");
        setBusy(false);
        return;
      }
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
      .from("rooms")
      .select("id, state")
      .eq("code", upper)
      .maybeSingle();
    if (error || !room) {
      setBusy(false);
      return toast.error("Raum nicht gefunden");
    }
    if (room.state !== "lobby") {
      setBusy(false);
      return toast.error("Das Spiel hat bereits begonnen");
    }
    const clientId = getClientId();
    const { data: existing } = await supabase
      .from("players")
      .select("id")
      .eq("room_id", room.id)
      .eq("client_id", clientId)
      .maybeSingle();
    if (!existing) {
      const { error: insErr } = await supabase.from("players").insert({
        room_id: room.id,
        client_id: clientId,
        name: name.trim(),
        is_host: false,
      });
      if (insErr) {
        setBusy(false);
        return toast.error("Beitritt fehlgeschlagen");
      }
    }
    navigate(`/room/${upper}`);
  };

  const inputStyle = {
    background: "hsl(var(--game-input-bg))",
    border: "1px solid hsl(var(--game-border))",
    color: "hsl(var(--game-text))",
    borderRadius: 2,
  };

  const mono = "'Space Mono', monospace";
  const rubik = "'Rubik', sans-serif";

  return (
    <div
      className="flex min-h-screen w-full flex-col md:flex-row relative"
      style={{ background: "hsl(var(--game-bg-start))", color: "hsl(var(--game-text))" }}
    >
      <button
        onClick={() => {
          sfx.click();
          navigate("/settings");
        }}
        aria-label="Einstellungen"
        className="press-feedback absolute top-4 right-4 z-20 h-10 w-10 flex items-center justify-center"
        style={{
          border: "1px solid hsl(var(--game-border))",
          background: "hsl(var(--game-card-bg))",
          color: "hsl(var(--game-accent))",
          borderRadius: 2,
        }}
      >
        <Gear className="h-5 w-5" />
      </button>
      {/* LEFT — Brand */}
      <aside
        className="flex md:w-1/2 items-center justify-center px-8 py-16 md:py-12 border-b md:border-b-0 md:border-r"
        style={{
          borderColor: "hsl(var(--game-card-bg))",
          background:
            "linear-gradient(180deg, hsl(var(--game-bg-start)) 0%, hsl(var(--game-bg-end)) 100%)",
        }}
      >
        <div className="relative">
          <div
            className="absolute -top-12 -left-8 h-32 w-32 rounded-full blur-3xl"
            style={{ background: "hsl(var(--game-accent))", opacity: 0.12 }}
          />
          <h1
            className="relative text-5xl md:text-6xl font-bold tracking-tighter uppercase leading-[0.95]"
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
          <div className="space-y-2">
            <p
              className="text-xs font-bold tracking-widest uppercase italic"
              style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}
            >
              Session Select
            </p>
            <h2 className="text-xl font-medium" style={{ fontFamily: rubik }}>
              {mode === "menu"
                ? "Was willst du tun?"
                : mode === "host"
                ? "Neuen Raum erstellen"
                : "Raum beitreten"}
            </h2>
          </div>

          {mode === "menu" && (
            <div className="grid gap-4">
              <ActionCard
                title="Server hosten"
                tag="Host Panel"
                primary
                onClick={() => setMode("host")}
              />
              <ActionCard
                title="Server beitreten"
                tag="Client Access"
                onClick={() => setMode("join")}
              />
              <ActionCard
                title="Lokal spielen"
                tag="Pass & Play · 1 Gerät"
                onClick={() => navigate("/local")}
              />
              <ActionCard
                title="Gegen KI spielen"
                tag="Neural Net · Singleplayer"
                onClick={() => navigate("/ai")}
              />
              <ActionCard
                title="Wie spielt man?"
                tag="Anleitung · ❓"
                onClick={() => navigate("/instructions")}
              />
            </div>
          )}

          {mode !== "menu" && (
            <div className="space-y-4">
              <Field label="Dein Name">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Wie heißt du?"
                  maxLength={20}
                  style={inputStyle}
                />
              </Field>

              {mode === "host" && (
                <>
                  <Field label="Thema">
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger style={inputStyle}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(wordCategories).map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <PrimaryButton onClick={createRoom} disabled={busy}>
                    Raum erstellen
                  </PrimaryButton>
                </>
              )}

              {mode === "join" && (
                <>
                  <Field label="Raum-Code">
                    <Input
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="6-stelliger Code"
                      maxLength={6}
                      className="text-center text-2xl tracking-[0.4em] font-bold"
                      style={{ ...inputStyle, fontFamily: mono }}
                    />
                  </Field>
                  <PrimaryButton onClick={joinRoom} disabled={busy}>
                    Beitreten
                  </PrimaryButton>
                </>
              )}

              <Button
                variant="ghost"
                onClick={() => setMode("menu")}
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
            <div
              className="h-2 w-2 rounded-full animate-pulse"
              style={{ background: "hsl(var(--game-accent))" }}
            />
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
      <label
        className="block text-[10px] uppercase tracking-widest"
        style={{ fontFamily: "'Space Mono', monospace", color: "hsl(var(--game-secondary))" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function ActionCard({
  title,
  tag,
  primary,
  onClick,
}: {
  title: string;
  tag: string;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={() => { sfx.click(); onClick(); }}
      className="press-feedback group relative flex items-center justify-between overflow-hidden p-5 text-left transition-all"
      style={{
        borderRadius: 2,
        border: `1px solid ${primary ? "hsl(var(--game-border))" : "hsl(var(--game-card-bg))"}`,
        background: primary ? "hsl(var(--game-card-bg))" : "transparent",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "hsl(var(--game-accent))";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = primary
          ? "hsl(var(--game-border))"
          : "hsl(var(--game-card-bg))";
      }}
    >
      <div className="relative z-10">
        <span
          className="block text-[10px] uppercase tracking-widest"
          style={{ fontFamily: "'Space Mono', monospace", color: "hsl(var(--game-secondary))" }}
        >
          {tag}
        </span>
        <span
          className="text-lg font-medium"
          style={{ fontFamily: "'Rubik', sans-serif", color: "hsl(var(--game-text))" }}
        >
          {title}
        </span>
      </div>
      <svg
        className="h-5 w-5 transition-transform group-hover:translate-x-1"
        style={{ color: "hsl(var(--game-accent))" }}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
      </svg>
    </button>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={() => { sfx.click(); onClick(); }}
      disabled={disabled}
      className="press-feedback w-full py-4 px-6 text-sm font-bold uppercase tracking-wider transition-all disabled:opacity-50"
      style={{
        fontFamily: "'Space Mono', monospace",
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
