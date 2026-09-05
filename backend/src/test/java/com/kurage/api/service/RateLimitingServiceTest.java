package com.kurage.api.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * Failure-injection coverage for the limiter.
 *
 * <p>Counting and window behaviour live in {@code RateLimitWindowIT} against a
 * real Redis. What remains here is the one thing a real container cannot express
 * without taking the shared instance down mid-suite: how each route behaves when
 * Redis is unreachable. docs/pt/13 requires public reads to fail open and
 * security-sensitive routes to fail closed.
 */
@ExtendWith(MockitoExtension.class)
class RateLimitingServiceTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    private RateLimitingService rateLimitingService;

    @BeforeEach
    void setUp() {
        rateLimitingService = new RateLimitingService(redisTemplate);
    }

    @Test
    void publicReadLimitFailsOpenWhenRedisIsDown() {
        scriptFails(new RedisConnectionFailureException("Connection refused"));
        assertTrue(rateLimitingService.allowGlobalIp("127.0.0.1"));
    }

    @Test
    void authLimitFailsClosedWhenRedisIsDown() {
        scriptFails(new RedisConnectionFailureException("Connection refused"));
        assertFalse(rateLimitingService.allowAuthIp("127.0.0.1"));
    }

    @Test
    void inventoryMutationLimitFailsClosedWhenRedisIsDown() {
        scriptFails(new RedisConnectionFailureException("Connection refused"));
        assertFalse(rateLimitingService.allowInventoryMutation("user-id"));
    }

    @Test
    void imageUploadLimitFailsClosedWhenRedisIsDown() {
        scriptFails(new RedisConnectionFailureException("Connection refused"));
        assertFalse(rateLimitingService.allowImageUpload("user-id"));
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private void scriptFails(RuntimeException exception) {
        when(redisTemplate.execute(any(RedisScript.class), anyList(), eq("70"))).thenThrow(exception);
    }
}
