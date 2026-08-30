import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { toServerGameMode } from "../lib/server-selection.ts";

describe("game server selection", () => {
  test("normalizes API modes for the current UI", () => {
    assert.equal(toServerGameMode("COMPETITIVE_5V5"), "COMPETITIVO");
    assert.equal(toServerGameMode("DEATHMATCH"), "DEATHMATCH");
  });
});
