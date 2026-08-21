package com.kurage.api.repository;

import com.kurage.api.domain.ProfileVisit;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProfileVisitRepository extends JpaRepository<ProfileVisit, Long> {
    
    @Query("SELECT pv FROM ProfileVisit pv JOIN FETCH pv.visitorUser WHERE pv.visitedUser.id = :visitedUserId ORDER BY pv.visitedAt DESC")
    List<ProfileVisit> findRecentVisitors(@Param("visitedUserId") UUID visitedUserId, Pageable pageable);

    @Query("SELECT pv FROM ProfileVisit pv WHERE pv.visitedUser.id = :visitedUserId AND pv.visitorUser.id = :visitorUserId AND pv.visitedAt >= :afterTime")
    Optional<ProfileVisit> findRecentVisitByUser(
            @Param("visitedUserId") UUID visitedUserId,
            @Param("visitorUserId") UUID visitorUserId,
            @Param("afterTime") Instant afterTime
    );

    long countByVisitedUserId(UUID visitedUserId);
}
