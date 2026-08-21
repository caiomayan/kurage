"use client";

import React from "react";
import { PiArrowSquareOut } from "react-icons/pi";
import { FaceitLevelIcon } from "@/components/ui/faceit-levels/FaceitLevelIcon";
import type { FaceitProfile } from "@/types/profile";

interface FaceitTelemetryCardProps {
  faceit?: FaceitProfile | null;
}

export function FaceitTelemetryCard({ faceit }: FaceitTelemetryCardProps) {
  if (!faceit || !faceit.username) return null;

  return (
    <div className="h-full rounded-[24px] bg-[#060a0d]/90 backdrop-blur-2xl border border-white/[0.08] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden relative flex flex-col justify-between transition-all duration-300 hover:border-[#ff5500]/35">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <FaceitLevelIcon level={faceit.level || 1} expandOnHover={false} />
          <div>
            <span className="text-[11px] font-sans font-semibold uppercase tracking-widest text-[#ff884d]">
              Sincronização Oficial
            </span>
            <h3 className="font-sans text-[20px] font-bold text-white tracking-tight mt-0.5">
              FACEIT
            </h3>
          </div>
        </div>

        {faceit.faceitUrl && (
          <a
            href={faceit.faceitUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[12px] font-sans font-semibold text-[#ff884d] hover:text-white transition-colors self-start sm:self-auto"
          >
            <span>{faceit.username}</span>
            <PiArrowSquareOut className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* Stats Grid - Apple Clean Style */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="flex flex-col">
          <span className="text-[11px] font-sans font-semibold uppercase tracking-wider text-mute">
            FACEIT ELO
          </span>
          <span className="font-mono text-[24px] sm:text-[28px] font-black text-[#ff884d] leading-none mt-1">
            {faceit.elo || 0}
          </span>
          <span className="text-[11px] font-sans text-stone-500 mt-1">Level {faceit.level || 1}</span>
        </div>

        <div className="flex flex-col">
          <span className="text-[11px] font-sans font-semibold uppercase tracking-wider text-mute">
            K/D Ratio
          </span>
          <span className="font-mono text-[24px] sm:text-[28px] font-black text-white leading-none mt-1">
            {faceit.kdRatio ? faceit.kdRatio.toFixed(2) : "0.00"}
          </span>
          <span className="text-[11px] font-sans text-stone-500 mt-1">Geral FACEIT</span>
        </div>

        <div className="flex flex-col">
          <span className="text-[11px] font-sans font-semibold uppercase tracking-wider text-mute">
            Taxa de Vitória
          </span>
          <span className="font-mono text-[24px] sm:text-[28px] font-black text-white leading-none mt-1">
            {faceit.winRate ? `${faceit.winRate}%` : "0%"}
          </span>
          <span className="text-[11px] font-sans text-stone-500 mt-1 font-mono">{faceit.matches || 0} partidas</span>
        </div>

        <div className="flex flex-col">
          <span className="text-[11px] font-sans font-semibold uppercase tracking-wider text-mute">
            Últimos Jogos
          </span>
          <div className="flex items-center gap-1 mt-2">
            {faceit.recentResults && faceit.recentResults.length > 0 ? (
              faceit.recentResults.map((res, i) => (
                <span
                  key={i}
                  className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-mono font-bold ${
                    res === "W"
                      ? "bg-accent-green/20 text-accent-green border border-accent-green/40"
                      : "bg-accent-red/20 text-accent-red border border-accent-red/40"
                  }`}
                >
                  {res}
                </span>
              ))
            ) : (
              <span className="text-[11px] font-sans text-stone-500 font-medium">Sem partidas</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
