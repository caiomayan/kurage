package com.kurage.api.config;

import com.kurage.api.service.RateLimitingService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
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

        // 1. Limite Global por IP
        if (!rateLimitingService.allowGlobalIp(ip)) {
            response.setStatus(429);
            response.getWriter().write("Too Many Requests (Global)");
            return false;
        }

        // 2. Limite Restrito para Rotas de Autenticação
        if (path.startsWith("/auth")) {
            if (!rateLimitingService.allowAuthIp(ip)) {
                response.setStatus(429);
                response.getWriter().write("Too Many Requests (Auth)");
                return false;
            }
        }

        // 3. Limite para Busca
        if (path.startsWith("/search") || path.startsWith("/users/search")) {
            if (!rateLimitingService.allowSearch(ip)) {
                response.setStatus(429);
                response.getWriter().write("Too Many Requests (Search)");
                return false;
            }
        }

        // 4. Limite para Hovercards
        if (path.contains("/hovercard")) {
            if (!rateLimitingService.allowHovercard(ip)) {
                response.setStatus(429);
                response.getWriter().write("Too Many Requests (Hovercard)");
                return false;
            }
        }

        return true;
    }

    private String getClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null || xfHeader.isEmpty()) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0].trim();
    }
}
