package com.kurage.api.dto.response;

import com.kurage.api.domain.PlayerStats;

import java.io.Serializable;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.UUID;

public record PlayerStatsResponse(
        UUID userId,
        Integer kurageElo,
        Integer kurageLevel,
        Integer kills,
        Integer deaths,
        Integer assists,
        Integer headshots,
        Integer roundsPlayed,
        Integer matchesPlayed,
        Integer matchesWon,
        BigDecimal kdRatio,
        Integer winRate,
        Integer headshotPercentage,
        Long totalDamage,
        BigDecimal adr,
        Instant lastMatchAt
) implements Serializable {

    public static PlayerStatsResponse create(PlayerStats stats) {
        if (stats == null) return null;

        int deaths = stats.getDeaths() != null ? stats.getDeaths() : 0;
        int kills = stats.getKills() != null ? stats.getKills() : 0;
        int headshots = stats.getHeadshots() != null ? stats.getHeadshots() : 0;
        int roundsPlayed = stats.getRoundsPlayed() != null ? stats.getRoundsPlayed() : 0;
        int matchesPlayed = stats.getMatchesPlayed() != null ? stats.getMatchesPlayed() : 0;
        int matchesWon = stats.getMatchesWon() != null ? stats.getMatchesWon() : 0;
        long totalDamage = stats.getTotalDamage() != null ? stats.getTotalDamage() : 0L;

        BigDecimal kd = deaths > 0
                ? BigDecimal.valueOf((double) kills / deaths).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.valueOf(kills).setScale(2, RoundingMode.HALF_UP);

        int winRate = matchesPlayed > 0 ? (int) Math.round(((double) matchesWon / matchesPlayed) * 100) : 0;
        int hsPct = kills > 0 ? (int) Math.round(((double) headshots / kills) * 100) : 0;

        BigDecimal adr = roundsPlayed > 0
                ? BigDecimal.valueOf((double) totalDamage / roundsPlayed).setScale(1, RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(1, RoundingMode.HALF_UP);

        return new PlayerStatsResponse(
                stats.getUserId(),
                stats.getKurageElo(),
                stats.getKurageLevel(),
                kills,
                deaths,
                stats.getAssists(),
                headshots,
                roundsPlayed,
                matchesPlayed,
                matchesWon,
                kd,
                winRate,
                hsPct,
                totalDamage,
                adr,
                stats.getLastMatchAt()
        );
    }
}
