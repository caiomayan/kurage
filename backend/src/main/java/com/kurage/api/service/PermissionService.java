package com.kurage.api.service;

import com.kurage.api.domain.User;
import com.kurage.api.domain.UserRole;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PermissionService {

    private final SubscriptionService subscriptionService;

    public boolean hasFeature(User user, String featureName) {
        if (user == null) {
            return false;
        }

        // 1. ADMIN e OWNER têm acesso irrestrito
        if (user.getRole() == UserRole.ADMIN || user.getRole() == UserRole.OWNER) {
            return true;
        }

        // 2. Verifica a assinatura do usuário via SubscriptionService
        return subscriptionService.hasFeature(user, featureName);
    }
}
