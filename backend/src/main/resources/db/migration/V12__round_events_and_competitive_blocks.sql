-- Ingestão de rounds e unidades competitivas fechadas.
--
-- Sem estas tabelas nada do modelo competitivo funciona: o heartbeat não carrega
-- participação por round, então `matches_played` nunca incrementa e a calibração
-- jamais completa. O documento 20 §2 registra isso como o bloqueio de origem.

-- Evento cru, imutável, exatamente como o servidor enviou.
--
-- O corpo completo fica em `payload` porque o documento 20 §8 exige poder
-- reprocessar o histórico sob uma versão nova do algoritmo. Corrigir uma fórmula
-- não pode ser editar valores já calculados: é recalcular a partir do que
-- realmente aconteceu.
CREATE TABLE round_events (
    id UUID PRIMARY KEY,
    -- Torna o reenvio seguro. Um plugin que perdeu a resposta reenvia o mesmo
    -- round, e a segunda vez não pode contar de novo.
    idempotency_key UUID NOT NULL UNIQUE,
    server_id UUID NOT NULL REFERENCES game_servers(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    sequence BIGINT NOT NULL,
    game_mode VARCHAR(20) NOT NULL,
    map VARCHAR(50),
    winning_side VARCHAR(4),
    ended_at TIMESTAMPTZ NOT NULL,
    payload JSONB NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Dois rounds não podem ocupar a mesma posição na mesma sessão.
    CONSTRAINT uq_round_events_session_sequence UNIQUE (session_id, sequence)
);

CREATE INDEX idx_round_events_server_ended ON round_events (server_id, ended_at DESC);

-- Participação de um jogador em um round.
--
-- Só existe para quem tem conta vinculada: um Steam não vinculado aparece no
-- roster ao vivo, mas não gera estatística para ninguém.
CREATE TABLE round_participations (
    round_event_id UUID NOT NULL REFERENCES round_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    side VARCHAR(4) NOT NULL,
    kills INT NOT NULL DEFAULT 0,
    deaths INT NOT NULL DEFAULT 0,
    assists INT NOT NULL DEFAULT 0,
    damage INT NOT NULL DEFAULT 0,
    survived BOOLEAN NOT NULL DEFAULT FALSE,
    was_traded BOOLEAN NOT NULL DEFAULT FALSE,
    opening_kill BOOLEAN NOT NULL DEFAULT FALSE,
    opening_death BOOLEAN NOT NULL DEFAULT FALSE,
    won BOOLEAN NOT NULL DEFAULT FALSE,
    -- Nulo enquanto o round ainda não foi absorvido por uma unidade fechada.
    -- É esse campo que separa o que já contou do que está acumulando.
    block_id UUID,
    PRIMARY KEY (round_event_id, user_id)
);

-- Consulta quente: rounds ainda não fechados de um jogador num modo.
CREATE INDEX idx_round_participations_open
    ON round_participations (user_id, block_id)
    WHERE block_id IS NULL;

-- Unidade competitiva fechada: 20 rounds de retake, uma partida de 5v5 ou uma
-- sessão de deathmatch.
--
-- Cada linha guarda a versão do algoritmo que a produziu, o Rating daquela
-- unidade e o movimento de ELO com suas entradas. Isso é o que permite explicar
-- para o jogador por que o número dele mudou, e recalcular sem apagar histórico.
CREATE TABLE competitive_blocks (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_mode VARCHAR(20) NOT NULL,
    rounds INT NOT NULL,
    closed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    algorithm_version VARCHAR(64) NOT NULL,
    rating NUMERIC(6, 3) NOT NULL,
    score NUMERIC(6, 4) NOT NULL,
    expected_score NUMERIC(6, 4) NOT NULL,
    opponent_elo NUMERIC(7, 2) NOT NULL,
    elo_before INT NOT NULL,
    elo_after INT NOT NULL,
    CONSTRAINT chk_competitive_blocks_rounds CHECK (rounds > 0),
    CONSTRAINT chk_competitive_blocks_score CHECK (score BETWEEN 0 AND 1)
);

-- A janela deslizante lê as últimas unidades de um jogador em um modo.
CREATE INDEX idx_competitive_blocks_window
    ON competitive_blocks (user_id, game_mode, closed_at DESC);

ALTER TABLE round_participations
    ADD CONSTRAINT fk_round_participations_block
        FOREIGN KEY (block_id) REFERENCES competitive_blocks(id) ON DELETE SET NULL;
