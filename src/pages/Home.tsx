import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { wordCategories, generateRoomCode } from "@/lib/words";
import { getClientId, getStoredName, setStoredName } from "@/lib/clientId";
import { toast } from "sonner";

type Mode = "menu" | "host" | "join";

export default function Home() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("menu");
  const [name, setName] = useState(getStoredName());
  const [code, setCode] = useState("");
  const [category, setCategory] = useState("Allgemein");
  const [imposterCount, setImposterCount] = useState(1);
  const [busy, setBusy] = useState(false);

  const createRoom = async () => {
    if (!name.trim()) return toast.error("Bitte gib einen Namen ein");
    setBusy(true);
    setStoredName(name.trim());
    const clientId = getClientId();
    let roomCode = "";
    let roomId: string | null = null;
    for (let i = 0; i < 5 && !roomId; i++) {
      roomCode = generateRoomCode();
      const { data, error } = await supabase
        .from("rooms")
        .insert({ code: roomCode, host_id: clientId, category, imposter_count: imposterCount })
        .select("id")
        .single();
      if (!error && data) roomId = data.id;
    }
    if (!roomId) {
      setBusy(false);
      return toast.error("Raum konnte nicht erstellt werden");
    }
    await supabase.from("players").insert({
      room_id: roomId,
      client_id: clientId,
      name: name.trim(),
      is_host: true,
    });
    navigate(`/room/${roomCode}`);
  };

  const joinRoom = async () => {
    if (!name.trim()) return toast.error("Bitte gib einen Namen ein");
    if (!code.trim()) return toast.error("Bitte gib den Raum-Code ein");
    setBusy(true);
    setStoredName(name.trim());
    const upper = code.trim().toUpperCase();
    const { data: room, error } = await supabase
      .from("rooms")
      .select("id, state")
      .eq("code", upper)
      .maybeSingle();
    if (error || !room) {
      setBusy(false);
      return toast.error("Raum nicht gefunden");
    }
    if (room.state !== "lobby") {
      setBusy(false);
      return toast.error("Das Spiel hat bereits begonnen");
    }
    const clientId = getClientId();
    const { data: existing } = await supabase
      .from("players")
      .select("id")
      .eq("room_id", room.id)
      .eq("client_id", clientId)
      .maybeSingle();
    if (!existing) {
      const { error: insErr } = await supabase.from("players").insert({
        room_id: room.id,
        client_id: clientId,
        name: name.trim(),
        is_host: false,
      });
      if (insErr) {
        setBusy(false);
        return toast.error("Beitritt fehlgeschlagen");
      }
    }
    navigate(`/room/${upper}`);
  };

  const inputStyle = {
    background: "hsla(var(--game-input-bg), 0.7)",
    border: "2px solid hsl(var(--game-border))",
    color: "hsl(var(--game-text))",
  };

  return (
    <div className="min-h-screen font-poppins text-[color:hsl(var(--game-text))]" style={{ background: "var(--gradient-game-bg)" }}>
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4">
        <h1
          className="text-4xl md:text-6xl font-game font-bold mb-8 text-center"
          style={{
            background: "var(--gradient-game-title)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            animation: "pulsateGlow 2.5s infinite alternate",
          }}
        >
          🎮 IMPOSTER SPLASH
        </h1>

        <div
          className="w-full max-w-md rounded-3xl p-8 backdrop-blur-md space-y-6"
          style={{
            background: "hsla(var(--game-card-bg), 0.8)",
            border: "2px solid hsl(var(--game-border))",
            boxShadow: "var(--game-card-shadow)",
          }}
        >
          {mode === "menu" && (
            <div className="space-y-4">
              <p className="text-center text-lg opacity-80">Was willst du tun?</p>
              <Button
                onClick={() => setMode("host")}
                className="w-full text-xl py-6"
                style={{ background: "var(--gradient-button-primary)" }}
              >
                👑 Server hosten
              </Button>
              <Button
                onClick={() => setMode("join")}
                className="w-full text-xl py-6"
                style={{ background: "var(--gradient-button-success)" }}
              >
                🚪 Server beitreten
              </Button>
            </div>
          )}

          {mode !== "menu" && (
            <div>
              <label className="block text-lg mb-2">Dein Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Wie heißt du?"
                maxLength={20}
                className="text-center text-lg"
                style={inputStyle}
              />
            </div>
          )}

          {mode === "join" && (
            <div className="space-y-3">
              <h2 className="text-xl font-bold text-center">🚪 Raum beitreten</h2>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="6-stelliger Code"
                maxLength={6}
                className="text-center text-2xl tracking-widest font-bold"
                style={inputStyle}
              />
              <Button
                onClick={joinRoom}
                disabled={busy}
                className="w-full text-lg py-4"
                style={{ background: "var(--gradient-button-success)" }}
              >
                Beitreten
              </Button>
              <Button variant="ghost" onClick={() => setMode("menu")} className="w-full">
                ← Zurück
              </Button>
            </div>
          )}

          {mode === "host" && (
            <div className="space-y-3">
              <h2 className="text-xl font-bold text-center">✨ Neuen Raum erstellen</h2>
              <div>
                <label className="block text-sm mb-1">Thema</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger style={inputStyle}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(wordCategories).map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm mb-1">Anzahl Imposter</label>
                <Input
                  type="number"
                  min={1}
                  max={4}
                  value={imposterCount}
                  onChange={(e) => setImposterCount(Math.max(1, Math.min(4, parseInt(e.target.value) || 1)))}
                  className="text-center"
                  style={inputStyle}
                />
              </div>
              <Button
                onClick={createRoom}
                disabled={busy}
                className="w-full text-lg py-4"
                style={{ background: "var(--gradient-button-primary)" }}
              >
                Raum erstellen
              </Button>
              <Button variant="ghost" onClick={() => setMode("menu")} className="w-full">
                ← Zurück
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
