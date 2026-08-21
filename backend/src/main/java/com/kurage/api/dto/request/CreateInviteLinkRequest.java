package com.kurage.api.dto.request;

import com.kurage.api.domain.TeamRole;

public record CreateInviteLinkRequest(
        TeamRole targetRole,
        Integer expiresInDays,
        Integer maxUses
) {}
