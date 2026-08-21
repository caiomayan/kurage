package com.kurage.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kurage.api.dto.response.SteamProfileResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class SteamAuthService {

    private static final Logger log = LoggerFactory.getLogger(SteamAuthService.class);
    private static final String STEAM_OPENID_URL = "https://steamcommunity.com/openid/login";
    private static final String STEAM_API_URL = "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/";
    private static final Pattern STEAM_ID_PATTERN = Pattern.compile("https?://steamcommunity\\.com/openid/id/(\\d+)");

    @Value("${backend.url:http://localhost:8080}")
    private String backendUrl;

    @Value("${steam.api.key:}")
    private String steamApiKey;

    private final HttpClient httpClient = HttpClient.newBuilder().build();
    private final ObjectMapper objectMapper = new ObjectMapper();




    public String buildSteamLoginUrl(String returnUrl) {
        String callbackUrl = backendUrl + "/auth/steam/callback?returnUrl=" + encode(returnUrl);
        String params = "openid.ns=" + encode("http://specs.openid.net/auth/2.0")
                + "&openid.mode=checkid_setup"
                + "&openid.return_to=" + encode(callbackUrl)
                + "&openid.realm=" + encode(backendUrl)
                + "&openid.identity=" + encode("http://specs.openid.net/auth/2.0/identifier_select")
                + "&openid.claimed_id=" + encode("http://specs.openid.net/auth/2.0/identifier_select");
        return STEAM_OPENID_URL + "?" + params;
    }

    public String validateSteamLogin(Map<String, String[]> requestParams) throws Exception {
        Map<String, String> params = requestParams.entrySet().stream()
                .collect(Collectors.toMap(Map.Entry::getKey, e -> e.getValue()[0]));

        params.put("openid.mode", "check_authentication");

        String body = params.entrySet().stream()
                .map(e -> URLEncoder.encode(e.getKey(), StandardCharsets.UTF_8) + "=" + URLEncoder.encode(e.getValue(), StandardCharsets.UTF_8))
                .collect(Collectors.joining("&"));

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(STEAM_OPENID_URL))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.body() != null && response.body().contains("is_valid:true")) {
            String claimedId = params.get("openid.claimed_id");
            Matcher matcher = STEAM_ID_PATTERN.matcher(claimedId != null ? claimedId : "");
            if (matcher.find()) {
                return matcher.group(1);
            }
        } else {
            log.error("Steam OpenID validation failed. Response from Steam: {}", response.body());
            log.error("Parameters sent to Steam for validation: {}", body);
            log.error("Original request URL/params: {}", requestParams);
        }

        throw new RuntimeException("Steam OpenID validation failed.");
    }

    public SteamProfileResponse.Player fetchSteamProfile(String steamId64) {
        if (steamApiKey.isBlank()) {
            log.warn("STEAM_API_KEY not set, returning placeholder for steamId64={}", steamId64);
            return new SteamProfileResponse.Player("user_" + steamId64, null);
        }

        try {
            String url = STEAM_API_URL + "?key=" + encode(steamApiKey) + "&steamids=" + encode(steamId64);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            SteamProfileResponse profileResponse = objectMapper.readValue(response.body(), SteamProfileResponse.class);

            if (profileResponse.response() != null && !profileResponse.response().players().isEmpty()) {
                return profileResponse.response().players().get(0);
            }
        } catch (Exception e) {
            log.error("Failed to fetch Steam profile for steamId64={}: {}", steamId64, e.getMessage());
        }

        return new SteamProfileResponse.Player("user_" + steamId64, null);
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
