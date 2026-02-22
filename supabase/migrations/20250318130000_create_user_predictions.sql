-- Prediction accuracy (calibration level) per user. Replaces localStorage so it persists across sessions.
CREATE TABLE user_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  accuracy_score numeric NOT NULL DEFAULT 1,
  feedback_count integer NOT NULL DEFAULT 0,
  calibration_offset numeric NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE user_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own predictions"
  ON user_predictions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
