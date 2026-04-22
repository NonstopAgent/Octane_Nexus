-- Brief Memory & Feedback Loop
-- ==============================
-- Adds two tables that power the AI's persistent memory and learning:
--
-- 1. brief_suggestions: A log of every video idea the AI has ever suggested
--    to a creator. Used to:
--      a) Prevent the AI from suggesting the same idea twice
--      b) Track whether the creator actually filmed the idea (implicit feedback)
--      c) Score the AI's accuracy over time
--
-- 2. creator_brief_profile: A running summary of what works for each creator,
--    updated automatically by the feedback loop. Injected into every brief
--    prompt as the AI's "memory" of this specific creator.

-- -----------------------------------------------------------------------
-- Table: brief_suggestions
-- One row per video idea suggested in a daily brief.
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brief_suggestions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brief_id        UUID REFERENCES daily_briefs(id) ON DELETE SET NULL,
  brief_date      DATE NOT NULL,

  -- The idea that was suggested
  suggested_title TEXT NOT NULL,
  suggested_hook  TEXT,
  suggested_format TEXT,
  hook_type       TEXT,           -- from outlier detection (curiosity-gap, contrarian, etc.)
  source_channel  TEXT,           -- which competitor channel inspired this idea
  source_video_id TEXT,           -- the outlier video that inspired this idea

  -- Implicit feedback: did the creator actually film it?
  -- Populated by the feedback loop cron job
  filmed_video_id   TEXT,         -- YouTube video ID if we detected they filmed it
  filmed_video_title TEXT,
  filmed_view_count  BIGINT,
  filmed_at         TIMESTAMPTZ,

  -- Outcome scoring
  -- null = not yet checked, 1 = filmed and performed well, 0 = filmed and underperformed, -1 = ignored
  outcome         SMALLINT CHECK (outcome IN (-1, 0, 1)),
  outcome_checked_at TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brief_suggestions_user_id   ON brief_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_brief_suggestions_brief_date ON brief_suggestions(user_id, brief_date DESC);
CREATE INDEX IF NOT EXISTS idx_brief_suggestions_outcome   ON brief_suggestions(user_id, outcome);

ALTER TABLE brief_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own brief_suggestions"
  ON brief_suggestions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own brief_suggestions"
  ON brief_suggestions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own brief_suggestions"
  ON brief_suggestions FOR UPDATE
  USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------
-- Table: creator_brief_profile
-- One row per user. A running summary of what the AI has learned about
-- this creator from past briefs and feedback. Updated by the feedback loop.
-- Injected into every brief prompt as the AI's persistent memory.
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS creator_brief_profile (
  user_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- What formats and hook types have worked for this creator
  winning_hook_types    TEXT[] DEFAULT '{}',   -- e.g. ['contrarian', 'how-to']
  winning_formats       TEXT[] DEFAULT '{}',   -- e.g. ['talking head', 'list']
  ignored_hook_types    TEXT[] DEFAULT '{}',   -- ideas they consistently ignore
  ignored_formats       TEXT[] DEFAULT '{}',

  -- Titles of ideas they've already used (to prevent repetition)
  used_idea_titles      TEXT[] DEFAULT '{}',

  -- Compact text summary for AI prompt injection (updated by feedback loop)
  -- Example: "This creator responds best to contrarian hooks and talking-head
  -- format. They ignore list-style videos. Last 3 suggestions: [titles]."
  ai_memory_summary     TEXT DEFAULT '',

  -- Stats
  total_suggestions     INTEGER DEFAULT 0,
  total_filmed          INTEGER DEFAULT 0,
  total_ignored         INTEGER DEFAULT 0,
  accuracy_score        NUMERIC(4,2) DEFAULT 0, -- filmed / total_suggestions

  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE creator_brief_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own creator_brief_profile"
  ON creator_brief_profile FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own creator_brief_profile"
  ON creator_brief_profile FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can upsert profiles (used by feedback loop cron)
-- (Service role bypasses RLS by default, no policy needed)
