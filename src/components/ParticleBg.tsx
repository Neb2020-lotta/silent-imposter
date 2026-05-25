import { useMemo } from "react";

interface ParticleBgProps {
  count?: number;
}

// CSS-only particle field. Cheap, no canvas, themed via --game-accent.
export default function ParticleBg({ count = 18 }: ParticleBgProps) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 2 + Math.random() * 4,
        delay: Math.random() * 12,
        duration: 12 + Math.random() * 14,
        opacity: 0.25 + Math.random() * 0.55,
      })),
    [count]
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute bottom-[-10px] rounded-full"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: "hsl(var(--game-accent))",
            opacity: p.opacity,
            boxShadow: "0 0 8px hsl(var(--game-accent))",
            animation: `particle-float ${p.duration}s linear ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
