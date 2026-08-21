package com.kurage.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.kurage.api.dto.response.FaceitResponse;
import lombok.RequiredArgsConstructor;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class FaceitService {

    @Value("${faceit.api.key}")
    private String faceitApiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public Optional<FaceitResponse> getFaceitDataBySteamId(String steamId64) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + faceitApiKey);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            // 1. Obter o Player ID, Level e ELO
            String playerUrl = "https://open.faceit.com/data/v4/players?game=cs2&game_player_id=" + steamId64;
            ResponseEntity<String> playerResponse = restTemplate.exchange(playerUrl, HttpMethod.GET, entity, String.class);
            JsonNode playerBody = objectMapper.readTree(playerResponse.getBody());

            if (playerBody == null || !playerBody.has("nickname")) {
                return Optional.empty();
            }

            String faceitUsername = playerBody.get("nickname").asText();
            String playerId = playerBody.get("player_id").asText();
            
            // O faceitUrl vem no formato "{lang}/players/{nickname}" na API oficial as vezes, 
            // mas o faceit_url fornecido é o link direto.
            String faceitUrl = playerBody.has("faceit_url") ? 
                    playerBody.get("faceit_url").asText().replace("{lang}", "en") : null;

            JsonNode cs2Node = playerBody.path("games").path("cs2");
            if (cs2Node.isMissingNode()) {
                // Usuário existe mas nunca jogou CS2 no Faceit
                return Optional.empty();
            }

            int level = cs2Node.path("skill_level").asInt(1);
            int elo = cs2Node.path("faceit_elo").asInt(0);

            // 2. Obter as estatísticas (K/D Ratio)
            String statsUrl = "https://open.faceit.com/data/v4/players/" + playerId + "/stats/cs2";
            ResponseEntity<String> statsResponse = restTemplate.exchange(statsUrl, HttpMethod.GET, entity, String.class);
            JsonNode statsBody = objectMapper.readTree(statsResponse.getBody());

            BigDecimal kdRatio = BigDecimal.ZERO;
            Integer winRate = null;
            Integer matches = null;
            java.util.List<String> recentResults = new java.util.ArrayList<>();
            if (statsBody != null && !statsBody.path("lifetime").isMissingNode()) {
                JsonNode lifetime = statsBody.path("lifetime");
                String kdString = lifetime.path("Average K/D Ratio").asText("0");
                try {
                    kdRatio = new BigDecimal(kdString);
                } catch (Exception ignored) {}

                String winRateStr = lifetime.path("Win Rate %").asText(null);
                if (winRateStr != null) {
                    try { winRate = Integer.parseInt(winRateStr); } catch (Exception ignored) {}
                }

                String matchesStr = lifetime.path("Matches").asText(null);
                if (matchesStr != null) {
                    try { matches = Integer.parseInt(matchesStr); } catch (Exception ignored) {}
                }
                if (!lifetime.path("Recent Results").isMissingNode()) {
                    for (JsonNode resNode : lifetime.path("Recent Results")) {
                        recentResults.add(resNode.asText());
                    }
                }
            }

            return Optional.of(FaceitResponse.fromApi(faceitUsername, level, elo, kdRatio, winRate, matches, faceitUrl, recentResults));

        } catch (HttpClientErrorException.NotFound e) {
            // Usuário não encontrado no Faceit
            return Optional.empty();
        } catch (Exception e) {
            System.err.println("Erro ao buscar Faceit: " + e.getMessage());
            throw new RuntimeException("Erro temporário ao buscar Faceit", e);
        }
    }

    public java.util.List<com.kurage.api.dto.response.FaceitMatchHistoryDTO> getRecentMatchHistory(String steamId64) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + faceitApiKey);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            String playerUrl = "https://open.faceit.com/data/v4/players?game=cs2&game_player_id=" + steamId64;
            ResponseEntity<String> playerResponse = restTemplate.exchange(playerUrl, HttpMethod.GET, entity, String.class);
            JsonNode playerBody = objectMapper.readTree(playerResponse.getBody());

            if (playerBody == null || !playerBody.has("player_id")) {
                return java.util.List.of();
            }
            String playerId = playerBody.get("player_id").asText();

            String historyUrl = "https://open.faceit.com/data/v4/players/" + playerId + "/history?game=cs2&offset=0&limit=5";
            ResponseEntity<String> historyResponse = restTemplate.exchange(historyUrl, HttpMethod.GET, entity, String.class);
            JsonNode historyBody = objectMapper.readTree(historyResponse.getBody());
            
            if (historyBody == null || !historyBody.has("items")) {
                return java.util.List.of();
            }

            java.util.List<com.kurage.api.dto.response.FaceitMatchHistoryDTO> history = new java.util.ArrayList<>();
            for (JsonNode item : historyBody.get("items")) {
                long finishedAt = item.path("finished_at").asLong(0);
                // Simplify result since Faceit returns "faction1" or "faction2" as winner
                // To properly calculate win/loss we need to know which faction the player was on.
                // For a simple tip, we can just grab the time of the matches.
                history.add(new com.kurage.api.dto.response.FaceitMatchHistoryDTO(finishedAt, "Unknown"));
            }
            return history;
        } catch (Exception e) {
            return java.util.List.of();
        }
    }
}
