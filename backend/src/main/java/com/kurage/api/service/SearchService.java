package com.kurage.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kurage.api.domain.PlayerStats;
import com.kurage.api.domain.Team;
import com.kurage.api.domain.User;
import com.kurage.api.domain.UserFaceit;
import com.kurage.api.dto.response.FullSearchResponse;
import com.kurage.api.dto.response.QuickSearchResponse;
import com.kurage.api.dto.response.SearchPlayerResult;
import com.kurage.api.dto.response.SearchTeamResult;
import com.kurage.api.repository.PlayerStatsRepository;
import com.kurage.api.repository.TeamRepository;
import com.kurage.api.repository.UserFaceitRepository;
import com.kurage.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SearchService {

    private final UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final PlayerStatsRepository playerStatsRepository;
    private final UserFaceitRepository userFaceitRepository;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional(readOnly = true)
    public QuickSearchResponse quickSearch(String query, int limit) {
        if (query == null || query.trim().length() < 2) {
            return new QuickSearchResponse(null, List.of(), List.of());
        }

        int safeLimit = Math.min(Math.max(limit, 1), 20);
        String normalizedQuery = query.trim().toLowerCase();
        String cacheKey = "cache:search:quick:" + normalizedQuery + ":" + safeLimit;

        // 1. Tenta recuperar do Redis (com resiliência a falhas)
        try {
            if (redisTemplate != null) {
                String cached = redisTemplate.opsForValue().get(cacheKey);
                if (cached != null) {
                    return objectMapper.readValue(cached, QuickSearchResponse.class);
                }
            }
        } catch (Exception e) {
            log.warn("Redis unavailable during quick search cache read: {}", e.getMessage());
        }

        // 2. Busca Players
        List<User> playerList = new ArrayList<>();
        try {
            Long kurageId = Long.parseLong(query.trim());
            userRepository.findByKurageId(kurageId).ifPresent(playerList::add);
        } catch (NumberFormatException ignored) {}

        List<User> textUsers = userRepository.findTopUsersOrdered(normalizedQuery, PageRequest.of(0, safeLimit));
        for (User u : textUsers) {
            if (playerList.stream().noneMatch(existing -> existing.getId().equals(u.getId()))) {
                playerList.add(u);
            }
            if (playerList.size() >= safeLimit) {
                break;
            }
        }

        List<SearchPlayerResult> mappedPlayers = playerList.stream()
                .map(this::mapToPlayerResult)
                .collect(Collectors.toList());

        // 3. Busca Times
        List<Team> teamList = teamRepository.findTopTeamsOrdered(normalizedQuery, PageRequest.of(0, safeLimit));
        List<SearchTeamResult> mappedTeams = teamList.stream()
                .map(this::mapToTeamResult)
                .collect(Collectors.toList());

        // 4. Calcula Top Result
        QuickSearchResponse.TopResult topResult = determineTopResult(normalizedQuery, mappedPlayers, mappedTeams);

        QuickSearchResponse response = new QuickSearchResponse(topResult, mappedPlayers, mappedTeams);

        // 5. Salva em Cache Redis por 60 segundos
        try {
            if (redisTemplate != null) {
                redisTemplate.opsForValue().set(
                        cacheKey,
                        objectMapper.writeValueAsString(response),
                        Duration.ofSeconds(60)
                );
            }
        } catch (Exception e) {
            log.warn("Redis unavailable during quick search cache write: {}", e.getMessage());
        }

        return response;
    }

    @Transactional(readOnly = true)
    public FullSearchResponse fullSearch(String query, String type, int page, int size) {
        String searchType = (type != null) ? type.trim().toUpperCase() : "ALL";
        if (!"ALL".equals(searchType) && !"PLAYERS".equals(searchType) && !"TEAMS".equals(searchType)) {
            searchType = "ALL";
        }

        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 50);

        if (query == null || query.trim().length() < 2) {
            return new FullSearchResponse(
                    query != null ? query.trim() : "",
                    searchType,
                    new FullSearchResponse.SearchResultPage<>(List.of(), 0L, 0, safePage),
                    new FullSearchResponse.SearchResultPage<>(List.of(), 0L, 0, safePage)
            );
        }

        String normalizedQuery = query.trim().toLowerCase();
        String cacheKey = "cache:search:full:" + normalizedQuery + ":" + searchType + ":" + safePage + ":" + safeSize;

        // 1. Tenta recuperar do Redis
        try {
            if (redisTemplate != null) {
                String cached = redisTemplate.opsForValue().get(cacheKey);
                if (cached != null) {
                    return objectMapper.readValue(cached, FullSearchResponse.class);
                }
            }
        } catch (Exception e) {
            log.warn("Redis unavailable during full search cache read: {}", e.getMessage());
        }

        // 2. Busca paginada
        FullSearchResponse.SearchResultPage<SearchPlayerResult> playersPage;
        FullSearchResponse.SearchResultPage<SearchTeamResult> teamsPage;

        if ("ALL".equals(searchType) || "PLAYERS".equals(searchType)) {
            Page<User> users = userRepository.searchUsersOrdered(normalizedQuery, PageRequest.of(safePage, safeSize));
            List<SearchPlayerResult> mappedUsers = users.getContent().stream()
                    .map(this::mapToPlayerResult)
                    .collect(Collectors.toList());
            playersPage = new FullSearchResponse.SearchResultPage<>(
                    mappedUsers,
                    users.getTotalElements(),
                    users.getTotalPages(),
                    users.getNumber()
            );
        } else {
            playersPage = new FullSearchResponse.SearchResultPage<>(List.of(), 0L, 0, safePage);
        }

        if ("ALL".equals(searchType) || "TEAMS".equals(searchType)) {
            Page<Team> teams = teamRepository.searchTeamsOrdered(normalizedQuery, PageRequest.of(safePage, safeSize));
            List<SearchTeamResult> mappedTeams = teams.getContent().stream()
                    .map(this::mapToTeamResult)
                    .collect(Collectors.toList());
            teamsPage = new FullSearchResponse.SearchResultPage<>(
                    mappedTeams,
                    teams.getTotalElements(),
                    teams.getTotalPages(),
                    teams.getNumber()
            );
        } else {
            teamsPage = new FullSearchResponse.SearchResultPage<>(List.of(), 0L, 0, safePage);
        }

        FullSearchResponse response = new FullSearchResponse(query.trim(), searchType, playersPage, teamsPage);

        // 3. Salva em Cache Redis por 30 segundos
        try {
            if (redisTemplate != null) {
                redisTemplate.opsForValue().set(
                        cacheKey,
                        objectMapper.writeValueAsString(response),
                        Duration.ofSeconds(30)
                );
            }
        } catch (Exception e) {
            log.warn("Redis unavailable during full search cache write: {}", e.getMessage());
        }

        return response;
    }

    @Transactional(readOnly = true)
    public List<SearchPlayerResult> searchPlayersForInvite(String query, int limit) {
        if (query == null || query.trim().length() < 2) {
            return List.of();
        }

        int safeLimit = Math.min(Math.max(limit, 1), 20);
        String normalizedQuery = query.trim().toLowerCase();

        List<User> playerList = new ArrayList<>();
        try {
            Long kurageId = Long.parseLong(query.trim());
            userRepository.findByKurageId(kurageId).ifPresent(playerList::add);
        } catch (NumberFormatException ignored) {}

        List<User> textUsers = userRepository.findTopUsersOrdered(normalizedQuery, PageRequest.of(0, safeLimit));
        for (User u : textUsers) {
            if (playerList.stream().noneMatch(existing -> existing.getId().equals(u.getId()))) {
                playerList.add(u);
            }
            if (playerList.size() >= safeLimit) {
                break;
            }
        }

        return playerList.stream()
                .map(this::mapToPlayerResult)
                .collect(Collectors.toList());
    }

    private QuickSearchResponse.TopResult determineTopResult(
            String query,
            List<SearchPlayerResult> players,
            List<SearchTeamResult> teams
    ) {
        // Se for busca numérica por Kurage ID exato
        try {
            Long numericQuery = Long.parseLong(query);
            for (SearchPlayerResult p : players) {
                if (p.kurageId() != null && p.kurageId().equals(numericQuery)) {
                    return new QuickSearchResponse.TopResult("PLAYER", p, null);
                }
            }
        } catch (NumberFormatException ignored) {}

        // Match exato com tag do time
        for (SearchTeamResult t : teams) {
            if (t.tag() != null && t.tag().equalsIgnoreCase(query)) {
                return new QuickSearchResponse.TopResult("TEAM", null, t);
            }
        }

        // Match exato com username do player
        for (SearchPlayerResult p : players) {
            if (p.username() != null && p.username().equalsIgnoreCase(query)) {
                return new QuickSearchResponse.TopResult("PLAYER", p, null);
            }
        }

        // Match exato com nome do time
        for (SearchTeamResult t : teams) {
            if (t.name() != null && t.name().equalsIgnoreCase(query)) {
                return new QuickSearchResponse.TopResult("TEAM", null, t);
            }
        }

        // Match por prefixo
        if (!players.isEmpty() && !teams.isEmpty()) {
            boolean teamPrefixMatch = teams.get(0).tag().toLowerCase().startsWith(query);
            boolean playerPrefixMatch = players.get(0).username().toLowerCase().startsWith(query);

            if (teamPrefixMatch && !playerPrefixMatch) {
                return new QuickSearchResponse.TopResult("TEAM", null, teams.get(0));
            }
            return new QuickSearchResponse.TopResult("PLAYER", players.get(0), null);
        }

        if (!players.isEmpty()) {
            return new QuickSearchResponse.TopResult("PLAYER", players.get(0), null);
        }

        if (!teams.isEmpty()) {
            return new QuickSearchResponse.TopResult("TEAM", null, teams.get(0));
        }

        return null;
    }

    private SearchPlayerResult mapToPlayerResult(User user) {
        Optional<PlayerStats> statsOpt = playerStatsRepository.findById(user.getId());
        Optional<UserFaceit> faceitOpt = userFaceitRepository.findById(user.getId());

        int elo = 200;
        int level = 3;
        BigDecimal kd = BigDecimal.ZERO;
        
        Integer faceitElo = null;
        Integer faceitLevel = null;
        BigDecimal faceitKdRatio = null;

        if (faceitOpt.isPresent()) {
            UserFaceit faceit = faceitOpt.get();
            faceitElo = faceit != null ? faceit.getElo() : null;
            faceitLevel = faceit != null ? faceit.getLevel() : null;
            faceitKdRatio = faceit.getKdRatio();
            if (kd.compareTo(BigDecimal.ZERO) == 0 && faceitKdRatio != null) {
                kd = faceitKdRatio;
            }
        }

        if (statsOpt.isPresent()) {
            PlayerStats stats = statsOpt.get();
            elo = stats.getKurageElo() != null ? stats.getKurageElo() : 200;
            level = stats.getKurageLevel();
            int deaths = stats.getDeaths() != null ? stats.getDeaths() : 0;
            int kills = stats.getKills() != null ? stats.getKills() : 0;
            if (deaths > 0 || kills > 0) {
                kd = deaths > 0
                        ? BigDecimal.valueOf((double) kills / deaths).setScale(2, RoundingMode.HALF_UP)
                        : BigDecimal.valueOf(kills).setScale(2, RoundingMode.HALF_UP);
            }
        }

        String teamTag = null;
        String teamName = null;
        List<Team> userTeams = teamRepository.findAllByMemberUserId(user.getId());
        if (!userTeams.isEmpty()) {
            teamTag = userTeams.get(0).getTag();
            teamName = userTeams.get(0).getName();
        }

        SearchPlayerResult.HighlightStat highlightStat;
        if (kd.compareTo(BigDecimal.ZERO) > 0) {
            highlightStat = new SearchPlayerResult.HighlightStat("K/D", kd.toPlainString());
        } else {
            highlightStat = new SearchPlayerResult.HighlightStat("ELO", String.valueOf(elo));
        }

        return new SearchPlayerResult(
                user.getId(),
                user.getKurageId(),
                user.getUsername(),
                user.getAvatarUrl(),
                user.getCountry(),
                level,
                elo,
                user.getPrimaryFunction() != null ? user.getPrimaryFunction().name() : null,
                teamTag,
                teamName,
                kd,
                faceitElo,
                faceitLevel,
                faceitKdRatio,
                user.isVerifiedPro(),
                highlightStat
        );
    }

    private SearchTeamResult mapToTeamResult(Team team) {
        int memberCount = team.getMembers() != null ? team.getMembers().size() : 0;
        return new SearchTeamResult(
                team.getId(),
                team.getName(),
                team.getTag(),
                team.getLogoUrl(),
                team.getCountry(),
                team.getTeamElo() != null ? team.getTeamElo() : 200,
                memberCount
        );
    }
}
