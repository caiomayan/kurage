package com.kurage.api.dto.response;

import java.io.Serializable;
import java.util.List;

public record PlayerRankingContextResponse(
        LeaderboardResponse player,
        Integer currentPosition,
        Integer deltaYesterday,
        Integer deltaWeek,
        List<LeaderboardResponse> adjacentPlayers,
        LeaderboardResponse nextPlayerToPass,
        List<RankingHistoryPointResponse> history
) implements Serializable {
}
