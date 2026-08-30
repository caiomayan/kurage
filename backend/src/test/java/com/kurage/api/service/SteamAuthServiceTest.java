package com.kurage.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@SuppressWarnings("unchecked")
class SteamAuthServiceTest {

    private static final String STATE = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    private static final String STEAM_ID = "76561198000000000";
    private static final String CALLBACK = "https://api.kuragemar.com/auth/steam/callback?state=" + STATE;

    private HttpClient httpClient;
    private SteamAuthService service;

    @BeforeEach
    void setUp() {
        httpClient = mock(HttpClient.class);
        service = new SteamAuthService(httpClient, new ObjectMapper());
        ReflectionTestUtils.setField(service, "backendUrl", "https://api.kuragemar.com");
        ReflectionTestUtils.setField(service, "steamApiKey", "test-key");
    }

    @Test
    void acceptsOnlyAnAssertionConfirmedBySteam() throws Exception {
        HttpResponse<String> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(200);
        when(response.body()).thenReturn("ns:http://specs.openid.net/auth/2.0\nis_valid:true\n");
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(response);

        assertEquals(STEAM_ID, service.validateSteamLogin(validAssertion(), CALLBACK));
    }

    @Test
    void rejectsAnAssertionFromAnotherOpenIdProviderBeforeNetworkCall() {
        Map<String, String[]> assertion = validAssertion();
        assertion.put("openid.op_endpoint", values("https://evil.example/openid"));

        assertThrows(IllegalArgumentException.class, () -> service.validateSteamLogin(assertion, CALLBACK));
        verifyNoInteractions(httpClient);
    }

    @Test
    void rejectsReturnToThatDoesNotMatchTheBrowserState() {
        Map<String, String[]> assertion = validAssertion();
        assertion.put("openid.return_to", values(CALLBACK + "-changed"));

        assertThrows(IllegalArgumentException.class, () -> service.validateSteamLogin(assertion, CALLBACK));
        verifyNoInteractions(httpClient);
    }

    private static Map<String, String[]> validAssertion() {
        String identity = "https://steamcommunity.com/openid/id/" + STEAM_ID;
        Map<String, String[]> assertion = new LinkedHashMap<>();
        assertion.put("openid.ns", values("http://specs.openid.net/auth/2.0"));
        assertion.put("openid.mode", values("id_res"));
        assertion.put("openid.op_endpoint", values("https://steamcommunity.com/openid/login"));
        assertion.put("openid.claimed_id", values(identity));
        assertion.put("openid.identity", values(identity));
        assertion.put("openid.return_to", values(CALLBACK));
        assertion.put("openid.response_nonce", values("2026-08-27T12:00:00Znonce"));
        assertion.put("openid.signed", values("signed,fields"));
        assertion.put("openid.sig", values("signature"));
        assertion.put("state", values(STATE));
        return assertion;
    }

    private static String[] values(String value) {
        return new String[]{value};
    }
}
