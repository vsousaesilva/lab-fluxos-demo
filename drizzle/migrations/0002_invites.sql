-- Tabela de convites pra restringir signup.
-- Sem invite válido, usuário não consegue criar conta.

CREATE TABLE IF NOT EXISTS invite (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  email TEXT,
  note TEXT,
  created_by TEXT REFERENCES "user"(id),
  used_by TEXT REFERENCES "user"(id),
  used_at INTEGER,
  revoked_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invite_code ON invite(code);
CREATE INDEX IF NOT EXISTS idx_invite_used_by ON invite(used_by);
