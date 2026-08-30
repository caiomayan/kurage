package com.kurage.api.config;

import com.kurage.api.domain.User;
import com.kurage.api.service.RateLimitingService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RateLimitInterceptorTest {

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void usesNormalizedRemoteAddressInsteadOfRawForwardedHeader() throws Exception {
        RateLimitingService service = mock(RateLimitingService.class);
        when(service.allowGlobalIp("198.51.100.20")).thenReturn(true);
        RateLimitInterceptor interceptor = new RateLimitInterceptor(service);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/leaderboard");
        request.setRemoteAddr("198.51.100.20");
        request.addHeader("X-Forwarded-For", "203.0.113.99");

        assertTrue(interceptor.preHandle(request, new MockHttpServletResponse(), new Object()));
        verify(service).allowGlobalIp("198.51.100.20");
    }

    @Test
    void rejectsAuthenticatedTeamLogoWhenUploadLimitIsExceeded() throws Exception {
        UUID userId = UUID.randomUUID();
        User user = User.builder().id(userId).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, java.util.List.of())
        );

        RateLimitingService service = mock(RateLimitingService.class);
        when(service.allowImageUpload(userId.toString())).thenReturn(false);
        RateLimitInterceptor interceptor = new RateLimitInterceptor(service);
        MockHttpServletRequest request = new MockHttpServletRequest(
                "POST",
                "/teams/" + UUID.randomUUID() + "/avatar"
        );
        MockHttpServletResponse response = new MockHttpServletResponse();

        assertFalse(interceptor.preHandle(request, response, new Object()));
        org.junit.jupiter.api.Assertions.assertEquals(429, response.getStatus());
        verify(service).allowImageUpload(userId.toString());
    }
}
