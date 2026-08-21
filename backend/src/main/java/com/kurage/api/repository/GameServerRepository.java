package com.kurage.api.repository;

import com.kurage.api.domain.GameMode;
import com.kurage.api.domain.GameServer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface GameServerRepository extends JpaRepository<GameServer, UUID> {
    List<GameServer> findByIsOnlineTrue();

    List<GameServer> findByGameMode(GameMode gameMode);

    List<GameServer> findByGameModeAndIsOnlineTrue(GameMode gameMode);

    List<GameServer> findAllByOrderByIsOnlineDescCurrentPlayersDescNameAsc();

    List<GameServer> findByGameModeOrderByIsOnlineDescCurrentPlayersDescNameAsc(GameMode gameMode);

    List<GameServer> findByIsOnlineTrueAndLastHeartbeatBefore(Instant threshold);

    List<GameServer> findByIsOnlineTrueAndLastHeartbeatIsNull();

    @Modifying
    @Query("UPDATE GameServer s SET s.isOnline = false WHERE s.isOnline = true AND (s.lastHeartbeat IS NULL OR s.lastHeartbeat < :threshold)")
    int markServersOfflineOlderThan(@Param("threshold") Instant threshold);
}

