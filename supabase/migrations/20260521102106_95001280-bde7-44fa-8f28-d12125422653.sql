ALTER TABLE public.rooms ADD COLUMN current_turn_player_id uuid;
ALTER TABLE public.rooms ADD COLUMN eliminated_player_id uuid;