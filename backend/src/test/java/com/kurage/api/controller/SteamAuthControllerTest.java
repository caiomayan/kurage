package com.kurage.api.controller;

import com.kurage.api.domain.User;
import com.kurage.api.dto.response.SteamProfileResponse;
import com.kurage.api.service.RefreshTokenService;
import com.kurage.api.service.SteamAuthService;
import com.kurage.api.service.SteamLoginStateService;
import com.kurage.api.service.UserService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.when;

class SteamAuthControllerTest {

    private static final String FRONTEND_URL = "https://kurage.example.invalid";
    private static final String STEAM_STATE = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

    private SteamAuthService steamAuthService;
    private SteamLoginStateService steamLoginStateService;
    private UserService userService;
    private RefreshTokenService refreshTokenService;
    private SteamAuthController controller;

    @BeforeEach
    void setUp() {
        steamAuthService = mock(SteamAuthService.class);
        steamLoginStateService = mock(SteamLoginStateService.class);
        userService = mock(UserService.class);
        refreshTokenService = mock(RefreshTokenService.class);
        controller = new SteamAuthController(steamAuthService, steamLoginStateService, userService, refreshTokenService);
        ReflectionTestUtils.setField(controller, "frontendUrl", FRONTEND_URL);
        ReflectionTestUtils.setField(controller, "cookieDomain", "kurage.example.invalid");
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void loginPreservesSafeLocalReturnUrl() throws Exception {
        String returnUrl = "/profile/76561198000000000?tab=stats";
        when(steamLoginStateService.createState(returnUrl)).thenReturn(STEAM_STATE);
        when(steamAuthService.buildSteamLoginUrl(STEAM_STATE)).thenReturn("https://steam.example/login");
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        controller.loginWithSteam(returnUrl, request, response);

        assertEquals("https://steam.example/login", response.getRedirectedUrl());
        verify(steamLoginStateService).createState(returnUrl);
        verify(steamAuthService).buildSteamLoginUrl(STEAM_STATE);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "https://evil.example/path",
            "//evil.example/path",
            "\\\\evil.example\\path",
            "/\\evil.example/path",
            "javascript:alert(1)",
            " /profile/123",
            "/profile/123\r\nLocation: https://evil.example"
    })
    void loginFallsBackToRootForUnsafeReturnUrl(String returnUrl) throws Exception {
        when(steamLoginStateService.createState("/")).thenReturn(STEAM_STATE);
        when(steamAuthService.buildSteamLoginUrl(STEAM_STATE)).thenReturn("https://steam.example/login");
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        controller.loginWithSteam(returnUrl, request, response);

        assertEquals("https://steam.example/login", response.getRedirectedUrl());
        verify(steamLoginStateService).createState("/");
        verify(steamAuthService).buildSteamLoginUrl(STEAM_STATE);
    }

    @Test
    void authenticatedLoginCannotRedirectOutsideFrontend() throws Exception {
        User authenticatedUser = new User();
        authenticatedUser.setSteamId64("76561198000000000");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(authenticatedUser, null, java.util.List.of())
        );
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockHttpServletRequest request = new MockHttpServletRequest();

        controller.loginWithSteam("//evil.example/path", request, response);

        assertEquals(FRONTEND_URL + "/", response.getRedirectedUrl());
        verifyNoInteractions(steamAuthService);
        verifyNoInteractions(steamLoginStateService);
    }

    @Test
    void callbackRedirectsToSafeLocalReturnUrl() throws Exception {
        prepareSuccessfulCallback();
        MockHttpServletRequest request = callbackRequest("/profile/76561198000000000?steam=linked");
        MockHttpServletResponse response = new MockHttpServletResponse();

        controller.steamCallback(request, response);

        assertEquals(
                FRONTEND_URL + "/profile/76561198000000000?steam=linked",
                response.getRedirectedUrl()
        );
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "https://evil.example/path",
            "//evil.example/path",
            "/\\evil.example/path",
            "javascript:alert(1)"
    })
    void callbackFallsBackToFrontendRootForUnsafeReturnUrl(String returnUrl) throws Exception {
        prepareSuccessfulCallback();
        MockHttpServletRequest request = callbackRequest(returnUrl);
        MockHttpServletResponse response = new MockHttpServletResponse();

        controller.steamCallback(request, response);

        assertEquals(FRONTEND_URL + "/", response.getRedirectedUrl());
    }

    @Test
    void callbackFallsBackToFrontendRootForControlCharacter() throws Exception {
        prepareSuccessfulCallback();
        MockHttpServletRequest request = callbackRequest("/profile/123" + Character.toString(0));
        MockHttpServletResponse response = new MockHttpServletResponse();

        controller.steamCallback(request, response);

        assertEquals(FRONTEND_URL + "/", response.getRedirectedUrl());
    }

    @Test
    void callbackRejectsStateThatDoesNotMatchBrowserCookie() throws Exception {
        MockHttpServletRequest request = callbackRequest("/inventory");
        request.setCookies(new jakarta.servlet.http.Cookie("steam_login_state", "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"));
        MockHttpServletResponse response = new MockHttpServletResponse();

        controller.steamCallback(request, response);

        assertEquals(FRONTEND_URL + "/?error=steam_validation_failed", response.getRedirectedUrl());
        verify(steamLoginStateService, never()).consumeState(anyString());
        verify(steamAuthService, never()).validateSteamLogin(anyMap(), anyString());
    }

    private void prepareSuccessfulCallback() throws Exception {
        String steamId64 = "76561198000000000";
        User user = new User();
        user.setSteamId64(steamId64);

        when(steamAuthService.buildCallbackUrl(STEAM_STATE)).thenReturn("https://api.example/auth/steam/callback?state=" + STEAM_STATE);
        when(steamAuthService.validateSteamLogin(anyMap(), anyString())).thenReturn(steamId64);
        when(steamAuthService.fetchSteamProfile(steamId64))
                .thenReturn(new SteamProfileResponse.Player("Player", "https://avatar.example/player.jpg"));
        when(userService.getOrCreateUser(
                eq(steamId64),
                eq("Player"),
                eq("https://avatar.example/player.jpg"),
                any()
        )).thenReturn(user);
        when(refreshTokenService.createRefreshToken(eq(steamId64), anyString(), any()))
                .thenReturn("refresh-token");
    }

    private MockHttpServletRequest callbackRequest(String returnUrl) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addParameter("state", STEAM_STATE);
        request.setCookies(new jakarta.servlet.http.Cookie("steam_login_state", STEAM_STATE));
        request.addHeader("User-Agent", "JUnit");
        request.setRemoteAddr("127.0.0.1");
        when(steamLoginStateService.consumeState(STEAM_STATE)).thenReturn(returnUrl);
        return request;
    }
}
