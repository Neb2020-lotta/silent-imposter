import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
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

  // Load room by code
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

  // Subscribe to room + players + messages
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
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("room_id", room.id);
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

  const allHintsGiven = players.length > 0 && players.every((p) => (hintCounts[p.id] || 0) >= HINTS_REQUIRED);

  if (!room) {
    return (
      <div
        className="min-h-screen flex items-center justify-center font-poppins text-[color:hsl(var(--game-text))]"
        style={{ background: "var(--gradient-game-bg)" }}
      >
        Lade Raum…
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

    // Clear old messages and votes
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
  const isMyTurn = !!me && room.current_turn_player_id === me.id && (hintCounts[me.id] || 0) < HINTS_REQUIRED;

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

  // Vote tallies
  const voteTally = useMemo(() => {
    const t: Record<string, number> = {};
    for (const p of players) if (p.voted_for) t[p.voted_for] = (t[p.voted_for] || 0) + 1;
    return t;
  }, [players]);
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
      className="min-h-screen font-poppins text-[color:hsl(var(--game-text))]"
      style={{ background: "var(--gradient-game-bg)" }}
    >
      <div className="relative z-10 flex flex-col items-center min-h-screen p-4 py-8">
        <div className="w-full max-w-2xl flex items-center justify-between mb-6">
          <div>
            <div className="text-xs opacity-70">Raum-Code</div>
            <div
              className="text-3xl font-bold tracking-widest cursor-pointer"
              style={{ color: "hsl(var(--game-accent))" }}
              onClick={() => {
                navigator.clipboard.writeText(room.code);
                toast.success("Code kopiert!");
              }}
              title="Klicken zum Kopieren"
            >
              {room.code}
            </div>
          </div>
          <Button variant="ghost" onClick={leaveRoom}>
            Verlassen
          </Button>
        </div>

        <div className="w-full max-w-2xl space-y-4">
          {/* LOBBY */}
          {room.state === "lobby" && (
            <div
              className="rounded-3xl p-6 backdrop-blur-md"
              style={{
                background: "hsla(var(--game-card-bg), 0.8)",
                border: "2px solid hsl(var(--game-border))",
                boxShadow: "var(--game-card-shadow)",
              }}
            >
              <h2 className="text-2xl font-bold text-center mb-4">
                Lobby <span className="opacity-60 text-base">({players.length})</span>
              </h2>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {players.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl px-3 py-2 text-center"
                    style={{
                      background: "hsla(var(--game-input-bg), 0.6)",
                      border: "1px solid hsl(var(--game-border))",
                    }}
                  >
                    {p.is_host && "👑 "}
                    {p.name}
                    {p.client_id === clientId && " (Du)"}
                  </div>
                ))}
              </div>
              <p className="text-center text-sm opacity-70 mb-4">
                Thema: <strong>{room.category}</strong> · Imposter: <strong>{room.imposter_count}</strong>
              </p>
              {isHost ? (
                <Button
                  onClick={startGame}
                  disabled={players.length < 3}
                  className="w-full text-lg py-4"
                  style={{ background: "var(--gradient-button-primary)" }}
                >
                  {players.length < 3
                    ? `Warte auf Spieler (${players.length}/3)`
                    : "Spiel starten"}
                </Button>
              ) : (
                <p className="text-center opacity-70">Warte, bis der Host startet…</p>
              )}
            </div>
          )}

          {/* PLAYING - personal word reveal */}
          {room.state === "playing" && me && (
            <div
              className="rounded-3xl p-8 backdrop-blur-md text-center space-y-6"
              style={{
                background: "hsla(var(--game-card-bg), 0.8)",
                border: "2px solid hsl(var(--game-border))",
                boxShadow: "var(--game-card-shadow)",
              }}
            >
              <h2 className="text-2xl font-bold">Hi {me.name}!</h2>
              {!showWord ? (
                <>
                  <p className="opacity-80">Bereit, dein Wort zu sehen?</p>
                  <Button
                    onClick={() => setShowWord(true)}
                    className="w-full text-lg py-4"
                    style={{ background: "var(--gradient-button-primary)" }}
                  >
                    🙈 Wort anzeigen
                  </Button>
                </>
              ) : me.is_imposter ? (
                <div className="space-y-3">
                  <p className="text-xl">
                    Du bist der{" "}
                    <span className="font-bold text-2xl" style={{ color: "hsl(var(--game-imposter))" }}>
                      IMPOSTER
                    </span>
                    !
                  </p>
                  <p>
                    Dein Tipp:{" "}
                    <em style={{ color: "hsl(var(--game-reveal))" }}>"{me.imposter_tip}"</em>
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p>Dein Wort ist:</p>
                  <h3 className="text-4xl font-bold" style={{ color: "hsl(var(--game-accent))" }}>
                    {me.word}
                  </h3>
                </div>
              )}
              {showWord && (
                <Button onClick={() => setShowWord(false)} variant="outline" className="w-full">
                  Verbergen
                </Button>
              )}
              {isHost && (
                <Button
                  onClick={goDiscussion}
                  className="w-full text-lg py-4"
                  style={{ background: "var(--gradient-button-success)" }}
                >
                  Alle bereit → Diskussion
                </Button>
              )}
              {!isHost && (
                <p className="text-sm opacity-60">Der Host startet die Diskussion sobald alle bereit sind.</p>
              )}
            </div>
          )}

          {/* DISCUSSION - chat + hints */}
          {room.state === "discussion" && (
            <div
              className="rounded-3xl p-6 backdrop-blur-md space-y-4"
              style={{
                background: "hsla(var(--game-card-bg), 0.8)",
                border: "2px solid hsl(var(--game-border))",
                boxShadow: "var(--game-card-shadow)",
              }}
            >
              <h2 className="text-2xl font-bold text-center" style={{ color: "hsl(var(--game-accent))" }}>
                🔍 Diskussion
              </h2>
              {currentTurnPlayer ? (
                <div className="text-center p-3 rounded-xl" style={{ background: "hsla(var(--game-accent), 0.15)" }}>
                  {isMyTurn ? (
                    <>
                      <strong style={{ color: "hsl(var(--game-accent))" }}>Du bist dran!</strong> Gib einen Hinweis.
                    </>
                  ) : (
                    <>
                      <strong style={{ color: "hsl(var(--game-accent))" }}>{currentTurnPlayer.name}</strong> ist dran mit einem Hinweis.
                    </>
                  )}
                </div>
              ) : starter ? (
                <div className="text-center p-3 rounded-xl" style={{ background: "hsla(var(--game-reveal), 0.15)" }}>
                  Alle Hinweise gegeben – ab zur Abstimmung!
                </div>
              ) : null}

              {/* Hint progress per player */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                {players.map((p) => {
                  const c = hintCounts[p.id] || 0;
                  const done = c >= HINTS_REQUIRED;
                  const turn = p.id === room.current_turn_player_id;
                  return (
                    <div
                      key={p.id}
                      className="rounded-lg px-2 py-1 flex justify-between items-center"
                      style={{
                        background: done
                          ? "hsla(var(--game-reveal), 0.2)"
                          : turn
                          ? "hsla(var(--game-accent), 0.25)"
                          : "hsla(var(--game-input-bg), 0.6)",
                        border: `1px solid ${done ? "hsl(var(--game-reveal))" : turn ? "hsl(var(--game-accent))" : "hsl(var(--game-border))"}`,
                      }}
                    >
                      <span>{done ? "✅ " : turn ? "🎤 " : ""}{p.name}</span>
                      <span className="font-bold">{c}/{HINTS_REQUIRED}</span>
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

              {isHost && (
                <Button
                  onClick={goVoting}
                  disabled={!allHintsGiven}
                  className="w-full text-lg py-4"
                  style={{ background: "var(--gradient-button-reveal)" }}
                >
                  {allHintsGiven ? "🗳️ Zur Abstimmung" : "Warte auf alle 3 Hinweise…"}
                </Button>
              )}
              {!isHost && (
                <p className="text-center text-sm opacity-60">
                  {allHintsGiven
                    ? "Alle bereit – Host startet die Abstimmung."
                    : `Jeder muss ${HINTS_REQUIRED} Hinweise geben.`}
                </p>
              )}
            </div>
          )}

          {/* VOTING */}
          {room.state === "voting" && me && (
            <div
              className="rounded-3xl p-6 backdrop-blur-md space-y-4"
              style={{
                background: "hsla(var(--game-card-bg), 0.8)",
                border: "2px solid hsl(var(--game-border))",
                boxShadow: "var(--game-card-shadow)",
              }}
            >
              <h2 className="text-2xl font-bold text-center" style={{ color: "hsl(var(--game-imposter))" }}>
                🗳️ Wer ist der Imposter?
              </h2>
              <p className="text-center text-sm opacity-70">
                {votedCount}/{players.length} haben abgestimmt
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {players.map((p) => {
                  const isMe = p.client_id === clientId;
                  const selected = me.voted_for === p.id;
                  return (
                    <Button
                      key={p.id}
                      onClick={() => !isMe && castVote(p.id)}
                      disabled={isMe}
                      className="py-4 text-base"
                      style={{
                        background: selected
                          ? "var(--gradient-button-reveal)"
                          : "hsla(var(--game-input-bg), 0.7)",
                        border: `2px solid ${selected ? "hsl(var(--game-reveal))" : "hsl(var(--game-border))"}`,
                        color: "hsl(var(--game-text))",
                        opacity: isMe ? 0.5 : 1,
                      }}
                    >
                      {selected && "✅ "}{p.name}{isMe && " (Du)"}
                    </Button>
                  );
                })}
              </div>
              {me.voted_for && (
                <p className="text-center text-sm" style={{ color: "hsl(var(--game-reveal))" }}>
                  Deine Stimme wurde abgegeben. Du kannst sie noch ändern.
                </p>
              )}
              {isHost && (
                <Button
                  onClick={goReveal}
                  className="w-full text-lg py-4"
                  style={{ background: "var(--gradient-button-reveal)" }}
                >
                  {allVoted ? "🔍 Auflösen!" : `Auflösen (${votedCount}/${players.length})`}
                </Button>
              )}
              {!isHost && allVoted && (
                <p className="text-center text-sm opacity-70">Warte auf Host für die Auflösung…</p>
              )}
            </div>
          )}

          {/* REVEAL */}
          {room.state === "reveal" && (
            <div
              className="rounded-3xl p-8 backdrop-blur-md text-center space-y-4"
              style={{
                background: "hsla(var(--game-card-bg), 0.8)",
                border: "2px solid hsl(var(--game-border))",
                boxShadow: "var(--game-card-shadow)",
              }}
            >
              <h2 className="text-2xl font-bold" style={{ color: "hsl(var(--game-accent))" }}>
                🔍 Auflösung
              </h2>
              <p>
                Das Wort war:{" "}
                <strong className="text-2xl" style={{ color: "hsl(var(--game-accent))" }}>
                  {room.word}
                </strong>
              </p>
              <p>
                Hinweis war: <em style={{ color: "hsl(var(--game-reveal))" }}>"{room.hint}"</em>
              </p>

              <div className="pt-2">
                <p className="mb-2 font-bold">🗳️ Abstimmungs-Ergebnis</p>
                <div className="space-y-1 text-left max-w-sm mx-auto">
                  {players
                    .slice()
                    .sort((a, b) => (voteTally[b.id] || 0) - (voteTally[a.id] || 0))
                    .map((p) => {
                      const votes = voteTally[p.id] || 0;
                      return (
                        <div
                          key={p.id}
                          className="flex justify-between items-center rounded-lg px-3 py-2"
                          style={{
                            background: p.is_imposter
                              ? "hsla(var(--game-imposter), 0.2)"
                              : "hsla(var(--game-input-bg), 0.6)",
                            border: `1px solid ${p.is_imposter ? "hsl(var(--game-imposter))" : "hsl(var(--game-border))"}`,
                          }}
                        >
                          <span>
                            {p.is_imposter && "🎭 "}
                            {p.name}
                          </span>
                          <span className="font-bold">{votes} Stimme{votes === 1 ? "" : "n"}</span>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="pt-2">
                <p className="mb-2">Imposter waren:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {players
                    .filter((p) => p.is_imposter)
                    .map((p) => (
                      <span
                        key={p.id}
                        className="px-4 py-2 rounded-xl font-bold"
                        style={{
                          background: "hsla(var(--game-imposter), 0.2)",
                          border: "2px solid hsl(var(--game-imposter))",
                          color: "hsl(var(--game-imposter))",
                        }}
                      >
                        🎭 {p.name}
                      </span>
                    ))}
                </div>
              </div>

              {isHost && (
                <Button
                  onClick={newRound}
                  className="w-full text-lg py-4"
                  style={{ background: "var(--gradient-button-success)" }}
                >
                  🔄 Neue Runde
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
