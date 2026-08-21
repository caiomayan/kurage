-- Seed default Kurage 5v5 Competitive Server
INSERT INTO game_servers (id, name, hostname, port, game_mode, current_map, current_players, max_players, is_online, created_at, updated_at)
VALUES (
    'b1a2c3d4-0000-0000-0000-000000000001',
    'Kurage #1 | 5v5 Competitivo (O Mar)',
    '127.0.0.1',
    27015,
    'COMPETITIVE_5V5',
    'de_dust2',
    0,
    10,
    false,
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;
