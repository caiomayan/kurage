package com.kurage.api.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Uma unidade competitiva fechada: 20 rounds de retake, uma partida de 5v5 ou
 * uma sessão de deathmatch.
 *
 * <p>É a unidade que a calibração conta — cinco delas concluem a triagem — e a
 * que a janela deslizante do Rating percorre.
 *
 * <p>Cada linha guarda a versão do algoritmo que a produziu e as entradas do
 * movimento de ELO. Isso é o que permite explicar ao jogador por que o número
 * dele mudou, e recalcular sob uma versão nova sem apagar o histórico.
 */
@Entity
@Table(name = "competitive_blocks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompetitiveBlock {

    @Id
    @Column(name = "id")
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "game_mode", nullable = false, length = 20)
    private String gameMode;

    @Column(name = "rounds", nullable = false)
    private int rounds;

    @Column(name = "closed_at", nullable = false)
    private Instant closedAt;

    @Column(name = "algorithm_version", nullable = false, length = 64)
    private String algorithmVersion;

    /** Contribuição medida nesta unidade. */
    @Column(name = "rating", nullable = false, precision = 6, scale = 3)
    private BigDecimal rating;

    /** Sucesso obtido nesta unidade, entre 0 e 1. */
    @Column(name = "score", nullable = false, precision = 6, scale = 4)
    private BigDecimal score;

    /** Sucesso que o ELO previa contra aquele adversário. */
    @Column(name = "expected_score", nullable = false, precision = 6, scale = 4)
    private BigDecimal expectedScore;

    @Column(name = "opponent_elo", nullable = false, precision = 7, scale = 2)
    private BigDecimal opponentElo;

    @Column(name = "elo_before", nullable = false)
    private int eloBefore;

    @Column(name = "elo_after", nullable = false)
    private int eloAfter;
}
