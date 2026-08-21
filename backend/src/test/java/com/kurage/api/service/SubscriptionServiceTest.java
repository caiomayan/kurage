package com.kurage.api.service;

import com.kurage.api.domain.SubscriptionTier;
import com.kurage.api.domain.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;

import static org.junit.jupiter.api.Assertions.*;

class SubscriptionServiceTest {

    private SubscriptionService subscriptionService;

    @BeforeEach
    void setUp() {
        subscriptionService = new SubscriptionService();
    }

    @Test
    void testDefaultTierIsFree() {
        User user = new User();
        assertEquals(SubscriptionTier.FREE, subscriptionService.getTier(user));
        assertFalse(subscriptionService.isVip(user));
    }

    @Test
    void testActiveSubscriptionTier() {
        User user = User.builder()
                .subscriptionTier(SubscriptionTier.PRO)
                .subscriptionExpiresAt(OffsetDateTime.now().plusDays(30))
                .build();

        assertEquals(SubscriptionTier.PRO, subscriptionService.getTier(user));
        assertTrue(subscriptionService.isVip(user));
        assertTrue(subscriptionService.hasFeature(user, "ADVANCED_STATS"));
        assertTrue(subscriptionService.hasFeature(user, "PROFILE_VISITORS"));
        assertFalse(subscriptionService.hasFeature(user, "MAX_BADGE"));
    }

    @Test
    void testExpiredSubscriptionFallsBackToFree() {
        User user = User.builder()
                .subscriptionTier(SubscriptionTier.MAX)
                .subscriptionExpiresAt(OffsetDateTime.now().minusDays(1))
                .build();

        assertEquals(SubscriptionTier.FREE, subscriptionService.getTier(user));
        assertFalse(subscriptionService.isVip(user));
        assertFalse(subscriptionService.hasFeature(user, "MAX_BADGE"));
    }
}
