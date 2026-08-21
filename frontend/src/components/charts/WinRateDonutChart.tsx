"use client";

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface WinRateDonutChartProps {
  wins: number;
  matches: number;
}

export function WinRateDonutChart({ wins, matches }: WinRateDonutChartProps) {
  const losses = Math.max(0, matches - wins);
  
  const data = [
    { name: "Vitórias", value: wins },
    { name: "Derrotas", value: losses },
  ];

  // Cores: A cor de identidade para vitórias (accent-blue), cinza escuro para derrotas
  const COLORS = ["var(--accent-blue)", "rgba(255,255,255,0.05)"];

  const winRate = matches > 0 ? Math.round((wins / matches) * 100) : 0;

  return (
    <div className="w-full h-full min-h-[140px] relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="65%"
            outerRadius="85%"
            paddingAngle={2}
            dataKey="value"
            stroke="none"
            cornerRadius={4}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: "rgba(10,12,16,0.9)", 
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
              color: "#fff",
              fontSize: "12px",
              fontWeight: 600
            }}
            itemStyle={{ color: "var(--ink)" }}
          />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Texto centralizado no donut */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="font-display text-[26px] text-ink leading-none">{winRate}%</span>
      </div>
    </div>
  );
}
