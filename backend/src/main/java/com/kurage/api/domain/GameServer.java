package com.kurage.api.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "game_servers")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class GameServer extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Column(nullable = false, length = 255)
    private String hostname;

    @Column(nullable = false)
    private Integer port;

    @Enumerated(EnumType.STRING)
    @Column(name = "game_mode", nullable = false, length = 20)
    private GameMode gameMode;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "server_kind", nullable = false, length = 20)
    private GameServerKind serverKind = GameServerKind.FIXED;

    @Column(name = "current_map", length = 50)
    private String currentMap;

    @Builder.Default
    @Column(name = "current_players", nullable = false)
    private Integer currentPlayers = 0;

    @Column(name = "max_players", nullable = false)
    private Integer maxPlayers;

    @Builder.Default
    @Column(name = "ct_score", nullable = false)
    private Integer ctScore = 0;

    @Builder.Default
    @Column(name = "tr_score", nullable = false)
    private Integer trScore = 0;

    @Builder.Default
    @Column(name = "is_online", nullable = false)
    private boolean isOnline = false;

    @Column(name = "last_heartbeat")
    private Instant lastHeartbeat;

    /** SHA-256 digest of this server's high-entropy heartbeat credential. */
    @Column(name = "api_key_hash", length = 64)
    private String apiKeyHash;
}
