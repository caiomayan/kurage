package com.kurage.api.integration;

import com.kurage.api.competitive.CompetitiveScales;
import com.kurage.api.domain.GameMode;
import com.kurage.api.domain.GameServer;
import com.kurage.api.domain.PlayerStats;
import com.kurage.api.domain.User;
import com.kurage.api.dto.request.RoundEventRequest;
import com.kurage.api.repository.CompetitiveBlockRepository;
import com.kurage.api.repository.RoundEventRepository;
import com.kurage.api.repository.RoundParticipationRepository;
import com.kurage.api.repository.GameServerRepository;
import com.kurage.api.repository.PlayerStatsRepository;
import com.kurage.api.repository.UserRepository;
import com.kurage.api.service.RoundIngestionService;
import com.kurage.api.util.HashUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Ingestão de rounds contra PostgreSQL real.
 *
 * <p>Duas propriedades só existem no banco e não podem ser simuladas: a
 * idempotência depende da unicidade da chave, e o fechamento de unidade depende
 * de um UPDATE condicional que impede dois fechamentos de contarem o mesmo round.
 *
 * <p>É também o primeiro teste em que {@code matchesPlayed} realmente incrementa
 * — antes disto, nada no sistema fazia a calibração avançar.
 */
class RoundIngestionIT extends IntegrationTestSupport {

    private static final String API_KEY = "chave-de-integracao-do-servidor-de-round";

    @Autowired private RoundIngestionService ingestionService;
    @Autowired private GameServerRepository gameServerRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private PlayerStatsRepository playerStatsRepository;
    @Autowired private RoundEventRepository roundEventRepository;
    @Autowired private RoundParticipationRepository participationRepository;
    @Autowired private CompetitiveBlockRepository blockRepository;

    private GameServer server;
    private User player;
    private UUID session;
    private long sequence;

    @BeforeEach
    void setUp() {
        server = gameServerRepository.saveAndFlush(GameServer.builder()
                .name("Retake IT " + UUID.randomUUID())
                .hostname("127.0.0.1")
                .port(27100 + (int) (Math.random() * 800))
                .gameMode(GameMode.RETAKE)
                .serverKind(com.kurage.api.domain.GameServerKind.FIXED)
                .currentPlayers(0)
                .maxPlayers(10)
                .ctScore(0)
                .trScore(0)
                .isOnline(true)
                .apiKeyHash(HashUtils.sha256(API_KEY))
                .build());

        player = userRepository.saveAndFlush(User.builder()
                .kurageId(9_600_001L)
                .username("ingestao")
                .steamId64("76561198196000001")
                .build());
        playerStatsRepository.saveAndFlush(PlayerStats.builder().userId(player.getId()).build());

        session = UUID.randomUUID();
        sequence = 0;
    }

    @Test
    void rejectsAnUnauthenticatedServer() {
        assertThatThrownBy(() -> ingestionService.ingest(server.getId(), "chave-errada", round(3, 0, true)))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("401");

        assertThat(roundEventRepository.count()).isZero();
    }

    @Test
    void rejectsAModeThatDivergesFromTheRegisteredServer() {
        // O modo é do registro no PostgreSQL; o evento não reclassifica o
        // servidor, exatamente como o heartbeat (documento 05).
        RoundEventRequest wrongMode = new RoundEventRequest(
                session, ++sequence, UUID.randomUUID(), "de_mirage", Instant.now(),
                "DEATHMATCH", "CT",
                List.of(new RoundEventRequest.PlayerRound(
                        player.getSteamId64(), "CT", 1, 0, 0, 100, true, false, false, false)));

        assertThatThrownBy(() -> ingestionService.ingest(server.getId(), API_KEY, wrongMode))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("409");
    }

    @Test
    void acceptsARoundAndRecordsItRaw() {
        RoundEventRequest request = round(2, 0, true);

        assertThat(ingestionService.ingest(server.getId(), API_KEY, request))
                .isEqualTo(RoundIngestionService.Outcome.ACCEPTED);

        assertThat(roundEventRepository.findByIdempotencyKey(request.idempotencyKey()))
                .as("o evento cru é guardado para permitir reprocessamento")
                .isPresent();
        assertThat(participationRepository.countOpenRounds(player.getId(), "RETAKE")).isEqualTo(1);
    }

    @Test
    void aResentRoundIsAcceptedWithoutCountingTwice() {
        RoundEventRequest request = round(2, 0, true);
        ingestionService.ingest(server.getId(), API_KEY, request);

        // Plugin que perdeu a resposta reenvia. Isso é esperado, não é erro.
        assertThat(ingestionService.ingest(server.getId(), API_KEY, request))
                .isEqualTo(RoundIngestionService.Outcome.DUPLICATE);

        assertThat(roundEventRepository.count()).isEqualTo(1);
        assertThat(participationRepository.countOpenRounds(player.getId(), "RETAKE"))
                .as("o reenvio não pode contar o round duas vezes")
                .isEqualTo(1);
    }

    @Test
    void rejectsASequenceThatWentBackwards() {
        ingestionService.ingest(server.getId(), API_KEY, round(1, 0, true));
        long replayed = sequence;

        RoundEventRequest outOfOrder = new RoundEventRequest(
                session, replayed, UUID.randomUUID(), "de_mirage", Instant.now(),
                "RETAKE", "CT",
                List.of(new RoundEventRequest.PlayerRound(
                        player.getSteamId64(), "CT", 1, 0, 0, 100, true, false, false, false)));

        assertThatThrownBy(() -> ingestionService.ingest(server.getId(), API_KEY, outOfOrder))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("409");
    }

    @Test
    void ignoresPlayersWithoutAnAccount() {
        RoundEventRequest request = new RoundEventRequest(
                session, ++sequence, UUID.randomUUID(), "de_mirage", Instant.now(),
                "RETAKE", "CT",
                List.of(new RoundEventRequest.PlayerRound(
                        "76561198199999999", "CT", 5, 0, 0, 500, true, false, false, false)));

        ingestionService.ingest(server.getId(), API_KEY, request);

        assertThat(roundEventRepository.count())
                .as("o round é registrado mesmo sem participantes vinculados")
                .isEqualTo(1);
        assertThat(participationRepository.countOpenRounds(player.getId(), "RETAKE")).isZero();
    }

    @Test
    void twentyRoundsCloseAUnitAndAdvanceTheCalibration() {
        for (int i = 0; i < CompetitiveScales.RETAKE_BLOCK_ROUNDS; i++) {
            ingestionService.ingest(server.getId(), API_KEY, round(1, 1, i % 2 == 0));
        }

        assertThat(blockRepository.countByUserIdAndGameMode(player.getId(), "RETAKE"))
                .as("vinte rounds fecham exatamente uma unidade")
                .isEqualTo(1);
        assertThat(participationRepository.countOpenRounds(player.getId(), "RETAKE"))
                .as("os rounds absorvidos saem da contagem aberta")
                .isZero();

        PlayerStats stats = playerStatsRepository.findByUserId(player.getId()).orElseThrow();
        assertThat(stats.getMatchesPlayed())
                .as("é a primeira vez que a calibração avança de verdade")
                .isEqualTo(1);
        assertThat(stats.getRoundsPlayed()).isEqualTo(CompetitiveScales.RETAKE_BLOCK_ROUNDS);
        assertThat(stats.getKills()).isEqualTo(CompetitiveScales.RETAKE_BLOCK_ROUNDS);
        assertThat(stats.isCalibrated()).isFalse();

        var blocks = blockRepository.findWindow(player.getId(), "RETAKE", 10);
        assertThat(blocks).hasSize(1);
        assertThat(blocks.getFirst().getAlgorithmVersion())
                .as("toda unidade carrega a versão que a produziu")
                .isEqualTo(CompetitiveScales.ALGORITHM_VERSION);
        assertThat(blocks.getFirst().getRating()).isNotNull();
    }

    @Test
    void nineteenRoundsCloseNothing() {
        for (int i = 0; i < CompetitiveScales.RETAKE_BLOCK_ROUNDS - 1; i++) {
            ingestionService.ingest(server.getId(), API_KEY, round(1, 1, true));
        }

        assertThat(blockRepository.countByUserIdAndGameMode(player.getId(), "RETAKE")).isZero();
        assertThat(participationRepository.countOpenRounds(player.getId(), "RETAKE"))
                .as("um bloco incompleto continua acumulando, não é descartado")
                .isEqualTo(CompetitiveScales.RETAKE_BLOCK_ROUNDS - 1);

        PlayerStats stats = playerStatsRepository.findByUserId(player.getId()).orElseThrow();
        assertThat(stats.getMatchesPlayed())
                .as("a calibração só avança quando a unidade fecha")
                .isZero();
    }

    @Test
    void winningEveryRoundRaisesTheEloAndLosingEveryRoundLowersIt() {
        int initial = playerStatsRepository.findByUserId(player.getId()).orElseThrow().getKurageElo();

        for (int i = 0; i < CompetitiveScales.RETAKE_BLOCK_ROUNDS; i++) {
            ingestionService.ingest(server.getId(), API_KEY, round(1, 1, true));
        }
        int afterWinning = playerStatsRepository.findByUserId(player.getId()).orElseThrow().getKurageElo();
        assertThat(afterWinning)
                .as("vencer todos os rounds do bloco sobe o ELO")
                .isGreaterThan(initial);

        for (int i = 0; i < CompetitiveScales.RETAKE_BLOCK_ROUNDS; i++) {
            ingestionService.ingest(server.getId(), API_KEY, round(1, 1, false));
        }
        assertThat(playerStatsRepository.findByUserId(player.getId()).orElseThrow().getKurageElo())
                .as("perder todos os rounds do bloco desce o ELO")
                .isLessThan(afterWinning);
    }

    @Test
    void fiveClosedUnitsCompleteTheCalibration() {
        int rounds = CompetitiveScales.RETAKE_BLOCK_ROUNDS * PlayerStats.CALIBRATION_MATCHES_REQUIRED;
        for (int i = 0; i < rounds; i++) {
            ingestionService.ingest(server.getId(), API_KEY, round(1, 1, i % 2 == 0));
        }

        PlayerStats stats = playerStatsRepository.findByUserId(player.getId()).orElseThrow();
        assertThat(stats.getMatchesPlayed()).isEqualTo(PlayerStats.CALIBRATION_MATCHES_REQUIRED);
        assertThat(stats.isCalibrated())
                .as("cem rounds de retake concluem a triagem de cinco unidades")
                .isTrue();
    }

    /** Um round do jogador do teste, alternando o lado a cada sequência. */
    private RoundEventRequest round(int kills, int deaths, boolean won) {
        String side = sequence % 2 == 0 ? "CT" : "TR";
        String winner = won ? side : ("CT".equals(side) ? "TR" : "CT");
        return new RoundEventRequest(
                session, ++sequence, UUID.randomUUID(), "de_mirage", Instant.now(),
                "RETAKE", winner,
                List.of(new RoundEventRequest.PlayerRound(
                        player.getSteamId64(), side, kills, deaths, 0, 90,
                        deaths == 0, false, false, false)));
    }
}
