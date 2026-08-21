package com.kurage.api.security;

import java.security.SecureRandom;
import java.util.Base64;

public final class TokenGenerationUtils {

    private static final SecureRandom secureRandom = new SecureRandom();

    private TokenGenerationUtils() {}

    public static String generateRefreshToken() {
        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }
}
