package com.kurage.api.integration;

import com.kurage.api.domain.LevelSGrant;
import com.kurage.api.domain.PlayerStats;
import com.kurage.api.domain.User;
import com.kurage.api.repository.LevelSGrantRepository;
import com.kurage.api.repository.PlayerStatsRepository;
import com.kurage.api.repository.UserRepository;
import com.kurage.api.service.RankingService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Desempate do ranking e concessão diária de Level S, contra PostgreSQL real.
 *
 * <p>As duas regras dependem de comportamento do banco que um repositório
 * simulado não reproduz: a ordenação usa {@code NULLIF} sobre uma divisão, e a
 * idempotência do job depende da chave composta e do índice único de posição.
 */
class LevelSAndTiebreakIT extends IntegrationTestSupport {

    private static final LocalDate DAY = LocalDate.of(2026, 9, 5);

    @Autowired private RankingService rankingService;
    @Autowired private LevelSGrantRepository levelSGrantRepository;
    @Autowired private PlayerStatsRepository playerStatsRepository;
    @Autowired private UserRepository userRepository;

    @Test
    void breaksAnEloTieByKillDeathRatio() {
        // Mesmo ELO, K/D diferente: quem mata mais por morte fica na frente.
        User worse = calibrated(9_500_001L, "empate_kd_pior", 500, 100, 100, 3_600);
        User better = calibrated(9_500_002L, "empate_kd_melhor", 500, 150, 100, 3_600);

        List<UUID> order = rankedIds();
        assertThat(order.indexOf(better.getId()))
                .as("K/D maior desempata a favor")
                .isLessThan(order.indexOf(worse.getId()));
    }

    @Test
    void breaksAKillDeathTieByFewerHoursPlayed() {
        // Mesmo ELO e mesmo K/D: quem chegou lá em menos tempo fica na frente.
        User slower = calibrated(9_500_003L, "empate_horas_lento", 400, 100, 100, 36_000);
        User faster = calibrated(9_500_004L, "empate_horas_rapido", 400, 100, 100, 3_600);

        List<UUID> order = rankedIds();
        assertThat(order.indexOf(faster.getId()))
                .as("menos horas jogadas desempata a favor")
                .isLessThan(order.indexOf(slower.getId()));
    }

    @Test
    void producesTheSameOrderOnEveryRead() {
        // Empate absoluto nos três critérios: sem o user_id no fim da ordenação,
        // o PostgreSQL poderia devolver ordens diferentes e a vaga 30 do S ficaria
        // ambígua entre duas leituras iguais.
        for (int i = 0; i < 6; i++) {
            calibrated(9_500_100L + i, "empate_total_" + i, 300, 100, 100, 7_200);
        }

        assertThat(rankedIds())
                .as("a ordenação é determinística")
                .isEqualTo(rankedIds());
    }

    @Test
    void grantsLevelSOnlyToCalibratedPlayers() {
        User ready = calibrated(9_500_005L, "s_calibrado", 800, 120, 100, 3_600);
        User screening = uncalibrated(9_500_006L, "s_calibrando", 900);

        rankingService.grantLevelSFor(DAY);

        assertThat(levelSGrantRepository.existsByIdSnapshotDateAndIdUserId(DAY, ready.getId()))
                .as("um jogador calibrado entra no top do dia")
                .isTrue();
        assertThat(levelSGrantRepository.existsByIdSnapshotDateAndIdUserId(DAY, screening.getId()))
                .as("ELO alto não concede S antes de concluir a calibração")
                .isFalse();
    }

    @Test
    void grantsEveryEligiblePlayerWhenThereAreFewerThanThirty() {
        for (int i = 0; i < 4; i++) {
            calibrated(9_500_200L + i, "s_poucos_" + i, 300 + i, 100, 100, 3_600);
        }

        int granted = rankingService.grantLevelSFor(DAY);

        assertThat(granted).isEqualTo(4);
        assertThat(levelSGrantRepository.countByDate(DAY)).isEqualTo(4);
    }

    @Test
    void neverExceedsThirtySlots() {
        for (int i = 0; i < 34; i++) {
            calibrated(9_500_300L + i, "s_muitos_" + i, 900 - i, 100, 100, 3_600);
        }

        int granted = rankingService.grantLevelSFor(DAY);

        assertThat(granted).isEqualTo(RankingService.LEVEL_S_SLOTS);
        assertThat(levelSGrantRepository.countByDate(DAY))
                .isEqualTo(RankingService.LEVEL_S_SLOTS);
    }

    @Test
    void rerunningTheJobForTheSameDayDoesNotDuplicate() {
        calibrated(9_500_007L, "s_idempotente", 700, 100, 100, 3_600);

        rankingService.grantLevelSFor(DAY);
        long afterFirst = levelSGrantRepository.countByDate(DAY);

        // Um reinício pode disparar o job de novo na mesma data.
        rankingService.grantLevelSFor(DAY);

        assertThat(levelSGrantRepository.countByDate(DAY)).isEqualTo(afterFirst);
        List<LevelSGrant> grants = levelSGrantRepository.findByDateOrderByPosition(DAY);
        assertThat(grants).extracting(LevelSGrant::getPosition).doesNotHaveDuplicates();
    }

    @Test
    void aGrantBelongsToItsOwnDay() {
        User player = calibrated(9_500_008L, "s_por_dia", 650, 100, 100, 3_600);

        rankingService.grantLevelSFor(DAY);

        assertThat(levelSGrantRepository.existsByIdSnapshotDateAndIdUserId(DAY, player.getId()))
                .isTrue();
        assertThat(levelSGrantRepository.existsByIdSnapshotDateAndIdUserId(DAY.plusDays(1), player.getId()))
                .as("o S de um dia não vaza para o dia seguinte sem uma nova concessão")
                .isFalse();
    }

    private List<UUID> rankedIds() {
        return playerStatsRepository.findTopOrderByKurageEloDesc(200).stream()
                .map(PlayerStats::getUserId)
                .toList();
    }

    private User calibrated(long kurageId, String username, int elo, int kills, int deaths, long playtimeSeconds) {
        User user = saveUser(kurageId, username);
        playerStatsRepository.saveAndFlush(PlayerStats.builder()
                .userId(user.getId())
                .kurageElo(elo)
                .kills(kills)
                .deaths(deaths)
                .matchesPlayed(PlayerStats.CALIBRATION_MATCHES_REQUIRED)
                .playtimeSeconds(playtimeSeconds)
                .build());
        return user;
    }

    private User uncalibrated(long kurageId, String username, int elo) {
        User user = saveUser(kurageId, username);
        playerStatsRepository.saveAndFlush(PlayerStats.builder()
                .userId(user.getId())
                .kurageElo(elo)
                .matchesPlayed(PlayerStats.CALIBRATION_MATCHES_REQUIRED - 1)
                .build());
        return user;
    }

    private User saveUser(long kurageId, String username) {
        return userRepository.saveAndFlush(User.builder()
                .kurageId(kurageId)
                .username(username)
                .steamId64("765611981" + String.format("%08d", kurageId % 100_000_000L))
                .build());
    }
}
