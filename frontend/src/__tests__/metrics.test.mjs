import { test } from "node:test";
import assert from "node:assert/strict";
import { tierOf, fillOf, safeRatio } from "../lib/metrics.ts";

const KD = { bounds: [0.9, 1.05, 1.3], ceiling: 2 };
const ADR = { bounds: [65, 75, 88], ceiling: 120 };

test("1. Tier boundaries are inclusive at the lower bound", () => {
  assert.equal(tierOf(0.89, KD), "Ruim");
  assert.equal(tierOf(0.9, KD), "Médio");
  assert.equal(tierOf(1.04, KD), "Médio");
  assert.equal(tierOf(1.05, KD), "Bom");
  assert.equal(tierOf(1.29, KD), "Bom");
  assert.equal(tierOf(1.3, KD), "Excelente");
});

test("2. The gauge reflects the measured value, not a per-tier constant", () => {
  // Two values in the same tier must not draw the same bar. The previous
  // implementation returned a fixed 95/72/48/25 per tier, which made a 1.30 and
  // a 1.90 K/D look identical.
  const low = fillOf(1.3, KD);
  const high = fillOf(1.9, KD);
  assert.equal(tierOf(1.3, KD), tierOf(1.9, KD));
  assert.ok(high > low, "a higher value must fill more of the bar");

  // The fill is the value's real position on its own scale.
  assert.equal(fillOf(1.0, KD), 0.5);
  assert.equal(fillOf(60, ADR), 0.5);
});

test("3. The gauge is clamped and never inverts", () => {
  assert.equal(fillOf(0, KD), 0);
  assert.equal(fillOf(-4, KD), 0);
  assert.equal(fillOf(999, KD), 1);
  assert.equal(fillOf(120, ADR), 1);
});

test("4. A ratio needs a real sample and never resolves to zero", () => {
  assert.equal(safeRatio(30, 20), 1.5);
  // No deaths is not a K/D of 30, and no matches is not a win rate of 0.
  assert.equal(safeRatio(30, 0), null);
  assert.equal(safeRatio(0, 0), null);
  assert.equal(safeRatio(undefined, 10), null);
  assert.equal(safeRatio(10, undefined), null);
  assert.equal(safeRatio(null, null), null);
  // A genuine zero numerator over a real sample is still a real measurement.
  assert.equal(safeRatio(0, 10), 0);
});
