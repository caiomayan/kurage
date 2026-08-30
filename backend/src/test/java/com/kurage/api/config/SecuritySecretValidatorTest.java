package com.kurage.api.config;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class SecuritySecretValidatorTest {

    private static final String STRONG_JWT = "unit-test-jwt-secret-with-at-least-32-bytes";
    private static final String STRONG_SERVER_KEY = "unit-test-server-key-with-at-least-32-bytes";

    @Test
    void acceptsIndependentStrongSecrets() {
        SecuritySecretValidator validator = new SecuritySecretValidator(STRONG_JWT, STRONG_SERVER_KEY);
        assertDoesNotThrow(validator::validate);
    }

    @Test
    void rejectsMissingGameServerCredential() {
        SecuritySecretValidator validator = new SecuritySecretValidator(STRONG_JWT, "");
        assertThrows(IllegalStateException.class, validator::validate);
    }

    @Test
    void rejectsShortJwtSecret() {
        SecuritySecretValidator validator = new SecuritySecretValidator("short", STRONG_SERVER_KEY);
        assertThrows(IllegalStateException.class, validator::validate);
    }

    @Test
    void rejectsRepositoryKnownJwtSecret() {
        SecuritySecretValidator validator = new SecuritySecretValidator(
                "d3d3LmNhaW9tYXlhbi5jb20uYnIubmFvLnRlbS5wYXJhbm9pYQ==",
                STRONG_SERVER_KEY
        );
        assertThrows(IllegalStateException.class, validator::validate);
    }
}
