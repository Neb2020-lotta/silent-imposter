ALTER TABLE public.messages
  ADD CONSTRAINT messages_kind_check CHECK (kind IN ('chat', 'hint', 'system'));

DROP POLICY IF EXISTS messages_insert_all ON public.messages;

CREATE POLICY "messages_insert_non_system"
  ON public.messages
  FOR INSERT
  TO public
  WITH CHECK (kind IN ('chat', 'hint'));