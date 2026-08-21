package com.kurage.api.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "team_members", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"team_id", "user_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeamMember {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "team_role", nullable = false, length = 20)
    private TeamRole teamRole;

    @Enumerated(EnumType.STRING)
    @Column(name = "team_function", length = 20)
    private InGameFunction teamFunction;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "management_role", nullable = false, length = 10)
    private ManagementRole managementRole = ManagementRole.MEMBER;

    @CreationTimestamp
    @Column(name = "joined_at", nullable = false, updatable = false)
    private Instant joinedAt;

    public boolean isManager() {
        return managementRole == ManagementRole.OWNER || managementRole == ManagementRole.ADMIN;
    }

    public boolean isOwner() {
        return managementRole == ManagementRole.OWNER;
    }

    public boolean isAdmin() {
        return managementRole == ManagementRole.ADMIN;
    }
}
