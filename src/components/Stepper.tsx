import { Minus, Plus } from "lucide-react";

interface StepperProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  label?: string;
}

export default function Stepper({ value, min = 1, max = 10, onChange, label }: StepperProps) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  return (
    <div
      className="flex items-center gap-3"
      style={{
        background: "hsl(var(--game-input-bg))",
        border: "1px solid hsl(var(--game-border))",
        borderRadius: 2,
        padding: "6px",
      }}
    >
      <button
        type="button"
        onClick={dec}
        disabled={value <= min}
        className="h-9 w-9 flex items-center justify-center transition-all disabled:opacity-30 active:scale-95 hover:bg-[hsl(var(--game-accent)/0.15)]"
        style={{ borderRadius: 2, color: "hsl(var(--game-accent))" }}
        aria-label="weniger"
      >
        <Minus className="h-4 w-4" />
      </button>
      <div
        className="flex-1 text-center text-xl font-bold tabular-nums"
        style={{ fontFamily: "'Space Mono', monospace", color: "hsl(var(--game-text))" }}
      >
        {value}
        {label && (
          <span
            className="ml-2 text-[10px] uppercase tracking-widest"
            style={{ color: "hsl(var(--game-secondary))" }}
          >
            {label}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={inc}
        disabled={value >= max}
        className="h-9 w-9 flex items-center justify-center transition-all disabled:opacity-30 active:scale-95 hover:bg-[hsl(var(--game-accent)/0.15)]"
        style={{ borderRadius: 2, color: "hsl(var(--game-accent))" }}
        aria-label="mehr"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
