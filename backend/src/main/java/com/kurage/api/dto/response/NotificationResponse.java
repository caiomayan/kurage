package com.kurage.api.dto.response;

import com.fasterxml.jackson.databind.JsonNode;
import com.kurage.api.domain.Notification;
import com.kurage.api.domain.NotificationDelivery;

import java.time.Instant;
import java.util.UUID;

/** Stable HTTP representation of a recipient's inbox item. */
public record NotificationResponse(
        UUID id,
        String type,
        String title,
        String message,
        JsonNode metadata,
        String actionUrl,
        short priority,
        Instant expiresAt,
        Instant createdAt,
        Instant readAt
) {
    public static NotificationResponse from(NotificationDelivery delivery) {
        Notification notification = delivery.getNotification();
        return new NotificationResponse(
                delivery.getId(),
                notification.getType(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getMetadata(),
                notification.getActionUrl(),
                notification.getPriority(),
                notification.getExpiresAt(),
                delivery.getCreatedAt(),
                delivery.getReadAt()
        );
    }
}
