package com.kurage.api.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;

/**
 * O Level S que um jogador carregou em um dia.
 *
 * <p>O documento 19 §6 define o S como a distinção dos 30 primeiros do ranking
 * geral, e o proprietário decidiu que ele é recalculado uma vez por dia, à
 * meia-noite: quem estiver no topo elegível naquele instante mantém o S durante
 * todo o dia que começa, mesmo que o ELO mude no meio do dia.
 *
 * <p>Por isso o S é uma concessão registrada, e não uma projeção da posição
 * atual. Consultar "quem é S hoje" é ler as linhas de hoje; o histórico dos dias
 * anteriores permanece para auditoria.
 */
@Entity
@Table(name = "level_s_grants")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LevelSGrant {

    @EmbeddedId
    private LevelSGrantId id;

    @MapsId("userId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    /** Posição no top 30 daquele dia. Única dentro da data. */
    @Column(name = "position", nullable = false)
    private Integer position;

    @Column(name = "granted_at", nullable = false)
    private Instant grantedAt;

    /** Chave composta: uma concessão por jogador por dia. */
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @jakarta.persistence.Embeddable
    public static class LevelSGrantId implements Serializable {

        @Column(name = "snapshot_date", nullable = false)
        private LocalDate snapshotDate;

        @Column(name = "user_id", nullable = false)
        private UUID userId;

        @Override
        public boolean equals(Object other) {
            if (this == other) return true;
            if (!(other instanceof LevelSGrantId that)) return false;
            return Objects.equals(snapshotDate, that.snapshotDate)
                    && Objects.equals(userId, that.userId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(snapshotDate, userId);
        }
    }
}
