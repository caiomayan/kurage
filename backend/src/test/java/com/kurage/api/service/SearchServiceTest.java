package com.kurage.api.service;

import com.kurage.api.domain.PlayerFunction;
import com.kurage.api.domain.PlayerStats;
import com.kurage.api.domain.Team;
import com.kurage.api.domain.TeamMember;
import com.kurage.api.domain.TeamRole;
import com.kurage.api.domain.User;
import com.kurage.api.domain.UserRole;
import com.kurage.api.dto.response.FullSearchResponse;
import com.kurage.api.dto.response.QuickSearchResponse;
import com.kurage.api.dto.response.SearchPlayerResult;
import com.kurage.api.repository.PlayerStatsRepository;
import com.kurage.api.repository.TeamRepository;
import com.kurage.api.repository.UserFaceitRepository;
import com.kurage.api.repository.UserRepository;
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

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SearchServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private TeamRepository teamRepository;

    @Mock
    private PlayerStatsRepository playerStatsRepository;

    @Mock
    private UserFaceitRepository userFaceitRepository;

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @InjectMocks
    private SearchService searchService;

    private User sampleUser;
    private Team sampleTeam;
    private PlayerStats sampleStats;

    @BeforeEach
    void setUp() {
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        sampleUser = User.builder()
                .id(UUID.randomUUID())
                .kurageId(1024L)
                .username("FalleN")
                .steamId64("76561197960287930")
                .role(UserRole.USER)
                .primaryFunction(PlayerFunction.AWPER)
                .isVerifiedPro(true)
                .country("BR")
                .avatarUrl("https://example.com/avatar.jpg")
                .build();

        sampleStats = PlayerStats.builder()
                .userId(sampleUser.getId())
                .kurageElo(850)
                .kills(1500)
                .deaths(1000)
                .matchesPlayed(50)
                .matchesWon(35)
                .build();

        sampleTeam = Team.builder()
                .id(UUID.randomUUID())
                .name("FURIA Esports")
                .tag("FUR")
                .country("BR")
                .teamElo(750)
                .owner(sampleUser)
                .members(new ArrayList<>())
                .build();

        TeamMember member = TeamMember.builder()
                .id(UUID.randomUUID())
                .team(sampleTeam)
                .user(sampleUser)
                .teamRole(TeamRole.PLAYER)
                .build();
        sampleTeam.getMembers().add(member);
    }

    @Test
    void testQuickSearch_ShortQuery() {
        QuickSearchResponse res1 = searchService.quickSearch("", 8);
        assertNull(res1.topResult());
        assertTrue(res1.players().isEmpty());
        assertTrue(res1.teams().isEmpty());

        QuickSearchResponse res2 = searchService.quickSearch("a", 8);
        assertNull(res2.topResult());
        assertTrue(res2.players().isEmpty());
        assertTrue(res2.teams().isEmpty());
    }

    @Test
    void testQuickSearch_ByKurageId() {
        when(valueOperations.get(anyString())).thenReturn(null);
        when(userRepository.findByKurageId(1024L)).thenReturn(Optional.of(sampleUser));
        when(userRepository.findTopUsersOrdered(eq("1024"), any(PageRequest.class))).thenReturn(List.of(sampleUser));
        when(teamRepository.findTopTeamsOrdered(eq("1024"), any(PageRequest.class))).thenReturn(List.of());
        when(playerStatsRepository.findById(sampleUser.getId())).thenReturn(Optional.of(sampleStats));
        when(teamRepository.findAllByMemberUserId(sampleUser.getId())).thenReturn(List.of(sampleTeam));

        QuickSearchResponse res = searchService.quickSearch("1024", 8);

        assertNotNull(res);
        assertNotNull(res.topResult());
        assertEquals("PLAYER", res.topResult().type());
        assertEquals("FalleN", res.topResult().player().username());
        assertEquals(1024L, res.topResult().player().kurageId());
        assertEquals("FUR", res.topResult().player().teamTag());
        assertEquals(9, res.topResult().player().kurageLevel());
        assertEquals("K/D", res.topResult().player().highlightStat().label());
        assertEquals("1.50", res.topResult().player().highlightStat().value());
        assertEquals(1, res.players().size());
        assertTrue(res.teams().isEmpty());
    }

    @Test
    void testQuickSearch_ByTeamTag() {
        when(valueOperations.get(anyString())).thenReturn(null);
        when(userRepository.findTopUsersOrdered(eq("fur"), any(PageRequest.class))).thenReturn(List.of());
        when(teamRepository.findTopTeamsOrdered(eq("fur"), any(PageRequest.class))).thenReturn(List.of(sampleTeam));

        QuickSearchResponse res = searchService.quickSearch("FUR", 8);

        assertNotNull(res);
        assertNotNull(res.topResult());
        assertEquals("TEAM", res.topResult().type());
        assertEquals("FURIA Esports", res.topResult().team().name());
        assertEquals("FUR", res.topResult().team().tag());
        assertEquals(750, res.topResult().team().teamElo());
        assertEquals(1, res.topResult().team().memberCount());
        assertTrue(res.players().isEmpty());
        assertEquals(1, res.teams().size());
    }

    @Test
    void testQuickSearch_RedisFailOpen() {
        when(valueOperations.get(anyString())).thenThrow(new RuntimeException("Redis connection timed out"));
        when(userRepository.findTopUsersOrdered(eq("fallen"), any(PageRequest.class))).thenReturn(List.of(sampleUser));
        when(teamRepository.findTopTeamsOrdered(eq("fallen"), any(PageRequest.class))).thenReturn(List.of());
        when(playerStatsRepository.findById(sampleUser.getId())).thenReturn(Optional.of(sampleStats));

        // Deve continuar e retornar resultado do banco sem disparar exceção
        QuickSearchResponse res = searchService.quickSearch("FalleN", 8);

        assertNotNull(res);
        assertNotNull(res.topResult());
        assertEquals("PLAYER", res.topResult().type());
        assertEquals("FalleN", res.topResult().player().username());
    }

    @Test
    void testFullSearch_All() {
        when(valueOperations.get(anyString())).thenReturn(null);
        when(userRepository.searchUsersOrdered(eq("fur"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(sampleUser), PageRequest.of(0, 20), 1));
        when(teamRepository.searchTeamsOrdered(eq("fur"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(sampleTeam), PageRequest.of(0, 20), 1));
        when(playerStatsRepository.findById(sampleUser.getId())).thenReturn(Optional.of(sampleStats));

        FullSearchResponse res = searchService.fullSearch("fur", "ALL", 0, 20);

        assertNotNull(res);
        assertEquals("fur", res.query());
        assertEquals("ALL", res.type());
        assertEquals(1, res.players().totalElements());
        assertEquals(1, res.players().content().size());
        assertEquals(1, res.teams().totalElements());
        assertEquals(1, res.teams().content().size());
    }

    @Test
    void testFullSearch_PlayersOnly() {
        when(valueOperations.get(anyString())).thenReturn(null);
        when(userRepository.searchUsersOrdered(eq("fallen"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(sampleUser), PageRequest.of(0, 20), 1));
        when(playerStatsRepository.findById(sampleUser.getId())).thenReturn(Optional.of(sampleStats));

        FullSearchResponse res = searchService.fullSearch("fallen", "PLAYERS", 0, 20);

        assertNotNull(res);
        assertEquals("PLAYERS", res.type());
        assertEquals(1, res.players().totalElements());
        assertEquals(0, res.teams().totalElements());
        verify(teamRepository, never()).searchTeamsOrdered(anyString(), any());
    }

    @Test
    void testFullSearch_TeamsOnly() {
        when(valueOperations.get(anyString())).thenReturn(null);
        when(teamRepository.searchTeamsOrdered(eq("furia"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(sampleTeam), PageRequest.of(0, 20), 1));

        FullSearchResponse res = searchService.fullSearch("furia", "TEAMS", 0, 20);

        assertNotNull(res);
        assertEquals("TEAMS", res.type());
        assertEquals(0, res.players().totalElements());
        assertEquals(1, res.teams().totalElements());
        verify(userRepository, never()).searchUsersOrdered(anyString(), any());
    }

    @Test
    void testSearchPlayersForInvite() {
        when(userRepository.findTopUsersOrdered(eq("fallen"), any(PageRequest.class)))
                .thenReturn(List.of(sampleUser));
        when(playerStatsRepository.findById(sampleUser.getId())).thenReturn(Optional.of(sampleStats));

        List<SearchPlayerResult> results = searchService.searchPlayersForInvite("fallen", 10);

        assertNotNull(results);
        assertEquals(1, results.size());
        assertEquals("FalleN", results.get(0).username());
    }
}
