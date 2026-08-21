package com.kurage.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kurage.api.domain.*;
import com.kurage.api.domain.enums.NotificationType;
import com.kurage.api.dto.request.TeamRequest;
import com.kurage.api.dto.response.InviteLinkResponse;
import com.kurage.api.dto.response.TeamJoinRequestResponse;
import com.kurage.api.dto.response.TeamResponse;
import com.kurage.api.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TeamServiceTest {

    @Mock
    private TeamRepository teamRepository;

    @Mock
    private TeamMemberRepository teamMemberRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private TeamInvitationRepository teamInvitationRepository;

    @Mock
    private TeamJoinRequestRepository teamJoinRequestRepository;

    @Mock
    private TeamInviteLinkRepository teamInviteLinkRepository;

    @Mock
    private S3Service s3Service;

    @Mock
    private NotificationService notificationService;

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @InjectMocks
    private TeamService teamService;

    private User ownerUser;
    private User adminUser;
    private User regularUser;
    private User targetUser;
    private Team sampleTeam;
    private TeamMember ownerMember;
    private TeamMember adminMember;
    private TeamMember regularMember;

    @BeforeEach
    void setUp() {
        ownerUser = User.builder()
                .id(UUID.randomUUID())
                .kurageId(1001L)
                .username("OwnerPlayer")
                .steamId64("76561198000000001")
                .primaryFunction(PlayerFunction.AWPER)
                .build();

        adminUser = User.builder()
                .id(UUID.randomUUID())
                .kurageId(1002L)
                .username("AdminPlayer")
                .steamId64("76561198000000002")
                .primaryFunction(PlayerFunction.CAPITAO)
                .build();

        regularUser = User.builder()
                .id(UUID.randomUUID())
                .kurageId(1003L)
                .username("RegularPlayer")
                .steamId64("76561198000000003")
                .primaryFunction(PlayerFunction.ENTRY_FRAGGER)
                .build();

        targetUser = User.builder()
                .id(UUID.randomUUID())
                .kurageId(1004L)
                .username("TargetPlayer")
                .steamId64("76561198000000004")
                .primaryFunction(PlayerFunction.SUPORTE)
                .build();

        sampleTeam = Team.builder()
                .id(UUID.randomUUID())
                .name("Furia Esports")
                .tag("FUR")
                .owner(ownerUser)
                .country("BR")
                .teamElo(200)
                .members(new ArrayList<>())
                .build();

        ownerMember = TeamMember.builder()
                .id(UUID.randomUUID())
                .team(sampleTeam)
                .user(ownerUser)
                .teamRole(TeamRole.PLAYER)
                .teamFunction(InGameFunction.AWPER)
                .managementRole(ManagementRole.OWNER)
                .build();

        adminMember = TeamMember.builder()
                .id(UUID.randomUUID())
                .team(sampleTeam)
                .user(adminUser)
                .teamRole(TeamRole.PLAYER)
                .teamFunction(InGameFunction.CAPITAO)
                .managementRole(ManagementRole.ADMIN)
                .build();

        regularMember = TeamMember.builder()
                .id(UUID.randomUUID())
                .team(sampleTeam)
                .user(regularUser)
                .teamRole(TeamRole.PLAYER)
                .teamFunction(InGameFunction.ENTRY_FRAGGER)
                .managementRole(ManagementRole.MEMBER)
                .build();

        sampleTeam.getMembers().add(ownerMember);
    }

    // ==========================================
    // 1. Team Creation & Profiles
    // ==========================================

    @Test
    @DisplayName("Should create team successfully with owner as OWNER management role")
    void shouldCreateTeamSuccessfully() {
        TeamRequest request = new TeamRequest("Furia Esports", "FUR", TeamRole.PLAYER, "BR");
        when(teamRepository.existsByNameIgnoreCase("Furia Esports")).thenReturn(false);
        when(teamRepository.existsByTagIgnoreCase("FUR")).thenReturn(false);
        when(teamRepository.save(any(Team.class))).thenAnswer(invocation -> {
            Team t = invocation.getArgument(0);
            t.setId(sampleTeam.getId());
            t.setMembers(new ArrayList<>());
            return t;
        });

        TeamResponse response = teamService.createTeam(request, ownerUser);

        assertNotNull(response);
        assertEquals("Furia Esports", response.name());
        assertEquals("FUR", response.tag());
        verify(teamMemberRepository, times(1)).save(argThat(m ->
                m.getManagementRole() == ManagementRole.OWNER &&
                m.getTeamRole() == TeamRole.PLAYER &&
                m.getTeamFunction() == InGameFunction.AWPER
        ));
        verify(notificationService, times(1)).createNotification(
                eq(ownerUser.getId()),
                eq(NotificationType.TEAM_CREATED),
                anyString(),
                anyString(),
                anyMap()
        );
    }

    @Test
    @DisplayName("Should throw 400 when team name or tag already exists")
    void shouldThrowWhenNameOrTagExists() {
        TeamRequest req1 = new TeamRequest("Furia Esports", "FUR", TeamRole.PLAYER, "BR");
        when(teamRepository.existsByNameIgnoreCase("Furia Esports")).thenReturn(true);

        ResponseStatusException ex1 = assertThrows(ResponseStatusException.class, () -> teamService.createTeam(req1, ownerUser));
        assertEquals(HttpStatus.BAD_REQUEST, ex1.getStatusCode());

        when(teamRepository.existsByNameIgnoreCase("MIBR")).thenReturn(false);
        when(teamRepository.existsByTagIgnoreCase("MIB")).thenReturn(true);
        TeamRequest req2 = new TeamRequest("MIBR", "MIB", TeamRole.PLAYER, "BR");

        ResponseStatusException ex2 = assertThrows(ResponseStatusException.class, () -> teamService.createTeam(req2, ownerUser));
        assertEquals(HttpStatus.BAD_REQUEST, ex2.getStatusCode());
    }

    @Test
    @DisplayName("Should update team avatar when user is OWNER")
    void shouldUpdateAvatarWhenUserIsOwner() throws IOException {
        MultipartFile file = mock(MultipartFile.class);
        when(teamRepository.findById(sampleTeam.getId())).thenReturn(Optional.of(sampleTeam));
        when(teamMemberRepository.findByTeamIdAndUserId(sampleTeam.getId(), ownerUser.getId())).thenReturn(Optional.of(ownerMember));
        when(s3Service.uploadAvatar(file, sampleTeam.getId())).thenReturn("https://r2.kurage.com/avatar.jpg");
        when(teamRepository.save(any(Team.class))).thenReturn(sampleTeam);

        TeamResponse response = teamService.updateTeamAvatar(sampleTeam.getId(), ownerUser.getId(), file);

        assertNotNull(response);
        assertEquals("https://r2.kurage.com/avatar.jpg", sampleTeam.getLogoUrl());
    }

    @Test
    @DisplayName("Should throw 403 when updating avatar if user is not OWNER")
    void shouldThrowWhenNonOwnerUpdatesAvatar() {
        MultipartFile file = mock(MultipartFile.class);
        when(teamRepository.findById(sampleTeam.getId())).thenReturn(Optional.of(sampleTeam));
        when(teamMemberRepository.findByTeamIdAndUserId(sampleTeam.getId(), adminUser.getId())).thenReturn(Optional.of(adminMember));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> teamService.updateTeamAvatar(sampleTeam.getId(), adminUser.getId(), file));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    }

    // ==========================================
    // 2. Direct Invitations
    // ==========================================

    @Test
    @DisplayName("Should send direct invite successfully by ADMIN or OWNER")
    void shouldSendInviteSuccessfully() {
        when(teamRepository.findById(sampleTeam.getId())).thenReturn(Optional.of(sampleTeam));
        when(teamMemberRepository.findByTeamIdAndUserId(sampleTeam.getId(), adminUser.getId())).thenReturn(Optional.of(adminMember));
        when(userRepository.findBySteamId64(targetUser.getSteamId64())).thenReturn(Optional.of(targetUser));
        when(teamMemberRepository.existsByTeamIdAndUserId(sampleTeam.getId(), targetUser.getId())).thenReturn(false);
        when(teamInvitationRepository.findByTeamIdAndInvitedUserIdAndStatus(sampleTeam.getId(), targetUser.getId(), InvitationStatus.PENDING)).thenReturn(Optional.empty());
        when(teamInvitationRepository.save(any(TeamInvitation.class))).thenAnswer(invocation -> {
            TeamInvitation inv = invocation.getArgument(0);
            inv.setId(UUID.randomUUID());
            return inv;
        });

        teamService.sendInvite(sampleTeam.getId(), adminUser.getId(), targetUser.getSteamId64(), TeamRole.SUBSTITUTE);

        verify(teamInvitationRepository, times(1)).save(argThat(i ->
                i.getTargetRole() == TeamRole.SUBSTITUTE &&
                i.getStatus() == InvitationStatus.PENDING
        ));
        verify(notificationService, times(1)).createNotification(
                eq(targetUser.getId()),
                eq(NotificationType.TEAM_INVITE),
                anyString(),
                anyString(),
                anyMap()
        );
    }

    @Test
    @DisplayName("Should allow sending new invite when previous pending invite expired (>24h)")
    void shouldAllowNewInviteWhenPreviousExpired() {
        TeamInvitation expiredInvite = TeamInvitation.builder()
                .id(UUID.randomUUID())
                .team(sampleTeam)
                .invitedUser(targetUser)
                .inviter(ownerUser)
                .targetRole(TeamRole.PLAYER)
                .status(InvitationStatus.PENDING)
                .createdAt(Instant.now().minus(Duration.ofHours(25)))
                .build();

        when(teamRepository.findById(sampleTeam.getId())).thenReturn(Optional.of(sampleTeam));
        when(teamMemberRepository.findByTeamIdAndUserId(sampleTeam.getId(), adminUser.getId())).thenReturn(Optional.of(adminMember));
        when(userRepository.findBySteamId64(targetUser.getSteamId64())).thenReturn(Optional.of(targetUser));
        when(teamMemberRepository.existsByTeamIdAndUserId(sampleTeam.getId(), targetUser.getId())).thenReturn(false);
        when(teamInvitationRepository.findByTeamIdAndInvitedUserIdAndStatus(sampleTeam.getId(), targetUser.getId(), InvitationStatus.PENDING)).thenReturn(Optional.of(expiredInvite));
        when(teamInvitationRepository.save(any(TeamInvitation.class))).thenAnswer(invocation -> invocation.getArgument(0));

        teamService.sendInvite(sampleTeam.getId(), adminUser.getId(), targetUser.getSteamId64(), TeamRole.PLAYER);

        assertEquals(InvitationStatus.EXPIRED, expiredInvite.getStatus());
        verify(teamInvitationRepository, atLeast(2)).save(any(TeamInvitation.class));
    }

    @Test
    @DisplayName("Should throw 403 when non-manager sends direct invite")
    void shouldThrowWhenNonManagerSendsInvite() {
        when(teamRepository.findById(sampleTeam.getId())).thenReturn(Optional.of(sampleTeam));
        when(teamMemberRepository.findByTeamIdAndUserId(sampleTeam.getId(), regularUser.getId())).thenReturn(Optional.of(regularMember));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> teamService.sendInvite(sampleTeam.getId(), regularUser.getId(), targetUser.getSteamId64(), TeamRole.PLAYER));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    }

    @Test
    @DisplayName("Should filter out expired invites (>24h) in getTeamInvites")
    void shouldFilterOutExpiredInvitesInGetTeamInvites() {
        TeamInvitation validInvite = TeamInvitation.builder()
                .id(UUID.randomUUID())
                .team(sampleTeam)
                .invitedUser(targetUser)
                .inviter(ownerUser)
                .targetRole(TeamRole.PLAYER)
                .status(InvitationStatus.PENDING)
                .createdAt(Instant.now().minus(Duration.ofHours(2)))
                .build();

        TeamInvitation expiredInvite = TeamInvitation.builder()
                .id(UUID.randomUUID())
                .team(sampleTeam)
                .invitedUser(targetUser)
                .inviter(ownerUser)
                .targetRole(TeamRole.PLAYER)
                .status(InvitationStatus.PENDING)
                .createdAt(Instant.now().minus(Duration.ofHours(26)))
                .build();

        when(teamMemberRepository.findByTeamIdAndUserId(sampleTeam.getId(), adminUser.getId())).thenReturn(Optional.of(adminMember));
        when(teamInvitationRepository.findByTeamIdAndStatus(sampleTeam.getId(), InvitationStatus.PENDING))
                .thenReturn(List.of(validInvite, expiredInvite));

        var invites = teamService.getTeamInvites(sampleTeam.getId(), adminUser.getId());

        assertEquals(1, invites.size());
        assertEquals(validInvite.getId(), invites.get(0).id());
    }

    @Test
    @DisplayName("Should accept direct invite successfully and add member")
    void shouldAcceptInviteSuccessfully() {
        UUID inviteId = UUID.randomUUID();
        TeamInvitation invitation = TeamInvitation.builder()
                .id(inviteId)
                .team(sampleTeam)
                .inviter(ownerUser)
                .invitedUser(targetUser)
                .targetRole(TeamRole.PLAYER)
                .status(InvitationStatus.PENDING)
                .createdAt(Instant.now().minus(Duration.ofHours(1)))
                .build();

        when(teamInvitationRepository.findById(inviteId)).thenReturn(Optional.of(invitation));
        when(teamRepository.findByIdWithLock(sampleTeam.getId())).thenReturn(Optional.of(sampleTeam));
        when(userRepository.findById(targetUser.getId())).thenReturn(Optional.of(targetUser));
        when(teamMemberRepository.existsByTeamIdAndUserId(sampleTeam.getId(), targetUser.getId())).thenReturn(false);
        when(teamMemberRepository.countByTeamIdAndTeamRole(sampleTeam.getId(), TeamRole.PLAYER)).thenReturn(1);
        when(teamRepository.findById(sampleTeam.getId())).thenReturn(Optional.of(sampleTeam));

        TeamResponse response = teamService.acceptInvite(inviteId, targetUser.getId());

        assertNotNull(response);
        assertEquals(InvitationStatus.ACCEPTED, invitation.getStatus());
        verify(teamMemberRepository, times(1)).save(argThat(m ->
                m.getUser().getId().equals(targetUser.getId()) &&
                m.getManagementRole() == ManagementRole.MEMBER &&
                m.getTeamRole() == TeamRole.PLAYER &&
                m.getTeamFunction() == InGameFunction.SUPORTE
        ));
    }

    @Test
    @DisplayName("Should throw 410 GONE when accepting expired invite (>24h)")
    void shouldThrow410WhenAcceptingExpiredInvite() {
        UUID inviteId = UUID.randomUUID();
        TeamInvitation invitation = TeamInvitation.builder()
                .id(inviteId)
                .team(sampleTeam)
                .inviter(ownerUser)
                .invitedUser(targetUser)
                .targetRole(TeamRole.PLAYER)
                .status(InvitationStatus.PENDING)
                .createdAt(Instant.now().minus(Duration.ofHours(25)))
                .build();

        when(teamInvitationRepository.findById(inviteId)).thenReturn(Optional.of(invitation));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> teamService.acceptInvite(inviteId, targetUser.getId()));

        assertEquals(HttpStatus.GONE, ex.getStatusCode());
        assertEquals(InvitationStatus.EXPIRED, invitation.getStatus());
        verify(teamInvitationRepository, times(1)).save(invitation);
    }

    @Test
    @DisplayName("Should throw 410 GONE when declining expired invite (>24h)")
    void shouldThrow410WhenDecliningExpiredInvite() {
        UUID inviteId = UUID.randomUUID();
        TeamInvitation invitation = TeamInvitation.builder()
                .id(inviteId)
                .team(sampleTeam)
                .inviter(ownerUser)
                .invitedUser(targetUser)
                .targetRole(TeamRole.PLAYER)
                .status(InvitationStatus.PENDING)
                .createdAt(Instant.now().minus(Duration.ofHours(25)))
                .build();

        when(teamInvitationRepository.findById(inviteId)).thenReturn(Optional.of(invitation));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> teamService.declineInvite(inviteId, targetUser.getId()));

        assertEquals(HttpStatus.GONE, ex.getStatusCode());
        assertEquals(InvitationStatus.EXPIRED, invitation.getStatus());
        verify(teamInvitationRepository, times(1)).save(invitation);
    }


    // ==========================================
    // 3. Join Requests
    // ==========================================

    @Test
    @DisplayName("Should create join request and notify managers")
    void shouldCreateJoinRequestSuccessfully() {
        when(teamRepository.findById(sampleTeam.getId())).thenReturn(Optional.of(sampleTeam));
        when(userRepository.findById(targetUser.getId())).thenReturn(Optional.of(targetUser));
        when(teamMemberRepository.existsByTeamIdAndUserId(sampleTeam.getId(), targetUser.getId())).thenReturn(false);
        when(teamJoinRequestRepository.existsByTeamIdAndRequesterIdAndStatus(sampleTeam.getId(), targetUser.getId(), JoinRequestStatus.PENDING)).thenReturn(false);
        when(teamMemberRepository.findByTeamIdAndManagementRoleIn(eq(sampleTeam.getId()), anyList())).thenReturn(List.of(ownerMember, adminMember));

        when(teamJoinRequestRepository.save(any(TeamJoinRequest.class))).thenAnswer(invocation -> {
            TeamJoinRequest r = invocation.getArgument(0);
            r.setId(UUID.randomUUID());
            return r;
        });

        TeamJoinRequestResponse response = teamService.createJoinRequest(sampleTeam.getId(), targetUser.getId(), TeamRole.PLAYER);

        assertNotNull(response);
        verify(notificationService, times(2)).createNotification(
                any(UUID.class),
                eq(NotificationType.TEAM_JOIN_REQUEST),
                anyString(),
                anyString(),
                anyMap()
        );
    }

    @Test
    @DisplayName("Should approve join request by manager and add member")
    void shouldApproveJoinRequestSuccessfully() {
        UUID requestId = UUID.randomUUID();
        TeamJoinRequest request = TeamJoinRequest.builder()
                .id(requestId)
                .team(sampleTeam)
                .requester(targetUser)
                .desiredRole(TeamRole.PLAYER)
                .status(JoinRequestStatus.PENDING)
                .build();

        when(teamJoinRequestRepository.findById(requestId)).thenReturn(Optional.of(request));
        when(teamMemberRepository.findByTeamIdAndUserId(sampleTeam.getId(), adminUser.getId())).thenReturn(Optional.of(adminMember));
        when(teamRepository.findByIdWithLock(sampleTeam.getId())).thenReturn(Optional.of(sampleTeam));
        when(userRepository.findById(targetUser.getId())).thenReturn(Optional.of(targetUser));
        when(teamMemberRepository.existsByTeamIdAndUserId(sampleTeam.getId(), targetUser.getId())).thenReturn(false);
        when(teamMemberRepository.countByTeamIdAndTeamRole(sampleTeam.getId(), TeamRole.PLAYER)).thenReturn(2);
        when(teamJoinRequestRepository.save(any(TeamJoinRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TeamJoinRequestResponse response = teamService.approveJoinRequest(requestId, adminUser.getId(), TeamRole.PLAYER);

        assertNotNull(response);
        assertEquals(JoinRequestStatus.ACCEPTED.name(), response.status());
        verify(teamMemberRepository, times(1)).save(argThat(m -> m.getUser().getId().equals(targetUser.getId())));
        verify(notificationService, times(1)).createNotification(
                eq(targetUser.getId()),
                eq(NotificationType.TEAM_JOIN_APPROVED),
                anyString(),
                anyString(),
                anyMap()
        );
    }

    // ==========================================
    // 4. Invite Links
    // ==========================================

    @Test
    @DisplayName("Should generate invite link when active count is under limit")
    void shouldGenerateInviteLinkSuccessfully() {
        when(teamRepository.findById(sampleTeam.getId())).thenReturn(Optional.of(sampleTeam));
        when(teamMemberRepository.findByTeamIdAndUserId(sampleTeam.getId(), ownerUser.getId())).thenReturn(Optional.of(ownerMember));
        when(teamInviteLinkRepository.countByTeamIdAndIsActiveTrueAndExpiresAtAfter(eq(sampleTeam.getId()), any(Instant.class))).thenReturn(2L);
        when(teamInviteLinkRepository.save(any(TeamInviteLink.class))).thenAnswer(invocation -> {
            TeamInviteLink l = invocation.getArgument(0);
            l.setId(UUID.randomUUID());
            return l;
        });

        InviteLinkResponse response = teamService.generateInviteLink(sampleTeam.getId(), ownerUser.getId(), TeamRole.PLAYER, 7, 5);

        assertNotNull(response);
        assertNotNull(response.token());
        assertEquals(5, response.maxUses());
    }

    @Test
    @DisplayName("Should throw 400 when active invite link limit (3) is reached")
    void shouldThrowWhenInviteLinkLimitReached() {
        when(teamRepository.findById(sampleTeam.getId())).thenReturn(Optional.of(sampleTeam));
        when(teamMemberRepository.findByTeamIdAndUserId(sampleTeam.getId(), ownerUser.getId())).thenReturn(Optional.of(ownerMember));
        when(teamInviteLinkRepository.countByTeamIdAndIsActiveTrueAndExpiresAtAfter(eq(sampleTeam.getId()), any(Instant.class))).thenReturn(3L);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> teamService.generateInviteLink(sampleTeam.getId(), ownerUser.getId(), TeamRole.PLAYER, 7, 1));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    @Test
    @DisplayName("Should accept invite link and add member")
    void shouldAcceptInviteLinkSuccessfully() {
        String token = "samplevalidtoken123456789";
        TeamInviteLink link = TeamInviteLink.builder()
                .id(UUID.randomUUID())
                .team(sampleTeam)
                .createdBy(ownerUser)
                .token(token)
                .targetRole(TeamRole.PLAYER)
                .expiresAt(Instant.now().plus(Duration.ofDays(5)))
                .maxUses(2)
                .currentUses(0)
                .isActive(true)
                .build();

        when(teamInviteLinkRepository.findByTokenAndIsActiveTrue(token)).thenReturn(Optional.of(link));
        when(userRepository.findById(targetUser.getId())).thenReturn(Optional.of(targetUser));
        when(teamMemberRepository.existsByTeamIdAndUserId(sampleTeam.getId(), targetUser.getId())).thenReturn(false);
        when(teamRepository.findByIdWithLock(sampleTeam.getId())).thenReturn(Optional.of(sampleTeam));
        when(teamMemberRepository.countByTeamIdAndTeamRole(sampleTeam.getId(), TeamRole.PLAYER)).thenReturn(1);
        when(teamRepository.findById(sampleTeam.getId())).thenReturn(Optional.of(sampleTeam));

        TeamResponse response = teamService.acceptInviteLink(token, targetUser.getId());

        assertNotNull(response);
        assertEquals(1, link.getCurrentUses());
        assertTrue(link.isActive());
        verify(teamMemberRepository, times(1)).save(any(TeamMember.class));
        verify(notificationService, times(1)).createNotification(
                eq(ownerUser.getId()),
                eq(NotificationType.TEAM_INVITE_LINK_USED),
                anyString(),
                anyString(),
                anyMap()
        );
    }

    // ==========================================
    // 5. Member & Lineup Management
    // ==========================================

    @Test
    @DisplayName("Should promote member to ADMIN by OWNER")
    void shouldPromoteToAdminByOwner() {
        when(teamMemberRepository.findByTeamIdAndUserId(sampleTeam.getId(), ownerUser.getId())).thenReturn(Optional.of(ownerMember));
        when(teamMemberRepository.findByTeamIdAndUserId(sampleTeam.getId(), regularUser.getId())).thenReturn(Optional.of(regularMember));
        when(teamRepository.findById(sampleTeam.getId())).thenReturn(Optional.of(sampleTeam));

        teamService.promoteToAdmin(sampleTeam.getId(), ownerUser.getId(), regularUser.getId());

        assertEquals(ManagementRole.ADMIN, regularMember.getManagementRole());
    }

    @Test
    @DisplayName("Should demote ADMIN to MEMBER by OWNER")
    void shouldDemoteToMemberByOwner() {
        when(teamMemberRepository.findByTeamIdAndUserId(sampleTeam.getId(), ownerUser.getId())).thenReturn(Optional.of(ownerMember));
        when(teamMemberRepository.findByTeamIdAndUserId(sampleTeam.getId(), adminUser.getId())).thenReturn(Optional.of(adminMember));
        when(teamRepository.findById(sampleTeam.getId())).thenReturn(Optional.of(sampleTeam));

        teamService.demoteToMember(sampleTeam.getId(), ownerUser.getId(), adminUser.getId());

        assertEquals(ManagementRole.MEMBER, adminMember.getManagementRole());
    }

    @Test
    @DisplayName("Should transfer ownership and downgrade former owner to ADMIN")
    void shouldTransferOwnershipSuccessfully() {
        when(teamMemberRepository.findByTeamIdAndUserId(sampleTeam.getId(), ownerUser.getId())).thenReturn(Optional.of(ownerMember));
        when(teamMemberRepository.findByTeamIdAndUserId(sampleTeam.getId(), adminUser.getId())).thenReturn(Optional.of(adminMember));
        when(teamRepository.findById(sampleTeam.getId())).thenReturn(Optional.of(sampleTeam));

        teamService.transferOwnership(sampleTeam.getId(), ownerUser.getId(), adminUser.getId());

        assertEquals(ManagementRole.ADMIN, ownerMember.getManagementRole());
        assertEquals(ManagementRole.OWNER, adminMember.getManagementRole());
        assertEquals(adminUser, sampleTeam.getOwner());
    }

    @Test
    @DisplayName("Should throw 400 when OWNER tries to leave without transferring ownership")
    void shouldThrowWhenOwnerLeavesWithoutTransferring() {
        when(teamMemberRepository.findByTeamIdAndUserId(sampleTeam.getId(), ownerUser.getId())).thenReturn(Optional.of(ownerMember));
        when(teamMemberRepository.findByTeamId(sampleTeam.getId())).thenReturn(List.of(ownerMember, adminMember));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> teamService.removeMember(sampleTeam.getId(), ownerUser.getId(), ownerUser.getId()));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    @Test
    @DisplayName("Should delete team when sole remaining member leaves")
    void shouldDeleteTeamWhenSoleMemberLeaves() {
        when(teamMemberRepository.findByTeamIdAndUserId(sampleTeam.getId(), ownerUser.getId())).thenReturn(Optional.of(ownerMember));
        when(teamMemberRepository.findByTeamId(sampleTeam.getId())).thenReturn(List.of(ownerMember));

        TeamResponse response = teamService.removeMember(sampleTeam.getId(), ownerUser.getId(), ownerUser.getId());

        assertNull(response);
        verify(teamRepository, times(1)).deleteById(sampleTeam.getId());
    }

    // ==========================================
    // 6. Scheduled Housekeeping
    // ==========================================

    @Test
    @DisplayName("Should execute housekeeping cleanup job successfully")
    void shouldExecuteHousekeepingJobSuccessfully() {
        when(teamInvitationRepository.expirePendingInvitations(any(Instant.class), any(Instant.class), eq(InvitationStatus.EXPIRED), eq(InvitationStatus.PENDING))).thenReturn(5);
        when(teamInvitationRepository.deleteOldInvitations(any(Instant.class), anyCollection())).thenReturn(10);
        when(teamJoinRequestRepository.deleteOldJoinRequests(any(Instant.class), anyCollection())).thenReturn(3);
        when(teamInviteLinkRepository.deleteOldInviteLinks(any(Instant.class))).thenReturn(2);

        teamService.cleanupExpiredAndOldTeamRecords();

        verify(teamInvitationRepository, times(1)).expirePendingInvitations(any(Instant.class), any(Instant.class), eq(InvitationStatus.EXPIRED), eq(InvitationStatus.PENDING));
        verify(teamInvitationRepository, times(1)).deleteOldInvitations(any(Instant.class), anyCollection());
        verify(teamJoinRequestRepository, times(1)).deleteOldJoinRequests(any(Instant.class), anyCollection());
        verify(teamInviteLinkRepository, times(1)).deleteOldInviteLinks(any(Instant.class));
    }
}

