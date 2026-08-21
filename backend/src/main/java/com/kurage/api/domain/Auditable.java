package com.kurage.api.domain;

import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public abstract class Auditable {
    @CreatedDate
    @Column(nullable = false, updatable = false, name = "created_at")
    private Instant createdAt;
    
    @LastModifiedDate
    @Column(nullable = false, name = "updated_at")
    private Instant updatedAt;
}
