import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Message = Tables<"messages">;

interface Props {
  roomId: string;
  playerId: string;
  playerName: string;
  hintsRequired?: number;
  canSendHint?: boolean;
  onHintSent?: () => void | Promise<void>;
}

export default function ChatPanel({ roomId, playerId, playerName, hintsRequired = 3, canSendHint = true, onHintSent }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from("messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .then(({ data }) => data && setMessages(data));

    const channel = supabase
      .channel(`messages:${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        (payload) => setMessages((prev) => [...prev, payload.new as Message])
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const myHintCount = useMemo(
    () => messages.filter((m) => m.kind === "hint" && m.player_id === playerId).length,
    [messages, playerId]
  );

  const send = async (kind: "chat" | "hint") => {
    const content = text.trim();
    if (!content) return;
    if (kind === "hint" && myHintCount >= hintsRequired) return;
    setText("");
    await supabase.from("messages").insert({
      room_id: roomId,
      player_id: playerId,
      player_name: playerName,
      content: content.slice(0, 500),
      kind,
    });
  };

  return (
    <div
      className="rounded-2xl p-4 flex flex-col h-96"
      style={{
        background: "hsla(var(--game-input-bg), 0.5)",
        border: "2px solid hsl(var(--game-border))",
      }}
    >
      <div className="flex justify-between items-center mb-2 text-xs">
        <span className="opacity-70">Chat & Hinweise</span>
        <span
          className="font-bold px-2 py-1 rounded-md"
          style={{
            background: "hsla(var(--game-accent), 0.2)",
            color: "hsl(var(--game-accent))",
          }}
        >
          Deine Hinweise: {myHintCount}/{hintsRequired}
        </span>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 pr-1 mb-3">
        {messages.length === 0 && (
          <p className="text-center text-sm opacity-60 mt-4">Noch keine Nachrichten…</p>
        )}
        {messages.map((m) => {
          const mine = m.player_id === playerId;
          const system = m.kind === "system";
          const hint = m.kind === "hint";
          if (system) {
            return (
              <div key={m.id} className="text-center text-xs opacity-70 italic">
                {m.content}
              </div>
            );
          }
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[80%] rounded-2xl px-3 py-2 text-sm"
                style={{
                  background: hint
                    ? "hsla(var(--game-reveal), 0.25)"
                    : mine
                    ? "hsla(var(--game-accent), 0.3)"
                    : "hsla(var(--game-card-bg), 0.8)",
                  border: hint
                    ? "2px solid hsl(var(--game-reveal))"
                    : "1px solid hsl(var(--game-border))",
                }}
              >
                <div className="text-xs font-bold opacity-80 flex gap-2 items-center" style={{ color: hint ? "hsl(var(--game-reveal))" : "hsl(var(--game-accent))" }}>
                  {hint && <span>💡 HINWEIS</span>}
                  <span>{m.player_name}</span>
                </div>
                <div className="break-words">{m.content}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send("chat")}
          placeholder="Nachricht oder Hinweis…"
          maxLength={500}
          style={{
            background: "hsla(var(--game-input-bg), 0.7)",
            border: "2px solid hsl(var(--game-border))",
            color: "hsl(var(--game-text))",
          }}
        />
        <Button onClick={() => send("chat")} style={{ background: "var(--gradient-button-primary)" }}>
          Chat
        </Button>
        <Button
          onClick={() => send("hint")}
          disabled={myHintCount >= hintsRequired}
          style={{ background: "var(--gradient-button-reveal)" }}
        >
          💡 Hinweis
        </Button>
      </div>
    </div>
  );
}
