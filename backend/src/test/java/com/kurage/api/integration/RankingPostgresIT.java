package com.kurage.api.integration;

import com.kurage.api.domain.PlayerFunction;
import com.kurage.api.domain.PlayerStats;
import com.kurage.api.domain.RankingSnapshot;
import com.kurage.api.domain.Team;
import com.kurage.api.domain.TeamRankingSnapshot;
import com.kurage.api.domain.User;
import com.kurage.api.repository.PlayerStatsRepository;
import com.kurage.api.repository.RankingSnapshotRepository;
import com.kurage.api.repository.TeamRankingSnapshotRepository;
import com.kurage.api.repository.TeamRepository;
import com.kurage.api.repository.UserRepository;
import com.kurage.api.service.RankingService;
import com.kurage.api.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class RankingPostgresIT extends IntegrationTestSupport {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PlayerStatsRepository playerStatsRepository;

    @Autowired
    private UserService userService;

    @Autowired
    private RankingService rankingService;

    @Autowired
    private RankingSnapshotRepository rankingSnapshotRepository;

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private TeamRankingSnapshotRepository teamRankingSnapshotRepository;

    @Test
    void excludesUnplayedAccountsFromRankingAndPositionCounts() {
        User unplayed = persistUser("unplayed");
        User calibrating = persistUser("calibrating");
        User ranked = persistUser("ranked");
        User leader = persistUser("leader");

        persistStats(unplayed, 999, 0);
        persistStats(calibrating, 900, 4);
        persistStats(ranked, 500, 5);
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

    @Test
    void buildsRankingAndPlayerContextFromPersistedStatsAndSnapshots() {
        User leader = persistUser("context-leader");
        User player = persistUser("context-player");
        User follower = persistUser("context-follower");

        persistStats(leader, 900, 8);
        persistStats(player, 800, 7);
        persistStats(follower, 700, 6);

        rankingSnapshotRepository.saveAndFlush(RankingSnapshot.builder()
                .user(player)
                .position(4)
                .kurageElo(760)
                .snapshotDate(LocalDate.now().minusDays(1))
                .build());
        rankingSnapshotRepository.saveAndFlush(RankingSnapshot.builder()
                .user(player)
                .position(7)
                .kurageElo(690)
                .snapshotDate(LocalDate.now().minusDays(7))
                .build());

        var ranking = rankingService.getPlayerRanking(0, 20);
        var context = rankingService.getPlayerContext(player.getKurageId());

        assertThat(ranking.content())
                .extracting(entry -> entry.username())
                .containsExactly(leader.getUsername(), player.getUsername(), follower.getUsername());
        assertThat(ranking.content().get(1).position()).isEqualTo(2);
        assertThat(ranking.content().get(1).positionDelta()).isEqualTo(2);
        assertThat(context.currentPosition()).isEqualTo(2);
        assertThat(context.deltaYesterday()).isEqualTo(2);
        assertThat(context.deltaWeek()).isEqualTo(5);
        assertThat(context.nextPlayerToPass()).isNotNull();
        assertThat(context.nextPlayerToPass().username()).isEqualTo(leader.getUsername());
        assertThat(context.history()).hasSize(2);
    }

    @Test
    void keepsPlayerContextUnrankedUntilCalibrationIsComplete() {
        User player = persistUser("still-calibrating");
        persistStats(player, 980, 4);

        var context = rankingService.getPlayerContext(player.getKurageId());

        assertThat(context.currentPosition()).isNull();
        assertThat(context.deltaYesterday()).isNull();
        assertThat(context.deltaWeek()).isNull();
        assertThat(context.player().kurageElo()).isNull();
        assertThat(context.player().kurageLevel()).isNull();
        assertThat(context.player().position()).isNull();
        assertThat(context.adjacentPlayers()).isEmpty();
        assertThat(context.nextPlayerToPass()).isNull();
        assertThat(context.history()).isEmpty();
    }

    @Test
    void persistsDailyPlayerAndTeamSnapshotsWithoutSyntheticEntries() {
        User player = persistUser("snapshot-player");
        User calibrating = persistUser("snapshot-calibrating");
        persistStats(player, 750, 5);
        persistStats(calibrating, 999, 4);

        String suffix = UUID.randomUUID().toString().replace("-", "");
        Team team = teamRepository.saveAndFlush(Team.builder()
                .name("Team " + suffix.substring(0, 8))
                .tag(suffix.substring(0, 4))
                .owner(player)
                .teamElo(640)
                .build());

        rankingService.generateDailyPlayerSnapshots();
        rankingService.generateDailyTeamSnapshots();

        assertThat(rankingSnapshotRepository.findByUserIdAndSnapshotDate(player.getId(), LocalDate.now()))
                .get()
                .extracting(RankingSnapshot::getPosition, RankingSnapshot::getKurageElo)
                .containsExactly(1, 750);
        assertThat(rankingSnapshotRepository.findByUserIdAndSnapshotDate(calibrating.getId(), LocalDate.now()))
                .isEmpty();
        assertThat(teamRankingSnapshotRepository.findByTeamIdAndSnapshotDate(team.getId(), LocalDate.now()))
                .get()
                .extracting(TeamRankingSnapshot::getPosition, TeamRankingSnapshot::getTeamElo)
                .containsExactly(1, 640);
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
