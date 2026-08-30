package com.kurage.api.controller;

import com.kurage.api.config.AppConstants;
import com.kurage.api.domain.User;
import com.kurage.api.dto.redis.RefreshTokenSession;
import com.kurage.api.security.JwtService;
import com.kurage.api.service.RefreshTokenService;
import com.kurage.api.service.UserService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final RefreshTokenService refreshTokenService;
    private final JwtService jwtService;
    private final UserService userService;

    @org.springframework.beans.factory.annotation.Value("${cookie.domain:}")
    private String cookieDomain;

    @PostMapping("/refresh")
    public ResponseEntity<?> refreshToken(HttpServletRequest request, HttpServletResponse response) {
        String refreshToken = null;
        String requestDeviceId = null;

        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if (AppConstants.REFRESH_COOKIE_NAME.equals(cookie.getName())) {
                    refreshToken = cookie.getValue();
                } else if (AppConstants.DEVICE_COOKIE_NAME.equals(cookie.getName())) {
                    requestDeviceId = cookie.getValue();
                }
            }
        }

        if (refreshToken == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No refresh token provided"));
        }

        if (requestDeviceId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No device ID provided"));
        }

        RefreshTokenSession currentSession = refreshTokenService.validateCurrentRefreshToken(refreshToken);
        if (currentSession == null) {
            clearRefreshCookie(request, response);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid, expired or compromised refresh token"));
        }

        User user = userService.getBySteamId64(currentSession.userId()).orElse(null);
        if (user == null || !user.isActiveAccount()) {
            refreshTokenService.revokeRefreshToken(refreshToken);
            clearRefreshCookie(request, response);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Session is no longer authorized"));
        }

        // Tenta rotacionar o token (se for reúso malicioso, a família já é revogada aqui dentro)
        String newRefreshToken = refreshTokenService.rotateRefreshToken(refreshToken, requestDeviceId);
        
        if (newRefreshToken == null) {
            // Falha na rotação. Limpar cookies do cliente para forçar novo login.
            clearRefreshCookie(request, response);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid, expired or compromised refresh token"));
        }

        // Recuperar sessão do novo token para saber o userId
        RefreshTokenSession session = refreshTokenService.validateRefreshToken(newRefreshToken);
        if (session == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Failed to retrieve session after rotation"));
        }

        if (!session.userId().equals(user.getSteamId64())) {
            refreshTokenService.revokeRefreshToken(newRefreshToken);
            clearRefreshCookie(request, response);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "User not found"));
        }

        String newAccessToken = jwtService.generateToken(user.getSteamId64(), user.getRole().name(), user.getId().toString());

        // Envia o novo Refresh Token via Set-Cookie
        String actualDomain = com.kurage.api.util.CookieUtils.resolveDomain(request, cookieDomain);
        org.springframework.http.ResponseCookie refreshCookie = com.kurage.api.util.CookieUtils.buildResponseCookie(AppConstants.REFRESH_COOKIE_NAME, newRefreshToken, java.time.Duration.ofDays(30), actualDomain);
        response.addHeader(org.springframework.http.HttpHeaders.SET_COOKIE, refreshCookie.toString());

        return ResponseEntity.ok(Map.of("accessToken", newAccessToken));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request, HttpServletResponse response) {
        String actualDomain = com.kurage.api.util.CookieUtils.resolveDomain(request, cookieDomain);
        ResponseCookie clearRefresh = com.kurage.api.util.CookieUtils.buildResponseCookie(
                AppConstants.REFRESH_COOKIE_NAME,
                "",
                java.time.Duration.ZERO,
                actualDomain
        );
        response.addHeader(HttpHeaders.SET_COOKIE, clearRefresh.toString());

        String refreshToken = null;
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if (AppConstants.REFRESH_COOKIE_NAME.equals(cookie.getName())) {
                    refreshToken = cookie.getValue();
                    break;
                }
            }
        }

        if (refreshToken != null && !refreshToken.isBlank()) {
            refreshTokenService.revokeRefreshToken(refreshToken);
        }

        return ResponseEntity.noContent().build();
    }

    private void clearRefreshCookie(HttpServletRequest request, HttpServletResponse response) {
        String actualDomain = com.kurage.api.util.CookieUtils.resolveDomain(request, cookieDomain);
        ResponseCookie clearRefresh = com.kurage.api.util.CookieUtils.buildResponseCookie(
                AppConstants.REFRESH_COOKIE_NAME,
                "",
                java.time.Duration.ZERO,
                actualDomain
        );
        response.addHeader(HttpHeaders.SET_COOKIE, clearRefresh.toString());
    }
}
