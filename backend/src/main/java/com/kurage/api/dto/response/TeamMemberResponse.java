package com.kurage.api.dto.response;

import com.kurage.api.domain.TeamMember;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

public record TeamMemberResponse(
        UUID id,
        UserResponse user,
        String teamRole,
        String teamFunction,
        String managementRole,
        Instant joinedAt
) implements Serializable {
    public static TeamMemberResponse create(TeamMember member) {
        if (member == null) return null;
        return new TeamMemberResponse(
                member.getId(),
                UserResponse.create(member.getUser()),
                member.getTeamRole() != null ? member.getTeamRole().name() : null,
                member.getTeamFunction() != null ? member.getTeamFunction().name() : null,
                member.getManagementRole() != null ? member.getManagementRole().name() : "MEMBER",
                member.getJoinedAt()
        );
    }
}
