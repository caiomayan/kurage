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

export function FaceitLevelIcon({ level, className = "" }: { level: number, className?: string }) {
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
    10: <Level10 />
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
    10: "text-[#fe1f00]"
  };

  const Icon = levels[level] || <Level1 />;
  const colorClass = levelColors[level] || levelColors[1];

  return (
    <div className={`flex items-center justify-center ${colorClass} ${className}`}>
      {Icon}
    </div>
  );
}
