-- Kurage ID Distributed Generator with Atomic Row-Locking & Random Gaps
CREATE TABLE IF NOT EXISTS kurage_id_generator (
    id INT PRIMARY KEY,
    current_id BIGINT NOT NULL
);

-- Inicializa a sequence base com o maior ID existente ou 1000
INSERT INTO kurage_id_generator (id, current_id)
SELECT 1, COALESCE(MAX(kurage_id), 1000) FROM users
ON CONFLICT (id) DO NOTHING;

-- Função ACID transacional que garante monotonicidade e gaps não colidentes em múltiplos nós
CREATE OR REPLACE FUNCTION generate_next_kurage_id() RETURNS BIGINT AS $$
DECLARE
    v_gap INT;
    v_next BIGINT;
BEGIN
    -- Gap randômico entre 7 e 19
    v_gap := floor(random() * (19 - 7 + 1) + 7)::INT;
    
    UPDATE kurage_id_generator
    SET current_id = current_id + v_gap
    WHERE id = 1
    RETURNING current_id INTO v_next;
    
    RETURN v_next;
END;
$$ LANGUAGE plpgsql;
