-- Seed admin user with pbkdf2:sha256 password hash for "Admin1234!"
-- Hash generated: pbkdf2:sha256:260000:nextvpnadminsalt2024:base64hash
INSERT INTO t_p61243683_uzor_kontrol.users (email, name, password_hash, is_admin)
SELECT 
  'admin@nextvpn.io',
  'Administrator',
  'pbkdf2:sha256:260000:nextvpnadminsalt2024:+kOGAX3zOiTPbGClRHI+gKuL7xLlFpT9MImHQpfHxnU=',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM t_p61243683_uzor_kontrol.users WHERE is_admin = true
);
