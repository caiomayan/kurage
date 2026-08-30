package com.kurage.api.integration;

import com.kurage.api.domain.User;
import com.kurage.api.dto.redis.OAuthStateSession;
import com.kurage.api.dto.redis.RefreshTokenSession;
import com.kurage.api.dto.response.UserContactResponse;
import com.kurage.api.dto.response.UserResponse;
import com.kurage.api.repository.UserRepository;
import com.kurage.api.service.OAuthStateService;
import com.kurage.api.service.RateLimitingService;
import com.kurage.api.service.RefreshTokenService;
import com.kurage.api.service.SteamLoginStateService;
import com.kurage.api.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.Executors;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

class ContactAndRedisIT extends IntegrationTestSupport {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserService userService;

    @Autowired
    private OAuthStateService oauthStateService;

    @Autowired
    private SteamLoginStateService steamLoginStateService;

    @Autowired
    private RefreshTokenService refreshTokenService;

    @Autowired
    private RateLimitingService rateLimitingService;

    @Test
    void storesPrivateContactInPostgresAndKeepsItOutOfPublicUserResponse() {
        User user = userRepository.save(User.builder()
                .kurageId(9_000_002L)
                .username("private_contact_user")
                .steamId64("76561198090000002")
                .build());

        UserContactResponse contact = userService.updateContact(
                user,
                "  PLAYER@EXAMPLE.COM ",
                "+55 (85) 99999-9999"
        );

        assertThat(contact.email()).isEqualTo("player@example.com");
        assertThat(contact.phoneNumber()).isEqualTo("+5585999999999");

        User persisted = userRepository.findById(user.getId()).orElseThrow();
        assertThat(persisted.getEmail()).isEqualTo("player@example.com");
        assertThat(persisted.getPhoneE164()).isEqualTo("+5585999999999");
        assertThat(UserResponse.create(persisted).toString())
                .doesNotContain("player@example.com", "+5585999999999");
    }

    @Test
    void consumesOAuthStateExactlyOnceUsingRealRedisAtomicGetAndDelete() {
        RefreshTokenSession refreshSession = new RefreshTokenSession(
                UUID.randomUUID().toString(),
                "device-1",
                "integration-test",
                UUID.randomUUID().toString(),
                null,
                null
        );

        String state = oauthStateService.createState("DISCORD", refreshSession);

        assertThat(redisTemplate.hasKey("oauth_state:discord:" + state)).isTrue();
        OAuthStateSession consumed = oauthStateService.consumeState("discord", state);
        assertThat(consumed).isNotNull();
        assertThat(consumed.provider()).isEqualTo("discord");
        assertThat(consumed.userId()).isEqualTo(refreshSession.userId());
        assertThat(consumed.refreshTokenFamilyId()).isEqualTo(refreshSession.familyId());
        assertThat(redisTemplate.hasKey("oauth_state:discord:" + state)).isFalse();
        assertThat(oauthStateService.consumeState("discord", state)).isNull();
    }

    @Test
    void consumesSteamLoginStateExactlyOnce() {
        String state = steamLoginStateService.createState("/inventory?from=steam");

        assertThat(steamLoginStateService.consumeState(state)).isEqualTo("/inventory?from=steam");
        assertThat(steamLoginStateService.consumeState(state)).isNull();
    }

    @Test
    void storesOnlyRefreshTokenHashesAndRotatesAtomically() throws Exception {
        String token = refreshTokenService.createRefreshToken(
                "76561198090000003",
                "device-integration",
                "integration-test"
        );

        assertThat(redisTemplate.hasKey("refresh:" + token)).isFalse();
        RefreshTokenSession originalSession = refreshTokenService.validateCurrentRefreshToken(token);
        assertThat(originalSession).isNotNull();
        String familyKey = "family:" + originalSession.familyId();
        redisTemplate.expire(familyKey, java.time.Duration.ofSeconds(5));

        try (var executor = Executors.newFixedThreadPool(8)) {
            Callable<String> rotation = () -> refreshTokenService.rotateRefreshToken(token, "device-integration");
            var futures = executor.invokeAll(IntStream.range(0, 8)
                    .mapToObj(ignored -> rotation)
                    .toList());

            var rotatedTokens = futures.stream()
                    .map(future -> {
                        try {
                            return future.get();
                        } catch (Exception exception) {
                            throw new AssertionError(exception);
                        }
                    })
                    .collect(java.util.stream.Collectors.toSet());

            assertThat(rotatedTokens).hasSize(1).doesNotContainNull();
            String rotatedToken = rotatedTokens.iterator().next();
            assertThat(rotatedToken).isNotEqualTo(token);
            assertThat(redisTemplate.hasKey("refresh:" + rotatedToken)).isFalse();
            assertThat(refreshTokenService.validateCurrentRefreshToken(rotatedToken)).isNotNull();
            assertThat(redisTemplate.getExpire(familyKey)).isBetween(1L, 5L);
        }
    }

    @Test
    void appliesRateLimitCounterAndTtlAtomicallyInRealRedis() {
        for (int request = 0; request < 60; request++) {
            assertThat(rateLimitingService.allowGlobalIp("203.0.113.10")).isTrue();
        }
        assertThat(rateLimitingService.allowGlobalIp("203.0.113.10")).isFalse();

        var keys = redisTemplate.keys("ratelimit:global:ip:203.0.113.10:*");
        assertThat(keys).hasSize(1);
        Long ttl = redisTemplate.getExpire(keys.iterator().next());
        assertThat(ttl).isBetween(1L, 70L);
    }

    @Test
    void limitsImageUploadsPerAuthenticatedUserInRealRedis() {
        String userId = UUID.randomUUID().toString();
        for (int request = 0; request < 10; request++) {
            assertThat(rateLimitingService.allowImageUpload(userId)).isTrue();
        }
        assertThat(rateLimitingService.allowImageUpload(userId)).isFalse();

        var keys = redisTemplate.keys("ratelimit:image-upload:user:" + userId + ":*");
        assertThat(keys).hasSize(1);
        assertThat(redisTemplate.getExpire(keys.iterator().next())).isBetween(1L, 70L);
    }
}
