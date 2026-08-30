package com.kurage.api.integration;

import com.kurage.api.domain.PlayerFunction;
import com.kurage.api.domain.PlayerStats;
import com.kurage.api.domain.User;
import com.kurage.api.repository.PlayerStatsRepository;
import com.kurage.api.repository.UserRepository;
import com.kurage.api.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class RankingPostgresIT extends IntegrationTestSupport {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PlayerStatsRepository playerStatsRepository;

    @Autowired
    private UserService userService;

    @Test
    void excludesUnplayedAccountsFromRankingAndPositionCounts() {
        User unplayed = persistUser("unplayed");
        User ranked = persistUser("ranked");
        User leader = persistUser("leader");

        persistStats(unplayed, 999, 0);
        persistStats(ranked, 500, 3);
        persistStats(leader, 700, 8);

        var page = playerStatsRepository.findAllOrderByKurageEloDesc(PageRequest.of(0, 20));

        assertThat(page.getTotalElements()).isEqualTo(2);
        assertThat(page.getContent())
                .extracting(stats -> stats.getUser().getUsername())
                .containsExactly(leader.getUsername(), ranked.getUsername())
                .doesNotContain(unplayed.getUsername());
        assertThat(playerStatsRepository.findLeaderboardPosition(500)).isEqualTo(2);
        assertThat(userService.buildUserResponse(unplayed).rankPosition()).isNull();
        assertThat(userService.buildUserResponse(ranked).rankPosition()).isEqualTo(2);
        assertThat(userService.buildUserResponse(ranked).rankDelta()).isNull();
    }

    private User persistUser(String prefix) {
        String suffix = UUID.randomUUID().toString().replace("-", "");
        return userRepository.saveAndFlush(User.builder()
                .kurageId(userRepository.generateNextKurageId())
                .username(prefix + "-" + suffix.substring(0, 10))
                .steamId64(suffix)
                .primaryFunction(PlayerFunction.CORINGA)
                .build());
    }

    private void persistStats(User user, int elo, int matches) {
        playerStatsRepository.saveAndFlush(PlayerStats.builder()
                .userId(user.getId())
                .user(user)
                .kurageElo(elo)
                .matchesPlayed(matches)
                .build());
    }
}
