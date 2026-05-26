import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { wordCategories, pickRandomWord } from "@/lib/words";
import { toast } from "sonner";
import { sfx } from "@/lib/sounds";

type Phase = "setup" | "reveal" | "discussion" | "voting" | "result";

interface LocalPlayer {
  name: string;
  isImposter: boolean;
  tip?: string;
}

const mono = "'Space Mono', monospace";
const rubik = "'Rubik', sans-serif";

const inputStyle: React.CSSProperties = {
  background: "hsl(var(--game-input-bg))",
  border: "1px solid hsl(var(--game-border))",
  color: "hsl(var(--game-text))",
  borderRadius: 2,
};

export default function Local() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("setup");

  // Setup
  const [names, setNames] = useState<string[]>(["", "", ""]);
  const [category, setCategory] = useState("Allgemein");
  const [imposterCount, setImposterCount] = useState(1);

  // Game state
  const [players, setPlayers] = useState<LocalPlayer[]>([]);
  const [word, setWord] = useState("");
  const [revealIdx, setRevealIdx] = useState(0);
  const [showCard, setShowCard] = useState(false);

  // Voting
  const [voteIdx, setVoteIdx] = useState(0);
  const [votes, setVotes] = useState<number[]>([]);
  const [showBallot, setShowBallot] = useState(false);

  const setName = (i: number, v: string) =>
    setNames((prev) => prev.map((n, idx) => (idx === i ? v : n)));

  const addPlayer = () => names.length < 10 && setNames([...names, ""]);
  const removePlayer = (i: number) =>
    names.length > 3 && setNames(names.filter((_, idx) => idx !== i));

  const startGame = () => {
    const clean = names.map((n) => n.trim()).filter(Boolean);
    if (clean.length < 3) return toast.error("Mindestens 3 Spieler");
    if (new Set(clean).size !== clean.length) return toast.error("Namen müssen eindeutig sein");

    const w = pickRandomWord(category);
    setWord(w.word);
    const maxImp = Math.max(1, Math.min(imposterCount, Math.floor(clean.length / 2)));
    const idx = [...clean.keys()];
    const imp = new Set<number>();
    while (imp.size < maxImp) imp.add(idx.splice(Math.floor(Math.random() * idx.length), 1)[0]);
    const tips = [...w.typeHints].sort(() => Math.random() - 0.5);
    const built: LocalPlayer[] = clean.map((name, i) => {
      const isImp = imp.has(i);
      return { name, isImposter: isImp, tip: isImp ? tips.shift() || "Geheimnis" : undefined };
    });
    setPlayers(built);
    setRevealIdx(0);
    setShowCard(false);
    setPhase("reveal");
  };

  const nextReveal = () => {
    setShowCard(false);
    if (revealIdx + 1 >= players.length) {
      setPhase("discussion");
    } else {
      setRevealIdx(revealIdx + 1);
    }
  };

  const startVoting = () => {
    setVoteIdx(0);
    setVotes([]);
    setShowBallot(false);
    setPhase("voting");
  };

  const castVote = (target: number) => {
    const next = [...votes, target];
    setVotes(next);
    setShowBallot(false);
    if (voteIdx + 1 >= players.length) {
      setPhase("result");
    } else {
      setVoteIdx(voteIdx + 1);
    }
  };

  const tally = useMemo(() => {
    const t: Record<number, number> = {};
    votes.forEach((v) => (t[v] = (t[v] || 0) + 1));
    return t;
  }, [votes]);

  const eliminated = useMemo(() => {
    if (phase !== "result") return null;
    const max = Math.max(0, ...Object.values(tally));
    if (max === 0) return null;
    const top = Object.entries(tally)
      .filter(([, c]) => c === max)
      .map(([k]) => Number(k));
    return top[Math.floor(Math.random() * top.length)];
  }, [tally, phase]);

  const newRound = () => {
    setPhase("setup");
    setPlayers([]);
    setVotes([]);
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col"
      style={{ background: "hsl(var(--game-bg-start))", color: "hsl(var(--game-text))" }}
    >
      <header
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: "hsl(var(--game-card-bg))" }}
      >
        <div>
          <p
            className="text-[10px] uppercase tracking-[0.3em]"
            style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}
          >
            Local Session
          </p>
          <h1
            className="text-lg font-bold uppercase tracking-tighter"
            style={{ fontFamily: mono }}
          >
            Silent <span style={{ color: "hsl(var(--game-accent))" }}>Imposter</span>
          </h1>
        </div>
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="text-xs uppercase tracking-widest"
          style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}
        >
          ← Menü
        </Button>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md space-y-6">
          {/* SETUP */}
          {phase === "setup" && (
            <div className="space-y-5">
              <Tag>Setup</Tag>
              <h2 className="text-2xl font-medium" style={{ fontFamily: rubik }}>
                Spieler an einem Gerät
              </h2>
              <p className="text-sm opacity-70" style={{ fontFamily: rubik }}>
                Reicht das Gerät reihum. Niemand schreibt — alle Hinweise werden laut gesagt.
              </p>

              <Field label="Spielernamen">
                <div className="space-y-2">
                  {names.map((n, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={n}
                        onChange={(e) => setName(i, e.target.value)}
                        placeholder={`Spieler ${i + 1}`}
                        maxLength={20}
                        style={inputStyle}
                      />
                      {names.length > 3 && (
                        <Button
                          variant="ghost"
                          onClick={() => removePlayer(i)}
                          className="px-3"
                          style={{ color: "hsl(var(--game-secondary))" }}
                        >
                          ✕
                        </Button>
                      )}
                    </div>
                  ))}
                  {names.length < 10 && (
                    <button
                      onClick={addPlayer}
                      className="w-full py-2 text-xs uppercase tracking-widest border border-dashed"
                      style={{
                        fontFamily: mono,
                        color: "hsl(var(--game-secondary))",
                        borderColor: "hsl(var(--game-border))",
                        borderRadius: 2,
                      }}
                    >
                      + Spieler hinzufügen
                    </button>
                  )}
                </div>
              </Field>

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

              <Field label="Anzahl Imposter">
                <Input
                  type="number"
                  min={1}
                  max={4}
                  value={imposterCount}
                  onChange={(e) =>
                    setImposterCount(Math.max(1, Math.min(4, parseInt(e.target.value) || 1)))
                  }
                  style={inputStyle}
                />
              </Field>

              <Primary onClick={startGame}>Spiel starten</Primary>
            </div>
          )}

          {/* REVEAL — pass and play */}
          {phase === "reveal" && players[revealIdx] && (
            <div className="space-y-6 text-center">
              <Tag>
                {revealIdx + 1} / {players.length} · Geheime Karte
              </Tag>
              <h2 className="text-3xl font-bold" style={{ fontFamily: mono }}>
                {players[revealIdx].name}
              </h2>
              <p className="text-sm opacity-70" style={{ fontFamily: rubik }}>
                Stelle sicher, dass nur du auf den Bildschirm schaust.
              </p>

              {!showCard ? (
                <Primary onClick={() => setShowCard(true)}>🙈 Karte aufdecken</Primary>
              ) : (
                <>
                  <div
                    className="p-8 space-y-3"
                    style={{
                      background: "hsl(var(--game-card-bg))",
                      border: "1px solid hsl(var(--game-border))",
                      borderRadius: 2,
                    }}
                  >
                    {players[revealIdx].isImposter ? (
                      <>
                        <p
                          className="text-xs uppercase tracking-widest"
                          style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}
                        >
                          Du bist
                        </p>
                        <p
                          className="text-4xl font-bold uppercase"
                          style={{ fontFamily: mono, color: "hsl(var(--game-accent))" }}
                        >
                          Imposter
                        </p>
                        <p className="text-sm opacity-80" style={{ fontFamily: rubik }}>
                          Tipp:{" "}
                          <em style={{ color: "hsl(var(--game-accent))" }}>
                            "{players[revealIdx].tip}"
                          </em>
                        </p>
                      </>
                    ) : (
                      <>
                        <p
                          className="text-xs uppercase tracking-widest"
                          style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}
                        >
                          Dein Wort
                        </p>
                        <p
                          className="text-4xl font-bold"
                          style={{ fontFamily: mono, color: "hsl(var(--game-accent))" }}
                        >
                          {word}
                        </p>
                      </>
                    )}
                  </div>
                  <Primary onClick={nextReveal}>
                    {revealIdx + 1 >= players.length ? "Fertig" : "Verbergen & weitergeben"}
                  </Primary>
                </>
              )}
            </div>
          )}

          {/* DISCUSSION — verbal only */}
          {phase === "discussion" && (
            <div className="space-y-6 text-center">
              <Tag>Diskussion</Tag>
              <h2 className="text-2xl font-medium" style={{ fontFamily: rubik }}>
                Jeder sagt der Reihe nach Hinweise — laut.
              </h2>
              <p className="text-sm opacity-70" style={{ fontFamily: rubik }}>
                Kein Tippen, kein Chat. Sprecht 3 Runden lang.
              </p>
              <div className="grid grid-cols-2 gap-2 text-left">
                {players.map((p, i) => (
                  <div
                    key={i}
                    className="px-3 py-2 text-sm"
                    style={{
                      background: "hsl(var(--game-card-bg))",
                      border: "1px solid hsl(var(--game-border))",
                      borderRadius: 2,
                      fontFamily: rubik,
                    }}
                  >
                    {i + 1}. {p.name}
                  </div>
                ))}
              </div>
              <Primary onClick={startVoting}>🗳️ Zur Abstimmung</Primary>
            </div>
          )}

          {/* VOTING — pass and play */}
          {phase === "voting" && players[voteIdx] && (
            <div className="space-y-6 text-center">
              <Tag>
                Stimme {voteIdx + 1} / {players.length}
              </Tag>
              <h2 className="text-3xl font-bold" style={{ fontFamily: mono }}>
                {players[voteIdx].name}
              </h2>
              {!showBallot ? (
                <>
                  <p className="text-sm opacity-70" style={{ fontFamily: rubik }}>
                    Gerät weitergeben. Drücke wenn du bereit bist.
                  </p>
                  <Primary onClick={() => setShowBallot(true)}>Wahl-Karte öffnen</Primary>
                </>
              ) : (
                <>
                  <p
                    className="text-xs uppercase tracking-widest"
                    style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}
                  >
                    Wer ist der Imposter?
                  </p>
                  <div className="space-y-2">
                    {players.map((p, i) =>
                      i === voteIdx ? null : (
                        <button
                          key={i}
                          onClick={() => castVote(i)}
                          className="w-full px-4 py-3 text-left transition-colors"
                          style={{
                            background: "hsl(var(--game-card-bg))",
                            border: "1px solid hsl(var(--game-border))",
                            borderRadius: 2,
                            fontFamily: rubik,
                            color: "hsl(var(--game-text))",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.borderColor = "hsl(var(--game-accent))")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.borderColor = "hsl(var(--game-border))")
                          }
                        >
                          {p.name}
                        </button>
                      )
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* RESULT */}
          {phase === "result" && (
            <div className="space-y-6 text-center">
              <Tag>Auflösung</Tag>
              <div
                className="p-6 space-y-2"
                style={{
                  background: "hsl(var(--game-card-bg))",
                  border: "1px solid hsl(var(--game-accent))",
                  borderRadius: 2,
                }}
              >
                <p
                  className="text-xs uppercase tracking-widest"
                  style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}
                >
                  Rausgewählt
                </p>
                <p
                  className="text-3xl font-bold"
                  style={{ fontFamily: mono, color: "hsl(var(--game-accent))" }}
                >
                  {eliminated !== null ? players[eliminated].name : "—"}
                </p>
                <p className="text-sm opacity-80" style={{ fontFamily: rubik }}>
                  {eliminated !== null && players[eliminated].isImposter
                    ? "✅ war Imposter!"
                    : "❌ war nicht Imposter"}
                </p>
              </div>

              <div
                className="p-5 space-y-2"
                style={{
                  background: "hsl(var(--game-card-bg))",
                  border: "1px solid hsl(var(--game-border))",
                  borderRadius: 2,
                }}
              >
                <p
                  className="text-xs uppercase tracking-widest"
                  style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}
                >
                  Wort war
                </p>
                <p className="text-2xl font-bold" style={{ fontFamily: mono }}>
                  {word}
                </p>
                <p
                  className="text-xs uppercase tracking-widest pt-3"
                  style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}
                >
                  Imposter waren
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {players
                    .filter((p) => p.isImposter)
                    .map((p) => (
                      <span
                        key={p.name}
                        className="px-3 py-1 text-sm"
                        style={{
                          background: "hsla(var(--game-accent), 0.15)",
                          border: "1px solid hsl(var(--game-accent))",
                          color: "hsl(var(--game-accent))",
                          fontFamily: rubik,
                          borderRadius: 2,
                        }}
                      >
                        🎭 {p.name}
                      </span>
                    ))}
                </div>
              </div>

              <Primary onClick={newRound}>Neue Runde</Primary>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[10px] font-bold uppercase tracking-[0.3em] italic"
      style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}
    >
      // {children}
    </p>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label
        className="block text-[10px] uppercase tracking-widest"
        style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function Primary({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full py-4 px-6 text-sm font-bold uppercase tracking-wider transition-all"
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
