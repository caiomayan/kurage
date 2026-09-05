/**
 * Competitive metric scales.
 *
 * Kept out of the component so the thresholds are testable and so a single
 * table replaces the six near-identical `get*Tier` functions the ribbon used to
 * carry, which differed only in their numbers.
 */

export type TierName = "Ruim" | "Médio" | "Bom" | "Excelente";

export interface MetricScale {
  /** Lower bound of Médio, Bom and Excelente, in order. */
  bounds: [number, number, number];
  /** Value that fills the gauge completely; the floor is always 0. */
  ceiling: number;
}

export function tierOf(value: number, scale: MetricScale): TierName {
  const [medio, bom, excelente] = scale.bounds;
  if (value >= excelente) return "Excelente";
  if (value >= bom) return "Bom";
  if (value >= medio) return "Médio";
  return "Ruim";
}

/**
 * How full the gauge is: the measured value's position on its own scale.
 *
 * Not a decorative constant. The previous implementation returned a fixed
 * 95/72/48/25 per tier, so two very different values drew an identical bar and
 * the bar implied a precision the data did not have.
 */
export function fillOf(value: number, scale: MetricScale): number {
  return Math.max(0, Math.min(1, value / scale.ceiling));
}

/**
 * Divides only when the denominator is a real sample.
 *
 * Returns null rather than zero: an account with no processed match has no
 * K/D, and printing `0.00` would publish a fabricated statistic instead of an
 * absent one (CLAUDE.md invariant 1).
 */
export function safeRatio(
  numerator: number | null | undefined,
  denominator: number | null | undefined
): number | null {
  if (numerator === null || numerator === undefined) return null;
  if (denominator === null || denominator === undefined || denominator <= 0) return null;
  return numerator / denominator;
}

export const METRIC_SCALES = {
  rating: { bounds: [0.9, 1.05, 1.25], ceiling: 1.6 } as MetricScale,
  kd: { bounds: [0.9, 1.05, 1.3], ceiling: 2 } as MetricScale,
  adr: { bounds: [65, 75, 88], ceiling: 120 } as MetricScale,
  headshot: { bounds: [35, 45, 55], ceiling: 100 } as MetricScale,
  kast: { bounds: [65, 71, 76], ceiling: 100 } as MetricScale,
  winRate: { bounds: [45, 53, 65], ceiling: 100 } as MetricScale,
} as const;
