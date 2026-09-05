package com.kurage.api.integration;

import com.kurage.api.competitive.CompetitiveScales;
import com.kurage.api.competitive.CompetitiveScales.Side;
import com.kurage.api.competitive.ReferenceCalibrationService;
import com.kurage.api.domain.GameMode;
import com.kurage.api.domain.GameServer;
import com.kurage.api.domain.GameServerKind;
import com.kurage.api.domain.PlayerStats;
import com.kurage.api.domain.User;
import com.kurage.api.dto.request.RoundEventRequest;
import com.kurage.api.repository.GameServerRepository;
import com.kurage.api.repository.PlayerStatsRepository;
import com.kurage.api.repository.UserRepository;
import com.kurage.api.service.RoundIngestionService;
import com.kurage.api.util.HashUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Medição das referências do Rating a partir de rounds reais.
 *
 * <p>As referências embarcadas foram escolhidas antes de existir qualquer round
 * do Kurage. Este é o mecanismo que substitui a estimativa por medida — e ele só
 * tem sentido contra o banco, porque é uma agregação sobre o que foi realmente
 * gravado.
 */
class ReferenceCalibrationIT extends IntegrationTestSupport {

    private static final String API_KEY = "chave-de-calibracao-do-servidor";

    @Autowired private ReferenceCalibrationService calibrationService;
    @Autowired private RoundIngestionService ingestionService;
    @Autowired private GameServerRepository gameServerRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private PlayerStatsRepository playerStatsRepository;

    private GameServer server;
    private User player;
    private UUID session;
    private long sequence;

    @BeforeEach
    void setUp() {
        server = gameServerRepository.saveAndFlush(GameServer.builder()
                .name("Calibracao IT " + UUID.randomUUID())
                .hostname("127.0.0.1")
                .port(28100 + (int) (Math.random() * 700))
                .gameMode(GameMode.RETAKE)
                .serverKind(GameServerKind.FIXED)
                .currentPlayers(0)
                .maxPlayers(10)
                .ctScore(0)
                .trScore(0)
                .isOnline(true)
                .apiKeyHash(HashUtils.sha256(API_KEY))
                .build());

        player = userRepository.saveAndFlush(User.builder()
                .kurageId(9_700_001L)
                .username("calibracao")
                .steamId64("76561198197000001")
                .build());
        playerStatsRepository.saveAndFlush(PlayerStats.builder().userId(player.getId()).build());

        session = UUID.randomUUID();
        sequence = 0;
    }

    @Test
    void reportsInsufficientSampleInsteadOfPublishingAThinAverage() {
        // Vinte rounds fecham uma unidade, mas estão muito longe do mínimo. Uma
        // média sobre isso seria tão arbitrária quanto o chute que ela pretende
        // substituir.
        for (int i = 0; i < CompetitiveScales.RETAKE_BLOCK_ROUNDS; i++) {
            ingestionService.ingest(server.getId(), API_KEY, ctRound(1, 100));
        }

        var observations = calibrationService.observe("RETAKE");

        assertThat(observations.get(Side.CT).rounds()).isEqualTo(CompetitiveScales.RETAKE_BLOCK_ROUNDS);
        assertThat(observations.get(Side.CT).sufficientSample())
                .as("amostra pequena não autoriza publicar referência")
                .isFalse();
        assertThat(calibrationService.report("RETAKE"))
                .contains("amostra insuficiente");
    }

    @Test
    void measuresWhatActuallyHappenedInsteadOfWhatWasAssumed() {
        // Todo round com exatamente 2 abates e 150 de dano: a média observada
        // tem que refletir isso, e não a referência embarcada.
        for (int i = 0; i < CompetitiveScales.RETAKE_BLOCK_ROUNDS; i++) {
            ingestionService.ingest(server.getId(), API_KEY, ctRound(2, 150));
        }

        var ct = calibrationService.observe("RETAKE").get(Side.CT);

        assertThat(ct.observed().kpr()).isCloseTo(2.0, org.assertj.core.data.Offset.offset(0.01));
        assertThat(ct.observed().adr()).isCloseTo(150.0, org.assertj.core.data.Offset.offset(0.01));
        assertThat(ct.shipped().kpr())
                .as("a referência embarcada não é tocada pela medição")
                .isEqualTo(CompetitiveScales.RETAKE_CT.kpr());
        assertThat(ct.kprDrift())
                .as("o desvio expõe o quanto a escala está deslocada")
                .isGreaterThan(0.5);
    }

    @Test
    void onlyCountsRoundsAlreadyAbsorbedByAClosedUnit() {
        // Dezenove rounds não fecham unidade, então nada entra na medição: um
        // bloco em andamento ainda não é uma amostra completa.
        for (int i = 0; i < CompetitiveScales.RETAKE_BLOCK_ROUNDS - 1; i++) {
            ingestionService.ingest(server.getId(), API_KEY, ctRound(1, 100));
        }

        assertThat(calibrationService.observe("RETAKE").get(Side.CT).rounds())
                .as("rounds soltos pertencem a um bloco aberto e não são medidos")
                .isZero();
    }

    @Test
    void theReportNeverChangesTheShippedReferences() {
        for (int i = 0; i < CompetitiveScales.RETAKE_BLOCK_ROUNDS; i++) {
            ingestionService.ingest(server.getId(), API_KEY, ctRound(3, 200));
        }

        calibrationService.report("RETAKE");

        // Trocar os números por baixo invalidaria silenciosamente todo Rating já
        // calculado. Publicar é uma decisão deliberada, com versão nova.
        assertThat(CompetitiveScales.RETAKE_CT.kpr()).isEqualTo(0.95);
        assertThat(CompetitiveScales.ALGORITHM_VERSION).isEqualTo("kurage-competitive-1.0.0");
    }

    private RoundEventRequest ctRound(int kills, int damage) {
        return new RoundEventRequest(
                session, ++sequence, UUID.randomUUID(), "de_mirage", Instant.now(),
                "RETAKE", "CT",
                List.of(new RoundEventRequest.PlayerRound(
                        player.getSteamId64(), "CT", kills, 0, 0, damage,
                        true, false, false, false)));
    }
}
