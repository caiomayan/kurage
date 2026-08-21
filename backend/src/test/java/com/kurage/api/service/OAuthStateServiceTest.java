package com.kurage.api.service;

import com.kurage.api.dto.redis.OAuthStateSession;
import com.kurage.api.dto.redis.RefreshTokenSession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.jackson.autoconfigure.JacksonAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class OAuthStateServiceTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(JacksonAutoConfiguration.class))
            .withBean(StringRedisTemplate.class, () -> mock(StringRedisTemplate.class))
            .withUserConfiguration(OAuthStateService.class);

    private StringRedisTemplate redisTemplate;
    private ValueOperations<String, String> valueOperations;
    private ObjectMapper objectMapper;
    private OAuthStateService service;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        redisTemplate = mock(StringRedisTemplate.class);
        valueOperations = (ValueOperations<String, String>) mock(ValueOperations.class);
        objectMapper = new ObjectMapper();
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        service = new OAuthStateService(redisTemplate, objectMapper);
    }

    @Test
    void createsOpaqueStateBoundToProviderUserAndTokenFamily() throws Exception {
        when(valueOperations.setIfAbsent(anyString(), anyString(), eq(Duration.ofMinutes(10))))
                .thenReturn(true);
        RefreshTokenSession refreshSession = new RefreshTokenSession(
                "76561198000000000",
                "device-id",
                "user-agent",
                "family-id",
                null,
                null
        );

        String state = service.createState(OAuthStateService.DISCORD_PROVIDER, refreshSession);

        assertNotNull(state);
        assertFalse(state.isBlank());
        assertFalse(state.contains(refreshSession.userId()));
        assertFalse(state.contains(refreshSession.familyId()));

        ArgumentCaptor<String> keyCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> valueCaptor = ArgumentCaptor.forClass(String.class);
        verify(valueOperations).setIfAbsent(
                keyCaptor.capture(),
                valueCaptor.capture(),
                eq(Duration.ofMinutes(10))
        );
        assertTrue(keyCaptor.getValue().startsWith("oauth_state:discord:"));
        assertTrue(keyCaptor.getValue().endsWith(state));

        OAuthStateSession storedSession = objectMapper.readValue(valueCaptor.getValue(), OAuthStateSession.class);
        assertEquals(OAuthStateService.DISCORD_PROVIDER, storedSession.provider());
        assertEquals(refreshSession.userId(), storedSession.userId());
        assertEquals(refreshSession.familyId(), storedSession.refreshTokenFamilyId());
    }

    @Test
    void consumesStateAtomicallyAndOnlyOnce() throws Exception {
        OAuthStateSession storedSession = new OAuthStateSession(
                OAuthStateService.SPOTIFY_PROVIDER,
                "76561198000000000",
                "family-id"
        );
        String redisValue = objectMapper.writeValueAsString(storedSession);
        when(valueOperations.getAndDelete("oauth_state:spotify:opaque-state"))
                .thenReturn(redisValue, (String) null);

        OAuthStateSession firstConsumption = service.consumeState(
                OAuthStateService.SPOTIFY_PROVIDER,
                "opaque-state"
        );
        OAuthStateSession secondConsumption = service.consumeState(
                OAuthStateService.SPOTIFY_PROVIDER,
                "opaque-state"
        );

        assertEquals(storedSession, firstConsumption);
        assertNull(secondConsumption);
    }

    @Test
    void startsWithSpringBoot4JacksonObjectMapper() {
        contextRunner.run(context -> {
            assertNull(context.getStartupFailure());
            assertNotNull(context.getBean(ObjectMapper.class));
            assertNotNull(context.getBean(OAuthStateService.class));
        });
    }
}
