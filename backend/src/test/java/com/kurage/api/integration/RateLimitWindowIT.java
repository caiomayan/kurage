package com.kurage.api.integration;

import com.kurage.api.service.RateLimitingService;
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
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.IntConsumer;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Rate limiting against a real Redis.
 *
 * <p>The counter is an {@code INCR} plus a conditional {@code EXPIRE} inside one
 * Lua script, so a burst can neither lose increments nor leave a key without a
 * TTL. Neither property is observable through a mocked template, which simply
 * returns whatever the test told it to.
 */
class RateLimitWindowIT extends IntegrationTestSupport {

    @Autowired
    private RateLimitingService rateLimitingService;

    @Test
    void countsEveryRequestInTheWindowAndStopsAtTheDocumentedLimit() {
        withinOneWindow(attempt -> {
            String ip = "203.0.113.10." + attempt;

            // docs/pt/02: authenticated routes allow 10 requests per minute per IP.
            for (int i = 1; i <= 10; i++) {
                assertThat(rateLimitingService.allowAuthIp(ip))
                        .as("request %d must be inside the window", i)
                        .isTrue();
            }
            assertThat(rateLimitingService.allowAuthIp(ip))
                    .as("the 11th request must be rejected")
                    .isFalse();
        });
    }

    @Test
    void appliesAWindowTtlSoACounterCannotLeakForever() {
        String ip = "203.0.113.11";
        rateLimitingService.allowSearch(ip);

        List<String> keys = new ArrayList<>(redisTemplate.keys("ratelimit:search:ip:" + ip + ":*"));
        assertThat(keys).hasSize(1);

        Long ttl = redisTemplate.getExpire(keys.getFirst());
        assertThat(ttl).isNotNull();
        assertThat(ttl)
                .as("the first increment must attach the 70s window TTL")
                .isGreaterThan(0L)
                .isLessThanOrEqualTo(70L);
    }

    @Test
    void losesNoIncrementUnderConcurrentBursts() throws Exception {
        String ip = "203.0.113.12";
        int racers = 30; // hovercards allow 60/min, so every racer stays inside the window
        // The pool must hold every party: a barrier of N with fewer threads can
        // never trip, which is a hang, not a race.
        ExecutorService pool = Executors.newFixedThreadPool(racers);
        CyclicBarrier startTogether = new CyclicBarrier(racers);
        AtomicInteger allowed = new AtomicInteger();

        List<Callable<Void>> burst = new ArrayList<>();
        for (int i = 0; i < racers; i++) {
            burst.add(() -> {
                startTogether.await(10, TimeUnit.SECONDS);
                if (rateLimitingService.allowHovercard(ip)) {
                    allowed.incrementAndGet();
                }
                return null;
            });
        }

        for (Future<Void> future : pool.invokeAll(burst)) {
            future.get();
        }
        pool.shutdown();
        assertThat(pool.awaitTermination(30, TimeUnit.SECONDS)).isTrue();

        assertThat(allowed.get()).isEqualTo(racers);

        List<String> keys = new ArrayList<>(redisTemplate.keys("ratelimit:hovercard:ip:" + ip + ":*"));
        assertThat(keys).hasSize(1);
        assertThat(redisTemplate.opsForValue().get(keys.getFirst()))
                .as("INCR must have counted every concurrent request exactly once")
                .isEqualTo(Integer.toString(racers));
    }

    @Test
    void keepsIdentifiersIsolatedFromEachOther() {
        withinOneWindow(attempt -> {
            String noisy = "203.0.113.13." + attempt;
            String quiet = "203.0.113.14." + attempt;

            for (int i = 0; i < 10; i++) {
                rateLimitingService.allowAuthIp(noisy);
            }

            assertThat(rateLimitingService.allowAuthIp(noisy)).isFalse();
            assertThat(rateLimitingService.allowAuthIp(quiet))
                    .as("one exhausted identifier must not throttle another")
                    .isTrue();
        });
    }

    /**
     * Counters are bucketed per wall-clock minute, so a burst that straddles a
     * minute boundary legitimately resets and would fail a limit assertion. This
     * reruns the body with a fresh identifier when the boundary is crossed,
     * rather than leaving a rare CI flake in the suite.
     */
    private void withinOneWindow(IntConsumer body) {
        for (int attempt = 0; attempt < 3; attempt++) {
            long before = System.currentTimeMillis() / 60_000;
            body.accept(attempt);
            long after = System.currentTimeMillis() / 60_000;
            if (before == after) {
                return;
            }
        }
        throw new AssertionError("rate limit window kept rolling over during the test");
    }
}
