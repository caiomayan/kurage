package com.kurage.api.service;

import com.kurage.api.domain.SubscriptionTier;
import com.kurage.api.domain.User;
import org.springframework.stereotype.Service;

@Service
public class SubscriptionService {

    public SubscriptionTier getTier(User user) {
        if (user == null) {
            return SubscriptionTier.FREE;
        }

        return user.getEffectiveSubscriptionTier();
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
