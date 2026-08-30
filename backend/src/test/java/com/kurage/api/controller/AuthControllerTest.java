package com.kurage.api.controller;

import com.kurage.api.config.AppConstants;
import com.kurage.api.security.JwtService;
import com.kurage.api.service.RefreshTokenService;
import com.kurage.api.service.UserService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

class AuthControllerTest {

    private RefreshTokenService refreshTokenService;
    private JwtService jwtService;
    private UserService userService;
    private AuthController controller;

    @BeforeEach
    void setUp() {
        refreshTokenService = mock(RefreshTokenService.class);
        jwtService = mock(JwtService.class);
        userService = mock(UserService.class);
        controller = new AuthController(refreshTokenService, jwtService, userService);
        ReflectionTestUtils.setField(controller, "cookieDomain", "kurage.example.invalid");
    }

    @Test
    void logoutRevokesRefreshTokenFamilyAndExpiresRefreshCookie() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setServerName("api.kurage.example.invalid");
        request.setCookies(new Cookie(AppConstants.REFRESH_COOKIE_NAME, "refresh-token"));
        MockHttpServletResponse servletResponse = new MockHttpServletResponse();

        var response = controller.logout(request, servletResponse);

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(refreshTokenService).revokeRefreshToken("refresh-token");
        verifyNoInteractions(jwtService, userService);

        String setCookie = servletResponse.getHeader("Set-Cookie");
        assertNotNull(setCookie);
        assertTrue(setCookie.contains(AppConstants.REFRESH_COOKIE_NAME + "="));
        assertTrue(setCookie.contains("Max-Age=0"));
        assertTrue(setCookie.contains("Domain=kurage.example.invalid"));
    }

    @Test
    void logoutWithoutRefreshTokenRemainsIdempotent() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse servletResponse = new MockHttpServletResponse();

        var response = controller.logout(request, servletResponse);

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verifyNoInteractions(refreshTokenService, jwtService, userService);
        assertNotNull(servletResponse.getHeader("Set-Cookie"));
    }
}
