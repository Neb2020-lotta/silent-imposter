
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Accounts table (no direct public access; all via RPCs)
CREATE TABLE public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  username_lower text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  last_ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.accounts TO service_role;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.account_sessions (
  token uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.account_sessions TO service_role;
ALTER TABLE public.account_sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requester_id, addressee_id),
  CHECK (requester_id <> addressee_id)
);
GRANT ALL ON public.friendships TO service_role;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Internal implementations
CREATE OR REPLACE FUNCTION game_internal.account_register(p_username text, p_password text, p_ip text)
RETURNS TABLE(token uuid, account_id uuid, username text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_catalog AS $$
DECLARE v_id uuid; v_token uuid; v_name text;
BEGIN
  v_name := trim(p_username);
  IF v_name IS NULL OR char_length(v_name) < 3 OR char_length(v_name) > 20 THEN RAISE EXCEPTION 'invalid_username'; END IF;
  IF p_password IS NULL OR char_length(p_password) < 4 THEN RAISE EXCEPTION 'invalid_password'; END IF;
  INSERT INTO public.accounts(username, username_lower, password_hash, last_ip)
    VALUES (v_name, lower(v_name), extensions.crypt(p_password, extensions.gen_salt('bf')), p_ip)
    RETURNING id INTO v_id;
  INSERT INTO public.account_sessions(account_id, ip) VALUES (v_id, p_ip) RETURNING account_sessions.token INTO v_token;
  RETURN QUERY SELECT v_token, v_id, v_name;
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'username_taken';
END; $$;

CREATE OR REPLACE FUNCTION game_internal.account_login(p_username text, p_password text, p_ip text)
RETURNS TABLE(token uuid, account_id uuid, username text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_catalog AS $$
DECLARE v_id uuid; v_name text; v_hash text; v_token uuid;
BEGIN
  SELECT id, username, password_hash INTO v_id, v_name, v_hash
    FROM public.accounts WHERE username_lower = lower(trim(p_username));
  IF v_id IS NULL THEN RAISE EXCEPTION 'invalid_credentials'; END IF;
  IF v_hash <> extensions.crypt(p_password, v_hash) THEN RAISE EXCEPTION 'invalid_credentials'; END IF;
  UPDATE public.accounts SET last_ip = p_ip WHERE id = v_id;
  INSERT INTO public.account_sessions(account_id, ip) VALUES (v_id, p_ip) RETURNING account_sessions.token INTO v_token;
  RETURN QUERY SELECT v_token, v_id, v_name;
END; $$;

CREATE OR REPLACE FUNCTION game_internal.account_login_by_ip(p_ip text)
RETURNS TABLE(token uuid, account_id uuid, username text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE v_id uuid; v_name text; v_token uuid; v_count int;
BEGIN
  IF p_ip IS NULL OR char_length(p_ip) < 3 THEN RETURN; END IF;
  SELECT count(*) INTO v_count FROM public.accounts WHERE last_ip = p_ip;
  IF v_count <> 1 THEN RETURN; END IF;
  SELECT id, username INTO v_id, v_name FROM public.accounts WHERE last_ip = p_ip;
  INSERT INTO public.account_sessions(account_id, ip) VALUES (v_id, p_ip) RETURNING account_sessions.token INTO v_token;
  RETURN QUERY SELECT v_token, v_id, v_name;
END; $$;

CREATE OR REPLACE FUNCTION game_internal.account_from_token(p_token uuid)
RETURNS TABLE(account_id uuid, username text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
  SELECT a.id, a.username FROM public.account_sessions s
  JOIN public.accounts a ON a.id = s.account_id
  WHERE s.token = p_token;
$$;

CREATE OR REPLACE FUNCTION game_internal.account_logout(p_token uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
  DELETE FROM public.account_sessions WHERE token = p_token;
$$;

CREATE OR REPLACE FUNCTION game_internal.friend_request(p_token uuid, p_target_username text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE v_me uuid; v_target uuid;
BEGIN
  SELECT account_id INTO v_me FROM game_internal.account_from_token(p_token);
  IF v_me IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT id INTO v_target FROM public.accounts WHERE username_lower = lower(trim(p_target_username));
  IF v_target IS NULL THEN RAISE EXCEPTION 'user_not_found'; END IF;
  IF v_target = v_me THEN RAISE EXCEPTION 'cannot_add_self'; END IF;
  UPDATE public.friendships SET status='accepted'
    WHERE requester_id = v_target AND addressee_id = v_me AND status='pending';
  IF FOUND THEN RETURN; END IF;
  INSERT INTO public.friendships(requester_id, addressee_id) VALUES (v_me, v_target)
    ON CONFLICT (requester_id, addressee_id) DO NOTHING;
END; $$;

CREATE OR REPLACE FUNCTION game_internal.friend_accept(p_token uuid, p_requester_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE v_me uuid;
BEGIN
  SELECT account_id INTO v_me FROM game_internal.account_from_token(p_token);
  IF v_me IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  UPDATE public.friendships SET status='accepted'
    WHERE addressee_id = v_me AND requester_id = p_requester_id AND status='pending';
END; $$;

CREATE OR REPLACE FUNCTION game_internal.friend_remove(p_token uuid, p_other_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE v_me uuid;
BEGIN
  SELECT account_id INTO v_me FROM game_internal.account_from_token(p_token);
  IF v_me IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  DELETE FROM public.friendships
    WHERE (requester_id = v_me AND addressee_id = p_other_id)
       OR (requester_id = p_other_id AND addressee_id = v_me);
END; $$;

CREATE OR REPLACE FUNCTION game_internal.friend_list(p_token uuid)
RETURNS TABLE(other_id uuid, username text, status text, direction text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE v_me uuid;
BEGIN
  SELECT account_id INTO v_me FROM game_internal.account_from_token(p_token);
  IF v_me IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  RETURN QUERY
    SELECT a.id, a.username, f.status,
      (CASE WHEN f.requester_id = v_me THEN 'outgoing' ELSE 'incoming' END)::text
    FROM public.friendships f
    JOIN public.accounts a ON a.id = (CASE WHEN f.requester_id = v_me THEN f.addressee_id ELSE f.requester_id END)
    WHERE f.requester_id = v_me OR f.addressee_id = v_me
    ORDER BY f.created_at DESC;
END; $$;

-- Public SECURITY INVOKER wrappers
CREATE OR REPLACE FUNCTION public.account_register(p_username text, p_password text, p_ip text)
RETURNS TABLE(token uuid, account_id uuid, username text) LANGUAGE sql SET search_path = public AS $$
  SELECT * FROM game_internal.account_register(p_username, p_password, p_ip);
$$;

CREATE OR REPLACE FUNCTION public.account_login(p_username text, p_password text, p_ip text)
RETURNS TABLE(token uuid, account_id uuid, username text) LANGUAGE sql SET search_path = public AS $$
  SELECT * FROM game_internal.account_login(p_username, p_password, p_ip);
$$;

CREATE OR REPLACE FUNCTION public.account_login_by_ip(p_ip text)
RETURNS TABLE(token uuid, account_id uuid, username text) LANGUAGE sql SET search_path = public AS $$
  SELECT * FROM game_internal.account_login_by_ip(p_ip);
$$;

CREATE OR REPLACE FUNCTION public.account_from_token(p_token uuid)
RETURNS TABLE(account_id uuid, username text) LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT * FROM game_internal.account_from_token(p_token);
$$;

CREATE OR REPLACE FUNCTION public.account_logout(p_token uuid)
RETURNS void LANGUAGE sql SET search_path = public AS $$
  SELECT game_internal.account_logout(p_token);
$$;

CREATE OR REPLACE FUNCTION public.friend_request(p_token uuid, p_target_username text)
RETURNS void LANGUAGE sql SET search_path = public AS $$
  SELECT game_internal.friend_request(p_token, p_target_username);
$$;

CREATE OR REPLACE FUNCTION public.friend_accept(p_token uuid, p_requester_id uuid)
RETURNS void LANGUAGE sql SET search_path = public AS $$
  SELECT game_internal.friend_accept(p_token, p_requester_id);
$$;

CREATE OR REPLACE FUNCTION public.friend_remove(p_token uuid, p_other_id uuid)
RETURNS void LANGUAGE sql SET search_path = public AS $$
  SELECT game_internal.friend_remove(p_token, p_other_id);
$$;

CREATE OR REPLACE FUNCTION public.friend_list(p_token uuid)
RETURNS TABLE(other_id uuid, username text, status text, direction text)
LANGUAGE sql SET search_path = public AS $$
  SELECT * FROM game_internal.friend_list(p_token);
$$;
