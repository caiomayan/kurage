package com.kurage.api.repository;

import com.kurage.api.domain.RoundEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface RoundEventRepository extends JpaRepository<RoundEvent, UUID> {

    Optional<RoundEvent> findByIdempotencyKey(UUID idempotencyKey);

    /** Maior sequência já aceita numa sessão, para detectar reordenação. */
    @Query("SELECT MAX(e.sequence) FROM RoundEvent e WHERE e.sessionId = :sessionId")
    Optional<Long> findHighestSequence(@Param("sessionId") UUID sessionId);
}
