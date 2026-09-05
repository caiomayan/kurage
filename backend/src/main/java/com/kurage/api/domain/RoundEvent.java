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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/**
 * Um round exatamente como o servidor o relatou.
 *
 * <p>Imutável e guardado com o corpo original em {@code payload}, porque o
 * documento 20 §8 exige poder reprocessar o histórico sob uma versão nova do
 * algoritmo. Corrigir uma fórmula não é editar valores já calculados: é
 * recalcular a partir do que realmente aconteceu, preservando as linhas antigas
 * para auditoria e disputa.
 */
@Entity
@Table(name = "round_events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoundEvent {

    @Id
    @Column(name = "id")
    private UUID id;

    /**
     * Chave que torna o reenvio seguro. Um plugin que perdeu a resposta reenvia
     * o mesmo round, e a segunda vez não pode contar de novo.
     */
    @Column(name = "idempotency_key", nullable = false, unique = true)
    private UUID idempotencyKey;

    @Column(name = "server_id", nullable = false)
    private UUID serverId;

    @Column(name = "session_id", nullable = false)
    private UUID sessionId;

    @Column(name = "sequence", nullable = false)
    private Long sequence;

    @Column(name = "game_mode", nullable = false, length = 20)
    private String gameMode;

    @Column(name = "map", length = 50)
    private String map;

    @Column(name = "winning_side", length = 4)
    private String winningSide;

    @Column(name = "ended_at", nullable = false)
    private Instant endedAt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload", nullable = false, columnDefinition = "jsonb")
    private String payload;

    @Column(name = "received_at", nullable = false)
    private Instant receivedAt;
}
