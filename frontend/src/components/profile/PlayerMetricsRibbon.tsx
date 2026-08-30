"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { PlayerStats } from "@/types/user";

interface PlayerMetricsRibbonProps {
  stats?: PlayerStats | null;
  hltvRating?: number | null;
  kdRatio?: number | null;
  adr?: number | null;
  hsPercentage?: number | null;
  kastPercentage?: number | null;
  winRate?: number | null;
}

interface TierInfo {
  tierLabel: "Ruim" | "Médio" | "Bom" | "Excelente" | "Sem dados";
  barPercent: number;
  barColor: string;
}

function getRatingTier(val: number, hasData: boolean): TierInfo {
  if (!hasData) return { tierLabel: "Sem dados", barPercent: 0, barColor: "#666" };
  if (val >= 1.25) return { tierLabel: "Excelente", barPercent: 95, barColor: "var(--kurage-accent)" };
  if (val >= 1.05) return { tierLabel: "Bom", barPercent: 72, barColor: "#ededed" };
  if (val >= 0.90) return { tierLabel: "Médio", barPercent: 48, barColor: "#888888" };
  return { tierLabel: "Ruim", barPercent: 25, barColor: "#ef4444" };
}

function getKdTier(val: number, hasData: boolean): TierInfo {
  if (!hasData) return { tierLabel: "Sem dados", barPercent: 0, barColor: "#666" };
  if (val >= 1.30) return { tierLabel: "Excelente", barPercent: 95, barColor: "var(--kurage-accent)" };
  if (val >= 1.05) return { tierLabel: "Bom", barPercent: 72, barColor: "#ededed" };
  if (val >= 0.90) return { tierLabel: "Médio", barPercent: 48, barColor: "#888888" };
  return { tierLabel: "Ruim", barPercent: 25, barColor: "#ef4444" };
}

function getAdrTier(val: number, hasData: boolean): TierInfo {
  if (!hasData) return { tierLabel: "Sem dados", barPercent: 0, barColor: "#666" };
  if (val >= 88.0) return { tierLabel: "Excelente", barPercent: 95, barColor: "var(--kurage-accent)" };
  if (val >= 75.0) return { tierLabel: "Bom", barPercent: 72, barColor: "#ededed" };
  if (val >= 65.0) return { tierLabel: "Médio", barPercent: 48, barColor: "#888888" };
  return { tierLabel: "Ruim", barPercent: 25, barColor: "#ef4444" };
}

function getHsTier(val: number, hasData: boolean): TierInfo {
  if (!hasData) return { tierLabel: "Sem dados", barPercent: 0, barColor: "#666" };
  if (val >= 55.0) return { tierLabel: "Excelente", barPercent: 95, barColor: "var(--kurage-accent)" };
  if (val >= 45.0) return { tierLabel: "Bom", barPercent: 70, barColor: "#ededed" };
  if (val >= 35.0) return { tierLabel: "Médio", barPercent: 45, barColor: "#888888" };
  return { tierLabel: "Ruim", barPercent: 22, barColor: "#ef4444" };
}

function getKastTier(val: number, hasData: boolean): TierInfo {
  if (!hasData) return { tierLabel: "Sem dados", barPercent: 0, barColor: "#666" };
  if (val >= 76.0) return { tierLabel: "Excelente", barPercent: 95, barColor: "var(--kurage-accent)" };
  if (val >= 71.0) return { tierLabel: "Bom", barPercent: 72, barColor: "#ededed" };
  if (val >= 65.0) return { tierLabel: "Médio", barPercent: 48, barColor: "#888888" };
  return { tierLabel: "Ruim", barPercent: 25, barColor: "#ef4444" };
}

function getWinRateTier(val: number, hasData: boolean): TierInfo {
  if (!hasData) return { tierLabel: "Sem dados", barPercent: 0, barColor: "#666" };
  if (val >= 65.0) return { tierLabel: "Excelente", barPercent: 95, barColor: "var(--kurage-accent)" };
  if (val >= 53.0) return { tierLabel: "Bom", barPercent: 70, barColor: "#ededed" };
  if (val >= 45.0) return { tierLabel: "Médio", barPercent: 45, barColor: "#888888" };
  return { tierLabel: "Ruim", barPercent: 22, barColor: "#ef4444" };
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

  // Compute metrics from stats if provided
  const computedRating = stats?.hltvRating ?? hltvRating ?? null;
  const computedKd = stats && stats.deaths > 0
    ? stats.kills / stats.deaths
    : stats && stats.kills > 0
      ? stats.kills
      : kdRatio ?? (hasMatches ? 0 : null);
  const computedAdr = stats && stats.roundsPlayed > 0 ? stats.totalDamage / stats.roundsPlayed : adr;
  const computedHs = stats && stats.kills > 0 ? (stats.headshots / stats.kills) * 100 : hsPercentage;
  const computedKast = stats?.kastPercentage ?? kastPercentage ?? null;
  const computedWinRate = stats && stats.matchesPlayed > 0
    ? (stats.matchesWon / stats.matchesPlayed) * 100
    : winRate;

  const hasRating = hasMatches && computedRating != null;
  const hasKd = hasMatches && computedKd != null;
  const hasAdr = hasMatches && computedAdr != null;
  const hasHs = hasMatches && computedHs != null;
  const hasKast = hasMatches && computedKast != null;
  const hasWinRate = hasMatches && computedWinRate != null;

  const metrics = [
    {
      label: "Rating 2.0",
      value: hasRating ? computedRating.toFixed(2) : "—",
      colorClass: "text-[var(--kurage-accent)]",
      tier: getRatingTier(computedRating ?? 0, hasRating),
      description: "HLTV Impacto",
    },
    {
      label: "K/D Ratio",
      value: hasKd ? computedKd.toFixed(2) : "—",
      colorClass: (computedKd ?? 0) >= 1.3 ? "text-white" : (computedKd ?? 0) >= 1.0 ? "text-stone-300" : "text-stone-400",
      tier: getKdTier(computedKd ?? 0, hasKd),
      description: "Eliminações",
    },
    {
      label: "Dano / Round",
      value: hasAdr ? computedAdr.toFixed(1) : "—",
      colorClass: "text-white",
      tier: getAdrTier(computedAdr ?? 0, hasAdr),
      description: "ADR Médio",
    },
    {
      label: "Headshot %",
      value: hasHs ? `${computedHs.toFixed(1)}%` : "—",
      colorClass: "text-white",
      tier: getHsTier(computedHs ?? 0, hasHs),
      description: "Precisão",
    },
    {
      label: "KAST %",
      value: hasKast ? `${computedKast.toFixed(1)}%` : "—",
      colorClass: "text-white",
      tier: getKastTier(computedKast ?? 0, hasKast),
      description: "Consistência",
    },
    {
      label: "Win Rate",
      value: hasWinRate ? `${computedWinRate.toFixed(1)}%` : "—",
      colorClass: "text-white",
      tier: getWinRateTier(computedWinRate ?? 0, hasWinRate),
      description: "Vitórias",
    },
  ];

  return (
    <div className="w-full rounded-[12px] bg-[#080808]/70 backdrop-blur-md border border-white/[0.08] overflow-hidden transition-colors hover:border-white/[0.14]">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 lg:divide-x divide-white/[0.06]">
        {metrics.map((metric, idx) => (
          <div
            key={metric.label}
            className={cn(
              "group/cell flex flex-col items-center justify-center p-4 sm:p-5 text-center transition-colors hover:bg-white/[0.02]",
              idx === 0 && "bg-[var(--kurage-accent)]/[0.02]"
            )}
          >
            {/* Metric Title */}
            <span className="text-[10px] sm:text-[11px] font-sans font-semibold uppercase tracking-widest text-mute mb-1">
              {metric.label}
            </span>

            {/* Metric Value */}
            <span
              className={cn(
                "font-display text-[26px] sm:text-[30px] font-bold leading-tight tracking-tight",
                metric.colorClass || "text-white"
              )}
            >
              {metric.value}
            </span>

            {/* Subtle Tier Gauge Bar */}
            <div className="w-14 sm:w-16 h-[2.5px] rounded-full bg-white/[0.08] overflow-hidden my-2">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${metric.tier.barPercent}%`,
                  backgroundColor: metric.tier.barColor,
                }}
              />
            </div>

            {/* Tier / Subtext Label */}
            <div className="flex items-center gap-1 text-[10px] font-mono tracking-wider uppercase text-mute/70 group-hover/cell:text-mute transition-colors">
              <span>{metric.tier.tierLabel}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
