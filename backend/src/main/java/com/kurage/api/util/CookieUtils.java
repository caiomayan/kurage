package com.kurage.api.util;

import org.springframework.http.ResponseCookie;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Duration;

public class CookieUtils {

    /**
     * Resolve o domínio do cookie dinamicamente.
     * Se estiver rodando em localhost, omite o domínio explícito para 
     * evitar bloqueios de CORS/Cookies em ambiente de desenvolvimento.
     */
    public static String resolveDomain(HttpServletRequest request, String configuredDomain) {
        if (request == null) return configuredDomain;
        String serverName = request.getServerName();
        if ("localhost".equals(serverName) || 
            "127.0.0.1".equals(serverName) || 
            "0:0:0:0:0:0:0:1".equals(serverName) || 
            "[::1]".equals(serverName)) {
            return null;
        }
        return configuredDomain;
    }

    /**
     * Constrói um cookie usando a API moderna ResponseCookie do Spring,
     * que gera o header Set-Cookie diretamente.
     */
    public static ResponseCookie buildResponseCookie(String name, String value, Duration maxAge, String domain) {
        return buildResponseCookie(name, value, maxAge, domain, "/");
    }

    public static ResponseCookie buildResponseCookie(
            String name,
            String value,
            Duration maxAge,
            String domain,
            String path) {
        // Assume localhost se o dominio foi resolvido para null pela nova função
        boolean isLocalhost = (domain == null);

        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(!isLocalhost) // Desativa secure no localhost para funcionar via HTTP
                .sameSite("Lax")
                .path(path)
                .maxAge(maxAge);

        if (!isLocalhost && !domain.isBlank()) {
            builder.domain(domain);
        }

        return builder.build();
    }
}
