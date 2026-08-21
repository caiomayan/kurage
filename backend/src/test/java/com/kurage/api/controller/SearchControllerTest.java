package com.kurage.api.controller;

import com.kurage.api.dto.response.FullSearchResponse;
import com.kurage.api.dto.response.QuickSearchResponse;
import com.kurage.api.dto.response.SearchPlayerResult;
import com.kurage.api.dto.response.SearchTeamResult;
import com.kurage.api.service.SearchService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class SearchControllerTest {

    @Mock
    private SearchService searchService;

    @InjectMocks
    private SearchController searchController;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(searchController)
                .build();
    }

    @Test
    void testQuickSearch() throws Exception {
        SearchPlayerResult player = new SearchPlayerResult(
                UUID.randomUUID(),
                1001L,
                "coldzera",
                "https://avatar.url",
                "BR",
                10,
                950,
                "LURKER",
                "MIBR",
                "Made in Brazil",
                new BigDecimal("1.35"),
                2000,
                10,
                new BigDecimal("1.20"),
                true,
                new SearchPlayerResult.HighlightStat("K/D", "1.35")
        );

        QuickSearchResponse.TopResult topResult = new QuickSearchResponse.TopResult("PLAYER", player, null);
        QuickSearchResponse response = new QuickSearchResponse(topResult, List.of(player), List.of());

        when(searchService.quickSearch("cold", 8)).thenReturn(response);

        mockMvc.perform(get("/search")
                        .param("q", "cold")
                        .param("limit", "8")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.topResult.type").value("PLAYER"))
                .andExpect(jsonPath("$.topResult.player.username").value("coldzera"))
                .andExpect(jsonPath("$.players[0].kurageId").value(1001))
                .andExpect(jsonPath("$.players[0].highlightStat.label").value("K/D"));
    }

    @Test
    void testFullSearch() throws Exception {
        SearchTeamResult team = new SearchTeamResult(
                UUID.randomUUID(),
                "Imperial Esports",
                "IMP",
                "https://logo.url",
                "BR",
                800,
                5
        );

        FullSearchResponse.SearchResultPage<SearchTeamResult> teamPage =
                new FullSearchResponse.SearchResultPage<>(List.of(team), 1L, 1, 0);
        FullSearchResponse.SearchResultPage<SearchPlayerResult> emptyPlayerPage =
                new FullSearchResponse.SearchResultPage<>(List.of(), 0L, 0, 0);

        FullSearchResponse response = new FullSearchResponse("imp", "TEAMS", emptyPlayerPage, teamPage);

        when(searchService.fullSearch("imp", "TEAMS", 0, 20)).thenReturn(response);

        mockMvc.perform(get("/search/full")
                        .param("q", "imp")
                        .param("type", "TEAMS")
                        .param("page", "0")
                        .param("size", "20")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.query").value("imp"))
                .andExpect(jsonPath("$.type").value("TEAMS"))
                .andExpect(jsonPath("$.teams.totalElements").value(1))
                .andExpect(jsonPath("$.teams.content[0].tag").value("IMP"));
    }

    @Test
    void testSearchPlayersForInvite() throws Exception {
        SearchPlayerResult player = new SearchPlayerResult(
                UUID.randomUUID(),
                1002L,
                "kscerato",
                "https://avatar.url",
                "BR",
                10,
                980,
                "RIFLER",
                "FUR",
                "FURIA",
                new BigDecimal("1.45"),
                3000,
                10,
                new BigDecimal("1.30"),
                true,
                new SearchPlayerResult.HighlightStat("K/D", "1.45")
        );

        when(searchService.searchPlayersForInvite("ksc", 10)).thenReturn(List.of(player));

        mockMvc.perform(get("/search/players")
                        .param("q", "ksc")
                        .param("limit", "10")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].username").value("kscerato"))
                .andExpect(jsonPath("$[0].kurageElo").value(980));
    }
}
