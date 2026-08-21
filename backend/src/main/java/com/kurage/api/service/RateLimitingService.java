package com.kurage.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Slf4j
@Service
@RequiredArgsConstructor
public class RateLimitingService {

    private final StringRedisTemplate redisTemplate;

    // Fixed Window Counter strategy (Janela Fixa de 1 minuto) com Fail-Open em caso de queda do Redis
    private boolean isAllowed(String identifier, int maxRequestsPerMinute) {
        try {
            long currentMinute = System.currentTimeMillis() / 60000;
            String key = "ratelimit:" + identifier + ":" + currentMinute;

            Long count = redisTemplate.opsForValue().increment(key);

            // Se for o primeiro request do minuto, setar o TTL para expirar essa chave e liberar memória
            if (count != null && count == 1L) {
                redisTemplate.expire(key, Duration.ofSeconds(60));
            }

            return count != null && count <= maxRequestsPerMinute;
        } catch (Exception e) {
            log.warn("Redis unavailable for rate limiting (failing open for identifier {}): {}", identifier, e.getMessage());
            return true; // Fail Open: permite a requisição em caso de indisponibilidade do Redis
        }
    }

    public boolean allowGlobalIp(String ip) {
        return isAllowed("global:ip:" + ip, 60);
    }

    public boolean allowAuthIp(String ip) {
        return isAllowed("auth:ip:" + ip, 10);
    }

    public boolean allowUserProfile(String identifier) {
        return isAllowed("profile:" + identifier, 15);
    }

    public boolean allowSearch(String ip) {
        return isAllowed("search:ip:" + ip, 30);
    }

    public boolean allowHovercard(String ip) {
        return isAllowed("hovercard:ip:" + ip, 60);
    }

    public boolean allowInviteLink(String userId) {
        return isAllowed("invite:user:" + userId, 5);
    }

    public boolean allowJoinRequest(String userId) {
        return isAllowed("joinreq:user:" + userId, 10);
    }
}
