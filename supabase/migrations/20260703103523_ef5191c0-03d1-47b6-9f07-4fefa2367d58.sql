
-- 1) Move sensitive player columns to a protected table
CREATE TABLE public.player_secrets (
  player_id uuid PRIMARY KEY REFERENCES public.players(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  is_imposter boolean NOT NULL DEFAULT false,
  word text,
  imposter_tip text,
  voted_for uuid
);
GRANT ALL ON public.player_secrets TO service_role;
-- no grants to anon/authenticated: only accessible via SECURITY DEFINER RPCs
ALTER TABLE public.player_secrets ENABLE ROW LEVEL SECURITY;

-- migrate existing rows
INSERT INTO public.player_secrets (player_id, room_id, client_id, is_imposter, word, imposter_tip, voted_for)
SELECT id, room_id, client_id, is_imposter, word, imposter_tip, voted_for FROM public.players;

CREATE INDEX player_secrets_room_client_idx ON public.player_secrets(room_id, client_id);

-- 2) Drop sensitive columns from players (leave name, is_host, joined_at, room_id, id)
ALTER TABLE public.players
  DROP COLUMN client_id,
  DROP COLUMN is_imposter,
  DROP COLUMN word,
  DROP COLUMN imposter_tip,
  DROP COLUMN voted_for;

-- 3) Move sensitive room columns to a protected table
CREATE TABLE public.room_secrets (
  room_id uuid PRIMARY KEY REFERENCES public.rooms(id) ON DELETE CASCADE,
  host_id uuid NOT NULL,
  host_secret uuid NOT NULL DEFAULT gen_random_uuid()
);
GRANT ALL ON public.room_secrets TO service_role;
ALTER TABLE public.room_secrets ENABLE ROW LEVEL SECURITY;

INSERT INTO public.room_secrets (room_id, host_id, host_secret)
SELECT id, host_id, host_secret FROM public.rooms;

ALTER TABLE public.rooms
  DROP COLUMN host_id,
  DROP COLUMN host_secret;

-- 4) Rewrite existing SECURITY DEFINER RPCs to use new tables

CREATE OR REPLACE FUNCTION public._require_host(p_room_id uuid, p_secret uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM room_secrets WHERE room_id = p_room_id AND host_secret = p_secret) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public._require_host(uuid,uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_room(p_code text, p_client_id uuid, p_category text, p_name text)
RETURNS TABLE(room_id uuid, host_secret uuid, player_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_room_id uuid; v_secret uuid; v_player_id uuid; v_name text;
BEGIN
  v_name := btrim(coalesce(p_name,''));
  IF length(v_name) < 1 OR length(v_name) > 20 THEN RAISE EXCEPTION 'invalid_name'; END IF;
  IF length(coalesce(p_code,'')) < 4 OR length(p_code) > 8 THEN RAISE EXCEPTION 'invalid_code'; END IF;
  IF length(coalesce(p_category,'')) > 60 THEN RAISE EXCEPTION 'invalid_category'; END IF;
  IF p_client_id IS NULL THEN RAISE EXCEPTION 'invalid_client'; END IF;

  INSERT INTO rooms (code, category, imposter_count)
    VALUES (upper(p_code), p_category, 1)
    RETURNING id INTO v_room_id;

  INSERT INTO room_secrets (room_id, host_id)
    VALUES (v_room_id, p_client_id)
    RETURNING room_secrets.host_secret INTO v_secret;

  INSERT INTO players (room_id, name, is_host)
    VALUES (v_room_id, v_name, true)
    RETURNING id INTO v_player_id;

  INSERT INTO player_secrets (player_id, room_id, client_id)
    VALUES (v_player_id, v_room_id, p_client_id);

  RETURN QUERY SELECT v_room_id, v_secret, v_player_id;
END $$;

CREATE OR REPLACE FUNCTION public.join_room(p_code text, p_client_id uuid, p_name text)
RETURNS TABLE(room_id uuid, player_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_room rooms; v_player_id uuid; v_name text;
BEGIN
  v_name := btrim(coalesce(p_name,''));
  IF length(v_name) < 1 OR length(v_name) > 20 THEN RAISE EXCEPTION 'invalid_name'; END IF;
  IF p_client_id IS NULL THEN RAISE EXCEPTION 'invalid_client'; END IF;

  SELECT * INTO v_room FROM rooms WHERE code = upper(p_code) LIMIT 1;
  IF v_room IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  IF v_room.state <> 'lobby' THEN RAISE EXCEPTION 'already_started'; END IF;

  SELECT ps.player_id INTO v_player_id FROM player_secrets ps
    WHERE ps.room_id = v_room.id AND ps.client_id = p_client_id LIMIT 1;
  IF v_player_id IS NULL THEN
    INSERT INTO players (room_id, name, is_host)
      VALUES (v_room.id, v_name, false)
      RETURNING id INTO v_player_id;
    INSERT INTO player_secrets (player_id, room_id, client_id)
      VALUES (v_player_id, v_room.id, p_client_id);
  END IF;

  RETURN QUERY SELECT v_room.id, v_player_id;
END $$;

CREATE OR REPLACE FUNCTION public.player_leave(p_room_id uuid, p_client_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_pid uuid;
BEGIN
  SELECT player_id INTO v_pid FROM player_secrets
    WHERE room_id = p_room_id AND client_id = p_client_id;
  IF v_pid IS NOT NULL THEN
    DELETE FROM players WHERE id = v_pid;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.player_cast_vote(p_room_id uuid, p_client_id uuid, p_target uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_state text; v_voter uuid;
BEGIN
  SELECT state INTO v_state FROM rooms WHERE id = p_room_id;
  IF v_state <> 'voting' THEN RAISE EXCEPTION 'not_voting'; END IF;
  SELECT player_id INTO v_voter FROM player_secrets
    WHERE room_id = p_room_id AND client_id = p_client_id;
  IF v_voter IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF NOT EXISTS (SELECT 1 FROM players WHERE id = p_target AND room_id = p_room_id) THEN
    RAISE EXCEPTION 'invalid_target';
  END IF;
  IF v_voter = p_target THEN RAISE EXCEPTION 'self_vote'; END IF;
  UPDATE player_secrets SET voted_for = p_target WHERE player_id = v_voter;

  -- notify: touch rooms row so realtime broadcasts a change (safe: no sensitive cols)
  UPDATE rooms SET state = state WHERE id = p_room_id;
END $$;

CREATE OR REPLACE FUNCTION public.player_advance_turn(p_room_id uuid, p_client_id uuid, p_next_player uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_current uuid; v_state text; v_caller uuid;
BEGIN
  SELECT state, current_turn_player_id INTO v_state, v_current FROM rooms WHERE id = p_room_id;
  IF v_state <> 'discussion' THEN RAISE EXCEPTION 'not_discussion'; END IF;
  SELECT player_id INTO v_caller FROM player_secrets
    WHERE room_id = p_room_id AND client_id = p_client_id;
  IF v_caller IS NULL OR v_caller <> v_current THEN RAISE EXCEPTION 'not_your_turn'; END IF;
  IF p_next_player IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM players WHERE id = p_next_player AND room_id = p_room_id
  ) THEN RAISE EXCEPTION 'invalid_next'; END IF;
  UPDATE rooms SET current_turn_player_id = p_next_player WHERE id = p_room_id;
END $$;

CREATE OR REPLACE FUNCTION public.host_set_state(p_room_id uuid, p_secret uuid, p_state text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
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

CREATE OR REPLACE FUNCTION public.host_set_category(p_room_id uuid, p_secret uuid, p_category text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM _require_host(p_room_id, p_secret);
  IF length(coalesce(p_category,'')) > 60 THEN RAISE EXCEPTION 'invalid_category'; END IF;
  UPDATE rooms SET category = p_category WHERE id = p_room_id AND state = 'lobby';
END $$;

CREATE OR REPLACE FUNCTION public.host_set_elimination(p_room_id uuid, p_secret uuid, p_eliminated uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM _require_host(p_room_id, p_secret);
  IF NOT EXISTS (SELECT 1 FROM players WHERE id = p_eliminated AND room_id = p_room_id) THEN
    RAISE EXCEPTION 'invalid_player';
  END IF;
  UPDATE rooms SET state = 'elimination', eliminated_player_id = p_eliminated WHERE id = p_room_id;
END $$;

CREATE OR REPLACE FUNCTION public.host_new_round(p_room_id uuid, p_secret uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM _require_host(p_room_id, p_secret);
  DELETE FROM messages WHERE room_id = p_room_id;
  UPDATE player_secrets SET is_imposter = false, word = NULL, imposter_tip = NULL, voted_for = NULL
    WHERE room_id = p_room_id;
  UPDATE rooms SET state = 'lobby', word = NULL, hint = NULL,
                   starting_player_id = NULL, current_turn_player_id = NULL,
                   eliminated_player_id = NULL
    WHERE id = p_room_id;
END $$;

CREATE OR REPLACE FUNCTION public.host_start_game(p_room_id uuid, p_secret uuid, p_word text, p_hint text, p_imposters uuid[], p_tips text[], p_starting uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_pid uuid; v_tip text; v_tip_idx int := 1;
BEGIN
  PERFORM _require_host(p_room_id, p_secret);
  IF length(coalesce(p_word,'')) < 1 OR length(p_word) > 60 THEN RAISE EXCEPTION 'invalid_word'; END IF;
  IF length(coalesce(p_hint,'')) > 200 THEN RAISE EXCEPTION 'invalid_hint'; END IF;
  IF coalesce(array_length(p_imposters, 1), 0) < 1 THEN RAISE EXCEPTION 'no_imposters'; END IF;

  DELETE FROM messages WHERE room_id = p_room_id;

  UPDATE player_secrets
    SET is_imposter = (player_id = ANY(p_imposters)),
        word        = CASE WHEN player_id = ANY(p_imposters) THEN NULL ELSE p_word END,
        voted_for   = NULL,
        imposter_tip = NULL
    WHERE room_id = p_room_id;

  FOREACH v_pid IN ARRAY p_imposters LOOP
    v_tip := COALESCE(p_tips[v_tip_idx], 'Geheimnis');
    UPDATE player_secrets SET imposter_tip = v_tip WHERE player_id = v_pid AND room_id = p_room_id;
    v_tip_idx := v_tip_idx + 1;
  END LOOP;

  IF NOT EXISTS (SELECT 1 FROM players WHERE id = p_starting AND room_id = p_room_id) THEN
    RAISE EXCEPTION 'invalid_starter';
  END IF;

  UPDATE rooms
    SET state = 'playing', word = p_word, hint = p_hint,
        starting_player_id = p_starting, current_turn_player_id = p_starting,
        eliminated_player_id = NULL
    WHERE id = p_room_id;
END $$;

-- 5) New RPCs for client to safely read own role and vote state
CREATE OR REPLACE FUNCTION public.get_my_role(p_room_id uuid, p_client_id uuid)
RETURNS TABLE(player_id uuid, is_imposter boolean, word text, imposter_tip text, voted_for uuid)
LANGUAGE sql SECURITY DEFINER SET search_path=public STABLE AS $$
  SELECT player_id, is_imposter, word, imposter_tip, voted_for
  FROM player_secrets
  WHERE room_id = p_room_id AND client_id = p_client_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_vote_tally(p_room_id uuid)
RETURNS TABLE(target_id uuid, votes bigint)
LANGUAGE sql SECURITY DEFINER SET search_path=public STABLE AS $$
  SELECT voted_for, count(*)::bigint
  FROM player_secrets
  WHERE room_id = p_room_id AND voted_for IS NOT NULL
  GROUP BY voted_for;
$$;

CREATE OR REPLACE FUNCTION public.get_voted_count(p_room_id uuid)
RETURNS integer
LANGUAGE sql SECURITY DEFINER SET search_path=public STABLE AS $$
  SELECT count(*)::int FROM player_secrets
  WHERE room_id = p_room_id AND voted_for IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.get_imposters(p_room_id uuid)
RETURNS SETOF uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public STABLE AS $$
DECLARE v_state text;
BEGIN
  SELECT state INTO v_state FROM rooms WHERE id = p_room_id;
  IF v_state <> 'reveal' THEN RETURN; END IF;
  RETURN QUERY SELECT ps.player_id FROM player_secrets ps
    WHERE ps.room_id = p_room_id AND ps.is_imposter = true;
END $$;
