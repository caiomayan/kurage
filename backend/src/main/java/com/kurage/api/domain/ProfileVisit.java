package com.kurage.api.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "profile_visits", indexes = {
    @Index(name = "idx_profile_visits_visited", columnList = "visited_user_id, visited_at DESC")
})
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ProfileVisit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "visited_user_id", nullable = false)
    private User visitedUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "visitor_user_id", nullable = false)
    private User visitorUser;

    @CreationTimestamp
    @Column(name = "visited_at", nullable = false, updatable = false)
    private Instant visitedAt;
}
