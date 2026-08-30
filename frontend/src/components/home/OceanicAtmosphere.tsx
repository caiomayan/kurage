"use client";

import React from "react";
import { motion } from "framer-motion";

export function OceanicAtmosphere() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none">
      {/* ── 1. Deep Ocean Fluid Ambient Gradients (Cyan & Sea-Green) ── */}
      <motion.div
        animate={{
          x: ["0%", "5%", "-4%", "0%"],
          y: ["0%", "-6%", "5%", "0%"],
          scale: [1, 1.08, 0.96, 1],
        }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -left-32 top-10 h-[850px] w-[850px] rounded-full mix-blend-screen opacity-30 blur-3xl"
        style={{
          willChange: "transform, opacity",
          background: "radial-gradient(circle, rgba(var(--kurage-accent-rgb),0.18) 0%, rgba(146, 188, 227, 0.08) 40%, transparent 70%)",
        }}
      />

      <motion.div
        animate={{
          x: ["0%", "-6%", "5%", "0%"],
          y: ["0%", "8%", "-7%", "0%"],
          scale: [1, 0.94, 1.06, 1],
        }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -right-32 top-[35%] h-[900px] w-[900px] rounded-full mix-blend-screen opacity-25 blur-3xl"
        style={{
          willChange: "transform, opacity",
          background: "radial-gradient(circle, rgba(146, 188, 227, 0.16) 0%, rgba(var(--kurage-accent-rgb),0.06) 45%, transparent 70%)",
        }}
      />

      <motion.div
        animate={{
          x: ["0%", "4%", "-5%", "0%"],
          y: ["0%", "-5%", "6%", "0%"],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-[20%] bottom-[10%] h-[800px] w-[800px] rounded-full mix-blend-screen opacity-20 blur-3xl"
        style={{
          willChange: "transform, opacity",
          background: "radial-gradient(circle, rgba(var(--kurage-accent-rgb),0.15) 0%, transparent 65%)",
        }}
      />

      {/* ── 2. Floating Bioluminescent Jellyfish Light Floaters (Kurage Drifts) ── */}
      {/* Jellyfish Particle 1 */}
      <motion.div
        animate={{
          y: ["0px", "-140px", "0px"],
          x: ["0px", "25px", "-15px", "0px"],
          opacity: [0.15, 0.45, 0.15],
          scale: [1, 1.15, 0.95, 1],
        }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-[15%] top-[20%] h-48 w-48 rounded-full blur-2xl"
        style={{
          background: "radial-gradient(circle, rgba(var(--kurage-accent-rgb),0.35) 0%, rgba(146, 188, 227, 0.1) 50%, transparent 70%)",
        }}
      />

      {/* Jellyfish Particle 2 */}
      <motion.div
        animate={{
          y: ["0px", "-180px", "0px"],
          x: ["0px", "-30px", "20px", "0px"],
          opacity: [0.1, 0.4, 0.1],
          scale: [0.9, 1.2, 0.9],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute right-[22%] top-[45%] h-56 w-56 rounded-full blur-2xl"
        style={{
          background: "radial-gradient(circle, rgba(146, 188, 227, 0.3) 0%, rgba(var(--kurage-accent-rgb),0.1) 50%, transparent 70%)",
        }}
      />

      {/* Jellyfish Particle 3 (Deep Sea Ascent) */}
      <motion.div
        animate={{
          y: ["0px", "-200px", "0px"],
          x: ["0px", "35px", "-20px", "0px"],
          opacity: [0.12, 0.5, 0.12],
          scale: [1, 1.25, 1],
        }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 5 }}
        className="absolute left-[30%] top-[70%] h-64 w-64 rounded-full blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(var(--kurage-accent-rgb),0.3) 0%, rgba(146, 188, 227, 0.12) 45%, transparent 70%)",
        }}
      />

      {/* ── 3. Subtle Fluorescent Bioluminescent Light Pulses ── */}
      <motion.div
        animate={{
          opacity: [0.08, 0.22, 0.08],
          scale: [0.98, 1.03, 0.98],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-1/2 top-[12%] -translate-x-1/2 h-[350px] w-full max-w-[1000px] rounded-full blur-3xl mix-blend-screen"
        style={{
          background: "radial-gradient(ellipse at center, rgba(var(--kurage-accent-rgb),0.2) 0%, transparent 70%)",
        }}
      />

      {/* ── 4. Deep Sea Micro-Currents (Subtle Wavy Line Shimmer) ── */}
      <svg 
        className="absolute inset-0 h-full w-full opacity-[0.035] mix-blend-screen pointer-events-none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="oceanic-grid" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M 80 0 L 0 0 0 80" fill="none" stroke="rgba(var(--kurage-accent-rgb),0.6)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#oceanic-grid)" />
      </svg>
    </div>
  );
}
