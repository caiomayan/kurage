package com.kurage.api.config;

import org.junit.jupiter.api.Test;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class CorsConfigTest {

    @Test
    void productionApexAllowsItsWwwVariantButRejectsUntrustedOrigins() {
        CorsConfiguration configuration = configurationFor("https://kurage.caiomayan.com");

        assertEquals("https://kurage.caiomayan.com",
                configuration.checkOrigin("https://kurage.caiomayan.com"));
        assertEquals("https://www.kurage.caiomayan.com",
                configuration.checkOrigin("https://www.kurage.caiomayan.com"));
        assertNull(configuration.checkOrigin("http://localhost:3000"));
        assertNull(configuration.checkOrigin("https://kurage-preview.vercel.app"));
        assertNull(configuration.checkOrigin("https://www.kurage.caiomayan.com.evil.example"));
    }

    @Test
    void productionWwwAllowsItsApexVariant() {
        CorsConfiguration configuration = configurationFor("https://www.kurage.caiomayan.com");

        assertEquals("https://www.kurage.caiomayan.com",
                configuration.checkOrigin("https://www.kurage.caiomayan.com"));
        assertEquals("https://kurage.caiomayan.com",
                configuration.checkOrigin("https://kurage.caiomayan.com"));
    }

    @Test
    void nonCaiomayanConfigurationDoesNotGainAnAutomaticWwwOrigin() {
        CorsConfiguration configuration = configurationFor("http://localhost:3000");

        assertEquals("http://localhost:3000", configuration.checkOrigin("http://localhost:3000"));
        assertNull(configuration.checkOrigin("http://www.localhost:3000"));
    }

    private static CorsConfiguration configurationFor(String frontendUrl) {
        InspectableCorsRegistry registry = new InspectableCorsRegistry();
        new CorsConfig(frontendUrl).addCorsMappings(registry);
        return registry.configurations().get("/**");
    }

    private static final class InspectableCorsRegistry extends CorsRegistry {
        private Map<String, CorsConfiguration> configurations() {
            return getCorsConfigurations();
        }
    }
}
