-- Plans catalog
CREATE TABLE IF NOT EXISTS t_p61243683_uzor_kontrol.plans (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  price_rub   integer NOT NULL,
  features    jsonb NOT NULL DEFAULT '[]',
  server_limit integer NOT NULL DEFAULT 1,
  active      boolean NOT NULL DEFAULT true
);

INSERT INTO t_p61243683_uzor_kontrol.plans (id, name, price_rub, features, server_limit) VALUES
  ('free',    'Free',    144, '["1 сервер","1 устройство","Скорость до 10 Мбит/с","Реклама"]', 1),
  ('premium', 'Premium', 199, '["Все серверы","2 устройства","Скорость до 100 Мбит/с","Без рекламы"]', 99),
  ('pro',     'Pro',     299, '["Все серверы","5 устройств","Максимальная скорость","Без рекламы","Приоритетная поддержка"]', 99)
ON CONFLICT (id) DO NOTHING;

-- Add unique constraint to subscriptions.user_id if not exists
ALTER TABLE t_p61243683_uzor_kontrol.subscriptions
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

-- Payments table
CREATE TABLE IF NOT EXISTS t_p61243683_uzor_kontrol.payments (
  id            uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES t_p61243683_uzor_kontrol.users(id),
  plan_id       text NOT NULL REFERENCES t_p61243683_uzor_kontrol.plans(id),
  amount_rub    integer NOT NULL,
  status        text NOT NULL DEFAULT 'pending',
  provider      text NOT NULL DEFAULT 'mock',
  provider_id   text,
  created_at    timestamp with time zone NOT NULL DEFAULT now(),
  paid_at       timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON t_p61243683_uzor_kontrol.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status  ON t_p61243683_uzor_kontrol.payments(status);
