import { useEffect, useState } from "react";
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

export default function Room() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
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

  // Subscribe to room + players
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
    loadPlayers();

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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room?.id, navigate]);

  // Reset showWord when state changes back to lobby
  useEffect(() => {
    if (room?.state === "lobby") setShowWord(false);
  }, [room?.state]);

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

    // Update each player
    for (let i = 0; i < players.length; i++) {
      const isImp = imposterIdx.includes(i);
      await supabase
        .from("players")
        .update({
          is_imposter: isImp,
          word: isImp ? null : word.word,
          imposter_tip: isImp ? tips.shift() || "Geheimnis" : null,
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
      })
      .eq("id", room.id);
  };

  const goDiscussion = async () => {
    await supabase.from("rooms").update({ state: "discussion" }).eq("id", room.id);
  };

  const goReveal = async () => {
    await supabase.from("rooms").update({ state: "reveal" }).eq("id", room.id);
  };

  const newRound = async () => {
    await supabase
      .from("players")
      .update({ is_imposter: false, word: null, imposter_tip: null })
      .eq("room_id", room.id);
    await supabase
      .from("rooms")
      .update({ state: "lobby", word: null, hint: null, starting_player_id: null })
      .eq("id", room.id);
  };

  const leaveRoom = async () => {
    if (me) await supabase.from("players").delete().eq("id", me.id);
    navigate("/");
  };

  const starter = players.find((p) => p.id === room.starting_player_id);

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

          {/* DISCUSSION - chat */}
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
              {starter && (
                <div className="text-center p-3 rounded-xl" style={{ background: "hsla(var(--game-accent), 0.15)" }}>
                  <strong style={{ color: "hsl(var(--game-accent))" }}>{starter.name}</strong> beginnt mit einem Hinweis!
                </div>
              )}
              {me && (
                <ChatPanel roomId={room.id} playerId={me.id} playerName={me.name} />
              )}
              {isHost && (
                <Button
                  onClick={goReveal}
                  className="w-full text-lg py-4"
                  style={{ background: "var(--gradient-button-reveal)" }}
                >
                  🔍 Zur Auflösung
                </Button>
              )}
              {!isHost && (
                <p className="text-center text-sm opacity-60">
                  Der Host löst auf, wenn ihr fertig diskutiert habt.
                </p>
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
              <div>
                <p className="mb-2">Imposter:</p>
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
                        {p.name}
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
