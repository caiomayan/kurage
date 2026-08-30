package com.kurage.api.integration;

import com.kurage.api.domain.GameMode;
import com.kurage.api.domain.GameServer;
import com.kurage.api.domain.GameServerKind;
import com.kurage.api.dto.request.GameServerHeartbeatRequest;
import com.kurage.api.dto.response.GameServerResponse;
import com.kurage.api.repository.GameServerRepository;
import com.kurage.api.service.GameServerService;
import com.kurage.api.util.HashUtils;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GameServerPostgresIT extends IntegrationTestSupport {

    private static final UUID LOCAL_RETAKE_ID = UUID.fromString("b1a2c3d4-0000-0000-0000-000000000001");
    private static final String SERVER_API_KEY = "integration-server-specific-key-32-bytes";

    @Autowired
    private GameServerRepository gameServerRepository;

    @Autowired
    private GameServerService gameServerService;

    @Test
    void migratesTheLocalServerToAFixedRetakeIdentity() {
        GameServer server = gameServerRepository.findById(LOCAL_RETAKE_ID).orElseThrow();

        assertThat(server.getName()).isEqualTo("Kurage Retake #1");
        assertThat(server.getGameMode()).isEqualTo(GameMode.RETAKE);
        assertThat(server.getServerKind()).isEqualTo(GameServerKind.FIXED);
        assertThat(server.getMaxPlayers()).isEqualTo(10);
        assertThat(server.getApiKeyHash()).isEqualTo(HashUtils.sha256(
                "integration-test-game-server-secret-32-bytes"));
    }

    @Test
    void acceptsTelemetryWhenThePluginConfirmsTheRegisteredIdentity() {
        GameServer server = persistServer(GameMode.RETAKE, GameServerKind.FIXED);
        GameServerHeartbeatRequest request = GameServerHeartbeatRequest.builder()
                .currentMap("de_nuke")
                .currentPlayers(7)
                .maxPlayers(10)
                .ctScore(4)
                .trScore(3)
                .gameMode(GameMode.RETAKE)
                .serverKind(GameServerKind.FIXED)
                .build();

        GameServerResponse response = gameServerService.processAuthenticatedHeartbeat(
                server.getId(), SERVER_API_KEY, request);

        assertThat(response.gameMode()).isEqualTo("RETAKE");
        assertThat(response.serverKind()).isEqualTo("FIXED");
        assertThat(response.currentMap()).isEqualTo("de_nuke");
        assertThat(response.currentPlayers()).isEqualTo(7);
        assertThat(response.ctScore()).isEqualTo(4);
        assertThat(response.trScore()).isEqualTo(3);
        assertThat(response.isOnline()).isTrue();
    }

    @Test
    void rejectsAHeartbeatThatTriesToReclassifyTheServer() {
        GameServer server = persistServer(GameMode.RETAKE, GameServerKind.FIXED);
        GameServerHeartbeatRequest request = GameServerHeartbeatRequest.builder()
                .currentMap("de_mirage")
                .currentPlayers(4)
                .gameMode(GameMode.COMPETITIVE_5V5)
                .serverKind(GameServerKind.EPHEMERAL)
                .build();

        assertThatThrownBy(() -> gameServerService.processAuthenticatedHeartbeat(
                server.getId(), SERVER_API_KEY, request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("409 CONFLICT");

        GameServer unchanged = gameServerRepository.findById(server.getId()).orElseThrow();
        assertThat(unchanged.getGameMode()).isEqualTo(GameMode.RETAKE);
        assertThat(unchanged.getServerKind()).isEqualTo(GameServerKind.FIXED);
        assertThat(unchanged.isOnline()).isFalse();
    }

    private GameServer persistServer(GameMode gameMode, GameServerKind serverKind) {
        int port = 28_000 + gameServerRepository.findAll().size();
        return gameServerRepository.saveAndFlush(GameServer.builder()
                .name("integration-server-" + UUID.randomUUID())
                .hostname("127.0.0.1")
                .port(port)
                .gameMode(gameMode)
                .serverKind(serverKind)
                .currentMap("de_mirage")
                .currentPlayers(0)
                .maxPlayers(10)
                .apiKeyHash(HashUtils.sha256(SERVER_API_KEY))
                .isOnline(false)
                .build());
    }
}
