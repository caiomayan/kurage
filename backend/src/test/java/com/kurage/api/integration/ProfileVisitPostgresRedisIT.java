package com.kurage.api.integration;

import com.kurage.api.domain.SubscriptionTier;
import com.kurage.api.domain.User;
import com.kurage.api.domain.UserRole;
import com.kurage.api.dto.response.ProfileVisitorResponse;
import com.kurage.api.repository.ProfileVisitRepository;
import com.kurage.api.repository.UserRepository;
import com.kurage.api.security.JwtService;
import com.kurage.api.service.ProfileVisitService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.web.servlet.MockMvc;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class ProfileVisitPostgresRedisIT extends IntegrationTestSupport {

    @Autowired private ProfileVisitService profileVisitService;
    @Autowired private ProfileVisitRepository profileVisitRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private JwtService jwtService;
    @Autowired private MockMvc mockMvc;

    @Test
    void enforcesAuthenticationAndEntitlementThroughTheHttpContract() throws Exception {
        User profile = saveUser(9_300_020L, "http_target", "76561198193000020");
        User visitor = saveUser(9_300_021L, "http_visitor", "76561198193000021");
        User mareViewer = saveUser(9_300_022L, "http_mare", "76561198193000022");
        mareViewer.setSubscriptionTier(SubscriptionTier.MARE);
        userRepository.saveAndFlush(mareViewer);

        String visitorToken = tokenFor(visitor);
        String mareToken = tokenFor(mareViewer);

        mockMvc.perform(post("/users/kurage/{kurageId}/visit", profile.getKurageId()))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/users/kurage/{kurageId}/visit", profile.getKurageId())
                        .header("Authorization", "Bearer " + visitorToken))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/users/kurage/{kurageId}/visitors", profile.getKurageId())
                        .header("Authorization", "Bearer " + visitorToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/users/kurage/{kurageId}/visitors", profile.getKurageId())
                        .header("Authorization", "Bearer " + mareToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].kurageId").value(visitor.getKurageId()))
                .andExpect(jsonPath("$[0].username").value(visitor.getUsername()))
                .andExpect(jsonPath("$[0].visitedAt").isNotEmpty())
                .andExpect(jsonPath("$[0].kurageElo").doesNotExist())
                .andExpect(jsonPath("$[0].kurageLevel").doesNotExist());
    }

    @Test
    void recordsRealVisitorsOncePerHourAndIgnoresSelfVisits() {
        User profile = saveUser(9_300_001L, "visited_profile", "76561198193000001");
        User visitor = saveUser(9_300_002L, "real_visitor", "76561198193000002");

        profileVisitService.recordVisitByKurageId(profile.getKurageId(), visitor);
        profileVisitService.recordVisitByKurageId(profile.getKurageId(), visitor);
        profileVisitService.recordVisitByKurageId(profile.getKurageId(), profile);

        assertThat(profileVisitRepository.countByVisitedUserId(profile.getId())).isEqualTo(1);
    }

    @Test
    void mareAndStaffCanReadAnyProfileButFreeUsersCannot() {
        User profile = saveUser(9_300_010L, "target_profile", "76561198193000010");
        User visitor = saveUser(9_300_011L, "listed_visitor", "76561198193000011");
        User mareViewer = saveUser(9_300_012L, "mare_viewer", "76561198193000012");
        mareViewer.setSubscriptionTier(SubscriptionTier.MARE);
        userRepository.save(mareViewer);
        User ownerViewer = saveUser(9_300_013L, "owner_viewer", "76561198193000013");
        ownerViewer.setRole(UserRole.OWNER);
        userRepository.save(ownerViewer);
        User freeViewer = saveUser(9_300_014L, "free_viewer", "76561198193000014");

        profileVisitService.recordVisitByKurageId(profile.getKurageId(), visitor);

        List<ProfileVisitorResponse> mareResult = profileVisitService.getRecentVisitors(
                mareViewer, profile.getKurageId(), 20);
        List<ProfileVisitorResponse> ownerResult = profileVisitService.getRecentVisitors(
                ownerViewer, profile.getKurageId(), 20);

        assertThat(mareResult).singleElement().satisfies(result -> {
            assertThat(result.userId()).isEqualTo(visitor.getId());
            assertThat(result.kurageId()).isEqualTo(visitor.getKurageId());
            assertThat(result.username()).isEqualTo(visitor.getUsername());
            assertThat(result.visitedAt()).isNotNull();
        });
        assertThat(ownerResult).containsExactlyElementsOf(mareResult);
        assertThatThrownBy(() -> profileVisitService.getRecentVisitors(
                freeViewer, profile.getKurageId(), 20))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void capsTheResponseAtTwentyNewestVisitors() {
        User profile = saveUser(9_300_100L, "popular_profile", "76561198193000100");
        User mareViewer = saveUser(9_300_101L, "visitor_reader", "76561198193000101");
        mareViewer.setSubscriptionTier(SubscriptionTier.MARE);
        userRepository.save(mareViewer);

        List<User> visitors = new ArrayList<>();
        for (int index = 0; index < 21; index++) {
            User visitor = saveUser(
                    9_301_000L + index,
                    "visitor_" + index,
                    "7656119819310" + String.format("%04d", index));
            visitors.add(visitor);
            profileVisitService.recordVisitByKurageId(profile.getKurageId(), visitor);
        }

        List<ProfileVisitorResponse> result = profileVisitService.getRecentVisitors(
                mareViewer, profile.getKurageId(), 200);

        assertThat(result).hasSize(20);
        assertThat(result.getFirst().userId()).isEqualTo(visitors.getLast().getId());
        assertThat(result).extracting(ProfileVisitorResponse::userId)
                .doesNotContain(visitors.getFirst().getId());
    }

    private User saveUser(long kurageId, String username, String steamId64) {
        return userRepository.save(User.builder()
                .kurageId(kurageId)
                .username(username)
                .steamId64(steamId64)
                .build());
    }

    private String tokenFor(User user) {
        return jwtService.generateToken(
                user.getSteamId64(), user.getRole().name(), user.getId().toString());
    }
}
