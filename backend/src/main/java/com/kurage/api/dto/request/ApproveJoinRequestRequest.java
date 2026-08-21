package com.kurage.api.dto.request;

import com.kurage.api.domain.TeamRole;

public record ApproveJoinRequestRequest(
        TeamRole finalRole
) {}
