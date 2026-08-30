package com.kurage.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kurage.api.domain.Notification;
import com.kurage.api.domain.NotificationDelivery;
import com.kurage.api.domain.enums.NotificationType;
import com.kurage.api.dto.response.NotificationResponse;
import com.kurage.api.repository.NotificationDeliveryRepository;
import com.kurage.api.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * PostgreSQL-backed inbox service.
 *
 * Notification content is immutable and generic. A separate delivery row owns a
 * user's read state, so team events, future friendship events and bounded
 * platform campaigns use the same model without duplicating content.
 */
@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final int MAX_PAGE_SIZE = 100;
    private static final int MAX_TITLE_LENGTH = 160;
    private static final int MAX_MESSAGE_LENGTH = 10_000;
    private static final int MAX_ACTION_URL_LENGTH = 2_048;
    private static final Pattern TYPE_PATTERN = Pattern.compile("[A-Za-z0-9_.-]{1,80}");
    private static final ObjectMapper METADATA_MAPPER = new ObjectMapper();

    private final NotificationRepository notificationRepository;
    private final NotificationDeliveryRepository notificationDeliveryRepository;

    @Transactional
    public UUID createNotification(
            UUID userId,
            NotificationType type,
            String title,
            String message,
            Map<String, Object> metadata
    ) {
        if (type == null) {
            throw new IllegalArgumentException("Notification type is required.");
        }
        return createNotification(userId, type.name(), title, message, metadata, null, (short) 0, null);
    }

    /**
     * Creates a direct, user-specific notification. Product code may provide a
     * custom type for new platform capabilities without changing an enum first.
     */
    @Transactional
    public UUID createNotification(
            UUID userId,
            String type,
            String title,
            String message,
            Map<String, Object> metadata,
            String actionUrl,
            short priority,
            Instant expiresAt
    ) {
        if (userId == null) {
            throw new IllegalArgumentException("Notification recipient is required.");
        }
        Notification notification = createNotificationContent(type, title, message, metadata, actionUrl, priority, expiresAt);
        NotificationDelivery delivery = NotificationDelivery.builder()
                .notification(notification)
                .userId(userId)
                .build();
        notificationDeliveryRepository.save(delivery);
        return delivery.getId();
    }

    /**
     * Creates one shared notification and a delivery for each recipient. It is
     * suitable for bounded audiences such as a team. Large campaigns should be
     * scheduled in batches by a future campaign worker rather than loading every
     * recipient into a single request.
     */
    @Transactional
    public UUID createNotificationForUsers(
            Collection<UUID> userIds,
            String type,
            String title,
            String message,
            Map<String, Object> metadata,
            String actionUrl,
            short priority,
            Instant expiresAt
    ) {
        LinkedHashSet<UUID> recipients = new LinkedHashSet<>();
        if (userIds != null) {
            userIds.stream().filter(java.util.Objects::nonNull).forEach(recipients::add);
        }
        if (recipients.isEmpty()) {
            throw new IllegalArgumentException("At least one notification recipient is required.");
        }

        Notification notification = createNotificationContent(type, title, message, metadata, actionUrl, priority, expiresAt);
        notificationDeliveryRepository.saveAll(recipients.stream()
                .map(userId -> NotificationDelivery.builder()
                        .notification(notification)
                        .userId(userId)
                        .build())
                .toList());
        return notification.getId();
    }

    @Transactional(readOnly = true)
    public Page<NotificationResponse> getUserNotifications(UUID userId, int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        return notificationDeliveryRepository
                .findVisibleByUserId(userId, Instant.now(), PageRequest.of(safePage, safeSize))
                .map(NotificationResponse::from);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(UUID userId) {
        return notificationDeliveryRepository.countUnreadVisibleByUserId(userId, Instant.now());
    }

    @Transactional
    public void markAsRead(UUID notificationDeliveryId, UUID userId) {
        notificationDeliveryRepository.findByIdAndUserId(notificationDeliveryId, userId)
                .filter(delivery -> delivery.getReadAt() == null)
                .ifPresent(delivery -> delivery.setReadAt(Instant.now()));
    }

    @Transactional
    public void markAllAsRead(UUID userId) {
        notificationDeliveryRepository.markAllUnreadAsRead(userId, Instant.now());
    }

    private Notification createNotificationContent(
            String type,
            String title,
            String message,
            Map<String, Object> metadata,
            String actionUrl,
            short priority,
            Instant expiresAt
    ) {
        String normalizedType = normalizeType(type);
        requireText(title, "Notification title", MAX_TITLE_LENGTH);
        requireText(message, "Notification message", MAX_MESSAGE_LENGTH);
        if (actionUrl != null && actionUrl.length() > MAX_ACTION_URL_LENGTH) {
            throw new IllegalArgumentException("Notification action URL is too long.");
        }
        if (priority < 0 || priority > 3) {
            throw new IllegalArgumentException("Notification priority must be between 0 and 3.");
        }

        JsonNode metadataNode = metadata == null
                ? METADATA_MAPPER.createObjectNode()
                : METADATA_MAPPER.valueToTree(metadata);

        return notificationRepository.save(Notification.builder()
                .type(normalizedType)
                .title(title.trim())
                .message(message.trim())
                .metadata(metadataNode)
                .actionUrl(actionUrl == null || actionUrl.isBlank() ? null : actionUrl.trim())
                .priority(priority)
                .expiresAt(expiresAt)
                .build());
    }

    private String normalizeType(String type) {
        if (type == null || !TYPE_PATTERN.matcher(type.trim()).matches()) {
            throw new IllegalArgumentException("Notification type must contain 1 to 80 letters, numbers, dots, underscores or hyphens.");
        }
        return type.trim().toUpperCase(Locale.ROOT);
    }

    private void requireText(String value, String field, int maxLength) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " is required.");
        }
        if (value.trim().length() > maxLength) {
            throw new IllegalArgumentException(field + " is too long.");
        }
    }
}
