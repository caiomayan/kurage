"use client";

import React from "react";
import { motion } from "framer-motion";

export function RankingOceanicBackground() {
  return (
    <div 
      aria-hidden 
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none bg-[#020507]"
    >
      {/* ── 1. DEEP OCEAN CURRENT GRADIENTS (Abyssal Waters) ── */}
      <div 
        className="absolute inset-0 opacity-80"
        style={{
          background: "radial-gradient(ellipse 120% 100% at 50% 0%, #061921 0%, #030b0e 45%, #010406 100%)"
        }}
      />

      {/* ── 2. ANGULAR OCEANIC GOD-RAYS (Light Beams Piercing Through Water Behind Podium) ── */}
      <div className="absolute inset-0 overflow-hidden mix-blend-screen opacity-20">
        {/* Beam 1 - Left Angle */}
        <motion.div
          animate={{
            opacity: [0.15, 0.4, 0.15],
            rotate: [-18, -14, -18],
            scaleY: [0.95, 1.1, 0.95],
          }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[20%] left-[20%] w-[180px] h-[140%] origin-top blur-3xl"
          style={{
            background: "linear-gradient(180deg, rgba(169, 200, 192, 0.35) 0%, rgba(146, 188, 227, 0.12) 60%, transparent 100%)",
          }}
        />

        {/* Beam 2 - Center Main Champion Beam */}
        <motion.div
          animate={{
            opacity: [0.25, 0.6, 0.25],
            scaleX: [0.9, 1.15, 0.9],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[15%] left-1/2 -translate-x-1/2 w-[340px] h-[140%] origin-top blur-3xl"
          style={{
            background: "linear-gradient(180deg, rgba(229, 193, 88, 0.25) 0%, rgba(169, 200, 192, 0.2) 40%, rgba(146, 188, 227, 0.08) 80%, transparent 100%)",
          }}
        />

        {/* Beam 3 - Right Angle */}
        <motion.div
          animate={{
            opacity: [0.15, 0.35, 0.15],
            rotate: [18, 14, 18],
            scaleY: [0.95, 1.08, 0.95],
          }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute -top-[20%] right-[20%] w-[180px] h-[140%] origin-top blur-3xl"
          style={{
            background: "linear-gradient(180deg, rgba(146, 188, 227, 0.3) 0%, rgba(169, 200, 192, 0.1) 60%, transparent 100%)",
          }}
        />
      </div>

      {/* ── 3. DYNAMIC WATER CAUSTICS & TIDAL SURGE ── */}
      {/* Upper Caustic Wave */}
      <motion.div
        animate={{
          x: ["-8%", "8%", "-8%"],
          y: ["0%", "6%", "0%"],
          scale: [1, 1.08, 1],
          opacity: [0.3, 0.55, 0.3],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-[10%] left-[-10%] w-[120%] h-[550px] mix-blend-screen blur-3xl"
        style={{
          background: "radial-gradient(ellipse at 50% 20%, rgba(169, 200, 192, 0.25) 0%, rgba(14, 80, 96, 0.18) 50%, transparent 80%)",
        }}
      />

      {/* Mid-Abyss Depth Current */}
      <motion.div
        animate={{
          x: ["6%", "-6%", "6%"],
          y: ["0%", "-8%", "0%"],
          scale: [0.95, 1.05, 0.95],
          opacity: [0.2, 0.45, 0.2],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute top-[35%] right-[-15%] w-[1000px] h-[750px] rounded-full mix-blend-screen blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(146, 188, 227, 0.16) 0%, rgba(14, 60, 80, 0.12) 50%, transparent 75%)",
        }}
      />

      {/* ── 4. RISING BIOLUMINESCENT PELAGIC PARTICLES (Kurage Jellyfish Drifts) ── */}
      {/* Particle 1 */}
      <motion.div
        animate={{
          y: ["0px", "-260px", "0px"],
          x: ["0px", "30px", "-15px", "0px"],
          opacity: [0.2, 0.65, 0.2],
          scale: [0.9, 1.25, 0.9],
        }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-[12%] top-[30%] h-36 w-36 rounded-full blur-2xl mix-blend-screen"
        style={{
          background: "radial-gradient(circle, rgba(169, 200, 192, 0.45) 0%, rgba(146, 188, 227, 0.15) 50%, transparent 70%)",
        }}
      />

      {/* Particle 2 */}
      <motion.div
        animate={{
          y: ["0px", "-300px", "0px"],
          x: ["0px", "-35px", "20px", "0px"],
          opacity: [0.15, 0.55, 0.15],
          scale: [1, 1.3, 1],
        }}
        transition={{ duration: 17, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute right-[16%] top-[40%] h-44 w-44 rounded-full blur-2xl mix-blend-screen"
        style={{
          background: "radial-gradient(circle, rgba(146, 188, 227, 0.4) 0%, rgba(169, 200, 192, 0.12) 50%, transparent 70%)",
        }}
      />

      {/* Particle 3 (Deep Sea Ascent Near Center) */}
      <motion.div
        animate={{
          y: ["0px", "-220px", "0px"],
          x: ["0px", "20px", "-25px", "0px"],
          opacity: [0.2, 0.7, 0.2],
          scale: [0.85, 1.2, 0.85],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        className="absolute left-[45%] top-[55%] h-48 w-48 rounded-full blur-3xl mix-blend-screen"
        style={{
          background: "radial-gradient(circle, rgba(229, 193, 88, 0.3) 0%, rgba(169, 200, 192, 0.18) 50%, transparent 70%)",
        }}
      />

      {/* Particle 4 (Left Foot Ascent) */}
      <motion.div
        animate={{
          y: ["0px", "-200px", "0px"],
          x: ["0px", "-20px", "15px", "0px"],
          opacity: [0.15, 0.5, 0.15],
        }}
        transition={{ duration: 19, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute left-[25%] bottom-[15%] h-40 w-40 rounded-full blur-2xl mix-blend-screen"
        style={{
          background: "radial-gradient(circle, rgba(169, 200, 192, 0.35) 0%, transparent 70%)",
        }}
      />

      {/* Particle 5 (Right Deep Current) */}
      <motion.div
        animate={{
          y: ["0px", "-240px", "0px"],
          x: ["0px", "25px", "-15px", "0px"],
          opacity: [0.18, 0.55, 0.18],
        }}
        transition={{ duration: 21, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        className="absolute right-[28%] bottom-[20%] h-44 w-44 rounded-full blur-2xl mix-blend-screen"
        style={{
          background: "radial-gradient(circle, rgba(146, 188, 227, 0.35) 0%, transparent 70%)",
        }}
      />

      {/* ── 5. FLOATING OCEANIC BUBBLES & MICRO-PLANKTON (Subtle Fine Detail) ── */}
      {[
        { left: "8%", top: "25%", size: "4px", duration: 7, delay: 0 },
        { left: "18%", top: "65%", size: "6px", duration: 9, delay: 1.5 },
        { left: "28%", top: "40%", size: "5px", duration: 8, delay: 3 },
        { left: "42%", top: "80%", size: "7px", duration: 11, delay: 0.5 },
        { left: "58%", top: "35%", size: "4px", duration: 6, delay: 2 },
        { left: "72%", top: "70%", size: "6px", duration: 10, delay: 4 },
        { left: "85%", top: "30%", size: "5px", duration: 8.5, delay: 1 },
        { left: "92%", top: "60%", size: "4px", duration: 7.5, delay: 2.5 },
      ].map((bubble, i) => (
        <motion.div
          key={i}
          animate={{
            y: ["0px", "-120px", "0px"],
            x: ["0px", i % 2 === 0 ? "15px" : "-15px", "0px"],
            opacity: [0.1, 0.7, 0.1],
          }}
          transition={{
            duration: bubble.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: bubble.delay,
          }}
          className="absolute rounded-full bg-[#a9c8c0] shadow-[0_0_8px_rgba(169,200,192,0.8)]"
          style={{
            left: bubble.left,
            top: bubble.top,
            width: bubble.size,
            height: bubble.size,
          }}
        />
      ))}

      {/* ── 6. SUBTLE MARINE TACTICAL GRID OVERLAY (Ultra-Thin Texture) ── */}
      <svg 
        className="absolute inset-0 h-full w-full opacity-[0.03] mix-blend-screen pointer-events-none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="ranking-ocean-grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(169,200,192,0.8)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#ranking-ocean-grid)" />
      </svg>

      {/* ── 7. VIGNETTE BOTTOM DEPTH MASK (Transitions to dark canvas at page bottom) ── */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#010304] opacity-90" />
    </div>
  );
}
