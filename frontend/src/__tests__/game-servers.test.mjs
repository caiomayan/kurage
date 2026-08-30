import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  expireStaleServers,
  gameServerToLiveState,
  getFixedServersByMode,
  isGameServerFresh,
} from "../lib/game-servers.ts";

function server(overrides = {}) {
  return {
    id: "retake-1",
    name: "Kurage Retake #1",
    hostname: "127.0.0.1",
    port: 27015,
    gameMode: "RETAKE",
    serverKind: "FIXED",
    currentMap: "de_mirage",
    currentPlayers: 2,
    maxPlayers: 10,
    ctScore: 4,
    trScore: 3,
    isOnline: true,
    lastHeartbeat: new Date().toISOString(),
    players: [],
    ...overrides,
  };
}

describe("fixed game server directory", () => {
  test("groups only fixed servers and keeps online servers first", () => {
    const offline = server({ id: "offline", name: "B", isOnline: false });
    const online = server({ id: "online", name: "A" });
    const mix = server({ id: "mix", serverKind: "EPHEMERAL", gameMode: "COMPETITIVE_5V5" });

    assert.deepEqual(
      getFixedServersByMode([offline, mix, online], "RETAKE").map(({ id }) => id),
      ["online", "offline"],
    );
  });

  test("maps persisted heartbeat scores instead of inventing values", () => {
    const live = gameServerToLiveState(server());
    assert.equal(live.ctScore, 4);
    assert.equal(live.trScore, 3);
    assert.equal(live.mode, "RETAKE");
  });

  test("expires stale telemetry instead of preserving a ghost server", () => {
    const observedAt = Date.parse("2026-08-26T12:00:00.000Z");
    const stale = server({
      lastHeartbeat: "2026-08-26T11:58:29.000Z",
      players: [{ username: "Ghost", team: "CT" }],
    });

    assert.equal(isGameServerFresh(stale, observedAt), false);
    assert.deepEqual(expireStaleServers([stale], observedAt)[0], {
      ...stale,
      isOnline: false,
      currentPlayers: 0,
      ctScore: 0,
      trScore: 0,
      players: [],
    });
  });

  test("requires a heartbeat even when the persisted online flag is true", () => {
    assert.equal(isGameServerFresh(server({ lastHeartbeat: null })), false);
  });
});
