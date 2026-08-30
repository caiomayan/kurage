"use client";

const plankton = [
  ["8%", "25%", 4],
  ["18%", "65%", 6],
  ["28%", "40%", 5],
  ["42%", "80%", 7],
  ["58%", "35%", 4],
  ["72%", "70%", 6],
  ["85%", "30%", 5],
  ["92%", "60%", 4],
] as const;

export function RankingOceanicBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 select-none overflow-hidden bg-[#020507] [contain:strict]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_100%_at_50%_0%,#061921_0%,#030b0e_45%,#010406_100%)] opacity-80" />

      <div className="absolute inset-0 opacity-20 mix-blend-screen">
        <div className="absolute -top-[20%] left-[20%] h-[140%] w-[180px] origin-top -rotate-[16deg] bg-[linear-gradient(180deg,rgba(var(--kurage-accent-rgb),.30)_0%,rgba(146,188,227,.10)_60%,transparent_100%)] blur-3xl" />
        <div className="absolute -top-[15%] left-1/2 h-[140%] w-[340px] -translate-x-1/2 bg-[linear-gradient(180deg,rgba(229,193,88,.20)_0%,rgba(var(--kurage-accent-rgb),.17)_40%,rgba(146,188,227,.07)_80%,transparent_100%)] blur-3xl" />
        <div className="absolute -top-[20%] right-[20%] h-[140%] w-[180px] origin-top rotate-[16deg] bg-[linear-gradient(180deg,rgba(146,188,227,.25)_0%,rgba(var(--kurage-accent-rgb),.09)_60%,transparent_100%)] blur-3xl" />
      </div>

      <div className="absolute -left-[10%] -top-[10%] h-[480px] w-[120%] bg-[radial-gradient(ellipse_at_50%_20%,rgba(var(--kurage-accent-rgb),.20)_0%,rgba(14,80,96,.14)_50%,transparent_80%)] opacity-45 mix-blend-screen blur-3xl" />
      <div className="absolute right-[-12%] top-[35%] h-[620px] w-[760px] rounded-full bg-[radial-gradient(circle,rgba(146,188,227,.13)_0%,rgba(14,60,80,.09)_50%,transparent_75%)] opacity-40 mix-blend-screen blur-3xl" />

      <div className="absolute left-[12%] top-[22%] h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(var(--kurage-accent-rgb),.34)_0%,rgba(146,188,227,.10)_50%,transparent_70%)] opacity-35 mix-blend-screen blur-2xl" />
      <div className="absolute right-[16%] top-[36%] h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(146,188,227,.30)_0%,rgba(var(--kurage-accent-rgb),.09)_50%,transparent_70%)] opacity-30 mix-blend-screen blur-2xl" />
      <div className="absolute bottom-[16%] left-[44%] h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(229,193,88,.20)_0%,rgba(var(--kurage-accent-rgb),.12)_50%,transparent_70%)] opacity-30 mix-blend-screen blur-3xl" />

      {plankton.map(([left, top, size], index) => (
        <span
          key={index}
          className="absolute rounded-full bg-[var(--kurage-accent)]/45 shadow-[0_0_8px_rgba(var(--kurage-accent-rgb),.55)]"
          style={{ left, top, width: size, height: size }}
        />
      ))}

      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.025] mix-blend-screen" xmlns="http://www.w3.org/2000/svg">
        <defs><pattern id="ranking-ocean-grid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(var(--kurage-accent-rgb),.8)" strokeWidth=".5" /></pattern></defs>
        <rect width="100%" height="100%" fill="url(#ranking-ocean-grid)" />
      </svg>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#010304] opacity-90" />
    </div>
  );
}
