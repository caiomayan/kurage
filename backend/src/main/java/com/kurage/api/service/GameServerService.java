package com.kurage.api.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kurage.api.domain.GameMode;
import com.kurage.api.domain.GameServer;
import com.kurage.api.domain.PlayerStats;
import com.kurage.api.domain.User;
import com.kurage.api.domain.UserFaceit;
import com.kurage.api.dto.request.GameServerHeartbeatRequest;
import com.kurage.api.dto.request.ServerPlayerDto;
import com.kurage.api.dto.response.GameServerResponse;
import com.kurage.api.dto.response.ServerPlayerResponse;
import com.kurage.api.repository.GameServerRepository;
import com.kurage.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class GameServerService {

    private final GameServerRepository gameServerRepository;
    private final UserRepository userRepository;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    private static final Duration CACHE_TTL = Duration.ofSeconds(30);
    private static final String CACHE_PREFIX_ALL = "cache:servers:all";
    private static final String CACHE_PREFIX_MODE = "cache:servers:mode:";
    private static final String CACHE_PREFIX_ID = "cache:servers:id:";
    private static final String CACHE_PREFIX_PLAYERS = "cache:servers:players:";

    @Transactional(readOnly = true)
    public List<GameServerResponse> getAllServers() {
        // 1. Tenta buscar no cache Redis (Fail-Open)
        try {
            if (redisTemplate != null) {
                String cached = redisTemplate.opsForValue().get(CACHE_PREFIX_ALL);
                if (cached != null) {
                    return objectMapper.readValue(cached, new TypeReference<List<GameServerResponse>>() {});
                }
            }
        } catch (Exception e) {
            log.warn("Redis unavailable during all servers cache read: {}", e.getMessage());
        }

        // 2. Busca no banco de dados ordenado por status online, jogadores ativos e nome
        List<GameServer> servers = gameServerRepository.findAllByOrderByIsOnlineDescCurrentPlayersDescNameAsc();
        List<GameServerResponse> responses = servers.stream()
                .map(s -> GameServerResponse.create(s, getLivePlayersForServer(s.getId())))
                .collect(Collectors.toList());

        // 3. Salva no Redis
        try {
            if (redisTemplate != null) {
                redisTemplate.opsForValue().set(
                        CACHE_PREFIX_ALL,
                        objectMapper.writeValueAsString(responses),
                        CACHE_TTL
                );
            }
        } catch (Exception e) {
            log.warn("Redis unavailable during all servers cache write: {}", e.getMessage());
        }

        return responses;
    }

    @Transactional(readOnly = true)
    public List<GameServerResponse> getByMode(GameMode gameMode) {
        if (gameMode == null) {
            return getAllServers();
        }

        String cacheKey = CACHE_PREFIX_MODE + gameMode.name();

        // 1. Tenta buscar no cache Redis (Fail-Open)
        try {
            if (redisTemplate != null) {
                String cached = redisTemplate.opsForValue().get(cacheKey);
                if (cached != null) {
                    return objectMapper.readValue(cached, new TypeReference<List<GameServerResponse>>() {});
                }
            }
        } catch (Exception e) {
            log.warn("Redis unavailable during servers by mode cache read: {}", e.getMessage());
        }

        // 2. Busca no banco de dados
        List<GameServer> servers = gameServerRepository.findByGameModeOrderByIsOnlineDescCurrentPlayersDescNameAsc(gameMode);
        List<GameServerResponse> responses = servers.stream()
                .map(s -> GameServerResponse.create(s, getLivePlayersForServer(s.getId())))
                .collect(Collectors.toList());

        // 3. Salva no Redis
        try {
            if (redisTemplate != null) {
                redisTemplate.opsForValue().set(
                        cacheKey,
                        objectMapper.writeValueAsString(responses),
                        CACHE_TTL
                );
            }
        } catch (Exception e) {
            log.warn("Redis unavailable during servers by mode cache write: {}", e.getMessage());
        }

        return responses;
    }

    @Transactional(readOnly = true)
    public GameServerResponse getById(UUID id) {
        if (id == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ID do servidor não pode ser nulo");
        }

        String cacheKey = CACHE_PREFIX_ID + id;

        // 1. Tenta buscar no cache Redis (Fail-Open)
        try {
            if (redisTemplate != null) {
                String cached = redisTemplate.opsForValue().get(cacheKey);
                if (cached != null) {
                    return objectMapper.readValue(cached, GameServerResponse.class);
                }
            }
        } catch (Exception e) {
            log.warn("Redis unavailable during server by id cache read: {}", e.getMessage());
        }

        // 2. Busca no banco de dados
        GameServer server = gameServerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Servidor de jogo não encontrado"));

        List<ServerPlayerResponse> players = getLivePlayersForServer(id);
        GameServerResponse response = GameServerResponse.create(server, players);

        // 3. Salva no Redis
        try {
            if (redisTemplate != null) {
                redisTemplate.opsForValue().set(
                        cacheKey,
                        objectMapper.writeValueAsString(response),
                        CACHE_TTL
                );
            }
        } catch (Exception e) {
            log.warn("Redis unavailable during server by id cache write: {}", e.getMessage());
        }

        return response;
    }

    @Transactional
    public GameServerResponse processHeartbeat(UUID serverId, GameServerHeartbeatRequest request) {
        if (serverId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ID do servidor não pode ser nulo");
        }

        GameServer server = gameServerRepository.findById(serverId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Servidor de jogo não encontrado"));

        server.setCurrentMap(request.getCurrentMap());
        server.setCurrentPlayers(request.getCurrentPlayers());
        if (request.getMaxPlayers() != null && request.getMaxPlayers() > 0) {
            server.setMaxPlayers(request.getMaxPlayers());
        }
        if (request.getGameMode() != null) {
            server.setGameMode(request.getGameMode());
        }
        server.setOnline(true);
        server.setLastHeartbeat(Instant.now());

        GameServer updated = gameServerRepository.save(server);

        // Process and enrich active players with Kurage profiles
        List<ServerPlayerResponse> enrichedPlayers = new ArrayList<>();
        if (request.getPlayers() != null) {
            for (ServerPlayerDto p : request.getPlayers()) {
                if (p.getSteamId64() == null || p.getSteamId64().isBlank()) continue;

                Optional<User> userOpt = userRepository.findBySteamId64(p.getSteamId64());
                if (userOpt.isPresent()) {
                    User u = userOpt.get();
                    PlayerStats stats = u.getPlayerStats();
                    UserFaceit faceit = u.getFaceit();
                    String clanTag = (u.getTeamMemberships() != null && !u.getTeamMemberships().isEmpty() && u.getTeamMemberships().get(0).getTeam() != null)
                            ? u.getTeamMemberships().get(0).getTeam().getTag()
                            : null;

                    enrichedPlayers.add(ServerPlayerResponse.builder()
                            .kurageId(u.getKurageId())
                            .steamId64(u.getSteamId64())
                            .username(p.getUsername() != null && !p.getUsername().isBlank() ? p.getUsername() : u.getUsername())
                            .avatarUrl(u.getAvatarUrl())
                            .team(p.getTeam() != null ? p.getTeam() : "SPEC")
                            .kurageLevel(1)
                            .kurageElo(stats != null && stats.getKurageElo() != null ? stats.getKurageElo() : 2000)
                            .faceitLevel(faceit != null ? faceit.getLevel() : null)
                            .isVerifiedPro(u.isVerifiedPro())
                            .clanTag(clanTag)
                            .kills(p.getKills() != null ? p.getKills() : 0)
                            .deaths(p.getDeaths() != null ? p.getDeaths() : 0)
                            .ping(p.getPing() != null ? p.getPing() : 0)
                            .isAlive(p.getIsAlive() != null ? p.getIsAlive() : true)
                            .build());
                } else {
                    enrichedPlayers.add(ServerPlayerResponse.builder()
                            .steamId64(p.getSteamId64())
                            .username(p.getUsername() != null ? p.getUsername() : "Player")
                            .avatarUrl("https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg")
                            .team(p.getTeam() != null ? p.getTeam() : "SPEC")
                            .kurageLevel(1)
                            .kurageElo(2000)
                            .kills(p.getKills() != null ? p.getKills() : 0)
                            .deaths(p.getDeaths() != null ? p.getDeaths() : 0)
                            .ping(p.getPing() != null ? p.getPing() : 0)
                            .isAlive(p.getIsAlive() != null ? p.getIsAlive() : true)
                            .build());
                }
            }
        }

        // Cache players in Redis
        try {
            if (redisTemplate != null) {
                redisTemplate.opsForValue().set(
                        CACHE_PREFIX_PLAYERS + serverId,
                        objectMapper.writeValueAsString(enrichedPlayers),
                        Duration.ofMinutes(3)
                );
            }
        } catch (Exception e) {
            log.warn("Redis unavailable during server players cache write: {}", e.getMessage());
        }

        evictServerCaches(serverId, updated.getGameMode());

        log.debug("Heartbeat processed for server '{}' (map: {}, players: {}/{})",
                updated.getName(), updated.getCurrentMap(), updated.getCurrentPlayers(), updated.getMaxPlayers());

        return GameServerResponse.create(updated, enrichedPlayers);
    }

    private List<ServerPlayerResponse> getLivePlayersForServer(UUID serverId) {
        if (serverId == null) return List.of();
        try {
            if (redisTemplate != null) {
                String cached = redisTemplate.opsForValue().get(CACHE_PREFIX_PLAYERS + serverId);
                if (cached != null) {
                    return objectMapper.readValue(cached, new TypeReference<List<ServerPlayerResponse>>() {});
                }
            }
        } catch (Exception e) {
            log.warn("Redis unavailable during server live players cache read: {}", e.getMessage());
        }
        return List.of();
    }

    @Scheduled(fixedRate = 120000) // Executa a cada 2 minutos
    @Transactional
    public void markOfflineServers() {
        Instant threshold = Instant.now().minus(Duration.ofMinutes(2));
        int updatedCount = gameServerRepository.markServersOfflineOlderThan(threshold);

        if (updatedCount > 0) {
            log.info("Marked {} game server(s) as offline due to missing heartbeat (>2min)", updatedCount);
            evictAllServerCaches();
        }
    }

    public void evictServerCaches(UUID serverId, GameMode gameMode) {
        try {
            if (redisTemplate != null) {
                redisTemplate.delete(CACHE_PREFIX_ALL);
                if (serverId != null) {
                    redisTemplate.delete(CACHE_PREFIX_ID + serverId);
                }
                if (gameMode != null) {
                    redisTemplate.delete(CACHE_PREFIX_MODE + gameMode.name());
                }
            }
        } catch (Exception e) {
            log.warn("Redis unavailable during server cache eviction: {}", e.getMessage());
        }
    }

    public void evictAllServerCaches() {
        try {
            if (redisTemplate != null) {
                redisTemplate.delete(CACHE_PREFIX_ALL);
                for (GameMode mode : GameMode.values()) {
                    redisTemplate.delete(CACHE_PREFIX_MODE + mode.name());
                }
            }
        } catch (Exception e) {
            log.warn("Redis unavailable during all servers cache eviction: {}", e.getMessage());
        }
    }
}
