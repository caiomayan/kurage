package com.kurage.api.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kurage.api.dto.redis.RefreshTokenSession;
import com.kurage.api.security.TokenGenerationUtils;
import com.kurage.api.util.HashUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
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

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public String createRefreshToken(String steamId64, String deviceId, String userAgent) {
        return createRefreshToken(steamId64, deviceId, userAgent, UUID.randomUUID().toString());
    }

    private String createRefreshToken(String steamId64, String deviceId, String userAgent, String familyId) {
        String token = TokenGenerationUtils.generateRefreshToken();
        RefreshTokenSession session = new RefreshTokenSession(steamId64, deviceId, userAgent, familyId, null, null);
        
        saveSessionToRedis(token, session);
        redisTemplate.opsForSet().add(REDIS_FAMILY_PREFIX + familyId, token);
        redisTemplate.expire(REDIS_FAMILY_PREFIX + familyId, Duration.ofDays(TTL_DAYS));
        
        return token;
    }

    private void saveSessionToRedis(String token, RefreshTokenSession session) {
        try {
            String jsonValue = objectMapper.writeValueAsString(session);
            redisTemplate.opsForValue().set(
                    REDIS_KEY_PREFIX + token,
                    jsonValue,
                    Duration.ofDays(TTL_DAYS)
            );
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Error serializing refresh token session", e);
        }
    }

    public RefreshTokenSession validateRefreshToken(String token) {
        String jsonValue = redisTemplate.opsForValue().get(REDIS_KEY_PREFIX + token);
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

        if (!session.deviceId().equals(deviceId)) {
            log.warn("Device ID mismatch on rotation attempt for family {}", session.familyId());
            revokeTokenFamily(session.familyId());
            return null;
        }

        if (session.rotatedAtEpochSecond() != null) {
            long secondsSinceRotation = Instant.now().getEpochSecond() - session.rotatedAtEpochSecond();
            if (secondsSinceRotation <= GRACE_PERIOD_SECONDS) {
                // Grace Period: buscar o novo token armazenado provisoriamente em texto puro
                String graceNewToken = redisTemplate.opsForValue().get(REDIS_GRACE_PREFIX + oldToken);
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

        // Fluxo Normal (Token não havia sido usado)
        String newToken = createRefreshToken(session.userId(), session.deviceId(), session.userAgent(), session.familyId());
        String newTokenHash = HashUtils.sha256(newToken);

        RefreshTokenSession updatedSession = new RefreshTokenSession(
                session.userId(),
                session.deviceId(),
                session.userAgent(),
                session.familyId(),
                Instant.now().getEpochSecond(),
                newTokenHash
        );

        saveSessionToRedis(oldToken, updatedSession); // Atualiza antigo como usado
        
        // Salva o token novo por apenas 10s em texto puro para tolerar race conditions (Grace Period)
        redisTemplate.opsForValue().set(REDIS_GRACE_PREFIX + oldToken, newToken, Duration.ofSeconds(GRACE_PERIOD_SECONDS));

        return newToken;
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
            for (String t : tokens) {
                redisTemplate.delete(REDIS_KEY_PREFIX + t);
                redisTemplate.delete(REDIS_GRACE_PREFIX + t);
            }
        }
        redisTemplate.delete(familyKey);
    }
}
