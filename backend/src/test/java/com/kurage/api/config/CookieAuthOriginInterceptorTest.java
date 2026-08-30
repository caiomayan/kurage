package com.kurage.api.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CookieAuthOriginInterceptorTest {

    private CookieAuthOriginInterceptor interceptor;

    @BeforeEach
    void setUp() {
        interceptor = new CookieAuthOriginInterceptor(
                new CorsConfig("https://kuragemar.com", "https://www.kuragemar.com")
        );
    }

    @Test
    void acceptsConfiguredFrontendOriginForRefresh() throws Exception {
        MockHttpServletRequest request = request("/auth/refresh", "https://kuragemar.com");
        assertTrue(interceptor.preHandle(request, new MockHttpServletResponse(), new Object()));
    }

    @Test
    void rejectsMissingOriginForCookieAuthenticatedMutation() throws Exception {
        MockHttpServletRequest request = request("/auth/logout", null);
        MockHttpServletResponse response = new MockHttpServletResponse();

        assertFalse(interceptor.preHandle(request, response, new Object()));
        assertEquals(403, response.getStatus());
    }

    @Test
    void rejectsLookalikeOrigin() throws Exception {
        MockHttpServletRequest request = request("/auth/refresh", "https://kuragemar.com.evil.example");
        MockHttpServletResponse response = new MockHttpServletResponse();

        assertFalse(interceptor.preHandle(request, response, new Object()));
        assertEquals(403, response.getStatus());
    }

    private static MockHttpServletRequest request(String path, String origin) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", path);
        if (origin != null) {
            request.addHeader("Origin", origin);
        }
        return request;
    }
}
