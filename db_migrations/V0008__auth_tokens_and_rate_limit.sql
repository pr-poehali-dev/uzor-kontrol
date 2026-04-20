CREATE TABLE IF NOT EXISTS t_p61243683_uzor_kontrol.password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES t_p61243683_uzor_kontrol.users(id),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prt_user ON t_p61243683_uzor_kontrol.password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_prt_expires ON t_p61243683_uzor_kontrol.password_reset_tokens(expires_at);

CREATE TABLE IF NOT EXISTS t_p61243683_uzor_kontrol.email_verification_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES t_p61243683_uzor_kontrol.users(id),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_evt_user ON t_p61243683_uzor_kontrol.email_verification_tokens(user_id);

ALTER TABLE t_p61243683_uzor_kontrol.users
  ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS t_p61243683_uzor_kontrol.auth_attempts (
  id bigserial PRIMARY KEY,
  ip_address text NOT NULL,
  email text NULL,
  action text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_auth_attempts_ip ON t_p61243683_uzor_kontrol.auth_attempts(ip_address, created_at);
CREATE INDEX IF NOT EXISTS idx_auth_attempts_email ON t_p61243683_uzor_kontrol.auth_attempts(email, created_at);

ALTER TABLE t_p61243683_uzor_kontrol.subscriptions
  ADD COLUMN IF NOT EXISTS expiry_notified_at timestamptz NULL;
