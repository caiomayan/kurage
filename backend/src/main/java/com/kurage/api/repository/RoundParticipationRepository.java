package com.kurage.api.repository;

import com.kurage.api.domain.RoundParticipation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RoundParticipationRepository
        extends JpaRepository<RoundParticipation, RoundParticipation.RoundParticipationId> {

    /**
     * Rounds de um jogador que ainda não foram absorvidos por uma unidade, do
     * mais antigo para o mais novo — a ordem em que devem ser fechados.
     *
     * <p>O modo vem do evento, e não da participação, para que trocar de
     * servidor entre rounds não misture unidades de modos diferentes.
     */
    @Query(value = """
            SELECT p.* FROM round_participations p
            JOIN round_events e ON e.id = p.round_event_id
            WHERE p.user_id = :userId
              AND p.block_id IS NULL
              AND e.game_mode = :gameMode
            ORDER BY e.ended_at ASC, e.sequence ASC
            """, nativeQuery = true)
    List<RoundParticipation> findOpenRounds(
            @Param("userId") UUID userId, @Param("gameMode") String gameMode);

    @Query(value = """
            SELECT COUNT(*) FROM round_participations p
            JOIN round_events e ON e.id = p.round_event_id
            WHERE p.user_id = :userId
              AND p.block_id IS NULL
              AND e.game_mode = :gameMode
            """, nativeQuery = true)
    long countOpenRounds(@Param("userId") UUID userId, @Param("gameMode") String gameMode);

    /**
     * Marca os rounds como absorvidos por uma unidade.
     *
     * <p>A condição {@code block_id IS NULL} é o que impede dois fechamentos
     * concorrentes de contarem o mesmo round duas vezes: quem chegar depois
     * atualiza zero linhas e desiste.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = """
            UPDATE round_participations
            SET block_id = :blockId
            WHERE block_id IS NULL
              AND round_event_id IN (:roundEventIds)
              AND user_id = :userId
            """, nativeQuery = true)
    int assignToBlock(
            @Param("blockId") UUID blockId,
            @Param("userId") UUID userId,
            @Param("roundEventIds") List<UUID> roundEventIds);
}
