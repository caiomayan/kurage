package com.kurage.api.domain;

import jakarta.persistence.*;
import lombok.*;

import org.springframework.data.domain.Persistable;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "users_faceit", indexes = {
    @Index(name = "idx_users_faceit_elo", columnList = "elo DESC")
})
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UserFaceit extends Auditable implements Persistable<UUID> {
    @Id
    @Column(name = "user_id")
    private UUID userId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private User user;

    @Column(name = "faceit_id", unique = true, nullable = false)
    private String faceitId;

    @Column(name="level",nullable = false)
    private Integer level;

    @Column(name="elo",nullable = false)
    private Integer elo;

    @Column(name = "kd_ratio", precision = 4, scale = 2)
    private BigDecimal kdRatio;

    @Column(name = "win_rate")
    private Integer winRate;

    @Column(name = "matches")
    private Integer matches;

    @Override
    public UUID getId() {
        return userId;
    }

    @Override
    public boolean isNew() {
        return super.getCreatedAt() == null;
    }
}
