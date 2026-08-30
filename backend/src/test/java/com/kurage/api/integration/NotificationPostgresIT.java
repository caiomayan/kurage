package com.kurage.api.integration;

import com.kurage.api.domain.NotificationDelivery;
import com.kurage.api.domain.User;
import com.kurage.api.dto.response.NotificationResponse;
import com.kurage.api.repository.NotificationDeliveryRepository;
import com.kurage.api.repository.NotificationRepository;
import com.kurage.api.repository.UserRepository;
import com.kurage.api.service.NotificationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class NotificationPostgresIT extends IntegrationTestSupport {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private NotificationDeliveryRepository notificationDeliveryRepository;

    @Autowired
    private NotificationService notificationService;

    @Test
    void persistsJsonbInboxStateAndFiltersExpiredDeliveriesInRealPostgres() {
        User recipient = userRepository.save(User.builder()
                .kurageId(9_000_001L)
                .username("postgres_notification_user")
                .steamId64("76561198090000001")
                .build());

        UUID visibleDeliveryId = notificationService.createNotification(
                recipient.getId(),
                "platform.announcement",
                "Novidade",
                "Uma atualização está disponível.",
                Map.of("campaignId", "release-2026-08", "teamId", UUID.randomUUID().toString()),
                "/updates/release-2026-08",
                (short) 2,
                Instant.now().plusSeconds(3_600)
        );
        notificationService.createNotification(
                recipient.getId(),
                "platform.expired",
                "Expirada",
                "Esta mensagem não deve aparecer.",
                Map.of(),
                null,
                (short) 0,
                Instant.now().minusSeconds(1)
        );

        var inbox = notificationService.getUserNotifications(recipient.getId(), 0, 20);

        assertThat(inbox.getTotalElements()).isEqualTo(1);
        NotificationResponse response = inbox.getContent().getFirst();
        assertThat(response.id()).isEqualTo(visibleDeliveryId);
        assertThat(response.type()).isEqualTo("PLATFORM.ANNOUNCEMENT");
        assertThat(response.metadata().path("campaignId").asText()).isEqualTo("release-2026-08");
        assertThat(response.actionUrl()).isEqualTo("/updates/release-2026-08");
        assertThat(notificationRepository.count()).isEqualTo(2);
        assertThat(notificationDeliveryRepository.countUnreadVisibleByUserId(recipient.getId(), Instant.now()))
                .isEqualTo(1);

        notificationService.markAsRead(visibleDeliveryId, recipient.getId());

        NotificationDelivery delivery = notificationDeliveryRepository.findById(visibleDeliveryId).orElseThrow();
        assertThat(delivery.getReadAt()).isNotNull();
        assertThat(notificationService.getUnreadCount(recipient.getId())).isZero();
    }
}
