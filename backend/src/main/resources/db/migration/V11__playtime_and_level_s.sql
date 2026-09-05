-- Horas jogadas e concessão diária de Level S.
--
-- Duas decisões de produto registradas no documento 19 chegam aqui:
--   * o desempate do ranking é ELO -> K/D -> menos horas jogadas, o que exige
--     persistir o tempo jogado na plataforma;
--   * o Level S é recalculado uma vez por dia, à meia-noite, e vale para o dia
--     inteiro que começa. Ele nunca é derivado em tempo real da posição atual.

-- Tempo medido pela plataforma, em segundos.
--
-- Começa em zero para toda conta existente e só acumula a partir do deploy:
-- é o tempo que a Kurage observou, não o histórico total do jogador. Segundos,
-- e não horas, para que o acúmulo por heartbeat não perca precisão.
ALTER TABLE player_stats
    ADD COLUMN playtime_seconds BIGINT NOT NULL DEFAULT 0;

ALTER TABLE player_stats
    ADD CONSTRAINT chk_player_stats_playtime_non_negative
        CHECK (playtime_seconds >= 0);

-- Índice de ordenação do ranking.
--
-- Cobre a ordem total usada pelo leaderboard e pela concessão de S. A expressão
-- de K/D usa NULLIF para não dividir por zero; um jogador calibrado sem nenhuma
-- morte é improvável, mas a consulta não pode quebrar por causa disso.
CREATE INDEX idx_player_stats_ranking_order
    ON player_stats (
        kurage_elo DESC,
        ((kills::numeric) / NULLIF(deaths, 0)) DESC NULLS LAST,
        playtime_seconds ASC,
        user_id ASC
    )
    WHERE matches_played >= 5;

-- Concessões de Level S, uma linha por jogador por dia.
--
-- A tabela é o registro de quem carregou o S naquele dia, e não uma projeção do
-- ranking atual: consultar "quem é S hoje" é ler a data de hoje. A chave
-- primária composta torna o job idempotente e impede duas concessões para o
-- mesmo jogador na mesma data.
CREATE TABLE level_s_grants (
    snapshot_date DATE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    position INT NOT NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (snapshot_date, user_id),
    CONSTRAINT chk_level_s_position CHECK (position BETWEEN 1 AND 30)
);

-- A posição também é única dentro do dia: duas pessoas não podem ocupar a mesma
-- vaga do top 30, o que só é garantido porque a ordenação é determinística.
CREATE UNIQUE INDEX idx_level_s_grants_date_position
    ON level_s_grants (snapshot_date, position);

CREATE INDEX idx_level_s_grants_user
    ON level_s_grants (user_id, snapshot_date DESC);
