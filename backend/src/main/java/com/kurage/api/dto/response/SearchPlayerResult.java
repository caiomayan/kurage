package com.kurage.api.dto.response;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.UUID;

public record SearchPlayerResult(
        UUID id,
        Long kurageId,
        String username,
        String avatarUrl,
        String country,
        int kurageLevel,
        int kurageElo,
        String primaryFunction,
        String teamTag,
        String teamName,
        BigDecimal kdRatio,
        Integer faceitElo,
        Integer faceitLevel,
        BigDecimal faceitKdRatio,
        boolean isVerifiedPro,
        HighlightStat highlightStat
) implements Serializable {
    public record HighlightStat(
            String label,
            String value
    ) implements Serializable {}
}
