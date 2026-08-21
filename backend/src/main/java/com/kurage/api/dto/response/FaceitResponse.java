package com.kurage.api.dto.response;

import com.kurage.api.domain.User;
import com.kurage.api.domain.UserFaceit;

import java.math.BigDecimal;

public record FaceitResponse(
        String username,
        Integer level,
        Integer elo,
        BigDecimal kdRatio,
        Integer winRate,
        Integer matches,
        String faceitUrl,
        java.util.List<String> recentResults,
        boolean cached
) {
    public static FaceitResponse create(com.kurage.api.domain.UserFaceit uf, com.kurage.api.domain.User user, boolean cached) {
        return new FaceitResponse(
                user.getFaceitUsername(),
                uf.getLevel(),
                uf.getElo(),
                uf.getKdRatio(),
                uf.getWinRate(),
                uf.getMatches(),
                null, // faceitUrl
                null, // recentResults
                cached
        );
    }

    public static FaceitResponse empty() {
        return new FaceitResponse(null, null, null, null, null, null, null, null, false);
    }

    public static FaceitResponse fromCache(FaceitResponse cached) {
        return new FaceitResponse(
                cached.username(),
                cached.level(),
                cached.elo(),
                cached.kdRatio(),
                cached.winRate(),
                cached.matches(),
                cached.faceitUrl(),
                cached.recentResults(),
                true
        );
    }

    public static FaceitResponse fromApi(String username, Integer level, Integer elo, BigDecimal kdRatio, Integer winRate, Integer matches, String faceitUrl, java.util.List<String> recentResults) {
        return new FaceitResponse(username, level, elo, kdRatio, winRate, matches, faceitUrl, recentResults, false);
    }
}
