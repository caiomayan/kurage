package com.kurage.api.dto.response;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

public record ProfileVisitorResponse(
        UUID userId,
        Long kurageId,
        String username,
        String avatarUrl,
        String country,
        int kurageLevel,
        int kurageElo,
        boolean isVerifiedPro,
        Instant visitedAt
) implements Serializable {}
