package com.kurage.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kurage.api.competitive.CompetitiveScales;
import com.kurage.api.competitive.CompetitiveScales.Side;
import com.kurage.api.competitive.EloCalculator;
import com.kurage.api.competitive.RatingCalculator;
import com.kurage.api.competitive.RatingCalculator.SideProduction;
import com.kurage.api.domain.CompetitiveBlock;
import com.kurage.api.domain.GameServer;
import com.kurage.api.domain.PlayerStats;
import com.kurage.api.domain.RoundEvent;
import com.kurage.api.domain.RoundParticipation;
import com.kurage.api.domain.User;
import com.kurage.api.dto.request.RoundEventRequest;
import com.kurage.api.repository.CompetitiveBlockRepository;
import com.kurage.api.repository.RoundEventRepository;
import com.kurage.api.repository.RoundParticipationRepository;
import com.kurage.api.repository.GameServerRepository;
import com.kurage.api.repository.PlayerStatsRepository;
import com.kurage.api.repository.UserRepository;
import com.kurage.api.util.HashUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Recebe rounds do servidor de jogo e fecha unidades competitivas.
 *
 * <p>É a peça que faltava para o modelo do documento 20 existir: o heartbeat não
 * carrega participação por round, então sem esta ingestão {@code matchesPlayed}
 * nunca incrementa e a calibração jamais completa.
 *
 * <p>Cada round aceito é guardado cru e imutável. Quando um jogador acumula 20
 * rounds de retake, a unidade fecha: o Rating daquela unidade é calculado da
 * produção, o ELO se move pelo resultado, e ambos são gravados com a versão do
 * algoritmo — o suficiente para explicar a mudança e para recalcular depois sem
 * apagar histórico.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RoundIngestionService {

    /** Resultado da ingestão, para o controller escolher o status HTTP. */
    public enum Outcome {
        ACCEPTED,
        /** Reenvio da mesma chave: aceito, sem efeito. */
        DUPLICATE
    }

    private final GameServerRepository gameServerRepository;
    private final RoundEventRepository roundEventRepository;
    private final RoundParticipationRepository participationRepository;
    private final CompetitiveBlockRepository blockRepository;
    private final PlayerStatsRepository playerStatsRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @Transactional
    public Outcome ingest(UUID serverId, String apiKey, RoundEventRequest request) {
        GameServer server = gameServerRepository.findById(serverId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Servidor não encontrado"));

        authenticate(server, apiKey);

        // O modo é do registro no PostgreSQL, nunca do que o plugin afirma. A
        // mesma regra do heartbeat: divergência é configuração errada, e o
        // evento não pode reclassificar o servidor (documento 05).
        String registeredMode = server.getGameMode().name();
        if (!registeredMode.equalsIgnoreCase(request.gameMode())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Modo do evento diverge do modo registrado para este servidor");
        }

        Optional<RoundEvent> existing = roundEventRepository.findByIdempotencyKey(request.idempotencyKey());
        if (existing.isPresent()) {
            // Um plugin que perdeu a resposta reenvia. Isso é esperado, não é erro,
            // e não pode contar duas vezes.
            log.debug("Round já registrado, reenvio ignorado: {}", request.idempotencyKey());
            return Outcome.DUPLICATE;
        }

        roundEventRepository.findHighestSequence(request.sessionId())
                .filter(highest -> request.sequence() <= highest)
                .ifPresent(highest -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                            "Sequência fora de ordem para esta sessão");
                });

        RoundEvent event = persistEvent(serverId, request);
        List<UUID> affected = persistParticipations(event, request);

        for (UUID userId : affected) {
            closeCompletedUnits(userId, registeredMode);
        }
        return Outcome.ACCEPTED;
    }

    private void authenticate(GameServer server, String apiKey) {
        if (server.getApiKeyHash() == null || server.getApiKeyHash().isBlank()) {
            log.error("Credencial não provisionada para o servidor {}", server.getId());
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Integração com este servidor de jogo indisponível");
        }
        String providedHash = HashUtils.sha256(apiKey);
        if (providedHash == null || !MessageDigest.isEqual(
                server.getApiKeyHash().getBytes(StandardCharsets.US_ASCII),
                providedHash.getBytes(StandardCharsets.US_ASCII))) {
            log.warn("Tentativa de ingestão não autorizada para o servidor {}", server.getId());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Chave de API do servidor inválida ou não autorizada");
        }
    }

    private RoundEvent persistEvent(UUID serverId, RoundEventRequest request) {
        String payload;
        try {
            payload = objectMapper.writeValueAsString(request);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Evento de round não pôde ser serializado");
        }
        return roundEventRepository.saveAndFlush(RoundEvent.builder()
                .id(UUID.randomUUID())
                .idempotencyKey(request.idempotencyKey())
                .serverId(serverId)
                .sessionId(request.sessionId())
                .sequence(request.sequence())
                .gameMode(request.gameMode().toUpperCase())
                .map(request.map())
                .winningSide(request.winningSide())
                .endedAt(request.endedAt())
                .payload(payload)
                .receivedAt(Instant.now())
                .build());
    }

    /**
     * Grava a participação de cada jogador com conta vinculada.
     *
     * <p>Um Steam não vinculado continua aparecendo no roster ao vivo, mas não
     * gera estatística para ninguém — a mesma regra das horas jogadas.
     */
    private List<UUID> persistParticipations(RoundEvent event, RoundEventRequest request) {
        List<UUID> affected = new ArrayList<>();
        for (RoundEventRequest.PlayerRound player : request.players()) {
            Optional<User> userOpt = userRepository.findBySteamId64(player.steamId64());
            if (userOpt.isEmpty()) continue;

            UUID userId = userOpt.get().getId();
            boolean won = request.winningSide() != null
                    && request.winningSide().equalsIgnoreCase(player.side());

            participationRepository.save(RoundParticipation.builder()
                    .id(new RoundParticipation.RoundParticipationId(event.getId(), userId))
                    .side(player.side().toUpperCase())
                    .kills(player.kills())
                    .deaths(player.deaths())
                    .assists(player.assists())
                    .damage(player.damage())
                    .survived(player.survived())
                    .wasTraded(player.wasTraded())
                    .openingKill(player.openingKill())
                    .openingDeath(player.openingDeath())
                    .won(won)
                    .build());
            affected.add(userId);
        }
        participationRepository.flush();
        return affected;
    }

    /**
     * Fecha quantas unidades couberem nos rounds acumulados do jogador.
     *
     * <p>Um jogador pode ter acumulado mais de 20 rounds se algum fechamento
     * anterior falhou, então o laço fecha todas as unidades completas em vez de
     * apenas uma.
     */
    private void closeCompletedUnits(UUID userId, String gameMode) {
        int perUnit = CompetitiveScales.RETAKE_BLOCK_ROUNDS;

        while (participationRepository.countOpenRounds(userId, gameMode) >= perUnit) {
            List<RoundParticipation> open =
                    participationRepository.findOpenRounds(userId, gameMode);
            if (open.size() < perUnit) return;

            List<RoundParticipation> unit = open.subList(0, perUnit);
            if (!closeUnit(userId, gameMode, unit)) {
                // Outro fechamento concorrente levou estes rounds. Nada a fazer.
                return;
            }
        }
    }

    private boolean closeUnit(UUID userId, String gameMode, List<RoundParticipation> unit) {
        UUID blockId = UUID.randomUUID();
        List<UUID> eventIds = unit.stream().map(p -> p.getId().getRoundEventId()).toList();

        PlayerStats stats = playerStatsRepository.findByUserId(userId)
                .orElseGet(() -> playerStatsRepository.save(
                        PlayerStats.builder().userId(userId).build()));

        double rating = ratingOf(gameMode, unit);
        int roundsWon = (int) unit.stream().filter(RoundParticipation::isWon).count();
        double score = EloCalculator.roundShareScore(roundsWon, unit.size());

        // Sem o ELO do adversário no contrato atual, a referência é o próprio ELO
        // do jogador: a expectativa fica em 0,5 e o movimento passa a depender só
        // do resultado. Quando o evento trouxer o roster adversário, esta é a
        // única linha que muda.
        double opponentElo = stats.getKurageElo();
        long unitsPlayed = blockRepository.countByUserIdAndGameMode(userId, gameMode);
        int k = EloCalculator.kFactor(stats.getKurageElo(), (int) unitsPlayed,
                PlayerStats.CALIBRATION_MATCHES_REQUIRED);

        int eloBefore = stats.getKurageElo();
        int eloAfter = EloCalculator.nextElo(eloBefore, opponentElo, score, k);
        double expected = EloCalculator.expectedScore(eloBefore, opponentElo);

        // A unidade é gravada antes de reivindicar os rounds, porque a chave
        // estrangeira exige que o bloco exista.
        blockRepository.saveAndFlush(CompetitiveBlock.builder()
                .id(blockId)
                .userId(userId)
                .gameMode(gameMode)
                .rounds(unit.size())
                .closedAt(Instant.now())
                .algorithmVersion(CompetitiveScales.ALGORITHM_VERSION)
                .rating(scaled(rating, 3))
                .score(scaled(score, 4))
                .expectedScore(scaled(expected, 4))
                .opponentElo(scaled(opponentElo, 2))
                .eloBefore(eloBefore)
                .eloAfter(eloAfter)
                .build());

        // A condição block_id IS NULL é o que impede dois fechamentos de contarem
        // o mesmo round. Se outro fechamento levou algum, esta transação inteira
        // é desfeita: melhor desfazer do que gravar uma unidade que reivindicou
        // menos rounds do que declara (invariante 7).
        int claimed = participationRepository.assignToBlock(blockId, userId, eventIds);
        if (claimed != unit.size()) {
            log.warn("Fechamento concorrente para {}: {} de {} rounds reivindicados",
                    userId, claimed, unit.size());
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Estes rounds já estão sendo fechados por outra requisição");
        }

        applyToPlayerStats(stats, unit, eloAfter, roundsWon);
        return true;
    }

    private double ratingOf(String gameMode, List<RoundParticipation> unit) {
        Map<Side, int[]> bySide = new EnumMap<>(Side.class);
        for (RoundParticipation p : unit) {
            Side side = "CT".equalsIgnoreCase(p.getSide()) ? Side.CT : Side.TR;
            // rounds, kills, deaths, damage, kast, multikill
            int[] acc = bySide.computeIfAbsent(side, s -> new int[6]);
            acc[0]++;
            acc[1] += p.getKills();
            acc[2] += p.getDeaths();
            acc[3] += p.getDamage();
            if (p.getKills() > 0 || p.getAssists() > 0 || p.isSurvived() || p.isWasTraded()) {
                acc[4]++;
            }
            if (p.getKills() >= 2) acc[5]++;
        }

        Map<Side, SideProduction> production = new EnumMap<>(Side.class);
        bySide.forEach((side, acc) -> production.put(side,
                new SideProduction(acc[0], acc[1], acc[2], acc[3], acc[4], acc[5])));

        return RatingCalculator.forRoundBasedUnit(
                com.kurage.api.domain.GameMode.valueOf(gameMode), production);
    }

    /**
     * Aplica a unidade às estatísticas acumuladas.
     *
     * <p>{@code matchesPlayed} conta unidades válidas, e é ele que a triagem de
     * cinco partidas observa.
     */
    private void applyToPlayerStats(
            PlayerStats stats, List<RoundParticipation> unit, int eloAfter, int roundsWon) {
        int kills = unit.stream().mapToInt(RoundParticipation::getKills).sum();
        int deaths = unit.stream().mapToInt(RoundParticipation::getDeaths).sum();
        int assists = unit.stream().mapToInt(RoundParticipation::getAssists).sum();
        int damage = unit.stream().mapToInt(RoundParticipation::getDamage).sum();

        stats.setKills(stats.getKills() + kills);
        stats.setDeaths(stats.getDeaths() + deaths);
        stats.setAssists(stats.getAssists() + assists);
        stats.setTotalDamage(stats.getTotalDamage() + damage);
        stats.setRoundsPlayed(stats.getRoundsPlayed() + unit.size());
        stats.setMatchesPlayed(stats.getMatchesPlayed() + 1);
        if (roundsWon * 2 > unit.size()) {
            stats.setMatchesWon(stats.getMatchesWon() + 1);
        }
        stats.setKurageElo(eloAfter);
        stats.setLastMatchAt(Instant.now());
        playerStatsRepository.saveAndFlush(stats);
    }

    private static BigDecimal scaled(double value, int scale) {
        return BigDecimal.valueOf(value).setScale(scale, RoundingMode.HALF_UP);
    }
}
