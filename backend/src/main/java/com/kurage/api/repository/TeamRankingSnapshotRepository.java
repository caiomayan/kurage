package com.kurage.api.repository;

import com.kurage.api.domain.TeamRankingSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TeamRankingSnapshotRepository extends JpaRepository<TeamRankingSnapshot, Long> {
    Optional<TeamRankingSnapshot> findByTeamIdAndSnapshotDate(UUID teamId, LocalDate snapshotDate);

    List<TeamRankingSnapshot> findBySnapshotDateOrderByPositionAsc(LocalDate snapshotDate);

    List<TeamRankingSnapshot> findByTeamIdOrderBySnapshotDateDesc(UUID teamId);
}
