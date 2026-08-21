package com.kurage.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kurage.api.domain.GameMode;
import com.kurage.api.domain.GameServer;
import com.kurage.api.dto.request.GameServerHeartbeatRequest;
import com.kurage.api.dto.response.GameServerResponse;
import com.kurage.api.repository.GameServerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GameServerServiceTest {

    @Mock
    private GameServerRepository gameServerRepository;

    @Mock
    private com.kurage.api.repository.UserRepository userRepository;

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    private GameServerService gameServerService;
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @BeforeEach
    void setUp() {
        gameServerService = new GameServerService(gameServerRepository, userRepository, redisTemplate);
    }

    @Nested
    @DisplayName("getAllServers")
    class GetAllServersTests {

        @Test
        @DisplayName("Deve buscar do banco quando cache estiver vazio")
        void shouldFetchFromDbWhenCacheEmpty() {
            when(redisTemplate.opsForValue()).thenReturn(valueOperations);
            when(valueOperations.get("cache:servers:all")).thenReturn(null);

            GameServer server = GameServer.builder()
                    .id(UUID.randomUUID())
                    .name("Kurage Retakes #1")
                    .hostname("br-retakes.kurage.gg")
                    .port(27015)
                    .gameMode(GameMode.RETAKE)
                    .currentMap("de_mirage")
                    .currentPlayers(6)
                    .maxPlayers(10)
                    .isOnline(true)
                    .lastHeartbeat(Instant.now())
                    .build();

            when(gameServerRepository.findAllByOrderByIsOnlineDescCurrentPlayersDescNameAsc())
                    .thenReturn(List.of(server));

            List<GameServerResponse> result = gameServerService.getAllServers();

            assertThat(result).hasSize(1);
            assertThat(result.get(0).name()).isEqualTo("Kurage Retakes #1");
            verify(gameServerRepository).findAllByOrderByIsOnlineDescCurrentPlayersDescNameAsc();
            verify(valueOperations).set(eq("cache:servers:all"), any(String.class), any(java.time.Duration.class));
        }

        @Test
        @DisplayName("Deve retornar do cache quando existir")
        void shouldReturnFromCacheWhenPresent() throws Exception {
            GameServerResponse cached = new GameServerResponse(
                    UUID.randomUUID(), "Kurage DM #1", "br-dm.kurage.gg", 27016,
                    "DEATHMATCH", "de_dust2", 12, 20, true, Instant.now()
            );
            String json = objectMapper.writeValueAsString(List.of(cached));

            when(redisTemplate.opsForValue()).thenReturn(valueOperations);
            when(valueOperations.get("cache:servers:all")).thenReturn(json);

            List<GameServerResponse> result = gameServerService.getAllServers();

            assertThat(result).hasSize(1);
            assertThat(result.get(0).name()).isEqualTo("Kurage DM #1");
            verifyNoInteractions(gameServerRepository);
        }

        @Test
        @DisplayName("Deve aplicar Fail-Open quando Redis falhar")
        void shouldFailOpenWhenRedisThrows() {
            when(redisTemplate.opsForValue()).thenThrow(new RuntimeException("Redis down"));

            GameServer server = GameServer.builder()
                    .id(UUID.randomUUID())
                    .name("Kurage Scrim #1")
                    .hostname("br-scrim.kurage.gg")
                    .port(27017)
                    .gameMode(GameMode.COMPETITIVE_5V5)
                    .currentMap("de_inferno")
                    .currentPlayers(10)
                    .maxPlayers(10)
                    .isOnline(true)
                    .build();

            when(gameServerRepository.findAllByOrderByIsOnlineDescCurrentPlayersDescNameAsc())
                    .thenReturn(List.of(server));

            List<GameServerResponse> result = gameServerService.getAllServers();

            assertThat(result).hasSize(1);
            assertThat(result.get(0).name()).isEqualTo("Kurage Scrim #1");
            verify(gameServerRepository).findAllByOrderByIsOnlineDescCurrentPlayersDescNameAsc();
        }
    }

    @Nested
    @DisplayName("getByMode")
    class GetByModeTests {

        @Test
        @DisplayName("Deve buscar servidores filtrados por GameMode")
        void shouldFetchServersByGameMode() {
            when(redisTemplate.opsForValue()).thenReturn(valueOperations);
            when(valueOperations.get("cache:servers:mode:RETAKE")).thenReturn(null);

            GameServer server = GameServer.builder()
                    .id(UUID.randomUUID())
                    .name("Kurage Retakes #1")
                    .hostname("br-retakes.kurage.gg")
                    .port(27015)
                    .gameMode(GameMode.RETAKE)
                    .currentMap("de_mirage")
                    .currentPlayers(5)
                    .maxPlayers(10)
                    .isOnline(true)
                    .build();

            when(gameServerRepository.findByGameModeOrderByIsOnlineDescCurrentPlayersDescNameAsc(GameMode.RETAKE))
                    .thenReturn(List.of(server));

            List<GameServerResponse> result = gameServerService.getByMode(GameMode.RETAKE);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).gameMode()).isEqualTo("RETAKE");
            verify(gameServerRepository).findByGameModeOrderByIsOnlineDescCurrentPlayersDescNameAsc(GameMode.RETAKE);
        }

        @Test
        @DisplayName("Deve retornar todos os servidores se modo for nulo")
        void shouldReturnAllWhenModeIsNull() {
            when(redisTemplate.opsForValue()).thenReturn(valueOperations);
            when(valueOperations.get("cache:servers:all")).thenReturn(null);
            when(gameServerRepository.findAllByOrderByIsOnlineDescCurrentPlayersDescNameAsc()).thenReturn(List.of());

            List<GameServerResponse> result = gameServerService.getByMode(null);

            assertThat(result).isEmpty();
            verify(gameServerRepository).findAllByOrderByIsOnlineDescCurrentPlayersDescNameAsc();
        }
    }

    @Nested
    @DisplayName("getById")
    class GetByIdTests {

        @Test
        @DisplayName("Deve retornar detalhes do servidor por ID")
        void shouldReturnServerById() {
            UUID id = UUID.randomUUID();
            when(redisTemplate.opsForValue()).thenReturn(valueOperations);
            when(valueOperations.get("cache:servers:id:" + id)).thenReturn(null);

            GameServer server = GameServer.builder()
                    .id(id)
                    .name("Kurage Retakes #1")
                    .hostname("br-retakes.kurage.gg")
                    .port(27015)
                    .gameMode(GameMode.RETAKE)
                    .currentMap("de_anubis")
                    .currentPlayers(8)
                    .maxPlayers(10)
                    .isOnline(true)
                    .build();

            when(gameServerRepository.findById(id)).thenReturn(Optional.of(server));

            GameServerResponse result = gameServerService.getById(id);

            assertThat(result).isNotNull();
            assertThat(result.id()).isEqualTo(id);
            assertThat(result.currentMap()).isEqualTo("de_anubis");
        }

        @Test
        @DisplayName("Deve lançar 404 quando servidor não for encontrado")
        void shouldThrow404WhenNotFound() {
            UUID id = UUID.randomUUID();
            when(redisTemplate.opsForValue()).thenReturn(valueOperations);
            when(valueOperations.get("cache:servers:id:" + id)).thenReturn(null);
            when(gameServerRepository.findById(id)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> gameServerService.getById(id))
                    .isInstanceOf(ResponseStatusException.class)
                    .hasMessageContaining("404 NOT_FOUND");
        }

        @Test
        @DisplayName("Deve lançar 400 se ID for nulo")
        void shouldThrow400WhenIdIsNull() {
            assertThatThrownBy(() -> gameServerService.getById(null))
                    .isInstanceOf(ResponseStatusException.class)
                    .hasMessageContaining("400 BAD_REQUEST");
        }
    }

    @Nested
    @DisplayName("processHeartbeat")
    class ProcessHeartbeatTests {

        @Test
        @DisplayName("Deve atualizar status e métricas do servidor com sucesso e invalidar cache")
        void shouldUpdateServerOnHeartbeat() {
            UUID id = UUID.randomUUID();
            GameServer existing = GameServer.builder()
                    .id(id)
                    .name("Kurage Retakes #1")
                    .hostname("br-retakes.kurage.gg")
                    .port(27015)
                    .gameMode(GameMode.RETAKE)
                    .currentMap("de_mirage")
                    .currentPlayers(2)
                    .maxPlayers(10)
                    .isOnline(false)
                    .build();

            when(gameServerRepository.findById(id)).thenReturn(Optional.of(existing));
            when(gameServerRepository.save(any(GameServer.class))).thenAnswer(inv -> inv.getArgument(0));

            GameServerHeartbeatRequest request = GameServerHeartbeatRequest.builder()
                    .currentMap("de_nuke")
                    .currentPlayers(9)
                    .maxPlayers(12)
                    .build();

            GameServerResponse result = gameServerService.processHeartbeat(id, request);

            assertThat(result.isOnline()).isTrue();
            assertThat(result.currentMap()).isEqualTo("de_nuke");
            assertThat(result.currentPlayers()).isEqualTo(9);
            assertThat(result.maxPlayers()).isEqualTo(12);
            assertThat(result.lastHeartbeat()).isNotNull();

            verify(redisTemplate).delete("cache:servers:all");
            verify(redisTemplate).delete("cache:servers:id:" + id);
            verify(redisTemplate).delete("cache:servers:mode:RETAKE");
        }

        @Test
        @DisplayName("Deve lançar 404 ao receber heartbeat de servidor inexistente")
        void shouldThrow404WhenServerNotFoundOnHeartbeat() {
            UUID id = UUID.randomUUID();
            when(gameServerRepository.findById(id)).thenReturn(Optional.empty());

            GameServerHeartbeatRequest request = GameServerHeartbeatRequest.builder()
                    .currentMap("de_nuke")
                    .currentPlayers(9)
                    .build();

            assertThatThrownBy(() -> gameServerService.processHeartbeat(id, request))
                    .isInstanceOf(ResponseStatusException.class)
                    .hasMessageContaining("404 NOT_FOUND");
        }
    }

    @Nested
    @DisplayName("markOfflineServers")
    class MarkOfflineServersTests {

        @Test
        @DisplayName("Deve marcar servidores offline e invalidar cache quando houver servidores inativos")
        void shouldMarkOfflineAndEvictCaches() {
            when(gameServerRepository.markServersOfflineOlderThan(any(Instant.class))).thenReturn(2);

            gameServerService.markOfflineServers();

            verify(gameServerRepository).markServersOfflineOlderThan(any(Instant.class));
            verify(redisTemplate).delete("cache:servers:all");
        }

        @Test
        @DisplayName("Não deve invalidar cache se nenhum servidor foi marcado offline")
        void shouldNotEvictWhenNoServersMarkedOffline() {
            when(gameServerRepository.markServersOfflineOlderThan(any(Instant.class))).thenReturn(0);

            gameServerService.markOfflineServers();

            verify(gameServerRepository).markServersOfflineOlderThan(any(Instant.class));
            verifyNoInteractions(redisTemplate);
        }
    }
}
