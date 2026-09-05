package com.kurage.api.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

/**
 * O que um jogador fez em um round.
 *
 * <p>Só existe para quem tem conta vinculada. Um Steam não vinculado continua
 * visível no roster ao vivo, mas não gera estatística para ninguém — a mesma
 * regra que vale para horas jogadas.
 *
 * <p>{@code blockId} nulo significa que o round ainda está acumulando: é ele que
 * separa o que já foi absorvido por uma unidade fechada do que ainda conta para
 * a próxima.
 */
@Entity
@Table(name = "round_participations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoundParticipation {

    @EmbeddedId
    private RoundParticipationId id;

    @Column(name = "side", nullable = false, length = 4)
    private String side;

    @Column(name = "kills", nullable = false)
    private int kills;

    @Column(name = "deaths", nullable = false)
    private int deaths;

    @Column(name = "assists", nullable = false)
    private int assists;

    @Column(name = "damage", nullable = false)
    private int damage;

    @Column(name = "survived", nullable = false)
    private boolean survived;

    /** Necessário para o KAST: o T de trade. */
    @Column(name = "was_traded", nullable = false)
    private boolean wasTraded;

    @Column(name = "opening_kill", nullable = false)
    private boolean openingKill;

    @Column(name = "opening_death", nullable = false)
    private boolean openingDeath;

    /** Se o lado do jogador venceu o round. Entrada do ELO, não do Rating. */
    @Column(name = "won", nullable = false)
    private boolean won;

    @Column(name = "block_id")
    private UUID blockId;

    @Embeddable
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RoundParticipationId implements Serializable {

        @Column(name = "round_event_id", nullable = false)
        private UUID roundEventId;

        @Column(name = "user_id", nullable = false)
        private UUID userId;

        @Override
        public boolean equals(Object other) {
            if (this == other) return true;
            if (!(other instanceof RoundParticipationId that)) return false;
            return Objects.equals(roundEventId, that.roundEventId)
                    && Objects.equals(userId, that.userId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(roundEventId, userId);
        }
    }
}
