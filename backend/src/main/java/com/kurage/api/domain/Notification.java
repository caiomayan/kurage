package com.kurage.api.domain;

import com.kurage.api.domain.enums.NotificationType;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;

@Document(collection = "notifications")
@CompoundIndexes({
    @CompoundIndex(name = "idx_user_created", def = "{'userId': 1, 'createdAt': -1}"),
    @CompoundIndex(name = "idx_user_isread", def = "{'userId': 1, 'isRead': 1}")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Notification {
    
    @Id
    private String id;
    
    private UUID userId;
    
    private NotificationType type;
    
    private String title;
    private String message;
    
    private boolean isRead;
    
    private LocalDateTime createdAt;
    
    // Armazena dados flexíveis (ex: ID do time, link da imagem, etc)
    private Map<String, Object> metadata;
}
