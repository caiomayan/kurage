package com.kurage.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kurage.api.domain.*;
import com.kurage.api.dto.response.LeaderboardResponse;
import com.kurage.api.dto.response.PageResponse;
import com.kurage.api.dto.response.PlayerRankingContextResponse;
import com.kurage.api.dto.response.TeamLeaderboardResponse;
import org.springframework.web.server.ResponseStatusException;
import com.kurage.api.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RankingServiceTest {

    @Mock
    private PlayerStatsRepository playerStatsRepository;

    @Mock
    private TeamRepository teamRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RankingSnapshotRepository rankingSnapshotRepository;

    @Mock
    private TeamRankingSnapshotRepository teamRankingSnapshotRepository;

    @Mock
    private PlayerStatsService playerStatsService;

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @InjectMocks
    private RankingService rankingService;

    private User sampleUser;
    private PlayerStats sampleStats;
    private Team sampleTeam;

    @BeforeEach
    void setUp() {
        sampleUser = User.builder()
                .id(UUID.randomUUID())
                .kurageId(1001L)
                .username("fallen")
                .steamId64("76561198000000001")
                .country("BR")
                .primaryFunction(PlayerFunction.AWPER)
                .isVerifiedPro(true)
                .build();

        sampleStats = PlayerStats.builder()
                .userId(sampleUser.getId())
                .user(sampleUser)
                .kurageElo(950)
                .kills(150)
                .deaths(100)
                .matchesPlayed(10)
                .matchesWon(7)
                .build();

        sampleTeam = Team.builder()
                .id(UUID.randomUUID())
                .name("FURIA Esports")
                .tag("FUR")
                .country("BR")
                .teamElo(850)
                .build();
    }

    @Test
    void testGetPlayerRanking_Success_NoCache() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get(anyString())).thenReturn(null);

        when(playerStatsRepository.findAllOrderByKurageEloDesc(any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(sampleStats), PageRequest.of(0, 20), 1));

        RankingSnapshot snapshot = RankingSnapshot.builder()
                .position(3)
                .kurageElo(920)
                .snapshotDate(LocalDate.now().minusDays(1))
                .build();
        when(rankingSnapshotRepository.findByUserIdAndSnapshotDate(eq(sampleUser.getId()), any(LocalDate.class)))
                .thenReturn(Optional.of(snapshot));

        PageResponse<LeaderboardResponse> response = rankingService.getPlayerRanking(0, 20);

        assertNotNull(response);
        assertEquals(1, response.content().size());
        LeaderboardResponse item = response.content().get(0);
        assertEquals(1001L, item.kurageId());
        assertEquals("fallen", item.username());
        assertEquals(10, item.kurageLevel());
        assertEquals(950, item.kurageElo());
        assertEquals(1, item.position());
        assertEquals(2, item.positionDelta()); // yesterday was 3, today is 1 -> delta = +2
        assertEquals(new BigDecimal("1.50"), item.kdRatio());
        assertEquals(70, item.winRate());
        assertTrue(item.isVerifiedPro());

        verify(valueOperations).set(anyString(), anyString(), any(Duration.class));
    }

    @Test
    void testGetPlayerRanking_Cached() throws Exception {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        LeaderboardResponse item = new LeaderboardResponse(
                1001L, "76561198000000001", "fallen", null, "BR", 10, 950,
                new BigDecimal("1.50"), 70, 10, 7, 1, 2, "AWPER", "FUR", true
        );
        PageResponse<LeaderboardResponse> cachedResponse = new PageResponse<>(
                List.of(item), 0, 20, 1L, 1, true, "now", "next"
        );
        String json = new ObjectMapper().writeValueAsString(cachedResponse);
        when(valueOperations.get(anyString())).thenReturn(json);

        PageResponse<LeaderboardResponse> response = rankingService.getPlayerRanking(0, 20);

        assertNotNull(response);
        assertEquals(1, response.content().size());
        assertEquals("fallen", response.content().get(0).username());
        verify(playerStatsRepository, never()).findAllOrderByKurageEloDesc(any());
    }

    @Test
    void testGetPlayerRanking_RedisDown_FailOpen() {
        when(redisTemplate.opsForValue()).thenThrow(new RuntimeException("Redis connection refused"));
        when(playerStatsRepository.findAllOrderByKurageEloDesc(any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(sampleStats), PageRequest.of(0, 20), 1));

        PageResponse<LeaderboardResponse> response = rankingService.getPlayerRanking(0, 20);

        assertNotNull(response);
        assertEquals(1, response.content().size());
        assertEquals("fallen", response.content().get(0).username());
    }

    @Test
    void testGetPlayerRanking_BeyondMaxLimit() {
        PageResponse<LeaderboardResponse> response = rankingService.getPlayerRanking(15, 20); // 300 >= 200
        assertNotNull(response);
        assertTrue(response.content().isEmpty());
        assertTrue(response.isLast());
        verify(playerStatsRepository, never()).findAllOrderByKurageEloDesc(any());
    }

    @Test
    void testGetTeamRanking_Success_NoCache() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get(anyString())).thenReturn(null);

        when(teamRepository.findAllOrderByTeamEloDesc(any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(sampleTeam), PageRequest.of(0, 10), 1));

        TeamRankingSnapshot snapshot = TeamRankingSnapshot.builder()
                .position(2)
                .teamElo(830)
                .snapshotDate(LocalDate.now().minusDays(1))
                .build();
        when(teamRankingSnapshotRepository.findByTeamIdAndSnapshotDate(eq(sampleTeam.getId()), any(LocalDate.class)))
                .thenReturn(Optional.of(snapshot));

        PageResponse<TeamLeaderboardResponse> response = rankingService.getTeamRanking(0, 10);

        assertNotNull(response);
        assertEquals(1, response.content().size());
        TeamLeaderboardResponse item = response.content().get(0);
        assertEquals("FURIA Esports", item.name());
        assertEquals("FUR", item.tag());
        assertEquals(850, item.teamElo());
        assertEquals(1, item.position());
        assertEquals(1, item.positionDelta()); // yesterday was 2, today is 1 -> delta = +1
    }

    @Test
    void testGetTeamRanking_BeyondMaxLimit() {
        PageResponse<TeamLeaderboardResponse> response = rankingService.getTeamRanking(6, 10); // 60 >= 50
        assertNotNull(response);
        assertTrue(response.content().isEmpty());
        assertTrue(response.isLast());
        verify(teamRepository, never()).findAllOrderByTeamEloDesc(any());
    }

    @Test
    void testGetPlayerContext_Success() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get(anyString())).thenReturn(null);

        when(userRepository.findByKurageId(1001L)).thenReturn(Optional.of(sampleUser));
        when(playerStatsService.getOrCreateStats(sampleUser)).thenReturn(sampleStats);
        when(playerStatsRepository.findLeaderboardPosition(950)).thenReturn(4);

        RankingSnapshot snapYesterday = RankingSnapshot.builder().position(6).build();
        RankingSnapshot snapWeek = RankingSnapshot.builder().position(10).build();

        when(rankingSnapshotRepository.findByUserIdAndSnapshotDate(eq(sampleUser.getId()), eq(LocalDate.now().minusDays(1))))
                .thenReturn(Optional.of(snapYesterday));
        when(rankingSnapshotRepository.findByUserIdAndSnapshotDate(eq(sampleUser.getId()), eq(LocalDate.now().minusDays(7))))
                .thenReturn(Optional.of(snapWeek));

        User p1 = User.builder().id(UUID.randomUUID()).kurageId(1002L).username("p1").build();
        User p2 = User.builder().id(UUID.randomUUID()).kurageId(1003L).username("p2").build();
        User p3 = User.builder().id(UUID.randomUUID()).kurageId(1004L).username("p3").build();
        User p4 = sampleUser;
        User p5 = User.builder().id(UUID.randomUUID()).kurageId(1005L).username("p5").build();

        List<PlayerStats> mockTop = List.of(
                PlayerStats.builder().user(p1).kurageElo(980).build(),
                PlayerStats.builder().user(p2).kurageElo(970).build(),
                PlayerStats.builder().user(p3).kurageElo(960).build(),
                sampleStats,
                PlayerStats.builder().user(p5).kurageElo(940).build()
        );

        when(playerStatsRepository.findTopOrderByKurageEloDesc(any(PageRequest.class))).thenReturn(mockTop);

        PlayerRankingContextResponse context = rankingService.getPlayerContext(1001L);

        assertNotNull(context);
        assertEquals(4, context.currentPosition());
        assertEquals(2, context.deltaYesterday()); // was 6, now 4 -> +2
        assertEquals(6, context.deltaWeek());      // was 10, now 4 -> +6
        assertNotNull(context.player());
        assertEquals("fallen", context.player().username());
        assertFalse(context.adjacentPlayers().isEmpty());
        assertNotNull(context.nextPlayerToPass());
        assertEquals("p3", context.nextPlayerToPass().username()); // Position 3 is above position 4
    }

    @Test
    void testGetPlayerContext_UserNotFound_ThrowsException() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get(anyString())).thenReturn(null);
        when(userRepository.findByKurageId(9999L)).thenReturn(Optional.empty());

        assertThrows(ResponseStatusException.class, () -> rankingService.getPlayerContext(9999L));
    }

    @Test
    void testGenerateDailyPlayerSnapshots() {
        when(playerStatsRepository.findTopOrderByKurageEloDesc(any(PageRequest.class)))
                .thenReturn(List.of(sampleStats));
        when(rankingSnapshotRepository.findByUserIdAndSnapshotDate(eq(sampleUser.getId()), any(LocalDate.class)))
                .thenReturn(Optional.empty());

        rankingService.generateDailyPlayerSnapshots();

        verify(rankingSnapshotRepository).save(argThat(snap ->
                snap.getUser().getId().equals(sampleUser.getId()) &&
                snap.getPosition() == 1 &&
                snap.getKurageElo() == 950
        ));
    }

    @Test
    void testGenerateDailyTeamSnapshots() {
        when(teamRepository.findAllOrderByTeamEloDesc(any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(sampleTeam)));
        when(teamRankingSnapshotRepository.findByTeamIdAndSnapshotDate(eq(sampleTeam.getId()), any(LocalDate.class)))
                .thenReturn(Optional.empty());

        rankingService.generateDailyTeamSnapshots();

        verify(teamRankingSnapshotRepository).save(argThat(snap ->
                snap.getTeam().getId().equals(sampleTeam.getId()) &&
                snap.getPosition() == 1 &&
                snap.getTeamElo() == 850
        ));
    }
}
