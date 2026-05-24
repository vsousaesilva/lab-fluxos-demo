-- Anexos de demanda: imagens, PDFs, texto e Office.
-- Armazenados no bucket R2 DEMAND_ATTACHMENTS.
-- Consumidos pelo Demand Analyst via Gemini multimodal.

CREATE TABLE IF NOT EXISTS demand_attachment (
  id TEXT PRIMARY KEY,
  demand_id TEXT NOT NULL
    REFERENCES demand(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by TEXT,
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_demand_attachment_demand
  ON demand_attachment(demand_id);
