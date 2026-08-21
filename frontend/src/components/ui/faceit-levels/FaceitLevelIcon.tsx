import React from "react";
import { cn } from "@/lib/utils";
import { Level1 } from "./Level1";
import { Level2 } from "./Level2";
import { Level3 } from "./Level3";
import { Level4 } from "./Level4";
import { Level5 } from "./Level5";
import { Level6 } from "./Level6";
import { Level7 } from "./Level7";
import { Level8 } from "./Level8";
import { Level9 } from "./Level9";
import { Level10 } from "./Level10";

interface FaceitLevelIconProps {
  level: number;
  size?: number;
  className?: string;
  expandOnHover?: boolean;
}

export function FaceitLevelIcon({ 
  level, 
  size = 18,
  className = "",
  expandOnHover = true,
}: FaceitLevelIconProps) {
  const clampedLevel = Math.max(1, Math.min(10, Math.round(Number(level) || 1)));

  const levels: Record<number, React.ReactNode> = {
    1: <Level1 />,
    2: <Level2 />,
    3: <Level3 />,
    4: <Level4 />,
    5: <Level5 />,
    6: <Level6 />,
    7: <Level7 />,
    8: <Level8 />,
    9: <Level9 />,
    10: <Level10 />,
  };

  const levelColors: Record<number, string> = {
    1: "text-[#eeeeee]",
    2: "text-[#1ce500]",
    3: "text-[#1ce500]",
    4: "text-[#ffc800]",
    5: "text-[#ffc800]",
    6: "text-[#ffc800]",
    7: "text-[#ffc800]",
    8: "text-[#ff6200]",
    9: "text-[#ff6200]",
    10: "text-[#fe1f00]",
  };

  const Icon = levels[clampedLevel] || <Level1 />;
  const colorClass = levelColors[clampedLevel] || levelColors[1];

  const iconElement = (
    <div
      style={{ width: size, height: size }}
      className={cn(
        "flex items-center justify-center shrink-0 transition-transform duration-300 group-hover/faceit-icon:scale-110 [&>svg]:w-full [&>svg]:h-full select-none",
        colorClass,
        className
      )}
    >
      {Icon}
    </div>
  );

  if (expandOnHover) {
    return (
      <div 
        className="group/faceit-icon inline-flex items-center gap-0 overflow-hidden rounded-full transition-all duration-300 cursor-default p-0.5 hover:bg-white/10 shrink-0"
        title={`Faceit Level ${clampedLevel}`}
      >
        {iconElement}
        <span className="max-w-0 overflow-hidden whitespace-nowrap text-[9px] font-semibold tracking-widest uppercase text-mute group-hover/faceit-icon:text-ink opacity-0 transition-all duration-300 group-hover/faceit-icon:max-w-[110px] group-hover/faceit-icon:opacity-100 group-hover/faceit-icon:pl-1.5 group-hover/faceit-icon:pr-1">
          Faceit {clampedLevel}
        </span>
      </div>
    );
  }

  return iconElement;
}
