package com.kurage.api.security;

import com.kurage.api.config.AppConstants;
import com.kurage.api.domain.User;
import com.kurage.api.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String token = extractToken(request);

        if (token != null) {
            com.auth0.jwt.interfaces.DecodedJWT decodedJWT = jwtService.validateToken(token);

            if (decodedJWT != null && !decodedJWT.getSubject().isEmpty()) {
                String steamId64 = decodedJWT.getSubject();
                String role = decodedJWT.getClaim("role").asString();
                String userId = decodedJWT.getClaim("id").asString();

                if (role != null && userId != null) {
                    User transientUser = new User();
                    transientUser.setId(java.util.UUID.fromString(userId));
                    transientUser.setSteamId64(steamId64);
                    try {
                        transientUser.setRole(com.kurage.api.domain.UserRole.valueOf(role));
                    } catch (Exception e) {
                        transientUser.setRole(com.kurage.api.domain.UserRole.USER);
                    }

                    var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + transientUser.getRole().name()));
                    var authentication = new UsernamePasswordAuthenticationToken(transientUser, null, authorities);
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            }
        }

        filterChain.doFilter(request, response);
    }

    private String extractToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return null;
    }
}
