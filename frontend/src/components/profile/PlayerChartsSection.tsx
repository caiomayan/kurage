"use client";

import React, { useState, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { PiChartLineUp, PiCrosshair } from "react-icons/pi";
import { cn } from "@/lib/utils";

export interface EloDataPoint {
  date: string;
  elo: number;
  matchId?: string | number;
}

interface EloEvolutionBentoCellProps {
  history?: EloDataPoint[];
  currentElo?: number | null;
  matchesPlayed?: number;
}

const CALIBRATION_MATCHES_REQUIRED = 5;

// ── BENTO CELL: CALIBRAÇÃO (CURVA DE ELO COM SUPORTE A EARLY-STAGE) ──
export function EloEvolutionBentoCell({
  history,
  currentElo = null,
  matchesPlayed = 0,
}: EloEvolutionBentoCellProps) {
  const [period, setPeriod] = useState<"30d" | "90d" | "all">("30d");

  // A chart is rendered only from persisted history supplied by the API.
  const data = useMemo(() => history ?? [], [history]);

  const isCalibrating = matchesPlayed < CALIBRATION_MATCHES_REQUIRED;

  // Dynamic Y-Axis Domain calculation to prevent broken axes on any ELO range
  const { minElo, maxElo } = useMemo(() => {
    if (data.length === 0) return { minElo: 1800, maxElo: 2200 };
    const elos = data.map((d) => d.elo);
    const min = Math.min(...elos);
    const max = Math.max(...elos);
    const padding = Math.max(50, Math.round((max - min) * 0.2) || 80);
    return {
      minElo: Math.max(0, min - padding),
      maxElo: max + padding,
    };
  }, [data]);

  return (
    <div className="w-full rounded-[12px] bg-[#080808] border border-white/[0.08] p-6 sm:p-8 relative overflow-hidden transition-colors hover:border-white/[0.14]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-sans font-semibold uppercase tracking-widest text-mute">
              Evolução de ELO
            </span>
            {isCalibrating && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold uppercase tracking-wider bg-[var(--kurage-accent)]/10 text-[var(--kurage-accent)] border border-[var(--kurage-accent)]/20">
                Calibrando ({matchesPlayed}/{CALIBRATION_MATCHES_REQUIRED})
              </span>
            )}
          </div>
          <h3 className="font-display text-[22px] sm:text-[26px] font-bold text-ink tracking-tight mt-0.5">
            Calibração de Temporada
          </h3>
        </div>

        {/* Minimal Segmented Selector */}
        {!isCalibrating && (
          <div className="flex items-center gap-1 p-0.5 rounded-[8px] bg-[#111111] border border-white/[0.06] self-start sm:self-auto">
            {(["30d", "90d", "all"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-3 py-1 text-[11px] font-sans font-medium rounded-[6px] transition-all cursor-pointer",
                  period === p
                    ? "bg-white/[0.12] text-ink font-semibold"
                    : "text-mute hover:text-ink"
                )}
              >
                {p === "30d" ? "30 Dias" : p === "90d" ? "90 Dias" : "Tudo"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Case 1: Brand New Player (0 Matches) - Sleek Placeholder */}
      {matchesPlayed === 0 ? (
        <div className="h-[220px] w-full flex flex-col items-center justify-center text-center p-6 mt-4 rounded-lg bg-white/[0.01] border border-dashed border-white/[0.06]">
          <div className="w-10 h-10 rounded-full bg-white/[0.04] flex items-center justify-center mb-3 text-mute">
            <PiCrosshair className="w-5 h-5 opacity-60" />
          </div>
          <span className="font-display text-[18px] font-semibold text-ink">
            Aguardando Primeira Partida
          </span>
          <p className="text-[12px] font-sans text-mute max-w-sm mt-1">
            Jogue partidas competitivas no servidor Kurage para iniciar a calibração de ELO e gerar sua curva de desempenho.
          </p>
        </div>
      ) : data.length === 0 ? (
        /* No synthetic curve: show the factual calibration/history state. */
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex items-center justify-between p-3.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--kurage-accent)]/10 flex items-center justify-center text-[var(--kurage-accent)]">
                <PiChartLineUp className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="text-[13px] font-semibold text-ink block">
                  {isCalibrating ? "Calibração Inicial em Andamento" : "Histórico ainda indisponível"}
                </span>
                <span className="text-[11px] text-mute">
                  {isCalibrating
                    ? `Faltam ${CALIBRATION_MATCHES_REQUIRED - matchesPlayed} partidas para consolidar o índice de ranking.`
                    : "A curva aparecerá quando o histórico oficial de ELO estiver disponível."}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono text-[14px] font-bold text-[var(--kurage-accent)]">
                {isCalibrating
                  ? `${matchesPlayed} / ${CALIBRATION_MATCHES_REQUIRED}`
                  : currentElo != null
                    ? `${currentElo} ELO`
                    : "Sem dado"}
              </span>
            </div>
          </div>
          <div className="flex h-[150px] items-center justify-center rounded-lg border border-dashed border-white/[0.06] bg-white/[0.01] px-6 text-center">
            <p className="max-w-md text-[12px] leading-relaxed text-mute">
              A curva será formada somente com resultados oficiais registrados pela plataforma.
            </p>
          </div>
        </div>
      ) : (
        /* Case 3: Fully Calibrated Active Player - Dynamic Area Chart */
        <div className="h-[220px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="oceanGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--kurage-accent)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--kurage-accent)" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                stroke="rgba(255,255,255,0.12)"
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[minElo, maxElo]}
                stroke="rgba(255,255,255,0.12)"
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickCount={5}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#080808",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "8px",
                  color: "#ededed",
                  padding: "8px 12px",
                }}
                itemStyle={{ color: "var(--kurage-accent)", fontWeight: "bold", fontSize: "12px" }}
                labelStyle={{ color: "rgba(255,255,255,0.5)", marginBottom: "2px", fontSize: "10px" }}
              />
              <Area
                type="monotone"
                dataKey="elo"
                name="Rating ELO"
                stroke="var(--kurage-accent)"
                strokeWidth={1.8}
                fillOpacity={1}
                fill="url(#oceanGradient)"
                activeDot={{ r: 4, fill: "var(--kurage-accent)", stroke: "#080808", strokeWidth: 2 }}
                dot={{ r: 3, fill: "var(--kurage-accent)", stroke: "#080808", strokeWidth: 1.5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
