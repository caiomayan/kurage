package com.kurage.api.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class User extends Auditable {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "kurage_id", unique = true, nullable = false)
    private Long kurageId;

    @Column(name = "username", unique = true, nullable = false, length = 50)
    private String username;

    @Column(name = "steam_id64", unique = true, nullable = false)
    private String steamId64;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(name = "faceit_username", unique = true)
    private String faceitUsername;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    private UserRole role = UserRole.USER;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "primary_function", nullable = false, length = 20)
    private PlayerFunction primaryFunction = PlayerFunction.CORINGA;

    @Enumerated(EnumType.STRING)
    @Column(name = "secondary_function", length = 20)
    private PlayerFunction secondaryFunction;

    @Column(name = "country", length = 2)
    private String country;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "subscription_tier", nullable = false, length = 10)
    private SubscriptionTier subscriptionTier = SubscriptionTier.FREE;

    @Column(name = "subscription_expires_at")
    private OffsetDateTime subscriptionExpiresAt;

    @Builder.Default
    @Column(name = "is_verified_pro", nullable = false)
    private boolean isVerifiedPro = false;

    @PrePersist
    @PreUpdate
    public void validateFunctions() {
        if (primaryFunction == null) {
            primaryFunction = PlayerFunction.CORINGA;
        }
        
        // Rule 1 and 2: If primary is COACH, or if trying to set COACH as secondary, nullify the secondary
        if (primaryFunction == PlayerFunction.COACH || secondaryFunction == PlayerFunction.COACH) {
            secondaryFunction = null;
        }

        // Rule 3: Primary function cannot be equal to secondary
        if (secondaryFunction != null && primaryFunction == secondaryFunction) {
            secondaryFunction = null; // Remove redundancy
        }
    }

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private PlayerStats playerStats;

    public PlayerStats getStats() {
        return this.playerStats;
    }

    public int getKurageLevel() {
        if (this.playerStats == null || this.playerStats.getKurageElo() == null) {
            return 1;
        }
        return this.playerStats.getKurageLevel();
    }

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private UserFaceit faceit;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private UserInventory inventory;

    @OneToMany(mappedBy = "user", cascade = CascadeType.REMOVE)
    private List<TeamMember> teamMemberships;

    @OneToMany(mappedBy = "invitedUser", cascade = CascadeType.REMOVE)
    private List<TeamInvitation> receivedInvitations;

    @OneToMany(mappedBy = "inviter", cascade = CascadeType.REMOVE)
    private List<TeamInvitation> sentInvitations;

    @OneToMany(mappedBy = "owner", cascade = CascadeType.REMOVE)
    private List<Team> ownedTeams;
}
