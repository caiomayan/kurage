"use client";

import React, { useRef, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import {
  PiArrowRight,
  PiChartLineUp,
  PiPalette,
  PiQueue,
  PiShieldCheck,
  PiSparkle,
  PiWaves,
} from "react-icons/pi";
import { SteamIcon } from "@/components/ui/PlatformIcons";
import { useAuth } from "@/lib/auth";
const Hero3DCanvas = dynamic(
  () => import("@/components/home/Hero3DCanvas").then((mod) => mod.Hero3DCanvas),
  { ssr: false, loading: () => <div className="h-full w-full" /> }
);
import { LeaderboardWidget } from "@/components/home/LeaderboardWidget";
import { HomeMarAberto } from "@/components/home/HomeMarAberto";
import type { UserWithStats } from "@/types/user";

const EASE = [0.16, 1, 0.3, 1] as const;

function MareBenefit({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="group flex gap-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-[10px] border border-[var(--mare-accent)]/20 bg-[var(--mare-accent)]/[0.07] text-[var(--mare-accent)] transition-colors group-hover:bg-[var(--mare-accent)]/12">
        <Icon className="size-[18px]" />
      </span>
      <div>
        <h4 className="text-sm font-medium text-ink">{title}</h4>
        <p className="mt-1.5 text-xs leading-relaxed text-charcoal">{description}</p>
      </div>
    </div>
  );
}

const FUNCTION_LABEL: Record<NonNullable<UserWithStats["primaryFunction"]>, string> = {
  IGL: "IGL",
  AWPER: "AWP",
  ENTRY: "Entry",
  SUPPORT: "Suporte",
  LURKER: "Lurker",
  CORINGA: "Coringa",
};

function getPersonalizedHeroMessages(user: UserWithStats): string[] {
  const stats = user.stats;
  const matches = stats?.matchesPlayed ?? 0;
  const messages: string[] = [];

  if (matches > 0) {
    messages.push(`${matches} partidas no Kurage.`);
    messages.push(`${stats?.kurageElo ?? 200} de ELO no seu registro.`);

    if ((stats?.matchesWon ?? 0) > 0) {
      messages.push(`${stats?.matchesWon} vitórias conquistadas.`);
    }

    if ((stats?.winRate ?? 0) > 0) {
      messages.push(`${stats?.winRate}% de vitórias até aqui.`);
    }
  }

  if (user.faceitUsername) {
    messages.push(`Faceit conectado: ${user.faceitUsername}.`);
  }

  if (user.faceitLevel) {
    messages.push(`Nível ${user.faceitLevel} na Faceit.`);
  }

  if (user.primaryFunction && user.primaryFunction !== "CORINGA") {
    messages.push(`Seu papel: ${FUNCTION_LABEL[user.primaryFunction]}.`);
  }

  if (user.subscriptionTier === "MARE") {
    messages.push("Sua Maré está ativa.");
  }

  // Every authenticated player has a stable, individual datum even before
  // playing their first Kurage match.
  messages.push(`Seu passaporte é #${user.kurageId}.`);

  return [...new Set(messages)];
}

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

  const keywords = isAuthenticated && user
    ? getPersonalizedHeroMessages(user)
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
                "radial-gradient(ellipse 90% 80% at 50% 35%, rgba(var(--kurage-accent-rgb),0.16) 0%, rgba(146, 188, 227, 0.06) 50%, transparent 85%)",
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
              background: "radial-gradient(circle, rgba(var(--kurage-accent-rgb),0.28) 0%, rgba(146, 188, 227, 0.1) 50%, transparent 70%)",
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
              background: "radial-gradient(circle, rgba(146, 188, 227, 0.28) 0%, rgba(var(--kurage-accent-rgb),0.1) 50%, transparent 70%)",
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
              background: "radial-gradient(circle, rgba(var(--kurage-accent-rgb),0.3) 0%, rgba(146, 188, 227, 0.12) 50%, transparent 70%)",
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
              background: "radial-gradient(circle, rgba(146, 188, 227, 0.3) 0%, rgba(var(--kurage-accent-rgb),0.12) 50%, transparent 70%)",
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
              background: "radial-gradient(circle, rgba(var(--kurage-accent-rgb),0.28) 0%, transparent 70%)",
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
              background: "radial-gradient(circle, rgba(146, 188, 227, 0.28) 0%, rgba(var(--kurage-accent-rgb),0.08) 50%, transparent 70%)",
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
              background: "radial-gradient(circle, rgba(var(--kurage-accent-rgb),0.25) 0%, transparent 70%)",
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
                          <div className="absolute -bottom-1 left-0 h-px w-0 bg-gradient-to-r from-[#92bce3] via-[var(--kurage-accent)] to-transparent transition-all duration-500 ease-out group-hover:w-full" />
                        </Link>
                        <Link
                          href="/mar"
                          className="group relative inline-flex h-12 items-center justify-center text-[15px] font-medium text-mute transition-colors hover:text-white"
                        >
                          <span className="relative z-10 flex items-center gap-2">
                            Navegar no mar
                            <PiArrowRight className="h-4 w-4 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 text-[var(--kurage-accent)]" />
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
                          <div className="absolute -bottom-1 left-0 h-px w-0 bg-gradient-to-r from-[#92bce3] via-[var(--kurage-accent)] to-transparent transition-all duration-500 ease-out group-hover:w-full" />
                        </button>
                        <Link
                          href="/mar"
                          className="group relative inline-flex h-12 items-center justify-center text-[15px] font-medium text-mute transition-colors hover:text-white"
                        >
                          <span className="relative z-10 flex items-center gap-2">
                            Navegar no mar
                            <PiArrowRight className="h-4 w-4 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 text-[var(--kurage-accent)]" />
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

      <LeaderboardWidget />

      {/* ── MARÉ MEMBERSHIP ── */}
      <div className="relative z-10 w-full bg-canvas">
        <section className="relative mx-auto w-full max-w-7xl px-6 py-24 sm:py-32 overflow-hidden border-t border-[var(--divider-soft)]">
          
          {/* Coral current reserved for the platform-wide Maré membership. */}
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
                background: "radial-gradient(ellipse at 50% 30%, rgba(var(--mare-accent-rgb), 0.3) 0%, rgba(var(--mare-accent-rgb), 0.1) 45%, transparent 75%)",
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
                background: "radial-gradient(circle, rgba(var(--mare-accent-rgb), 0.2) 0%, transparent 70%)",
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
                background: "radial-gradient(circle, rgba(var(--mare-accent-rgb), 0.14) 0%, transparent 70%)",
              }}
            />
          </div>
          
          <div className="relative z-10 mx-auto max-w-3xl text-center">
            <h2 className="font-display text-[48px] leading-[1.05] tracking-tight text-ink sm:text-[64px]">
              Uma assinatura. Toda a Kurage.
            </h2>
            <p className="mt-5 text-[17px] leading-relaxed text-body">
              Maré acompanha seu passaporte por todos os servidores, modos e recursos da plataforma. Sem vantagem dentro da partida — só uma experiência mais profunda ao redor dela.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.65, ease: EASE, delay: 0.08 }}
            className="relative z-10 mx-auto mt-12 max-w-5xl overflow-hidden rounded-[16px] border border-[var(--mare-accent)]/30 bg-surface-card"
          >
            <div aria-hidden className="pointer-events-none absolute -right-28 -top-36 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(var(--mare-accent-rgb),0.24),transparent_67%)] blur-2xl" />
            <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--mare-accent)] to-transparent opacity-80" />

            <div className="relative grid gap-0 lg:grid-cols-[0.82fr_1.18fr]">
              <div className="flex flex-col justify-between border-b border-white/[0.07] p-7 sm:p-10 lg:border-b-0 lg:border-r">
                <div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--mare-accent)]/35 bg-[var(--mare-accent)]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--mare-accent)]">
                      <PiWaves className="size-3.5" /> Plano único
                    </span>
                    {user?.subscriptionTier === "MARE" && (
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--mare-accent)]">Ativo</span>
                    )}
                  </div>

                  <h3 className="mt-8 font-display text-[58px] leading-none text-ink sm:text-[72px]">
                    Maré<span className="text-[var(--mare-accent)]">.</span>
                  </h3>
                  <p className="mt-5 max-w-md text-[15px] leading-relaxed text-body">
                    Sua identidade premium atravessa a Kurage inteira e evolui junto com cada nova corrente da plataforma.
                  </p>
                </div>

                <div className="mt-10 border-t border-white/[0.07] pt-6">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-mute">Assinatura mensal</p>
                  <p className="mt-2 text-sm text-ink">
                    {user?.subscriptionTier === "MARE" ? "Maré está ativa no seu passaporte." : "Checkout e valor em preparação."}
                  </p>
                </div>
              </div>

              <div className="p-7 sm:p-10">
                <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
                  <MareBenefit icon={PiPalette} title="Identidade Maré" description="Tema coral exclusivo e selo Maré em todo o ecossistema." />
                  <MareBenefit icon={PiQueue} title="Prioridade global" description="Fila prioritária nos servidores oficiais, sem expulsar quem já está jogando." />
                  <MareBenefit icon={PiChartLineUp} title="Visão ampliada" description="Histórico, filtros e análises avançadas conforme os dados forem liberados." />
                  <MareBenefit icon={PiSparkle} title="Acesso antecipado" description="Entrada nas primeiras ondas de novos modos, recursos e experiências." />
                </div>

                <div className="mt-9 flex items-center gap-3 rounded-[10px] border border-white/[0.07] bg-black/30 px-4 py-3.5">
                  <PiShieldCheck className="size-4 shrink-0 text-[var(--mare-accent)]" />
                  <p className="text-xs leading-relaxed text-charcoal">Maré nunca altera dano, economia, balanceamento ou resultado de uma partida.</p>
                </div>
              </div>
            </div>
          </motion.div>

        </section>
      </div>

      {/* ── MAR ABERTO LIVE PREVIEW ── */}
      <HomeMarAberto />
    </div>
  );
}
