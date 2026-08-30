package com.kurage.api.repository;

import com.kurage.api.domain.PlayerStats;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PlayerStatsRepository extends JpaRepository<PlayerStats, UUID> {
    Optional<PlayerStats> findByUserId(UUID userId);

    @Query(
            value = "SELECT ps FROM PlayerStats ps JOIN FETCH ps.user WHERE ps.matchesPlayed > 0 ORDER BY ps.kurageElo DESC",
            countQuery = "SELECT COUNT(ps) FROM PlayerStats ps WHERE ps.matchesPlayed > 0"
    )
    Page<PlayerStats> findAllOrderByKurageEloDesc(Pageable pageable);

    @Query("SELECT ps FROM PlayerStats ps JOIN FETCH ps.user WHERE ps.matchesPlayed > 0 ORDER BY ps.kurageElo DESC")
    List<PlayerStats> findTopOrderByKurageEloDesc(Pageable pageable);

    @Query("SELECT COUNT(ps) + 1 FROM PlayerStats ps WHERE ps.matchesPlayed > 0 AND ps.kurageElo > :elo")
    Integer findLeaderboardPosition(Integer elo);
}
