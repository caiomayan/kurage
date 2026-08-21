package com.kurage.api.dto.redis;

public record RefreshTokenSession(
        String userId,
        String deviceId,
        String userAgent,
        String familyId,
        Long rotatedAtEpochSecond,
        String replacedByTokenHash
) {
}
