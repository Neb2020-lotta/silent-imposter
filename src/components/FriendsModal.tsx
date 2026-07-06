import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  listFriends,
  sendFriendRequest,
  acceptFriend,
  removeFriend,
  logoutAccount,
  getAccount,
  type Friend,
} from "@/lib/account";
import { sfx } from "@/lib/sounds";

const mono = "'Space Mono', monospace";

const inputStyle = {
  background: "hsl(var(--game-input-bg))",
  border: "1px solid hsl(var(--game-border))",
  color: "hsl(var(--game-text))",
  borderRadius: 2,
};

export default function FriendsModal({ onClose }: { onClose: () => void }) {
  const acc = getAccount();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [addName, setAddName] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      setFriends(await listFriends());
    } catch (e: any) {
      toast.error("Fehler beim Laden");
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const add = async () => {
    if (!addName.trim()) return;
    setBusy(true);
    try {
      await sendFriendRequest(addName.trim());
      toast.success("Anfrage gesendet");
      setAddName("");
      await refresh();
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      if (msg.includes("user_not_found")) toast.error("Nutzer nicht gefunden");
      else if (msg.includes("cannot_add_self")) toast.error("Du kannst dich nicht selbst adden");
      else toast.error("Fehler: " + msg);
    } finally {
      setBusy(false);
    }
  };

  const accept = async (id: string) => {
    try {
      await acceptFriend(id);
      await refresh();
    } catch {
      toast.error("Fehler");
    }
  };

  const remove = async (id: string) => {
    try {
      await removeFriend(id);
      await refresh();
    } catch {
      toast.error("Fehler");
    }
  };

  const doLogout = async () => {
    await logoutAccount();
    onClose();
  };

  const accepted = friends.filter((f) => f.status === "accepted");
  const incoming = friends.filter((f) => f.status === "pending" && f.direction === "incoming");
  const outgoing = friends.filter((f) => f.status === "pending" && f.direction === "outgoing");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: "rgba(0,0,0,0.85)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md p-6 space-y-4 max-h-[85vh] overflow-y-auto"
        style={{
          background: "hsl(var(--game-card-bg))",
          border: "1px solid hsl(var(--game-accent))",
          borderRadius: 2,
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest" style={{ fontFamily: mono, color: "hsl(var(--game-accent))" }}>
              // Freunde
            </p>
            <p className="text-sm mt-1" style={{ fontFamily: "'Rubik', sans-serif" }}>
              Eingeloggt als <span style={{ color: "hsl(var(--game-accent))" }}>{acc?.username}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-xs uppercase"
            style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}
          >
            ✕
          </button>
        </div>

        <div className="space-y-2">
          <label
            className="block text-[10px] uppercase tracking-widest"
            style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}
          >
            Freund adden (Benutzername)
          </label>
          <div className="flex gap-2">
            <Input
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="Name..."
              style={inputStyle}
            />
            <button
              onClick={() => { sfx.click(); add(); }}
              disabled={busy}
              className="press-feedback px-4 text-xs font-bold uppercase disabled:opacity-50"
              style={{
                fontFamily: mono,
                background: "hsl(var(--game-accent))",
                color: "hsl(0 0% 8%)",
                borderRadius: 2,
              }}
            >
              Add
            </button>
          </div>
        </div>

        {incoming.length > 0 && (
          <Section title="Eingehende Anfragen">
            {incoming.map((f) => (
              <Row key={f.other_id} name={f.username}>
                <ActionBtn onClick={() => accept(f.other_id)} accent>Annehmen</ActionBtn>
                <ActionBtn onClick={() => remove(f.other_id)}>Ablehnen</ActionBtn>
              </Row>
            ))}
          </Section>
        )}

        {outgoing.length > 0 && (
          <Section title="Ausgehend (wartet)">
            {outgoing.map((f) => (
              <Row key={f.other_id} name={f.username}>
                <ActionBtn onClick={() => remove(f.other_id)}>Abbrechen</ActionBtn>
              </Row>
            ))}
          </Section>
        )}

        <Section title={`Freunde (${accepted.length})`}>
          {accepted.length === 0 ? (
            <p className="text-xs" style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}>
              Noch keine Freunde.
            </p>
          ) : (
            accepted.map((f) => (
              <Row key={f.other_id} name={f.username}>
                <ActionBtn onClick={() => remove(f.other_id)}>Entfernen</ActionBtn>
              </Row>
            ))
          )}
        </Section>

        <button
          onClick={doLogout}
          className="w-full py-2 text-[10px] uppercase tracking-widest border"
          style={{
            fontFamily: mono,
            color: "hsl(var(--game-secondary))",
            borderColor: "hsl(var(--game-border))",
            borderRadius: 2,
            background: "transparent",
          }}
        >
          Ausloggen
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}>
        {title}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-between px-3 py-2 gap-2"
      style={{ border: "1px solid hsl(var(--game-border))", borderRadius: 2 }}
    >
      <span className="text-sm" style={{ fontFamily: "'Rubik', sans-serif" }}>{name}</span>
      <div className="flex gap-1">{children}</div>
    </div>
  );
}

function ActionBtn({ onClick, children, accent }: { onClick: () => void; children: React.ReactNode; accent?: boolean }) {
  return (
    <button
      onClick={() => { sfx.click(); onClick(); }}
      className="press-feedback px-2 py-1 text-[10px] uppercase tracking-widest"
      style={{
        fontFamily: mono,
        background: accent ? "hsl(var(--game-accent))" : "transparent",
        color: accent ? "hsl(0 0% 8%)" : "hsl(var(--game-text))",
        border: accent ? "none" : "1px solid hsl(var(--game-border))",
        borderRadius: 2,
      }}
    >
      {children}
    </button>
  );
}
