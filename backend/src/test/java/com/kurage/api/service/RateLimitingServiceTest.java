package com.kurage.api.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RateLimitingServiceTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    private RateLimitingService rateLimitingService;

    @BeforeEach
    void setUp() {
        rateLimitingService = new RateLimitingService(redisTemplate);
    }

    @Test
    void allowGlobalIp_withinLimit_shouldReturnTrue() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.increment(anyString())).thenReturn(5L);

        boolean allowed = rateLimitingService.allowGlobalIp("127.0.0.1");

        assertTrue(allowed);
    }

    @Test
    void allowGlobalIp_firstRequest_shouldSetTtlAndReturnTrue() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.increment(anyString())).thenReturn(1L);

        boolean allowed = rateLimitingService.allowGlobalIp("127.0.0.1");

        assertTrue(allowed);
        verify(redisTemplate).expire(anyString(), any(Duration.class));
    }

    @Test
    void allowGlobalIp_exceededLimit_shouldReturnFalse() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.increment(anyString())).thenReturn(61L);

        boolean allowed = rateLimitingService.allowGlobalIp("127.0.0.1");

        assertFalse(allowed);
    }

    @Test
    void allowGlobalIp_redisDown_shouldFailOpenAndReturnTrue() {
        when(redisTemplate.opsForValue()).thenThrow(new RedisConnectionFailureException("Connection refused"));

        boolean allowed = rateLimitingService.allowGlobalIp("127.0.0.1");

        // Fail Open: não derruba a API se o Redis cair
        assertTrue(allowed);
    }

    @Test
    void allowSearch_redisDown_shouldFailOpen() {
        when(redisTemplate.opsForValue()).thenThrow(new RuntimeException("Redis timeout"));

        boolean allowed = rateLimitingService.allowSearch("192.168.1.100");

        assertTrue(allowed);
    }

    @Test
    void allowHovercard_redisDown_shouldFailOpen() {
        when(redisTemplate.opsForValue()).thenThrow(new RuntimeException("Redis cluster down"));

        boolean allowed = rateLimitingService.allowHovercard("10.0.0.5");

        assertTrue(allowed);
    }
}
