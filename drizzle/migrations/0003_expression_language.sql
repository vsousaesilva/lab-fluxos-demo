-- Catálogo de Expression Languages (EL) usadas nos fluxos jPDL/BPMN do PJe.
-- Formato típico: #{home.parametro} ou ${tarefaService.executar()}.
-- Cresce sob demanda (cadastro manual ou extração automática a partir dos XMLs).

CREATE TABLE IF NOT EXISTS expression_language (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  objective TEXT,
  category TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'ATIVO',
  occurrence_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by TEXT,
  updated_by TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_expression_language_code
  ON expression_language(code);
CREATE INDEX IF NOT EXISTS idx_expression_language_category
  ON expression_language(category);
CREATE INDEX IF NOT EXISTS idx_expression_language_status
  ON expression_language(status);

-- Junção EL ↔ FlowSource: em que XMLs cada EL aparece e quantas vezes.
CREATE TABLE IF NOT EXISTS expression_language_occurrence (
  id TEXT PRIMARY KEY,
  expression_language_id TEXT NOT NULL
    REFERENCES expression_language(id) ON DELETE CASCADE,
  flow_source_id TEXT NOT NULL
    REFERENCES flow_source(id) ON DELETE CASCADE,
  count INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_el_flow
  ON expression_language_occurrence(expression_language_id, flow_source_id);
CREATE INDEX IF NOT EXISTS idx_el_occ_el
  ON expression_language_occurrence(expression_language_id);
CREATE INDEX IF NOT EXISTS idx_el_occ_flow
  ON expression_language_occurrence(flow_source_id);
