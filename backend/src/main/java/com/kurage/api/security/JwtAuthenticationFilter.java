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
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;
import java.util.UUID;

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

            if (decodedJWT != null && decodedJWT.getSubject() != null && !decodedJWT.getSubject().isEmpty()) {
                String steamId64 = decodedJWT.getSubject();
                String userId = decodedJWT.getClaim("id").asString();

                findActiveTokenOwner(userId, steamId64).ifPresent(user -> {
                    var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
                    var authentication = new UsernamePasswordAuthenticationToken(user, null, authorities);
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                });
            }
        }

        filterChain.doFilter(request, response);
    }

    private java.util.Optional<User> findActiveTokenOwner(String userId, String steamId64) {
        if (userId == null) {
            return java.util.Optional.empty();
        }
        try {
            return userRepository.findById(UUID.fromString(userId))
                    .filter(User::isActiveAccount)
                    .filter(user -> MessageDigest.isEqual(
                            user.getSteamId64().getBytes(StandardCharsets.UTF_8),
                            steamId64.getBytes(StandardCharsets.UTF_8)
                    ));
        } catch (IllegalArgumentException exception) {
            return java.util.Optional.empty();
        }
    }

    private String extractToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return null;
    }
}
