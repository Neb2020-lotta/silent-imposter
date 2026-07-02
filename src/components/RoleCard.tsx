import { useState } from "react";
import { Eye, EyeOff, Lock, ShieldAlert, KeyRound } from "lucide-react";
import { useSettings } from "@/lib/settings";

interface RoleCardProps {
  name?: string;
  isImposter: boolean;
  word?: string;
  tip?: string;
  /** Optional category label shown as tiny meta on the card. */
  category?: string;
  /** Show a "Verbergen" toggle after reveal (multiplayer). */
  allowHide?: boolean;
  /** Called when user hides card again (only used when allowHide). */
  onHide?: () => void;
  /** Initial revealed state (default false). */
  initialRevealed?: boolean;
}

/**
 * Shared, polished role/word reveal card used in Room, Local, and AIMode.
 * Sealed → tap to reveal → animated flip → distinctive Imposter vs Crewmate visuals.
 */
export function RoleCard({
  name,
  isImposter,
  word,
  tip,
  category,
  allowHide = false,
  onHide,
  initialRevealed = false,
}: RoleCardProps) {
  const { animations } = useSettings();
  const [revealed, setRevealed] = useState(initialRevealed);

  const anim = animations ? "" : "no-anim";
  const flip = animations ? "animate-flip" : "";
  const glow = animations && isImposter ? "animate-imposter-glow" : "";

  return (
    <div className={`relative ${anim}`}>
      {/* Corner marks */}
      <CornerMarks />

      {!revealed ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="group relative w-full press-feedback overflow-hidden"
          style={{
            background:
              "repeating-linear-gradient(45deg, hsl(var(--game-input-bg)) 0 12px, hsl(var(--game-card-bg)) 12px 24px)",
            border: "1px dashed hsl(var(--game-border))",
            borderRadius: 2,
            padding: "2.25rem 1.5rem",
          }}
          aria-label="Karte aufdecken"
        >
          <div className="flex flex-col items-center gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full transition-transform group-hover:scale-110"
              style={{
                background: "hsl(var(--game-card-bg))",
                border: "1px solid hsl(var(--game-accent))",
                boxShadow: "0 0 24px -4px hsla(var(--game-accent), 0.5)",
              }}
            >
              <Lock className="h-6 w-6" style={{ color: "hsl(var(--game-accent))" }} />
            </div>
            <div className="space-y-1">
              <p className="term-tag">// versiegelt</p>
              <p
                className="text-lg font-bold uppercase tracking-[0.3em] term-mono"
                style={{ color: "hsl(var(--game-text))" }}
              >
                Classified
              </p>
              {name && (
                <p className="term-sans text-sm" style={{ color: "hsl(var(--game-secondary))" }}>
                  Für <span style={{ color: "hsl(var(--game-text))" }}>{name}</span>
                </p>
              )}
            </div>
            <p
              className="term-mono text-[10px] uppercase tracking-widest"
              style={{ color: "hsl(var(--game-secondary))" }}
            >
              ▸ Tippen zum Aufdecken
            </p>
          </div>
        </button>
      ) : (
        <div
          key={isImposter ? "imp" : "crew"}
          className={`relative ${flip} ${glow} overflow-hidden`}
          style={{
            background: isImposter
              ? "linear-gradient(160deg, hsl(var(--game-card-bg)) 0%, hsla(var(--game-accent), 0.18) 100%)"
              : "hsl(var(--game-card-bg))",
            border: `1px solid ${
              isImposter ? "hsl(var(--game-accent))" : "hsl(var(--game-border))"
            }`,
            borderRadius: 2,
            padding: "1.75rem 1.25rem",
          }}
        >
          {/* Warning stripe for imposter */}
          {isImposter && (
            <div
              aria-hidden
              className="absolute inset-x-0 top-0 h-1.5"
              style={{
                background:
                  "repeating-linear-gradient(90deg, hsl(var(--game-accent)) 0 10px, transparent 10px 20px)",
              }}
            />
          )}

          <div className="flex flex-col items-center gap-4 text-center">
            {/* Role badge */}
            <div className="flex items-center gap-2">
              {isImposter ? (
                <ShieldAlert className="h-4 w-4" style={{ color: "hsl(var(--game-accent))" }} />
              ) : (
                <KeyRound className="h-4 w-4" style={{ color: "hsl(var(--game-accent))" }} />
              )}
              <p className="term-tag">
                {isImposter ? "// deine rolle" : "// dein geheimwort"}
              </p>
            </div>

            {/* Main value */}
            {isImposter ? (
              <div className="space-y-3">
                <p
                  className="text-5xl font-bold uppercase term-mono leading-none"
                  style={{
                    color: "hsl(var(--game-accent))",
                    textShadow: "0 0 24px hsla(var(--game-accent), 0.6)",
                    letterSpacing: "0.08em",
                  }}
                >
                  Imposter
                </p>
                <p className="term-sans text-sm" style={{ color: "hsl(var(--game-secondary))" }}>
                  Du kennst das Wort nicht. Blende dich rein.
                </p>
                {tip && (
                  <div
                    className="mt-2 px-4 py-3"
                    style={{
                      background: "hsl(var(--game-input-bg))",
                      border: "1px dashed hsl(var(--game-accent))",
                      borderRadius: 2,
                    }}
                  >
                    <p className="term-tag mb-1">// kategorie-tipp</p>
                    <p
                      className="term-mono text-base"
                      style={{ color: "hsl(var(--game-text))" }}
                    >
                      „{tip}"
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p
                  className="text-4xl sm:text-5xl font-bold term-mono leading-tight break-words"
                  style={{
                    color: "hsl(var(--game-accent))",
                    textShadow: "0 0 20px hsla(var(--game-accent), 0.35)",
                  }}
                >
                  {word}
                </p>
                {category && (
                  <p
                    className="term-mono text-[10px] uppercase tracking-widest"
                    style={{ color: "hsl(var(--game-secondary))" }}
                  >
                    // {category}
                  </p>
                )}
              </div>
            )}

            {/* Footer meta */}
            <div
              className="mt-2 flex w-full items-center justify-between border-t pt-3 text-[10px] uppercase tracking-widest term-mono"
              style={{
                borderColor: "hsl(var(--game-border))",
                color: "hsl(var(--game-secondary))",
              }}
            >
              <span className="inline-flex items-center gap-1">
                <Eye className="h-3 w-3" /> Nur du
              </span>
              {allowHide && onHide && (
                <button
                  type="button"
                  onClick={() => {
                    setRevealed(false);
                    onHide();
                  }}
                  className="inline-flex items-center gap-1 transition-colors hover:text-[hsl(var(--game-accent))]"
                >
                  <EyeOff className="h-3 w-3" /> Verbergen
                </button>
              )}
              {!allowHide && (
                <button
                  type="button"
                  onClick={() => setRevealed(false)}
                  className="inline-flex items-center gap-1 transition-colors hover:text-[hsl(var(--game-accent))]"
                >
                  <EyeOff className="h-3 w-3" /> Verbergen
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CornerMarks() {
  const c = "hsl(var(--game-accent))";
  const size = 10;
  const style = { width: size, height: size, borderColor: c };
  return (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute -left-[1px] -top-[1px] border-l-2 border-t-2"
        style={style}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-[1px] -top-[1px] border-r-2 border-t-2"
        style={style}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -left-[1px] -bottom-[1px] border-l-2 border-b-2"
        style={style}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-[1px] -bottom-[1px] border-r-2 border-b-2"
        style={style}
      />
    </>
  );
}
