package com.kurage.api.controller;

import com.kurage.api.domain.User;
import com.kurage.api.dto.request.UpdateContactRequest;
import com.kurage.api.dto.request.AvatarCropRequest;
import com.kurage.api.dto.request.UpdateFunctionsRequest;
import com.kurage.api.dto.response.HovercardResponse;
import com.kurage.api.dto.response.ProfileVisitorResponse;
import com.kurage.api.dto.response.TeamInvitationResponse;
import com.kurage.api.dto.response.TeamResponse;
import com.kurage.api.dto.response.UserResponse;
import com.kurage.api.dto.response.UserContactResponse;
import com.kurage.api.dto.response.SteamAvatarSourceResponse;
import com.kurage.api.service.ProfileVisitService;
import com.kurage.api.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import jakarta.validation.Valid;

import java.util.List;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final ProfileVisitService profileVisitService;

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getMe(@AuthenticationPrincipal User user) {
        return userService.getUserBySteamId(user.getSteamId64())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/search")
    public ResponseEntity<List<UserResponse>> searchUsers(@RequestParam("q") String query) {
        return ResponseEntity.ok(userService.searchUsers(query));
    }

    @GetMapping("/kurage/{kurageId}")
    public ResponseEntity<UserResponse> getUserByKurageId(@PathVariable Long kurageId) {
        return userService.getUserByKurageId(kurageId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{identifier}")
    public ResponseEntity<UserResponse> getUserByIdentifier(@PathVariable String identifier) {
        return userService.getUserByIdentifier(identifier)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{kurageId}/hovercard")
    public ResponseEntity<HovercardResponse> getHovercard(@PathVariable Long kurageId) {
        return userService.getHovercard(kurageId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/hovercard")
    public ResponseEntity<HovercardResponse> getHovercardByUsername(
            @RequestParam String username) {
        return userService.getHovercardByUsername(username)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/me/visitors")
    public ResponseEntity<List<ProfileVisitorResponse>> getMyVisitors(
            @AuthenticationPrincipal User user,
            @RequestParam(value = "limit", defaultValue = "20") int limit) {
        return ResponseEntity.ok(profileVisitService.getRecentVisitors(user, limit));
    }

    @PostMapping("/kurage/{kurageId}/visit")
    public ResponseEntity<Void> recordProfileVisit(
            @PathVariable Long kurageId,
            @AuthenticationPrincipal User user) {
        profileVisitService.recordVisitByKurageId(kurageId, user);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/kurage/{kurageId}/visitors")
    public ResponseEntity<List<ProfileVisitorResponse>> getProfileVisitors(
            @PathVariable Long kurageId,
            @AuthenticationPrincipal User user,
            @RequestParam(value = "limit", defaultValue = "20") int limit) {
        return ResponseEntity.ok(profileVisitService.getRecentVisitors(user, kurageId, limit));
    }

    @PostMapping("/me/avatar")
    public ResponseEntity<UserResponse> updateAvatar(
            @AuthenticationPrincipal User user,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(userService.updateAvatar(user, file));
    }

    @GetMapping("/me/steam-avatar")
    public ResponseEntity<SteamAvatarSourceResponse> getSteamAvatarSource(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(userService.getSteamAvatarSource(user));
    }

    @PostMapping("/me/avatar/steam")
    public ResponseEntity<UserResponse> updateAvatarFromSteam(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody AvatarCropRequest crop) {
        return ResponseEntity.ok(userService.updateAvatarFromSteam(user, crop));
    }

    @PutMapping("/me/username")
    public ResponseEntity<UserResponse> updateUsername(
            @AuthenticationPrincipal User user,
            @RequestParam("username") String username) {
        if (username == null || username.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(userService.updateUsername(user, username.trim()));
    }

    @PutMapping("/me/country")
    public ResponseEntity<UserResponse> updateCountry(
            @AuthenticationPrincipal User user,
            @RequestParam("country") String country) {
        if (country != null && country.trim().length() > 2) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(userService.updateCountry(user, country != null ? country.trim() : null));
    }

    /** Private contact data for future verified email and WhatsApp channels. */
    @GetMapping("/me/contact")
    public ResponseEntity<UserContactResponse> getMyContact(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(userService.getContact(user));
    }

    @PutMapping("/me/contact")
    public ResponseEntity<UserContactResponse> updateMyContact(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody UpdateContactRequest request) {
        return ResponseEntity.ok(userService.updateContact(user, request.email(), request.phoneNumber()));
    }

    @PutMapping("/me/steam-sync")
    public ResponseEntity<UserResponse> syncSteamProfile(
            @AuthenticationPrincipal User user,
            @RequestParam(value = "type", defaultValue = "both") String type) {
        return ResponseEntity.ok(userService.syncSteamProfile(user, type));
    }

    @PutMapping("/me/functions")
    public ResponseEntity<UserResponse> updateFunctions(
            @AuthenticationPrincipal User user,
            @RequestBody UpdateFunctionsRequest request) {
        return ResponseEntity.ok(userService.updateFunctions(user, request.primaryFunction(), request.secondaryFunction()));
    }

    @PutMapping("/me/faceit-sync")
    public ResponseEntity<UserResponse> syncFaceitProfile(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(userService.syncFaceitProfile(user));
    }

    @GetMapping("/me/teams")
    public ResponseEntity<List<TeamResponse>> getMyTeams(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(userService.getUserTeams(user));
    }

    @GetMapping("/me/invites")
    public ResponseEntity<List<TeamInvitationResponse>> getMyInvites(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(userService.getUserInvites(user));
    }
}
