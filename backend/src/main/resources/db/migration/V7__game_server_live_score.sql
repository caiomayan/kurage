ALTER TABLE game_servers
    ADD COLUMN ct_score INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN tr_score INTEGER NOT NULL DEFAULT 0;

ALTER TABLE game_servers
    ADD CONSTRAINT chk_game_servers_ct_score_non_negative CHECK (ct_score >= 0),
    ADD CONSTRAINT chk_game_servers_tr_score_non_negative CHECK (tr_score >= 0);
