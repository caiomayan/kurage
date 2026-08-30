package com.kurage.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kurage.api.dto.response.SteamProfileResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class SteamAuthService {

    private static final Logger log = LoggerFactory.getLogger(SteamAuthService.class);
    private static final String STEAM_OPENID_URL = "https://steamcommunity.com/openid/login";
    private static final String STEAM_API_URL = "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/";
    private static final String OPENID_NAMESPACE = "http://specs.openid.net/auth/2.0";
    private static final Pattern STEAM_ID_PATTERN = Pattern.compile(
            "https://steamcommunity\\.com/openid/id/(\\d{17})"
    );

    @Value("${backend.url:http://localhost:8080}")
    private String backendUrl;

    @Value("${steam.api.key:}")
    private String steamApiKey;

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    @Autowired
    public SteamAuthService() {
        this(
                HttpClient.newBuilder()
                        .connectTimeout(Duration.ofSeconds(5))
                        .followRedirects(HttpClient.Redirect.NEVER)
                        .build(),
                new ObjectMapper()
        );
    }

    SteamAuthService(HttpClient httpClient, ObjectMapper objectMapper) {
        this.httpClient = httpClient;
        this.objectMapper = objectMapper;
    }

    public String buildSteamLoginUrl(String state) {
        String callbackUrl = buildCallbackUrl(state);
        String params = "openid.ns=" + encode(OPENID_NAMESPACE)
                + "&openid.mode=checkid_setup"
                + "&openid.return_to=" + encode(callbackUrl)
                + "&openid.realm=" + encode(backendUrl)
                + "&openid.identity=" + encode("http://specs.openid.net/auth/2.0/identifier_select")
                + "&openid.claimed_id=" + encode("http://specs.openid.net/auth/2.0/identifier_select");
        return STEAM_OPENID_URL + "?" + params;
    }

    public String buildCallbackUrl(String state) {
        if (!SteamLoginStateService.isValidState(state)) {
            throw new IllegalArgumentException("Invalid Steam login state");
        }
        return backendUrl + "/auth/steam/callback?state=" + encode(state);
    }

    public String validateSteamLogin(Map<String, String[]> requestParams, String expectedReturnTo) throws Exception {
        Map<String, String> params = collectOpenIdParameters(requestParams);
        validatePositiveAssertion(params, expectedReturnTo);

        params.put("openid.mode", "check_authentication");

        String body = params.entrySet().stream()
                .map(e -> URLEncoder.encode(e.getKey(), StandardCharsets.UTF_8) + "=" + URLEncoder.encode(e.getValue(), StandardCharsets.UTF_8))
                .collect(Collectors.joining("&"));

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(STEAM_OPENID_URL))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .timeout(Duration.ofSeconds(10))
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() == 200 && hasValidAuthenticationResponse(response.body())) {
            String claimedId = params.get("openid.claimed_id");
            Matcher matcher = STEAM_ID_PATTERN.matcher(claimedId != null ? claimedId : "");
            if (matcher.matches()) {
                return matcher.group(1);
            }
        }

        log.warn("Steam OpenID validation rejected with status={}", response.statusCode());
        throw new RuntimeException("Steam OpenID validation failed.");
    }

    public SteamProfileResponse.Player fetchSteamProfile(String steamId64) {
        if (steamApiKey.isBlank()) {
            throw new IllegalStateException("STEAM_API_KEY is required for Steam authentication");
        }

        try {
            String url = STEAM_API_URL + "?key=" + encode(steamApiKey) + "&steamids=" + encode(steamId64);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(10))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new IllegalStateException("Steam profile request returned status " + response.statusCode());
            }
            SteamProfileResponse profileResponse = objectMapper.readValue(response.body(), SteamProfileResponse.class);

            if (profileResponse.response() != null
                    && profileResponse.response().players() != null
                    && !profileResponse.response().players().isEmpty()) {
                return profileResponse.response().players().get(0);
            }
        } catch (Exception e) {
            log.warn("Steam profile unavailable for steamId64={}: {}", steamId64, e.getMessage());
            throw new IllegalStateException("Steam profile is temporarily unavailable", e);
        }

        throw new IllegalStateException("Steam profile response did not contain the authenticated player");
    }

    private static Map<String, String> collectOpenIdParameters(Map<String, String[]> requestParams) {
        Map<String, String> params = new LinkedHashMap<>();
        requestParams.forEach((key, values) -> {
            if (key.startsWith("openid.") && values != null && values.length == 1 && values[0] != null) {
                params.put(key, values[0]);
            }
        });
        return params;
    }

    private static void validatePositiveAssertion(Map<String, String> params, String expectedReturnTo) {
        requireExact(params, "openid.ns", OPENID_NAMESPACE);
        requireExact(params, "openid.op_endpoint", STEAM_OPENID_URL);
        requireExact(params, "openid.mode", "id_res");
        requireExact(params, "openid.return_to", expectedReturnTo);

        String claimedId = params.get("openid.claimed_id");
        String identity = params.get("openid.identity");
        if (claimedId == null
                || !claimedId.equals(identity)
                || !STEAM_ID_PATTERN.matcher(claimedId).matches()) {
            throw new IllegalArgumentException("Invalid Steam claimed identity");
        }
        if (params.getOrDefault("openid.response_nonce", "").isBlank()) {
            throw new IllegalArgumentException("Steam response nonce is required");
        }
        if (params.getOrDefault("openid.sig", "").isBlank()
                || params.getOrDefault("openid.signed", "").isBlank()) {
            throw new IllegalArgumentException("Steam signature is required");
        }
    }

    private static void requireExact(Map<String, String> params, String key, String expected) {
        if (!expected.equals(params.get(key))) {
            throw new IllegalArgumentException("Invalid Steam OpenID parameter: " + key);
        }
    }

    private static boolean hasValidAuthenticationResponse(String responseBody) {
        return responseBody != null
                && responseBody.lines().map(String::trim).anyMatch("is_valid:true"::equals);
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
