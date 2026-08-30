package com.kurage.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class RateLimitingService {

    private static final DefaultRedisScript<Long> INCREMENT_WITH_TTL_SCRIPT = new DefaultRedisScript<>("""
            local count = redis.call('INCR', KEYS[1])
            if count == 1 then
                redis.call('EXPIRE', KEYS[1], ARGV[1])
            end
            return count
            """, Long.class);
    private static final String WINDOW_TTL_SECONDS = "70";

    private final StringRedisTemplate redisTemplate;

    private boolean isAllowed(String identifier, int maxRequestsPerMinute, boolean failOpen) {
        try {
            long currentMinute = System.currentTimeMillis() / 60000;
            String key = "ratelimit:" + identifier + ":" + currentMinute;
            Long count = redisTemplate.execute(
                    INCREMENT_WITH_TTL_SCRIPT,
                    List.of(key),
                    WINDOW_TTL_SECONDS
            );
            return count != null && count <= maxRequestsPerMinute;
        } catch (Exception e) {
            log.warn("Redis unavailable for rate limiting (failOpen={} identifier={}): {}",
                    failOpen, identifier, e.getMessage());
            return failOpen;
        }
    }

    public boolean allowGlobalIp(String ip) {
        return isAllowed("global:ip:" + ip, 60, true);
    }

    /**
     * The private inventory is an interactive, server-authoritative workspace.
     * It must not be throttled by unrelated page traffic from a shared NAT/IP.
     */
    public boolean allowInventoryRead(String userId) {
        return isAllowed("inventory:read:user:" + userId, 120, true);
    }

    public boolean allowInventoryMutation(String userId) {
        return isAllowed("inventory:mutation:user:" + userId, 30, false);
    }

    public boolean allowImageUpload(String userId) {
        return isAllowed("image-upload:user:" + userId, 10, false);
    }

    public boolean allowAuthIp(String ip) {
        return isAllowed("auth:ip:" + ip, 10, false);
    }

    public boolean allowUserProfile(String identifier) {
        return isAllowed("profile:" + identifier, 15, true);
    }

    public boolean allowSearch(String ip) {
        return isAllowed("search:ip:" + ip, 30, true);
    }

    public boolean allowHovercard(String ip) {
        return isAllowed("hovercard:ip:" + ip, 60, true);
    }

    public boolean allowInviteLink(String userId) {
        return isAllowed("invite:user:" + userId, 5, false);
    }

    public boolean allowJoinRequest(String userId) {
        return isAllowed("joinreq:user:" + userId, 10, false);
    }
}
