package com.kurage.api.service;

import com.kurage.api.domain.SubscriptionTier;
import com.kurage.api.domain.User;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;

@Service
public class SubscriptionService {

    public SubscriptionTier getTier(User user) {
        if (user == null) {
            return SubscriptionTier.FREE;
        }

        SubscriptionTier tier = user.getSubscriptionTier();
        if (tier == null) {
            return SubscriptionTier.FREE;
        }

        // Se possuir data de expiração e ela já tiver passado, retorna FREE
        if (user.getSubscriptionExpiresAt() != null && user.getSubscriptionExpiresAt().isBefore(OffsetDateTime.now())) {
            return SubscriptionTier.FREE;
        }

        return tier;
    }

    public boolean isVip(User user) {
        return getTier(user) != SubscriptionTier.FREE;
    }

    public boolean hasFeature(User user, String feature) {
        if (user == null) {
            return false;
        }
        return getTier(user).has(feature);
    }
}
