package com.kurage.api.dto.response;

import com.kurage.api.domain.TeamInviteLink;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

public record InviteLinkResponse(
        UUID id,
        UUID teamId,
        String teamName,
        String teamTag,
        String token,
        String targetRole,
        Instant expiresAt,
        Integer maxUses,
        Integer currentUses,
        boolean isActive,
        Instant createdAt
) implements Serializable {

    public static InviteLinkResponse create(TeamInviteLink link) {
        if (link == null) return null;
        return new InviteLinkResponse(
                link.getId(),
                link.getTeam() != null ? link.getTeam().getId() : null,
                link.getTeam() != null ? link.getTeam().getName() : null,
                link.getTeam() != null ? link.getTeam().getTag() : null,
                link.getToken(),
                link.getTargetRole() != null ? link.getTargetRole().name() : null,
                link.getExpiresAt(),
                link.getMaxUses(),
                link.getCurrentUses(),
                link.isActive(),
                link.getCreatedAt()
        );
    }
}
