package com.kurage.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kurage.api.domain.Notification;
import com.kurage.api.domain.NotificationDelivery;
import com.kurage.api.domain.enums.NotificationType;
import com.kurage.api.dto.response.NotificationResponse;
import com.kurage.api.repository.NotificationDeliveryRepository;
import com.kurage.api.repository.NotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private NotificationDeliveryRepository notificationDeliveryRepository;

    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        notificationService = new NotificationService(
                notificationRepository,
                notificationDeliveryRepository
        );
    }

    @Test
    void createsTeamNotificationAsPostgresContentAndRecipientDelivery() {
        UUID recipientId = UUID.randomUUID();
        UUID notificationId = UUID.randomUUID();
        UUID deliveryId = UUID.randomUUID();

        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> {
            Notification notification = invocation.getArgument(0);
            notification.setId(notificationId);
            return notification;
        });
        when(notificationDeliveryRepository.save(any(NotificationDelivery.class))).thenAnswer(invocation -> {
            NotificationDelivery delivery = invocation.getArgument(0);
            delivery.setId(deliveryId);
            return delivery;
        });

        UUID returnedId = notificationService.createNotification(
                recipientId,
                NotificationType.TEAM_INVITE,
                "Convite de Time",
                "Você foi convidado para um time.",
                Map.of("teamId", "team-1")
        );

        ArgumentCaptor<Notification> notificationCaptor = ArgumentCaptor.forClass(Notification.class);
        ArgumentCaptor<NotificationDelivery> deliveryCaptor = ArgumentCaptor.forClass(NotificationDelivery.class);
        verify(notificationRepository).save(notificationCaptor.capture());
        verify(notificationDeliveryRepository).save(deliveryCaptor.capture());

        Notification savedNotification = notificationCaptor.getValue();
        assertEquals("TEAM_INVITE", savedNotification.getType());
        assertEquals("team-1", savedNotification.getMetadata().path("teamId").asText());
        assertEquals(recipientId, deliveryCaptor.getValue().getUserId());
        assertEquals(savedNotification, deliveryCaptor.getValue().getNotification());
        assertEquals(deliveryId, returnedId);
    }

    @Test
    void createsOneContentRecordForABoundedMultiRecipientPlatformAnnouncement() {
        UUID firstRecipient = UUID.randomUUID();
        UUID secondRecipient = UUID.randomUUID();
        UUID notificationId = UUID.randomUUID();

        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> {
            Notification notification = invocation.getArgument(0);
            notification.setId(notificationId);
            return notification;
        });

        UUID returnedId = notificationService.createNotificationForUsers(
                List.of(firstRecipient, secondRecipient, firstRecipient),
                "platform.announcement",
                "Atualização Kurage",
                "Uma nova funcionalidade está disponível.",
                Map.of("campaign", "release-1"),
                "/updates/release-1",
                (short) 2,
                Instant.now().plusSeconds(3_600)
        );

        ArgumentCaptor<Iterable<NotificationDelivery>> deliveriesCaptor = ArgumentCaptor.captor();
        verify(notificationRepository).save(any(Notification.class));
        verify(notificationDeliveryRepository).saveAll(deliveriesCaptor.capture());

        List<NotificationDelivery> deliveries = new java.util.ArrayList<>();
        deliveriesCaptor.getValue().forEach(deliveries::add);
        assertEquals(2, deliveries.size());
        assertTrue(deliveries.stream().allMatch(delivery -> delivery.getNotification().getId().equals(notificationId)));
        assertEquals(notificationId, returnedId);
    }

    @Test
    void returnsOnlyVisibleInboxItemsAndCapsPageSize() {
        UUID userId = UUID.randomUUID();
        UUID deliveryId = UUID.randomUUID();
        Instant createdAt = Instant.parse("2026-08-21T12:00:00Z");
        Notification notification = Notification.builder()
                .id(UUID.randomUUID())
                .type("PLATFORM_SUGGESTION")
                .title("Sugestão")
                .message("Complete seu perfil.")
                .metadata(new ObjectMapper().createObjectNode())
                .priority((short) 1)
                .build();
        NotificationDelivery delivery = NotificationDelivery.builder()
                .id(deliveryId)
                .notification(notification)
                .userId(userId)
                .createdAt(createdAt)
                .build();

        when(notificationDeliveryRepository.findVisibleByUserId(eq(userId), any(Instant.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(delivery)));

        var page = notificationService.getUserNotifications(userId, -5, 5_000);

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(notificationDeliveryRepository).findVisibleByUserId(eq(userId), any(Instant.class), pageableCaptor.capture());
        NotificationResponse response = page.getContent().getFirst();
        assertEquals(0, pageableCaptor.getValue().getPageNumber());
        assertEquals(100, pageableCaptor.getValue().getPageSize());
        assertEquals(deliveryId, response.id());
        assertFalse(response.metadata().isMissingNode());
    }

    @Test
    void rejectsMalformedTypesAndInvalidPriorities() {
        UUID userId = UUID.randomUUID();

        assertThrows(IllegalArgumentException.class, () -> notificationService.createNotification(
                userId, "invalid type with spaces", "Título", "Mensagem", Map.of(), null, (short) 0, null));
        assertThrows(IllegalArgumentException.class, () -> notificationService.createNotification(
                userId, "SYSTEM", "Título", "Mensagem", Map.of(), null, (short) 4, null));
    }
}
