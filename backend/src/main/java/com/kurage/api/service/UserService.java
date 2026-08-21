package com.kurage.api.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kurage.api.domain.PlayerFunction;
import com.kurage.api.domain.PlayerStats;
import com.kurage.api.domain.Team;
import com.kurage.api.domain.TeamInvitation;
import com.kurage.api.domain.User;
import com.kurage.api.domain.UserFaceit;
import com.kurage.api.dto.request.CreateUserRequest;
import com.kurage.api.dto.response.FaceitResponse;
import com.kurage.api.dto.response.HovercardResponse;
import com.kurage.api.dto.response.PlayerStatsResponse;
import com.kurage.api.dto.response.TeamInvitationResponse;
import com.kurage.api.dto.response.TeamResponse;
import com.kurage.api.dto.response.UserResponse;
import com.kurage.api.repository.PlayerStatsRepository;
import com.kurage.api.repository.TeamInvitationRepository;
import com.kurage.api.repository.TeamRepository;
import com.kurage.api.repository.UserFaceitRepository;
import com.kurage.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final UserFaceitRepository userFaceitRepository;
    private final PlayerStatsRepository playerStatsRepository;
    private final TeamRepository teamRepository;
    private final TeamInvitationRepository teamInvitationRepository;
    private final FaceitService faceitService;
    private final S3Service s3Service;
    private final SteamAuthService steamAuthService;
    private final PlayerStatsService playerStatsService;
    private final ProfileVisitService profileVisitService;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public Long generateKurageId() {
        try {
            Long nextId = userRepository.generateNextKurageId();
            if (nextId != null) {
                return nextId;
            }
        } catch (Exception e) {
            log.warn("Database function generate_next_kurage_id failed, using fallback: {}", e.getMessage());
        }

        // Fallback local caso a function do banco não responda
        int gap = ThreadLocalRandom.current().nextInt(7, 20); // gap entre 7 e 19
        Long maxId = userRepository.findMaxKurageId();
        if (maxId == null || maxId < 1000) {
            maxId = 1000L;
        }
        return maxId + gap;
    }

    public UserResponse create(CreateUserRequest dto) {
        User user = User.builder()
                .kurageId(generateKurageId())
                .username(dto.username())
                .steamId64(dto.steamId64())
                .build();
        User saved = userRepository.save(user);
        playerStatsService.getOrCreateStats(saved);
        return UserResponse.create(saved);
    }

    public List<UserResponse> getAll() {
        return userRepository.findAll().stream()
                .map(UserResponse::create)
                .toList();
    }

    @Cacheable(value = "userSearch", key = "#query", unless = "#result.isEmpty()")
    public List<UserResponse> searchUsers(String query) {
        if (query == null || query.trim().length() < 2) {
            return List.of();
        }
        String q = query.trim();
        List<User> results = new ArrayList<>();

        // Se a query for puramente numérica, tenta buscar por Kurage ID
        try {
            Long kurageId = Long.parseLong(q);
            userRepository.findByKurageId(kurageId).ifPresent(results::add);
        } catch (NumberFormatException ignored) {}

        List<User> textResults = userRepository.findTop8ByUsernameContainingIgnoreCaseOrSteamId64ContainingIgnoreCase(q, q);
        for (User u : textResults) {
            if (results.stream().noneMatch(existing -> existing.getId().equals(u.getId()))) {
                results.add(u);
            }
        }

        return results.stream()
                .map(UserResponse::create)
                .collect(Collectors.toList());
    }

    public UserResponse buildUserResponse(User target) {
        if (target == null) return null;
        PlayerStatsResponse stats = playerStatsRepository.findById(target.getId())
                .map(PlayerStatsResponse::create)
                .orElse(null);
        Integer faceitLevel = userFaceitRepository.findById(target.getId())
                .map(UserFaceit::getLevel)
                .orElse(null);
        return UserResponse.create(target, stats, faceitLevel, null, null);
    }

    public Optional<UserResponse> getUserBySteamId(String steamId64, User currentUser) {
        String cacheKey = "cache:profile:steam:" + steamId64;

        try {
            String cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                UserResponse res = objectMapper.readValue(cached, UserResponse.class);
                if (currentUser != null && !currentUser.getSteamId64().equals(steamId64)) {
                    userRepository.findBySteamId64(steamId64).ifPresent(target -> profileVisitService.recordVisit(target, currentUser));
                }
                return Optional.of(res);
            }
        } catch (Exception ignored) {}

        Optional<User> userOpt = userRepository.findBySteamId64(steamId64);

        if (userOpt.isPresent()) {
            User target = userOpt.get();
            if (currentUser != null && !currentUser.getId().equals(target.getId())) {
                profileVisitService.recordVisit(target, currentUser);
            }

            UserResponse response = buildUserResponse(target);
            try {
                redisTemplate.opsForValue().set(
                        cacheKey,
                        objectMapper.writeValueAsString(response),
                        Duration.ofMinutes(5)
                );
            } catch (Exception ignored) {}
            return Optional.of(response);
        }

        return Optional.empty();
    }

    public Optional<UserResponse> getUserByKurageId(Long kurageId, User currentUser) {
        String cacheKey = "cache:profile:kurage:" + kurageId;

        try {
            String cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                UserResponse res = objectMapper.readValue(cached, UserResponse.class);
                if (currentUser != null && (currentUser.getKurageId() == null || !currentUser.getKurageId().equals(kurageId))) {
                    userRepository.findByKurageId(kurageId).ifPresent(target -> profileVisitService.recordVisit(target, currentUser));
                }
                return Optional.of(res);
            }
        } catch (Exception ignored) {}

        Optional<User> userOpt = userRepository.findByKurageId(kurageId);

        if (userOpt.isPresent()) {
            User target = userOpt.get();
            if (currentUser != null && !currentUser.getId().equals(target.getId())) {
                profileVisitService.recordVisit(target, currentUser);
            }

            UserResponse response = buildUserResponse(target);
            try {
                redisTemplate.opsForValue().set(
                        cacheKey,
                        objectMapper.writeValueAsString(response),
                        Duration.ofMinutes(5)
                );
            } catch (Exception ignored) {}
            return Optional.of(response);
        }

        return Optional.empty();
    }

    public Optional<UserResponse> getUserByIdentifier(String identifier, User currentUser) {
        if (identifier == null || identifier.isBlank()) {
            return Optional.empty();
        }
        String trimmed = identifier.trim();

        // 1. SteamID64 (17 digits starting with 7656)
        if (trimmed.length() == 17 && trimmed.startsWith("7656") && trimmed.matches("\\d+")) {
            return getUserBySteamId(trimmed, currentUser);
        }

        // 2. Kurage ID (numeric)
        if (trimmed.matches("\\d+")) {
            try {
                Long kurageId = Long.parseLong(trimmed);
                Optional<UserResponse> byKurage = getUserByKurageId(kurageId, currentUser);
                if (byKurage.isPresent()) {
                    return byKurage;
                }
            } catch (NumberFormatException ignored) {}
        }

        // 3. UUID
        try {
            UUID uuid = UUID.fromString(trimmed);
            Optional<User> userOpt = userRepository.findById(uuid);
            if (userOpt.isPresent()) {
                User target = userOpt.get();
                if (currentUser != null && !currentUser.getId().equals(target.getId())) {
                    profileVisitService.recordVisit(target, currentUser);
                }
                return Optional.of(buildUserResponse(target));
            }
        } catch (IllegalArgumentException ignored) {}

        // 4. Username
        Optional<User> userByUsername = userRepository.findByUsernameIgnoreCase(trimmed);
        if (userByUsername.isPresent()) {
            User target = userByUsername.get();
            if (currentUser != null && !currentUser.getId().equals(target.getId())) {
                profileVisitService.recordVisit(target, currentUser);
            }
            return Optional.of(buildUserResponse(target));
        }

        // Fallback: try steamId
        return getUserBySteamId(trimmed, currentUser);
    }

    public Optional<HovercardResponse> getHovercard(Long kurageId) {
        String cacheKey = "cache:hovercard:" + kurageId;

        try {
            String cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                return Optional.of(objectMapper.readValue(cached, HovercardResponse.class));
            }
        } catch (Exception ignored) {}

        Optional<User> userOpt = userRepository.findByKurageId(kurageId);
        if (userOpt.isEmpty()) {
            return Optional.empty();
        }

        User user = userOpt.get();
        Optional<PlayerStats> statsOpt = playerStatsRepository.findById(user.getId());
        Optional<UserFaceit> faceitOpt = userFaceitRepository.findById(user.getId());

        int kurageElo = 200;
        int kurageLevel = 1;
        BigDecimal kdRatio = BigDecimal.ZERO;
        Integer winRate = null;
        Integer matchesPlayed = 0;
        BigDecimal hltvRating = null;

        if (statsOpt.isPresent()) {
            PlayerStats stats = statsOpt.get();
            kurageElo = stats.getKurageElo() != null ? stats.getKurageElo() : 200;
            kurageLevel = stats.getKurageLevel();
            matchesPlayed = stats.getMatchesPlayed() != null ? stats.getMatchesPlayed() : 0;
            int deaths = stats.getDeaths() != null ? stats.getDeaths() : 0;
            int kills = stats.getKills() != null ? stats.getKills() : 0;
            kdRatio = deaths > 0
                    ? BigDecimal.valueOf((double) kills / deaths).setScale(2, RoundingMode.HALF_UP)
                    : (kills > 0 ? BigDecimal.valueOf(kills).setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO);
            int matchesWon = stats.getMatchesWon() != null ? stats.getMatchesWon() : 0;
            winRate = matchesPlayed > 0 ? (int) Math.round(((double) matchesWon / matchesPlayed) * 100) : null;
            if (matchesPlayed > 0) {
                hltvRating = BigDecimal.valueOf(1.00).setScale(2, RoundingMode.HALF_UP);
            }
        } else if (faceitOpt.isPresent()) {
            UserFaceit faceit = faceitOpt.get();
            kdRatio = faceit.getKdRatio() != null ? faceit.getKdRatio() : BigDecimal.ZERO;
            winRate = faceit.getWinRate();
            matchesPlayed = faceit.getMatches() != null ? faceit.getMatches() : 0;
        }

        String teamTag = null;
        String teamName = null;
        List<Team> userTeams = teamRepository.findAllByMemberUserId(user.getId());
        if (!userTeams.isEmpty()) {
            teamTag = userTeams.get(0).getTag();
            teamName = userTeams.get(0).getName();
        }

        HovercardResponse response = new HovercardResponse(
                user.getId(),
                user.getKurageId(),
                user.getUsername(),
                user.getAvatarUrl(),
                user.getCountry(),
                kurageLevel,
                kurageElo,
                user.getPrimaryFunction() != null ? user.getPrimaryFunction().name() : null,
                teamTag,
                teamName,
                kdRatio,
                winRate,
                matchesPlayed,
                hltvRating,
                user.isVerifiedPro(),
                user.getSubscriptionTier() != null ? user.getSubscriptionTier().name() : "FREE"
        );

        try {
            redisTemplate.opsForValue().set(
                    cacheKey,
                    objectMapper.writeValueAsString(response),
                    Duration.ofMinutes(5)
            );
        } catch (Exception ignored) {}

        return Optional.of(response);
    }

    @Transactional
    public User getOrCreateUser(String steamId64, String nickname, String avatarUrl, String clientIp, String cfCountry) {
        Optional<User> existing = userRepository.findBySteamId64(steamId64);
        if (existing.isPresent()) {
            return existing.get();
        }

        String initialCountry = (cfCountry != null && !cfCountry.trim().isEmpty() && !cfCountry.equals("XX"))
                ? cfCountry
                : fetchCountryFromIp(clientIp);

        // Tenta salvar com retry caso ocorra colisão rara de kurageId ou corrida de cadastro
        int maxRetries = 3;
        User savedUser = null;
        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                User newUser = User.builder()
                        .kurageId(generateKurageId())
                        .steamId64(steamId64)
                        .username(nickname != null ? nickname : "Player_" + steamId64.substring(Math.max(0, steamId64.length() - 4)))
                        .avatarUrl(avatarUrl)
                        .country(initialCountry)
                        .role(com.kurage.api.domain.UserRole.USER)
                        .primaryFunction(PlayerFunction.CORINGA)
                        .subscriptionTier(com.kurage.api.domain.SubscriptionTier.FREE)
                        .isVerifiedPro(false)
                        .build();

                savedUser = userRepository.saveAndFlush(newUser);
                break;
            } catch (org.springframework.dao.DataIntegrityViolationException dive) {
                log.warn("Collision or duplicate on user creation (attempt {}/{}): {}", attempt, maxRetries, dive.getMessage());
                // Verifica se outro thread/pod já salvou esse steamId64
                Optional<User> raceUser = userRepository.findBySteamId64(steamId64);
                if (raceUser.isPresent()) {
                    return raceUser.get();
                }
                if (attempt == maxRetries) {
                    throw dive;
                }
            }
        }

        if (savedUser == null) {
            return userRepository.findBySteamId64(steamId64).orElseThrow();
        }

        // Inicializa os status de jogador Kurage com ELO 200 (Level 3)
        playerStatsService.getOrCreateStats(savedUser);

        // Busca inicial da Faceit no cadastro
        try {
            Optional<FaceitResponse> apiOpt = faceitService.getFaceitDataBySteamId(steamId64);
            if (apiOpt.isPresent()) {
                FaceitResponse res = apiOpt.get();
                savedUser.setFaceitUsername(res.username());
                userRepository.save(savedUser);

                UserFaceit uf = UserFaceit.builder()
                        .user(savedUser)
                        .userId(savedUser.getId())
                        .level(res.level())
                        .elo(res.elo())
                        .kdRatio(res.kdRatio() != null ? res.kdRatio() : BigDecimal.ZERO)
                        .winRate(res.winRate())
                        .matches(res.matches())
                        .faceitId(steamId64)
                        .build();
                userFaceitRepository.save(uf);
            } else {
                try {
                    String faceitNotFoundKey = "faceit:notfound:" + steamId64;
                    redisTemplate.opsForValue().set(faceitNotFoundKey, "true", Duration.ofHours(24));
                } catch (Exception ignored) {}
            }
        } catch (Exception e) {
            log.error("Erro na busca inicial da Faceit no cadastro: {}", e.getMessage());
        }

        return savedUser;
    }

    private String fetchCountryFromIp(String ip) {
        if (ip == null || ip.equals("127.0.0.1") || ip.equals("0:0:0:0:0:0:0:1") || ip.startsWith("192.168.") || ip.startsWith("10.")) {
            return "BR";
        }
        try {
            java.net.http.HttpClient client = java.net.http.HttpClient.newHttpClient();
            java.net.http.HttpRequest request = java.net.http.HttpRequest.newBuilder()
                    .uri(java.net.URI.create("http://ip-api.com/json/" + ip + "?fields=countryCode"))
                    .timeout(Duration.ofSeconds(2))
                    .GET()
                    .build();
            java.net.http.HttpResponse<String> response = client.send(request, java.net.http.HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                com.fasterxml.jackson.databind.JsonNode root = objectMapper.readTree(response.body());
                if (root.has("countryCode") && !root.get("countryCode").isNull()) {
                    return root.get("countryCode").asText();
                }
            }
        } catch (Exception e) {
            log.warn("Falha ao buscar país pelo IP {}: {}", ip, e.getMessage());
        }
        return "BR";
    }

    public Optional<User> getBySteamId64(String steamId64) {
        return userRepository.findBySteamId64(steamId64);
    }

    public UserResponse updateUsername(User transientUser, String newUsername) {
        User user = userRepository.findById(transientUser.getId()).orElseThrow();
        user.setUsername(newUsername);
        User savedUser = userRepository.save(user);
        invalidateProfileCache(savedUser);
        return buildUserResponse(savedUser);
    }

    public UserResponse updateAvatar(User transientUser, MultipartFile file) throws IOException {
        User user = userRepository.findById(transientUser.getId()).orElseThrow();
        String avatarUrl = s3Service.uploadAvatar(file, user.getId());
        user.setAvatarUrl(avatarUrl);
        User savedUser = userRepository.save(user);
        invalidateProfileCache(savedUser);
        return buildUserResponse(savedUser);
    }

    public UserResponse updateCountry(User transientUser, String country) {
        User user = userRepository.findById(transientUser.getId()).orElseThrow();
        user.setCountry(country != null ? country.toUpperCase() : null);
        User savedUser = userRepository.save(user);
        invalidateProfileCache(savedUser);
        return buildUserResponse(savedUser);
    }

    public UserResponse syncSteamProfile(User transientUser, String type) {
        User user = userRepository.findById(transientUser.getId()).orElseThrow();
        com.kurage.api.dto.response.SteamProfileResponse.Player steamPlayer = steamAuthService.fetchSteamProfile(user.getSteamId64());
        if (steamPlayer != null) {
            boolean updated = false;
            if (("username".equals(type) || "both".equals(type)) && steamPlayer.personaname() != null) {
                user.setUsername(steamPlayer.personaname());
                updated = true;
            }
            if (("avatar".equals(type) || "both".equals(type)) && steamPlayer.avatarfull() != null) {
                user.setAvatarUrl(steamPlayer.avatarfull());
                updated = true;
            }
            if (updated) {
                User savedUser = userRepository.save(user);
                invalidateProfileCache(savedUser);
                return buildUserResponse(savedUser);
            }
        }
        return buildUserResponse(user);
    }

    public UserResponse syncFaceitProfile(User transientUser) {
        User user = userRepository.findById(transientUser.getId()).orElseThrow();
        if (user.getSteamId64() != null) {
            try {
                faceitService.getFaceitDataBySteamId(user.getSteamId64()).ifPresent(res -> {
                    if (res.username() != null) {
                        user.setFaceitUsername(res.username());
                        userRepository.save(user);
                    }
                    UserFaceit uf = userFaceitRepository.findById(user.getId())
                            .orElseGet(() -> UserFaceit.builder()
                                    .user(user)
                                    .userId(user.getId())
                                    .build());
                    uf.setLevel(res.level());
                    uf.setElo(res.elo());
                    uf.setKdRatio(res.kdRatio() != null ? res.kdRatio() : BigDecimal.ZERO);
                    uf.setWinRate(res.winRate());
                    uf.setMatches(res.matches());
                    if (uf.getFaceitId() == null) {
                        uf.setFaceitId(user.getSteamId64());
                    }
                    userFaceitRepository.save(uf);
                });
            } catch (Exception e) {
                log.warn("Falha ao sincronizar Faceit: {}", e.getMessage());
            }
        }
        invalidateProfileCache(user);
        return buildUserResponse(user);
    }

    public UserResponse updateFunctions(User transientUser, PlayerFunction primary, PlayerFunction secondary) {
        User user = userRepository.findById(transientUser.getId()).orElseThrow();

        if (primary != null) {
            user.setPrimaryFunction(primary);
        }
        user.setSecondaryFunction(secondary);

        User savedUser = userRepository.save(user);
        invalidateProfileCache(savedUser);
        return buildUserResponse(savedUser);
    }

    public void invalidateProfileCache(User user) {
        if (user == null) return;
        try {
            if (user.getSteamId64() != null) {
                redisTemplate.delete("cache:profile:steam:" + user.getSteamId64());
                redisTemplate.delete("cache:userteams:" + user.getSteamId64());
                redisTemplate.delete("cache:userinvites:" + user.getSteamId64());
            }
            if (user.getKurageId() != null) {
                redisTemplate.delete("cache:profile:kurage:" + user.getKurageId());
                redisTemplate.delete("cache:hovercard:" + user.getKurageId());
            }
        } catch (Exception e) {
            log.warn("Redis unavailable during cache invalidation: {}", e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public List<TeamResponse> getUserTeams(User transientUser) {
        String cacheKey = "cache:userteams:" + transientUser.getSteamId64();
        try {
            String cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                return objectMapper.readValue(cached, new TypeReference<List<TeamResponse>>() {});
            }
        } catch (Exception ignored) {}

        List<Team> teams = teamRepository.findAllByMemberUserId(transientUser.getId());
        List<TeamResponse> response = teams.stream()
                .map(TeamResponse::create)
                .collect(Collectors.toList());

        try {
            redisTemplate.opsForValue().set(cacheKey, objectMapper.writeValueAsString(response), Duration.ofMinutes(5));
        } catch (Exception ignored) {}

        return response;
    }

    @Transactional(readOnly = true)
    public List<TeamInvitationResponse> getUserInvites(User transientUser) {
        String cacheKey = "cache:userinvites:" + transientUser.getSteamId64();
        try {
            String cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                return objectMapper.readValue(cached, new TypeReference<List<TeamInvitationResponse>>() {});
            }
        } catch (Exception ignored) {}

        List<TeamInvitation> invites = teamInvitationRepository.findByInvitedUserIdAndStatus(transientUser.getId(), com.kurage.api.domain.InvitationStatus.PENDING);
        List<TeamInvitationResponse> response = invites.stream()
                .map(TeamInvitationResponse::create)
                .collect(Collectors.toList());

        try {
            redisTemplate.opsForValue().set(cacheKey, objectMapper.writeValueAsString(response), Duration.ofMinutes(5));
        } catch (Exception ignored) {}

        return response;
    }
}
