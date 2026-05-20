
-- ROOMS
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  host_id UUID NOT NULL,
  state TEXT NOT NULL DEFAULT 'lobby',
  category TEXT NOT NULL DEFAULT 'Allgemein',
  imposter_count INT NOT NULL DEFAULT 1,
  word TEXT,
  hint TEXT,
  starting_player_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PLAYERS
CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  name TEXT NOT NULL,
  is_host BOOLEAN NOT NULL DEFAULT false,
  is_imposter BOOLEAN NOT NULL DEFAULT false,
  word TEXT,
  imposter_tip TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX players_room_idx ON public.players(room_id);

-- MESSAGES
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  player_id UUID,
  player_name TEXT NOT NULL,
  content TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX messages_room_idx ON public.messages(room_id, created_at);

-- RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Public read/write (no auth in this game)
CREATE POLICY "rooms_select_all" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "rooms_insert_all" ON public.rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "rooms_update_all" ON public.rooms FOR UPDATE USING (true);
CREATE POLICY "rooms_delete_all" ON public.rooms FOR DELETE USING (true);

CREATE POLICY "players_select_all" ON public.players FOR SELECT USING (true);
CREATE POLICY "players_insert_all" ON public.players FOR INSERT WITH CHECK (true);
CREATE POLICY "players_update_all" ON public.players FOR UPDATE USING (true);
CREATE POLICY "players_delete_all" ON public.players FOR DELETE USING (true);

CREATE POLICY "messages_select_all" ON public.messages FOR SELECT USING (true);
CREATE POLICY "messages_insert_all" ON public.messages FOR INSERT WITH CHECK (true);

-- Realtime
ALTER TABLE public.rooms REPLICA IDENTITY FULL;
ALTER TABLE public.players REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
