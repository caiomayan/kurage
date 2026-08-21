package com.kurage.api.config;

import com.kurage.api.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(Customizer.withDefaults())
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Rotas privadas com autenticação necessária
                .requestMatchers("/users/me", "/users/me/**", "/inventory/me", "/inventory/me/**", "/api/inventory/me", "/api/cstrike/inventory/me").authenticated()
                .requestMatchers(HttpMethod.PUT, "/inventory/me", "/api/inventory/me", "/api/cstrike/inventory/me").authenticated()
                .requestMatchers(HttpMethod.GET, "/teams/*/invites", "/teams/*/join-requests", "/teams/join-requests/me", "/teams/*/invite-links").authenticated()

                // Rotas públicas (Plugins CS2, Heartbeat, Inventário de jogadores, Perfis, Buscas)
                .requestMatchers("/auth/**", "/error", "/leaderboard/**", "/search/**", "/servers/**").permitAll()
                .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/inventory/**", "/api/inventory/**", "/api/cstrike/**", "/api/cstrike/inventory/**", "/api/equipped/**", "/equipped/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/users/**", "/teams/**").permitAll()

                // Rotas restritas de administração
                .requestMatchers("/actuator/**").hasAnyRole("ADMIN", "OWNER")

                // Bloqueio default para o restante
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
