-- Clip It (Safe Mode): attestation and risk ledger
CREATE TABLE IF NOT EXISTS rights_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  source_url TEXT NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  risk_reasons JSONB DEFAULT '[]'::jsonb,
  target_platform TEXT,
  action_taken TEXT NOT NULL CHECK (action_taken IN ('clip', 'remake')),
  attestation_accepted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rights_ledger_user_id ON rights_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_rights_ledger_created_at ON rights_ledger(created_at);

COMMENT ON TABLE rights_ledger IS 'Clip It safety: risk level, reasons, and action taken for audit';
