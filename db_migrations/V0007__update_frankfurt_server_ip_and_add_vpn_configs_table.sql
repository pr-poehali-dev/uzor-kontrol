
UPDATE t_p61243683_uzor_kontrol.servers 
SET ip = '185.103.100.28' 
WHERE id = 'a383e9f8-a6a1-4c7b-b34f-5e206bb3e122';

CREATE TABLE t_p61243683_uzor_kontrol.vpn_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES t_p61243683_uzor_kontrol.users(id),
    server_id UUID NOT NULL REFERENCES t_p61243683_uzor_kontrol.servers(id),
    client_ip TEXT NOT NULL,
    public_key TEXT NOT NULL,
    config_text TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, server_id)
);

CREATE INDEX idx_vpn_configs_user ON t_p61243683_uzor_kontrol.vpn_configs(user_id);
CREATE INDEX idx_vpn_configs_server ON t_p61243683_uzor_kontrol.vpn_configs(server_id);
