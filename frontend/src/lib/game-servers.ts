import {
  mapServerPlayersToLiveStats,
  normalizeServerPlayer,
  type ServerPlayerApiRow,
} from "./serverTelemetry.ts";
import { toServerGameMode } from "./server-selection.ts";
import type { GameServer, LiveServerState } from "../types/server.ts";

export type FixedServerMode = "RETAKE" | "DEATHMATCH";

export type GameServerWithPlayers = GameServer & {
  players?: ServerPlayerApiRow[];
};

export const SERVER_HEARTBEAT_STALE_AFTER_MS = 90_000;

export function isGameServerFresh(
  server: Pick<GameServer, "isOnline" | "lastHeartbeat">,
  observedAt = Date.now(),
) {
  if (!server.isOnline || !server.lastHeartbeat) return false;
  const heartbeatAt = Date.parse(server.lastHeartbeat);
  return Number.isFinite(heartbeatAt)
    && heartbeatAt >= observedAt - SERVER_HEARTBEAT_STALE_AFTER_MS;
}

export function expireStaleServers(
  servers: GameServerWithPlayers[],
  observedAt = Date.now(),
) {
  return servers.map((server) =>
    isGameServerFresh(server, observedAt)
      ? server
      : {
          ...server,
          isOnline: false,
          currentPlayers: 0,
          ctScore: 0,
          trScore: 0,
          players: [],
        },
  );
}

export function getFixedServersByMode(
  servers: GameServerWithPlayers[],
  mode: FixedServerMode,
): GameServerWithPlayers[] {
  return servers
    .filter(
      (server) =>
        server.serverKind === "FIXED" &&
        toServerGameMode(server.gameMode) === mode,
    )
    .sort((left, right) => {
      const leftOnline = isGameServerFresh(left);
      const rightOnline = isGameServerFresh(right);
      if (leftOnline !== rightOnline) return leftOnline ? -1 : 1;
      return left.name.localeCompare(right.name, "pt-BR");
    });
}

export function gameServerToLiveState(
  server: GameServerWithPlayers,
): LiveServerState {
  const players = server.players ?? [];
  const { ctPlayers, trPlayers } = mapServerPlayersToLiveStats(players);
  const ffaPlayers = players
    .map(normalizeServerPlayer)
    .sort((left, right) => right.kills - left.kills);

  return {
    ip: `connect ${server.hostname}:${server.port}`,
    map: server.currentMap ?? "",
    mode: toServerGameMode(server.gameMode),
    status: isGameServerFresh(server) ? "live" : "offline",
    maxPlayers: server.maxPlayers,
    ctScore: server.ctScore,
    trScore: server.trScore,
    ctPlayers,
    trPlayers,
    ffaPlayers,
    totalKills: ffaPlayers.reduce((total, player) => total + player.kills, 0),
    killLeader: ffaPlayers[0]
      ? {
          username: ffaPlayers[0].username,
          kills: ffaPlayers[0].kills,
        }
      : undefined,
  };
}
