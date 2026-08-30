package com.kurage.api.integration;

import com.kurage.api.domain.ManagementRole;
import com.kurage.api.domain.Team;
import com.kurage.api.domain.TeamInviteLink;
import com.kurage.api.domain.TeamMember;
import com.kurage.api.domain.TeamRole;
import com.kurage.api.domain.User;
import com.kurage.api.repository.NotificationRepository;
import com.kurage.api.repository.TeamInviteLinkRepository;
import com.kurage.api.repository.TeamMemberRepository;
import com.kurage.api.repository.TeamRepository;
import com.kurage.api.repository.UserRepository;
import com.kurage.api.service.TeamService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.transaction.TestTransaction;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;

import static org.assertj.core.api.Assertions.assertThat;

class TeamConcurrencyIT extends IntegrationTestSupport {

    @Autowired private TeamService teamService;
    @Autowired private TeamRepository teamRepository;
    @Autowired private TeamMemberRepository teamMemberRepository;
    @Autowired private TeamInviteLinkRepository teamInviteLinkRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private NotificationRepository notificationRepository;

    @Test
    void allowsOnlyOnePlayerToConsumeTheLastInviteLinkUse() throws Exception {
        User owner = saveUser(9_100_001L, "concurrency_owner", "76561198191000001");
        User firstCandidate = saveUser(9_100_002L, "concurrency_first", "76561198191000002");
        User secondCandidate = saveUser(9_100_003L, "concurrency_second", "76561198191000003");

        Team team = teamRepository.save(Team.builder()
                .name("Concurrency Test")
                .tag("CTST")
                .owner(owner)
                .teamElo(200)
                .members(new ArrayList<>())
                .build());
        teamMemberRepository.save(TeamMember.builder()
                .team(team)
                .user(owner)
                .teamRole(TeamRole.COACH)
                .managementRole(ManagementRole.OWNER)
                .build());

        String token = UUID.randomUUID().toString().replace("-", "")
                + UUID.randomUUID().toString().replace("-", "");
        UUID linkId = teamInviteLinkRepository.save(TeamInviteLink.builder()
                .team(team)
                .createdBy(owner)
                .token(token)
                .targetRole(TeamRole.PLAYER)
                .expiresAt(Instant.now().plus(Duration.ofDays(1)))
                .maxUses(1)
                .currentUses(0)
                .isActive(true)
                .build()).getId();

        TestTransaction.flagForCommit();
        TestTransaction.end();

        try (var executor = Executors.newFixedThreadPool(2)) {
            CountDownLatch start = new CountDownLatch(1);
            var first = executor.submit(() -> acceptAfterSignal(start, token, firstCandidate.getId()));
            var second = executor.submit(() -> acceptAfterSignal(start, token, secondCandidate.getId()));
            start.countDown();

            List<Boolean> results = List.of(first.get(), second.get());
            assertThat(results).containsExactlyInAnyOrder(true, false);
            assertThat(teamMemberRepository.findByTeamId(team.getId())).hasSize(2);

            TeamInviteLink consumedLink = teamInviteLinkRepository.findById(linkId).orElseThrow();
            assertThat(consumedLink.getCurrentUses()).isEqualTo(1);
            assertThat(consumedLink.isActive()).isFalse();
        } finally {
            TestTransaction.start();
            teamRepository.deleteById(team.getId());
            userRepository.deleteAllById(List.of(owner.getId(), firstCandidate.getId(), secondCandidate.getId()));
            notificationRepository.deleteAll();
            TestTransaction.flagForCommit();
            TestTransaction.end();
            TestTransaction.start();
        }
    }

    private boolean acceptAfterSignal(CountDownLatch start, String token, UUID userId) throws InterruptedException {
        start.await();
        try {
            teamService.acceptInviteLink(token, userId);
            return true;
        } catch (ResponseStatusException expectedConflict) {
            return false;
        }
    }

    private User saveUser(long kurageId, String username, String steamId64) {
        return userRepository.save(User.builder()
                .kurageId(kurageId)
                .username(username)
                .steamId64(steamId64)
                .build());
    }
}
