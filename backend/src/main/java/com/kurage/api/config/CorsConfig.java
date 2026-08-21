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

    private static final String FRONTEND_APEX_HOST = "kurage.caiomayan.com";
    private static final String FRONTEND_WWW_HOST = "www.kurage.caiomayan.com";

    private final String frontendUrl;

    public CorsConfig(@Value("${frontend.url:http://localhost:3000}") String frontendUrl) {
        this.frontendUrl = frontendUrl;
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
        origins.add(frontendUrl);

        String alternateOrigin = alternateCaiomayanOrigin(frontendUrl);
        if (alternateOrigin != null) {
            origins.add(alternateOrigin);
        }

        return origins;
    }

    private static String alternateCaiomayanOrigin(String configuredOrigin) {
        try {
            URI uri = new URI(configuredOrigin);
            String scheme = uri.getScheme();
            String host = uri.getHost();

            if (scheme == null || host == null
                    || !(scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https"))) {
                return null;
            }

            String normalizedHost = host.toLowerCase(Locale.ROOT);
            String alternateHost;
            if (FRONTEND_APEX_HOST.equals(normalizedHost)) {
                alternateHost = FRONTEND_WWW_HOST;
            } else if (FRONTEND_WWW_HOST.equals(normalizedHost)) {
                alternateHost = FRONTEND_APEX_HOST;
            } else {
                return null;
            }

            return new URI(
                    scheme.toLowerCase(Locale.ROOT),
                    null,
                    alternateHost,
                    uri.getPort(),
                    null,
                    null,
                    null
            ).toString();
        } catch (URISyntaxException exception) {
            return null;
        }
    }
}
