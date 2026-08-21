package com.kurage.api.security;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTCreationException;
import com.auth0.jwt.exceptions.JWTVerificationException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
public class JwtService {

    private static final long JWT_EXPIRATION_MINUTES = 15;
    private static final String ISSUER = "kurage-api";

    @Value("${api.security.token.secret}")
    private String secret;

    public String generateToken(String steamId64, String role, String userId) {
        try {
            return JWT.create()
                    .withIssuer(ISSUER)
                    .withSubject(steamId64)
                    .withClaim("role", role)
                    .withClaim("id", userId)
                    .withExpiresAt(Instant.now().plus(JWT_EXPIRATION_MINUTES, ChronoUnit.MINUTES))
                    .sign(Algorithm.HMAC256(secret));
        } catch (JWTCreationException e) {
            throw new RuntimeException("Error generating JWT token", e);
        }
    }

    public com.auth0.jwt.interfaces.DecodedJWT validateToken(String token) {
        try {
            return JWT.require(Algorithm.HMAC256(secret))
                    .withIssuer(ISSUER)
                    .build()
                    .verify(token);
        } catch (JWTVerificationException e) {
            return null;
        }
    }
}
