package com.kurage.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kurage.api.dto.redis.RefreshTokenSession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.SetOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.util.Set;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RefreshTokenServiceTest {

    private StringRedisTemplate redisTemplate;
    private ValueOperations<String, String> valueOperations;
    private SetOperations<String, String> setOperations;
    private RefreshTokenService service;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        redisTemplate = mock(StringRedisTemplate.class);
        valueOperations = (ValueOperations<String, String>) mock(ValueOperations.class);
        setOperations = (SetOperations<String, String>) mock(SetOperations.class);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(redisTemplate.opsForSet()).thenReturn(setOperations);
        service = new RefreshTokenService(redisTemplate);
    }

    @Test
    void revokingTokenDeletesEveryTokenAndGraceEntryInItsFamily() throws Exception {
        RefreshTokenSession session = new RefreshTokenSession(
                "76561198000000000",
                "device-id",
                "user-agent",
                "family-id",
                null,
                null
        );
        when(valueOperations.get("refresh:current-token"))
                .thenReturn(new ObjectMapper().writeValueAsString(session));
        when(setOperations.members("family:family-id"))
                .thenReturn(Set.of("current-token", "previous-token"));

        service.revokeRefreshToken("current-token");

        verify(redisTemplate).delete("refresh:current-token");
        verify(redisTemplate).delete("refresh_grace:current-token");
        verify(redisTemplate).delete("refresh:previous-token");
        verify(redisTemplate).delete("refresh_grace:previous-token");
        verify(redisTemplate).delete("family:family-id");
    }
}
