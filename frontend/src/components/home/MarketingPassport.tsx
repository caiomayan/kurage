"use client";

import React from "react";
import { motion } from "framer-motion";
import { PiUserCheck, PiArrowRight } from "react-icons/pi";
import { SteamIcon } from "@/components/ui/PlatformIcons";
import { useAuth } from "@/lib/auth";
import { FaceitLevelIcon } from "@/components/ui/faceit-levels/FaceitLevelIcon";

const EASE = [0.16, 1, 0.3, 1] as const;

export function MarketingPassport() {
  const { loginWithSteam } = useAuth();

  return (
    <div className="relative z-10 w-full bg-canvas border-t border-[var(--divider-soft)] overflow-hidden">
      
      {/* ── BESPOKE SECTION ATMOSPHERE: Flowing Marine Current Stream ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none">
        {/* Horizontal Undulating Luminous Current Stream (Vibrant) */}
        <motion.div
          animate={{
            x: ["-12%", "12%", "-12%"],
            y: ["0%", "10%", "0%"],
            opacity: [0.55, 0.85, 0.55],
          }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-[-15%] top-[25%] h-[450px] w-[130%] rounded-full mix-blend-screen blur-3xl opacity-75"
          style={{
            background: "radial-gradient(ellipse at center, rgba(169, 200, 192, 0.35) 0%, rgba(146, 188, 227, 0.2) 40%, transparent 75%)",
          }}
        />

        {/* Floating Bioluminescent Organism 1 */}
        <motion.div
          animate={{
            y: ["0px", "-100px", "0px"],
            x: ["0px", "45px", "0px"],
            opacity: [0.35, 0.8, 0.35],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-[8%] top-[35%] h-56 w-56 rounded-full blur-2xl"
          style={{
            background: "radial-gradient(circle, rgba(169, 200, 192, 0.5) 0%, transparent 70%)",
          }}
        />

        {/* Floating Bioluminescent Organism 2 (Behind Passport Card) */}
        <motion.div
          animate={{
            y: ["0px", "90px", "0px"],
            x: ["0px", "-40px", "0px"],
            opacity: [0.4, 0.85, 0.4],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute right-[12%] top-[20%] h-72 w-72 rounded-full blur-3xl"
          style={{
            background: "radial-gradient(circle, rgba(146, 188, 227, 0.45) 0%, rgba(169, 200, 192, 0.22) 50%, transparent 75%)",
          }}
        />
      </div>

      <section className="relative z-10 mx-auto w-full max-w-7xl px-6 py-20 sm:py-28">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-24">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: EASE }}
            className="flex flex-col lg:col-span-5"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--hairline-strong)] bg-surface-deep px-3.5 py-1 text-[11px] font-sans font-semibold uppercase tracking-widest text-mute">
              <PiUserCheck className="h-3.5 w-3.5 text-[#a9c8c0]" />
              <span>Passaporte Digital</span>
            </div>
            <h2 className="mt-5 font-display text-[44px] leading-[1.05] tracking-tight text-ink sm:text-[56px]">
              Um passaporte para <br />
              as profundezas.
            </h2>
            <p className="mt-6 text-[16px] leading-relaxed text-body">
              Pare de depender de números dispersos. A Kurage sintetiza sua jornada em uma identidade criptografada com histórico sincronizado, telemetria milimétrica e seu verdadeiro calibre competitivo.
            </p>
            
            <div className="mt-8">
              <button
                onClick={() => loginWithSteam()}
                className="group relative inline-flex h-12 items-center justify-center gap-3 rounded-[8px] bg-ink px-8 text-[14px] font-medium text-black transition-all duration-300 hover:bg-white hover:scale-[1.02] active:scale-[0.98]"
              >
                <SteamIcon size={18} />
                <span>Gerar Meu Passaporte</span>
                <PiArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
            className="lg:col-span-7 relative perspective-[1000px]"
          >
            {/* Visual Teaser: Glassmorphism ID Card */}
            <div className="relative w-full max-w-lg mx-auto aspect-[1.6/1] rounded-[16px] bg-gradient-to-br from-surface-elevated/90 to-surface-card/90 border border-[rgba(169,200,192,0.3)] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-2xl flex flex-col justify-between overflow-hidden transform lg:rotate-y-[-4deg] lg:rotate-x-[4deg] transition-transform duration-700 hover:rotate-0">
              
              {/* Oceanic Bioluminescent Internal Aura */}
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#a9c8c0]/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-[#92bce3]/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[rgba(169,200,192,0.4)] to-transparent" />
              
              <div className="relative z-10 flex items-start justify-between">
                <div className="flex gap-4 items-center">
                  <div className="w-14 h-14 rounded-xl bg-surface-deep border border-white/10 flex items-center justify-center shadow-inner">
                    <SteamIcon size={26} className="text-white/70" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="h-5 w-32 bg-white/[0.08] rounded animate-pulse" />
                    <div className="h-3 w-20 bg-white/[0.04] rounded" />
                  </div>
                </div>
                <div className="opacity-60 blur-[1px] ring-1 ring-white/20 rounded-full p-1">
                   <FaceitLevelIcon level={10} className="w-9 h-9" />
                </div>
              </div>

              <div className="relative z-10 grid grid-cols-3 gap-4 border-t border-[var(--hairline)] pt-5 mt-6">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-mute font-sans font-semibold uppercase tracking-wider">Win Rate</span>
                  <div className="h-5 w-16 bg-white/[0.07] rounded animate-pulse" />
                </div>
                <div className="flex flex-col gap-1.5 border-x border-[var(--hairline)] px-3">
                  <span className="text-[10px] text-mute font-sans font-semibold uppercase tracking-wider">K/D Ratio</span>
                  <div className="h-5 w-12 bg-white/[0.07] rounded animate-pulse" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-mute font-sans font-semibold uppercase tracking-wider">Rating Elo</span>
                  <div className="h-5 w-14 bg-[#a9c8c0]/25 rounded animate-pulse" />
                </div>
              </div>
              
              {/* Interactive Hover Reveal */}
              <div 
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md z-20 transition-all duration-300 opacity-0 hover:opacity-100 cursor-pointer" 
                onClick={() => loginWithSteam()}
              >
                <div className="rounded-full border border-[rgba(169,200,192,0.4)] bg-surface-elevated/90 px-4 py-1.5 text-[11px] font-sans font-semibold uppercase tracking-wider text-ink mb-2">
                  Passaporte Bloqueado
                </div>
                <p className="text-white text-[14px] font-medium flex items-center gap-1.5">
                  Conecte via Steam para revelar
                  <PiArrowRight className="h-3.5 w-3.5 text-[#a9c8c0]" />
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
