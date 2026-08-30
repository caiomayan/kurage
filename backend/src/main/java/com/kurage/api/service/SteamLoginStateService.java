package com.kurage.api.service;

import com.kurage.api.security.TokenGenerationUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
@RequiredArgsConstructor
public class SteamLoginStateService {

    static final String REDIS_KEY_PREFIX = "steam_login_state:";
    private static final Duration STATE_TTL = Duration.ofMinutes(10);
    private static final int MAX_ALLOCATION_ATTEMPTS = 5;
    private static final int STATE_LENGTH = 43;

    private final StringRedisTemplate redisTemplate;

    public String createState(String returnUrl) {
        for (int attempt = 0; attempt < MAX_ALLOCATION_ATTEMPTS; attempt++) {
            String state = TokenGenerationUtils.generateRefreshToken();
            Boolean created = redisTemplate.opsForValue().setIfAbsent(
                    REDIS_KEY_PREFIX + state,
                    returnUrl,
                    STATE_TTL
            );
            if (Boolean.TRUE.equals(created)) {
                return state;
            }
        }
        throw new IllegalStateException("Could not allocate a unique Steam login state");
    }

    public String consumeState(String state) {
        if (!isValidState(state)) {
            return null;
        }
        return redisTemplate.opsForValue().getAndDelete(REDIS_KEY_PREFIX + state);
    }

    static boolean isValidState(String state) {
        if (state == null || state.length() != STATE_LENGTH) {
            return false;
        }
        for (int index = 0; index < state.length(); index++) {
            char character = state.charAt(index);
            boolean allowed = character >= 'a' && character <= 'z'
                    || character >= 'A' && character <= 'Z'
                    || character >= '0' && character <= '9'
                    || character == '-'
                    || character == '_';
            if (!allowed) {
                return false;
            }
        }
        return true;
    }
}
