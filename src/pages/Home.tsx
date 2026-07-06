import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { wordCategories, generateRoomCode } from "@/lib/words";
import { getClientId, getStoredName, setStoredName } from "@/lib/clientId";
import { setHostSecret, setPlayerId } from "@/lib/roomAuth";
import { toast } from "sonner";
import { Settings as Gear, User, Users } from "lucide-react";
import { sfx } from "@/lib/sounds";
import BanManager from "@/components/BanManager";
import AuthModal from "@/components/AuthModal";
import FriendsModal from "@/components/FriendsModal";
import { getAccount, tryIpAutoLogin, type Account } from "@/lib/account";


type Mode = "menu" | "host" | "join";

export default function Home() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("menu");
  const [name, setName] = useState(getStoredName());
  const [code, setCode] = useState("");
  const [category, setCategory] = useState("Alle Wörter");
  const [busy, setBusy] = useState(false);
  const [dotClicks, setDotClicks] = useState(0);
  const [devPrompt, setDevPrompt] = useState(false);
  const [devInput, setDevInput] = useState("");
  const [devOpen, setDevOpen] = useState(false);
  const [banManagerOpen, setBanManagerOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [account, setAccount] = useState<Account | null>(getAccount());

  useEffect(() => {
    const sync = () => setAccount(getAccount());
    window.addEventListener("account-changed", sync);
    if (!getAccount()) {
      tryIpAutoLogin().then((a) => { if (a) setAccount(a); });
    }
    return () => window.removeEventListener("account-changed", sync);
  }, []);

  useEffect(() => {
    if (account && !name.trim()) setName(account.username);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);



  const createRoom = async () => {
    if (!name.trim()) return toast.error("Bitte gib einen Namen ein");
    setBusy(true);
    try {
      setStoredName(name.trim());
      const clientId = getClientId();
      let roomCode = "";
      let roomId: string | null = null;
      let hostSecret: string | null = null;
      let playerId: string | null = null;
      for (let i = 0; i < 5 && !roomId; i++) {
        roomCode = generateRoomCode();
        const { data, error } = await supabase.rpc("create_room", {
          p_code: roomCode,
          p_client_id: clientId,
          p_category: category,
          p_name: name.trim(),
        });
        if (!error && data && data.length > 0) {
          roomId = (data[0] as { room_id: string }).room_id;
          hostSecret = (data[0] as { host_secret: string }).host_secret;
          playerId = (data[0] as { player_id: string }).player_id;
        } else if (error) {
          console.error("create_room failed:", error);
        }
      }
      if (!roomId || !hostSecret || !playerId) {
        toast.error("Raum konnte nicht erstellt werden");
        setBusy(false);
        return;
      }
      setHostSecret(roomId, hostSecret);
      setPlayerId(roomId, playerId);
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
    const clientId = getClientId();
    const { data, error } = await supabase.rpc("join_room", {
      p_code: upper,
      p_client_id: clientId,
      p_name: name.trim(),
    });
    if (error || !data || data.length === 0) {
      setBusy(false);
      const msg = error?.message ?? "";
      if (msg.includes("not_found")) return toast.error("Raum nicht gefunden");
      if (msg.includes("already_started")) return toast.error("Das Spiel hat bereits begonnen");
      if (msg.includes("invalid_name")) return toast.error("Ungültiger Name");
      console.error("join_room failed:", error);
      return toast.error("Beitritt fehlgeschlagen");
    }
    const row = data[0] as { room_id: string; player_id: string };
    setPlayerId(row.room_id, row.player_id);
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
            <button
              onClick={() => {
                sfx.click();
                const next = dotClicks + 1;
                if (next >= 3) {
                  setDotClicks(0);
                  setDevPrompt(true);
                } else {
                  setDotClicks(next);
                  setTimeout(() => setDotClicks((c) => (c === next ? 0 : c)), 1500);
                }
              }}
              aria-label="System status"
              className="h-3 w-3 rounded-full animate-pulse cursor-pointer"
              style={{ background: "hsl(var(--game-accent))", border: "none", padding: 0 }}
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

      {devPrompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={() => { setDevPrompt(false); setDevInput(""); }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm p-6 space-y-4"
            style={{
              background: "hsl(var(--game-card-bg))",
              border: "1px solid hsl(var(--game-border))",
              borderRadius: 2,
            }}
          >
            <p className="text-xs uppercase tracking-widest" style={{ fontFamily: mono, color: "hsl(var(--game-accent))" }}>
              // Access code
            </p>
            <Input
              autoFocus
              value={devInput}
              onChange={(e) => setDevInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (devInput.trim().toLowerCase() === "hallo") {
                    setDevPrompt(false);
                    setDevInput("");
                    setDevOpen(true);
                  } else {
                    toast.error("Falscher Code");
                    setDevInput("");
                  }
                }
              }}
              placeholder="???"
              style={inputStyle}
            />
            <p className="text-[10px]" style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}>
              Enter zum bestätigen
            </p>
          </div>
        </div>
      )}

      {devOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: "rgba(0,0,0,0.85)" }}
          onClick={() => setDevOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md p-6 space-y-4"
            style={{
              background: "hsl(var(--game-card-bg))",
              border: "1px solid hsl(var(--game-accent))",
              borderRadius: 2,
            }}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest" style={{ fontFamily: mono, color: "hsl(var(--game-accent))" }}>
                // Dev Menu
              </p>
              <button
                onClick={() => setDevOpen(false)}
                className="text-xs uppercase"
                style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}
              >
                ✕
              </button>
            </div>
            <div className="grid gap-2">
              <DevItem label="Ban Management (IP)" onClick={() => { setDevOpen(false); setBanManagerOpen(true); }} />
              <DevItem label="Gegen KI spielen" onClick={() => { setDevOpen(false); navigate("/ai"); }} />
              <DevItem label="Wie spielt man?" onClick={() => { setDevOpen(false); navigate("/instructions"); }} />
              <DevItem label="Lokal spielen" onClick={() => { setDevOpen(false); navigate("/local"); }} />
              <DevItem label="Einstellungen" onClick={() => { setDevOpen(false); navigate("/settings"); }} />
            </div>
            <p className="text-[10px]" style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}>
              Versteckte Routen & Debug-Zugänge
            </p>
          </div>
        </div>
      )}

      {banManagerOpen && <BanManager onClose={() => setBanManagerOpen(false)} />}
    </div>
  );
}


function DevItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={() => { sfx.click(); onClick(); }}
      className="w-full text-left px-4 py-3 text-sm transition-colors"
      style={{
        fontFamily: "'Rubik', sans-serif",
        background: "transparent",
        border: "1px solid hsl(var(--game-border))",
        color: "hsl(var(--game-text))",
        borderRadius: 2,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "hsl(var(--game-accent))"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "hsl(var(--game-border))"; }}
    >
      {label}
    </button>
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
