package com.kurage.api.dto.redis;

public record OAuthStateSession(
        String provider,
        String userId,
        String refreshTokenFamilyId
) {
}
