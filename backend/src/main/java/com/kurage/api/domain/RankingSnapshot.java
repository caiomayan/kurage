package com.kurage.api.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "ranking_snapshots", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "snapshot_date"})
}, indexes = {
    @Index(name = "idx_ranking_snapshot_date", columnList = "snapshot_date, position")
})
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class RankingSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private Integer position;

    @Column(name = "kurage_elo", nullable = false)
    private Integer kurageElo;

    @Column(name = "snapshot_date", nullable = false)
    private LocalDate snapshotDate;
}
