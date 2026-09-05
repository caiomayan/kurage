package com.kurage.api.service;

import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.jackson.autoconfigure.JacksonAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.data.redis.core.StringRedisTemplate;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;

/**
 * Wiring check for the OAuth state service.
 *
 * <p>State creation and one-time consumption moved to
 * {@code OAuthStateConsumptionIT}: replay protection depends on {@code GETDEL}
 * being atomic in Redis, which a mocked template can assert as a call but never
 * demonstrate as a property. What is left here is the context concern — that the
 * service starts against the Spring Boot 4 Jackson {@code ObjectMapper}.
 */
class OAuthStateServiceTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(JacksonAutoConfiguration.class))
            .withBean(StringRedisTemplate.class, () -> mock(StringRedisTemplate.class))
            .withUserConfiguration(OAuthStateService.class);

    @Test
    void startsWithSpringBoot4JacksonObjectMapper() {
        contextRunner.run(context -> {
            assertNull(context.getStartupFailure());
            assertNotNull(context.getBean(ObjectMapper.class));
            assertNotNull(context.getBean(OAuthStateService.class));
        });
    }
}
