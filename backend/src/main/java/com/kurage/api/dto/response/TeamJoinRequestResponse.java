package com.kurage.api.dto.response;

import com.kurage.api.domain.TeamJoinRequest;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

public record TeamJoinRequestResponse(
        UUID id,
        UUID teamId,
        String teamName,
        String teamTag,
        UserResponse requester,
        String desiredRole,
        String status,
        UserResponse reviewedBy,
        Instant createdAt,
        Instant updatedAt
) implements Serializable {

    public static TeamJoinRequestResponse create(TeamJoinRequest request) {
        if (request == null) return null;
        return new TeamJoinRequestResponse(
                request.getId(),
                request.getTeam() != null ? request.getTeam().getId() : null,
                request.getTeam() != null ? request.getTeam().getName() : null,
                request.getTeam() != null ? request.getTeam().getTag() : null,
                UserResponse.create(request.getRequester()),
                request.getDesiredRole() != null ? request.getDesiredRole().name() : null,
                request.getStatus() != null ? request.getStatus().name() : null,
                UserResponse.create(request.getReviewedBy()),
                request.getCreatedAt(),
                request.getUpdatedAt()
        );
    }
}
