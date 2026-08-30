package com.kurage.api.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kurage.api.dto.redis.RefreshTokenSession;
import com.kurage.api.security.TokenGenerationUtils;
import com.kurage.api.util.HashUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class RefreshTokenService {

    private static final String REDIS_KEY_PREFIX = "refresh:";
    private static final String REDIS_FAMILY_PREFIX = "family:";
    private static final String REDIS_GRACE_PREFIX = "refresh_grace:";
    private static final long TTL_DAYS = 30;
    private static final long GRACE_PERIOD_SECONDS = 10;
    private static final long TTL_SECONDS = Duration.ofDays(TTL_DAYS).toSeconds();
    private static final DefaultRedisScript<Long> CREATE_SCRIPT = new DefaultRedisScript<>("""
            redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[3])
            redis.call('SADD', KEYS[2], ARGV[2])
            redis.call('EXPIRE', KEYS[2], ARGV[3])
            return 1
            """, Long.class);
    private static final DefaultRedisScript<Long> ROTATE_SCRIPT = new DefaultRedisScript<>("""
            if redis.call('GET', KEYS[1]) ~= ARGV[1] then
                return 0
            end
            if redis.call('EXISTS', KEYS[3]) == 0 then
                return -1
            end
            redis.call('SET', KEYS[2], ARGV[2], 'EX', ARGV[6])
            redis.call('SADD', KEYS[3], ARGV[3])
            redis.call('SET', KEYS[1], ARGV[4], 'KEEPTTL')
            redis.call('SET', KEYS[4], ARGV[5], 'EX', ARGV[7])
            return 1
            """, Long.class);

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public String createRefreshToken(String steamId64, String deviceId, String userAgent) {
        return createRefreshToken(steamId64, deviceId, userAgent, UUID.randomUUID().toString());
    }

    private String createRefreshToken(String steamId64, String deviceId, String userAgent, String familyId) {
        String token = TokenGenerationUtils.generateRefreshToken();
        RefreshTokenSession session = new RefreshTokenSession(steamId64, deviceId, userAgent, familyId, null, null);
        String tokenHash = HashUtils.sha256(token);
        Long created = redisTemplate.execute(
                CREATE_SCRIPT,
                List.of(tokenKey(token), REDIS_FAMILY_PREFIX + familyId),
                serialize(session),
                tokenHash,
                Long.toString(TTL_SECONDS)
        );
        if (!Long.valueOf(1L).equals(created)) {
            throw new IllegalStateException("Could not persist refresh token session");
        }
        return token;
    }

    public RefreshTokenSession validateRefreshToken(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }
        String jsonValue = redisTemplate.opsForValue().get(tokenKey(token));
        if (jsonValue == null) {
            return null;
        }
        
        try {
            return objectMapper.readValue(jsonValue, RefreshTokenSession.class);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Error deserializing refresh token session", e);
        }
    }

    public RefreshTokenSession validateCurrentRefreshToken(String token) {
        RefreshTokenSession session = validateRefreshToken(token);
        if (session == null || session.rotatedAtEpochSecond() != null || !isTokenFamilyActive(session.familyId())) {
            return null;
        }
        return session;
    }

    public boolean isTokenFamilyActive(String familyId) {
        return familyId != null
                && !familyId.isBlank()
                && Boolean.TRUE.equals(redisTemplate.hasKey(REDIS_FAMILY_PREFIX + familyId));
    }

    public String rotateRefreshToken(String oldToken, String deviceId) {
        RefreshTokenSession session = validateRefreshToken(oldToken);
        if (session == null) {
            return null;
        }

        if (!secureEquals(session.deviceId(), deviceId)) {
            log.warn("Device ID mismatch on rotation attempt for family {}", session.familyId());
            revokeTokenFamily(session.familyId());
            return null;
        }

        if (session.rotatedAtEpochSecond() != null) {
            long secondsSinceRotation = Instant.now().getEpochSecond() - session.rotatedAtEpochSecond();
            if (secondsSinceRotation <= GRACE_PERIOD_SECONDS) {
                // Grace Period: buscar o novo token armazenado provisoriamente em texto puro
                String graceNewToken = redisTemplate.opsForValue().get(graceKey(oldToken));
                if (graceNewToken != null) {
                    log.info("Concurrent refresh detected within grace period for family {}", session.familyId());
                    return graceNewToken;
                }
            }
            
            // Reuse Detectado! O grace period expirou ou o token sumiu. Compromisso de sessão.
            log.warn("Reuse detected for refresh token in family {}. Revoking all tokens.", session.familyId());
            revokeTokenFamily(session.familyId());
            return null;
        }

        String oldSessionJson = serialize(session);

        String newToken = TokenGenerationUtils.generateRefreshToken();
        String newTokenHash = HashUtils.sha256(newToken);
        RefreshTokenSession newSession = new RefreshTokenSession(
                session.userId(),
                session.deviceId(),
                session.userAgent(),
                session.familyId(),
                null,
                null
        );

        RefreshTokenSession updatedSession = new RefreshTokenSession(
                session.userId(),
                session.deviceId(),
                session.userAgent(),
                session.familyId(),
                Instant.now().getEpochSecond(),
                newTokenHash
        );

        Long rotated = redisTemplate.execute(
                ROTATE_SCRIPT,
                List.of(
                        tokenKey(oldToken),
                        tokenKey(newToken),
                        REDIS_FAMILY_PREFIX + session.familyId(),
                        graceKey(oldToken)
                ),
                oldSessionJson,
                serialize(newSession),
                newTokenHash,
                serialize(updatedSession),
                newToken,
                Long.toString(TTL_SECONDS),
                Long.toString(GRACE_PERIOD_SECONDS)
        );

        if (Long.valueOf(1L).equals(rotated)) {
            return newToken;
        }

        // Another request won the compare-and-set. It can only receive the
        // exact token published by the winner during the short grace window.
        RefreshTokenSession currentSession = validateRefreshToken(oldToken);
        if (currentSession != null && currentSession.rotatedAtEpochSecond() != null) {
            return redisTemplate.opsForValue().get(graceKey(oldToken));
        }
        return null;
    }

    public void revokeRefreshToken(String token) {
        RefreshTokenSession session = validateRefreshToken(token);
        if (session != null) {
            revokeTokenFamily(session.familyId());
        }
    }

    private void revokeTokenFamily(String familyId) {
        String familyKey = REDIS_FAMILY_PREFIX + familyId;
        Set<String> tokens = redisTemplate.opsForSet().members(familyKey);
        if (tokens != null) {
            for (String tokenHash : tokens) {
                redisTemplate.delete(REDIS_KEY_PREFIX + tokenHash);
                redisTemplate.delete(REDIS_GRACE_PREFIX + tokenHash);
            }
        }
        redisTemplate.delete(familyKey);
    }

    private String serialize(RefreshTokenSession session) {
        try {
            return objectMapper.writeValueAsString(session);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Error serializing refresh token session", e);
        }
    }

    private static String tokenKey(String token) {
        return REDIS_KEY_PREFIX + HashUtils.sha256(token);
    }

    private static String graceKey(String token) {
        return REDIS_GRACE_PREFIX + HashUtils.sha256(token);
    }

    private static boolean secureEquals(String left, String right) {
        if (left == null || right == null) {
            return false;
        }
        return MessageDigest.isEqual(
                left.getBytes(StandardCharsets.UTF_8),
                right.getBytes(StandardCharsets.UTF_8)
        );
    }
}
