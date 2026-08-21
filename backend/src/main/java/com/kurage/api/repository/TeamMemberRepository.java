package com.kurage.api.repository;

import com.kurage.api.domain.ManagementRole;
import com.kurage.api.domain.TeamMember;
import com.kurage.api.domain.TeamRole;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TeamMemberRepository extends JpaRepository<TeamMember, UUID> {
    boolean existsByTeamIdAndUserId(UUID teamId, UUID userId);
    int countByTeamIdAndTeamRole(UUID teamId, TeamRole teamRole);

    @EntityGraph(attributePaths = {"user", "team"})
    List<TeamMember> findByTeamId(UUID teamId);

    @EntityGraph(attributePaths = {"user", "team"})
    Optional<TeamMember> findByTeamIdAndUserId(UUID teamId, UUID userId);

    @EntityGraph(attributePaths = {"user", "team"})
    List<TeamMember> findByTeamIdAndManagementRoleIn(UUID teamId, Collection<ManagementRole> managementRoles);
}
