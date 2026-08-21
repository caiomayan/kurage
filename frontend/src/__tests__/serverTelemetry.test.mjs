import { test } from "node:test";
import assert from "node:assert/strict";
import { mapServerPlayersToLiveStats } from "../lib/serverTelemetry.ts";

test("2. Server telemetry mapping groups CT/TR players and computes K/D", () => {
  const players = [
    {
      kurageId: 10,
      username: "Alpha",
      steamId64: "76561198000000001",
      avatarUrl: "https://example.com/a.png",
      team: "CT",
      kurageLevel: 5,
      faceitLevel: 7,
      isVerifiedPro: true,
      kills: 12,
      deaths: 3,
      ping: 42,
      isAlive: true,
    },
    {
      kurageId: 11,
      username: "Bravo",
      steamId64: "76561198000000002",
      avatarUrl: "https://example.com/b.png",
      team: "TR",
      kurageLevel: 2,
      faceitLevel: 3,
      isVerifiedPro: false,
      kills: 0,
      deaths: 4,
      ping: 81,
      isAlive: false,
    },
    {
      kurageId: 12,
      username: "Charlie",
      steamId64: "76561198000000003",
      avatarUrl: "https://example.com/c.png",
      team: "SPEC",
      kurageLevel: 1,
      faceitLevel: 1,
      isVerifiedPro: false,
      kills: 5,
      deaths: 1,
      ping: 20,
      isAlive: true,
    },
  ];

  const result = mapServerPlayersToLiveStats(players);

  assert.equal(result.ctPlayers.length, 1);
  assert.equal(result.trPlayers.length, 1);
  assert.equal(result.ctPlayers[0].username, "Alpha");
  assert.equal(result.trPlayers[0].kdRatio, 0);
  assert.equal(result.ctPlayers[0].kdRatio, 4);
});
