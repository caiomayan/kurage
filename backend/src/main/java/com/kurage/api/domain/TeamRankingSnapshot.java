package com.kurage.api.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "team_ranking_snapshots", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"team_id", "snapshot_date"})
}, indexes = {
    @Index(name = "idx_team_ranking_date", columnList = "snapshot_date, position")
})
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class TeamRankingSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    @Column(nullable = false)
    private Integer position;

    @Column(name = "team_elo", nullable = false)
    private Integer teamElo;

    @Column(name = "snapshot_date", nullable = false)
    private LocalDate snapshotDate;
}
