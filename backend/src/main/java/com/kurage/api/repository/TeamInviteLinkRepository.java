package com.kurage.api.repository;

import com.kurage.api.domain.TeamInviteLink;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import jakarta.persistence.LockModeType;

@Repository
public interface TeamInviteLinkRepository extends JpaRepository<TeamInviteLink, UUID> {
    @EntityGraph(attributePaths = {"team", "createdBy"})
    Optional<TeamInviteLink> findByTokenAndIsActiveTrue(String token);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @EntityGraph(attributePaths = {"team", "createdBy"})
    @Query("SELECT l FROM TeamInviteLink l WHERE l.token = :token AND l.isActive = true")
    Optional<TeamInviteLink> findActiveByTokenWithLock(@Param("token") String token);

    @EntityGraph(attributePaths = {"team", "createdBy"})
    List<TeamInviteLink> findByTeamIdAndIsActiveTrue(UUID teamId);

    long countByTeamIdAndIsActiveTrueAndExpiresAtAfter(UUID teamId, Instant now);

    @Modifying
    @Query("DELETE FROM TeamInviteLink l WHERE (l.isActive = false AND l.createdAt < :cutoff) OR l.expiresAt < :cutoff")
    int deleteOldInviteLinks(@Param("cutoff") Instant cutoff);
}
