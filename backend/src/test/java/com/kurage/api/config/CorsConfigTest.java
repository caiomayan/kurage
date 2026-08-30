package com.kurage.api.config;

import org.junit.jupiter.api.Test;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class CorsConfigTest {

    @Test
    void allowsOnlyExplicitProductionOrigins() {
        CorsConfiguration configuration = configurationFor(
                "https://kuragemar.com",
                "https://www.kuragemar.com, https://preview.kuragemar.com"
        );

        assertEquals("https://kuragemar.com", configuration.checkOrigin("https://kuragemar.com"));
        assertEquals("https://www.kuragemar.com", configuration.checkOrigin("https://www.kuragemar.com"));
        assertEquals("https://preview.kuragemar.com", configuration.checkOrigin("https://preview.kuragemar.com"));
        assertNull(configuration.checkOrigin("http://localhost:3000"));
        assertNull(configuration.checkOrigin("https://www.kuragemar.com.evil.example"));
    }

    @Test
    void localConfigurationDoesNotGainImplicitOrigins() {
        CorsConfiguration configuration = configurationFor("http://localhost:3000", "");

        assertEquals("http://localhost:3000", configuration.checkOrigin("http://localhost:3000"));
        assertNull(configuration.checkOrigin("http://www.localhost:3000"));
    }

    @Test
    void rejectsOriginsWithPaths() {
        assertThrows(IllegalArgumentException.class,
                () -> configurationFor("https://kuragemar.com/app", ""));
    }

    private static CorsConfiguration configurationFor(String frontendUrl, String additionalOrigins) {
        InspectableCorsRegistry registry = new InspectableCorsRegistry();
        new CorsConfig(frontendUrl, additionalOrigins).addCorsMappings(registry);
        return registry.configurations().get("/**");
    }

    private static final class InspectableCorsRegistry extends CorsRegistry {
        private Map<String, CorsConfiguration> configurations() {
            return getCorsConfigurations();
        }
    }
}
