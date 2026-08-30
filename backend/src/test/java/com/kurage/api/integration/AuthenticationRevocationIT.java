package com.kurage.api.integration;

import com.kurage.api.domain.AccountStatus;
import com.kurage.api.domain.User;
import com.kurage.api.domain.UserRole;
import com.kurage.api.repository.UserRepository;
import com.kurage.api.security.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class AuthenticationRevocationIT extends IntegrationTestSupport {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private JwtService jwtService;

    @Test
    void usesCurrentDatabaseAuthorizationAndRevokesSuspendedAccountsImmediately() throws Exception {
        User user = userRepository.saveAndFlush(User.builder()
                .kurageId(9_200_001L)
                .username("auth_revocation_user")
                .steamId64("76561198192000001")
                .role(UserRole.USER)
                .build());

        String tokenWithStaleAdminClaim = jwtService.generateToken(
                user.getSteamId64(), UserRole.ADMIN.name(), user.getId().toString());

        mockMvc.perform(get("/actuator/prometheus")
                        .header("Authorization", "Bearer " + tokenWithStaleAdminClaim))
                .andExpect(status().isForbidden());

        user.setRole(UserRole.ADMIN);
        userRepository.saveAndFlush(user);

        mockMvc.perform(get("/actuator/prometheus")
                        .header("Authorization", "Bearer " + tokenWithStaleAdminClaim))
                .andExpect(status().isOk());

        user.setAccountStatus(AccountStatus.SUSPENDED);
        user.setSuspendedAt(OffsetDateTime.now());
        user.setSuspensionReason("integration test");
        userRepository.saveAndFlush(user);

        mockMvc.perform(get("/actuator/prometheus")
                        .header("Authorization", "Bearer " + tokenWithStaleAdminClaim))
                .andExpect(status().isUnauthorized());
    }
}
