package com.kurage.api.repository;

import com.kurage.api.domain.NotificationDelivery;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NotificationDeliveryRepository extends JpaRepository<NotificationDelivery, UUID> {

    @EntityGraph(attributePaths = "notification")
    @Query(
            value = """
                    SELECT d FROM NotificationDelivery d
                    WHERE d.userId = :userId
                      AND (d.notification.expiresAt IS NULL OR d.notification.expiresAt > :now)
                    ORDER BY d.createdAt DESC
                    """,
            countQuery = """
                    SELECT COUNT(d) FROM NotificationDelivery d
                    WHERE d.userId = :userId
                      AND (d.notification.expiresAt IS NULL OR d.notification.expiresAt > :now)
                    """
    )
    Page<NotificationDelivery> findVisibleByUserId(
            @Param("userId") UUID userId,
            @Param("now") Instant now,
            Pageable pageable
    );

    @Query("""
            SELECT COUNT(d) FROM NotificationDelivery d
            WHERE d.userId = :userId
              AND d.readAt IS NULL
              AND (d.notification.expiresAt IS NULL OR d.notification.expiresAt > :now)
            """)
    long countUnreadVisibleByUserId(@Param("userId") UUID userId, @Param("now") Instant now);

    Optional<NotificationDelivery> findByIdAndUserId(UUID id, UUID userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE NotificationDelivery d
            SET d.readAt = :readAt
            WHERE d.userId = :userId
              AND d.readAt IS NULL
            """)
    int markAllUnreadAsRead(@Param("userId") UUID userId, @Param("readAt") Instant readAt);
}
