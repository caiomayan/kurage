package com.kurage.api.dto.response;

import java.io.Serializable;
import java.math.BigDecimal;

public record LeaderboardResponse(
        Long kurageId,
        String steamId64,
        String username,
        String avatarUrl,
        String country,
        Integer kurageLevel,
        Integer kurageElo,
        BigDecimal kdRatio,
        Integer winRate,
        Integer matches,
        Integer wins,
        Integer position,
        Integer positionDelta,
        String primaryFunction,
        String teamTag,
        boolean isVerifiedPro
) implements Serializable {
}
