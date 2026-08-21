package com.kurage.api.service;

import com.kurage.api.domain.Notification;
import com.kurage.api.domain.enums.NotificationType;
import com.kurage.api.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationService {
    
    private final NotificationRepository notificationRepository;
    
    public void createNotification(UUID userId, NotificationType type, String title, String message, Map<String, Object> metadata) {
        Notification notification = Notification.builder()
                .userId(userId)
                .type(type)
                .title(title)
                .message(message)
                .metadata(metadata)
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();
                
        notificationRepository.save(notification);
    }
    
    public Page<Notification> getUserNotifications(UUID userId, int page, int size) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(page, size));
    }
    
    public long getUnreadCount(UUID userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }
    
    public void markAsRead(String notificationId, UUID userId) {
        notificationRepository.findById(notificationId).ifPresent(notification -> {
            if (notification.getUserId().equals(userId)) {
                notification.setRead(true);
                notificationRepository.save(notification);
            }
        });
    }
    
    public void markAllAsRead(UUID userId) {
        Page<Notification> unread = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, 100)); // Pega os mais recentes
        unread.forEach(n -> {
            if (!n.isRead()) {
                n.setRead(true);
                notificationRepository.save(n);
            }
        });
    }
}
