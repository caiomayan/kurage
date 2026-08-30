package com.kurage.api.dto.response;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class GameServerResponseTest {

    private static final Instant OBSERVED_AT = Instant.parse("2026-08-26T12:00:00Z");

    @Test
    void preservesFreshHeartbeatTelemetry() {
        ServerPlayerResponse player = ServerPlayerResponse.builder()
                .steamId64("76561198000000001")
                .username("Alpha")
                .build();
        GameServerResponse response = responseAt(OBSERVED_AT.minusSeconds(89), List.of(player));

        GameServerResponse effective = response.withEffectiveLiveness(OBSERVED_AT);

        assertThat(effective.isOnline()).isTrue();
        assertThat(effective.currentPlayers()).isEqualTo(1);
        assertThat(effective.ctScore()).isEqualTo(4);
        assertThat(effective.players()).containsExactly(player);
    }

    @Test
    void expiresStaleHeartbeatAndClearsVolatileTelemetry() {
        ServerPlayerResponse player = ServerPlayerResponse.builder()
                .steamId64("76561198000000001")
                .username("Ghost")
                .build();
        GameServerResponse response = responseAt(OBSERVED_AT.minusSeconds(91), List.of(player));

        GameServerResponse effective = response.withEffectiveLiveness(OBSERVED_AT);

        assertThat(effective.isOnline()).isFalse();
        assertThat(effective.currentPlayers()).isZero();
        assertThat(effective.ctScore()).isZero();
        assertThat(effective.trScore()).isZero();
        assertThat(effective.players()).isEmpty();
        assertThat(effective.lastHeartbeat()).isEqualTo(response.lastHeartbeat());
    }

    @Test
    void onlineFlagWithoutHeartbeatIsNotEnough() {
        GameServerResponse effective = responseAt(null, List.of()).withEffectiveLiveness(OBSERVED_AT);

        assertThat(effective.isOnline()).isFalse();
        assertThat(effective.currentPlayers()).isZero();
    }

    private GameServerResponse responseAt(
            Instant lastHeartbeat,
            List<ServerPlayerResponse> players
    ) {
        return new GameServerResponse(
                UUID.fromString("906cd6f7-400a-4ad7-b607-a5a2b4585c13"),
                "Kurage Retake #1",
                "127.0.0.1",
                27015,
                "RETAKE",
                "FIXED",
                "de_mirage",
                1,
                10,
                4,
                3,
                true,
                lastHeartbeat,
                players
        );
    }
}
