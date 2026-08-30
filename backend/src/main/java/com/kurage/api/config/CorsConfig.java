package com.kurage.api.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import org.springframework.beans.factory.annotation.Value;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    private final String frontendUrl;
    private final String additionalOrigins;

    public CorsConfig(
            @Value("${frontend.url:http://localhost:3000}") String frontendUrl,
            @Value("${frontend.additional-origins:}") String additionalOrigins) {
        this.frontendUrl = frontendUrl;
        this.additionalOrigins = additionalOrigins;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins(allowedOrigins().toArray(String[]::new))
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }

    Set<String> allowedOrigins() {
        Set<String> origins = new LinkedHashSet<>();
        origins.add(normalizeOrigin(frontendUrl));
        additionalOrigins.lines()
                .flatMap(line -> java.util.Arrays.stream(line.split(",")))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .map(CorsConfig::normalizeOrigin)
                .forEach(origins::add);

        return origins;
    }

    public boolean isAllowedOrigin(String origin) {
        if (origin == null) {
            return false;
        }
        try {
            return allowedOrigins().contains(normalizeOrigin(origin));
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private static String normalizeOrigin(String configuredOrigin) {
        try {
            URI uri = new URI(configuredOrigin);
            String scheme = uri.getScheme();
            String host = uri.getHost();

            if (scheme == null || host == null
                    || !(scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https"))
                    || uri.getUserInfo() != null
                    || (uri.getPath() != null && !uri.getPath().isBlank() && !"/".equals(uri.getPath()))
                    || uri.getQuery() != null
                    || uri.getFragment() != null) {
                throw new IllegalArgumentException("CORS origin must be an absolute HTTP(S) origin: " + configuredOrigin);
            }

            return new URI(
                    scheme.toLowerCase(Locale.ROOT),
                    null,
                    host.toLowerCase(Locale.ROOT),
                    uri.getPort(),
                    null,
                    null,
                    null
            ).toString();
        } catch (URISyntaxException exception) {
            throw new IllegalArgumentException("Invalid CORS origin: " + configuredOrigin, exception);
        }
    }
}
