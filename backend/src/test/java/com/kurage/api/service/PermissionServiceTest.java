package com.kurage.api.service;

import com.kurage.api.domain.SubscriptionTier;
import com.kurage.api.domain.User;
import com.kurage.api.domain.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PermissionServiceTest {

    private SubscriptionService subscriptionService;
    private PermissionService permissionService;

    @BeforeEach
    void setUp() {
        subscriptionService = new SubscriptionService();
        permissionService = new PermissionService(subscriptionService);
    }

    @Test
    void testAdminAndOwnerHaveFullAccess() {
        User admin = User.builder().role(UserRole.ADMIN).subscriptionTier(SubscriptionTier.FREE).build();
        User owner = User.builder().role(UserRole.OWNER).subscriptionTier(SubscriptionTier.FREE).build();

        assertTrue(permissionService.hasFeature(admin, "ANY_FEATURE"));
        assertTrue(permissionService.hasFeature(owner, "ANY_FEATURE"));
    }

    @Test
    void testRegularUserFeaturesBasedOnSubscription() {
        User freeUser = User.builder().role(UserRole.USER).subscriptionTier(SubscriptionTier.FREE).build();
        User plusUser = User.builder().role(UserRole.USER).subscriptionTier(SubscriptionTier.PLUS).build();

        assertFalse(permissionService.hasFeature(freeUser, "PROFILE_VISITORS"));
        assertTrue(permissionService.hasFeature(plusUser, "PROFILE_VISITORS"));
        assertFalse(permissionService.hasFeature(plusUser, "ADVANCED_STATS"));
    }
}
