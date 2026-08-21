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

    @Query("SELECT ps FROM PlayerStats ps JOIN FETCH ps.user ORDER BY ps.kurageElo DESC")
    Page<PlayerStats> findAllOrderByKurageEloDesc(Pageable pageable);

    @Query("SELECT ps FROM PlayerStats ps JOIN FETCH ps.user ORDER BY ps.kurageElo DESC")
    List<PlayerStats> findTopOrderByKurageEloDesc(Pageable pageable);

    @Query("SELECT COUNT(ps) + 1 FROM PlayerStats ps WHERE ps.kurageElo > :elo")
    Integer findLeaderboardPosition(Integer elo);
}
