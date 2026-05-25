import { useEffect, useRef, useState } from "react";
import { Timer } from "lucide-react";

interface CountdownProps {
  seconds: number;
  onComplete?: () => void;
  paused?: boolean;
  resetKey?: string | number;
}

export default function Countdown({ seconds, onComplete, paused, resetKey }: CountdownProps) {
  const [left, setLeft] = useState(seconds);
  const cb = useRef(onComplete);
  cb.current = onComplete;

  useEffect(() => {
    setLeft(seconds);
  }, [seconds, resetKey]);

  useEffect(() => {
    if (paused) return;
    if (left <= 0) {
      cb.current?.();
      return;
    }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left, paused]);

  const danger = left <= 10;
  const pct = Math.max(0, Math.min(100, (left / seconds) * 100));
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <div
      className="px-4 py-3 space-y-2"
      style={{
        background: "hsl(var(--game-input-bg))",
        border: `1px solid ${danger ? "hsl(0 85% 55%)" : "hsl(var(--game-border))"}`,
        borderRadius: 2,
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em]"
          style={{
            fontFamily: "'Space Mono', monospace",
            color: danger ? "hsl(0 85% 60%)" : "hsl(var(--game-secondary))",
          }}
        >
          <Timer className="h-3 w-3" /> Diskussion
        </span>
        <span
          className={`text-2xl font-bold tabular-nums ${danger ? "animate-timer-pulse-red" : ""}`}
          style={{
            fontFamily: "'Space Mono', monospace",
            color: danger ? "hsl(0 85% 60%)" : "hsl(var(--game-text))",
          }}
        >
          {mm}:{ss}
        </span>
      </div>
      <div className="h-1 w-full overflow-hidden" style={{ background: "hsl(var(--game-bg-end))" }}>
        <div
          className="h-full transition-[width] duration-1000 ease-linear"
          style={{
            width: `${pct}%`,
            background: danger ? "hsl(0 85% 55%)" : "hsl(var(--game-accent))",
            boxShadow: danger ? "0 0 12px hsl(0 85% 55%)" : "0 0 10px hsla(var(--game-accent), 0.6)",
          }}
        />
      </div>
    </div>
  );
}
