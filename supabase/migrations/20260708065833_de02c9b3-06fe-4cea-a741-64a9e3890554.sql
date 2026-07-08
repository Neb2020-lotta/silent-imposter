
CREATE OR REPLACE FUNCTION game_internal.admin_list_accounts()
RETURNS TABLE(id uuid, username text, last_ip text, created_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, username, last_ip, created_at FROM public.accounts ORDER BY created_at DESC LIMIT 1000;
$$;

CREATE OR REPLACE FUNCTION game_internal.admin_rename_account(p_account_id uuid, p_new_username text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text;
BEGIN
  v_name := btrim(p_new_username);
  IF v_name IS NULL OR length(v_name) < 2 OR length(v_name) > 24 THEN RAISE EXCEPTION 'invalid_username'; END IF;
  IF EXISTS (SELECT 1 FROM public.accounts WHERE username_lower = lower(v_name) AND id <> p_account_id) THEN
    RAISE EXCEPTION 'username_taken';
  END IF;
  UPDATE public.accounts SET username = v_name, username_lower = lower(v_name) WHERE id = p_account_id;
END;
$$;

CREATE OR REPLACE FUNCTION game_internal.admin_set_password(p_account_id uuid, p_new_password text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_new_password IS NULL OR length(p_new_password) < 4 THEN RAISE EXCEPTION 'invalid_password'; END IF;
  UPDATE public.accounts SET password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf')) WHERE id = p_account_id;
  DELETE FROM public.account_sessions WHERE account_id = p_account_id;
END;
$$;

CREATE OR REPLACE FUNCTION game_internal.admin_delete_account(p_account_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.accounts WHERE id = p_account_id;
$$;

REVOKE ALL ON FUNCTION game_internal.admin_list_accounts() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION game_internal.admin_rename_account(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION game_internal.admin_set_password(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION game_internal.admin_delete_account(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION game_internal.admin_list_accounts() TO service_role;
GRANT EXECUTE ON FUNCTION game_internal.admin_rename_account(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION game_internal.admin_set_password(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION game_internal.admin_delete_account(uuid) TO service_role;
GRANT USAGE ON SCHEMA game_internal TO service_role;
