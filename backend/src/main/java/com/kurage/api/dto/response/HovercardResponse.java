package com.kurage.api.dto.response;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.UUID;

public record HovercardResponse(
        UUID userId,
        Long kurageId,
        String username,
        String avatarUrl,
        String country,
        Integer kurageLevel,
        Integer kurageElo,
        String primaryFunction,
        String teamTag,
        String teamName,
        BigDecimal kdRatio,
        Integer winRate,
        Integer matchesPlayed,
        BigDecimal hltvRating,
        boolean isVerifiedPro,
        String subscriptionTier
) implements Serializable {
}
