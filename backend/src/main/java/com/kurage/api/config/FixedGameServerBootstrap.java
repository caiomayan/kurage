package com.kurage.api.config;

import com.kurage.api.domain.GameMode;
import com.kurage.api.domain.GameServer;
import com.kurage.api.domain.GameServerKind;
import com.kurage.api.repository.GameServerRepository;
import com.kurage.api.util.HashUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Reconciles the first fixed Retake registration with deployment configuration.
 * Flyway owns the schema and stable identity; the environment owns the public
 * endpoint, so a production database can never advertise 127.0.0.1 by accident.
 */
@Component
public class FixedGameServerBootstrap implements ApplicationRunner {

    private final GameServerRepository repository;
    private final boolean enabled;
    private final String serverId;
    private final String displayName;
    private final String hostname;
    private final int port;
    private final int maxPlayers;
    private final String apiKey;

    public FixedGameServerBootstrap(
            GameServerRepository repository,
            @Value("${game.server.bootstrap.enabled:false}") boolean enabled,
            @Value("${game.server.bootstrap.id:}") String serverId,
            @Value("${game.server.bootstrap.display-name:}") String displayName,
            @Value("${game.server.bootstrap.hostname:}") String hostname,
            @Value("${game.server.bootstrap.port:27015}") int port,
            @Value("${game.server.bootstrap.max-players:10}") int maxPlayers,
            @Value("${game.server.api.key:}") String apiKey) {
        this.repository = repository;
        this.enabled = enabled;
        this.serverId = serverId;
        this.displayName = displayName;
        this.hostname = hostname;
        this.port = port;
        this.maxPlayers = maxPlayers;
        this.apiKey = apiKey;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!enabled) {
            provisionCredentialForExistingServer();
            return;
        }

        UUID id = parseAndValidate();
        GameServer server = repository.findById(id).orElseGet(() -> GameServer.builder()
                .id(id)
                .currentMap("de_mirage")
                .currentPlayers(0)
                .ctScore(0)
                .trScore(0)
                .isOnline(false)
                .build());

        server.setName(displayName.trim());
        server.setHostname(hostname.trim());
        server.setPort(port);
        server.setMaxPlayers(maxPlayers);
        server.setGameMode(GameMode.RETAKE);
        server.setServerKind(GameServerKind.FIXED);
        server.setApiKeyHash(HashUtils.sha256(apiKey));
        repository.saveAndFlush(server);
    }

    /**
     * Local development already has Retake #1 from Flyway. Even when endpoint
     * reconciliation is disabled, bind the configured secret to that stable
     * identity so upgrading to per-server credentials does not break heartbeat.
     */
    private void provisionCredentialForExistingServer() {
        if (serverId == null || serverId.isBlank()) {
            return;
        }
        UUID id;
        try {
            id = UUID.fromString(serverId);
        } catch (IllegalArgumentException exception) {
            throw new IllegalStateException("FIXED_SERVER_ID must be a valid UUID", exception);
        }

        repository.findById(id).ifPresent(server -> {
            server.setApiKeyHash(HashUtils.sha256(apiKey));
            repository.saveAndFlush(server);
        });
    }

    private UUID parseAndValidate() {
        UUID id;
        try {
            id = UUID.fromString(serverId);
        } catch (IllegalArgumentException exception) {
            throw new IllegalStateException("FIXED_SERVER_ID must be a valid UUID", exception);
        }

        String normalizedName = displayName == null ? "" : displayName.trim();
        if (normalizedName.isEmpty() || normalizedName.length() > 100) {
            throw new IllegalStateException("FIXED_SERVER_DISPLAY_NAME must contain between 1 and 100 characters");
        }

        String normalizedHost = hostname == null ? "" : hostname.trim();
        if (normalizedHost.isEmpty()
                || normalizedHost.length() > 255
                || normalizedHost.contains("://")
                || normalizedHost.contains("/")
                || normalizedHost.chars().anyMatch(Character::isWhitespace)) {
            throw new IllegalStateException("FIXED_SERVER_HOSTNAME must be a hostname or IP address without scheme or port");
        }
        if (port < 1 || port > 65535) {
            throw new IllegalStateException("FIXED_SERVER_PORT must be between 1 and 65535");
        }
        if (maxPlayers < 1 || maxPlayers > 64) {
            throw new IllegalStateException("FIXED_SERVER_MAX_PLAYERS must be between 1 and 64");
        }
        return id;
    }
}
