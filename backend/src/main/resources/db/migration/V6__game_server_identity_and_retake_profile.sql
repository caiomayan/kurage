ALTER TABLE game_servers
    ADD COLUMN server_kind VARCHAR(20) NOT NULL DEFAULT 'FIXED';

ALTER TABLE game_servers
    ADD CONSTRAINT chk_game_servers_kind
        CHECK (server_kind IN ('FIXED', 'EPHEMERAL'));

ALTER TABLE game_servers
    ADD CONSTRAINT uk_game_servers_endpoint UNIQUE (hostname, port);

UPDATE game_servers
SET name = 'Kurage Retake #1',
    game_mode = 'RETAKE',
    current_map = 'de_mirage',
    max_players = 10,
    server_kind = 'FIXED',
    updated_at = NOW()
WHERE id = 'b1a2c3d4-0000-0000-0000-000000000001';
