import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { getClientId } from "@/lib/clientId";
import { getHostSecret, getPlayerId, clearHostSecret, clearPlayerId } from "@/lib/roomAuth";
import { pickRandomWord, wordCategories } from "@/lib/words";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ChatPanel from "@/components/ChatPanel";
import { RoleCard } from "@/components/RoleCard";
import { toast } from "sonner";

type Room = Tables<"rooms">;
type Player = Tables<"players">;
type Message = Tables<"messages">;


const HINTS_REQUIRED = 1;

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

  const storedPlayerId = getPlayerId(room.id);
  const hostSecret = getHostSecret(room.id);
  const me = players.find((p) => p.id === storedPlayerId);
  const isHost = !!hostSecret;

  const rpcError = (e: unknown, fallback: string) => {
    console.error(e);
    toast.error(fallback);
  };

  const startGame = async () => {
    if (!hostSecret) return;
    if (players.length < 3) return toast.error("Mindestens 3 Spieler nötig");
    const word = pickRandomWord(room.category);
    const maxImp = Math.max(1, Math.min(room.imposter_count, Math.floor(players.length / 2)));
    const indices = [...players.keys()];
    const imposterIdx: number[] = [];
    for (let i = 0; i < maxImp; i++) {
      imposterIdx.push(indices.splice(Math.floor(Math.random() * indices.length), 1)[0]);
    }
    const imposterIds = imposterIdx.map((i) => players[i].id);
    const tips = [...word.typeHints].sort(() => Math.random() - 0.5).slice(0, imposterIds.length);
    while (tips.length < imposterIds.length) tips.push("Geheimnis");
    const starter = players[Math.floor(Math.random() * players.length)];

    const { error } = await supabase.rpc("host_start_game", {
      p_room_id: room.id,
      p_secret: hostSecret,
      p_word: word.word,
      p_hint: word.hint,
      p_imposters: imposterIds,
      p_tips: tips,
      p_starting: starter.id,
    });
    if (error) rpcError(error, "Start fehlgeschlagen");
  };

  const goDiscussion = async () => {
    if (!hostSecret) return;
    const { error } = await supabase.rpc("host_set_state", {
      p_room_id: room.id, p_secret: hostSecret, p_state: "discussion",
    });
    if (error) rpcError(error, "Wechsel fehlgeschlagen");
  };

  const goVoting = async () => {
    if (!hostSecret) return;
    const { error } = await supabase.rpc("host_set_state", {
      p_room_id: room.id, p_secret: hostSecret, p_state: "voting",
    });
    if (error) rpcError(error, "Wechsel fehlgeschlagen");
  };

  const goReveal = async () => {
    if (!hostSecret) return;
    const { error } = await supabase.rpc("host_set_state", {
      p_room_id: room.id, p_secret: hostSecret, p_state: "reveal",
    });
    if (error) rpcError(error, "Wechsel fehlgeschlagen");
  };

  const castVote = async (targetId: string) => {
    if (!me) return;
    const { error } = await supabase.rpc("player_cast_vote", {
      p_room_id: room.id, p_client_id: clientId, p_target: targetId,
    });
    if (error) rpcError(error, "Abstimmung fehlgeschlagen");
  };

  const newRound = async () => {
    if (!hostSecret) return;
    const { error } = await supabase.rpc("host_new_round", {
      p_room_id: room.id, p_secret: hostSecret,
    });
    if (error) rpcError(error, "Neue Runde fehlgeschlagen");
  };

  const leaveRoom = async () => {
    await supabase.rpc("player_leave", { p_room_id: room.id, p_client_id: clientId });
    clearPlayerId(room.id);
    clearHostSecret(room.id);
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
    const { error } = await supabase.rpc("player_advance_turn", {
      p_room_id: room.id, p_client_id: clientId, p_next_player: next,
    });
    if (error) rpcError(error, "Zug-Wechsel fehlgeschlagen");
  };

  const votedCount = players.filter((p) => p.voted_for).length;
  const allVoted = players.length > 0 && votedCount === players.length;

  const goElimination = async () => {
    if (!hostSecret) return;
    const max = Math.max(0, ...Object.values(voteTally));
    if (max === 0) return toast.error("Noch keine Stimmen");
    const top = Object.keys(voteTally).filter((id) => voteTally[id] === max);
    const chosen = top[Math.floor(Math.random() * top.length)];
    const { error } = await supabase.rpc("host_set_elimination", {
      p_room_id: room.id, p_secret: hostSecret, p_eliminated: chosen,
    });
    if (error) rpcError(error, "Elimination fehlgeschlagen");
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
                {isHost ? (
                  <Select
                    value={room.category}
                    onValueChange={async (v) => {
                      const { error } = await supabase.rpc("host_set_category", {
                        p_room_id: room.id, p_secret: hostSecret!, p_category: v,
                      });
                      if (error) toast.error("Update fehlgeschlagen");
                    }}
                  >
                    <SelectTrigger
                      className="h-8 w-auto min-w-[140px] text-xs uppercase tracking-widest"
                      style={{
                        background: "hsl(var(--game-input-bg))",
                        border: "1px solid hsl(var(--game-border))",
                        color: "hsl(var(--game-accent))",
                        borderRadius: 2,
                        fontFamily: "'Space Mono', monospace",
                      }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(wordCategories).map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="term-chip">{room.category}</span>
                )}
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
                      {p.id === storedPlayerId && (
                        <span style={{ color: "hsl(var(--game-secondary))" }}> · du</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>

              <div className="term-divider" />


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

              <RoleCard
                name={me.name}
                isImposter={me.is_imposter}
                word={me.word ?? undefined}
                tip={me.imposter_tip ?? undefined}
                category={room.category ?? undefined}
              />

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
                  const isMe = p.id === storedPlayerId;
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
