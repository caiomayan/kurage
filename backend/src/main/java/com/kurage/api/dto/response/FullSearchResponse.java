package com.kurage.api.dto.response;

import java.io.Serializable;
import java.util.List;

public record FullSearchResponse(
        String query,
        String type,
        SearchResultPage<SearchPlayerResult> players,
        SearchResultPage<SearchTeamResult> teams
) implements Serializable {
    public record SearchResultPage<T>(
            List<T> content,
            long totalElements,
            int totalPages,
            int page
    ) implements Serializable {}
}
