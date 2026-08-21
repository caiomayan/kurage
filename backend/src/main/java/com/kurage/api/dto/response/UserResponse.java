package com.kurage.api.dto.response;

import com.kurage.api.domain.User;

import java.io.Serializable;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.UUID;

public record UserResponse(
        UUID id,
        Long kurageId,
        String username,
        String steamId64,
        String avatarUrl,
        String faceitUsername,
        String role,
        String primaryFunction,
        String secondaryFunction,
        String country,
        String subscriptionTier,
        OffsetDateTime subscriptionExpiresAt,
        boolean isVerifiedPro,
        PlayerStatsResponse stats,
        Integer faceitLevel,
        Integer rankPosition,
        Integer rankDelta,
        Instant createdAt,
        Instant updatedAt
) implements Serializable {

    public static UserResponse create(User user) {
        return create(user, null, null, null, null);
    }

    public static UserResponse create(User user, PlayerStatsResponse stats, Integer faceitLevel, Integer rankPosition, Integer rankDelta) {
        if (user == null) return null;
        return new UserResponse(
                user.getId(),
                user.getKurageId(),
                user.getUsername(),
                user.getSteamId64(),
                user.getAvatarUrl(),
                user.getFaceitUsername(),
                user.getRole() != null ? user.getRole().name() : null,
                user.getPrimaryFunction() != null ? user.getPrimaryFunction().name() : null,
                user.getSecondaryFunction() != null ? user.getSecondaryFunction().name() : null,
                user.getCountry(),
                user.getSubscriptionTier() != null ? user.getSubscriptionTier().name() : "FREE",
                user.getSubscriptionExpiresAt(),
                user.isVerifiedPro(),
                stats,
                faceitLevel,
                rankPosition,
                rankDelta,
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}