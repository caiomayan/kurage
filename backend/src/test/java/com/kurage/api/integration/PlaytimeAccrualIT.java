package com.kurage.api.integration;

import com.kurage.api.domain.PlayerStats;
import com.kurage.api.domain.User;
import com.kurage.api.repository.PlayerStatsRepository;
import com.kurage.api.repository.UserRepository;
import com.kurage.api.service.PlaytimeService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.transaction.TestTransaction;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Acúmulo de tempo jogado contra PostgreSQL e Redis reais.
 *
 * <p>O tempo é medido pelo intervalo entre avistamentos guardados no Redis e
 * somado no PostgreSQL, então nenhuma das duas metades pode ser simulada: um
 * Redis falso não expira chave e um repositório falso não prova que a soma
 * concorrente não perde incremento.
 */
class PlaytimeAccrualIT extends IntegrationTestSupport {

    private static final UUID SERVER = UUID.fromString("11111111-1111-1111-1111-111111111111");

    @Autowired private PlaytimeService playtimeService;
    @Autowired private PlayerStatsRepository playerStatsRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private org.springframework.transaction.support.TransactionTemplate transactionTemplate;

    @Test
    void creditsTheIntervalBetweenTwoSightings() {
        User player = savePlayer(9_400_001L, "presenca_um", "76561198194000001");

        // Primeiro avistamento apenas inicia a medição.
        assertThat(playtimeService.recordPresence(SERVER, player.getSteamId64(), player.getId(), "CT"))
                .isZero();
        assertThat(playtimeOf(player)).isZero();

        // Reposiciona o avistamento 30 segundos atrás para não fazer a suíte dormir.
        backdateSighting(player, Duration.ofSeconds(30));

        long credited = playtimeService.recordPresence(
                SERVER, player.getSteamId64(), player.getId(), "CT");
        assertThat(credited).isBetween(29L, 31L);
        assertThat(playtimeOf(player)).isEqualTo(credited);
    }

    @Test
    void neverCreditsMoreThanTheHeartbeatWindow() {
        User player = savePlayer(9_400_002L, "presenca_lacuna", "76561198194000002");
        playtimeService.recordPresence(SERVER, player.getSteamId64(), player.getId(), "CT");

        // Avistamento de dez minutos atrás ainda registrado: o crédito é cortado
        // na janela, não no intervalo real.
        backdateSighting(player, Duration.ofMinutes(10));

        long credited = playtimeService.recordPresence(
                SERVER, player.getSteamId64(), player.getId(), "CT");
        assertThat(credited).isEqualTo(PlaytimeService.MAX_CREDIT.getSeconds());
        assertThat(playtimeOf(player)).isEqualTo(PlaytimeService.MAX_CREDIT.getSeconds());
    }

    @Test
    void anExpiredSightingCreditsNothing() {
        User player = savePlayer(9_400_005L, "presenca_expirada", "76561198194000005");
        playtimeService.recordPresence(SERVER, player.getSteamId64(), player.getId(), "CT");

        // É assim que uma ausência longa se apresenta de verdade: o Redis expira
        // a chave, então não há intervalo a medir e o silêncio não vira hora.
        forgetSighting(player);

        assertThat(playtimeService.recordPresence(SERVER, player.getSteamId64(), player.getId(), "CT"))
                .isZero();
        assertThat(playtimeOf(player)).isZero();
    }

    @Test
    void spectatingDoesNotAccrueAndBreaksTheChain() {
        User player = savePlayer(9_400_003L, "presenca_spec", "76561198194000003");

        playtimeService.recordPresence(SERVER, player.getSteamId64(), player.getId(), "CT");
        backdateSighting(player, Duration.ofSeconds(40));

        // Passou a assistir: nada é creditado e a corrente é quebrada.
        assertThat(playtimeService.recordPresence(SERVER, player.getSteamId64(), player.getId(), "SPEC"))
                .isZero();
        assertThat(playtimeOf(player)).isZero();

        // Ao voltar a jogar, a medição recomeça do zero em vez de creditar o
        // tempo que ele passou assistindo.
        assertThat(playtimeService.recordPresence(SERVER, player.getSteamId64(), player.getId(), "TR"))
                .isZero();
        assertThat(playtimeOf(player)).isZero();
    }

    @Test
    void ignoresPlayersWithoutAnAccount() {
        // Sem userId não há a quem creditar: um Steam não vinculado continua no
        // roster, mas não acumula horas para ninguém.
        assertThat(playtimeService.recordPresence(SERVER, "76561198194000099", null, "CT")).isZero();
        assertThat(playtimeService.recordPresence(SERVER, null, UUID.randomUUID(), "CT")).isZero();
    }

    @Test
    void concurrentHeartbeatsLoseNoIncrement() throws Exception {
        User player = savePlayer(9_400_004L, "presenca_corrida", "76561198194000004");

        // As outras threads precisam enxergar o jogador, então a transação do
        // teste é confirmada antes da disputa, como em TeamConcurrencyIT.
        TestTransaction.flagForCommit();
        TestTransaction.end();

        int racers = 8;
        try (ExecutorService pool = Executors.newFixedThreadPool(racers)) {
            CyclicBarrier startTogether = new CyclicBarrier(racers);
            List<Callable<Void>> burst = new ArrayList<>();
            for (int i = 0; i < racers; i++) {
                burst.add(() -> {
                    startTogether.await(10, TimeUnit.SECONDS);
                    // Cada thread abre a própria transação, como faz cada
                    // requisição de heartbeat. A soma acontece no banco.
                    transactionTemplate.executeWithoutResult(status ->
                            playerStatsRepository.addPlaytimeSeconds(player.getId(), 10L));
                    return null;
                });
            }
            for (Future<Void> future : pool.invokeAll(burst)) {
                future.get();
            }

            long total = transactionTemplate.execute(status -> playtimeOf(player));
            assertThat(total)
                    .as("a soma acontece no banco, então nenhuma atualização se perde")
                    .isEqualTo(racers * 10L);
        } finally {
            TestTransaction.start();
            playerStatsRepository.deleteById(player.getId());
            userRepository.deleteById(player.getId());
            TestTransaction.flagForCommit();
            TestTransaction.end();
            TestTransaction.start();
        }
    }

    private long playtimeOf(User player) {
        return playerStatsRepository.findByUserId(player.getId())
                .map(PlayerStats::getPlaytimeSeconds)
                .orElse(0L);
    }

    private void forgetSighting(User player) {
        redisTemplate.delete(presenceKey(player));
    }

    private String presenceKey(User player) {
        return "presence:server:" + SERVER + ":player:" + player.getSteamId64();
    }

    /**
     * Envelhece o último avistamento guardado no Redis, reproduzindo um intervalo
     * real sem que a suíte precise esperar por ele.
     */
    private void backdateSighting(User player, Duration age) {
        redisTemplate.opsForValue().set(
                presenceKey(player),
                Long.toString(Instant.now().minus(age).getEpochSecond()),
                PlaytimeService.MAX_CREDIT);
    }

    private User savePlayer(long kurageId, String username, String steamId64) {
        User user = userRepository.saveAndFlush(User.builder()
                .kurageId(kurageId)
                .username(username)
                .steamId64(steamId64)
                .build());
        playerStatsRepository.saveAndFlush(PlayerStats.builder().userId(user.getId()).build());
        return user;
    }
}
