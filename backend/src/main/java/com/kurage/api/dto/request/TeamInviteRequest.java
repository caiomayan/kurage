package com.kurage.api.dto.request;

import com.kurage.api.domain.TeamRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record TeamInviteRequest(
        @NotBlank String steamId64,
        @NotNull TeamRole targetRole
) {}
