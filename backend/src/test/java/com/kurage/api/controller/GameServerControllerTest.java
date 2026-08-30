package com.kurage.api.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kurage.api.domain.GameMode;
import com.kurage.api.dto.request.GameServerHeartbeatRequest;
import com.kurage.api.dto.response.GameServerResponse;
import com.kurage.api.exception.GlobalExceptionHandler;
import com.kurage.api.service.GameServerService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class GameServerControllerTest {

    @Mock
    private GameServerService gameServerService;

    @InjectMocks
    private GameServerController gameServerController;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private static final String VALID_API_KEY = "test-secret-server-key-123";

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(gameServerController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Nested
    @DisplayName("GET /servers")
    class GetServersTests {

        @Test
        @DisplayName("Deve retornar todos os servidores quando sem filtro de modo")
        void shouldReturnAllServers() throws Exception {
            UUID id = UUID.randomUUID();
            GameServerResponse server = new GameServerResponse(
                    id, "Kurage Retakes #1", "br-retakes.kurage.gg", 27015,
                    "RETAKE", "de_mirage", 7, 10, true, Instant.now()
            );

            when(gameServerService.getAllServers()).thenReturn(List.of(server));

            mockMvc.perform(get("/servers"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].name").value("Kurage Retakes #1"))
                    .andExpect(jsonPath("$[0].hostname").value("br-retakes.kurage.gg"))
                    .andExpect(jsonPath("$[0].port").value(27015))
                    .andExpect(jsonPath("$[0].currentPlayers").value(7));
        }

        @Test
        @DisplayName("Deve filtrar servidores por modo de jogo")
        void shouldFilterServersByMode() throws Exception {
            UUID id = UUID.randomUUID();
            GameServerResponse server = new GameServerResponse(
                    id, "Kurage DM #1", "br-dm.kurage.gg", 27016,
                    "DEATHMATCH", "de_dust2", 15, 20, true, Instant.now()
            );

            when(gameServerService.getByMode(GameMode.DEATHMATCH)).thenReturn(List.of(server));

            mockMvc.perform(get("/servers").param("mode", "DEATHMATCH"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].name").value("Kurage DM #1"))
                    .andExpect(jsonPath("$[0].gameMode").value("DEATHMATCH"));
        }
    }

    @Nested
    @DisplayName("GET /servers/{id}")
    class GetServerByIdTests {

        @Test
        @DisplayName("Deve retornar os detalhes do servidor por ID")
        void shouldReturnServerById() throws Exception {
            UUID id = UUID.randomUUID();
            GameServerResponse server = new GameServerResponse(
                    id, "Kurage 5v5 #1", "br-scrim.kurage.gg", 27017,
                    "COMPETITIVE_5V5", "de_inferno", 10, 10, true, Instant.now()
            );

            when(gameServerService.getById(id)).thenReturn(server);

            mockMvc.perform(get("/servers/{id}", id))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(id.toString()))
                    .andExpect(jsonPath("$.name").value("Kurage 5v5 #1"))
                    .andExpect(jsonPath("$.currentMap").value("de_inferno"));
        }

        @Test
        @DisplayName("Deve retornar 404 quando o servidor não for encontrado")
        void shouldReturn404WhenNotFound() throws Exception {
            UUID id = UUID.randomUUID();
            when(gameServerService.getById(id))
                    .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Servidor de jogo não encontrado"));

            mockMvc.perform(get("/servers/{id}", id))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.message").value("Servidor de jogo não encontrado"));
        }
    }

    @Nested
    @DisplayName("POST /servers/{id}/heartbeat")
    class HeartbeatTests {

        @Test
        @DisplayName("Deve aceitar heartbeat com chave de API válida")
        void shouldAcceptHeartbeatWithValidApiKey() throws Exception {
            UUID id = UUID.randomUUID();
            GameServerHeartbeatRequest request = GameServerHeartbeatRequest.builder()
                    .currentMap("de_anubis")
                    .currentPlayers(8)
                    .maxPlayers(10)
                    .build();

            GameServerResponse response = new GameServerResponse(
                    id, "Kurage Retakes #1", "br-retakes.kurage.gg", 27015,
                    "RETAKE", "de_anubis", 8, 10, true, Instant.now()
            );

            when(gameServerService.processAuthenticatedHeartbeat(
                    eq(id), eq(VALID_API_KEY), any(GameServerHeartbeatRequest.class)))
                    .thenReturn(response);

            mockMvc.perform(post("/servers/{id}/heartbeat", id)
                            .header("X-Server-Api-Key", VALID_API_KEY)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.currentMap").value("de_anubis"))
                    .andExpect(jsonPath("$.currentPlayers").value(8))
                    .andExpect(jsonPath("$.isOnline").value(true));
        }

        @Test
        @DisplayName("Deve rejeitar heartbeat com 401 quando chave de API for inválida")
        void shouldRejectHeartbeatWithInvalidApiKey() throws Exception {
            UUID id = UUID.randomUUID();
            GameServerHeartbeatRequest request = GameServerHeartbeatRequest.builder()
                    .currentMap("de_anubis")
                    .currentPlayers(8)
                    .build();

            when(gameServerService.processAuthenticatedHeartbeat(
                    eq(id), eq("wrong-key"), any(GameServerHeartbeatRequest.class)))
                    .thenThrow(new ResponseStatusException(
                            HttpStatus.UNAUTHORIZED,
                            "Chave de API do servidor inválida ou não autorizada"));

            mockMvc.perform(post("/servers/{id}/heartbeat", id)
                            .header("X-Server-Api-Key", "wrong-key")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.message").value("Chave de API do servidor inválida ou não autorizada"));
        }

        @Test
        @DisplayName("Deve rejeitar heartbeat com 401 quando chave de API estiver ausente")
        void shouldRejectHeartbeatWhenApiKeyMissing() throws Exception {
            UUID id = UUID.randomUUID();
            GameServerHeartbeatRequest request = GameServerHeartbeatRequest.builder()
                    .currentMap("de_anubis")
                    .currentPlayers(8)
                    .build();

            when(gameServerService.processAuthenticatedHeartbeat(
                    eq(id), eq(null), any(GameServerHeartbeatRequest.class)))
                    .thenThrow(new ResponseStatusException(
                            HttpStatus.UNAUTHORIZED,
                            "Chave de API do servidor inválida ou não autorizada"));

            mockMvc.perform(post("/servers/{id}/heartbeat", id)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("Deve falhar fechado quando a credencial do servidor não estiver provisionada")
        void shouldFailClosedWhenServerApiKeyIsMissing() throws Exception {
            UUID id = UUID.randomUUID();
            GameServerHeartbeatRequest request = GameServerHeartbeatRequest.builder()
                    .currentMap("de_anubis")
                    .currentPlayers(8)
                    .build();

            when(gameServerService.processAuthenticatedHeartbeat(
                    eq(id), eq(VALID_API_KEY), any(GameServerHeartbeatRequest.class)))
                    .thenThrow(new ResponseStatusException(
                            HttpStatus.SERVICE_UNAVAILABLE,
                            "Integração com este servidor de jogo indisponível"));

            mockMvc.perform(post("/servers/{id}/heartbeat", id)
                            .header("X-Server-Api-Key", VALID_API_KEY)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isServiceUnavailable())
                    .andExpect(jsonPath("$.message").value("Integração com este servidor de jogo indisponível"));
        }

        @Test
        @DisplayName("Deve rejeitar heartbeat com 400 quando payload for inválido")
        void shouldRejectHeartbeatWithInvalidPayload() throws Exception {
            UUID id = UUID.randomUUID();
            // currentMap vazio e currentPlayers null
            GameServerHeartbeatRequest request = GameServerHeartbeatRequest.builder()
                    .currentMap("")
                    .currentPlayers(null)
                    .build();

            mockMvc.perform(post("/servers/{id}/heartbeat", id)
                            .header("X-Server-Api-Key", VALID_API_KEY)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }
    }
}
