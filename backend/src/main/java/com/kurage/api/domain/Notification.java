package com.kurage.api.domain;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/**
 * Immutable notification content. Delivery and read state belong to
 * {@link NotificationDelivery}, allowing one notification to be delivered to
 * one or many users without duplicating its content.
 */
@Entity
@Table(name = "notifications", indexes = {
        @Index(name = "idx_notifications_created", columnList = "created_at"),
        @Index(name = "idx_notifications_expires", columnList = "expires_at")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /**
     * Open, namespaced type such as TEAM_INVITE, FRIEND_REQUEST or
     * PLATFORM_ANNOUNCEMENT. It is intentionally a string to keep the inbox
     * extensible without a database migration for every new product message.
     */
    @Column(nullable = false, length = 80)
    private String type;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private JsonNode metadata;

    @Column(name = "action_url", length = 2048)
    private String actionUrl;

    @Builder.Default
    @Column(nullable = false)
    private short priority = 0;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
