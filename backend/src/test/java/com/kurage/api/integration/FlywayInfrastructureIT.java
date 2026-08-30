package com.kurage.api.integration;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;

class FlywayInfrastructureIT extends IntegrationTestSupport {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void appliesAllMigrationsToPostgresAndRoundTripsThroughRedis() {
        Integer successfulMigrations = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM flyway_schema_history WHERE success = true",
                Integer.class
        );

        assertThat(successfulMigrations).isGreaterThanOrEqualTo(9);
        assertThat(jdbcTemplate.queryForObject(
                "SELECT to_regclass('public.notification_deliveries')", String.class))
                .isEqualTo("notification_deliveries");
        assertThat(jdbcTemplate.queryForObject(
                "SELECT to_regclass('public.users')", String.class))
                .isEqualTo("users");
        assertThat(jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM pg_constraint WHERE conname = 'users_subscription_tier_check'",
                Integer.class
        )).isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM pg_constraint WHERE conname = 'user_inventories_canonical_items_check'",
                Integer.class
        )).isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM pg_indexes WHERE indexname = 'uq_team_invitations_pending'",
                Integer.class
        )).isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM pg_indexes WHERE indexname = 'uq_team_join_requests_pending'",
                Integer.class
        )).isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'user_inventories' AND column_name = 'lock_version'",
                Integer.class
        )).isEqualTo(1);

        redisTemplate.opsForValue().set("integration:redis:roundtrip", "ok");
        assertThat(redisTemplate.opsForValue().get("integration:redis:roundtrip")).isEqualTo("ok");
    }
}
