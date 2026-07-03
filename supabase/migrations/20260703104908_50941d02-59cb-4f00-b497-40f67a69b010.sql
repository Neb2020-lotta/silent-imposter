
CREATE TABLE public.moderation_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('ban','timeout')),
  reason text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.moderation_bans TO service_role;
-- no anon/authenticated grants: only edge function (service_role) accesses this table

ALTER TABLE public.moderation_bans ENABLE ROW LEVEL SECURITY;
-- intentionally no policies: table locked to non-service_role callers

CREATE INDEX moderation_bans_ip_idx ON public.moderation_bans(ip);
