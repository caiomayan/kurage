package com.kurage.api.config;

import com.kurage.api.domain.User;
import com.kurage.api.service.RateLimitingService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
@RequiredArgsConstructor
public class RateLimitInterceptor implements HandlerInterceptor {

    private final RateLimitingService rateLimitingService;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String ip = getClientIp(request);
        String path = request.getRequestURI();

        if (isImageUpload(request.getMethod(), path)) {
            String userId = authenticatedUserId();
            if (userId != null && !rateLimitingService.allowImageUpload(userId)) {
                reject(response, "Too Many Requests (Image Upload)");
                return false;
            }
            // Unauthenticated requests continue to the IP guard and are then
            // rejected by Spring Security.
        }

        if (isPrivateInventoryPath(path)) {
            String userId = authenticatedUserId();
            if (userId != null) {
                boolean allowed = "PUT".equalsIgnoreCase(request.getMethod())
                        ? rateLimitingService.allowInventoryMutation(userId)
                        : rateLimitingService.allowInventoryRead(userId);
                if (!allowed) {
                    reject(response, "Too Many Requests (Inventory)");
                    return false;
                }
                return true;
            }
            // Security will reject unauthenticated access. Keep the public IP
            // guard here only for malformed or unauthenticated requests.
        }

        // 1. Limite Global por IP
        if (!rateLimitingService.allowGlobalIp(ip)) {
            reject(response, "Too Many Requests (Global)");
            return false;
        }

        // 2. Limite Restrito para Rotas de Autenticação
        if (path.startsWith("/auth")) {
            if (!rateLimitingService.allowAuthIp(ip)) {
                reject(response, "Too Many Requests (Auth)");
                return false;
            }
        }

        // 3. Limite para Busca
        if (path.startsWith("/search") || path.startsWith("/users/search")) {
            if (!rateLimitingService.allowSearch(ip)) {
                reject(response, "Too Many Requests (Search)");
                return false;
            }
        }

        // 4. Limite para Hovercards
        if (path.contains("/hovercard")) {
            if (!rateLimitingService.allowHovercard(ip)) {
                reject(response, "Too Many Requests (Hovercard)");
                return false;
            }
        }

        return true;
    }

    private static boolean isPrivateInventoryPath(String path) {
        return "/inventory/me".equals(path)
                || "/api/inventory/me".equals(path)
                || "/api/cstrike/inventory/me".equals(path);
    }

    private static boolean isImageUpload(String method, String path) {
        if (!"POST".equalsIgnoreCase(method)) {
            return false;
        }
        return "/users/me/avatar".equals(path)
                || "/users/me/avatar/steam".equals(path)
                || path.matches("/teams/[^/]+/avatar");
    }

    private static String authenticatedUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof User user) || user.getId() == null) {
            return null;
        }
        return user.getId().toString();
    }

    private static void reject(HttpServletResponse response, String message) throws java.io.IOException {
        long millisecondsUntilNextWindow = 60_000 - (System.currentTimeMillis() % 60_000);
        response.setStatus(429);
        response.setHeader("Retry-After", Long.toString(Math.max(1, (long) Math.ceil(millisecondsUntilNextWindow / 1_000d))));
        response.setContentType("text/plain;charset=UTF-8");
        response.getWriter().write(message);
    }

    private static String getClientIp(HttpServletRequest request) {
        // Forwarded headers are normalized once by Spring. Reading the raw
        // header here would let callers choose their own rate-limit identity.
        return request.getRemoteAddr();
    }
}
