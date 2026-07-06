import { useState } from "react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { registerAccount, loginAccount } from "@/lib/account";
import { sfx } from "@/lib/sounds";

const mono = "'Space Mono', monospace";

const inputStyle = {
  background: "hsl(var(--game-input-bg))",
  border: "1px solid hsl(var(--game-border))",
  color: "hsl(var(--game-text))",
  borderRadius: 2,
};

export default function AuthModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberIp, setRememberIp] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!username.trim() || !password) {
      toast.error("Name & Passwort erforderlich");
      return;
    }
    setBusy(true);
    try {
      if (mode === "register") {
        await registerAccount(username.trim(), password, rememberIp);
        toast.success("Konto erstellt");
      } else {
        await loginAccount(username.trim(), password, rememberIp);
        toast.success("Eingeloggt");
      }
      onClose();
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      if (msg.includes("username_taken")) toast.error("Name schon vergeben");
      else if (msg.includes("invalid_credentials")) toast.error("Falscher Name oder Passwort");
      else if (msg.includes("invalid_username")) toast.error("Name muss 3–20 Zeichen haben");
      else if (msg.includes("invalid_password")) toast.error("Passwort zu kurz (min. 4)");
      else toast.error("Fehler: " + msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: "rgba(0,0,0,0.85)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm p-6 space-y-4"
        style={{
          background: "hsl(var(--game-card-bg))",
          border: "1px solid hsl(var(--game-accent))",
          borderRadius: 2,
        }}
      >
        <div className="flex items-center justify-between">
          <p
            className="text-xs uppercase tracking-widest"
            style={{ fontFamily: mono, color: "hsl(var(--game-accent))" }}
          >
            // {mode === "login" ? "Einloggen" : "Registrieren"}
          </p>
          <button
            onClick={onClose}
            className="text-xs uppercase"
            style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label
              className="block text-[10px] uppercase tracking-widest mb-1"
              style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}
            >
              Benutzername
            </label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={20}
              style={inputStyle}
            />
          </div>
          <div>
            <label
              className="block text-[10px] uppercase tracking-widest mb-1"
              style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}
            >
              Passwort
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              style={inputStyle}
            />
          </div>

          <label
            className="flex items-center gap-2 text-xs cursor-pointer select-none"
            style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}
          >
            <input
              type="checkbox"
              checked={rememberIp}
              onChange={(e) => setRememberIp(e.target.checked)}
            />
            IP merken (Auto-Login auf diesem Netzwerk)
          </label>
        </div>

        <button
          onClick={() => { sfx.click(); submit(); }}
          disabled={busy}
          className="press-feedback w-full py-3 text-sm font-bold uppercase tracking-wider disabled:opacity-50"
          style={{
            fontFamily: mono,
            background: "hsl(var(--game-accent))",
            color: "hsl(0 0% 8%)",
            borderRadius: 2,
          }}
        >
          {mode === "login" ? "Einloggen" : "Konto erstellen"}
        </button>

        <button
          onClick={() => setMode(mode === "login" ? "register" : "login")}
          className="w-full text-[10px] uppercase tracking-widest"
          style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}
        >
          {mode === "login" ? "Noch kein Konto? Registrieren" : "Bereits ein Konto? Einloggen"}
        </button>
      </div>
    </div>
  );
}
