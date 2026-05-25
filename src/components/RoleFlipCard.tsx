import { useState } from "react";
import { motion } from "framer-motion";

interface RoleFlipCardProps {
  hidden?: React.ReactNode;
  front: React.ReactNode;
  revealed: boolean;
  onReveal?: () => void;
}

export default function RoleFlipCard({ hidden, front, revealed, onReveal }: RoleFlipCardProps) {
  const [internal, setInternal] = useState(revealed);
  const open = revealed ?? internal;

  const handleClick = () => {
    if (open) return;
    setInternal(true);
    onReveal?.();
  };

  return (
    <div className="w-full" style={{ perspective: 1200 }}>
      <motion.div
        className="relative w-full cursor-pointer"
        style={{ transformStyle: "preserve-3d", minHeight: 220 }}
        animate={{ rotateY: open ? 180 : 0 }}
        transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
        onClick={handleClick}
      >
        {/* BACK (hidden card shown first) */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center"
          style={{
            backfaceVisibility: "hidden",
            background:
              "linear-gradient(135deg, hsl(var(--game-card-bg)) 0%, hsl(var(--game-bg-end)) 100%)",
            border: "1px solid hsl(var(--game-border))",
            borderRadius: 2,
            boxShadow: "var(--game-card-shadow)",
          }}
        >
          {hidden ?? (
            <>
              <span
                className="text-[10px] uppercase tracking-[0.4em] mb-2"
                style={{ fontFamily: "'Space Mono', monospace", color: "hsl(var(--game-secondary))" }}
              >
                // tap to reveal
              </span>
              <span
                className="text-6xl"
                style={{ color: "hsl(var(--game-accent))", textShadow: "0 0 20px hsla(var(--game-accent),0.6)" }}
              >
                ▣
              </span>
            </>
          )}
        </div>

        {/* FRONT (revealed) */}
        <div
          className="relative flex flex-col items-center justify-center p-6 text-center"
          style={{
            transform: "rotateY(180deg)",
            backfaceVisibility: "hidden",
            background: "hsl(var(--game-card-bg))",
            border: "1px solid hsl(var(--game-accent))",
            borderRadius: 2,
            boxShadow: "0 0 30px -8px hsla(var(--game-accent), 0.5)",
            minHeight: 220,
          }}
        >
          {front}
        </div>
      </motion.div>
    </div>
  );
}
