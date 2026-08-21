package com.kurage.api.dto.request;

import com.kurage.api.domain.TeamRole;
import jakarta.validation.constraints.NotNull;

public record CreateTeamJoinRequest(
        @NotNull TeamRole desiredRole
) {}
