package com.kurage.api.repository;

import com.kurage.api.domain.PlayerStats;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PlayerStatsRepository extends JpaRepository<PlayerStats, UUID> {

    /**
     * Ordem total do ranking, do documento 19 §6: ELO, depois K/D, depois menos
     * horas jogadas. O {@code user_id} fecha a ordenação para que ela seja
     * determinística — sem ele, dois jogadores empatados nos três critérios
     * trocariam de posição entre leituras iguais, e o top 30 do Level S poderia
     * variar sem que nada tivesse mudado.
     *
     * <p>Consulta nativa porque o K/D precisa de {@code NULLIF} para não dividir
     * por zero, sem recorrer ao truque desonesto de tratar "sem mortes" como um
     * K/D igual à contagem de abates.
     */
    String RANKING_ORDER = """
            ORDER BY ps.kurage_elo DESC,
                     ((ps.kills::numeric) / NULLIF(ps.deaths, 0)) DESC NULLS LAST,
                     ps.playtime_seconds ASC,
                     ps.user_id ASC
            """;

    String CALIBRATED = "WHERE ps.matches_played >= 5";

    Optional<PlayerStats> findByUserId(UUID userId);

    @Query(
            value = "SELECT ps.* FROM player_stats ps " + CALIBRATED + " " + RANKING_ORDER,
            countQuery = "SELECT COUNT(*) FROM player_stats ps " + CALIBRATED,
            nativeQuery = true
    )
    Page<PlayerStats> findAllOrderByKurageEloDesc(Pageable pageable);

    @Query(
            value = "SELECT ps.* FROM player_stats ps " + CALIBRATED + " " + RANKING_ORDER + " LIMIT :limit",
            nativeQuery = true
    )
    List<PlayerStats> findTopOrderByKurageEloDesc(@Param("limit") int limit);

    @Query("SELECT COUNT(ps) + 1 FROM PlayerStats ps WHERE ps.matchesPlayed >= 5 AND ps.kurageElo > :elo")
    Integer findLeaderboardPosition(Integer elo);

    /**
     * Soma tempo observado sem ler antes de escrever.
     *
     * <p>Dois servidores podem enviar heartbeat ao mesmo tempo para o mesmo
     * jogador; um ciclo ler-somar-gravar perderia um dos incrementos. A soma
     * acontece no banco, então nenhuma atualização se perde.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(
            value = "UPDATE player_stats SET playtime_seconds = playtime_seconds + :seconds "
                    + "WHERE user_id = :userId",
            nativeQuery = true
    )
    int addPlaytimeSeconds(@Param("userId") UUID userId, @Param("seconds") long seconds);
}
