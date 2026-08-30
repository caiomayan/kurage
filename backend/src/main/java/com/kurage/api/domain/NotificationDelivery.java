package com.kurage.api.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * Per-user inbox state for a notification. Keeping this separate from content
 * supports direct messages now and batched platform announcements later.
 */
@Entity
@Table(name = "notification_deliveries",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_notification_delivery_recipient",
                columnNames = {"notification_id", "user_id"}),
        indexes = {
                @Index(name = "idx_notification_deliveries_user_created", columnList = "user_id, created_at"),
                @Index(name = "idx_notification_deliveries_user_unread", columnList = "user_id, read_at")
        })
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationDelivery {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "notification_id", nullable = false)
    private Notification notification;

    /**
     * Deliberately stored as an ID rather than an entity association to keep
     * inbox reads and future bulk fan-out independent from User hydration.
     */
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "read_at")
    private Instant readAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
