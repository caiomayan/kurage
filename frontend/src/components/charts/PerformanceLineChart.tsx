"use client";

import React, { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { RankingHistoryPoint } from "@/types/ranking";

interface PerformanceLineChartProps {
  history: RankingHistoryPoint[];
  currentElo: number;
}

export function PerformanceLineChart({ history, currentElo }: PerformanceLineChartProps) {
  const data = useMemo(() => {
    if (!history || history.length === 0) return [];
    
    return history.map(point => {
      const d = new Date(point.date + 'T00:00:00Z');
      return {
        date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        rawDate: d,
        elo: point.kurageElo,
      };
    }).sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
  }, [history]);

  if (data.length < 2) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-surface-deep/30 rounded-xl border border-white/5 p-4 text-center">
        <span className="text-mute text-[12px] uppercase tracking-widest">Sem Histórico Suficiente</span>
        <span className="text-[10px] text-white/30 mt-1">Jogue mais partidas para gerar telemetria.</span>
      </div>
    );
  }

  // Calculate min/max for Y axis slightly padded
  const elos = data.map(d => d.elo);
  const minElo = Math.min(...elos, currentElo);
  const maxElo = Math.max(...elos, currentElo);
  const yDomain = [Math.max(0, minElo - 50), maxElo + 50];

  return (
    <div className="w-full h-full min-h-[160px] relative font-sans font-semibold text-[10px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorElo" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="date" 
            stroke="rgba(255,255,255,0.2)" 
            tick={{ fill: "rgba(255,255,255,0.4)" }}
            tickLine={false}
            axisLine={false}
            minTickGap={20}
          />
          <YAxis 
            domain={yDomain}
            stroke="rgba(255,255,255,0.2)" 
            tick={{ fill: "rgba(255,255,255,0.4)" }}
            tickLine={false}
            axisLine={false}
            tickCount={5}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: "rgba(10,12,16,0.9)", 
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
              color: "#fff"
            }}
            itemStyle={{ color: "var(--accent-blue)" }}
            labelStyle={{ color: "rgba(255,255,255,0.5)", marginBottom: "4px" }}
          />
          <Area 
            type="monotone" 
            dataKey="elo" 
            stroke="var(--accent-blue)" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorElo)" 
            activeDot={{ r: 6, fill: "var(--accent-blue)", stroke: "var(--canvas)", strokeWidth: 2 }}
            dot={{ r: 4, fill: "var(--accent-blue)", stroke: "var(--canvas)", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
