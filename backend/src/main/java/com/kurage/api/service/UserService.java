package com.kurage.api.service;

import com.kurage.api.config.TransactionHooks;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kurage.api.domain.PlayerFunction;
import com.kurage.api.domain.PlayerStats;
import com.kurage.api.domain.Team;
import com.kurage.api.domain.TeamInvitation;
import com.kurage.api.domain.User;
import com.kurage.api.domain.UserFaceit;
import com.kurage.api.dto.request.AvatarCropRequest;
import com.kurage.api.dto.request.CreateUserRequest;
import com.kurage.api.dto.response.FaceitResponse;
import com.kurage.api.dto.response.HovercardResponse;
import com.kurage.api.dto.response.PlayerStatsResponse;
import com.kurage.api.dto.response.TeamInvitationResponse;
import com.kurage.api.dto.response.TeamResponse;
import com.kurage.api.dto.response.UserContactResponse;
import com.kurage.api.dto.response.UserResponse;
import com.kurage.api.dto.response.SteamAvatarSourceResponse;
import com.kurage.api.repository.PlayerStatsRepository;
import com.kurage.api.repository.RankingSnapshotRepository;
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
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private static final Pattern E164_PHONE_PATTERN = Pattern.compile("^\\+[1-9]\\d{7,14}$");
    private static final long MAX_STEAM_AVATAR_BYTES = 5L * 1024 * 1024;
    private static final int CROPPED_AVATAR_SIZE = 512;

    private final UserRepository userRepository;
    private final UserFaceitRepository userFaceitRepository;
    private final PlayerStatsRepository playerStatsRepository;
    private final RankingSnapshotRepository rankingSnapshotRepository;
    private final TeamRepository teamRepository;
    private final TeamInvitationRepository teamInvitationRepository;
    private final FaceitService faceitService;
    private final S3Service s3Service;
    private final SteamAuthService steamAuthService;
    private final PlayerStatsService playerStatsService;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient avatarHttpClient = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.NEVER)
            .build();

    public Long generateKurageId() {
        try {
            Long nextId = userRepository.generateNextKurageId();
            if (nextId != null) {
                return nextId;
            }
        } catch (Exception e) {
            throw new IllegalStateException("Could not generate a Kurage ID from PostgreSQL", e);
        }
        throw new IllegalStateException("PostgreSQL returned no Kurage ID");
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
        Optional<PlayerStats> playerStats = playerStatsRepository.findById(target.getId());
        PlayerStatsResponse stats = playerStats.map(PlayerStatsResponse::create).orElse(null);
        Integer rankPosition = null;
        Integer rankDelta = null;
        if (playerStats.isPresent() && playerStats.get().isCalibrated()) {
            PlayerStats persistedStats = playerStats.get();
            rankPosition = playerStatsRepository.findLeaderboardPosition(persistedStats.getKurageElo());
            int currentPosition = rankPosition;
            rankDelta = rankingSnapshotRepository
                    .findByUserIdAndSnapshotDate(target.getId(), LocalDate.now().minusDays(1))
                    .map(snapshot -> snapshot.getPosition() - currentPosition)
                    .orElse(null);
        }
        Integer faceitLevel = userFaceitRepository.findById(target.getId())
                .map(UserFaceit::getLevel)
                .orElse(null);
        return UserResponse.create(target, stats, faceitLevel, rankPosition, rankDelta);
    }

    public Optional<UserResponse> getUserBySteamId(String steamId64) {
        String cacheKey = "cache:profile:steam:" + steamId64;

        try {
            String cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                return Optional.of(objectMapper.readValue(cached, UserResponse.class));
            }
        } catch (Exception ignored) {}

        Optional<User> userOpt = userRepository.findBySteamId64(steamId64);

        if (userOpt.isPresent()) {
            User target = userOpt.get();
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

    public Optional<UserResponse> getUserByKurageId(Long kurageId) {
        String cacheKey = "cache:profile:kurage:" + kurageId;

        try {
            String cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                return Optional.of(objectMapper.readValue(cached, UserResponse.class));
            }
        } catch (Exception ignored) {}

        Optional<User> userOpt = userRepository.findByKurageId(kurageId);

        if (userOpt.isPresent()) {
            User target = userOpt.get();
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

    public Optional<UserResponse> getUserByIdentifier(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            return Optional.empty();
        }
        String trimmed = identifier.trim();

        // 1. SteamID64 (17 digits starting with 7656)
        if (trimmed.length() == 17 && trimmed.startsWith("7656") && trimmed.matches("\\d+")) {
            return getUserBySteamId(trimmed);
        }

        // 2. Kurage ID (numeric)
        if (trimmed.matches("\\d+")) {
            try {
                Long kurageId = Long.parseLong(trimmed);
                Optional<UserResponse> byKurage = getUserByKurageId(kurageId);
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
                return Optional.of(buildUserResponse(userOpt.get()));
            }
        } catch (IllegalArgumentException ignored) {}

        // 4. Username
        Optional<User> userByUsername = userRepository.findByUsernameIgnoreCase(trimmed);
        if (userByUsername.isPresent()) {
            return Optional.of(buildUserResponse(userByUsername.get()));
        }

        return getUserBySteamId(trimmed);
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
        Integer kurageElo = null;
        Integer kurageLevel = null;
        BigDecimal kdRatio = null;
        Integer winRate = null;
        Integer matchesPlayed = null;
        BigDecimal hltvRating = null;

        if (statsOpt.isPresent()) {
            PlayerStats stats = statsOpt.get();
            matchesPlayed = stats.getMatchesPlayed() != null ? stats.getMatchesPlayed() : 0;
            if (stats.isCalibrated()) {
                kurageElo = stats.getKurageElo();
                kurageLevel = stats.getKurageLevel();
            }
            int deaths = stats.getDeaths() != null ? stats.getDeaths() : 0;
            int kills = stats.getKills() != null ? stats.getKills() : 0;
            if (matchesPlayed > 0) {
                kdRatio = deaths > 0
                        ? BigDecimal.valueOf((double) kills / deaths).setScale(2, RoundingMode.HALF_UP)
                        : BigDecimal.valueOf(kills).setScale(2, RoundingMode.HALF_UP);
            }
            int matchesWon = stats.getMatchesWon() != null ? stats.getMatchesWon() : 0;
            winRate = matchesPlayed > 0 ? (int) Math.round(((double) matchesWon / matchesPlayed) * 100) : null;
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
                user.getEffectiveSubscriptionTier().name()
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

    @Transactional(readOnly = true)
    public Optional<HovercardResponse> getHovercardByUsername(String username) {
        if (username == null || username.isBlank()) {
            return Optional.empty();
        }

        return userRepository.findByUsernameIgnoreCase(username.trim())
                .flatMap(user -> getHovercard(user.getKurageId()));
    }

    @Transactional
    public User getOrCreateUser(String steamId64, String nickname, String avatarUrl, String cfCountry) {
        Optional<User> existing = userRepository.findBySteamId64(steamId64);
        if (existing.isPresent()) {
            return existing.get();
        }

        String initialCountry = normalizeEdgeCountry(cfCountry);

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

    static String normalizeEdgeCountry(String country) {
        if (country == null) return null;
        String normalized = country.trim().toUpperCase(Locale.ROOT);
        return normalized.matches("[A-Z]{2}") && !"XX".equals(normalized) ? normalized : null;
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

    public UserResponse updateAvatar(User transientUser, MultipartFile file) {
        User user = userRepository.findById(transientUser.getId()).orElseThrow();
        String previousAvatarUrl = user.getAvatarUrl();
        String avatarUrl = s3Service.uploadAvatar(file, user.getId());
        User savedUser;
        try {
            user.setAvatarUrl(avatarUrl);
            savedUser = userRepository.save(user);
        } catch (RuntimeException exception) {
            s3Service.deleteImageIfOwned(avatarUrl);
            throw exception;
        }
        TransactionHooks.afterCommit(() -> s3Service.deleteImageIfOwned(previousAvatarUrl));
        invalidateProfileCache(savedUser);
        return buildUserResponse(savedUser);
    }

    public SteamAvatarSourceResponse getSteamAvatarSource(User transientUser) {
        User user = userRepository.findById(transientUser.getId()).orElseThrow();
        String avatarUrl = getVerifiedSteamAvatarUrl(user);
        return new SteamAvatarSourceResponse(avatarUrl);
    }

    public UserResponse updateAvatarFromSteam(User transientUser, AvatarCropRequest crop) {
        User user = userRepository.findById(transientUser.getId()).orElseThrow();
        String avatarUrl = getVerifiedSteamAvatarUrl(user);

        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(avatarUrl))
                    .timeout(Duration.ofSeconds(8))
                    .GET()
                    .build();
            HttpResponse<byte[]> response = avatarHttpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() != 200) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "A Steam não disponibilizou a imagem do avatar.");
            }
            if (response.body().length > MAX_STEAM_AVATAR_BYTES) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "A imagem recebida da Steam é grande demais.");
            }

            BufferedImage source = ImageIO.read(new ByteArrayInputStream(response.body()));
            if (source == null || source.getWidth() < 1 || source.getHeight() < 1) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "A Steam retornou uma imagem de avatar inválida.");
            }

            BufferedImage cropped = cropAvatar(source, crop);
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            if (!ImageIO.write(cropped, "png", output)) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Não foi possível preparar a imagem do avatar.");
            }

            String previousAvatarUrl = user.getAvatarUrl();
            String uploadedAvatarUrl = s3Service.uploadAvatar(output.toByteArray(), user.getId());
            User savedUser;
            try {
                user.setAvatarUrl(uploadedAvatarUrl);
                savedUser = userRepository.save(user);
            } catch (RuntimeException exception) {
                s3Service.deleteImageIfOwned(uploadedAvatarUrl);
                throw exception;
            }
            TransactionHooks.afterCommit(() -> s3Service.deleteImageIfOwned(previousAvatarUrl));
            invalidateProfileCache(savedUser);
            return buildUserResponse(savedUser);
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "A busca do avatar da Steam foi interrompida.", exception);
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Não foi possível processar o avatar fornecido pela Steam.", exception);
        }
    }

    private String getVerifiedSteamAvatarUrl(User user) {
        com.kurage.api.dto.response.SteamProfileResponse.Player steamPlayer = steamAuthService.fetchSteamProfile(user.getSteamId64());
        String avatarUrl = steamPlayer != null ? steamPlayer.avatarfull() : null;
        if (avatarUrl == null || avatarUrl.isBlank() || !isSteamStaticUrl(avatarUrl)) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Não foi possível obter um avatar válido da Steam.");
        }
        return avatarUrl;
    }

    private boolean isSteamStaticUrl(String value) {
        try {
            URI uri = URI.create(value);
            String host = uri.getHost();
            return "https".equalsIgnoreCase(uri.getScheme())
                    && host != null
                    && (host.equals("steamstatic.com") || host.endsWith(".steamstatic.com"));
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private BufferedImage cropAvatar(BufferedImage source, AvatarCropRequest crop) {
        int shortestSide = Math.min(source.getWidth(), source.getHeight());
        int cropSize = Math.max(1, (int) Math.round(shortestSide / crop.zoom()));
        int maxLeft = source.getWidth() - cropSize;
        int maxTop = source.getHeight() - cropSize;
        int left = (int) Math.round(maxLeft / 2.0 - crop.positionX() * maxLeft / 2.0);
        int top = (int) Math.round(maxTop / 2.0 - crop.positionY() * maxTop / 2.0);

        BufferedImage cropped = new BufferedImage(CROPPED_AVATAR_SIZE, CROPPED_AVATAR_SIZE, BufferedImage.TYPE_INT_ARGB);
        var graphics = cropped.createGraphics();
        try {
            graphics.drawImage(source, 0, 0, CROPPED_AVATAR_SIZE, CROPPED_AVATAR_SIZE, left, top, left + cropSize, top + cropSize, null);
        } finally {
            graphics.dispose();
        }
        return cropped;
    }

    public UserResponse updateCountry(User transientUser, String country) {
        User user = userRepository.findById(transientUser.getId()).orElseThrow();
        user.setCountry(country != null ? country.toUpperCase() : null);
        User savedUser = userRepository.save(user);
        invalidateProfileCache(savedUser);
        return buildUserResponse(savedUser);
    }

    @Transactional
    public UserContactResponse getContact(User transientUser) {
        User user = userRepository.findById(transientUser.getId()).orElseThrow();
        return UserContactResponse.from(user);
    }

    @Transactional
    public UserContactResponse updateContact(User transientUser, String email, String phoneNumber) {
        User user = userRepository.findById(transientUser.getId()).orElseThrow();
        user.setEmail(normalizeEmail(email));
        user.setPhoneE164(normalizePhoneNumber(phoneNumber));
        User savedUser = userRepository.save(user);
        return UserContactResponse.from(savedUser);
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
        String steamId64 = user.getSteamId64();
        Long kurageId = user.getKurageId();
        TransactionHooks.afterCommit(() -> {
            try {
                if (steamId64 != null) {
                    redisTemplate.delete("cache:profile:steam:" + steamId64);
                    redisTemplate.delete("cache:userteams:" + steamId64);
                    redisTemplate.delete("cache:userinvites:" + steamId64);
                }
                if (kurageId != null) {
                    redisTemplate.delete("cache:profile:kurage:" + kurageId);
                    redisTemplate.delete("cache:hovercard:" + kurageId);
                }
            } catch (Exception e) {
                log.warn("Redis unavailable during cache invalidation: {}", e.getMessage());
            }
        });
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            return null;
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizePhoneNumber(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.isBlank()) {
            return null;
        }

        String normalized = phoneNumber.trim().replaceAll("[\\s().-]", "");
        if (!E164_PHONE_PATTERN.matcher(normalized).matches()) {
            throw new IllegalArgumentException(
                    "Informe o telefone com código do país no formato internacional, por exemplo +5585999999999.");
        }
        return normalized;
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
