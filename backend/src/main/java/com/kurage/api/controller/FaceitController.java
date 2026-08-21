package com.kurage.api.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kurage.api.domain.User;
import com.kurage.api.domain.UserFaceit;
import com.kurage.api.dto.response.FaceitResponse;
import com.kurage.api.repository.UserFaceitRepository;
import com.kurage.api.repository.UserRepository;
import com.kurage.api.service.FaceitService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class FaceitController {

    private final UserRepository userRepository;
    private final UserFaceitRepository userFaceitRepository;
    private final FaceitService faceitService;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${faceit.cache.duration:60000}")
    private long faceitCacheDurationMs;

    @GetMapping("/{steamId64}/faceit")
    public ResponseEntity<FaceitResponse> getFaceitData(@PathVariable String steamId64) {
        Optional<User> userOpt = userRepository.findBySteamId64(steamId64);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        User user = userOpt.get();
        if (user.getSteamId64() == null) {
            return ResponseEntity.ok(FaceitResponse.empty());
        }

        String cacheKey = "cache:faceit:steam:" + steamId64;
        try {
            String cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                FaceitResponse cachedResponse = objectMapper.readValue(cached, FaceitResponse.class);
                return ResponseEntity.ok(FaceitResponse.fromCache(cachedResponse));
            }
        } catch (Exception e) {
            // Ignore read cache error
        }

        String faceitNotFoundKey = "faceit:notfound:" + user.getSteamId64();
        Optional<UserFaceit> dbFaceitOpt = userFaceitRepository.findById(user.getId());
        FaceitResponse faceitData = dbFaceitOpt
                .map(dbFaceit -> FaceitResponse.create(dbFaceit, user, false))
                .orElse(null);

        boolean needsUpdate = dbFaceitOpt
                .map(UserFaceit::getUpdatedAt)
                .map(updatedAt -> System.currentTimeMillis() - updatedAt.toEpochMilli() >= faceitCacheDurationMs)
                .orElse(true);
        boolean lookupPreviouslyMissed = false;
        try {
            lookupPreviouslyMissed = Boolean.TRUE.equals(redisTemplate.hasKey(faceitNotFoundKey));
        } catch (Exception e) {
            // Redis is an optimization; a cache outage must not hide persisted data.
        }

        if (needsUpdate && !lookupPreviouslyMissed) {
            try {
                Optional<FaceitResponse> apiOpt = faceitService.getFaceitDataBySteamId(user.getSteamId64());
                if (apiOpt.isPresent()) {
                    FaceitResponse res = apiOpt.get();
                    faceitData = res;

                    if (user.getFaceitUsername() == null || !user.getFaceitUsername().equals(res.username())) {
                        user.setFaceitUsername(res.username());
                        userRepository.save(user);
                    }

                    UserFaceit uf = dbFaceitOpt.orElseGet(() -> UserFaceit.builder()
                            .user(user)
                            .userId(user.getId())
                            .build());
                    uf.setLevel(res.level());
                    uf.setElo(res.elo());
                    uf.setKdRatio(res.kdRatio() != null ? res.kdRatio() : BigDecimal.ZERO);
                    uf.setWinRate(res.winRate());
                    uf.setMatches(res.matches());
                    if (uf.getFaceitId() == null) {
                        uf.setFaceitId(user.getSteamId64());
                    }
                    userFaceitRepository.save(uf);
                } else {
                    redisTemplate.opsForValue().set(faceitNotFoundKey, "true", Duration.ofHours(24));
                }
            } catch (Exception e) {
                System.err.println("Faceit integration error: " + e.getMessage());
            }
        }

        if (faceitData == null) {
            faceitData = FaceitResponse.empty();
        } else {
            try {
                redisTemplate.opsForValue().set(
                        cacheKey,
                        objectMapper.writeValueAsString(faceitData),
                        Duration.ofMillis(faceitCacheDurationMs)
                );
            } catch (Exception e) {
                // Ignore write cache error
            }
        }

        return ResponseEntity.ok(faceitData);
    }
}
