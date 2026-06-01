import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { wordCategories, type WordData } from "@/lib/words";
import { toast } from "sonner";
import { Bot, User, ArrowLeft, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const mono = "'Space Mono', monospace";
const rubik = "'Rubik', sans-serif";

type Phase = "setup" | "reveal" | "playing" | "voting" | "result";

interface Player {
  id: string;
  name: string;
  isAI: boolean;
  isImposter: boolean;
}

interface Hint {
  playerId: string;
  name: string;
  text: string;
  round: number;
}

const AI_NAMES = ["NOVA", "GLITCH", "ECHO", "VOID", "PIXEL", "RAVEN"];

export default function AIMode() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("setup");
  const [playerName, setPlayerName] = useState("Du");
  const [aiCount, setAiCount] = useState(3);
  const [category, setCategory] = useState("Allgemein");

  const [players, setPlayers] = useState<Player[]>([]);
  const [secretWord, setSecretWord] = useState<WordData | null>(null);
  const [hints, setHints] = useState<Hint[]>([]);
  const [round, setRound] = useState(1);
  const [loading, setLoading] = useState(false);
  const [vote, setVote] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const me = useMemo(() => players.find((p) => !p.isAI) ?? null, [players]);
  const imposter = useMemo(() => players.find((p) => p.isImposter) ?? null, [players]);

  const start = async () => {
    if (!playerName.trim()) return toast.error("Bitte gib deinen Namen ein");
    const words = wordCategories[category];
    const picked = words[Math.floor(Math.random() * words.length)];

    const aiNames = [...AI_NAMES].sort(() => Math.random() - 0.5).slice(0, aiCount);
    const all: Player[] = [
      { id: "me", name: playerName.trim(), isAI: false, isImposter: false },
      ...aiNames.map((n, i) => ({ id: `ai_${i}`, name: n, isAI: true, isImposter: false })),
    ];
    // pick imposter randomly
    const imposterIdx = Math.floor(Math.random() * all.length);
    all[imposterIdx].isImposter = true;

    setPlayers(all);
    setSecretWord(picked);
    setHints([]);
    setRound(1);
    setVote(null);
    setRevealed(false);
    setPhase("reveal");
  };

  const beginPlay = async () => {
    setPhase("playing");
  };

  const fetchAIHints = async (r: number, priorHints: Hint[]) => {
    if (!secretWord) return;
    setLoading(true);
    try {
      const aiPlayers = players.filter((p) => p.isAI);
      const { data, error } = await supabase.functions.invoke("ai-imposter", {
        body: {
          category,
          word: secretWord.word,
          hint: secretWord.hint,
          round: r,
          previousHints: priorHints.map((h) => ({ name: h.name, text: h.text })),
          players: aiPlayers.map((p) => ({
            name: p.name,
            isImposter: p.isImposter,
            word: p.isImposter ? "" : secretWord.word,
            hint: secretWord.hint,
          })),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const newHints: Hint[] = (data.hints || []).map((h: { name: string; text: string }) => {
        const pl = players.find((p) => p.name === h.name);
        return { playerId: pl?.id ?? h.name, name: h.name, text: h.text, round: r };
      });
      setHints((prev) => [...prev, ...newHints]);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "KI-Fehler");
    } finally {
      setLoading(false);
    }
  };

  const submitMyHint = async (text: string) => {
    if (!me) return;
    const myHint: Hint = { playerId: me.id, name: me.name, text, round };
    const updated = [...hints, myHint];
    setHints(updated);
    // KI sieht nun deinen Hinweis und reagiert darauf
    await fetchAIHints(round, updated);
  };

  const nextRound = async () => {
    if (round >= 3) {
      setPhase("voting");
      return;
    }
    setRound(round + 1);
    // Spieler ist in der neuen Runde zuerst dran; KI reagiert nach Abgabe
  };

  const submitVote = (pid: string) => {
    setVote(pid);
    setRevealed(true);
    setPhase("result");
  };

  const reset = () => {
    setPhase("setup");
    setPlayers([]);
    setSecretWord(null);
    setHints([]);
    setRound(1);
    setVote(null);
    setRevealed(false);
  };

  return (
    <div
      className="min-h-screen w-full px-5 py-8 md:px-10 md:py-12"
      style={{
        background:
          "radial-gradient(ellipse at top, hsl(var(--game-accent) / 0.08), hsl(var(--game-bg-start)) 60%)",
        color: "hsl(var(--game-text))",
      }}
    >
      <div className="mx-auto max-w-2xl">
        <button
          onClick={() => navigate("/")}
          className="mb-6 inline-flex items-center gap-2 text-xs uppercase tracking-widest"
          style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}
        >
          <ArrowLeft className="h-4 w-4" /> Zurück
        </button>

        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em]" style={{ fontFamily: mono, color: "hsl(var(--game-accent))" }}>
            // Singleplayer · Neural Net
          </p>
          <h1 className="mt-2 text-4xl md:text-5xl font-bold uppercase tracking-tight leading-[0.95]" style={{ fontFamily: mono }}>
            Gegen<br />KI spielen
          </h1>
          <div className="mt-4 h-[3px] w-12" style={{ background: "hsl(var(--game-accent))" }} />
        </header>

        {phase === "setup" && (
          <Card>
            <Field label="Dein Name">
              <Input value={playerName} onChange={(e) => setPlayerName(e.target.value)} maxLength={20} style={inputStyle} />
            </Field>
            <Field label="Anzahl KI-Spieler">
              <Input
                type="number"
                min={2}
                max={4}
                value={aiCount}
                onChange={(e) => setAiCount(Math.max(2, Math.min(4, parseInt(e.target.value) || 2)))}
                style={inputStyle}
              />
            </Field>
            <Field label="Thema">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger style={inputStyle}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(wordCategories).map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
            <PrimaryButton onClick={start}>Spiel starten</PrimaryButton>
          </Card>
        )}

        {phase === "reveal" && me && secretWord && (
          <Card>
            <p className="text-xs uppercase tracking-widest mb-3" style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}>
              Deine Rolle
            </p>
            {me.isImposter ? (
              <>
                <h2 className="text-3xl font-bold mb-2" style={{ fontFamily: mono, color: "hsl(var(--game-accent))" }}>
                  IMPOSTER
                </h2>
                <p style={{ fontFamily: rubik }}>
                  Du kennst das Wort NICHT. Allgemeiner Tipp:
                </p>
                <p className="mt-2 text-xl font-bold" style={{ fontFamily: mono }}>„{secretWord.hint}"</p>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-bold mb-2" style={{ fontFamily: mono }}>CREWMATE</h2>
                <p style={{ fontFamily: rubik }}>Das geheime Wort ist:</p>
                <p className="mt-2 text-3xl font-bold" style={{ fontFamily: mono, color: "hsl(var(--game-accent))" }}>
                  {secretWord.word}
                </p>
              </>
            )}
            <div className="mt-6">
              <PrimaryButton onClick={beginPlay}>Los geht's</PrimaryButton>
            </div>
          </Card>
        )}

        {phase === "playing" && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest" style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}>
                Runde {round} / 3
              </span>
              {loading && (
                <span className="inline-flex items-center gap-2 text-xs" style={{ fontFamily: mono, color: "hsl(var(--game-accent))" }}>
                  <Loader2 className="h-3 w-3 animate-spin" /> KI denkt nach...
                </span>
              )}
            </div>

            <Card>
              <div className="space-y-3">
                {hints.filter((h) => h.round === round).map((h, i) => (
                  <HintRow key={i} hint={h} isMe={h.playerId === me?.id} />
                ))}
                {!loading && !hints.some((h) => h.round === round && h.playerId === me?.id) && (
                  <MyHintInput onSubmit={submitMyHint} />
                )}
              </div>
            </Card>

            {!loading && hints.filter((h) => h.round === round).length === players.length && (
              <div className="mt-4">
                <PrimaryButton onClick={nextRound}>
                  {round >= 3 ? "Zur Abstimmung" : "Nächste Runde"}
                </PrimaryButton>
              </div>
            )}
          </>
        )}

        {phase === "voting" && (
          <Card>
            <p className="text-xs uppercase tracking-widest mb-3" style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}>
              Wer ist der Imposter?
            </p>
            <div className="space-y-2">
              {players.filter((p) => p.id !== me?.id).map((p) => (
                <button
                  key={p.id}
                  onClick={() => submitVote(p.id)}
                  className="w-full text-left p-4 transition-all hover:border-[hsl(var(--game-accent))]"
                  style={{ background: "hsl(var(--game-bg-end))", border: "1px solid hsl(var(--game-border))", borderRadius: 2, fontFamily: mono }}
                >
                  <span className="inline-flex items-center gap-2">
                    <Bot className="h-4 w-4" style={{ color: "hsl(var(--game-accent))" }} /> {p.name}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        )}

        {phase === "result" && imposter && secretWord && (
          <Card>
            <p className="text-xs uppercase tracking-widest mb-2" style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}>
              Auflösung
            </p>
            <p style={{ fontFamily: rubik }} className="mb-2">Du hast getippt auf:</p>
            <p className="text-xl font-bold mb-4" style={{ fontFamily: mono }}>
              {players.find((p) => p.id === vote)?.name}
            </p>
            <p style={{ fontFamily: rubik }} className="mb-2">Der Imposter war:</p>
            <p className="text-2xl font-bold mb-4" style={{ fontFamily: mono, color: "hsl(var(--game-accent))" }}>
              {imposter.name} {imposter.id === "me" ? "(du!)" : ""}
            </p>
            <p style={{ fontFamily: rubik }} className="mb-2">Geheimes Wort:</p>
            <p className="text-2xl font-bold mb-6" style={{ fontFamily: mono }}>{secretWord.word}</p>

            <div
              className="p-4 mb-6 text-center text-lg font-bold uppercase"
              style={{
                fontFamily: mono,
                borderRadius: 2,
                background: vote === imposter.id ? "hsl(var(--game-accent) / 0.15)" : "hsl(0 60% 50% / 0.15)",
                border: `1px solid ${vote === imposter.id ? "hsl(var(--game-accent))" : "hsl(0 60% 50%)"}`,
                color: vote === imposter.id ? "hsl(var(--game-accent))" : "hsl(0 80% 70%)",
              }}
            >
              {me?.isImposter
                ? vote === imposter.id
                  ? "Du hast dich selbst enttarnt 😅"
                  : "Du hast als Imposter überlebt! 🎭"
                : vote === imposter.id
                ? "Richtig! Imposter enttarnt 🎯"
                : "Falsch! Imposter ist entkommen 💀"}
            </div>

            <PrimaryButton onClick={reset}>Neue Runde</PrimaryButton>
          </Card>
        )}
      </div>
    </div>
  );
}

function HintRow({ hint, isMe }: { hint: Hint; isMe: boolean }) {
  return (
    <div
      className="p-3 flex items-start gap-3"
      style={{ background: "hsl(var(--game-bg-end))", border: "1px solid hsl(var(--game-border))", borderRadius: 2 }}
    >
      {isMe ? <User className="h-4 w-4 mt-1" /> : <Bot className="h-4 w-4 mt-1" style={{ color: "hsl(var(--game-accent))" }} />}
      <div className="flex-1">
        <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}>
          {hint.name}
        </p>
        <p style={{ fontFamily: rubik }}>{hint.text}</p>
      </div>
    </div>
  );
}

function MyHintInput({ onSubmit }: { onSubmit: (t: string) => void }) {
  const [v, setV] = useState("");
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-widest" style={{ fontFamily: mono, color: "hsl(var(--game-accent))" }}>
        Dein Hinweis
      </p>
      <Input
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder="Kurzer Hinweis..."
        maxLength={60}
        style={inputStyle}
        onKeyDown={(e) => {
          if (e.key === "Enter" && v.trim()) { onSubmit(v.trim()); setV(""); }
        }}
      />
      <button
        onClick={() => { if (v.trim()) { onSubmit(v.trim()); setV(""); } }}
        className="w-full py-2 text-xs uppercase tracking-widest"
        style={{ fontFamily: mono, background: "hsl(var(--game-accent))", color: "hsl(0 0% 8%)", borderRadius: 2 }}
      >
        Senden
      </button>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="p-5 md:p-6"
      style={{ background: "hsl(var(--game-card-bg))", border: "1px solid hsl(var(--game-border))", borderRadius: 2 }}
    >
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] uppercase tracking-widest" style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function PrimaryButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full py-4 px-6 text-sm font-bold uppercase tracking-wider"
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

const inputStyle = {
  background: "hsl(var(--game-input-bg))",
  border: "1px solid hsl(var(--game-border))",
  color: "hsl(var(--game-text))",
  borderRadius: 2,
};
