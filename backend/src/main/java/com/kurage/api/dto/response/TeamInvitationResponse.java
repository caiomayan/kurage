package com.kurage.api.dto.response;

import com.kurage.api.domain.TeamInvitation;

import java.time.Instant;
import java.util.UUID;

public record TeamInvitationResponse(
        UUID id,
        TeamResponse team,
        UserResponse inviter,
        String targetRole,
        String status,
        Instant createdAt
) {
    public static TeamInvitationResponse create(TeamInvitation invitation) {
        return new TeamInvitationResponse(
                invitation.getId(),
                TeamResponse.create(invitation.getTeam()),
                UserResponse.create(invitation.getInviter()),
                invitation.getTargetRole().name(),
                invitation.getStatus().name(),
                invitation.getCreatedAt()
        );
    }
}
