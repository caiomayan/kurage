"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { PiWaves, PiArrowDownRight } from "react-icons/pi";
import { cn } from "@/lib/utils";

interface MergulharButtonProps {
  serverIp?: string;
  label?: string;
  size?: "md" | "lg";
  className?: string;
  onClick?: () => void;
}

export function MergulharButton({
  serverIp = "play.kurage.caiomayan.com",
  label = "Mergulhar",
  size = "md",
  className,
  onClick,
}: MergulharButtonProps) {
  const [isSubmerged, setIsSubmerged] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const cleanIp = serverIp.replace(/^connect\s+/i, "").trim();
  const steamProtocolUrl = `steam://connect/${cleanIp}`;

  const handleClick = (e: React.MouseEvent) => {
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 400);

    if (onClick) {
      onClick();
    } else {
      window.location.href = steamProtocolUrl;
    }
  };

  return (
    <div className={cn("relative inline-flex group select-none", className)}>
      
      {/* ── 1. AMBIENT SONAR PRESSURE WAVE (Behind Button on Hover) ── */}
      <div 
        aria-hidden 
        className="pointer-events-none absolute -inset-1.5 rounded-[12px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-md"
        style={{
          background: "radial-gradient(ellipse at center, rgba(169, 200, 192, 0.4) 0%, rgba(146, 188, 227, 0.2) 60%, transparent 80%)"
        }}
      />

      {/* ── 2. MAIN MERGULHAR INTERACTION BUTTON ── */}
      <button
        type="button"
        onClick={handleClick}
        onMouseEnter={() => setIsSubmerged(true)}
        onMouseLeave={() => setIsSubmerged(false)}
        className={cn(
          "relative isolate flex items-center justify-center gap-2.5 overflow-hidden rounded-[8px] font-sans font-medium text-white transition-all duration-500 cursor-pointer",
          "border border-[rgba(169,200,192,0.35)] hover:border-[rgba(169,200,192,0.85)]",
          "bg-[#05090c]/90 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.8)]",
          size === "md" ? "h-10 px-5 text-[13px] tracking-[0.06em]" : "h-12 px-7 text-[14px] tracking-[0.08em]",
          isPressed && "scale-[0.96]"
        )}
      >
        
        {/* ── 3. OCEANIC SUBMERSION WATER CURRENTS (Hover Fluid Surge) ── */}
        <div 
          aria-hidden 
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden transition-opacity duration-500 opacity-60 group-hover:opacity-100"
        >
          {/* Base Marine Glow */}
          <div 
            className="absolute inset-0 transition-transform duration-700 ease-out translate-y-[85%] group-hover:translate-y-0"
            style={{
              background: "linear-gradient(180deg, rgba(169, 200, 192, 0.25) 0%, rgba(146, 188, 227, 0.45) 100%)"
            }}
          />

          {/* Liquid Caustic Shimmer Wave (Diagonal sweeping beam) */}
          <motion.div
            animate={isSubmerged ? {
              x: ["-100%", "200%"],
              opacity: [0, 0.8, 0],
            } : {}}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -top-1/2 left-0 h-[200%] w-[60%] -rotate-12 pointer-events-none mix-blend-screen"
            style={{
              background: "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.35) 50%, transparent 100%)",
            }}
          />

          {/* Bioluminescent Micro-Particles Sparkle */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,_rgba(169,200,192,0.4)_0%,_transparent_65%)]" />
        </div>

        {/* ── 4. WATER SURFACE PERIMETER HIGHLIGHT ── */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[rgba(169,200,192,0.8)] to-transparent opacity-70 group-hover:opacity-100 transition-opacity duration-300" />

        {/* ── 5. BUTTON CONTENT (Text & Aquatic Dive Indicator) ── */}
        <span className="relative z-10 font-sans font-semibold text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.8)] flex items-center gap-2">
          {label}
        </span>

        <div className="relative z-10 flex items-center justify-center">
          {/* Dive Wave Icon that dips into the depths on hover */}
          <div className="relative w-4 h-4 flex items-center justify-center text-[#a9c8c0] transition-all duration-300 group-hover:text-white group-hover:translate-y-0.5 group-hover:scale-110">
            <PiWaves className="w-3.5 h-3.5 absolute inset-0 m-auto transition-opacity duration-300 group-hover:opacity-0" />
            <PiArrowDownRight className="w-3.5 h-3.5 absolute inset-0 m-auto opacity-0 transition-all duration-300 group-hover:opacity-100 text-[#a9c8c0]" />
          </div>
        </div>

        {/* ── 6. DIVE PRESSURE RIPPLE ON CLICK ── */}
        {isPressed && (
          <motion.div
            initial={{ scale: 0, opacity: 0.8 }}
            animate={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute inset-0 rounded-full bg-[rgba(169,200,192,0.6)] pointer-events-none mix-blend-screen"
          />
        )}

      </button>

    </div>
  );
}
