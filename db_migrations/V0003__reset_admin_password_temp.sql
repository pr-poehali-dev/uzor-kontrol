-- Reset admin password to "Admin1234!"
-- Hash: pbkdf2:sha256:260000 for password "Admin1234!" with fixed salt
UPDATE t_p61243683_uzor_kontrol.users 
SET password_hash = 'pbkdf2:sha256:260000:a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6:kHMHPTFqF3r4wJdX9vNmL2oQZsYeUiOpRtBnMkLwVxA='
WHERE is_admin = true;
