package com.kurage.api.integration;

import com.kurage.api.dto.redis.OAuthStateSession;
import com.kurage.api.dto.redis.RefreshTokenSession;
import com.kurage.api.service.OAuthStateService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * OAuth state consumption against a real Redis.
 *
 * <p>Replay protection rests on {@code GETDEL} being atomic: a state is readable
 * exactly once, so a captured callback cannot be replayed. With a mocked
 * template the delete is only an assertion about a call, never a property of the
 * store, which is precisely what docs/pt/13 relies on.
 */
class OAuthStateConsumptionIT extends IntegrationTestSupport {

    @Autowired
    private OAuthStateService oAuthStateService;

    private static final RefreshTokenSession SESSION = new RefreshTokenSession(
            "76561198000000010", "device-oauth", "JUnit", "family-oauth", null, null);

    @Test
    void consumesAStateExactlyOnce() {
        String state = oAuthStateService.createState(OAuthStateService.DISCORD_PROVIDER, SESSION);

        OAuthStateSession first = oAuthStateService.consumeState(OAuthStateService.DISCORD_PROVIDER, state);
        assertThat(first).isNotNull();
        assertThat(first.userId()).isEqualTo(SESSION.userId());
        assertThat(first.refreshTokenFamilyId()).isEqualTo(SESSION.familyId());

        assertThat(oAuthStateService.consumeState(OAuthStateService.DISCORD_PROVIDER, state))
                .as("a replayed state must not resolve a second time")
                .isNull();
    }

    @Test
    void onlyOneRacerCanConsumeTheSameState() throws Exception {
        String state = oAuthStateService.createState(OAuthStateService.SPOTIFY_PROVIDER, SESSION);

        int racers = 8;
        ExecutorService pool = Executors.newFixedThreadPool(racers);
        CyclicBarrier startTogether = new CyclicBarrier(racers);
        List<Callable<OAuthStateSession>> attempts = new ArrayList<>();
        for (int i = 0; i < racers; i++) {
            attempts.add(() -> {
                startTogether.await(10, TimeUnit.SECONDS);
                return oAuthStateService.consumeState(OAuthStateService.SPOTIFY_PROVIDER, state);
            });
        }

        List<Future<OAuthStateSession>> results = pool.invokeAll(attempts);
        pool.shutdown();
        assertThat(pool.awaitTermination(30, TimeUnit.SECONDS)).isTrue();

        long resolved = 0;
        for (Future<OAuthStateSession> result : results) {
            if (result.get() != null) {
                resolved++;
            }
        }
        assertThat(resolved).as("GETDEL must hand the state to exactly one caller").isEqualTo(1);
    }

    @Test
    void rejectsAStatePresentedToAnotherProvider() {
        String state = oAuthStateService.createState(OAuthStateService.DISCORD_PROVIDER, SESSION);

        assertThat(oAuthStateService.consumeState(OAuthStateService.SPOTIFY_PROVIDER, state))
                .as("a state is scoped to the provider that issued it")
                .isNull();
        assertThat(oAuthStateService.consumeState(OAuthStateService.DISCORD_PROVIDER, state))
                .as("the mismatched attempt must not have consumed the state")
                .isNotNull();
    }

    @Test
    void storesTheStateUnderATtlAndIgnoresBlankInput() {
        String state = oAuthStateService.createState(OAuthStateService.DISCORD_PROVIDER, SESSION);

        Long ttl = redisTemplate.getExpire("oauth_state:discord:" + state);
        assertThat(ttl).isNotNull();
        assertThat(ttl)
                .as("state must expire within the documented 10 minute window")
                .isGreaterThan(0L)
                .isLessThanOrEqualTo(600L);

        assertThat(oAuthStateService.consumeState(OAuthStateService.DISCORD_PROVIDER, null)).isNull();
        assertThat(oAuthStateService.consumeState(OAuthStateService.DISCORD_PROVIDER, "  ")).isNull();
        assertThatThrownBy(() -> oAuthStateService.createState("  ", SESSION))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
