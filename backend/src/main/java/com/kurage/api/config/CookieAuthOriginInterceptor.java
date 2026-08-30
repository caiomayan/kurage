package com.kurage.api.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class CookieAuthOriginInterceptor implements HandlerInterceptor {

    private final CorsConfig corsConfig;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws IOException {
        if (!requiresTrustedOrigin(request)) {
            return true;
        }

        String origin = request.getHeader("Origin");
        if (origin != null && corsConfig.isAllowedOrigin(origin)) {
            return true;
        }

        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"error\":\"Untrusted request origin\"}");
        return false;
    }

    private static boolean requiresTrustedOrigin(HttpServletRequest request) {
        if (!"POST".equalsIgnoreCase(request.getMethod())) {
            return false;
        }
        String path = request.getRequestURI();
        return "/auth/refresh".equals(path) || "/auth/logout".equals(path);
    }
}
