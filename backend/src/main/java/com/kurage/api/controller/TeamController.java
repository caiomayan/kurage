package com.kurage.api.controller;

import com.kurage.api.domain.User;
import com.kurage.api.dto.request.*;
import com.kurage.api.dto.response.InviteLinkResponse;
import com.kurage.api.dto.response.TeamInvitationResponse;
import com.kurage.api.dto.response.TeamJoinRequestResponse;
import com.kurage.api.dto.response.TeamResponse;
import com.kurage.api.service.TeamService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/teams")
@RequiredArgsConstructor
public class TeamController {

    private final TeamService teamService;

    // ==========================================
    // 1. Team CRUD & Profiles
    // ==========================================

    @PostMapping
    public ResponseEntity<TeamResponse> createTeam(@Valid @RequestBody TeamRequest request, @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(teamService.createTeam(request, user));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TeamResponse> getTeamById(@PathVariable UUID id) {
        return ResponseEntity.ok(teamService.getTeamById(id));
    }

    @GetMapping("/name/{name}")
    public ResponseEntity<TeamResponse> getTeamByName(@PathVariable String name) {
        return ResponseEntity.ok(teamService.getTeamByName(name));
    }

    @GetMapping("/tag/{tag}")
    public ResponseEntity<TeamResponse> getTeamByTag(@PathVariable String tag) {
        return ResponseEntity.ok(teamService.getTeamByTag(tag));
    }

    @PostMapping("/{id}/avatar")
    public ResponseEntity<TeamResponse> updateAvatar(
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal User user) throws IOException {
        return ResponseEntity.ok(teamService.updateTeamAvatar(id, user.getId(), file));
    }

    // ==========================================
    // 2. Direct Invitations
    // ==========================================

    @PostMapping("/{id}/invites")
    public ResponseEntity<Void> sendInvite(
            @PathVariable UUID id,
            @Valid @RequestBody TeamInviteRequest request,
            @AuthenticationPrincipal User user) {
        teamService.sendInvite(id, user.getId(), request.steamId64(), request.targetRole());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @GetMapping("/{id}/invites")
    public ResponseEntity<List<TeamInvitationResponse>> getTeamInvites(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(teamService.getTeamInvites(id, user.getId()));
    }

    @PostMapping("/invites/{inviteId}/accept")
    public ResponseEntity<TeamResponse> acceptInvite(
            @PathVariable UUID inviteId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(teamService.acceptInvite(inviteId, user.getId()));
    }

    @PostMapping("/invites/{inviteId}/decline")
    public ResponseEntity<Void> declineInvite(
            @PathVariable UUID inviteId,
            @AuthenticationPrincipal User user) {
        teamService.declineInvite(inviteId, user.getId());
        return ResponseEntity.ok().build();
    }

    // ==========================================
    // 3. Join Requests
    // ==========================================

    @PostMapping("/{id}/join-requests")
    public ResponseEntity<TeamJoinRequestResponse> createJoinRequest(
            @PathVariable UUID id,
            @Valid @RequestBody CreateTeamJoinRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(teamService.createJoinRequest(id, user.getId(), request.desiredRole()));
    }

    @GetMapping("/{id}/join-requests")
    public ResponseEntity<List<TeamJoinRequestResponse>> getTeamJoinRequests(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(teamService.getTeamJoinRequests(id, user.getId()));
    }

    @GetMapping("/join-requests/me")
    public ResponseEntity<List<TeamJoinRequestResponse>> getMyJoinRequests(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(teamService.getMyJoinRequests(user.getId()));
    }

    @PostMapping("/join-requests/{requestId}/approve")
    public ResponseEntity<TeamJoinRequestResponse> approveJoinRequest(
            @PathVariable UUID requestId,
            @RequestBody(required = false) ApproveJoinRequestRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(teamService.approveJoinRequest(
                requestId,
                user.getId(),
                request != null ? request.finalRole() : null
        ));
    }

    @PostMapping("/join-requests/{requestId}/reject")
    public ResponseEntity<TeamJoinRequestResponse> rejectJoinRequest(
            @PathVariable UUID requestId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(teamService.rejectJoinRequest(requestId, user.getId()));
    }

    // ==========================================
    // 4. Invite Links
    // ==========================================

    @PostMapping("/{id}/invite-links")
    public ResponseEntity<InviteLinkResponse> generateInviteLink(
            @PathVariable UUID id,
            @RequestBody(required = false) CreateInviteLinkRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(teamService.generateInviteLink(
                id,
                user.getId(),
                request != null ? request.targetRole() : null,
                request != null ? request.expiresInDays() : null,
                request != null ? request.maxUses() : null
        ));
    }

    @GetMapping("/{id}/invite-links")
    public ResponseEntity<List<InviteLinkResponse>> getTeamInviteLinks(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(teamService.getTeamInviteLinks(id, user.getId()));
    }

    @GetMapping("/invite-links/{token}")
    public ResponseEntity<InviteLinkResponse> validateInviteLink(@PathVariable String token) {
        return ResponseEntity.ok(teamService.validateInviteLink(token));
    }

    @PostMapping("/invite-links/{token}/accept")
    public ResponseEntity<TeamResponse> acceptInviteLink(
            @PathVariable String token,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(teamService.acceptInviteLink(token, user.getId()));
    }

    @DeleteMapping("/invite-links/{linkId}")
    public ResponseEntity<Void> revokeInviteLink(
            @PathVariable UUID linkId,
            @AuthenticationPrincipal User user) {
        teamService.revokeInviteLink(linkId, user.getId());
        return ResponseEntity.noContent().build();
    }

    // ==========================================
    // 5. Member & Lineup Management
    // ==========================================

    @PutMapping("/{id}/members/{memberId}/function")
    public ResponseEntity<TeamResponse> updateMemberFunction(
            @PathVariable UUID id,
            @PathVariable UUID memberId,
            @Valid @RequestBody UpdateTeamFunctionRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(teamService.updateMemberFunction(id, user.getId(), memberId, request.function()));
    }

    @PutMapping("/{id}/members/{memberId}/role")
    public ResponseEntity<TeamResponse> updateMemberRole(
            @PathVariable UUID id,
            @PathVariable UUID memberId,
            @Valid @RequestBody UpdateTeamRoleRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(teamService.updateMemberRole(id, user.getId(), memberId, request.role()));
    }

    @PutMapping("/{id}/members/{memberId}/promote")
    public ResponseEntity<TeamResponse> promoteToAdmin(
            @PathVariable UUID id,
            @PathVariable UUID memberId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(teamService.promoteToAdmin(id, user.getId(), memberId));
    }

    @PutMapping("/{id}/members/{memberId}/demote")
    public ResponseEntity<TeamResponse> demoteToMember(
            @PathVariable UUID id,
            @PathVariable UUID memberId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(teamService.demoteToMember(id, user.getId(), memberId));
    }

    @PutMapping("/{id}/members/{memberId}/transfer-ownership")
    public ResponseEntity<TeamResponse> transferOwnership(
            @PathVariable UUID id,
            @PathVariable UUID memberId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(teamService.transferOwnership(id, user.getId(), memberId));
    }

    @PutMapping("/{id}/members/{memberId}/transfer-manager")
    public ResponseEntity<TeamResponse> transferManager(
            @PathVariable UUID id,
            @PathVariable UUID memberId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(teamService.transferOwnership(id, user.getId(), memberId));
    }

    @DeleteMapping("/{id}/members/{memberId}")
    public ResponseEntity<TeamResponse> removeMember(
            @PathVariable UUID id,
            @PathVariable UUID memberId,
            @AuthenticationPrincipal User user) {
        TeamResponse response = teamService.removeMember(id, user.getId(), memberId);
        if (response == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(response);
    }
}
