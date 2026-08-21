package com.kurage.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kurage.api.domain.*;
import com.kurage.api.domain.enums.NotificationType;
import com.kurage.api.dto.request.TeamRequest;
import com.kurage.api.dto.response.InviteLinkResponse;
import com.kurage.api.dto.response.TeamInvitationResponse;
import com.kurage.api.dto.response.TeamJoinRequestResponse;
import com.kurage.api.dto.response.TeamResponse;
import com.kurage.api.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class TeamService {

    public static final Duration INVITATION_VALIDITY = Duration.ofDays(1);

    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final UserRepository userRepository;
    private final TeamInvitationRepository teamInvitationRepository;
    private final TeamJoinRequestRepository teamJoinRequestRepository;
    private final TeamInviteLinkRepository teamInviteLinkRepository;
    private final S3Service s3Service;
    private final NotificationService notificationService;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // ==========================================
    // 1. Team CRUD & Profiles
    // ==========================================

    @Transactional
    public TeamResponse createTeam(TeamRequest request, User owner) {
        if (teamRepository.existsByNameIgnoreCase(request.name())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Já existe um time com este nome.");
        }
        if (teamRepository.existsByTagIgnoreCase(request.tag())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Já existe um time com esta tag.");
        }

        Team team = Team.builder()
                .name(request.name().trim())
                .tag(request.tag().trim().toUpperCase())
                .owner(owner)
                .country(request.country() != null ? request.country().toUpperCase() : null)
                .logoUrl("https://api.dicebear.com/7.x/initials/svg?seed=" + request.name().trim() + "&backgroundColor=0a0a0c&textColor=ffffff")
                .teamElo(200)
                .build();

        Team savedTeam = teamRepository.save(team);

        TeamRole ownerRole = request.ownerRole() != null ? request.ownerRole() : TeamRole.PLAYER;

        TeamMember member = TeamMember.builder()
                .team(savedTeam)
                .user(owner)
                .teamRole(ownerRole)
                .teamFunction(resolveInGameFunction(owner, ownerRole))
                .managementRole(ManagementRole.OWNER)
                .build();
        teamMemberRepository.save(member);

        savedTeam.getMembers().add(member);

        notificationService.createNotification(
                owner.getId(),
                NotificationType.TEAM_CREATED,
                "Time Criado",
                "O time " + savedTeam.getName() + " foi criado com sucesso.",
                Map.of("teamId", savedTeam.getId().toString())
        );

        invalidateTeamCache(savedTeam.getId());
        invalidateUserTeamCaches(owner.getSteamId64());

        return TeamResponse.create(savedTeam);
    }

    @Transactional
    public TeamResponse updateTeamAvatar(UUID teamId, UUID userId, MultipartFile file) throws IOException {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Time não encontrado."));

        TeamMember member = teamMemberRepository.findByTeamIdAndUserId(teamId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Você não pertence a este time."));

        if (!member.isOwner()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Apenas o dono (OWNER) pode alterar o logo do time.");
        }

        String avatarUrl = s3Service.uploadAvatar(file, team.getId());
        team.setLogoUrl(avatarUrl);
        Team savedTeam = teamRepository.save(team);
        invalidateTeamCache(teamId);
        return TeamResponse.create(savedTeam);
    }

    @Transactional(readOnly = true)
    public TeamResponse getTeamByName(String name) {
        Team team = teamRepository.findByNameIgnoreCase(name)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Time não encontrado."));
        return TeamResponse.create(team);
    }

    @Transactional(readOnly = true)
    public TeamResponse getTeamByTag(String tag) {
        Team team = teamRepository.findByTagIgnoreCase(tag)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Time não encontrado."));
        return TeamResponse.create(team);
    }

    @Transactional(readOnly = true)
    public TeamResponse getTeamById(UUID id) {
        String cacheKey = "cache:team:" + id;

        try {
            String cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                return objectMapper.readValue(cached, TeamResponse.class);
            }
        } catch (Exception e) {
            log.warn("Redis unavailable during team cache read: {}", e.getMessage());
        }

        Team team = teamRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Time não encontrado."));
        TeamResponse response = TeamResponse.create(team);

        try {
            redisTemplate.opsForValue().set(
                    cacheKey,
                    objectMapper.writeValueAsString(response),
                    Duration.ofMinutes(5)
            );
        } catch (Exception e) {
            log.warn("Redis unavailable during team cache write: {}", e.getMessage());
        }

        return response;
    }

    // ==========================================
    // 2. Direct Invitations Flow (24h Validity)
    // ==========================================

    @Transactional
    public void sendInvite(UUID teamId, UUID actorId, String userIdentifier, TeamRole targetRole) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Time não encontrado."));

        TeamMember actorMember = teamMemberRepository.findByTeamIdAndUserId(teamId, actorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Você não pertence a este time."));

        if (!actorMember.isManager()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Apenas o OWNER ou ADMIN pode convidar jogadores.");
        }

        User invited = findUserByIdentifier(userIdentifier);

        if (teamMemberRepository.existsByTeamIdAndUserId(teamId, invited.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O usuário já está neste time.");
        }

        var existingInviteOpt = teamInvitationRepository.findByTeamIdAndInvitedUserIdAndStatus(teamId, invited.getId(), InvitationStatus.PENDING);
        if (existingInviteOpt.isPresent()) {
            TeamInvitation existingInvite = existingInviteOpt.get();
            if (isInviteExpired(existingInvite)) {
                existingInvite.setStatus(InvitationStatus.EXPIRED);
                existingInvite.setUpdatedAt(Instant.now());
                teamInvitationRepository.save(existingInvite);
            } else {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Já existe um convite pendente para este usuário.");
            }
        }

        TeamInvitation invite = TeamInvitation.builder()
                .team(team)
                .inviter(actorMember.getUser())
                .invitedUser(invited)
                .targetRole(targetRole)
                .status(InvitationStatus.PENDING)
                .build();

        TeamInvitation saved = teamInvitationRepository.save(invite);

        notificationService.createNotification(
                invited.getId(),
                NotificationType.TEAM_INVITE,
                "Convite de Time",
                "Você foi convidado para o time " + team.getName() + " como " + targetRole.name() + ".",
                Map.of("teamId", team.getId().toString(), "inviteId", saved.getId() != null ? saved.getId().toString() : "")
        );

        invalidateUserTeamCaches(invited.getSteamId64());
    }

    @Transactional(readOnly = true)
    public List<TeamInvitationResponse> getTeamInvites(UUID teamId, UUID actorId) {
        TeamMember actorMember = teamMemberRepository.findByTeamIdAndUserId(teamId, actorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Você não pertence a este time."));

        if (!actorMember.isManager()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Apenas o OWNER ou ADMIN pode ver convites do time.");
        }

        return teamInvitationRepository.findByTeamIdAndStatus(teamId, InvitationStatus.PENDING)
                .stream()
                .filter(invite -> !isInviteExpired(invite))
                .map(TeamInvitationResponse::create)
                .toList();
    }

    @Transactional
    public TeamResponse acceptInvite(UUID inviteId, UUID userId) {
        TeamInvitation invite = teamInvitationRepository.findById(inviteId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Convite não encontrado."));

        if (!invite.getInvitedUser().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Você não tem permissão para aceitar este convite.");
        }

        if (invite.getStatus() != InvitationStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Este convite já foi processado.");
        }

        if (isInviteExpired(invite)) {
            invite.setStatus(InvitationStatus.EXPIRED);
            invite.setUpdatedAt(Instant.now());
            teamInvitationRepository.save(invite);
            throw new ResponseStatusException(HttpStatus.GONE, "Este convite expirou (validade de 24 horas).");
        }

        addMemberToTeam(invite.getTeam().getId(), userId, invite.getTargetRole(), ManagementRole.MEMBER);

        invite.setStatus(InvitationStatus.ACCEPTED);
        invite.setUpdatedAt(Instant.now());
        teamInvitationRepository.save(invite);

        invalidateUserTeamCaches(invite.getInvitedUser().getSteamId64());

        return getTeamById(invite.getTeam().getId());
    }

    @Transactional
    public void declineInvite(UUID inviteId, UUID userId) {
        TeamInvitation invite = teamInvitationRepository.findById(inviteId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Convite não encontrado."));

        if (!invite.getInvitedUser().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Você não tem permissão para recusar este convite.");
        }

        if (invite.getStatus() != InvitationStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Este convite já foi processado.");
        }

        if (isInviteExpired(invite)) {
            invite.setStatus(InvitationStatus.EXPIRED);
            invite.setUpdatedAt(Instant.now());
            teamInvitationRepository.save(invite);
            throw new ResponseStatusException(HttpStatus.GONE, "Este convite expirou (validade de 24 horas).");
        }

        invite.setStatus(InvitationStatus.REJECTED);
        invite.setUpdatedAt(Instant.now());
        teamInvitationRepository.save(invite);

        invalidateUserTeamCaches(invite.getInvitedUser().getSteamId64());
    }

    // ==========================================
    // 3. Join Requests Flow
    // ==========================================

    @Transactional
    public TeamJoinRequestResponse createJoinRequest(UUID teamId, UUID requesterId, TeamRole desiredRole) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Time não encontrado."));

        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado."));

        if (teamMemberRepository.existsByTeamIdAndUserId(teamId, requesterId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Você já é membro deste time.");
        }

        if (teamJoinRequestRepository.existsByTeamIdAndRequesterIdAndStatus(teamId, requesterId, JoinRequestStatus.PENDING)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Você já possui uma solicitação pendente para este time.");
        }

        TeamJoinRequest request = TeamJoinRequest.builder()
                .team(team)
                .requester(requester)
                .desiredRole(desiredRole != null ? desiredRole : TeamRole.PLAYER)
                .status(JoinRequestStatus.PENDING)
                .build();

        TeamJoinRequest saved = teamJoinRequestRepository.save(request);

        // Notificar OWNER e ADMINs do time
        List<TeamMember> managers = teamMemberRepository.findByTeamIdAndManagementRoleIn(
                teamId, List.of(ManagementRole.OWNER, ManagementRole.ADMIN)
        );

        for (TeamMember manager : managers) {
            notificationService.createNotification(
                    manager.getUser().getId(),
                    NotificationType.TEAM_JOIN_REQUEST,
                    "Novo Pedido de Entrada",
                    "O jogador " + requester.getUsername() + " solicitou entrada no time como " + saved.getDesiredRole().name() + ".",
                    Map.of("teamId", team.getId().toString(), "requestId", saved.getId().toString())
            );
        }

        return TeamJoinRequestResponse.create(saved);
    }

    @Transactional(readOnly = true)
    public List<TeamJoinRequestResponse> getTeamJoinRequests(UUID teamId, UUID actorId) {
        TeamMember actorMember = teamMemberRepository.findByTeamIdAndUserId(teamId, actorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Você não pertence a este time."));

        if (!actorMember.isManager()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Apenas o OWNER ou ADMIN pode visualizar pedidos de entrada.");
        }

        return teamJoinRequestRepository.findByTeamIdAndStatus(teamId, JoinRequestStatus.PENDING)
                .stream()
                .map(TeamJoinRequestResponse::create)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TeamJoinRequestResponse> getMyJoinRequests(UUID userId) {
        return teamJoinRequestRepository.findByRequesterIdAndStatus(userId, JoinRequestStatus.PENDING)
                .stream()
                .map(TeamJoinRequestResponse::create)
                .toList();
    }

    @Transactional
    public TeamJoinRequestResponse approveJoinRequest(UUID requestId, UUID reviewerId, TeamRole finalRole) {
        TeamJoinRequest request = teamJoinRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitação não encontrada."));

        if (request.getStatus() != JoinRequestStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Esta solicitação já foi processada.");
        }

        UUID teamId = request.getTeam().getId();
        TeamMember reviewerMember = teamMemberRepository.findByTeamIdAndUserId(teamId, reviewerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Você não pertence a este time."));

        if (!reviewerMember.isManager()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Apenas o OWNER ou ADMIN pode aprovar solicitações.");
        }

        TeamRole roleToAssign = finalRole != null ? finalRole : request.getDesiredRole();

        addMemberToTeam(teamId, request.getRequester().getId(), roleToAssign, ManagementRole.MEMBER);

        request.setStatus(JoinRequestStatus.ACCEPTED);
        request.setReviewedBy(reviewerMember.getUser());
        request.setUpdatedAt(Instant.now());
        TeamJoinRequest saved = teamJoinRequestRepository.save(request);

        notificationService.createNotification(
                request.getRequester().getId(),
                NotificationType.TEAM_JOIN_APPROVED,
                "Pedido de Entrada Aprovado",
                "Seu pedido para entrar no time " + request.getTeam().getName() + " como " + roleToAssign.name() + " foi aprovado!",
                Map.of("teamId", teamId.toString())
        );

        invalidateUserTeamCaches(request.getRequester().getSteamId64());

        return TeamJoinRequestResponse.create(saved);
    }

    @Transactional
    public TeamJoinRequestResponse rejectJoinRequest(UUID requestId, UUID reviewerId) {
        TeamJoinRequest request = teamJoinRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitação não encontrada."));

        if (request.getStatus() != JoinRequestStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Esta solicitação já foi processada.");
        }

        UUID teamId = request.getTeam().getId();
        TeamMember reviewerMember = teamMemberRepository.findByTeamIdAndUserId(teamId, reviewerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Você não pertence a este time."));

        if (!reviewerMember.isManager()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Apenas o OWNER ou ADMIN pode rejeitar solicitações.");
        }

        request.setStatus(JoinRequestStatus.REJECTED);
        request.setReviewedBy(reviewerMember.getUser());
        request.setUpdatedAt(Instant.now());
        TeamJoinRequest saved = teamJoinRequestRepository.save(request);

        notificationService.createNotification(
                request.getRequester().getId(),
                NotificationType.TEAM_JOIN_REJECTED,
                "Pedido de Entrada Recusado",
                "Seu pedido para entrar no time " + request.getTeam().getName() + " foi recusado.",
                Map.of("teamId", teamId.toString())
        );

        return TeamJoinRequestResponse.create(saved);
    }

    // ==========================================
    // 4. Invite Links Flow
    // ==========================================

    @Transactional
    public InviteLinkResponse generateInviteLink(UUID teamId, UUID creatorId, TeamRole targetRole, Integer expiresInDays, Integer maxUses) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Time não encontrado."));

        TeamMember creatorMember = teamMemberRepository.findByTeamIdAndUserId(teamId, creatorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Você não pertence a este time."));

        if (!creatorMember.isManager()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Apenas o OWNER ou ADMIN pode criar links de convite.");
        }

        long activeLinks = teamInviteLinkRepository.countByTeamIdAndIsActiveTrueAndExpiresAtAfter(teamId, Instant.now());
        if (activeLinks >= 3) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Limite máximo de 3 links de convite ativos atingido para este time.");
        }

        int days = (expiresInDays != null && expiresInDays > 0) ? Math.min(expiresInDays, 30) : 7;
        int uses = (maxUses != null && maxUses > 0) ? maxUses : 1;

        String token = UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");

        TeamInviteLink link = TeamInviteLink.builder()
                .team(team)
                .createdBy(creatorMember.getUser())
                .token(token)
                .targetRole(targetRole)
                .expiresAt(Instant.now().plus(Duration.ofDays(days)))
                .maxUses(uses)
                .currentUses(0)
                .isActive(true)
                .build();

        TeamInviteLink saved = teamInviteLinkRepository.save(link);
        return InviteLinkResponse.create(saved);
    }

    @Transactional(readOnly = true)
    public List<InviteLinkResponse> getTeamInviteLinks(UUID teamId, UUID actorId) {
        TeamMember actorMember = teamMemberRepository.findByTeamIdAndUserId(teamId, actorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Você não pertence a este time."));

        if (!actorMember.isManager()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Apenas o OWNER ou ADMIN pode visualizar links de convite.");
        }

        return teamInviteLinkRepository.findByTeamIdAndIsActiveTrue(teamId)
                .stream()
                .filter(l -> l.getExpiresAt().isAfter(Instant.now()) && l.getCurrentUses() < l.getMaxUses())
                .map(InviteLinkResponse::create)
                .toList();
    }

    @Transactional
    public InviteLinkResponse validateInviteLink(String token) {
        TeamInviteLink link = teamInviteLinkRepository.findByTokenAndIsActiveTrue(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Link de convite inválido ou expirado."));

        if (link.getExpiresAt().isBefore(Instant.now()) || link.getCurrentUses() >= link.getMaxUses()) {
            link.setActive(false);
            teamInviteLinkRepository.save(link);
            throw new ResponseStatusException(HttpStatus.GONE, "Este link de convite expirou ou atingiu o limite de usos.");
        }

        return InviteLinkResponse.create(link);
    }

    @Transactional
    public TeamResponse acceptInviteLink(String token, UUID userId) {
        TeamInviteLink link = teamInviteLinkRepository.findByTokenAndIsActiveTrue(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Link de convite inválido ou inativo."));

        if (link.getExpiresAt().isBefore(Instant.now()) || link.getCurrentUses() >= link.getMaxUses()) {
            link.setActive(false);
            teamInviteLinkRepository.save(link);
            throw new ResponseStatusException(HttpStatus.GONE, "Este link de convite expirou ou atingiu o limite de usos.");
        }

        UUID teamId = link.getTeam().getId();
        User joiningUser = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado."));

        if (teamMemberRepository.existsByTeamIdAndUserId(teamId, userId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Você já é membro deste time.");
        }

        TeamRole roleToAssign = link.getTargetRole() != null ? link.getTargetRole() : TeamRole.PLAYER;

        addMemberToTeam(teamId, userId, roleToAssign, ManagementRole.MEMBER);

        link.setCurrentUses(link.getCurrentUses() + 1);
        if (link.getCurrentUses() >= link.getMaxUses()) {
            link.setActive(false);
        }
        teamInviteLinkRepository.save(link);

        notificationService.createNotification(
                link.getCreatedBy().getId(),
                NotificationType.TEAM_INVITE_LINK_USED,
                "Link de Convite Utilizado",
                "O jogador " + joiningUser.getUsername() + " entrou no time via link de convite.",
                Map.of("teamId", teamId.toString())
        );

        invalidateUserTeamCaches(joiningUser.getSteamId64());

        return getTeamById(teamId);
    }

    @Transactional
    public void revokeInviteLink(UUID linkId, UUID actorId) {
        TeamInviteLink link = teamInviteLinkRepository.findById(linkId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Link de convite não encontrado."));

        UUID teamId = link.getTeam().getId();
        TeamMember actorMember = teamMemberRepository.findByTeamIdAndUserId(teamId, actorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Você não pertence a este time."));

        if (!actorMember.isManager()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Apenas o OWNER ou ADMIN pode revogar links de convite.");
        }

        link.setActive(false);
        teamInviteLinkRepository.save(link);
    }

    // ==========================================
    // 5. Member Management & Roles
    // ==========================================

    @Transactional
    public TeamResponse updateMemberFunction(UUID teamId, UUID actorId, UUID memberId, InGameFunction newFunction) {
        TeamMember actorMember = teamMemberRepository.findByTeamIdAndUserId(teamId, actorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Você não está no time."));

        // Apenas managers ou o próprio usuário podem alterar sua função
        if (!actorMember.isManager() && !actorId.equals(memberId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Você não tem permissão para alterar a função deste jogador.");
        }

        TeamMember targetMember = teamMemberRepository.findByTeamIdAndUserId(teamId, memberId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Jogador não encontrado no time."));

        if (targetMember.getTeamRole() != TeamRole.PLAYER && targetMember.getTeamRole() != TeamRole.SUBSTITUTE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Apenas Jogadores e Substitutos podem ter função in-game.");
        }

        targetMember.setTeamFunction(newFunction);
        teamMemberRepository.save(targetMember);
        invalidateTeamCache(teamId);

        return getTeamById(teamId);
    }

    @Transactional
    public TeamResponse updateMemberRole(UUID teamId, UUID actorId, UUID memberId, TeamRole newRole) {
        TeamMember actorMember = teamMemberRepository.findByTeamIdAndUserId(teamId, actorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Você não está no time."));

        if (!actorMember.isManager()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Apenas o OWNER ou ADMIN pode alterar cargos in-game.");
        }

        TeamMember targetMember = teamMemberRepository.findByTeamIdAndUserId(teamId, memberId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Membro não encontrado no time."));

        // Se o ator for ADMIN, não pode alterar o cargo do OWNER nem de outro ADMIN
        if (actorMember.isAdmin() && (targetMember.isOwner() || targetMember.isAdmin())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Administradores não podem alterar o cargo de outros Administradores ou do Dono.");
        }

        if (targetMember.getTeamRole() == newRole) {
            return getTeamById(teamId);
        }

        // Valida se há vaga para a nova role (com Lock para prevenir concorrência)
        teamRepository.findByIdWithLock(teamId).orElseThrow();
        validateTeamLimits(teamId, newRole);

        targetMember.setTeamRole(newRole);
        if (newRole != TeamRole.PLAYER && newRole != TeamRole.SUBSTITUTE) {
            targetMember.setTeamFunction(null);
        }

        teamMemberRepository.save(targetMember);
        invalidateTeamCache(teamId);

        notificationService.createNotification(
                memberId,
                NotificationType.TEAM_ROLE_UPDATE,
                "Cargo Atualizado",
                "Seu cargo no time foi alterado para " + newRole.name() + ".",
                Map.of("teamId", teamId.toString())
        );

        return getTeamById(teamId);
    }

    @Transactional
    public TeamResponse promoteToAdmin(UUID teamId, UUID actorId, UUID memberId) {
        TeamMember actorMember = teamMemberRepository.findByTeamIdAndUserId(teamId, actorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Você não está no time."));

        if (!actorMember.isOwner()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Apenas o dono (OWNER) pode promover membros a Administrador.");
        }

        TeamMember targetMember = teamMemberRepository.findByTeamIdAndUserId(teamId, memberId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Membro não encontrado no time."));

        if (targetMember.getManagementRole() == ManagementRole.ADMIN || targetMember.getManagementRole() == ManagementRole.OWNER) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O membro já possui cargo administrativo.");
        }

        targetMember.setManagementRole(ManagementRole.ADMIN);
        teamMemberRepository.save(targetMember);
        invalidateTeamCache(teamId);

        return getTeamById(teamId);
    }

    @Transactional
    public TeamResponse demoteToMember(UUID teamId, UUID actorId, UUID memberId) {
        TeamMember actorMember = teamMemberRepository.findByTeamIdAndUserId(teamId, actorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Você não está no time."));

        if (!actorMember.isOwner()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Apenas o dono (OWNER) pode rebaixar Administradores.");
        }

        TeamMember targetMember = teamMemberRepository.findByTeamIdAndUserId(teamId, memberId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Membro não encontrado no time."));

        if (targetMember.getManagementRole() != ManagementRole.ADMIN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O membro não é um Administrador.");
        }

        targetMember.setManagementRole(ManagementRole.MEMBER);
        teamMemberRepository.save(targetMember);
        invalidateTeamCache(teamId);

        return getTeamById(teamId);
    }

    @Transactional
    public TeamResponse transferOwnership(UUID teamId, UUID currentOwnerId, UUID newOwnerId) {
        TeamMember currentOwnerMember = teamMemberRepository.findByTeamIdAndUserId(teamId, currentOwnerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Você não está no time."));

        if (!currentOwnerMember.isOwner()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Apenas o dono (OWNER) atual pode transferir a posse do time.");
        }

        if (currentOwnerId.equals(newOwnerId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Você já é o dono deste time.");
        }

        TeamMember newOwnerMember = teamMemberRepository.findByTeamIdAndUserId(teamId, newOwnerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Novo dono não encontrado no time."));

        currentOwnerMember.setManagementRole(ManagementRole.ADMIN);
        newOwnerMember.setManagementRole(ManagementRole.OWNER);

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Time não encontrado."));
        team.setOwner(newOwnerMember.getUser());
        teamRepository.save(team);

        teamMemberRepository.saveAll(List.of(currentOwnerMember, newOwnerMember));
        invalidateTeamCache(teamId);

        return getTeamById(teamId);
    }

    @Transactional
    public TeamResponse removeMember(UUID teamId, UUID actorId, UUID memberId) {
        TeamMember actorMember = teamMemberRepository.findByTeamIdAndUserId(teamId, actorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Você não está no time."));

        TeamMember targetMember = teamMemberRepository.findByTeamIdAndUserId(teamId, memberId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Membro não encontrado no time."));

        // Se não for o próprio usuário saindo:
        if (!actorId.equals(memberId)) {
            if (!actorMember.isManager()) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Você não tem permissão para remover membros.");
            }
            if (actorMember.isAdmin() && (targetMember.isOwner() || targetMember.isAdmin())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Administradores não podem expulsar outros Administradores ou o Dono.");
            }
        }

        List<TeamMember> currentMembers = teamMemberRepository.findByTeamId(teamId);
        int remainingMembers = currentMembers.size();

        // Se o OWNER estiver saindo e houver outros membros, ele precisa transferir a posse primeiro
        if (targetMember.isOwner() && remainingMembers > 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Você deve transferir a posse do time antes de sair.");
        }

        teamMemberRepository.delete(targetMember);

        // Se era o único membro, deleta o time por completo com cascata atômica
        if (remainingMembers <= 1) {
            log.info("Removing last member ({}) from team {}. Cascading team deletion.", targetMember.getUser().getId(), teamId);
            teamRepository.deleteById(teamId);
            invalidateTeamCache(teamId);
            invalidateUserTeamCaches(targetMember.getUser().getSteamId64());
            return null; // Time deletado
        }

        invalidateTeamCache(teamId);
        invalidateUserTeamCaches(targetMember.getUser().getSteamId64());
        return getTeamById(teamId);
    }

    // ==========================================
    // 6. Scheduled Housekeeping & Cleanup
    // ==========================================

    @Scheduled(cron = "${team.cleanup.cron:0 0 3 * * *}")
    @Transactional
    public void cleanupExpiredAndOldTeamRecords() {
        Instant inviteCutoff = Instant.now().minus(INVITATION_VALIDITY);
        Instant purgeCutoff = Instant.now().minus(Duration.ofDays(30));

        int expiredInvites = teamInvitationRepository.expirePendingInvitations(
                inviteCutoff,
                Instant.now(),
                InvitationStatus.EXPIRED,
                InvitationStatus.PENDING
        );

        int deletedInvites = teamInvitationRepository.deleteOldInvitations(
                purgeCutoff,
                List.of(InvitationStatus.ACCEPTED, InvitationStatus.REJECTED, InvitationStatus.EXPIRED)
        );

        int deletedRequests = teamJoinRequestRepository.deleteOldJoinRequests(
                purgeCutoff,
                List.of(JoinRequestStatus.ACCEPTED, JoinRequestStatus.REJECTED)
        );

        int deletedLinks = teamInviteLinkRepository.deleteOldInviteLinks(purgeCutoff);

        log.info("Team housekeeping completed: {} invites marked EXPIRED, {} old invites purged, {} old join requests purged, {} old invite links purged.",
                expiredInvites, deletedInvites, deletedRequests, deletedLinks);
    }

    // ==========================================
    // 6. Internal Helpers
    // ==========================================

    private void addMemberToTeam(UUID teamId, UUID userId, TeamRole role, ManagementRole managementRole) {
        Team team = teamRepository.findByIdWithLock(teamId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Time não encontrado."));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado."));

        if (teamMemberRepository.existsByTeamIdAndUserId(teamId, userId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Usuário já está neste time.");
        }

        validateTeamLimits(teamId, role);

        TeamMember member = TeamMember.builder()
                .team(team)
                .user(user)
                .teamRole(role)
                .managementRole(managementRole != null ? managementRole : ManagementRole.MEMBER)
                .teamFunction(resolveInGameFunction(user, role))
                .build();

        teamMemberRepository.save(member);
        invalidateTeamCache(teamId);
    }

    private void validateTeamLimits(UUID teamId, TeamRole requestedRole) {
        int currentCount = teamMemberRepository.countByTeamIdAndTeamRole(teamId, requestedRole);

        int maxAllowed = switch (requestedRole) {
            case PLAYER -> 5;
            case SUBSTITUTE -> 2;
            case COACH -> 1;
            case ASSISTANT_COACH -> 1;
        };

        if (currentCount >= maxAllowed) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Limite de vagas atingido para a função: " + requestedRole.name());
        }
    }

    private InGameFunction resolveInGameFunction(User user, TeamRole role) {
        if (role == TeamRole.PLAYER || role == TeamRole.SUBSTITUTE) {
            if (user.getPrimaryFunction() == PlayerFunction.COACH) {
                return InGameFunction.CORINGA;
            } else if (user.getPrimaryFunction() != null) {
                return InGameFunction.valueOf(user.getPrimaryFunction().name());
            } else {
                return InGameFunction.CORINGA;
            }
        }
        return null;
    }

    private User findUserByIdentifier(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Identificador de usuário inválido.");
        }

        // Tentar por SteamId64
        var userOpt = userRepository.findBySteamId64(identifier);
        if (userOpt.isPresent()) return userOpt.get();

        // Tentar por Kurage ID numérico
        try {
            long kurageId = Long.parseLong(identifier);
            userOpt = userRepository.findByKurageId(kurageId);
            if (userOpt.isPresent()) return userOpt.get();
        } catch (NumberFormatException ignored) {}

        // Tentar por UUID
        try {
            UUID id = UUID.fromString(identifier);
            userOpt = userRepository.findById(id);
            if (userOpt.isPresent()) return userOpt.get();
        } catch (IllegalArgumentException ignored) {}

        // Tentar por Username
        userOpt = userRepository.findByUsernameIgnoreCase(identifier);
        if (userOpt.isPresent()) return userOpt.get();

        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário convidado não encontrado.");
    }

    private boolean isInviteExpired(TeamInvitation invite) {
        if (invite.getCreatedAt() == null) return false;
        return invite.getCreatedAt().isBefore(Instant.now().minus(INVITATION_VALIDITY));
    }

    private void invalidateTeamCache(UUID teamId) {
        if (teamId != null) {
            try {
                redisTemplate.delete("cache:team:" + teamId);
            } catch (Exception e) {
                log.warn("Redis unavailable during team cache invalidation: {}", e.getMessage());
            }
        }
    }

    private void invalidateUserTeamCaches(String steamId64) {
        if (steamId64 != null) {
            try {
                redisTemplate.delete("cache:userteams:" + steamId64);
                redisTemplate.delete("cache:userinvites:" + steamId64);
            } catch (Exception e) {
                log.warn("Redis unavailable during user cache invalidation: {}", e.getMessage());
            }
        }
    }
}
