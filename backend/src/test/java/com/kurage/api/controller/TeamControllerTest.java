package com.kurage.api.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kurage.api.domain.InGameFunction;
import com.kurage.api.domain.PlayerFunction;
import com.kurage.api.domain.TeamRole;
import com.kurage.api.domain.User;
import com.kurage.api.dto.request.*;
import com.kurage.api.dto.response.*;
import com.kurage.api.service.TeamService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class TeamControllerTest {

    @Mock
    private TeamService teamService;

    @InjectMocks
    private TeamController teamController;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private User testUser;
    private TeamResponse sampleTeamResponse;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(UUID.randomUUID())
                .kurageId(1001L)
                .username("TestPlayer")
                .steamId64("76561198000000001")
                .primaryFunction(PlayerFunction.AWPER)
                .build();

        UserResponse userResponse = UserResponse.create(testUser);

        sampleTeamResponse = new TeamResponse(
                UUID.randomUUID(),
                "Furia Esports",
                "FUR",
                "https://logo.url",
                "BR",
                200,
                userResponse,
                Instant.now(),
                List.of()
        );

        HandlerMethodArgumentResolver authPrincipalResolver = new HandlerMethodArgumentResolver() {
            @Override
            public boolean supportsParameter(MethodParameter parameter) {
                return parameter.getParameterType().isAssignableFrom(User.class);
            }

            @Override
            public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
                                          NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
                return testUser;
            }
        };

        mockMvc = MockMvcBuilders
                .standaloneSetup(teamController)
                .setCustomArgumentResolvers(authPrincipalResolver)
                .build();
    }

    // ==========================================
    // 1. Team CRUD & Profiles
    // ==========================================

    @Test
    @DisplayName("POST /teams should create a team and return 201")
    void shouldCreateTeam() throws Exception {
        TeamRequest request = new TeamRequest("Furia Esports", "FUR", TeamRole.PLAYER, "BR");
        when(teamService.createTeam(any(TeamRequest.class), any(User.class))).thenReturn(sampleTeamResponse);

        mockMvc.perform(post("/teams")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Furia Esports"))
                .andExpect(jsonPath("$.tag").value("FUR"));
    }

    @Test
    @DisplayName("GET /teams/{id} should return team response")
    void shouldGetTeamById() throws Exception {
        when(teamService.getTeamById(sampleTeamResponse.id())).thenReturn(sampleTeamResponse);

        mockMvc.perform(get("/teams/{id}", sampleTeamResponse.id()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Furia Esports"));
    }

    @Test
    @DisplayName("GET /teams/name/{name} should return team response")
    void shouldGetTeamByName() throws Exception {
        when(teamService.getTeamByName("Furia Esports")).thenReturn(sampleTeamResponse);

        mockMvc.perform(get("/teams/name/{name}", "Furia Esports"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tag").value("FUR"));
    }

    @Test
    @DisplayName("GET /teams/tag/{tag} should return team response")
    void shouldGetTeamByTag() throws Exception {
        when(teamService.getTeamByTag("FUR")).thenReturn(sampleTeamResponse);

        mockMvc.perform(get("/teams/tag/{tag}", "FUR"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Furia Esports"));
    }

    // ==========================================
    // 2. Direct Invitations
    // ==========================================

    @Test
    @DisplayName("POST /teams/{id}/invites should send direct invite")
    void shouldSendInvite() throws Exception {
        TeamInviteRequest request = new TeamInviteRequest("76561198000000002", TeamRole.PLAYER);
        doNothing().when(teamService).sendInvite(eq(sampleTeamResponse.id()), eq(testUser.getId()), eq("76561198000000002"), eq(TeamRole.PLAYER));

        mockMvc.perform(post("/teams/{id}/invites", sampleTeamResponse.id())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("GET /teams/{id}/invites should list team invitations")
    void shouldGetTeamInvites() throws Exception {
        TeamInvitationResponse invite = new TeamInvitationResponse(
                UUID.randomUUID(),
                sampleTeamResponse,
                UserResponse.create(testUser),
                "PLAYER",
                "PENDING",
                Instant.now()
        );
        when(teamService.getTeamInvites(sampleTeamResponse.id(), testUser.getId())).thenReturn(List.of(invite));

        mockMvc.perform(get("/teams/{id}/invites", sampleTeamResponse.id()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].targetRole").value("PLAYER"))
                .andExpect(jsonPath("$[0].status").value("PENDING"));
    }

    @Test
    @DisplayName("POST /teams/invites/{inviteId}/accept should accept invitation")
    void shouldAcceptInvite() throws Exception {
        UUID inviteId = UUID.randomUUID();
        when(teamService.acceptInvite(inviteId, testUser.getId())).thenReturn(sampleTeamResponse);

        mockMvc.perform(post("/teams/invites/{inviteId}/accept", inviteId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Furia Esports"));
    }

    @Test
    @DisplayName("POST /teams/invites/{inviteId}/decline should decline invitation")
    void shouldDeclineInvite() throws Exception {
        UUID inviteId = UUID.randomUUID();
        doNothing().when(teamService).declineInvite(inviteId, testUser.getId());

        mockMvc.perform(post("/teams/invites/{inviteId}/decline", inviteId))
                .andExpect(status().isOk());
    }

    // ==========================================
    // 3. Join Requests
    // ==========================================

    @Test
    @DisplayName("POST /teams/{id}/join-requests should create join request")
    void shouldCreateJoinRequest() throws Exception {
        CreateTeamJoinRequest request = new CreateTeamJoinRequest(TeamRole.PLAYER);
        TeamJoinRequestResponse response = new TeamJoinRequestResponse(
                UUID.randomUUID(),
                sampleTeamResponse.id(),
                "Furia Esports",
                "FUR",
                UserResponse.create(testUser),
                "PLAYER",
                "PENDING",
                null,
                Instant.now(),
                null
        );

        when(teamService.createJoinRequest(sampleTeamResponse.id(), testUser.getId(), TeamRole.PLAYER)).thenReturn(response);

        mockMvc.perform(post("/teams/{id}/join-requests", sampleTeamResponse.id())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.desiredRole").value("PLAYER"));
    }

    @Test
    @DisplayName("GET /teams/{id}/join-requests should return team join requests")
    void shouldGetTeamJoinRequests() throws Exception {
        TeamJoinRequestResponse response = new TeamJoinRequestResponse(
                UUID.randomUUID(),
                sampleTeamResponse.id(),
                "Furia Esports",
                "FUR",
                UserResponse.create(testUser),
                "PLAYER",
                "PENDING",
                null,
                Instant.now(),
                null
        );
        when(teamService.getTeamJoinRequests(sampleTeamResponse.id(), testUser.getId())).thenReturn(List.of(response));

        mockMvc.perform(get("/teams/{id}/join-requests", sampleTeamResponse.id()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].desiredRole").value("PLAYER"));
    }

    @Test
    @DisplayName("POST /teams/join-requests/{requestId}/approve should approve join request")
    void shouldApproveJoinRequest() throws Exception {
        UUID requestId = UUID.randomUUID();
        ApproveJoinRequestRequest request = new ApproveJoinRequestRequest(TeamRole.PLAYER);
        TeamJoinRequestResponse response = new TeamJoinRequestResponse(
                requestId,
                sampleTeamResponse.id(),
                "Furia Esports",
                "FUR",
                UserResponse.create(testUser),
                "PLAYER",
                "ACCEPTED",
                UserResponse.create(testUser),
                Instant.now(),
                Instant.now()
        );

        when(teamService.approveJoinRequest(requestId, testUser.getId(), TeamRole.PLAYER)).thenReturn(response);

        mockMvc.perform(post("/teams/join-requests/{requestId}/approve", requestId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED"));
    }

    @Test
    @DisplayName("POST /teams/join-requests/{requestId}/reject should reject join request")
    void shouldRejectJoinRequest() throws Exception {
        UUID requestId = UUID.randomUUID();
        TeamJoinRequestResponse response = new TeamJoinRequestResponse(
                requestId,
                sampleTeamResponse.id(),
                "Furia Esports",
                "FUR",
                UserResponse.create(testUser),
                "PLAYER",
                "REJECTED",
                UserResponse.create(testUser),
                Instant.now(),
                Instant.now()
        );

        when(teamService.rejectJoinRequest(requestId, testUser.getId())).thenReturn(response);

        mockMvc.perform(post("/teams/join-requests/{requestId}/reject", requestId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"));
    }

    // ==========================================
    // 4. Invite Links
    // ==========================================

    @Test
    @DisplayName("POST /teams/{id}/invite-links should create invite link")
    void shouldCreateInviteLink() throws Exception {
        CreateInviteLinkRequest request = new CreateInviteLinkRequest(TeamRole.PLAYER, 7, 3);
        InviteLinkResponse response = new InviteLinkResponse(
                UUID.randomUUID(),
                sampleTeamResponse.id(),
                "Furia Esports",
                "FUR",
                "token123",
                "PLAYER",
                Instant.now().plusSeconds(604800),
                3,
                0,
                true,
                Instant.now()
        );

        when(teamService.generateInviteLink(sampleTeamResponse.id(), testUser.getId(), TeamRole.PLAYER, 7, 3)).thenReturn(response);

        mockMvc.perform(post("/teams/{id}/invite-links", sampleTeamResponse.id())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").value("token123"))
                .andExpect(jsonPath("$.maxUses").value(3));
    }

    @Test
    @DisplayName("GET /teams/invite-links/{token} should validate invite link")
    void shouldValidateInviteLink() throws Exception {
        InviteLinkResponse response = new InviteLinkResponse(
                UUID.randomUUID(),
                sampleTeamResponse.id(),
                "Furia Esports",
                "FUR",
                "token123",
                "PLAYER",
                Instant.now().plusSeconds(604800),
                3,
                0,
                true,
                Instant.now()
        );

        when(teamService.validateInviteLink("token123")).thenReturn(response);

        mockMvc.perform(get("/teams/invite-links/{token}", "token123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("token123"));
    }

    @Test
    @DisplayName("POST /teams/invite-links/{token}/accept should accept invite link and join team")
    void shouldAcceptInviteLink() throws Exception {
        when(teamService.acceptInviteLink("token123", testUser.getId())).thenReturn(sampleTeamResponse);

        mockMvc.perform(post("/teams/invite-links/{token}/accept", "token123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Furia Esports"));
    }

    @Test
    @DisplayName("DELETE /teams/invite-links/{linkId} should revoke invite link")
    void shouldRevokeInviteLink() throws Exception {
        UUID linkId = UUID.randomUUID();
        doNothing().when(teamService).revokeInviteLink(linkId, testUser.getId());

        mockMvc.perform(delete("/teams/invite-links/{linkId}", linkId))
                .andExpect(status().isNoContent());
    }

    // ==========================================
    // 5. Member & Lineup Management
    // ==========================================

    @Test
    @DisplayName("PUT /teams/{id}/members/{memberId}/function should update function")
    void shouldUpdateMemberFunction() throws Exception {
        UUID memberId = UUID.randomUUID();
        UpdateTeamFunctionRequest request = new UpdateTeamFunctionRequest(InGameFunction.AWPER);
        when(teamService.updateMemberFunction(sampleTeamResponse.id(), testUser.getId(), memberId, InGameFunction.AWPER))
                .thenReturn(sampleTeamResponse);

        mockMvc.perform(put("/teams/{id}/members/{memberId}/function", sampleTeamResponse.id(), memberId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("PUT /teams/{id}/members/{memberId}/role should update role")
    void shouldUpdateMemberRole() throws Exception {
        UUID memberId = UUID.randomUUID();
        UpdateTeamRoleRequest request = new UpdateTeamRoleRequest(TeamRole.SUBSTITUTE);
        when(teamService.updateMemberRole(sampleTeamResponse.id(), testUser.getId(), memberId, TeamRole.SUBSTITUTE))
                .thenReturn(sampleTeamResponse);

        mockMvc.perform(put("/teams/{id}/members/{memberId}/role", sampleTeamResponse.id(), memberId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("PUT /teams/{id}/members/{memberId}/promote should promote member to admin")
    void shouldPromoteToAdmin() throws Exception {
        UUID memberId = UUID.randomUUID();
        when(teamService.promoteToAdmin(sampleTeamResponse.id(), testUser.getId(), memberId))
                .thenReturn(sampleTeamResponse);

        mockMvc.perform(put("/teams/{id}/members/{memberId}/promote", sampleTeamResponse.id(), memberId))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("PUT /teams/{id}/members/{memberId}/demote should demote admin to member")
    void shouldDemoteToMember() throws Exception {
        UUID memberId = UUID.randomUUID();
        when(teamService.demoteToMember(sampleTeamResponse.id(), testUser.getId(), memberId))
                .thenReturn(sampleTeamResponse);

        mockMvc.perform(put("/teams/{id}/members/{memberId}/demote", sampleTeamResponse.id(), memberId))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("PUT /teams/{id}/members/{memberId}/transfer-ownership should transfer team ownership")
    void shouldTransferOwnership() throws Exception {
        UUID memberId = UUID.randomUUID();
        when(teamService.transferOwnership(sampleTeamResponse.id(), testUser.getId(), memberId))
                .thenReturn(sampleTeamResponse);

        mockMvc.perform(put("/teams/{id}/members/{memberId}/transfer-ownership", sampleTeamResponse.id(), memberId))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("DELETE /teams/{id}/members/{memberId} should remove member or delete team")
    void shouldRemoveMember() throws Exception {
        UUID memberId = UUID.randomUUID();
        when(teamService.removeMember(sampleTeamResponse.id(), testUser.getId(), memberId))
                .thenReturn(sampleTeamResponse);

        mockMvc.perform(delete("/teams/{id}/members/{memberId}", sampleTeamResponse.id(), memberId))
                .andExpect(status().isOk());

        when(teamService.removeMember(sampleTeamResponse.id(), testUser.getId(), memberId))
                .thenReturn(null);

        mockMvc.perform(delete("/teams/{id}/members/{memberId}", sampleTeamResponse.id(), memberId))
                .andExpect(status().isNoContent());
    }
}
