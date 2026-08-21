package com.kurage.api.dto.response;

import java.io.Serializable;
import java.util.List;

public record QuickSearchResponse(
        TopResult topResult,
        List<SearchPlayerResult> players,
        List<SearchTeamResult> teams
) implements Serializable {
    public record TopResult(
            String type,
            SearchPlayerResult player,
            SearchTeamResult team
    ) implements Serializable {}
}
