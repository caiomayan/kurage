"use client";

import React, { useRef, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import {
  PiArrowRight,
  PiShieldCheck,
} from "react-icons/pi";
import { SteamIcon } from "@/components/ui/PlatformIcons";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
const Hero3DCanvas = dynamic(
  () => import("@/components/home/Hero3DCanvas").then((mod) => mod.Hero3DCanvas),
  { ssr: false, loading: () => <div className="h-full w-full" /> }
);
import { LeaderboardWidget } from "@/components/home/LeaderboardWidget";
import { HomeMarAberto } from "@/components/home/HomeMarAberto";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function HomePage() {
  const { isAuthenticated, user, loginWithSteam } = useAuth();
  
  // Scroll Feedback for Hero & Parallax
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroScroll } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroOpacity = useTransform(heroScroll, [0, 1], [1, 0.4]);
  const heroScale = useTransform(heroScroll, [0, 1], [1, 0.85]);

  // Animated Keywords
  const [keywordIndex, setKeywordIndex] = useState(0);

  const keywords = isAuthenticated
    ? [
        "Acompanhe suas métricas ao vivo.",
        "Monitore sua evolução diária.",
        "Sua telemetria completa.",
        "Compare estatísticas com amigos.",
        "Seu perfil competitivo.",
      ]
    : [
        "Estatísticas precisas.",
        "Sem poluição visual.",
        "Telemetria em tempo real.",
        "Sua nova casa no CS2.",
        "Identidade competitiva.",
      ];

  useEffect(() => {
    const interval = setInterval(() => {
      setKeywordIndex((prev) => (prev + 1) % keywords.length);
    }, isAuthenticated ? 4500 : 3500);
    return () => clearInterval(interval);
  }, [keywords.length, isAuthenticated]);

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-canvas">
      
      {/* ── HERO ── */}
      <div ref={heroRef} className="relative h-[115vh] z-0 overflow-hidden">
        {/* ── HERO BESPOKE ATMOSPHERE: Softly Dispersed Deep-Sea Lighting & Floating Organisms ── */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none">
          {/* Full-Height Ocean Atmospheric Wash (Top to Bottom) */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 90% 80% at 50% 35%, rgba(169, 200, 192, 0.16) 0%, rgba(146, 188, 227, 0.06) 50%, transparent 85%)",
            }}
          />

          {/* 1. Upper-Left Surface Aurora */}
          <motion.div
            animate={{
              x: ["-10%", "10%", "-10%"],
              y: ["0%", "12%", "0%"],
              opacity: [0.25, 0.45, 0.25],
            }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[2%] left-[-8%] h-[480px] w-[550px] mix-blend-screen blur-3xl opacity-40"
            style={{
              background: "radial-gradient(circle, rgba(169, 200, 192, 0.28) 0%, rgba(146, 188, 227, 0.1) 50%, transparent 70%)",
            }}
          />

          {/* 2. Upper-Right Caustic Ray (Behind 3D Top) */}
          <motion.div
            animate={{
              x: ["10%", "-10%", "10%"],
              y: ["0%", "15%", "0%"],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute top-[5%] right-[-5%] h-[500px] w-[550px] mix-blend-screen blur-3xl opacity-35"
            style={{
              background: "radial-gradient(circle, rgba(146, 188, 227, 0.28) 0%, rgba(169, 200, 192, 0.1) 50%, transparent 70%)",
            }}
          />

          {/* 3. Mid-Left Floating Bioluminescent Jellyfish Organism */}
          <motion.div
            animate={{
              y: ["0px", "-120px", "0px"],
              x: ["0px", "35px", "-15px", "0px"],
              opacity: [0.2, 0.45, 0.2],
              scale: [1, 1.15, 0.95, 1],
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[38%] left-[8%] h-64 w-64 rounded-full blur-3xl"
            style={{
              background: "radial-gradient(circle, rgba(169, 200, 192, 0.3) 0%, rgba(146, 188, 227, 0.12) 50%, transparent 70%)",
            }}
          />

          {/* 4. Mid-Right Floating Bioluminescent Organism (Behind 3D Canvas) */}
          <motion.div
            animate={{
              y: ["0px", "-140px", "0px"],
              x: ["0px", "-35px", "20px", "0px"],
              opacity: [0.2, 0.45, 0.2],
              scale: [0.95, 1.18, 0.95],
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
            className="absolute top-[42%] right-[10%] h-72 w-72 rounded-full blur-3xl"
            style={{
              background: "radial-gradient(circle, rgba(146, 188, 227, 0.3) 0%, rgba(169, 200, 192, 0.12) 50%, transparent 70%)",
            }}
          />

          {/* 5. Lower-Left Deep-Sea Abyssal Glow (Near CTA buttons) */}
          <motion.div
            animate={{
              x: ["-8%", "8%", "-8%"],
              y: ["0%", "-15%", "0%"],
              opacity: [0.18, 0.4, 0.18],
              scale: [1, 1.12, 1],
            }}
            transition={{ duration: 13, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute bottom-[10%] left-[12%] h-64 w-64 rounded-full blur-3xl mix-blend-screen opacity-35"
            style={{
              background: "radial-gradient(circle, rgba(169, 200, 192, 0.28) 0%, transparent 70%)",
            }}
          />

          {/* 6. Lower-Right Deep Current (Below 3D Canvas) */}
          <motion.div
            animate={{
              x: ["8%", "-8%", "8%"],
              y: ["0%", "-18%", "0%"],
              opacity: [0.18, 0.4, 0.18],
              scale: [0.95, 1.15, 0.95],
            }}
            transition={{ duration: 17, repeat: Infinity, ease: "easeInOut", delay: 3 }}
            className="absolute bottom-[8%] right-[15%] h-72 w-72 rounded-full blur-3xl mix-blend-screen opacity-35"
            style={{
              background: "radial-gradient(circle, rgba(146, 188, 227, 0.28) 0%, rgba(169, 200, 192, 0.08) 50%, transparent 70%)",
            }}
          />

          {/* 7. Center Lower Current Stream */}
          <motion.div
            animate={{
              y: ["0px", "-90px", "0px"],
              opacity: [0.15, 0.35, 0.15],
            }}
            transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
            className="absolute bottom-[15%] left-[42%] h-60 w-60 rounded-full blur-3xl mix-blend-screen opacity-30"
            style={{
              background: "radial-gradient(circle, rgba(169, 200, 192, 0.25) 0%, transparent 70%)",
            }}
          />

          {/* Oceanic Grid Mask */}
          <div
            className="absolute inset-0 opacity-12"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
              maskImage: "radial-gradient(ellipse 80% 70% at 50% 45%, black 20%, transparent 85%)",
              WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 50% 45%, black 20%, transparent 85%)",
            }}
          />
        </div>

        <motion.section 
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="sticky top-0 mx-auto flex h-screen w-full max-w-7xl flex-col justify-center px-6 pt-[90px] pb-20 lg:pt-[140px] origin-top z-10"
        >
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-12 lg:gap-8">
            <div className="flex flex-col lg:col-span-7">
              <div className="relative min-h-[320px] flex flex-col justify-start">
                <AnimatePresence mode="wait">
                  {isAuthenticated ? (
                    <motion.div
                      key="auth-ui"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.4, ease: EASE }}
                      className="flex flex-col"
                    >
                      <h1 className="font-display text-[64px] leading-[0.95] tracking-tight text-ink sm:text-[84px] md:text-[96px]">
                        Olá, {user?.username}. <br />
                      </h1>
                      
                      <div className="relative mt-6 h-[90px] sm:h-[120px] max-w-lg text-[24px] sm:text-[32px] md:text-[40px] font-sans font-normal tracking-tight text-mute leading-[1.1]">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={keywordIndex}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.5, ease: EASE }}
                            className="absolute left-0 top-0 flex flex-col items-start gap-3"
                          >
                            <span className="text-body">{keywords[keywordIndex]}</span>
                          </motion.div>
                        </AnimatePresence>
                      </div>

                      <div className="mt-8 flex items-center gap-6">
                        <Link
                          href={`/player/${user?.kurageId || user?.steamId64}`}
                          className="group relative inline-flex h-12 items-center justify-center text-[15px] font-medium text-ink transition-colors hover:text-white"
                        >
                          <span className="relative z-10 flex items-center gap-2">
                            Ver meu passaporte
                            <PiArrowRight className="h-4 w-4 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 text-[#92BCE3]" />
                          </span>
                          <div className="absolute -bottom-1 left-0 h-px w-full bg-gradient-to-r from-transparent via-[var(--hairline-strong)] to-transparent transition-opacity duration-300 group-hover:opacity-0" />
                          <div className="absolute -bottom-1 left-0 h-px w-0 bg-gradient-to-r from-[#92bce3] via-[#a9c8c0] to-transparent transition-all duration-500 ease-out group-hover:w-full" />
                        </Link>
                        <Link
                          href="/mar"
                          className="group relative inline-flex h-12 items-center justify-center text-[15px] font-medium text-mute transition-colors hover:text-white"
                        >
                          <span className="relative z-10 flex items-center gap-2">
                            Navegar no mar
                            <PiArrowRight className="h-4 w-4 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 text-[#a9c8c0]" />
                          </span>
                        </Link>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="unauth-ui"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.4, ease: EASE }}
                      className="flex flex-col"
                    >
                      <h1 className="font-display text-[64px] leading-[0.95] tracking-tight text-ink sm:text-[84px] md:text-[96px]">
                        Kurage. <br />
                      </h1>

                      <div className="relative mt-6 h-[90px] sm:h-[120px] max-w-lg text-[24px] sm:text-[32px] md:text-[40px] font-sans font-normal tracking-tight text-mute leading-[1.1]">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={keywordIndex}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.5, ease: EASE }}
                            className="absolute left-0 top-0 flex flex-col items-start gap-3"
                          >
                            <span className="text-body">{keywords[keywordIndex]}</span>
                          </motion.div>
                        </AnimatePresence>
                      </div>

                      <div className="mt-10 flex items-center gap-8">
                        <button
                          onClick={() => loginWithSteam()}
                          className="group relative inline-flex h-12 items-center justify-center text-[15px] font-medium text-ink transition-colors hover:text-white"
                        >
                          <span className="relative z-10 flex items-center gap-2">
                            <SteamIcon size={18} />
                            Entrar com a Steam
                            <PiArrowRight className="h-4 w-4 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 text-[#92BCE3]" />
                          </span>
                          <div className="absolute -bottom-1 left-0 h-px w-full bg-gradient-to-r from-transparent via-[var(--hairline-strong)] to-transparent transition-opacity duration-300 group-hover:opacity-0" />
                          <div className="absolute -bottom-1 left-0 h-px w-0 bg-gradient-to-r from-[#92bce3] via-[#a9c8c0] to-transparent transition-all duration-500 ease-out group-hover:w-full" />
                        </button>
                        <Link
                          href="/mar"
                          className="group relative inline-flex h-12 items-center justify-center text-[15px] font-medium text-mute transition-colors hover:text-white"
                        >
                          <span className="relative z-10 flex items-center gap-2">
                            Navegar no mar
                            <PiArrowRight className="h-4 w-4 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 text-[#a9c8c0]" />
                          </span>
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="relative flex flex-col items-center justify-center lg:col-span-5">
              <div className="relative h-[380px] w-full max-w-[460px] sm:h-[460px]">
                <Hero3DCanvas />
              </div>
            </div>
          </div>
        </motion.section>
      </div>

      <LeaderboardWidget isAuthenticated={isAuthenticated} />

      {/* ── PRICING SECTION ── */}
      <div className="relative z-10 w-full bg-canvas">
        <section className="relative mx-auto w-full max-w-7xl px-6 py-24 sm:py-32 overflow-hidden border-t border-[var(--divider-soft)]">
          
          {/* ── BESPOKE SECTION ATMOSPHERE: Luminous Jellyfish Bell & Aurora Ribbons ── */}
          <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none">
            {/* Top Jellyfish Bell Breathing Aura */}
            <motion.div
              animate={{
                opacity: [0.55, 0.9, 0.55],
                scale: [0.95, 1.08, 0.95],
                y: ["0px", "-18px", "0px"],
              }}
              transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-36 left-1/2 -translate-x-1/2 h-[650px] w-[950px] rounded-full mix-blend-screen blur-3xl opacity-75"
              style={{
                background: "radial-gradient(ellipse at 50% 30%, rgba(169, 200, 192, 0.42) 0%, rgba(146, 188, 227, 0.22) 45%, transparent 75%)",
              }}
            />

            {/* Left Bioluminescent Aurora Curtain */}
            <motion.div
              animate={{
                opacity: [0.35, 0.7, 0.35],
                x: ["0px", "30px", "0px"],
              }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              className="absolute left-[3%] top-[35%] h-[450px] w-[400px] rounded-full mix-blend-screen blur-3xl opacity-50"
              style={{
                background: "radial-gradient(circle, rgba(169, 200, 192, 0.35) 0%, transparent 70%)",
              }}
            />

            {/* Right Bioluminescent Aurora Curtain */}
            <motion.div
              animate={{
                opacity: [0.35, 0.7, 0.35],
                x: ["0px", "-30px", "0px"],
              }}
              transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute right-[3%] top-[35%] h-[450px] w-[400px] rounded-full mix-blend-screen blur-3xl opacity-50"
              style={{
                background: "radial-gradient(circle, rgba(146, 188, 227, 0.35) 0%, transparent 70%)",
              }}
            />
          </div>
          
          <div className="relative z-10 mx-auto max-w-2xl text-center mb-24">
            <h2 className="font-display text-[48px] leading-[1.05] tracking-tight text-ink sm:text-[64px]">
              Profundidades de Acesso.
            </h2>
            <p className="mt-5 text-[17px] leading-relaxed text-body">
              A infraestrutura definitiva para Counter-Strike. Escolha a profundidade que melhor suporta a pressão da sua evolução competitiva.
            </p>
          </div>

          <div className="relative z-10 grid grid-cols-1 gap-6 lg:grid-cols-4 items-end">
            {/* Free - Águas Rasas */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.8, ease: EASE }}
              className={cn(
                "group relative flex flex-col justify-between rounded-[12px] bg-surface-card border border-[var(--hairline-strong)] p-8 transition-all duration-500 hover:bg-surface-elevated hover:border-white/20 min-h-[480px]",
                isAuthenticated && user?.subscriptionTier !== "FREE" ? "opacity-50 grayscale hover:opacity-100 hover:grayscale-0" : ""
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-sans font-semibold tracking-widest text-mute uppercase">Águas Rasas</span>
                  {isAuthenticated && user?.subscriptionTier === "FREE" && (
                    <span className="rounded-full border border-[var(--hairline-strong)] bg-surface-deep px-2.5 py-0.5 text-[9px] font-sans font-semibold uppercase tracking-widest text-[#a9c8c0]">
                      Plano Atual
                    </span>
                  )}
                </div>
                <h3 className="font-sans text-[22px] font-medium text-ink">Livre</h3>
                <p className="mt-2 text-[14px] text-body mb-7 min-h-[42px]">Essencial para iniciar seu mergulho competitivo no ecossistema.</p>
                <div className="mb-8 font-display text-[44px] leading-none text-ink">Grátis</div>
                <ul className="flex flex-col gap-3.5 text-[14px] text-body mb-8">
                  <li className="flex items-center gap-3"><PiShieldCheck className="h-4 w-4 text-mute group-hover:text-ink transition-colors shrink-0" /> <span>Passaporte Digital</span></li>
                  <li className="flex items-center gap-3"><PiShieldCheck className="h-4 w-4 text-mute group-hover:text-ink transition-colors shrink-0" /> <span>Rating Dinâmico Global</span></li>
                  <li className="flex items-center gap-3"><PiShieldCheck className="h-4 w-4 text-mute group-hover:text-ink transition-colors shrink-0" /> <span>Histórico de 30 dias</span></li>
                </ul>
              </div>
              <button className="w-full bg-surface-elevated text-ink h-[40px] rounded-[8px] text-[14px] font-medium border border-[var(--hairline-strong)] transition-all duration-300 hover:bg-white/10 hover:border-white/25">
                Começar Agora
              </button>
            </motion.div>

            {/* Plus - Correnteza */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.8, delay: 0.1, ease: EASE }}
              className={cn(
                "group relative flex flex-col justify-between rounded-[12px] bg-surface-card border border-[var(--hairline-strong)] p-8 transition-all duration-500 hover:bg-surface-elevated hover:border-white/20 min-h-[480px]",
                isAuthenticated && user?.subscriptionTier !== "PLUS" ? "opacity-50 grayscale hover:opacity-100 hover:grayscale-0" : ""
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-sans font-semibold tracking-widest text-[#92bce3] uppercase">Correnteza</span>
                  {isAuthenticated && user?.subscriptionTier === "PLUS" && (
                    <span className="rounded-full border border-[var(--hairline-strong)] bg-surface-deep px-2.5 py-0.5 text-[9px] font-sans font-semibold uppercase tracking-widest text-[#a9c8c0]">
                      Plano Atual
                    </span>
                  )}
                </div>
                <h3 className="font-sans text-[22px] font-medium text-ink">Plus</h3>
                <p className="mt-2 text-[14px] text-body mb-7 min-h-[42px]">Para quem busca evoluir através de métricas profundas.</p>
                <div className="mb-8 font-display text-[44px] leading-none text-ink">R$ 19<span className="text-[15px] text-mute font-sans ml-1">/mês</span></div>
                <ul className="flex flex-col gap-3.5 text-[14px] text-body mb-8">
                  <li className="flex items-center gap-3"><PiShieldCheck className="h-4 w-4 text-[#92bce3] shrink-0" /> <span className="text-ink">Tudo do Livre</span></li>
                  <li className="flex items-center gap-3"><PiShieldCheck className="h-4 w-4 text-mute group-hover:text-ink transition-colors shrink-0" /> <span>Estatísticas Avançadas</span></li>
                  <li className="flex items-center gap-3"><PiShieldCheck className="h-4 w-4 text-mute group-hover:text-ink transition-colors shrink-0" /> <span>Histórico Ilimitado</span></li>
                  <li className="flex items-center gap-3"><PiShieldCheck className="h-4 w-4 text-mute group-hover:text-ink transition-colors shrink-0" /> <span>Suporte Prioritário</span></li>
                </ul>
              </div>
              <button className="w-full bg-surface-elevated text-ink h-[40px] rounded-[8px] text-[14px] font-medium border border-[var(--hairline-strong)] transition-all duration-300 hover:bg-white/10 hover:border-white/25">
                Assinar Plus
              </button>
            </motion.div>

            {/* Pro - Água-Viva / Pelágica (Featured) */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.8, delay: 0.2, ease: EASE }}
              className={cn(
                "group relative flex flex-col justify-between rounded-[12px] bg-surface-elevated border border-[rgba(169,200,192,0.35)] p-8 overflow-hidden transition-all duration-700 hover:border-[rgba(169,200,192,0.65)] min-h-[510px] lg:-mt-6 shadow-[0_12px_40px_rgba(0,0,0,0.8)]",
                isAuthenticated && user?.subscriptionTier !== "PRO" ? "opacity-50 grayscale hover:opacity-100 hover:grayscale-0" : ""
              )}
            >
              {/* Ethereal Jellyfish Bioluminescent Aura */}
              <div className="absolute inset-0 z-0 opacity-40 transition-opacity duration-1000 group-hover:opacity-90 pointer-events-none">
                <div 
                  className="absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl animate-[pulse_6s_ease-in-out_infinite]"
                  style={{ background: "radial-gradient(circle, rgba(169, 200, 192, 0.15) 0%, rgba(146, 188, 227, 0.08) 50%, transparent 80%)" }}
                />
                <div 
                  className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full blur-3xl"
                  style={{ background: "radial-gradient(circle, rgba(146, 188, 227, 0.12) 0%, transparent 70%)" }}
                />
              </div>

              {/* Glowing Seafoam Top Hairline */}
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[rgba(169,200,192,0.6)] to-transparent" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-sans font-semibold tracking-widest text-[#a9c8c0] uppercase">Pelágica</span>
                  {isAuthenticated && user?.subscriptionTier === "PRO" ? (
                    <span className="rounded-full border border-[rgba(169,200,192,0.4)] bg-[rgba(169,200,192,0.1)] px-2.5 py-0.5 text-[9px] font-sans font-semibold uppercase tracking-widest text-[#a9c8c0]">
                      Plano Atual
                    </span>
                  ) : (
                    <span className="rounded-full border border-[rgba(169,200,192,0.4)] bg-[rgba(169,200,192,0.1)] px-2.5 py-0.5 text-[9px] font-sans font-semibold uppercase tracking-widest text-[#a9c8c0]">
                      Recomendado
                    </span>
                  )}
                </div>

                <h3 className="font-sans text-[22px] font-medium text-ink">Pro</h3>
                <p className="mt-2 text-[14px] text-body mb-7 min-h-[42px]">O padrão de excelência tática para atletas e equipes de alta performance.</p>
                <div className="mb-8 font-display text-[44px] leading-none text-[#a9c8c0]">R$ 49<span className="text-[15px] text-mute font-sans ml-1">/mês</span></div>
                <ul className="flex flex-col gap-3.5 text-[14px] text-body mb-8">
                  <li className="flex items-center gap-3"><PiShieldCheck className="h-4 w-4 text-[#a9c8c0] shrink-0" /> <span className="text-ink">Tudo do Plus</span></li>
                  <li className="flex items-center gap-3"><PiShieldCheck className="h-4 w-4 text-[#a9c8c0] shrink-0" /> <span className="text-ink">Selo Verificado Pro</span></li>
                  <li className="flex items-center gap-3"><PiShieldCheck className="h-4 w-4 text-[#a9c8c0] shrink-0" /> <span className="text-ink">Telemetria Abissal Completa</span></li>
                  <li className="flex items-center gap-3"><PiShieldCheck className="h-4 w-4 text-[#a9c8c0] shrink-0" /> <span className="text-ink">Acesso Antecipado a Torneios</span></li>
                </ul>
              </div>

              <div className="relative z-10">
                <button className="w-full bg-ink text-black h-[42px] rounded-[8px] text-[14px] font-semibold transition-all duration-300 hover:bg-white hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(169,200,192,0.2)]">
                  Assinar Pro
                </button>
              </div>
            </motion.div>

            {/* Max - Fossa Abissal */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.8, delay: 0.3, ease: EASE }}
              className={cn(
                "group relative flex flex-col justify-between rounded-[12px] bg-surface-card border border-[var(--hairline-strong)] p-8 transition-all duration-500 hover:bg-surface-elevated hover:border-white/20 min-h-[480px]",
                isAuthenticated && user?.subscriptionTier !== "MAX" ? "opacity-50 grayscale hover:opacity-100 hover:grayscale-0" : ""
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-sans font-semibold tracking-widest text-mute uppercase">Fossa Abissal</span>
                  {isAuthenticated && user?.subscriptionTier === "MAX" && (
                    <span className="rounded-full border border-[var(--hairline-strong)] bg-surface-deep px-2.5 py-0.5 text-[9px] font-sans font-semibold uppercase tracking-widest text-[#a9c8c0]">
                      Plano Atual
                    </span>
                  )}
                </div>
                <h3 className="font-sans text-[22px] font-medium text-ink">Max</h3>
                <p className="mt-2 text-[14px] text-body mb-7 min-h-[42px]">Acesso total e infraestrutura irrestrita para organizações.</p>
                <div className="mb-8 font-display text-[44px] leading-none text-ink">R$ 129<span className="text-[15px] text-mute font-sans ml-1">/mês</span></div>
                <ul className="flex flex-col gap-3.5 text-[14px] text-body mb-8">
                  <li className="flex items-center gap-3"><PiShieldCheck className="h-4 w-4 text-[#a9c8c0] shrink-0" /> <span className="text-ink">Tudo do Pro</span></li>
                  <li className="flex items-center gap-3"><PiShieldCheck className="h-4 w-4 text-mute group-hover:text-ink transition-colors shrink-0" /> <span>Telemetria em Tempo Real</span></li>
                  <li className="flex items-center gap-3"><PiShieldCheck className="h-4 w-4 text-mute group-hover:text-ink transition-colors shrink-0" /> <span>Acesso Direto à API Kurage</span></li>
                  <li className="flex items-center gap-3"><PiShieldCheck className="h-4 w-4 text-mute group-hover:text-ink transition-colors shrink-0" /> <span>Suporte Dedicado 24/7</span></li>
                </ul>
              </div>
              <button className="w-full bg-surface-elevated text-ink h-[40px] rounded-[8px] text-[14px] font-medium border border-[var(--hairline-strong)] transition-all duration-300 hover:bg-white/10 hover:border-white/25">
                Assinar Max
              </button>
            </motion.div>
          </div>
        </section>
      </div>

      {/* ── MAR ABERTO LIVE PREVIEW ── */}
      <HomeMarAberto />
    </div>
  );
}
