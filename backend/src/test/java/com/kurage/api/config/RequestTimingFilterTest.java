package com.kurage.api.config;

import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

class RequestTimingFilterTest {

    private final RequestTimingFilter filter = new RequestTimingFilter();

    @Test
    void preservesOnlySafeRequestIdsAndAlwaysReturnsOne() throws Exception {
        ReflectionTestUtils.setField(filter, "slowRequestThresholdMs", Long.MAX_VALUE);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/health");
        request.addHeader(RequestTimingFilter.REQUEST_ID_HEADER, "mobile-session:42");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getHeader(RequestTimingFilter.REQUEST_ID_HEADER)).isEqualTo("mobile-session:42");
        assertThat(MDC.get("requestId")).isNull();
    }

    @Test
    void replacesMalformedRequestIds() throws Exception {
        ReflectionTestUtils.setField(filter, "slowRequestThresholdMs", Long.MAX_VALUE);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/health");
        request.addHeader(RequestTimingFilter.REQUEST_ID_HEADER, "invalid request id with spaces");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getHeader(RequestTimingFilter.REQUEST_ID_HEADER))
                .isNotBlank()
                .isNotEqualTo("invalid request id with spaces");
        assertThat(MDC.get("requestId")).isNull();
    }
}
