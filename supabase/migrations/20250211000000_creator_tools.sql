-- Creator Tools table
CREATE TABLE IF NOT EXISTS creator_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  url TEXT,
  icon_url TEXT,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  is_trending BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE creator_tools ENABLE ROW LEVEL SECURITY;

-- Allow public read for creator_tools (tools are shared)
CREATE POLICY "Anyone can read creator_tools"
  ON creator_tools FOR SELECT
  USING (true);

-- Seed data
INSERT INTO creator_tools (name, description, url, icon_url, category, tags, is_trending) VALUES
  ('CapCut', 'Free video editor with templates and effects', 'https://www.capcut.com', NULL, 'editing', ARRAY['general'], false),
  ('Notion', 'All-in-one workspace for notes and project management', 'https://www.notion.so', NULL, 'productivity', ARRAY['general'], false),
  ('TradingView', 'Professional charting and analysis for traders', 'https://www.tradingview.com', NULL, 'analytics', ARRAY['finance'], false),
  ('OBS Studio', 'Open source streaming and recording software', 'https://obsproject.com', NULL, 'streaming', ARRAY['gaming'], true),
  ('ChatGPT', 'AI assistant for writing, research, and brainstorming', 'https://chat.openai.com', NULL, 'AI', ARRAY['general'], true);
