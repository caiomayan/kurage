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
  tierLabel: "Ruim" | "Médio" | "Bom" | "Excelente" | "Calibrando";
  barPercent: number;
  barColor: string;
}

function getRatingTier(val: number, hasMatches: boolean): TierInfo {
  if (!hasMatches) return { tierLabel: "Calibrando", barPercent: 0, barColor: "#666" };
  if (val >= 1.25) return { tierLabel: "Excelente", barPercent: 95, barColor: "#a9c8c0" };
  if (val >= 1.05) return { tierLabel: "Bom", barPercent: 72, barColor: "#ededed" };
  if (val >= 0.90) return { tierLabel: "Médio", barPercent: 48, barColor: "#888888" };
  return { tierLabel: "Ruim", barPercent: 25, barColor: "#ef4444" };
}

function getKdTier(val: number, hasMatches: boolean): TierInfo {
  if (!hasMatches) return { tierLabel: "Calibrando", barPercent: 0, barColor: "#666" };
  if (val >= 1.30) return { tierLabel: "Excelente", barPercent: 95, barColor: "#a9c8c0" };
  if (val >= 1.05) return { tierLabel: "Bom", barPercent: 72, barColor: "#ededed" };
  if (val >= 0.90) return { tierLabel: "Médio", barPercent: 48, barColor: "#888888" };
  return { tierLabel: "Ruim", barPercent: 25, barColor: "#ef4444" };
}

function getAdrTier(val: number, hasMatches: boolean): TierInfo {
  if (!hasMatches) return { tierLabel: "Calibrando", barPercent: 0, barColor: "#666" };
  if (val >= 88.0) return { tierLabel: "Excelente", barPercent: 95, barColor: "#a9c8c0" };
  if (val >= 75.0) return { tierLabel: "Bom", barPercent: 72, barColor: "#ededed" };
  if (val >= 65.0) return { tierLabel: "Médio", barPercent: 48, barColor: "#888888" };
  return { tierLabel: "Ruim", barPercent: 25, barColor: "#ef4444" };
}

function getHsTier(val: number, hasMatches: boolean): TierInfo {
  if (!hasMatches) return { tierLabel: "Calibrando", barPercent: 0, barColor: "#666" };
  if (val >= 55.0) return { tierLabel: "Excelente", barPercent: 95, barColor: "#a9c8c0" };
  if (val >= 45.0) return { tierLabel: "Bom", barPercent: 70, barColor: "#ededed" };
  if (val >= 35.0) return { tierLabel: "Médio", barPercent: 45, barColor: "#888888" };
  return { tierLabel: "Ruim", barPercent: 22, barColor: "#ef4444" };
}

function getKastTier(val: number, hasMatches: boolean): TierInfo {
  if (!hasMatches) return { tierLabel: "Calibrando", barPercent: 0, barColor: "#666" };
  if (val >= 76.0) return { tierLabel: "Excelente", barPercent: 95, barColor: "#a9c8c0" };
  if (val >= 71.0) return { tierLabel: "Bom", barPercent: 72, barColor: "#ededed" };
  if (val >= 65.0) return { tierLabel: "Médio", barPercent: 48, barColor: "#888888" };
  return { tierLabel: "Ruim", barPercent: 25, barColor: "#ef4444" };
}

function getWinRateTier(val: number, hasMatches: boolean): TierInfo {
  if (!hasMatches) return { tierLabel: "Calibrando", barPercent: 0, barColor: "#666" };
  if (val >= 65.0) return { tierLabel: "Excelente", barPercent: 95, barColor: "#a9c8c0" };
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
  const computedRating = stats?.hltvRating ?? hltvRating ?? (hasMatches ? 1.0 : 0);
  const computedKd = stats && stats.deaths > 0 ? stats.kills / stats.deaths : kdRatio ?? (hasMatches ? 1.0 : 0);
  const computedAdr = stats && stats.roundsPlayed > 0 ? stats.totalDamage / stats.roundsPlayed : adr ?? 0;
  const computedHs = stats && stats.kills > 0 ? (stats.headshots / stats.kills) * 100 : hsPercentage ?? 0;
  const computedKast = stats?.kastPercentage ?? kastPercentage ?? 0;
  const computedWinRate = stats && stats.matchesPlayed > 0 ? (stats.matchesWon / stats.matchesPlayed) * 100 : winRate ?? 0;

  const metrics = [
    {
      label: "Rating 2.0",
      value: hasMatches && computedRating > 0 ? computedRating.toFixed(2) : "-",
      colorClass: "text-[#a9c8c0]",
      tier: getRatingTier(computedRating, hasMatches),
      description: "HLTV Impacto",
    },
    {
      label: "K/D Ratio",
      value: hasMatches && computedKd > 0 ? computedKd.toFixed(2) : "-",
      colorClass: computedKd >= 1.3 ? "text-white" : computedKd >= 1.0 ? "text-stone-300" : "text-stone-400",
      tier: getKdTier(computedKd, hasMatches),
      description: "Eliminações",
    },
    {
      label: "Dano / Round",
      value: hasMatches && computedAdr > 0 ? computedAdr.toFixed(1) : "-",
      colorClass: "text-white",
      tier: getAdrTier(computedAdr, hasMatches),
      description: "ADR Médio",
    },
    {
      label: "Headshot %",
      value: hasMatches && computedHs > 0 ? `${computedHs.toFixed(1)}%` : "-",
      colorClass: "text-white",
      tier: getHsTier(computedHs, hasMatches),
      description: "Precisão",
    },
    {
      label: "KAST %",
      value: hasMatches && computedKast > 0 ? `${computedKast.toFixed(1)}%` : "-",
      colorClass: "text-white",
      tier: getKastTier(computedKast, hasMatches),
      description: "Consistência",
    },
    {
      label: "Win Rate",
      value: hasMatches ? `${computedWinRate.toFixed(1)}%` : "-",
      colorClass: "text-white",
      tier: getWinRateTier(computedWinRate, hasMatches),
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
              idx === 0 && "bg-[#a9c8c0]/[0.02]"
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
