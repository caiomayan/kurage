package com.kurage.api.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kurage.api.domain.*;
import com.kurage.api.dto.response.*;
import com.kurage.api.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RankingService {

    public static final int MAX_PLAYER_RANKING = 200;
    public static final int MAX_TEAM_RANKING = 50;

    /**
     * Vagas de Level S. O documento 19 §6 fixa o top 30 do ranking geral; com
     * menos de 30 calibrados, todos eles recebem.
     */
    public static final int LEVEL_S_SLOTS = 30;

    private final PlayerStatsRepository playerStatsRepository;
    private final TeamRepository teamRepository;
    private final UserRepository userRepository;
    private final RankingSnapshotRepository rankingSnapshotRepository;
    private final TeamRankingSnapshotRepository teamRankingSnapshotRepository;
    private final LevelSGrantRepository levelSGrantRepository;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Fuso da virada do dia para o Level S. São Paulo por padrão; mesmo offset de
     * Fortaleza, que é o fuso já usado na automação do repositório.
     */
    @Value("${ranking.timezone:America/Sao_Paulo}")
    private String levelSTimezone;

    @Transactional(readOnly = true)
    public PageResponse<LeaderboardResponse> getPlayerRanking(int page, int size) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 100);

        String cacheKey = "cache:ranking:players:page:" + safePage + ":size:" + safeSize;

        // 1. Tenta buscar no Redis (Fail-Open)
        try {
            if (redisTemplate != null) {
                String cached = redisTemplate.opsForValue().get(cacheKey);
                if (cached != null) {
                    return objectMapper.readValue(cached, new TypeReference<PageResponse<LeaderboardResponse>>() {});
                }
            }
        } catch (Exception e) {
            log.warn("Redis unavailable during player ranking cache read: {}", e.getMessage());
        }

        // 2. Se a página requisitada estiver além do limite de 200 posições
        if (safePage * safeSize >= MAX_PLAYER_RANKING) {
            PageResponse<LeaderboardResponse> emptyResponse = new PageResponse<>(
                    List.of(),
                    safePage,
                    safeSize,
                    MAX_PLAYER_RANKING,
                    (int) Math.ceil((double) MAX_PLAYER_RANKING / safeSize),
                    true,
                    Instant.now().toString(),
                    Instant.now().plus(Duration.ofHours(1)).toString()
            );
            return emptyResponse;
        }

        int adjustedSize = Math.min(safeSize, MAX_PLAYER_RANKING - (safePage * safeSize));
        Page<PlayerStats> statsPage = playerStatsRepository.findAllOrderByKurageEloDesc(PageRequest.of(safePage, adjustedSize));

        LocalDate yesterday = LocalDate.now().minusDays(1);
        List<PlayerStats> content = statsPage.getContent();
        List<LeaderboardResponse> responseList = new ArrayList<>();

        for (int i = 0; i < content.size(); i++) {
            PlayerStats stats = content.get(i);
            User user = stats.getUser();
            int position = (safePage * safeSize) + i + 1;

            Integer positionDelta = null;
            if (user != null) {
                Optional<RankingSnapshot> snapshotOpt = rankingSnapshotRepository.findByUserIdAndSnapshotDate(user.getId(), yesterday);
                if (snapshotOpt.isPresent()) {
                    positionDelta = snapshotOpt.get().getPosition() - position;
                }
            }

            responseList.add(mapToLeaderboardResponse(user, stats, position, positionDelta));
        }

        long totalElements = Math.min(statsPage.getTotalElements(), MAX_PLAYER_RANKING);
        int totalPages = (int) Math.ceil((double) totalElements / safeSize);
        boolean isLast = safePage >= totalPages - 1;

        PageResponse<LeaderboardResponse> response = new PageResponse<>(
                responseList,
                safePage,
                safeSize,
                totalElements,
                totalPages,
                isLast,
                Instant.now().toString(),
                Instant.now().plus(Duration.ofHours(1)).toString()
        );

        // 3. Salva em Cache Redis por 1 hora
        try {
            if (redisTemplate != null) {
                redisTemplate.opsForValue().set(
                        cacheKey,
                        objectMapper.writeValueAsString(response),
                        Duration.ofHours(1)
                );
            }
        } catch (Exception e) {
            log.warn("Redis unavailable during player ranking cache write: {}", e.getMessage());
        }

        return response;
    }

    @Transactional(readOnly = true)
    public PageResponse<TeamLeaderboardResponse> getTeamRanking(int page, int size) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 50);

        String cacheKey = "cache:ranking:teams:page:" + safePage + ":size:" + safeSize;

        // 1. Tenta buscar no Redis (Fail-Open)
        try {
            if (redisTemplate != null) {
                String cached = redisTemplate.opsForValue().get(cacheKey);
                if (cached != null) {
                    return objectMapper.readValue(cached, new TypeReference<PageResponse<TeamLeaderboardResponse>>() {});
                }
            }
        } catch (Exception e) {
            log.warn("Redis unavailable during team ranking cache read: {}", e.getMessage());
        }

        // 2. Se a página requisitada estiver além do limite de 50 posições
        if (safePage * safeSize >= MAX_TEAM_RANKING) {
            PageResponse<TeamLeaderboardResponse> emptyResponse = new PageResponse<>(
                    List.of(),
                    safePage,
                    safeSize,
                    MAX_TEAM_RANKING,
                    (int) Math.ceil((double) MAX_TEAM_RANKING / safeSize),
                    true,
                    Instant.now().toString(),
                    Instant.now().plus(Duration.ofHours(1)).toString()
            );
            return emptyResponse;
        }

        int adjustedSize = Math.min(safeSize, MAX_TEAM_RANKING - (safePage * safeSize));
        Page<Team> teamPage = teamRepository.findAllOrderByTeamEloDesc(PageRequest.of(safePage, adjustedSize));

        LocalDate yesterday = LocalDate.now().minusDays(1);
        List<Team> content = teamPage.getContent();
        List<TeamLeaderboardResponse> responseList = new ArrayList<>();

        for (int i = 0; i < content.size(); i++) {
            Team team = content.get(i);
            int position = (safePage * safeSize) + i + 1;

            Integer positionDelta = null;
            Optional<TeamRankingSnapshot> snapshotOpt = teamRankingSnapshotRepository.findByTeamIdAndSnapshotDate(team.getId(), yesterday);
            if (snapshotOpt.isPresent()) {
                positionDelta = snapshotOpt.get().getPosition() - position;
            }

            int memberCount = team.getMembers() != null ? team.getMembers().size() : 0;

            responseList.add(new TeamLeaderboardResponse(
                    team.getId(),
                    team.getName(),
                    team.getTag(),
                    team.getLogoUrl(),
                    team.getCountry(),
                    team.getTeamElo(),
                    position,
                    positionDelta,
                    memberCount
            ));
        }

        long totalElements = Math.min(teamPage.getTotalElements(), MAX_TEAM_RANKING);
        int totalPages = (int) Math.ceil((double) totalElements / safeSize);
        boolean isLast = safePage >= totalPages - 1;

        PageResponse<TeamLeaderboardResponse> response = new PageResponse<>(
                responseList,
                safePage,
                safeSize,
                totalElements,
                totalPages,
                isLast,
                Instant.now().toString(),
                Instant.now().plus(Duration.ofHours(1)).toString()
        );

        // 3. Salva em Cache Redis por 1 hora
        try {
            if (redisTemplate != null) {
                redisTemplate.opsForValue().set(
                        cacheKey,
                        objectMapper.writeValueAsString(response),
                        Duration.ofHours(1)
                );
            }
        } catch (Exception e) {
            log.warn("Redis unavailable during team ranking cache write: {}", e.getMessage());
        }

        return response;
    }

    @Transactional(readOnly = true)
    public PlayerRankingContextResponse getPlayerContext(Long kurageId) {
        if (kurageId == null) {
            throw new IllegalArgumentException("Kurage ID cannot be null");
        }

        String cacheKey = "cache:ranking:player-context:" + kurageId;

        // 1. Tenta buscar no Redis
        try {
            if (redisTemplate != null) {
                String cached = redisTemplate.opsForValue().get(cacheKey);
                if (cached != null) {
                    return objectMapper.readValue(cached, PlayerRankingContextResponse.class);
                }
            }
        } catch (Exception e) {
            log.warn("Redis unavailable during player ranking context cache read: {}", e.getMessage());
        }

        User user = userRepository.findByKurageId(kurageId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found with Kurage ID: " + kurageId));

        PlayerStats stats = playerStatsRepository.findById(user.getId()).orElse(null);
        int matchesPlayed = stats != null && stats.getMatchesPlayed() != null ? stats.getMatchesPlayed() : 0;
        if (matchesPlayed < PlayerStats.CALIBRATION_MATCHES_REQUIRED) {
            PlayerRankingContextResponse unrankedContext = new PlayerRankingContextResponse(
                    mapToLeaderboardResponse(user, stats, null, null),
                    null,
                    null,
                    null,
                    List.of(),
                    null,
                    List.of()
            );
            try {
                if (redisTemplate != null) {
                    redisTemplate.opsForValue().set(
                            cacheKey,
                            objectMapper.writeValueAsString(unrankedContext),
                            Duration.ofMinutes(5)
                    );
                }
            } catch (Exception e) {
                log.warn("Redis unavailable during unranked player context cache write: {}", e.getMessage());
            }
            return unrankedContext;
        }
        int currentPosition = playerStatsRepository.findLeaderboardPosition(stats.getKurageElo());

        LocalDate yesterday = LocalDate.now().minusDays(1);
        LocalDate weekAgo = LocalDate.now().minusDays(7);

        Integer deltaYesterday = rankingSnapshotRepository.findByUserIdAndSnapshotDate(user.getId(), yesterday)
                .map(s -> s.getPosition() - currentPosition)
                .orElse(null);

        Integer deltaWeek = rankingSnapshotRepository.findByUserIdAndSnapshotDate(user.getId(), weekAgo)
                .map(s -> s.getPosition() - currentPosition)
                .orElse(null);

        LeaderboardResponse targetPlayerResponse = mapToLeaderboardResponse(user, stats, currentPosition, deltaYesterday);

        // Jogadores Adjacentes (~5 jogadores centrados na posição)
        int fetchCount = Math.min(MAX_PLAYER_RANKING, Math.max(5, currentPosition + 2));
        List<PlayerStats> topList = playerStatsRepository.findTopOrderByKurageEloDesc(fetchCount);

        List<LeaderboardResponse> adjacentPlayers = new ArrayList<>();
        LeaderboardResponse nextPlayerToPass = null;

        int startIndex = Math.max(0, currentPosition - 3);
        int endIndex = Math.min(topList.size(), currentPosition + 2);

        for (int i = startIndex; i < endIndex; i++) {
            PlayerStats ps = topList.get(i);
            int pos = i + 1;
            Integer dY = null;
            if (ps.getUser() != null) {
                dY = rankingSnapshotRepository.findByUserIdAndSnapshotDate(ps.getUser().getId(), yesterday)
                        .map(s -> s.getPosition() - pos)
                        .orElse(null);
            }
            LeaderboardResponse resp = mapToLeaderboardResponse(ps.getUser(), ps, pos, dY);
            adjacentPlayers.add(resp);

            if (pos == currentPosition - 1) {
                nextPlayerToPass = resp;
            }
        }

        // Buscar histórico do jogador (últimos 10 dias)
        List<RankingSnapshot> snapshots = rankingSnapshotRepository.findByUserIdOrderBySnapshotDateDesc(user.getId());
        List<RankingHistoryPointResponse> history = snapshots.stream()
                .limit(10)
                .map(s -> new RankingHistoryPointResponse(s.getSnapshotDate(), s.getPosition(), s.getKurageElo()))
                .sorted((a, b) -> a.date().compareTo(b.date()))
                .toList();

        PlayerRankingContextResponse contextResponse = new PlayerRankingContextResponse(
                targetPlayerResponse,
                currentPosition,
                deltaYesterday,
                deltaWeek,
                adjacentPlayers,
                nextPlayerToPass,
                history
        );

        // 3. Salva em Cache Redis por 5 minutos
        try {
            if (redisTemplate != null) {
                redisTemplate.opsForValue().set(
                        cacheKey,
                        objectMapper.writeValueAsString(contextResponse),
                        Duration.ofMinutes(5)
                );
            }
        } catch (Exception e) {
            log.warn("Redis unavailable during player context cache write: {}", e.getMessage());
        }

        return contextResponse;
    }

    /**
     * Concede o Level S do dia que começa.
     *
     * <p>Roda à meia-noite por decisão de produto: o S não acompanha o ELO em
     * tempo real. Quem estiver no topo elegível neste instante carrega o S
     * durante todo o dia seguinte, mesmo que o ELO mude no meio do dia.
     *
     * <p>Idempotente: apagar e regravar a data permite reexecutar após um
     * reinício sem duplicar concessões nem estourar as 30 vagas. A ordem vem do
     * desempate determinístico do repositório, que é o que garante que a vaga 30
     * nunca fique ambígua.
     */
    @Scheduled(cron = "${ranking.level-s.cron:0 0 0 * * *}", zone = "${ranking.timezone:America/Sao_Paulo}")
    @Transactional
    public void grantDailyLevelS() {
        grantLevelSFor(LocalDate.now(ZoneId.of(levelSTimezone)));
    }

    /**
     * Executa a concessão para uma data específica. Separado do gatilho agendado
     * para que a integração exercite a regra sem depender do relógio.
     */
    @Transactional
    public int grantLevelSFor(LocalDate date) {
        log.info("Granting Level S for date: {}", date);

        List<PlayerStats> eligible = playerStatsRepository.findTopOrderByKurageEloDesc(LEVEL_S_SLOTS);
        levelSGrantRepository.deleteByDate(date);

        int granted = 0;
        for (PlayerStats stats : eligible) {
            UUID userId = stats.getUserId();
            if (userId == null) {
                log.warn("Skipping Level S grant with missing user id");
                continue;
            }
            granted++;
            // A concessão é construída a partir do identificador, e não da
            // associação carregada: PlayerStats pode chegar do contexto de
            // persistência com o vínculo ainda não materializado, e o S não pode
            // depender disso. A referência evita um SELECT extra por jogador.
            levelSGrantRepository.save(LevelSGrant.builder()
                    .id(new LevelSGrant.LevelSGrantId(date, userId))
                    .user(userRepository.getReferenceById(userId))
                    .position(granted)
                    .grantedAt(Instant.now())
                    .build());
        }

        log.info("Level S granted to {} player(s) for {}", granted, date);
        return granted;
    }

    /**
     * Se o jogador carrega o Level S hoje.
     *
     * <p>Lê a concessão do dia, não a posição atual: o S vale o dia inteiro.
     */
    @Transactional(readOnly = true)
    public boolean isLevelS(UUID userId) {
        return levelSGrantRepository.existsByIdSnapshotDateAndIdUserId(
                LocalDate.now(ZoneId.of(levelSTimezone)), userId);
    }

    @Scheduled(cron = "${ranking.snapshot.cron:0 0 4 * * *}")
    @Transactional
    public void generateDailyPlayerSnapshots() {
        LocalDate date = LocalDate.now();
        log.info("Starting daily player ranking snapshots generation for date: {}", date);

        List<PlayerStats> topPlayers = playerStatsRepository.findTopOrderByKurageEloDesc(MAX_PLAYER_RANKING);

        int savedCount = 0;
        for (int i = 0; i < topPlayers.size(); i++) {
            PlayerStats ps = topPlayers.get(i);
            User user = ps.getUser();
            if (user == null) continue;

            int position = i + 1;
            Integer elo = ps.getKurageElo();
            if (elo == null) {
                log.warn("Skipping player ranking snapshot with missing ELO: {}", ps.getUserId());
                continue;
            }

            Optional<RankingSnapshot> existingOpt = rankingSnapshotRepository.findByUserIdAndSnapshotDate(user.getId(), date);
            if (existingOpt.isPresent()) {
                RankingSnapshot snapshot = existingOpt.get();
                snapshot.setPosition(position);
                snapshot.setKurageElo(elo);
                rankingSnapshotRepository.save(snapshot);
            } else {
                RankingSnapshot snapshot = RankingSnapshot.builder()
                        .user(user)
                        .position(position)
                        .kurageElo(elo)
                        .snapshotDate(date)
                        .build();
                rankingSnapshotRepository.save(snapshot);
            }
            savedCount++;
        }

        log.info("Completed daily player ranking snapshots generation: {} snapshots created/updated", savedCount);
    }

    @Scheduled(cron = "${ranking.snapshot.cron:0 0 4 * * *}")
    @Transactional
    public void generateDailyTeamSnapshots() {
        LocalDate date = LocalDate.now();
        log.info("Starting daily team ranking snapshots generation for date: {}", date);

        Page<Team> topTeams = teamRepository.findAllOrderByTeamEloDesc(PageRequest.of(0, MAX_TEAM_RANKING));
        List<Team> content = topTeams.getContent();

        int savedCount = 0;
        for (int i = 0; i < content.size(); i++) {
            Team team = content.get(i);
            int position = i + 1;
            Integer elo = team.getTeamElo();
            if (elo == null) {
                log.warn("Skipping team ranking snapshot with missing ELO: {}", team.getId());
                continue;
            }

            Optional<TeamRankingSnapshot> existingOpt = teamRankingSnapshotRepository.findByTeamIdAndSnapshotDate(team.getId(), date);
            if (existingOpt.isPresent()) {
                TeamRankingSnapshot snapshot = existingOpt.get();
                snapshot.setPosition(position);
                snapshot.setTeamElo(elo);
                teamRankingSnapshotRepository.save(snapshot);
            } else {
                TeamRankingSnapshot snapshot = TeamRankingSnapshot.builder()
                        .team(team)
                        .position(position)
                        .teamElo(elo)
                        .snapshotDate(date)
                        .build();
                teamRankingSnapshotRepository.save(snapshot);
            }
            savedCount++;
        }

        log.info("Completed daily team ranking snapshots generation: {} snapshots created/updated", savedCount);
    }

    private LeaderboardResponse mapToLeaderboardResponse(User user, PlayerStats stats, Integer position, Integer positionDelta) {
        if (user == null) {
            throw new IllegalStateException("Ranking entry is missing its user");
        }

        int matches = stats != null && stats.getMatchesPlayed() != null ? stats.getMatchesPlayed() : 0;
        boolean ranked = stats != null && stats.isCalibrated();
        Integer elo = ranked ? stats.getKurageElo() : null;
        Integer level = ranked ? stats.getKurageLevel() : null;

        int kills = stats != null && stats.getKills() != null ? stats.getKills() : 0;
        int deaths = stats != null && stats.getDeaths() != null ? stats.getDeaths() : 0;
        int wins = stats != null && stats.getMatchesWon() != null ? stats.getMatchesWon() : 0;

        BigDecimal kdRatio = !ranked ? null : deaths > 0
                ? BigDecimal.valueOf((double) kills / deaths).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.valueOf(kills).setScale(2, RoundingMode.HALF_UP);

        Integer winRate = ranked ? (wins * 100) / matches : null;

        String teamTag = null;
        List<Team> teams = teamRepository.findAllByMemberUserId(user.getId());
        if (!teams.isEmpty()) {
            teamTag = teams.get(0).getTag();
        }

        return new LeaderboardResponse(
                user.getKurageId(),
                user.getSteamId64(),
                user.getUsername(),
                user.getAvatarUrl(),
                user.getCountry(),
                level,
                elo,
                kdRatio,
                winRate,
                stats != null ? matches : null,
                stats != null ? wins : null,
                position,
                positionDelta,
                user.getPrimaryFunction() != null ? user.getPrimaryFunction().name() : null,
                teamTag,
                user.isVerifiedPro()
        );
    }
}
