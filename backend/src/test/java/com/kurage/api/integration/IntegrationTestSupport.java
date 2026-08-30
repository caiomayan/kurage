package com.kurage.api.integration;

import org.junit.jupiter.api.AfterEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.lifecycle.Startables;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

import java.util.stream.Stream;

/**
 * Integration-test foundation. PostgreSQL and Redis are real containers, Flyway
 * runs exactly as it does in production, and Docker Compose auto-discovery is
 * disabled so the suite never touches a developer's local data services.
 */
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.MOCK,
        properties = {
                "kurage.scheduling.enabled=false",
                "spring.data.redis.repositories.enabled=false"
        }
)
@Transactional
public abstract class IntegrationTestSupport {

    private static final String REDIS_PASSWORD = "integration-test-redis-secret";

    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine")
            .withDatabaseName("kurage_test")
            .withUsername("kurage")
            .withPassword("kurage");

    static final GenericContainer<?> REDIS = new GenericContainer<>(DockerImageName.parse("redis:7-alpine"))
            .withExposedPorts(6379)
            .withCommand("redis-server", "--requirepass", REDIS_PASSWORD, "--appendonly", "yes")
            .waitingFor(Wait.forLogMessage(".*Ready to accept connections.*\\n", 1));

    static {
        // One pair of containers per Failsafe JVM. Spring can safely reuse its
        // application context because the mapped ports remain stable for the
        // entire integration suite.
        Startables.deepStart(Stream.of(POSTGRES, REDIS)).join();
    }

    @Autowired
    protected StringRedisTemplate redisTemplate;

    @DynamicPropertySource
    static void registerInfrastructure(DynamicPropertyRegistry registry) {
        registry.add("spring.docker.compose.enabled", () -> "false");
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.data.redis.host", REDIS::getHost);
        registry.add("spring.data.redis.port", () -> REDIS.getMappedPort(6379));
        registry.add("spring.data.redis.password", () -> REDIS_PASSWORD);
        registry.add("steam.api.key", () -> "integration-test");
        registry.add("faceit.api.key", () -> "integration-test");
        registry.add("game.server.api.key", () -> "integration-test-game-server-secret-32-bytes");
        registry.add("api.security.token.secret",
                () -> "aW50ZWdyYXRpb24tdGVzdC1qd3Qtc2VjcmV0LXRoYXQtaXMtbm90LXByb2R1Y3Rpb24=");
        registry.add("frontend.url", () -> "http://localhost:3000");
        registry.add("backend.url", () -> "http://localhost:8080");
        registry.add("cloudflare.r2.bucket-name", () -> "kurage-test");
    }

    @AfterEach
    void clearRedis() {
        redisTemplate.getConnectionFactory().getConnection().serverCommands().flushDb();
    }
}
