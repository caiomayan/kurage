import React from "react";
import { cn } from "@/lib/utils";

interface KurageLevelIconProps {
  level: number;
  className?: string;
  expandOnHover?: boolean;
}

export function KurageLevelIcon({ 
  level, 
  className,
  expandOnHover = true,
}: KurageLevelIconProps) {
  const normalizedLevel = Math.max(0, Math.min(10, Math.round(Number(level) || 0)));
  
  // Scale from very dark (15) to pure white (255)
  // Lvl 0: 15, Lvl 10: 255 => diff = 240, step = 24
  const luma = 15 + (normalizedLevel * 24);
  const textColor = normalizedLevel > 5 ? "#000000" : "#ffffff";
  const borderColor = normalizedLevel > 5 ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.15)";

  const badge = (
    <div 
      className={cn(
        "flex items-center justify-center rounded-full font-sans font-bold shrink-0 shadow-inner overflow-hidden w-4 h-4 text-[9px] transition-transform duration-300 group-hover/kurage-level:scale-110",
        className
      )}
      style={{
        backgroundColor: `rgb(${luma}, ${luma}, ${luma})`,
        color: textColor,
        border: `1px solid ${borderColor}`,
      }}
      title={`Kurage Level ${normalizedLevel}`}
    >
      {normalizedLevel}
    </div>
  );

  if (expandOnHover) {
    return (
      <div
        className="group/kurage-level inline-flex items-center gap-0 overflow-hidden rounded-full transition-all duration-300 cursor-default p-0.5 hover:bg-white/10 shrink-0"
        title={`Kurage Level ${normalizedLevel}`}
      >
        {badge}
        <span className="max-w-0 overflow-hidden whitespace-nowrap text-[9px] font-semibold tracking-widest uppercase text-mute group-hover/kurage-level:text-ink opacity-0 transition-all duration-300 group-hover/kurage-level:max-w-[110px] group-hover/kurage-level:opacity-100 group-hover/kurage-level:pl-1.5 group-hover/kurage-level:pr-1">
          Lvl {normalizedLevel}
        </span>
      </div>
    );
  }

  return badge;
}
