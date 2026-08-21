package com.kurage.api.repository;

import com.kurage.api.domain.RankingSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RankingSnapshotRepository extends JpaRepository<RankingSnapshot, Long> {
    Optional<RankingSnapshot> findByUserIdAndSnapshotDate(UUID userId, LocalDate snapshotDate);

    List<RankingSnapshot> findBySnapshotDateOrderByPositionAsc(LocalDate snapshotDate);

    List<RankingSnapshot> findByUserIdOrderBySnapshotDateDesc(UUID userId);
}
