package com.kurage.api.repository;

import com.kurage.api.domain.InvitationStatus;
import com.kurage.api.domain.TeamInvitation;
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
public interface TeamInvitationRepository extends JpaRepository<TeamInvitation, UUID> {
    boolean existsByTeamIdAndInvitedUserIdAndStatus(UUID teamId, UUID invitedUserId, InvitationStatus status);

    Optional<TeamInvitation> findByTeamIdAndInvitedUserIdAndStatus(UUID teamId, UUID invitedUserId, InvitationStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @EntityGraph(attributePaths = {"team", "inviter", "invitedUser"})
    @Query("SELECT i FROM TeamInvitation i WHERE i.id = :id")
    Optional<TeamInvitation> findByIdWithLock(@Param("id") UUID id);
    
    @EntityGraph(attributePaths = {"team", "team.owner", "team.members", "team.members.user", "inviter", "invitedUser"})
    List<TeamInvitation> findByInvitedUserIdAndStatus(UUID invitedUserId, InvitationStatus status);
    
    @EntityGraph(attributePaths = {"team", "team.owner", "team.members", "team.members.user", "inviter", "invitedUser"})
    List<TeamInvitation> findByTeamIdAndStatus(UUID teamId, InvitationStatus status);

    @Modifying
    @Query("UPDATE TeamInvitation i SET i.status = :newStatus, i.updatedAt = :now WHERE i.status = :targetStatus AND i.createdAt < :cutoff")
    int expirePendingInvitations(@Param("cutoff") Instant cutoff, @Param("now") Instant now, @Param("newStatus") InvitationStatus newStatus, @Param("targetStatus") InvitationStatus targetStatus);

    @Modifying
    @Query("DELETE FROM TeamInvitation i WHERE i.status IN :statuses AND (i.updatedAt < :cutoff OR (i.updatedAt IS NULL AND i.createdAt < :cutoff))")
    int deleteOldInvitations(@Param("cutoff") Instant cutoff, @Param("statuses") Collection<InvitationStatus> statuses);
}
