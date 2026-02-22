-- Finance disclaimer reminder (minimal scaffold for "not financial advice" guardrails)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS finance_disclaimer_enabled BOOLEAN NOT NULL DEFAULT true;
