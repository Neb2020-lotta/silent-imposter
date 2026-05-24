import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { getClientId } from "@/lib/clientId";
import { pickRandomWord } from "@/lib/words";
import ChatPanel from "@/components/ChatPanel";
import { toast } from "sonner";

type Room = Tables<"rooms">;
type Player = Tables<"players">;
type Message = Tables<"messages">;

const HINTS_REQUIRED = 3;

export default function Room() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showWord, setShowWord] = useState(false);
  const clientId = getClientId();

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("code", code.toUpperCase())
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        toast.error("Raum nicht gefunden");
        navigate("/");
        return;
      }
      setRoom(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [code, navigate]);

  useEffect(() => {
    if (!room) return;
    const loadPlayers = async () => {
      const { data } = await supabase
        .from("players")
        .select("*")
        .eq("room_id", room.id)
        .order("joined_at");
      if (data) setPlayers(data);
    };
    const loadMessages = async () => {
      const { data } = await supabase.from("messages").select("*").eq("room_id", room.id);
      if (data) setMessages(data);
    };
    loadPlayers();
    loadMessages();

    const channel = supabase
      .channel(`room:${room.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `id=eq.${room.id}` },
        (payload) => {
          if (payload.eventType === "UPDATE") setRoom(payload.new as Room);
          if (payload.eventType === "DELETE") navigate("/");
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `room_id=eq.${room.id}` },
        () => loadPlayers()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `room_id=eq.${room.id}` },
        () => loadMessages()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room?.id, navigate]);

  useEffect(() => {
    if (room?.state === "lobby") setShowWord(false);
  }, [room?.state]);

  const hintCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of players) counts[p.id] = 0;
    for (const m of messages) {
      if (m.kind === "hint" && m.player_id) counts[m.player_id] = (counts[m.player_id] || 0) + 1;
    }
    return counts;
  }, [messages, players]);

  const allHintsGiven =
    players.length > 0 && players.every((p) => (hintCounts[p.id] || 0) >= HINTS_REQUIRED);

  const voteTally = useMemo(() => {
    const t: Record<string, number> = {};
    for (const p of players) if (p.voted_for) t[p.voted_for] = (t[p.voted_for] || 0) + 1;
    return t;
  }, [players]);

  if (!room) {
    return (
      <div
        className="min-h-screen flex items-center justify-center term-mono"
        style={{ background: "hsl(var(--game-bg-start))", color: "hsl(var(--game-secondary))" }}
      >
        <span className="term-tag">// connecting to session...</span>
      </div>
    );
  }

  const me = players.find((p) => p.client_id === clientId);
  const isHost = room.host_id === clientId;

  const startGame = async () => {
    if (players.length < 3) return toast.error("Mindestens 3 Spieler nötig");
    const word = pickRandomWord(room.category);
    const maxImp = Math.max(1, Math.min(room.imposter_count, Math.floor(players.length / 2)));
    const indices = [...players.keys()];
    const imposterIdx: number[] = [];
    for (let i = 0; i < maxImp; i++) {
      imposterIdx.push(indices.splice(Math.floor(Math.random() * indices.length), 1)[0]);
    }
    const tips = [...word.typeHints].sort(() => Math.random() - 0.5);

    await supabase.from("messages").delete().eq("room_id", room.id);

    for (let i = 0; i < players.length; i++) {
      const isImp = imposterIdx.includes(i);
      await supabase
        .from("players")
        .update({
          is_imposter: isImp,
          word: isImp ? null : word.word,
          imposter_tip: isImp ? tips.shift() || "Geheimnis" : null,
          voted_for: null,
        })
        .eq("id", players[i].id);
    }

    const starter = players[Math.floor(Math.random() * players.length)];
    await supabase
      .from("rooms")
      .update({
        state: "playing",
        word: word.word,
        hint: word.hint,
        starting_player_id: starter.id,
        current_turn_player_id: starter.id,
        eliminated_player_id: null,
      })
      .eq("id", room.id);
  };

  const goDiscussion = async () => {
    await supabase
      .from("rooms")
      .update({ state: "discussion", current_turn_player_id: room.starting_player_id })
      .eq("id", room.id);
  };

  const goVoting = async () => {
    await supabase.from("rooms").update({ state: "voting" }).eq("id", room.id);
  };

  const goReveal = async () => {
    await supabase.from("rooms").update({ state: "reveal" }).eq("id", room.id);
  };

  const castVote = async (targetId: string) => {
    if (!me) return;
    await supabase.from("players").update({ voted_for: targetId }).eq("id", me.id);
  };

  const newRound = async () => {
    await supabase.from("messages").delete().eq("room_id", room.id);
    await supabase
      .from("players")
      .update({ is_imposter: false, word: null, imposter_tip: null, voted_for: null })
      .eq("room_id", room.id);
    await supabase
      .from("rooms")
      .update({
        state: "lobby",
        word: null,
        hint: null,
        starting_player_id: null,
        current_turn_player_id: null,
        eliminated_player_id: null,
      })
      .eq("id", room.id);
  };

  const leaveRoom = async () => {
    if (me) await supabase.from("players").delete().eq("id", me.id);
    navigate("/");
  };

  const starter = players.find((p) => p.id === room.starting_player_id);
  const currentTurnPlayer = players.find((p) => p.id === room.current_turn_player_id);
  const isMyTurn =
    !!me && room.current_turn_player_id === me.id && (hintCounts[me.id] || 0) < HINTS_REQUIRED;

  const advanceTurn = async () => {
    if (!me) return;
    const newCounts = { ...hintCounts, [me.id]: (hintCounts[me.id] || 0) + 1 };
    const idx = players.findIndex((p) => p.id === room.current_turn_player_id);
    let next: string | null = null;
    for (let i = 1; i <= players.length; i++) {
      const p = players[(idx + i) % players.length];
      if ((newCounts[p.id] || 0) < HINTS_REQUIRED) {
        next = p.id;
        break;
      }
    }
    await supabase.from("rooms").update({ current_turn_player_id: next }).eq("id", room.id);
  };

  const votedCount = players.filter((p) => p.voted_for).length;
  const allVoted = players.length > 0 && votedCount === players.length;

  const goElimination = async () => {
    const max = Math.max(0, ...Object.values(voteTally));
    if (max === 0) return toast.error("Noch keine Stimmen");
    const top = Object.keys(voteTally).filter((id) => voteTally[id] === max);
    const chosen = top[Math.floor(Math.random() * top.length)];
    await supabase
      .from("rooms")
      .update({ state: "elimination", eliminated_player_id: chosen })
      .eq("id", room.id);
  };

  const eliminatedPlayer = players.find((p) => p.id === room.eliminated_player_id);

  return (
    <div
      className="min-h-screen w-full flex flex-col"
      style={{ background: "hsl(var(--game-bg-start))", color: "hsl(var(--game-text))" }}
    >
      {/* HEADER */}
      <header
        className="flex items-center justify-between px-4 sm:px-6 py-4 border-b"
        style={{ borderColor: "hsl(var(--game-card-bg))" }}
      >
        <div>
          <p className="term-tag">// session</p>
          <button
            onClick={() => {
              navigator.clipboard.writeText(room.code);
              toast.success("Code kopiert");
            }}
            className="term-mono text-2xl sm:text-3xl font-bold tracking-[0.3em] hover:opacity-80 transition-opacity"
            style={{ color: "hsl(var(--game-accent))" }}
            title="Klicken zum Kopieren"
          >
            {room.code}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="term-chip hidden sm:inline-flex">{room.state}</span>
          <button onClick={leaveRoom} className="term-btn term-btn-ghost text-[10px] px-3 py-2">
            ← Exit
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 sm:px-6 py-6 sm:py-10">
        <div className="w-full max-w-2xl mx-auto space-y-6">
          {/* LOBBY */}
          {room.state === "lobby" && (
            <section className="term-card p-5 sm:p-7 space-y-5">
              <div className="flex items-end justify-between">
                <div>
                  <p className="term-tag">// lobby</p>
                  <h2 className="text-xl term-sans font-medium mt-1">
                    Spieler verbunden
                    <span style={{ color: "hsl(var(--game-secondary))" }}> · {players.length}</span>
                  </h2>
                </div>
                <span className="term-chip">{room.category}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {players.map((p) => (
                  <div
                    key={p.id}
                    className="px-3 py-2.5 term-sans text-sm flex items-center gap-2"
                    style={{
                      background: "hsl(var(--game-input-bg))",
                      border: "1px solid hsl(var(--game-border))",
                      borderRadius: 2,
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        background: p.is_host
                          ? "hsl(var(--game-accent))"
                          : "hsl(var(--game-secondary))",
                      }}
                    />
                    <span className="truncate">
                      {p.name}
                      {p.client_id === clientId && (
                        <span style={{ color: "hsl(var(--game-secondary))" }}> · du</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>

              <div className="term-divider" />

              <div className="flex flex-wrap gap-2 text-xs term-mono" style={{ color: "hsl(var(--game-secondary))" }}>
                <span className="term-chip">imposter: {room.imposter_count}</span>
                <span className="term-chip">hints: {HINTS_REQUIRED}</span>
              </div>

              {isHost ? (
                <button
                  onClick={startGame}
                  disabled={players.length < 3}
                  className="term-btn term-btn-primary w-full py-4"
                >
                  {players.length < 3
                    ? `▶ Warte (${players.length}/3)`
                    : "▶ Spiel starten"}
                </button>
              ) : (
                <p className="term-tag text-center block">// warte auf host...</p>
              )}
            </section>
          )}

          {/* PLAYING */}
          {room.state === "playing" && me && (
            <section className="term-card p-6 sm:p-8 text-center space-y-6">
              <div>
                <p className="term-tag">// identity briefing</p>
                <h2 className="text-2xl term-sans font-medium mt-2">Hi {me.name}</h2>
              </div>

              {!showWord ? (
                <>
                  <p className="term-sans text-sm" style={{ color: "hsl(var(--game-secondary))" }}>
                    Stelle sicher, dass niemand mitliest.
                  </p>
                  <button
                    onClick={() => setShowWord(true)}
                    className="term-btn term-btn-primary w-full py-4"
                  >
                    ▶ Karte aufdecken
                  </button>
                </>
              ) : (
                <div
                  className="p-6 space-y-3"
                  style={{
                    background: "hsl(var(--game-input-bg))",
                    border: "1px solid hsl(var(--game-accent))",
                    borderRadius: 2,
                  }}
                >
                  {me.is_imposter ? (
                    <>
                      <p className="term-tag">// du bist</p>
                      <p
                        className="text-4xl font-bold uppercase term-mono"
                        style={{ color: "hsl(var(--game-accent))" }}
                      >
                        Imposter
                      </p>
                      <p className="term-sans text-sm pt-2">
                        Tipp:{" "}
                        <em style={{ color: "hsl(var(--game-accent))" }}>"{me.imposter_tip}"</em>
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="term-tag">// dein wort</p>
                      <p
                        className="text-4xl font-bold term-mono"
                        style={{ color: "hsl(var(--game-accent))" }}
                      >
                        {me.word}
                      </p>
                    </>
                  )}
                </div>
              )}

              {showWord && (
                <button
                  onClick={() => setShowWord(false)}
                  className="term-btn term-btn-ghost w-full"
                >
                  Verbergen
                </button>
              )}

              {isHost ? (
                <button onClick={goDiscussion} className="term-btn term-btn-primary w-full py-4">
                  ▶ Diskussion starten
                </button>
              ) : (
                <p className="term-tag block">// host startet diskussion sobald alle bereit</p>
              )}
            </section>
          )}

          {/* DISCUSSION */}
          {room.state === "discussion" && (
            <section className="term-card p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="term-tag">// channel</p>
                  <h2 className="text-xl term-sans font-medium mt-1">Diskussion</h2>
                </div>
                {currentTurnPlayer && (
                  <span className="term-chip term-chip-accent">
                    {isMyTurn ? "▶ du bist dran" : `▶ ${currentTurnPlayer.name}`}
                  </span>
                )}
              </div>

              {!currentTurnPlayer && starter && (
                <div
                  className="px-4 py-3 text-sm term-sans"
                  style={{
                    background: "hsla(var(--game-accent), 0.1)",
                    border: "1px solid hsl(var(--game-accent))",
                    borderRadius: 2,
                    color: "hsl(var(--game-accent))",
                  }}
                >
                  Alle Hinweise gegeben — bereit zur Abstimmung.
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                {players.map((p) => {
                  const c = hintCounts[p.id] || 0;
                  const done = c >= HINTS_REQUIRED;
                  const turn = p.id === room.current_turn_player_id;
                  return (
                    <div
                      key={p.id}
                      className="px-3 py-2 flex justify-between items-center text-sm term-sans"
                      style={{
                        background: turn
                          ? "hsla(var(--game-accent), 0.12)"
                          : "hsl(var(--game-input-bg))",
                        border: `1px solid ${turn ? "hsl(var(--game-accent))" : "hsl(var(--game-border))"}`,
                        borderRadius: 2,
                        opacity: done ? 0.55 : 1,
                      }}
                    >
                      <span className="truncate">
                        {turn && "▶ "}
                        {p.name}
                      </span>
                      <span
                        className="term-mono text-xs"
                        style={{ color: done ? "hsl(var(--game-accent))" : "hsl(var(--game-secondary))" }}
                      >
                        {c}/{HINTS_REQUIRED}
                      </span>
                    </div>
                  );
                })}
              </div>

              {me && (
                <ChatPanel
                  roomId={room.id}
                  playerId={me.id}
                  playerName={me.name}
                  hintsRequired={HINTS_REQUIRED}
                  canSendHint={isMyTurn}
                  onHintSent={advanceTurn}
                />
              )}

              {isHost ? (
                <button
                  onClick={goVoting}
                  disabled={!allHintsGiven}
                  className="term-btn term-btn-primary w-full py-4"
                >
                  {allHintsGiven ? "▶ Zur Abstimmung" : `Warte auf ${HINTS_REQUIRED} Hinweise pro Spieler`}
                </button>
              ) : (
                <p className="term-tag text-center block">
                  // {allHintsGiven ? "host startet abstimmung" : `noch hinweise sammeln`}
                </p>
              )}
            </section>
          )}

          {/* VOTING */}
          {room.state === "voting" && me && (
            <section className="term-card p-5 sm:p-7 space-y-5">
              <div>
                <p className="term-tag">// vote</p>
                <h2 className="text-xl term-sans font-medium mt-1">Wer ist der Imposter?</h2>
                <p className="term-tag block mt-1">
                  // {votedCount}/{players.length} abgestimmt
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {players.map((p) => {
                  const isMe = p.client_id === clientId;
                  const selected = me.voted_for === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => !isMe && castVote(p.id)}
                      disabled={isMe}
                      className="px-4 py-3 text-left term-sans text-sm transition-all disabled:opacity-40"
                      style={{
                        background: selected
                          ? "hsla(var(--game-accent), 0.18)"
                          : "hsl(var(--game-input-bg))",
                        border: `1px solid ${selected ? "hsl(var(--game-accent))" : "hsl(var(--game-border))"}`,
                        borderRadius: 2,
                        color: "hsl(var(--game-text))",
                      }}
                      onMouseEnter={(e) => {
                        if (!isMe && !selected)
                          e.currentTarget.style.borderColor = "hsl(var(--game-accent))";
                      }}
                      onMouseLeave={(e) => {
                        if (!isMe && !selected)
                          e.currentTarget.style.borderColor = "hsl(var(--game-border))";
                      }}
                    >
                      {selected && "▶ "}
                      {p.name}
                      {isMe && (
                        <span style={{ color: "hsl(var(--game-secondary))" }}> · du</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {me.voted_for && (
                <p className="term-tag block text-center" style={{ color: "hsl(var(--game-accent))" }}>
                  // stimme gespeichert · änderbar
                </p>
              )}

              {isHost ? (
                <button
                  onClick={goElimination}
                  disabled={votedCount === 0}
                  className="term-btn term-btn-primary w-full py-4"
                >
                  ▶ Spieler rauswählen ({votedCount}/{players.length})
                </button>
              ) : (
                allVoted && <p className="term-tag block text-center">// warte auf host</p>
              )}
            </section>
          )}

          {/* ELIMINATION */}
          {room.state === "elimination" && eliminatedPlayer && (
            <section className="term-card-accent p-6 sm:p-8 text-center space-y-5">
              <p className="term-tag">// verdict</p>
              <p
                className="text-3xl sm:text-4xl term-mono font-bold uppercase tracking-wider"
                style={{ color: "hsl(var(--game-accent))" }}
              >
                {eliminatedPlayer.name}
              </p>
              <p className="term-tag block">
                // {voteTally[eliminatedPlayer.id] || 0} stimme
                {(voteTally[eliminatedPlayer.id] || 0) === 1 ? "" : "n"}
              </p>
              <p className="term-sans text-sm" style={{ color: "hsl(var(--game-secondary))" }}>
                War es wirklich der Imposter?
              </p>
              {isHost ? (
                <button onClick={goReveal} className="term-btn term-btn-primary w-full py-4">
                  ▶ Auflösen
                </button>
              ) : (
                <p className="term-tag block">// warte auf host</p>
              )}
            </section>
          )}

          {/* REVEAL */}
          {room.state === "reveal" && (
            <section className="term-card p-5 sm:p-7 space-y-5">
              <p className="term-tag">// auflösung</p>

              <div
                className="p-5 text-center space-y-2"
                style={{
                  background: "hsl(var(--game-input-bg))",
                  border: "1px solid hsl(var(--game-accent))",
                  borderRadius: 2,
                }}
              >
                <p className="term-tag">// das wort war</p>
                <p
                  className="text-3xl term-mono font-bold"
                  style={{ color: "hsl(var(--game-accent))" }}
                >
                  {room.word}
                </p>
                <p className="term-sans text-sm" style={{ color: "hsl(var(--game-secondary))" }}>
                  Hinweis: <em>"{room.hint}"</em>
                </p>
              </div>

              <div className="space-y-2">
                <p className="term-tag">// abstimmungs-log</p>
                {players
                  .slice()
                  .sort((a, b) => (voteTally[b.id] || 0) - (voteTally[a.id] || 0))
                  .map((p) => {
                    const votes = voteTally[p.id] || 0;
                    return (
                      <div
                        key={p.id}
                        className="flex justify-between items-center px-3 py-2 text-sm term-sans"
                        style={{
                          background: p.is_imposter
                            ? "hsla(var(--game-accent), 0.12)"
                            : "hsl(var(--game-input-bg))",
                          border: `1px solid ${p.is_imposter ? "hsl(var(--game-accent))" : "hsl(var(--game-border))"}`,
                          borderRadius: 2,
                        }}
                      >
                        <span style={{ color: p.is_imposter ? "hsl(var(--game-accent))" : "hsl(var(--game-text))" }}>
                          {p.is_imposter && "▶ "}
                          {p.name}
                        </span>
                        <span className="term-mono text-xs" style={{ color: "hsl(var(--game-secondary))" }}>
                          {votes} stimme{votes === 1 ? "" : "n"}
                        </span>
                      </div>
                    );
                  })}
              </div>

              <div className="space-y-2">
                <p className="term-tag">// imposter waren</p>
                <div className="flex flex-wrap gap-2">
                  {players
                    .filter((p) => p.is_imposter)
                    .map((p) => (
                      <span key={p.id} className="term-chip term-chip-accent">
                        ▶ {p.name}
                      </span>
                    ))}
                </div>
              </div>

              {isHost && (
                <button onClick={newRound} className="term-btn term-btn-primary w-full py-4">
                  ▶ Neue Runde
                </button>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
