const particles = [
  ["10%", "16%", 2, 10],
  ["22%", "84%", 3, 14],
  ["44%", "8%", 2, 12],
  ["58%", "76%", 2, 9],
  ["72%", "25%", 3, 15],
  ["86%", "63%", 2, 11],
] as const;

export function InventoryOceanicBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-black">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_58%_at_50%_5%,rgba(var(--kurage-accent-rgb),0.12),rgba(146,188,227,0.04)_48%,transparent_78%)]" />
      {/* Static composited light pools preserve the oceanic depth without
          repainting two viewport-sized blurred layers every animation frame. */}
      <div className="absolute -left-[18rem] top-[8rem] h-[38rem] w-[38rem] rounded-full blur-[110px]" style={{ background: "rgba(90,151,161,0.09)" }} />
      <div className="absolute -right-[16rem] top-[22rem] h-[36rem] w-[36rem] rounded-full blur-[120px]" style={{ background: "rgba(98,133,184,0.08)" }} />
      <svg className="absolute inset-0 h-full w-full opacity-30" viewBox="0 0 1600 1000" preserveAspectRatio="none">
        <path
          d="M-80 220 C260 70 470 330 830 190 S1370 40 1700 250"
          fill="none"
          stroke="rgba(var(--kurage-accent-rgb),.22)"
          strokeWidth="1"
        />
        <path
          d="M-120 700 C260 540 560 800 900 650 S1420 520 1720 720"
          fill="none"
          stroke="rgba(146,188,227,.15)"
          strokeWidth="1"
          strokeDasharray="7 13"
        />
      </svg>
      {particles.map(([top, left, size], index) => (
        <span
          key={`${top}-${left}`}
          className="absolute rounded-full bg-[var(--kurage-accent)]"
          style={{ top, left, width: size, height: size, boxShadow: "0 0 14px rgba(var(--kurage-accent-rgb),.75)", opacity: 0.22 + (index % 3) * 0.12 }}
        />
      ))}
      <div className="absolute inset-x-0 bottom-0 h-[36rem] bg-gradient-to-b from-transparent via-black/50 to-black" />
    </div>
  );
}
