import { useEffect, useState } from "react";
import { checkMe, type BanEntry } from "@/lib/moderation";

export default function BanGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ loading: boolean; entry: BanEntry | null; ip: string }>({
    loading: true,
    entry: null,
    ip: "",
  });

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const res = await checkMe();
      if (cancelled) return;
      setState({ loading: false, entry: res?.entry ?? null, ip: res?.ip ?? "unknown" });
    };
    run();
    const iv = setInterval(run, 60_000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, []);

  if (state.loading) return <>{children}</>;
  if (!state.entry) return <>{children}</>;

  const isTimeout = state.entry.kind === "timeout";
  const expires = state.entry.expires_at ? new Date(state.entry.expires_at) : null;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center px-6"
      style={{ background: "hsl(var(--game-bg-start))", color: "hsl(var(--game-text))" }}
    >
      <div
        className="w-full max-w-md p-8 space-y-5 text-center"
        style={{
          background: "hsl(var(--game-card-bg))",
          border: "1px solid hsl(var(--game-accent))",
          borderRadius: 2,
        }}
      >
        <p
          className="text-xs uppercase tracking-widest"
          style={{ fontFamily: "'Space Mono', monospace", color: "hsl(var(--game-accent))" }}
        >
          // Access denied
        </p>
        <h1
          className="text-3xl font-bold uppercase"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          {isTimeout ? "Timeout" : "Gebannt"}
        </h1>
        <p style={{ fontFamily: "'Rubik', sans-serif", color: "hsl(var(--game-secondary))" }}>
          {isTimeout
            ? "Du kannst diese App vorübergehend nicht nutzen."
            : "Dein Zugriff auf diese App wurde gesperrt."}
        </p>
        {state.entry.reason && (
          <p
            className="text-sm px-3 py-2"
            style={{
              fontFamily: "'Rubik', sans-serif",
              background: "hsl(var(--game-bg-start))",
              border: "1px solid hsl(var(--game-border))",
              borderRadius: 2,
            }}
          >
            Grund: {state.entry.reason}
          </p>
        )}
        {expires && (
          <p
            className="text-xs uppercase tracking-widest"
            style={{ fontFamily: "'Space Mono', monospace", color: "hsl(var(--game-secondary))" }}
          >
            Läuft ab: {expires.toLocaleString()}
          </p>
        )}
        <p
          className="text-[10px] uppercase tracking-widest pt-2 border-t"
          style={{
            borderColor: "hsl(var(--game-border))",
            fontFamily: "'Space Mono', monospace",
            color: "hsl(var(--game-secondary))",
          }}
        >
          IP: {state.ip}
        </p>
      </div>
    </div>
  );
}
