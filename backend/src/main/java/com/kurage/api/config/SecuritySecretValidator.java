package com.kurage.api.config;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Set;

/**
 * Prevents the API from starting with missing or repository-known credentials.
 * These values protect every authenticated user and every game-server heartbeat,
 * so silently degrading is never an acceptable production or local behaviour.
 */
@Component
public class SecuritySecretValidator {

    private static final int MINIMUM_SECRET_BYTES = 32;
    private static final Set<String> KNOWN_UNSAFE_JWT_SECRETS = Set.of(
            "replace-with-at-least-32-random-bytes",
            "d3d3LmNhaW9tYXlhbi5jb20uYnIubmFvLnRlbS5wYXJhbm9pYQ=="
    );

    private final String jwtSecret;
    private final String gameServerApiKey;

    public SecuritySecretValidator(
            @Value("${api.security.token.secret:}") String jwtSecret,
            @Value("${game.server.api.key:}") String gameServerApiKey) {
        this.jwtSecret = jwtSecret;
        this.gameServerApiKey = gameServerApiKey;
    }

    @PostConstruct
    void validate() {
        requireStrongSecret("JWT_SECRET", jwtSecret, true);
        requireStrongSecret("GAME_SERVER_API_KEY", gameServerApiKey, false);
    }

    private static void requireStrongSecret(String name, String value, boolean rejectKnownValues) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(name + " must be configured; refusing to start insecurely");
        }
        if (value.getBytes(StandardCharsets.UTF_8).length < MINIMUM_SECRET_BYTES) {
            throw new IllegalStateException(name + " must contain at least 32 bytes of entropy");
        }
        if (rejectKnownValues && KNOWN_UNSAFE_JWT_SECRETS.contains(value)) {
            throw new IllegalStateException(name + " uses a repository-known value; generate a new secret");
        }
    }
}
