"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface MatchItem {
  id: string;
  mapName: string;
  mapTitle: string;
  result: "WIN" | "LOSS" | "TIE";
  score: string;
  kills: number;
  deaths: number;
  assists: number;
  kd: number;
  rating: number;
  eloDelta: number;
  playedAt: string;
}

interface PlayerMatchesFeedProps {
  matches?: MatchItem[];
}

export function PlayerMatchesFeed({ matches = [] }: PlayerMatchesFeedProps) {
  return (
    <div className="h-full rounded-[24px] bg-[#060a0d]/90 backdrop-blur-2xl border border-white/[0.08] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden relative transition-all duration-300 hover:border-white/[0.16]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
        <div>
          <span className="text-[11px] font-sans font-semibold uppercase tracking-widest text-mute">
            Histórico 5v5
          </span>
          <h3 className="font-sans text-[20px] font-bold text-white tracking-tight mt-0.5">
            Partidas Recentes
          </h3>
        </div>
      </div>

      {/* Match Rows or Clean Empty State */}
      {!matches || matches.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center text-mute">
          <p className="text-[13px] font-sans text-stone-300">Nenhuma partida recente registrada.</p>
          <span className="text-[11px] text-stone-500 mt-1 font-sans">
            Jogue no Mar Aberto para registrar seu histórico competitivo.
          </span>
        </div>
      ) : (
        <div className="mt-2 flex flex-col divide-y divide-white/[0.04]">
          {matches.map((m) => (
            <div
              key={m.id}
              className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors hover:bg-white/[0.01]"
            >
              {/* Left: Map & Score */}
              <div className="flex items-center gap-3.5">
                <span
                  className={cn(
                    "w-1.5 h-7 rounded-full",
                    m.result === "WIN" ? "bg-accent-green" : "bg-accent-red"
                  )}
                />

                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-sans text-[15px] font-bold text-white leading-none">
                      {m.mapTitle}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-mono font-bold uppercase",
                        m.result === "WIN" ? "text-accent-green" : "text-accent-red"
                      )}
                    >
                      {m.result === "WIN" ? "Vitória" : "Derrota"}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-stone-500 mt-1">
                    Placar: <strong className="text-stone-300 font-mono">{m.score}</strong>
                  </span>
                </div>
              </div>

              {/* Middle: Combat Stats */}
              <div className="flex items-center gap-6 text-[12px] font-sans">
                <div className="flex flex-col sm:items-center">
                  <span className="text-[10px] text-stone-500 uppercase">K / D / A</span>
                  <span className="font-mono font-medium text-stone-200 mt-0.5">
                    <strong className="text-white font-bold">{m.kills}</strong> / {m.deaths} / {m.assists}
                  </span>
                </div>

                <div className="flex flex-col sm:items-center">
                  <span className="text-[10px] text-stone-500 uppercase">K/D</span>
                  <span className="font-mono font-bold text-stone-200 mt-0.5">
                    {m.kd.toFixed(2)}
                  </span>
                </div>

                <div className="flex flex-col sm:items-center">
                  <span className="text-[10px] text-stone-500 uppercase">Rating</span>
                  <span className="font-mono font-bold text-[var(--kurage-accent)] mt-0.5">
                    {m.rating.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Right: ELO Delta & Time */}
              <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                <div className="flex flex-col sm:items-end">
                  <span
                    className={cn(
                      "font-mono text-[15px] font-bold leading-none",
                      m.eloDelta > 0 ? "text-accent-green" : "text-accent-red"
                    )}
                  >
                    {m.eloDelta > 0 ? `+${m.eloDelta}` : m.eloDelta} ELO
                  </span>
                  <span className="text-[10px] font-sans text-stone-500 mt-0.5">
                    {m.playedAt}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
