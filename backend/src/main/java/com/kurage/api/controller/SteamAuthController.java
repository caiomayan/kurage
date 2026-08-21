package com.kurage.api.controller;

import com.kurage.api.config.AppConstants;
import com.kurage.api.domain.User;
import com.kurage.api.service.SteamAuthService;
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
    private final UserService userService;
    private final com.kurage.api.service.RefreshTokenService refreshTokenService;

    @GetMapping
    public void loginWithSteam(@RequestParam(defaultValue = "/") String returnUrl,
                               HttpServletResponse response) throws IOException {
        String safeReturnUrl = sanitizeReturnUrl(returnUrl);
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof User) {
            response.sendRedirect(frontendUrl + safeReturnUrl);
            return;
        }
        response.sendRedirect(steamAuthService.buildSteamLoginUrl(safeReturnUrl));
    }

    @GetMapping("/callback")
    public void steamCallback(HttpServletRequest request, HttpServletResponse response) throws IOException {
        try {
            log.info("Steam callback received");

            String steamId64 = steamAuthService.validateSteamLogin(request.getParameterMap());
            log.info("Steam validation succeeded for steamId64={}", steamId64);

            var profile = steamAuthService.fetchSteamProfile(steamId64);
            String clientIp = getClientIp(request);
            String cfCountry = request.getHeader("CF-IPCountry");
            User user = userService.getOrCreateUser(steamId64, profile.personaname(), profile.avatarfull(), clientIp, cfCountry);

            String deviceId = getOrCreateDeviceId(request, response);
            String userAgent = request.getHeader("User-Agent");
            String refreshToken = refreshTokenService.createRefreshToken(user.getSteamId64(), deviceId, userAgent);

            // Usa ResponseCookie do Spring (API moderna) para controle total do Set-Cookie header
            String actualDomain = com.kurage.api.util.CookieUtils.resolveDomain(request, cookieDomain);
            ResponseCookie refreshCookie = com.kurage.api.util.CookieUtils.buildResponseCookie(AppConstants.REFRESH_COOKIE_NAME, refreshToken, Duration.ofDays(30), actualDomain);
            response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());

            String redirectTo = sanitizeReturnUrl(request.getParameter("returnUrl"));

            String redirectLocation = frontendUrl + redirectTo;
            log.info("Redirecting to frontend after Steam authentication");
            response.sendRedirect(redirectLocation);

        } catch (Exception e) {
            log.error("Steam authentication failed in controller", e);
            response.sendRedirect(frontendUrl + "/login?error=steam_validation_failed");
        }
    }

    private String getOrCreateDeviceId(HttpServletRequest request, HttpServletResponse response) {
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("device_id".equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }

        String newDeviceId = UUID.randomUUID().toString();
        String actualDomain = com.kurage.api.util.CookieUtils.resolveDomain(request, cookieDomain);
        ResponseCookie deviceCookie = com.kurage.api.util.CookieUtils.buildResponseCookie("device_id", newDeviceId, Duration.ofDays(365), actualDomain);
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

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
