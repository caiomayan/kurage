"use client";

import React, { useId } from "react";
import { motion } from "framer-motion";

/**
 * ProfileOceanicBackground
 * A unique, bespoke abyssal atmosphere designed specifically for the Player Profile.
 * Incorporates the exact palette of Home Section 1 (var(--kurage-accent) seafoam + #92bce3 pelagic blue + canvas black),
 * with unique fluid luminous caustic wave ribbons, breathing abyssal orbs, and suspended bioluminescent drift.
 */
export function ProfileOceanicBackground() {
  const gradientId1 = useId();
  const gradientId2 = useId();

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none">
      {/* 1. Base Canvas Pure Abyss */}
      <div className="absolute inset-0 bg-[#000000]" />

      {/* 2. Soft Atmospheric Ocean Wash (Matching Home Section 1) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 75% at 50% 25%, rgba(var(--kurage-accent-rgb),0.16) 0%, rgba(146, 188, 227, 0.06) 50%, transparent 85%)",
        }}
      />

      {/* 3. UNIQUE EFFECT: Animated Ethereal Aquatic Caustic Ribbons (Continuous Wave Flow) */}
      <svg
        className="absolute inset-0 h-full w-full opacity-40 mix-blend-screen"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={gradientId1} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--kurage-accent)" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#92bce3" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--kurage-accent)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={gradientId2} x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#92bce3" stopOpacity="0.25" />
            <stop offset="60%" stopColor="var(--kurage-accent)" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#92bce3" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Ribbon 1: Upper-left flowing down-right */}
        <motion.path
          d="M -100 150 Q 300 20 700 220 T 1500 120 T 2200 300"
          fill="none"
          stroke={`url(#${gradientId1})`}
          strokeWidth="1.8"
          animate={{
            d: [
              "M -100 150 Q 300 20 700 220 T 1500 120 T 2200 300",
              "M -100 180 Q 350 80 650 180 T 1550 160 T 2200 260",
              "M -100 150 Q 300 20 700 220 T 1500 120 T 2200 300",
            ],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Ribbon 2: Parallel Wave */}
        <motion.path
          d="M -50 220 Q 380 90 780 280 T 1580 190 T 2300 380"
          fill="none"
          stroke={`url(#${gradientId2})`}
          strokeWidth="1.2"
          strokeDasharray="8 12"
          animate={{
            d: [
              "M -50 220 Q 380 90 780 280 T 1580 190 T 2300 380",
              "M -50 190 Q 320 140 720 230 T 1520 220 T 2300 320",
              "M -50 220 Q 380 90 780 280 T 1580 190 T 2300 380",
            ],
          }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />

        {/* Ribbon 3: Deep Abyssal Transverse Current */}
        <motion.path
          d="M -150 480 Q 400 380 900 520 T 1700 440 T 2400 600"
          fill="none"
          stroke={`url(#${gradientId1})`}
          strokeWidth="1.5"
          animate={{
            d: [
              "M -150 480 Q 400 380 900 520 T 1700 440 T 2400 600",
              "M -150 510 Q 450 430 850 480 T 1750 490 T 2400 560",
              "M -150 480 Q 400 380 900 520 T 1700 440 T 2400 600",
            ],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
      </svg>

      {/* 4. Home-Inspired Bioluminescent Ambient Nodes (Breathing Organism Auras) */}
      {/* Upper-Left Organism Aura */}
      <motion.div
        animate={{
          x: ["-5%", "5%", "-5%"],
          y: ["0%", "8%", "0%"],
          scale: [1, 1.1, 1],
          opacity: [0.25, 0.45, 0.25],
        }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[4%] left-[-4%] h-[520px] w-[580px] mix-blend-screen blur-3xl opacity-40"
        style={{
          background:
            "radial-gradient(circle, rgba(var(--kurage-accent-rgb),0.3) 0%, rgba(146, 188, 227, 0.1) 50%, transparent 70%)",
        }}
      />

      {/* Upper-Right Organism Aura */}
      <motion.div
        animate={{
          x: ["5%", "-5%", "5%"],
          y: ["0%", "10%", "0%"],
          scale: [0.95, 1.12, 0.95],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute top-[8%] right-[-4%] h-[500px] w-[560px] mix-blend-screen blur-3xl opacity-35"
        style={{
          background:
            "radial-gradient(circle, rgba(146, 188, 227, 0.3) 0%, rgba(var(--kurage-accent-rgb),0.1) 50%, transparent 70%)",
        }}
      />

      {/* Center Backdrop Halo (Subtle illumination directly supporting Avatar & Top Header) */}
      <motion.div
        animate={{
          scale: [0.96, 1.06, 0.96],
          opacity: [0.18, 0.32, 0.18],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[18%] left-1/2 -translate-x-1/2 h-[380px] w-[520px] rounded-full blur-3xl mix-blend-screen opacity-25 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(var(--kurage-accent-rgb),0.25) 0%, rgba(146, 188, 227, 0.08) 55%, transparent 75%)",
        }}
      />

      {/* 5. Suspended Phosphorescent Micro-Particles Drift */}
      <div className="absolute inset-0">
        {[
          { top: "12%", left: "18%", size: 3, dur: 8, delay: 0 },
          { top: "28%", left: "78%", size: 2, dur: 10, delay: 1 },
          { top: "45%", left: "10%", size: 3.5, dur: 9, delay: 2.5 },
          { top: "62%", left: "85%", size: 2.5, dur: 12, delay: 1.8 },
          { top: "75%", left: "30%", size: 3, dur: 11, delay: 3.5 },
          { top: "20%", left: "55%", size: 2, dur: 7.5, delay: 0.8 },
          { top: "82%", left: "68%", size: 2.5, dur: 13, delay: 4 },
        ].map((pt, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-[var(--kurage-accent)] mix-blend-screen"
            style={{
              top: pt.top,
              left: pt.left,
              width: pt.size,
              height: pt.size,
              boxShadow: "0 0 10px rgba(var(--kurage-accent-rgb),0.9), 0 0 20px rgba(146, 188, 227, 0.6)",
            }}
            animate={{
              y: [-12, -40, -12],
              x: [-10, 10, -10],
              opacity: [0.2, 0.7, 0.2],
            }}
            transition={{
              duration: pt.dur,
              repeat: Infinity,
              delay: pt.delay,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  );
}
