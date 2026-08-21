"use client";

import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface MapData {
  mapName: string;
  winRate: number;
  matches: number;
}

interface MapPerformanceChartProps {
  data: MapData[];
}

export function MapPerformanceChart({ data }: MapPerformanceChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-surface-deep/30 rounded-xl border border-white/5 p-4 text-center">
        <span className="text-mute text-[12px] uppercase tracking-widest">Sem Dados de Mapas</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[160px] relative font-sans font-semibold text-[10px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={data} 
          layout="vertical"
          margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
        >
          <XAxis type="number" hide domain={[0, 100]} />
          <YAxis 
            dataKey="mapName" 
            type="category" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }}
            width={70}
          />
          <Tooltip 
            cursor={{ fill: "rgba(255,255,255,0.05)" }}
            contentStyle={{ 
              backgroundColor: "rgba(10,12,16,0.9)", 
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
              color: "#fff"
            }}
            itemStyle={{ color: "var(--ink)" }}
            formatter={(value: any, name: any) => {
              if (name === "Win Rate") return [`${value}%`, "Win Rate"];
              return [value, name];
            }}
          />
          <Bar dataKey="winRate" name="Win Rate" radius={[0, 4, 4, 0]} barSize={20}>
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.winRate >= 50 ? "var(--accent-blue)" : "rgba(239, 68, 68, 0.8)"} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
