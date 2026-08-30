ALTER TABLE users
    ADD COLUMN account_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN suspended_at TIMESTAMPTZ,
    ADD COLUMN suspension_reason VARCHAR(500),
    ADD CONSTRAINT chk_users_account_status
        CHECK (account_status IN ('ACTIVE', 'SUSPENDED')),
    ADD CONSTRAINT chk_users_suspension_state
        CHECK (
            (account_status = 'ACTIVE' AND suspended_at IS NULL AND suspension_reason IS NULL)
            OR
            (account_status = 'SUSPENDED' AND suspended_at IS NOT NULL)
        );

CREATE INDEX idx_users_account_status ON users (account_status);

-- Store only a digest. The plaintext credential remains exclusively in the
-- API/server process secrets and can be rotated independently per server.
ALTER TABLE game_servers
    ADD COLUMN api_key_hash VARCHAR(64),
    ADD CONSTRAINT chk_game_servers_api_key_hash
        CHECK (api_key_hash IS NULL OR api_key_hash ~ '^[0-9a-f]{64}$');
