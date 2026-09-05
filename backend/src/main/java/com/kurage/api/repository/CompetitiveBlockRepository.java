package com.kurage.api.repository;

import com.kurage.api.domain.CompetitiveBlock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CompetitiveBlockRepository extends JpaRepository<CompetitiveBlock, UUID> {

    /**
     * Janela deslizante: as últimas unidades de um jogador num modo. Forma
     * antiga decai porque sai da janela, não porque é apagada.
     */
    @Query(value = """
            SELECT b.* FROM competitive_blocks b
            WHERE b.user_id = :userId AND b.game_mode = :gameMode
            ORDER BY b.closed_at DESC
            LIMIT :window
            """, nativeQuery = true)
    List<CompetitiveBlock> findWindow(
            @Param("userId") UUID userId,
            @Param("gameMode") String gameMode,
            @Param("window") int window);

    long countByUserIdAndGameMode(UUID userId, String gameMode);
}
