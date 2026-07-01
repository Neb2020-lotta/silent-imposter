
-- 1. Add host_secret column and CHECK on messages.kind
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS host_secret uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_kind_valid;
ALTER TABLE public.messages ADD CONSTRAINT messages_kind_valid CHECK (kind IN ('chat','hint','system'));

-- 2. Column-level privilege lockdown so secrets aren't publicly readable
REVOKE SELECT (host_secret, host_id) ON public.rooms FROM anon, authenticated;
REVOKE SELECT (client_id)             ON public.players FROM anon, authenticated;

-- 3. Replace overly-permissive RLS with strict policies
DROP POLICY IF EXISTS rooms_update_all       ON public.rooms;
DROP POLICY IF EXISTS rooms_delete_all       ON public.rooms;
DROP POLICY IF EXISTS rooms_insert_all       ON public.rooms;
DROP POLICY IF EXISTS players_update_all     ON public.players;
DROP POLICY IF EXISTS players_delete_all     ON public.players;
DROP POLICY IF EXISTS players_insert_all     ON public.players;
DROP POLICY IF EXISTS messages_insert_non_system ON public.messages;

-- SELECT policies remain public for the game to be observable
-- (existing rooms_select_all / players_select_all / messages_select_all kept intact)

-- Messages: tighten insert — must reference a real player in the same room, and
-- the provided display name must match that player's registered name.
CREATE POLICY messages_insert_valid_player ON public.messages
  FOR INSERT
  WITH CHECK (
    kind IN ('chat','hint')
    AND player_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.players p
      WHERE p.id = messages.player_id
        AND p.room_id = messages.room_id
        AND p.name    = messages.player_name
    )
  );

-- No INSERT/UPDATE/DELETE policies on rooms or players => direct mutation blocked.
-- All privileged actions go through SECURITY DEFINER RPCs below.

-- ============ RPCs ============

-- Create room (returns id + host_secret + first player id)
CREATE OR REPLACE FUNCTION public.create_room(
  p_code text,
  p_client_id uuid,
  p_category text,
  p_name text
) RETURNS TABLE(room_id uuid, host_secret uuid, player_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_room_id uuid; v_secret uuid; v_player_id uuid; v_name text;
BEGIN
  v_name := btrim(coalesce(p_name,''));
  IF length(v_name) < 1 OR length(v_name) > 20 THEN RAISE EXCEPTION 'invalid_name'; END IF;
  IF length(coalesce(p_code,'')) < 4 OR length(p_code) > 8 THEN RAISE EXCEPTION 'invalid_code'; END IF;
  IF length(coalesce(p_category,'')) > 60 THEN RAISE EXCEPTION 'invalid_category'; END IF;
  IF p_client_id IS NULL THEN RAISE EXCEPTION 'invalid_client'; END IF;

  INSERT INTO rooms (code, host_id, category, imposter_count)
    VALUES (upper(p_code), p_client_id, p_category, 1)
    RETURNING id, rooms.host_secret INTO v_room_id, v_secret;

  INSERT INTO players (room_id, client_id, name, is_host)
    VALUES (v_room_id, p_client_id, v_name, true)
    RETURNING id INTO v_player_id;

  RETURN QUERY SELECT v_room_id, v_secret, v_player_id;
END $$;

-- Join room (idempotent for same client_id)
CREATE OR REPLACE FUNCTION public.join_room(
  p_code text,
  p_client_id uuid,
  p_name text
) RETURNS TABLE(room_id uuid, player_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_room rooms; v_player_id uuid; v_name text;
BEGIN
  v_name := btrim(coalesce(p_name,''));
  IF length(v_name) < 1 OR length(v_name) > 20 THEN RAISE EXCEPTION 'invalid_name'; END IF;
  IF p_client_id IS NULL THEN RAISE EXCEPTION 'invalid_client'; END IF;

  SELECT * INTO v_room FROM rooms WHERE code = upper(p_code) LIMIT 1;
  IF v_room IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  IF v_room.state <> 'lobby' THEN RAISE EXCEPTION 'already_started'; END IF;

  SELECT id INTO v_player_id FROM players
    WHERE room_id = v_room.id AND client_id = p_client_id LIMIT 1;
  IF v_player_id IS NULL THEN
    INSERT INTO players (room_id, client_id, name, is_host)
      VALUES (v_room.id, p_client_id, v_name, false)
      RETURNING id INTO v_player_id;
  END IF;

  RETURN QUERY SELECT v_room.id, v_player_id;
END $$;

-- Player leaves (deletes own row)
CREATE OR REPLACE FUNCTION public.player_leave(
  p_room_id uuid,
  p_client_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM players WHERE room_id = p_room_id AND client_id = p_client_id;
END $$;

-- Player casts a vote (only during voting, only for a player in the same room)
CREATE OR REPLACE FUNCTION public.player_cast_vote(
  p_room_id uuid,
  p_client_id uuid,
  p_target uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_state text; v_voter uuid;
BEGIN
  SELECT state INTO v_state FROM rooms WHERE id = p_room_id;
  IF v_state <> 'voting' THEN RAISE EXCEPTION 'not_voting'; END IF;
  SELECT id INTO v_voter FROM players WHERE room_id = p_room_id AND client_id = p_client_id;
  IF v_voter IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF NOT EXISTS (SELECT 1 FROM players WHERE id = p_target AND room_id = p_room_id) THEN
    RAISE EXCEPTION 'invalid_target';
  END IF;
  IF v_voter = p_target THEN RAISE EXCEPTION 'self_vote'; END IF;
  UPDATE players SET voted_for = p_target WHERE id = v_voter;
END $$;

-- Player advances the turn to the next player (only the current turn player may)
CREATE OR REPLACE FUNCTION public.player_advance_turn(
  p_room_id uuid,
  p_client_id uuid,
  p_next_player uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_current uuid; v_state text; v_caller uuid;
BEGIN
  SELECT state, current_turn_player_id INTO v_state, v_current FROM rooms WHERE id = p_room_id;
  IF v_state <> 'discussion' THEN RAISE EXCEPTION 'not_discussion'; END IF;
  SELECT id INTO v_caller FROM players WHERE room_id = p_room_id AND client_id = p_client_id;
  IF v_caller IS NULL OR v_caller <> v_current THEN RAISE EXCEPTION 'not_your_turn'; END IF;
  IF p_next_player IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM players WHERE id = p_next_player AND room_id = p_room_id
  ) THEN RAISE EXCEPTION 'invalid_next'; END IF;
  UPDATE rooms SET current_turn_player_id = p_next_player WHERE id = p_room_id;
END $$;

-- ============ Host RPCs ============

-- Internal helper: authorize host by secret
CREATE OR REPLACE FUNCTION public._require_host(p_room_id uuid, p_secret uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM rooms WHERE id = p_room_id AND host_secret = p_secret) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.host_set_category(
  p_room_id uuid, p_secret uuid, p_category text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM _require_host(p_room_id, p_secret);
  IF length(coalesce(p_category,'')) > 60 THEN RAISE EXCEPTION 'invalid_category'; END IF;
  UPDATE rooms SET category = p_category WHERE id = p_room_id AND state = 'lobby';
END $$;

CREATE OR REPLACE FUNCTION public.host_set_state(
  p_room_id uuid, p_secret uuid, p_state text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM _require_host(p_room_id, p_secret);
  IF p_state NOT IN ('lobby','playing','discussion','voting','elimination','reveal') THEN
    RAISE EXCEPTION 'invalid_state';
  END IF;
  IF p_state = 'discussion' THEN
    UPDATE rooms SET state = p_state, current_turn_player_id = starting_player_id
      WHERE id = p_room_id;
  ELSE
    UPDATE rooms SET state = p_state WHERE id = p_room_id;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.host_start_game(
  p_room_id uuid,
  p_secret uuid,
  p_word text,
  p_hint text,
  p_imposters uuid[],
  p_tips text[],
  p_starting uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE i int; v_pid uuid; v_tip text; v_tip_idx int := 1;
BEGIN
  PERFORM _require_host(p_room_id, p_secret);
  IF length(coalesce(p_word,'')) < 1 OR length(p_word) > 60 THEN RAISE EXCEPTION 'invalid_word'; END IF;
  IF length(coalesce(p_hint,'')) > 200 THEN RAISE EXCEPTION 'invalid_hint'; END IF;
  IF coalesce(array_length(p_imposters, 1), 0) < 1 THEN RAISE EXCEPTION 'no_imposters'; END IF;

  DELETE FROM messages WHERE room_id = p_room_id;

  -- Reset & assign roles for players in this room
  UPDATE players
    SET is_imposter = (id = ANY(p_imposters)),
        word        = CASE WHEN id = ANY(p_imposters) THEN NULL ELSE p_word END,
        voted_for   = NULL,
        imposter_tip = NULL
    WHERE room_id = p_room_id;

  -- Assign tips to imposters in given order
  FOREACH v_pid IN ARRAY p_imposters LOOP
    v_tip := COALESCE(p_tips[v_tip_idx], 'Geheimnis');
    UPDATE players SET imposter_tip = v_tip WHERE id = v_pid AND room_id = p_room_id;
    v_tip_idx := v_tip_idx + 1;
  END LOOP;

  IF NOT EXISTS (SELECT 1 FROM players WHERE id = p_starting AND room_id = p_room_id) THEN
    RAISE EXCEPTION 'invalid_starter';
  END IF;

  UPDATE rooms
    SET state = 'playing',
        word = p_word,
        hint = p_hint,
        starting_player_id = p_starting,
        current_turn_player_id = p_starting,
        eliminated_player_id = NULL
    WHERE id = p_room_id;
END $$;

CREATE OR REPLACE FUNCTION public.host_set_elimination(
  p_room_id uuid, p_secret uuid, p_eliminated uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM _require_host(p_room_id, p_secret);
  IF NOT EXISTS (SELECT 1 FROM players WHERE id = p_eliminated AND room_id = p_room_id) THEN
    RAISE EXCEPTION 'invalid_player';
  END IF;
  UPDATE rooms SET state = 'elimination', eliminated_player_id = p_eliminated WHERE id = p_room_id;
END $$;

CREATE OR REPLACE FUNCTION public.host_new_round(
  p_room_id uuid, p_secret uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM _require_host(p_room_id, p_secret);
  DELETE FROM messages WHERE room_id = p_room_id;
  UPDATE players SET is_imposter = false, word = NULL, imposter_tip = NULL, voted_for = NULL
    WHERE room_id = p_room_id;
  UPDATE rooms SET state = 'lobby', word = NULL, hint = NULL,
                   starting_player_id = NULL, current_turn_player_id = NULL,
                   eliminated_player_id = NULL
    WHERE id = p_room_id;
END $$;

-- Execute grants
GRANT EXECUTE ON FUNCTION
  public.create_room(text, uuid, text, text),
  public.join_room(text, uuid, text),
  public.player_leave(uuid, uuid),
  public.player_cast_vote(uuid, uuid, uuid),
  public.player_advance_turn(uuid, uuid, uuid),
  public.host_set_category(uuid, uuid, text),
  public.host_set_state(uuid, uuid, text),
  public.host_start_game(uuid, uuid, text, text, uuid[], text[], uuid),
  public.host_set_elimination(uuid, uuid, uuid),
  public.host_new_round(uuid, uuid)
TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public._require_host(uuid, uuid) FROM PUBLIC;
