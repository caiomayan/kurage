package com.kurage.api.domain;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.domain.Persistable;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "player_stats", indexes = {
    @Index(name = "idx_player_stats_elo", columnList = "kurage_elo DESC")
})
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class PlayerStats extends Auditable implements Persistable<UUID> {

    public static final int CALIBRATION_MATCHES_REQUIRED = 5;

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private User user;

    @Builder.Default
    @Column(name = "kurage_elo", nullable = false)
    private Integer kurageElo = 200;

    @Builder.Default
    @Column(name = "kills", nullable = false)
    private Integer kills = 0;

    @Builder.Default
    @Column(name = "deaths", nullable = false)
    private Integer deaths = 0;

    @Builder.Default
    @Column(name = "assists", nullable = false)
    private Integer assists = 0;

    @Builder.Default
    @Column(name = "headshots", nullable = false)
    private Integer headshots = 0;

    @Builder.Default
    @Column(name = "rounds_played", nullable = false)
    private Integer roundsPlayed = 0;

    @Builder.Default
    @Column(name = "matches_played", nullable = false)
    private Integer matchesPlayed = 0;

    @Builder.Default
    @Column(name = "matches_won", nullable = false)
    private Integer matchesWon = 0;

    @Builder.Default
    @Column(name = "total_damage", nullable = false)
    private Long totalDamage = 0L;

    @Column(name = "last_match_at")
    private Instant lastMatchAt;

    /**
     * Tempo que a plataforma observou o jogador em servidores Kurage, em
     * segundos. É o terceiro critério de desempate do ranking, do menor para o
     * maior: entre dois jogadores com o mesmo ELO e o mesmo K/D, quem alcançou
     * aquilo em menos tempo fica na frente.
     *
     * <p>Só acumula a partir do deploy desta versão. Não é o histórico total do
     * jogador no CS2, é o tempo medido aqui.
     */
    @Builder.Default
    @Column(name = "playtime_seconds", nullable = false)
    private Long playtimeSeconds = 0L;

    public int getKurageLevel() {
        if (kurageElo == null || kurageElo < 0) return 1;
        if (kurageElo >= 900) return 10;
        return (kurageElo / 100) + 1;
    }

    public boolean isCalibrated() {
        return matchesPlayed != null && matchesPlayed >= CALIBRATION_MATCHES_REQUIRED;
    }

    /**
     * K/D como o ranking o entende: exige mortes reais no denominador.
     *
     * <p>Devolve {@code null} quando não há amostra. Tratar "sem mortes" como um
     * K/D igual à contagem bruta de abates publicaria um número que não é uma
     * razão.
     */
    public Double getKillDeathRatio() {
        if (kills == null || deaths == null || deaths <= 0) return null;
        return kills.doubleValue() / deaths.doubleValue();
    }

    @Override
    public UUID getId() {
        return userId;
    }

    @Override
    public boolean isNew() {
        return super.getCreatedAt() == null;
    }
}
