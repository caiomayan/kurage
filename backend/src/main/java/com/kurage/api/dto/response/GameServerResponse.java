package com.kurage.api.dto.response;

import com.kurage.api.domain.GameServer;

import java.io.Serializable;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record GameServerResponse(
        UUID id,
        String name,
        String hostname,
        Integer port,
        String gameMode,
        String currentMap,
        Integer currentPlayers,
        Integer maxPlayers,
        boolean isOnline,
        Instant lastHeartbeat,
        List<ServerPlayerResponse> players
) implements Serializable {

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
        this(id, name, hostname, port, gameMode, currentMap, currentPlayers, maxPlayers, isOnline, lastHeartbeat, List.of());
    }

    public static GameServerResponse create(GameServer server) {
        return create(server, List.of());
    }

    public static GameServerResponse create(GameServer server, List<ServerPlayerResponse> players) {
        if (server == null) return null;
        return new GameServerResponse(
                server.getId(),
                server.getName(),
                server.getHostname(),
                server.getPort(),
                server.getGameMode() != null ? server.getGameMode().name() : null,
                server.getCurrentMap(),
                server.getCurrentPlayers(),
                server.getMaxPlayers(),
                server.isOnline(),
                server.getLastHeartbeat(),
                players != null ? players : List.of()
        );
    }
}
