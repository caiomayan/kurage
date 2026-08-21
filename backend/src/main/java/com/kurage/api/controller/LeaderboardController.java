package com.kurage.api.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kurage.api.domain.UserFaceit;
import com.kurage.api.dto.response.LeaderboardResponse;
import com.kurage.api.dto.response.PageResponse;
import com.kurage.api.dto.response.PlayerRankingContextResponse;
import com.kurage.api.dto.response.TeamLeaderboardResponse;
import com.kurage.api.repository.UserFaceitRepository;
import com.kurage.api.service.RankingService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/leaderboard")
@RequiredArgsConstructor
public class LeaderboardController {

    private final RankingService rankingService;
    private final UserFaceitRepository userFaceitRepository;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${faceit.leaderboard.cache.duration:600000}")
    private long cacheDurationMs;

    @GetMapping("/players")
    public ResponseEntity<PageResponse<LeaderboardResponse>> getPlayerRanking(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(rankingService.getPlayerRanking(page, size));
    }

    @GetMapping("/players/{kurageId}/context")
    public ResponseEntity<PlayerRankingContextResponse> getPlayerRankingContext(
            @PathVariable Long kurageId
    ) {
        return ResponseEntity.ok(rankingService.getPlayerContext(kurageId));
    }

    @GetMapping("/teams")
    public ResponseEntity<PageResponse<TeamLeaderboardResponse>> getTeamRanking(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(rankingService.getTeamRanking(page, size));
    }

    @GetMapping("/faceit")
    public ResponseEntity<PageResponse<LeaderboardResponse>> getFaceitLeaderboard(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        String cacheKey = "leaderboard:faceit:page:" + page + ":size:" + size;

        try {
            if (redisTemplate != null) {
                String cached = redisTemplate.opsForValue().get(cacheKey);
                if (cached != null) {
                    PageResponse<LeaderboardResponse> response = objectMapper.readValue(
                            cached,
                            new TypeReference<PageResponse<LeaderboardResponse>>() {}
                    );
                    return ResponseEntity.ok(response);
                }
            }
        } catch (Exception e) {
            // Log warning in real scenarios, ignore here
        }

        PageRequest pageRequest = PageRequest.of(page, size);
        Page<UserFaceit> dbPage = userFaceitRepository.findAllByOrderByEloDesc(pageRequest);

        List<LeaderboardResponse> dtos = dbPage.getContent().stream()
                .map(uf -> {
                    int index = dbPage.getContent().indexOf(uf);
                    int position = (page * size) + index + 1;
                    var user = uf.getUser();
                    return new LeaderboardResponse(
                            user != null ? user.getKurageId() : null,
                            user != null ? user.getSteamId64() : "",
                            user != null ? user.getUsername() : "Unknown",
                            user != null ? user.getAvatarUrl() : null,
                            user != null ? user.getCountry() : "BR",
                            uf.getLevel() != null ? uf.getLevel() : 1,
                            uf.getElo() != null ? uf.getElo() : 0,
                            uf.getKdRatio(),
                            uf.getWinRate(),
                            uf.getMatches(),
                            null,
                            position,
                            0,
                            user != null && user.getPrimaryFunction() != null ? user.getPrimaryFunction().name() : "CORINGA",
                            null,
                            user != null && user.isVerifiedPro()
                    );
                })
                .collect(Collectors.toList());

        String now = java.time.Instant.now().toString();
        String next = java.time.Instant.now().plusMillis(cacheDurationMs).toString();

        PageResponse<LeaderboardResponse> response = new PageResponse<>(
                dtos,
                dbPage.getNumber(),
                dbPage.getSize(),
                dbPage.getTotalElements(),
                dbPage.getTotalPages(),
                dbPage.isLast(),
                now,
                next
        );

        try {
            if (redisTemplate != null) {
                redisTemplate.opsForValue().set(
                        cacheKey,
                        objectMapper.writeValueAsString(response),
                        Duration.ofMillis(cacheDurationMs)
                );
            }
        } catch (Exception e) {
            // Ignore cache write errors
        }

        return ResponseEntity.ok(response);
    }
}
