package com.kurage.api.dto.response;

import com.kurage.api.domain.GameServer;

import java.io.Serializable;
import java.time.Instant;
import java.time.Duration;
import java.util.List;
import java.util.UUID;

public record GameServerResponse(
        UUID id,
        String name,
        String hostname,
        Integer port,
        String gameMode,
        String serverKind,
        String currentMap,
        Integer currentPlayers,
        Integer maxPlayers,
        Integer ctScore,
        Integer trScore,
        boolean isOnline,
        Instant lastHeartbeat,
        List<ServerPlayerResponse> players
) implements Serializable {

    public static final Duration HEARTBEAT_STALE_AFTER = Duration.ofSeconds(90);

    public GameServerResponse(
            UUID id,
            String name,
            String hostname,
            Integer port,
            String gameMode,
            String currentMap,
            Integer currentPlayers,
            Integer maxPlayers,
            boolean isOnline,
            Instant lastHeartbeat
    ) {
        this(id, name, hostname, port, gameMode, "FIXED", currentMap, currentPlayers, maxPlayers, 0, 0, isOnline, lastHeartbeat, List.of());
    }

    public static GameServerResponse create(GameServer server) {
        return create(server, List.of());
    }

    public static GameServerResponse create(GameServer server, List<ServerPlayerResponse> players) {
        if (server == null) return null;
        GameServerResponse response = new GameServerResponse(
                server.getId(),
                server.getName(),
                server.getHostname(),
                server.getPort(),
                server.getGameMode() != null ? server.getGameMode().name() : null,
                server.getServerKind() != null ? server.getServerKind().name() : null,
                server.getCurrentMap(),
                server.getCurrentPlayers(),
                server.getMaxPlayers(),
                server.getCtScore(),
                server.getTrScore(),
                server.isOnline(),
                server.getLastHeartbeat(),
                players != null ? players : List.of()
        );
        return response.withEffectiveLiveness(Instant.now());
    }

    public GameServerResponse withEffectiveLiveness(Instant observedAt) {
        boolean heartbeatFresh = isOnline
                && lastHeartbeat != null
                && !lastHeartbeat.isBefore(observedAt.minus(HEARTBEAT_STALE_AFTER));
        if (heartbeatFresh) return this;

        return new GameServerResponse(
                id,
                name,
                hostname,
                port,
                gameMode,
                serverKind,
                currentMap,
                0,
                maxPlayers,
                0,
                0,
                false,
                lastHeartbeat,
                List.of()
        );
    }
}
