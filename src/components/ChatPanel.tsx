import { useEffect, useMemo, useRef, useState } from "react";
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

export default function ChatPanel({
  roomId,
  playerId,
  playerName,
  hintsRequired = 3,
  canSendHint = true,
  onHintSent,
}: Props) {
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
    if (kind === "hint" && (myHintCount >= hintsRequired || !canSendHint)) return;
    setText("");
    await supabase.from("messages").insert({
      room_id: roomId,
      player_id: playerId,
      player_name: playerName,
      content: content.slice(0, 500),
      kind,
    });
    if (kind === "hint") await onHintSent?.();
  };

  return (
    <div
      className="flex flex-col h-80 sm:h-96 p-4"
      style={{
        background: "hsl(var(--game-input-bg))",
        border: "1px solid hsl(var(--game-border))",
        borderRadius: 2,
      }}
    >
      <div className="flex justify-between items-center mb-3">
        <span className="term-tag">// transmissions</span>
        <span className={myHintCount >= hintsRequired ? "term-chip term-chip-accent" : "term-chip"}>
          Hints {myHintCount}/{hintsRequired}
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 pr-1 mb-3">
        {messages.length === 0 && (
          <p className="term-tag block text-center mt-6 opacity-60">// stand by — waiting for signal</p>
        )}
        {messages.map((m) => {
          const mine = m.player_id === playerId;
          const system = m.kind === "system";
          const hint = m.kind === "hint";
          if (system) {
            return (
              <div key={m.id} className="term-tag block text-center opacity-60">
                {m.content}
              </div>
            );
          }
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[85%] px-3 py-2 text-sm term-sans"
                style={{
                  background: hint
                    ? "hsla(var(--game-accent), 0.12)"
                    : mine
                    ? "hsla(var(--game-accent), 0.18)"
                    : "hsl(var(--game-card-bg))",
                  border: `1px solid ${hint ? "hsl(var(--game-accent))" : "hsl(var(--game-border))"}`,
                  borderRadius: 2,
                  color: "hsl(var(--game-text))",
                }}
              >
                <div
                  className="text-[10px] uppercase tracking-[0.25em] mb-1 term-mono flex gap-2 items-center"
                  style={{ color: hint ? "hsl(var(--game-accent))" : "hsl(var(--game-secondary))" }}
                >
                  {hint && <span>▶ hint</span>}
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
          placeholder=">_ Nachricht..."
          maxLength={500}
          className="term-input term-mono text-sm"
        />
        <button onClick={() => send("chat")} className="term-btn term-btn-ghost shrink-0">
          Chat
        </button>
        <button
          onClick={() => send("hint")}
          disabled={myHintCount >= hintsRequired || !canSendHint}
          className="term-btn term-btn-primary shrink-0"
          title={!canSendHint ? "Du bist nicht dran" : ""}
        >
          ▶ Hint
        </button>
      </div>
    </div>
  );
}
