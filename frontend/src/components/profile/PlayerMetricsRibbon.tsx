"use client";

import React, { useRef } from "react";
import { gsap } from "gsap";
import { cn } from "@/lib/utils";
import { useGsapScope } from "@/lib/motion";
import type { PlayerStats } from "@/types/user";
import {
  METRIC_SCALES,
  fillOf,
  safeRatio,
  tierOf,
  type MetricScale,
  type TierName,
} from "@/lib/metrics";

interface PlayerMetricsRibbonProps {
  stats?: PlayerStats | null;
  hltvRating?: number | null;
  kdRatio?: number | null;
  adr?: number | null;
  hsPercentage?: number | null;
  kastPercentage?: number | null;
  winRate?: number | null;
}

// The gauge has to stay visible at every tier: --ash and --stone are #333 and
// #222, which disappear against the near-black surface.
const TIER_TONE: Record<TierName, string> = {
  Excelente: "var(--kurage-accent)",
  Bom: "var(--ink)",
  Médio: "var(--body)",
  Ruim: "var(--charcoal)",
};

interface Metric {
  label: string;
  /** Null whenever the value is not measurable; never substituted with zero. */
  value: number | null;
  format: (value: number) => string;
  scale: MetricScale;
  caption: string;
}

/** Animates a value from zero to its measured figure on first paint. */
function MetricValue({
  value,
  format,
}: {
  value: number | null;
  format: (value: number) => string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);

  useGsapScope(
    ref,
    () => {
      if (value === null || !ref.current) return;
      const counter = { current: 0 };
      gsap.to(counter, {
        current: value,
        duration: 0.9,
        ease: "power2.out",
        onUpdate: () => {
          // Written straight to the node: driving a count-up through React state
          // would re-render the whole ribbon on every frame (docs/pt/19 §7.6).
          if (ref.current) ref.current.textContent = format(counter.current);
        },
      });
    },
    [value]
  );

  if (value === null) {
    return (
      <span
        className="font-display text-[26px] font-semibold leading-tight tracking-tight text-[var(--charcoal)] sm:text-[30px]"
        title="Sem partidas válidas processadas"
      >
        —
      </span>
    );
  }

  return (
    <span
      ref={ref}
      className="font-display text-[26px] font-semibold leading-tight tracking-tight text-[var(--ink)] tabular-nums sm:text-[30px]"
    >
      {format(value)}
    </span>
  );
}

export function PlayerMetricsRibbon({
  stats,
  hltvRating = null,
  kdRatio = null,
  adr = null,
  hsPercentage = null,
  kastPercentage = null,
  winRate = null,
}: PlayerMetricsRibbonProps) {
  const hasMatches = (stats?.matchesPlayed ?? 0) > 0;

  // Every metric resolves to a number or to null; nothing falls back to zero.
  const ratio = safeRatio;

  const resolvedRating = hasMatches ? (stats?.hltvRating ?? hltvRating) : null;
  const resolvedKd = hasMatches ? (ratio(stats?.kills, stats?.deaths) ?? kdRatio) : null;
  const resolvedAdr = hasMatches ? (ratio(stats?.totalDamage, stats?.roundsPlayed) ?? adr) : null;
  const resolvedHs = hasMatches
    ? (() => {
        const share = ratio(stats?.headshots, stats?.kills);
        return share !== null ? share * 100 : hsPercentage;
      })()
    : null;
  const resolvedKast = hasMatches ? (stats?.kastPercentage ?? kastPercentage) : null;
  const resolvedWinRate = hasMatches
    ? (() => {
        const share = ratio(stats?.matchesWon, stats?.matchesPlayed);
        return share !== null ? share * 100 : winRate;
      })()
    : null;

  const metrics: Metric[] = [
    {
      // docs/pt/19 §4: the platform indicator is called simply "Rating". It is
      // not the HLTV rating, which is a separate, future, 5v5-only figure and
      // must never be presented as Kurage activity.
      label: "Rating",
      value: resolvedRating,
      format: (v) => v.toFixed(2),
      scale: METRIC_SCALES.rating,
      caption: "Desempenho",
    },
    {
      label: "K/D",
      value: resolvedKd,
      format: (v) => v.toFixed(2),
      scale: METRIC_SCALES.kd,
      caption: "Eliminações",
    },
    {
      label: "Dano / round",
      value: resolvedAdr,
      format: (v) => v.toFixed(1),
      scale: METRIC_SCALES.adr,
      caption: "ADR",
    },
    {
      label: "Headshot",
      value: resolvedHs,
      format: (v) => `${v.toFixed(1)}%`,
      scale: METRIC_SCALES.headshot,
      caption: "Precisão",
    },
    {
      label: "KAST",
      value: resolvedKast,
      format: (v) => `${v.toFixed(1)}%`,
      scale: METRIC_SCALES.kast,
      caption: "Consistência",
    },
    {
      label: "Vitórias",
      value: resolvedWinRate,
      format: (v) => `${v.toFixed(1)}%`,
      scale: METRIC_SCALES.winRate,
      caption: "Win rate",
    },
  ];

  const ribbonRef = useRef<HTMLDivElement | null>(null);

  useGsapScope(ribbonRef, () => {
    gsap.from("[data-gauge]", {
      scaleX: 0,
      transformOrigin: "left center",
      duration: 0.8,
      ease: "power3.out",
      stagger: 0.05,
      delay: 0.15,
    });
  }, []);

  return (
    <div
      ref={ribbonRef}
      className="w-full overflow-hidden rounded-xl border border-[var(--hairline)] bg-[var(--surface-card)]/70 backdrop-blur-md"
    >
      <div className="grid grid-cols-2 divide-y divide-[var(--divider-soft)] sm:grid-cols-3 sm:divide-y-0 lg:grid-cols-6 lg:divide-x">
        {metrics.map((metric) => {
          const tier = metric.value === null ? null : tierOf(metric.value, metric.scale);
          return (
            <div
              key={metric.label}
              className="flex flex-col items-center justify-center p-4 text-center sm:p-5"
            >
              <span className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--body)] sm:text-[11px]">
                {metric.label}
              </span>

              <MetricValue value={metric.value} format={metric.format} />

              <div className="my-2 h-[2.5px] w-14 overflow-hidden rounded-full bg-[var(--hairline)] sm:w-16">
                {metric.value !== null && tier && (
                  <div
                    data-gauge
                    className="h-full rounded-full"
                    style={{
                      width: `${fillOf(metric.value, metric.scale) * 100}%`,
                      backgroundColor: TIER_TONE[tier],
                    }}
                  />
                )}
              </div>

              <span
                className={cn(
                  "font-mono text-[10px] uppercase tracking-wider",
                  tier ? "text-[var(--charcoal)]" : "text-[var(--mute)]"
                )}
              >
                {tier ?? "Sem dados"}
              </span>
              <span className="sr-only">{metric.caption}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
