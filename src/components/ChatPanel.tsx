import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Message = Tables<"messages">;

interface Props {
  roomId: string;
  playerId: string;
  playerName: string;
}

export default function ChatPanel({ roomId, playerId, playerName }: Props) {
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

  const send = async () => {
    const content = text.trim();
    if (!content) return;
    setText("");
    await supabase.from("messages").insert({
      room_id: roomId,
      player_id: playerId,
      player_name: playerName,
      content: content.slice(0, 500),
      kind: "chat",
    });
  };

  return (
    <div
      className="rounded-2xl p-4 flex flex-col h-80"
      style={{
        background: "hsla(var(--game-input-bg), 0.5)",
        border: "2px solid hsl(var(--game-border))",
      }}
    >
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 pr-1 mb-3">
        {messages.length === 0 && (
          <p className="text-center text-sm opacity-60 mt-4">Noch keine Nachrichten…</p>
        )}
        {messages.map((m) => {
          const mine = m.player_id === playerId;
          const system = m.kind === "system";
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
                  background: mine
                    ? "hsla(var(--game-accent), 0.3)"
                    : "hsla(var(--game-card-bg), 0.8)",
                  border: "1px solid hsl(var(--game-border))",
                }}
              >
                <div className="text-xs font-bold opacity-80" style={{ color: "hsl(var(--game-accent))" }}>
                  {m.player_name}
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
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Nachricht…"
          maxLength={500}
          style={{
            background: "hsla(var(--game-input-bg), 0.7)",
            border: "2px solid hsl(var(--game-border))",
            color: "hsl(var(--game-text))",
          }}
        />
        <Button onClick={send} style={{ background: "var(--gradient-button-primary)" }}>
          Senden
        </Button>
      </div>
    </div>
  );
}
