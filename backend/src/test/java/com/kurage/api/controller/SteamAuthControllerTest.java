package com.kurage.api.controller;

import com.kurage.api.domain.User;
import com.kurage.api.dto.response.SteamProfileResponse;
import com.kurage.api.service.RefreshTokenService;
import com.kurage.api.service.SteamAuthService;
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
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class SteamAuthControllerTest {

    private static final String FRONTEND_URL = "https://kurage.caiomayan.com";

    private SteamAuthService steamAuthService;
    private UserService userService;
    private RefreshTokenService refreshTokenService;
    private SteamAuthController controller;

    @BeforeEach
    void setUp() {
        steamAuthService = mock(SteamAuthService.class);
        userService = mock(UserService.class);
        refreshTokenService = mock(RefreshTokenService.class);
        controller = new SteamAuthController(steamAuthService, userService, refreshTokenService);
        ReflectionTestUtils.setField(controller, "frontendUrl", FRONTEND_URL);
        ReflectionTestUtils.setField(controller, "cookieDomain", "caiomayan.com");
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void loginPreservesSafeLocalReturnUrl() throws Exception {
        String returnUrl = "/profile/76561198000000000?tab=stats";
        when(steamAuthService.buildSteamLoginUrl(returnUrl)).thenReturn("https://steam.example/login");
        MockHttpServletResponse response = new MockHttpServletResponse();

        controller.loginWithSteam(returnUrl, response);

        assertEquals("https://steam.example/login", response.getRedirectedUrl());
        verify(steamAuthService).buildSteamLoginUrl(returnUrl);
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
        when(steamAuthService.buildSteamLoginUrl("/")).thenReturn("https://steam.example/login");
        MockHttpServletResponse response = new MockHttpServletResponse();

        controller.loginWithSteam(returnUrl, response);

        assertEquals("https://steam.example/login", response.getRedirectedUrl());
        verify(steamAuthService).buildSteamLoginUrl("/");
    }

    @Test
    void authenticatedLoginCannotRedirectOutsideFrontend() throws Exception {
        User authenticatedUser = new User();
        authenticatedUser.setSteamId64("76561198000000000");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(authenticatedUser, null, java.util.List.of())
        );
        MockHttpServletResponse response = new MockHttpServletResponse();

        controller.loginWithSteam("//evil.example/path", response);

        assertEquals(FRONTEND_URL + "/", response.getRedirectedUrl());
        verifyNoInteractions(steamAuthService);
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

    private void prepareSuccessfulCallback() throws Exception {
        String steamId64 = "76561198000000000";
        User user = new User();
        user.setSteamId64(steamId64);

        when(steamAuthService.validateSteamLogin(any())).thenReturn(steamId64);
        when(steamAuthService.fetchSteamProfile(steamId64))
                .thenReturn(new SteamProfileResponse.Player("Player", "https://avatar.example/player.jpg"));
        when(userService.getOrCreateUser(
                eq(steamId64),
                eq("Player"),
                eq("https://avatar.example/player.jpg"),
                anyString(),
                any()
        )).thenReturn(user);
        when(refreshTokenService.createRefreshToken(eq(steamId64), anyString(), any()))
                .thenReturn("refresh-token");
    }

    private MockHttpServletRequest callbackRequest(String returnUrl) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addParameter("returnUrl", returnUrl);
        request.addHeader("User-Agent", "JUnit");
        request.setRemoteAddr("127.0.0.1");
        return request;
    }
}
