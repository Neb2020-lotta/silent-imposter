# Multiplayer Imposter Splash

Umbau des bisherigen lokalen Pass-and-Play Spiels zu echtem Multiplayer, bei dem jeder Spieler auf seinem eigenen Gerät teilnimmt.

## Ablauf aus Spielersicht

1. **Host** öffnet die App → "Spiel erstellen" → wählt Kategorie + Imposter-Anzahl → bekommt einen **6-stelligen Raum-Code**, sieht Lobby mit Spielerliste
2. **Mitspieler** öffnen die App → "Beitreten" → Code + Name eingeben → erscheinen in der Lobby
3. **Host** klickt "Spiel starten" → jeder sieht **auf seinem Gerät** sein Wort (oder "Du bist Imposter" + Tipp)
4. Übergang zu **Diskussion**: Startspieler wird angezeigt, **Chat ist offen** – jeder kann schreiben, Hinweise abgeben, diskutieren
5. **Host** klickt "Zur Auflösung" → alle sehen Wort + Imposter
6. **Host** kann "Neue Runde" starten (gleiche Spieler bleiben)

## Backend (Lovable Cloud)

Neue Tabellen:

- **rooms**: `id`, `code` (6 Zeichen, unique), `host_id` (uuid des Hosts, im localStorage), `state` (`lobby`|`playing`|`discussion`|`reveal`), `category`, `word`, `hint`, `imposter_count`, `starting_player_id`, `created_at`
- **players**: `id`, `room_id`, `client_id` (localStorage uuid pro Gerät), `name`, `is_host`, `is_imposter`, `word`, `imposter_tip`, `joined_at`
- **messages**: `id`, `room_id`, `player_id`, `player_name`, `content`, `kind` (`chat`|`system`), `created_at`

RLS: öffentlich lesbar/schreibbar pro `room_id` (kein Login). Schreibrechte werden in der App über `client_id`-Check gehandhabt; sensible Spalten (word/is_imposter) liest jeder Spieler nur für seinen eigenen Eintrag via View oder bekommt nach Spielstart nur seinen eigenen Datensatz angezeigt.

**Realtime**: Supabase Realtime auf `rooms`, `players`, `messages` → automatische UI-Updates auf allen Geräten.

## Frontend

- **Neue Routes**: `/` (Home: Erstellen / Beitreten), `/room/:code` (Lobby + Spiel + Chat)
- Bestehende `ImposterGame.tsx` wird aufgeteilt in:
  - `Home.tsx` – Erstellen/Beitreten
  - `Room.tsx` – Lobby, Wort-Anzeige, Diskussion+Chat, Auflösung
  - `ChatPanel.tsx` – Nachrichten anzeigen + senden
- Word-Datenbank (`wordCategories`) bleibt im Frontend, Host wählt Wort beim Spielstart und schreibt es in `rooms`
- Realtime-Subscriptions via `supabase.channel(...)`

## Steuerung

- Nur der **Host** sieht die Buttons "Spiel starten", "Zur Auflösung", "Neue Runde"
- Andere Spieler sehen passiv den aktuellen Zustand + können chatten

## Was bleibt gleich

- Wörter-Datenbank und Kategorien
- Design / Farben / Animationen
- Imposter-Tipps-System

## Was wegfällt

- Pass-and-Play "Gerät weitergeben" Phase – nicht mehr nötig, jeder hat sein Gerät
- Lokale Namen-Eingabe für mehrere Spieler – jeder gibt seinen Namen beim Beitritt selbst ein

Nach deiner Bestätigung aktiviere ich Lovable Cloud, lege die Tabellen an und baue das Frontend um.
