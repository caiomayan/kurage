package com.kurage.api.controller;

import com.kurage.api.domain.User;
import com.kurage.api.domain.UserFaceit;
import com.kurage.api.dto.response.LeaderboardResponse;
import com.kurage.api.dto.response.PageResponse;
import com.kurage.api.dto.response.PlayerRankingContextResponse;
import com.kurage.api.dto.response.TeamLeaderboardResponse;
import com.kurage.api.repository.UserFaceitRepository;
import com.kurage.api.service.RankingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class LeaderboardControllerTest {

    @Mock
    private RankingService rankingService;

    @Mock
    private UserFaceitRepository userFaceitRepository;

    @Mock
    private StringRedisTemplate redisTemplate;

    @InjectMocks
    private LeaderboardController leaderboardController;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(leaderboardController)
                .build();
    }

    @Test
    void testGetPlayerRanking() throws Exception {
        LeaderboardResponse player = new LeaderboardResponse(
                1001L,
                "76561198000000001",
                "coldzera",
                "https://avatar.url",
                "BR",
                10,
                980,
                new BigDecimal("1.42"),
                75,
                20,
                15,
                1,
                2,
                "LURKER",
                "FUR",
                true
        );

        PageResponse<LeaderboardResponse> response = new PageResponse<>(
                List.of(player),
                0,
                20,
                1L,
                1,
                true,
                "2026-08-15T00:00:00Z",
                "2026-08-15T01:00:00Z"
        );

        when(rankingService.getPlayerRanking(0, 20)).thenReturn(response);

        mockMvc.perform(get("/leaderboard/players")
                        .param("page", "0")
                        .param("size", "20")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].kurageId").value(1001))
                .andExpect(jsonPath("$.content[0].username").value("coldzera"))
                .andExpect(jsonPath("$.content[0].kurageElo").value(980))
                .andExpect(jsonPath("$.content[0].position").value(1))
                .andExpect(jsonPath("$.content[0].positionDelta").value(2))
                .andExpect(jsonPath("$.content[0].isVerifiedPro").value(true));
    }

    @Test
    void testGetPlayerRankingContext() throws Exception {
        LeaderboardResponse player = new LeaderboardResponse(
                1001L,
                "76561198000000001",
                "coldzera",
                "https://avatar.url",
                "BR",
                10,
                980,
                new BigDecimal("1.42"),
                75,
                20,
                15,
                3,
                1,
                "LURKER",
                "FUR",
                true
        );

        LeaderboardResponse nextToPass = new LeaderboardResponse(
                1002L,
                "76561198000000002",
                "fallen",
                "https://avatar.url",
                "BR",
                10,
                990,
                new BigDecimal("1.50"),
                80,
                25,
                20,
                2,
                0,
                "AWPER",
                "FUR",
                true
        );

        PlayerRankingContextResponse context = new PlayerRankingContextResponse(
                player,
                3,
                1,
                4,
                List.of(nextToPass, player),
                nextToPass,
                List.of()
        );

        when(rankingService.getPlayerContext(1001L)).thenReturn(context);

        mockMvc.perform(get("/leaderboard/players/1001/context")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentPosition").value(3))
                .andExpect(jsonPath("$.deltaYesterday").value(1))
                .andExpect(jsonPath("$.deltaWeek").value(4))
                .andExpect(jsonPath("$.player.username").value("coldzera"))
                .andExpect(jsonPath("$.nextPlayerToPass.username").value("fallen"));
    }

    @Test
    void testGetTeamRanking() throws Exception {
        TeamLeaderboardResponse team = new TeamLeaderboardResponse(
                UUID.randomUUID(),
                "FURIA Esports",
                "FUR",
                "https://logo.url",
                "BR",
                890,
                1,
                0,
                5
        );

        PageResponse<TeamLeaderboardResponse> response = new PageResponse<>(
                List.of(team),
                0,
                10,
                1L,
                1,
                true,
                "2026-08-15T00:00:00Z",
                "2026-08-15T01:00:00Z"
        );

        when(rankingService.getTeamRanking(0, 10)).thenReturn(response);

        mockMvc.perform(get("/leaderboard/teams")
                        .param("page", "0")
                        .param("size", "10")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value("FURIA Esports"))
                .andExpect(jsonPath("$.content[0].tag").value("FUR"))
                .andExpect(jsonPath("$.content[0].teamElo").value(890))
                .andExpect(jsonPath("$.content[0].position").value(1));
    }

    @Test
    void testGetFaceitLeaderboard() throws Exception {
        User user = User.builder()
                .id(UUID.randomUUID())
                .kurageId(1001L)
                .username("faceitPlayer")
                .steamId64("76561198000000001")
                .build();

        UserFaceit faceit = UserFaceit.builder()
                .userId(user.getId())
                .user(user)
                .faceitId("faceit-123")
                .level(10)
                .elo(2500)
                .kdRatio(new BigDecimal("1.25"))
                .winRate(60)
                .matches(100)
                .build();

        when(userFaceitRepository.findAllByOrderByEloDesc(any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(faceit), PageRequest.of(0, 10), 1));

        mockMvc.perform(get("/leaderboard/faceit")
                        .param("page", "0")
                        .param("size", "10")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].username").value("faceitPlayer"))
                .andExpect(jsonPath("$.content[0].kurageElo").value(2500));
    }
}
