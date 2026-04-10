ALTER TABLE t_p61243683_uzor_kontrol.users ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS t_p61243683_uzor_kontrol.admin_sessions (
  id          uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES t_p61243683_uzor_kontrol.users(id),
  token_hash  text NOT NULL UNIQUE,
  ip_address  text,
  created_at  timestamp with time zone NOT NULL DEFAULT now(),
  expires_at  timestamp with time zone NOT NULL DEFAULT (now() + interval '24 hours'),
  revoked     boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_token_hash ON t_p61243683_uzor_kontrol.admin_sessions(token_hash);
