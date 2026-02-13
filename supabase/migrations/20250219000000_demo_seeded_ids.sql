-- Track demo-seeded record IDs so reset can delete only demo data (for tables without a tag column).
CREATE TABLE IF NOT EXISTS public.demo_seeded_ids (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  PRIMARY KEY (user_id, table_name, record_id)
);

CREATE INDEX IF NOT EXISTS idx_demo_seeded_ids_user_id ON public.demo_seeded_ids(user_id);

ALTER TABLE public.demo_seeded_ids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own demo_seeded_ids"
  ON public.demo_seeded_ids FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
