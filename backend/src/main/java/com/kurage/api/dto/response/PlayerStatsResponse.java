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
        Instant lastMatchAt,
        int calibrationMatchesCompleted,
        int calibrationMatchesRequired,
        boolean isCalibrated
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

        boolean calibrated = stats.isCalibrated();
        BigDecimal kd = matchesPlayed == 0 ? null : deaths > 0
                ? BigDecimal.valueOf((double) kills / deaths).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.valueOf(kills).setScale(2, RoundingMode.HALF_UP);

        Integer winRate = matchesPlayed > 0 ? (int) Math.round(((double) matchesWon / matchesPlayed) * 100) : null;
        Integer hsPct = kills > 0 ? (int) Math.round(((double) headshots / kills) * 100) : null;

        BigDecimal adr = roundsPlayed > 0
                ? BigDecimal.valueOf((double) totalDamage / roundsPlayed).setScale(1, RoundingMode.HALF_UP)
                : null;

        return new PlayerStatsResponse(
                stats.getUserId(),
                calibrated ? stats.getKurageElo() : null,
                calibrated ? stats.getKurageLevel() : null,
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
                stats.getLastMatchAt(),
                Math.min(matchesPlayed, PlayerStats.CALIBRATION_MATCHES_REQUIRED),
                PlayerStats.CALIBRATION_MATCHES_REQUIRED,
                calibrated
        );
    }
}
