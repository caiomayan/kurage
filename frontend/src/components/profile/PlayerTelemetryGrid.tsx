"use client";

import React from "react";
import type { PlayerStats } from "@/types/user";

interface PlayerTelemetryGridProps {
  stats?: PlayerStats | null;
  peakElo?: number | null;
}

export function PlayerTelemetryGrid({
  stats,
  peakElo,
}: PlayerTelemetryGridProps) {
  const matches = stats?.matchesPlayed ?? 0;
  const wins = stats?.matchesWon ?? 0;
  const losses = Math.max(0, matches - wins);
  const winRate = matches > 0 ? ((wins / matches) * 100).toFixed(1) : "0.0";
  
  const kills = stats?.kills ?? 0;
  const deaths = stats?.deaths ?? 0;
  const kdRatio = deaths > 0 ? (kills / deaths).toFixed(2) : kills > 0 ? kills.toFixed(2) : "0.00";
  
  const headshots = stats?.headshots ?? 0;
  const hsRate = kills > 0 ? ((headshots / kills) * 100).toFixed(1) : "0.0";

  const rounds = stats?.roundsPlayed ?? 0;
  const totalDamage = stats?.totalDamage ?? 0;
  const adr = rounds > 0 ? (totalDamage / rounds).toFixed(1) : "0.0";

  const elo = matches > 0 ? stats?.kurageElo ?? null : null;
  const peak = elo != null ? peakElo ?? elo : null;

  return (
    <div className="h-full rounded-[24px] bg-[#060a0d]/90 backdrop-blur-2xl border border-white/[0.08] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col justify-between overflow-hidden relative transition-all duration-300 hover:border-white/[0.16]">
      {/* 1. Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
        <div>
          <span className="text-[11px] font-sans font-semibold uppercase tracking-widest text-mute">
            Estatísticas
          </span>
          <h3 className="font-sans text-[20px] font-bold text-white tracking-tight mt-0.5">
            Telemetria de Combate
          </h3>
        </div>
        <span className="text-[12px] font-mono text-stone-400">
          {matches} {matches === 1 ? "partida" : "partidas"}
        </span>
      </div>

      {/* 2. Keynote-style Telemetry Grid */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-6">
        {/* 1. Rating ELO */}
        <div className="flex flex-col">
          <span className="text-[11px] font-sans font-semibold uppercase tracking-wider text-mute">
            Rating ELO
          </span>
          <span className="font-mono text-[30px] sm:text-[36px] font-black text-[var(--kurage-accent)] leading-tight tracking-tight mt-1">
            {elo ?? "—"}
          </span>
          <span className="text-[11px] font-sans text-stone-500 mt-1">
            {peak != null ? <>Pico: <strong className="text-stone-300 font-mono">{peak}</strong></> : "Em calibração"}
          </span>
        </div>

        {/* 2. K/D Ratio */}
        <div className="flex flex-col">
          <span className="text-[11px] font-sans font-semibold uppercase tracking-wider text-mute">
            K/D Ratio
          </span>
          <span className="font-mono text-[30px] sm:text-[36px] font-black text-white leading-tight tracking-tight mt-1">
            {matches > 0 ? kdRatio : "-"}
          </span>
          <span className="text-[11px] font-sans text-stone-500 mt-1">
            <span className="font-mono text-stone-300">{kills.toLocaleString()}</span> K / <span className="font-mono text-stone-300">{deaths.toLocaleString()}</span> D
          </span>
        </div>

        {/* 3. Taxa de Vitória */}
        <div className="flex flex-col">
          <span className="text-[11px] font-sans font-semibold uppercase tracking-wider text-mute">
            Taxa de Vitória
          </span>
          <span className="font-mono text-[30px] sm:text-[36px] font-black text-white leading-tight tracking-tight mt-1">
            {matches > 0 ? `${winRate}%` : "-"}
          </span>
          <span className="text-[11px] font-sans text-stone-500 mt-1">
            <span className="text-accent-green font-mono font-semibold">{wins}V</span> - <span className="text-accent-red font-mono font-semibold">{losses}D</span>
          </span>
        </div>

        {/* 4. Dano Médio (ADR) */}
        <div className="flex flex-col">
          <span className="text-[11px] font-sans font-semibold uppercase tracking-wider text-mute">
            Dano Médio (ADR)
          </span>
          <span className="font-mono text-[30px] sm:text-[36px] font-black text-white leading-tight tracking-tight mt-1">
            {rounds > 0 ? adr : "-"}
          </span>
          <span className="text-[11px] font-sans text-stone-500 mt-1">
            <span className="font-mono">{rounds.toLocaleString()}</span> rounds
          </span>
        </div>

        {/* 5. Headshot % */}
        <div className="flex flex-col pt-3 border-t border-white/[0.04]">
          <span className="text-[11px] font-sans font-semibold uppercase tracking-wider text-mute">
            Headshot %
          </span>
          <span className="font-mono text-[22px] sm:text-[26px] font-bold text-white leading-tight mt-1">
            {kills > 0 ? `${hsRate}%` : "-"}
          </span>
          <span className="text-[10px] font-sans text-stone-500 mt-1">
            <span className="font-mono">{headshots.toLocaleString()}</span> HS
          </span>
        </div>

        {/* 6. Taxa KAST */}
        <div className="flex flex-col pt-3 border-t border-white/[0.04]">
          <span className="text-[11px] font-sans font-semibold uppercase tracking-wider text-mute">
            KAST %
          </span>
          <span className="font-mono text-[22px] sm:text-[26px] font-bold text-white leading-tight mt-1">
            {matches > 0 && stats?.kastPercentage ? `${stats.kastPercentage.toFixed(1)}%` : "-"}
          </span>
          <span className="text-[10px] font-sans text-stone-500 mt-1">
            Presença em rounds
          </span>
        </div>

        {/* 7. Abates Totais */}
        <div className="flex flex-col pt-3 border-t border-white/[0.04]">
          <span className="text-[11px] font-sans font-semibold uppercase tracking-wider text-mute">
            Abates Totais
          </span>
          <span className="font-mono text-[22px] sm:text-[26px] font-bold text-white leading-tight mt-1">
            {kills.toLocaleString()}
          </span>
          <span className="text-[10px] font-sans text-stone-500 mt-1">
            {stats?.assists ?? 0} assistências
          </span>
        </div>

        {/* 8. Nível Kurage */}
        <div className="flex flex-col pt-3 border-t border-white/[0.04]">
          <span className="text-[11px] font-sans font-semibold uppercase tracking-wider text-mute">
            Nível Kurage
          </span>
          <span className="font-mono text-[22px] sm:text-[26px] font-bold text-white leading-tight mt-1">
            {stats?.kurageLevel ? `Lv. ${stats.kurageLevel}` : "Sem nível"}
          </span>
          <span className="text-[10px] font-sans text-stone-500 mt-1">
            {stats?.kurageLevel ? "Calibrado" : "Em calibração"}
          </span>
        </div>
      </div>
    </div>
  );
}
