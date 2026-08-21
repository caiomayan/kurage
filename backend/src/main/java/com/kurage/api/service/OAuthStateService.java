package com.kurage.api.service;

import com.kurage.api.dto.redis.OAuthStateSession;
import com.kurage.api.dto.redis.RefreshTokenSession;
import com.kurage.api.security.TokenGenerationUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class OAuthStateService {

    public static final String DISCORD_PROVIDER = "discord";
    public static final String SPOTIFY_PROVIDER = "spotify";

    private static final String REDIS_KEY_PREFIX = "oauth_state:";
    private static final Duration STATE_TTL = Duration.ofMinutes(10);
    private static final int MAX_GENERATION_ATTEMPTS = 3;

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public String createState(String provider, RefreshTokenSession refreshSession) {
        String normalizedProvider = normalizeProvider(provider);
        OAuthStateSession stateSession = new OAuthStateSession(
                normalizedProvider,
                refreshSession.userId(),
                refreshSession.familyId()
        );

        final String serializedState;
        try {
            serializedState = objectMapper.writeValueAsString(stateSession);
        } catch (JacksonException e) {
            throw new IllegalStateException("Could not serialize OAuth state", e);
        }

        for (int attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
            String state = TokenGenerationUtils.generateRefreshToken();
            Boolean created = redisTemplate.opsForValue().setIfAbsent(
                    redisKey(normalizedProvider, state),
                    serializedState,
                    STATE_TTL
            );
            if (Boolean.TRUE.equals(created)) {
                return state;
            }
        }

        throw new IllegalStateException("Could not allocate a unique OAuth state");
    }

    public OAuthStateSession consumeState(String provider, String state) {
        if (state == null || state.isBlank()) {
            return null;
        }

        String normalizedProvider = normalizeProvider(provider);
        String serializedState = redisTemplate.opsForValue()
                .getAndDelete(redisKey(normalizedProvider, state));
        if (serializedState == null) {
            return null;
        }

        try {
            OAuthStateSession stateSession = objectMapper.readValue(serializedState, OAuthStateSession.class);
            if (!normalizedProvider.equals(stateSession.provider())) {
                log.warn("OAuth state provider mismatch");
                return null;
            }
            return stateSession;
        } catch (JacksonException e) {
            log.warn("Discarding malformed OAuth state", e);
            return null;
        }
    }

    private String redisKey(String provider, String state) {
        return REDIS_KEY_PREFIX + provider + ":" + state;
    }

    private String normalizeProvider(String provider) {
        if (provider == null || provider.isBlank()) {
            throw new IllegalArgumentException("OAuth provider is required");
        }
        return provider.toLowerCase(Locale.ROOT);
    }
}
