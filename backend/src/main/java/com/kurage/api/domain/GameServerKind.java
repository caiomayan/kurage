package com.kurage.api.domain;

/**
 * Defines how a game server participates in the Kurage fleet.
 * FIXED servers are long-running public services; EPHEMERAL servers are
 * allocated for a match and terminated after their lease ends.
 */
public enum GameServerKind {
    FIXED,
    EPHEMERAL
}
