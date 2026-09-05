package com.kurage.api.repository;

import com.kurage.api.domain.ProfileVisit;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface ProfileVisitRepository extends JpaRepository<ProfileVisit, Long> {
    
    @Query("SELECT pv FROM ProfileVisit pv JOIN FETCH pv.visitorUser WHERE pv.visitedUser.id = :visitedUserId ORDER BY pv.visitedAt DESC, pv.id DESC")
    List<ProfileVisit> findRecentVisitors(@Param("visitedUserId") UUID visitedUserId, Pageable pageable);

    boolean existsByVisitedUserIdAndVisitorUserIdAndVisitedAtGreaterThanEqual(
            UUID visitedUserId,
            UUID visitorUserId,
            Instant afterTime);

    long countByVisitedUserId(UUID visitedUserId);
}
