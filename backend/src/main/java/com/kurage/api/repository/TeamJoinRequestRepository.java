package com.kurage.api.repository;

import com.kurage.api.domain.JoinRequestStatus;
import com.kurage.api.domain.TeamJoinRequest;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import jakarta.persistence.LockModeType;

@Repository
public interface TeamJoinRequestRepository extends JpaRepository<TeamJoinRequest, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @EntityGraph(attributePaths = {"team", "requester", "reviewedBy"})
    @Query("SELECT r FROM TeamJoinRequest r WHERE r.id = :id")
    Optional<TeamJoinRequest> findByIdWithLock(@Param("id") UUID id);

    @EntityGraph(attributePaths = {"team", "requester", "reviewedBy"})
    List<TeamJoinRequest> findByTeamIdAndStatus(UUID teamId, JoinRequestStatus status);

    @EntityGraph(attributePaths = {"team", "requester", "reviewedBy"})
    List<TeamJoinRequest> findByRequesterIdAndStatus(UUID requesterId, JoinRequestStatus status);

    @EntityGraph(attributePaths = {"team", "requester", "reviewedBy"})
    Optional<TeamJoinRequest> findByTeamIdAndRequesterIdAndStatus(UUID teamId, UUID requesterId, JoinRequestStatus status);

    boolean existsByTeamIdAndRequesterIdAndStatus(UUID teamId, UUID requesterId, JoinRequestStatus status);

    @Modifying
    @Query("DELETE FROM TeamJoinRequest r WHERE r.status IN :statuses AND (r.updatedAt < :cutoff OR (r.updatedAt IS NULL AND r.createdAt < :cutoff))")
    int deleteOldJoinRequests(@Param("cutoff") Instant cutoff, @Param("statuses") Collection<JoinRequestStatus> statuses);
}
