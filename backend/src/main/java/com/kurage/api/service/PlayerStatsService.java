package com.kurage.api.service;

import com.kurage.api.domain.PlayerStats;
import com.kurage.api.domain.User;
import com.kurage.api.dto.response.PlayerStatsResponse;
import com.kurage.api.repository.PlayerStatsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PlayerStatsService {

    private final PlayerStatsRepository playerStatsRepository;

    @Transactional
    public PlayerStats getOrCreateStats(User user) {
        if (user == null || user.getId() == null) {
            throw new IllegalArgumentException("User cannot be null");
        }

        return playerStatsRepository.findById(user.getId())
                .orElseGet(() -> {
                    PlayerStats stats = PlayerStats.builder()
                            .userId(user.getId())
                            .kurageElo(200)
                            .kills(0)
                            .deaths(0)
                            .assists(0)
                            .headshots(0)
                            .roundsPlayed(0)
                            .matchesPlayed(0)
                            .matchesWon(0)
                            .totalDamage(0L)
                            .build();
                    return playerStatsRepository.save(stats);
                });
    }

    @Transactional(readOnly = true)
    public Optional<PlayerStatsResponse> getStatsByUserId(UUID userId) {
        return playerStatsRepository.findById(userId)
                .map(PlayerStatsResponse::create);
    }

    public static int calculateLevel(int elo) {
        if (elo >= 900) return 10;
        if (elo < 0) return 1;
        return (elo / 100) + 1;
    }
}
