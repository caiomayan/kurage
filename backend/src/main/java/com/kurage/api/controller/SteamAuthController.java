package com.kurage.api.controller;

import com.kurage.api.config.AppConstants;
import com.kurage.api.domain.User;
import com.kurage.api.service.SteamAuthService;
import com.kurage.api.service.SteamLoginStateService;
import com.kurage.api.service.UserService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/auth/steam")
@RequiredArgsConstructor
public class SteamAuthController {

    @Value("${frontend.url:http://localhost:3000}")
    private String frontendUrl;

    @Value("${cookie.domain:}")
    private String cookieDomain;

    private final SteamAuthService steamAuthService;
    private final SteamLoginStateService steamLoginStateService;
    private final UserService userService;
    private final com.kurage.api.service.RefreshTokenService refreshTokenService;

    @GetMapping
    public void loginWithSteam(@RequestParam(defaultValue = "/") String returnUrl,
                               HttpServletRequest request,
                               HttpServletResponse response) throws IOException {
        String safeReturnUrl = sanitizeReturnUrl(returnUrl);
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof User) {
            response.sendRedirect(frontendUrl + safeReturnUrl);
            return;
        }

        String state = steamLoginStateService.createState(safeReturnUrl);
        String actualDomain = com.kurage.api.util.CookieUtils.resolveDomain(request, cookieDomain);
        ResponseCookie stateCookie = com.kurage.api.util.CookieUtils.buildResponseCookie(
                AppConstants.STEAM_LOGIN_STATE_COOKIE_NAME,
                state,
                Duration.ofMinutes(10),
                actualDomain,
                "/auth/steam/callback"
        );
        response.addHeader(HttpHeaders.SET_COOKIE, stateCookie.toString());
        response.sendRedirect(steamAuthService.buildSteamLoginUrl(state));
    }

    @GetMapping("/callback")
    public void steamCallback(HttpServletRequest request, HttpServletResponse response) throws IOException {
        try {
            log.info("Steam callback received");

            String state = request.getParameter("state");
            String cookieState = findCookie(request, AppConstants.STEAM_LOGIN_STATE_COOKIE_NAME);
            clearSteamStateCookie(request, response);
            if (!secureEquals(state, cookieState)) {
                throw new IllegalArgumentException("Steam login state mismatch");
            }

            String storedReturnUrl = steamLoginStateService.consumeState(state);
            if (storedReturnUrl == null) {
                throw new IllegalArgumentException("Steam login state is invalid, expired or already consumed");
            }
            String redirectTo = sanitizeReturnUrl(storedReturnUrl);

            String steamId64 = steamAuthService.validateSteamLogin(
                    request.getParameterMap(),
                    steamAuthService.buildCallbackUrl(state)
            );
            log.info("Steam validation succeeded for steamId64={}", steamId64);

            var profile = steamAuthService.fetchSteamProfile(steamId64);
            String cfCountry = request.getHeader("CF-IPCountry");
            User user = userService.getOrCreateUser(steamId64, profile.personaname(), profile.avatarfull(), cfCountry);
            if (!user.isActiveAccount()) {
                log.warn("Steam login rejected for suspended account userId={}", user.getId());
                response.sendRedirect(frontendUrl + "/?error=account_suspended");
                return;
            }

            String deviceId = getOrCreateDeviceId(request, response);
            String userAgent = request.getHeader("User-Agent");
            String refreshToken = refreshTokenService.createRefreshToken(user.getSteamId64(), deviceId, userAgent);

            // Usa ResponseCookie do Spring (API moderna) para controle total do Set-Cookie header
            String actualDomain = com.kurage.api.util.CookieUtils.resolveDomain(request, cookieDomain);
            ResponseCookie refreshCookie = com.kurage.api.util.CookieUtils.buildResponseCookie(AppConstants.REFRESH_COOKIE_NAME, refreshToken, Duration.ofDays(30), actualDomain);
            response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());

            String redirectLocation = frontendUrl + redirectTo;
            log.info("Redirecting to frontend after Steam authentication");
            response.sendRedirect(redirectLocation);

        } catch (Exception e) {
            log.error("Steam authentication failed in controller", e);
            response.sendRedirect(frontendUrl + "/?error=steam_validation_failed");
        }
    }

    private String getOrCreateDeviceId(HttpServletRequest request, HttpServletResponse response) {
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if (AppConstants.DEVICE_COOKIE_NAME.equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }

        String newDeviceId = UUID.randomUUID().toString();
        String actualDomain = com.kurage.api.util.CookieUtils.resolveDomain(request, cookieDomain);
        ResponseCookie deviceCookie = com.kurage.api.util.CookieUtils.buildResponseCookie(AppConstants.DEVICE_COOKIE_NAME, newDeviceId, Duration.ofDays(365), actualDomain);
        response.addHeader(HttpHeaders.SET_COOKIE, deviceCookie.toString());

        return newDeviceId;
    }

    static String sanitizeReturnUrl(String returnUrl) {
        if (returnUrl == null
                || returnUrl.isBlank()
                || !returnUrl.startsWith("/")
                || returnUrl.startsWith("//")
                || returnUrl.indexOf('\\') >= 0) {
            return "/";
        }

        for (int index = 0; index < returnUrl.length(); index++) {
            if (Character.isISOControl(returnUrl.charAt(index))) {
                return "/";
            }
        }

        try {
            URI parsed = URI.create(returnUrl);
            if (parsed.isAbsolute() || parsed.getRawAuthority() != null) {
                return "/";
            }
        } catch (IllegalArgumentException exception) {
            return "/";
        }

        return returnUrl;
    }

    private static String findCookie(HttpServletRequest request, String name) {
        if (request.getCookies() == null) {
            return null;
        }
        for (Cookie cookie : request.getCookies()) {
            if (name.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    private void clearSteamStateCookie(HttpServletRequest request, HttpServletResponse response) {
        String actualDomain = com.kurage.api.util.CookieUtils.resolveDomain(request, cookieDomain);
        ResponseCookie clearState = com.kurage.api.util.CookieUtils.buildResponseCookie(
                AppConstants.STEAM_LOGIN_STATE_COOKIE_NAME,
                "",
                Duration.ZERO,
                actualDomain,
                "/auth/steam/callback"
        );
        response.addHeader(HttpHeaders.SET_COOKIE, clearState.toString());
    }

    private static boolean secureEquals(String left, String right) {
        if (left == null || right == null) {
            return false;
        }
        return MessageDigest.isEqual(
                left.getBytes(StandardCharsets.UTF_8),
                right.getBytes(StandardCharsets.UTF_8)
        );
    }
}
