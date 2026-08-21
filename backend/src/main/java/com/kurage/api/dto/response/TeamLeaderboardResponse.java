package com.kurage.api.dto.response;

import java.io.Serializable;
import java.util.UUID;

public record TeamLeaderboardResponse(
        UUID teamId,
        String name,
        String tag,
        String logoUrl,
        String country,
        Integer teamElo,
        int position,
        Integer positionDelta,
        int memberCount
) implements Serializable {
}
