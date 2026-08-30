package com.kurage.api.repository;

import com.kurage.api.domain.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, java.util.UUID> {
}
