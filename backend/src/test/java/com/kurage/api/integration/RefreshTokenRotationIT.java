package com.kurage.api.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.kurage.api.dto.redis.RefreshTokenSession;
import com.kurage.api.service.RefreshTokenService;
import com.kurage.api.util.HashUtils;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Refresh rotation against a real Redis.
 *
 * <p>The rotation is a compare-and-set written in Lua, and its whole point is
 * that concurrent refreshes from different tabs converge instead of revoking a
 * healthy session. A mocked {@code StringRedisTemplate} cannot execute Lua at
 * all, so the previous unit coverage asserted the calls were made without ever
 * proving the atomicity that docs/pt/13 promises. These cases exercise the real
 * script.
 */
class RefreshTokenRotationIT extends IntegrationTestSupport {

    private static final String TOKEN_PREFIX = "refresh:";
    private static final String FAMILY_PREFIX = "family:";
    private static final String GRACE_PREFIX = "refresh_grace:";

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private RefreshTokenService refreshTokenService;

    @Test
    void keepsOnlyHashedTokensInRedisAndRoundTripsTheSession() {
        String token = refreshTokenService.createRefreshToken("76561198000000001", "device-a", "JUnit");

        RefreshTokenSession session = refreshTokenService.validateRefreshToken(token);
        assertThat(session).isNotNull();
        assertThat(session.userId()).isEqualTo("76561198000000001");
        assertThat(session.deviceId()).isEqualTo("device-a");
        assertThat(session.rotatedAtEpochSecond()).isNull();

        Set<String> keys = redisTemplate.keys("*");
        assertThat(keys).isNotEmpty();
        assertThat(keys).anyMatch(k -> k.equals(TOKEN_PREFIX + HashUtils.sha256(token)));
        // The raw token must never appear in a key name.
        assertThat(keys).noneMatch(k -> k.contains(token));
        assertThat(refreshTokenService.isTokenFamilyActive(session.familyId())).isTrue();
    }

    @Test
    void concurrentRotationElectsOneWinnerAndConvergesOnTheSameToken() throws Exception {
        String original = refreshTokenService.createRefreshToken("76561198000000002", "device-b", "JUnit");

        int racers = 8;
        ExecutorService pool = Executors.newFixedThreadPool(racers);
        CyclicBarrier startTogether = new CyclicBarrier(racers);
        List<Callable<String>> attempts = new ArrayList<>();
        for (int i = 0; i < racers; i++) {
            attempts.add(() -> {
                startTogether.await(10, TimeUnit.SECONDS);
                return refreshTokenService.rotateRefreshToken(original, "device-b");
            });
        }

        List<Future<String>> results = pool.invokeAll(attempts);
        pool.shutdown();
        assertThat(pool.awaitTermination(30, TimeUnit.SECONDS)).isTrue();

        Set<String> issued = new HashSet<>();
        for (Future<String> result : results) {
            String token = result.get();
            assertThat(token)
                    .as("a concurrent refresh inside the grace window must not revoke the session")
                    .isNotNull();
            issued.add(token);
        }

        // Every racer converges on the single token published by the CAS winner.
        assertThat(issued).hasSize(1);
        String survivor = issued.iterator().next();
        assertThat(survivor).isNotEqualTo(original);
        assertThat(refreshTokenService.validateRefreshToken(survivor)).isNotNull();
    }

    @Test
    void reuseAfterTheGraceWindowRevokesTheWholeFamily() throws Exception {
        String original = refreshTokenService.createRefreshToken("76561198000000003", "device-c", "JUnit");
        String familyId = refreshTokenService.validateRefreshToken(original).familyId();

        String rotated = refreshTokenService.rotateRefreshToken(original, "device-c");
        assertThat(rotated).isNotNull();

        expireGraceWindow(original);

        assertThat(refreshTokenService.rotateRefreshToken(original, "device-c")).isNull();
        assertThat(refreshTokenService.isTokenFamilyActive(familyId)).isFalse();
        assertThat(refreshTokenService.validateRefreshToken(rotated)).isNull();
    }

    @Test
    void rotatingFromAnotherDeviceRevokesTheWholeFamily() {
        String token = refreshTokenService.createRefreshToken("76561198000000004", "device-d", "JUnit");
        String familyId = refreshTokenService.validateRefreshToken(token).familyId();

        assertThat(refreshTokenService.rotateRefreshToken(token, "device-stolen")).isNull();
        assertThat(refreshTokenService.isTokenFamilyActive(familyId)).isFalse();
        assertThat(refreshTokenService.validateRefreshToken(token)).isNull();
    }

    @Test
    void revokingATokenDropsItFromItsFamily() {
        String token = refreshTokenService.createRefreshToken("76561198000000005", "device-e", "JUnit");
        String familyId = refreshTokenService.validateRefreshToken(token).familyId();

        refreshTokenService.revokeRefreshToken(token);

        assertThat(refreshTokenService.validateRefreshToken(token)).isNull();
        assertThat(redisTemplate.opsForSet().isMember(
                FAMILY_PREFIX + familyId, HashUtils.sha256(token))).isFalse();
    }

    /**
     * Ages the stored rotation stamp past the grace period and drops the grace
     * entry, reproducing a reuse attempt that arrives too late without making
     * the suite sleep for the real window.
     */
    private void expireGraceWindow(String token) throws Exception {
        String key = TOKEN_PREFIX + HashUtils.sha256(token);
        String json = redisTemplate.opsForValue().get(key);
        assertThat(json).as("rotated session must still be stored").isNotNull();

        ObjectNode session = (ObjectNode) objectMapper.readTree(json);
        session.put("rotatedAtEpochSecond", Instant.now().getEpochSecond() - 600);
        redisTemplate.opsForValue().set(key, objectMapper.writeValueAsString(session));
        redisTemplate.delete(GRACE_PREFIX + HashUtils.sha256(token));
    }
}
