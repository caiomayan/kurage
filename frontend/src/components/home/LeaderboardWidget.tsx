"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { PiArrowRight, PiTrophy, PiWaves, PiCrosshair } from "react-icons/pi";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { Avatar } from "@/components/ui/Avatar";
import { KurageLevelIcon } from "@/components/ui/KurageLevelIcon";
import { FaceitLevelIcon } from "@/components/ui/faceit-levels/FaceitLevelIcon";
import { RoleIcon } from "@/components/ui/RoleIcon";
import { TeamLogo, KNOWN_TEAM_LOGOS } from "@/components/ui/TeamLogo";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { MergulharButton } from "@/components/ui/MergulharButton";

const EASE = [0.16, 1, 0.3, 1] as const;

interface LeaderboardPlayer {
  kurageId: string | number;
  username: string;
  avatarUrl: string | null;
  country?: string;
  kurageLevel?: number;
  faceitLevel?: number | null;
  kurageElo?: number;
  faceitElo?: number;
  position: number;
  kdRatio?: number | null;
  winRate?: number | null;
  matches?: number;
  primaryFunction?: string | null;
  teamTag?: string | null;
  teamName?: string | null;
  teamLogoUrl?: string | null;
}

interface LeaderboardWidgetProps {
  isAuthenticated?: boolean;
}

export function LeaderboardWidget({ isAuthenticated = false }: LeaderboardWidgetProps) {
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTopPlayers() {
      try {
        const response = await api.get<any>("/leaderboard/players?page=0&size=3");
        if (response && response.content && Array.isArray(response.content) && response.content.length > 0) {
          const mapped = response.content.map((p: any, idx: number) => {
            const teamInfo = p.teamTag && KNOWN_TEAM_LOGOS[p.teamTag.toUpperCase()];
            return {
              kurageId: p.kurageId || p.steamId64 || `player-${idx + 1}`,
              username: p.username || `Player #${idx + 1}`,
              avatarUrl: p.avatarUrl || null,
              country: p.country || "br",
              kurageLevel: p.kurageLevel ?? p.level ?? 0,
              faceitLevel: p.faceitLevel ?? null,
              kurageElo: p.kurageElo ?? p.faceitElo ?? 2000,
              position: p.position || idx + 1,
              kdRatio: p.kdRatio ?? null,
              winRate: p.winRate ?? null,
              matches: p.matches ?? 0,
              primaryFunction: p.primaryFunction || null,
              teamTag: p.teamTag || null,
              teamName: p.teamName || (teamInfo ? teamInfo.name : p.teamTag),
              teamLogoUrl: p.teamLogoUrl || (teamInfo ? teamInfo.logoUrl : null),
            };
          });
          setPlayers(mapped);
        } else {
          setPlayers([]);
        }
      } catch {
        setPlayers([]);
      } finally {
        setLoading(false);
      }
    }
    fetchTopPlayers();
  }, []);

  const firstPlace = players.find((p) => p.position === 1) || players[0];
  const secondPlace = players.find((p) => p.position === 2) || (players.length > 1 ? players[1] : undefined);
  const thirdPlace = players.find((p) => p.position === 3) || (players.length > 2 ? players[2] : undefined);

  return (
    <section className="relative z-10 border-t border-[var(--divider-soft)] py-24 sm:py-32 overflow-hidden bg-canvas">
      {/* ── BESPOKE SECTION ATMOSPHERE: Softly Dispersed Marine Lighting Across Entire Section ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none">
        {/* Full-Height Marine Atmospheric Wash */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 90% 80% at 50% 40%, rgba(169, 200, 192, 0.18) 0%, rgba(146, 188, 227, 0.08) 50%, transparent 85%)",
          }}
        />

        {/* 1. Top Section Header Halo (Soft Gold & Seafoam) */}
        <motion.div
          animate={{
            opacity: [0.2, 0.42, 0.2],
            scale: [0.95, 1.08, 0.95],
          }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[2%] left-1/2 -translate-x-1/2 w-[650px] h-[350px] mix-blend-screen blur-3xl opacity-40"
          style={{
            background: "radial-gradient(ellipse at center, rgba(229, 193, 88, 0.22) 0%, rgba(169, 200, 192, 0.12) 50%, transparent 75%)",
          }}
        />

        {/* 2. Mid-Left Silver/Cyan Floating Aura (Behind 2nd Place) */}
        <motion.div
          animate={{
            y: ["0px", "-40px", "0px"],
            opacity: [0.18, 0.38, 0.18],
          }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-[28%] left-[10%] w-[380px] h-[380px] rounded-full mix-blend-screen blur-3xl opacity-35"
          style={{
            background: "radial-gradient(circle, rgba(226, 232, 240, 0.22) 0%, rgba(146, 188, 227, 0.1) 50%, transparent 70%)",
          }}
        />

        {/* 3. Mid-Center Gold Champion Aura (Behind 1st Place) */}
        <motion.div
          animate={{
            y: ["0px", "-50px", "0px"],
            opacity: [0.22, 0.48, 0.22],
            scale: [0.95, 1.1, 0.95],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[480px] h-[480px] rounded-full mix-blend-screen blur-3xl opacity-45"
          style={{
            background: "radial-gradient(circle, rgba(229, 193, 88, 0.28) 0%, rgba(169, 200, 192, 0.12) 50%, transparent 70%)",
          }}
        />

        {/* 4. Mid-Right Bronze/Amber Floating Aura (Behind 3rd Place) */}
        <motion.div
          animate={{
            y: ["0px", "-40px", "0px"],
            opacity: [0.18, 0.38, 0.18],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-[32%] right-[10%] w-[380px] h-[380px] rounded-full mix-blend-screen blur-3xl opacity-35"
          style={{
            background: "radial-gradient(circle, rgba(205, 127, 50, 0.25) 0%, rgba(169, 200, 192, 0.08) 50%, transparent 70%)",
          }}
        />

        {/* 5. Lower Ground Base Radiance (Soft Base Footing) */}
        <motion.div
          animate={{
            opacity: [0.15, 0.32, 0.15],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[2%] left-1/2 -translate-x-1/2 w-[700px] h-[220px] mix-blend-screen blur-3xl opacity-30"
          style={{
            background: "radial-gradient(ellipse at 50% 100%, rgba(169, 200, 192, 0.25) 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-6">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center mb-16 sm:mb-20">
          <h2 className="font-display text-[44px] leading-[1.05] tracking-tight text-ink sm:text-[56px]">
            Os Melhores do Servidor.
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-body">
            Classificação em tempo real dos jogadores com maior dominância tática, rating individual e impacto em combate.
          </p>
        </div>

        {/* ── PHYSICAL STEPPED PODIUM (2 - 1 - 3) OR RESILIENT CALIBRATION PODIUM ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, ease: EASE }}
          className="mx-auto max-w-5xl"
        >
          {/* Calibrating Season Notice if 0 players */}
          {players.length === 0 && (
            <div className="mb-10 mx-auto max-w-lg text-center p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-md">
              <span className="text-[10px] font-sans font-semibold uppercase tracking-widest text-[#a9c8c0] flex items-center justify-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#a9c8c0] animate-pulse" />
                Temporada em Calibração
              </span>
              <p className="text-[13px] text-mute font-sans mt-1">
                As posições de destaque no pódio estão abertas. Jogue no servidor para inaugurar o ranking.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 sm:gap-4 lg:grid-cols-3 lg:items-end">
            
            {/* ── 2ND PLACE (Prata / Silver - Left Column) ── */}
            {secondPlace ? (
              <div className="order-2 lg:order-1 flex flex-col justify-end">
                <FloatingPlayerDetails
                  player={secondPlace}
                  rank={2}
                  tier="silver"
                  delay={0.1}
                />
                <PodiumStep
                  rank={2}
                  tier="silver"
                  height="h-32 sm:h-36"
                />
              </div>
            ) : (
              <GhostPodiumSpot
                rank={2}
                tier="silver"
                height="h-32 sm:h-36"
                orderClass="order-2 lg:order-1"
              />
            )}

            {/* ── 1ST PLACE (Ouro / Gold - Center Column - Tallest) ── */}
            {firstPlace ? (
              <div className="order-1 lg:order-2 flex flex-col justify-end">
                <FloatingPlayerDetails
                  player={firstPlace}
                  rank={1}
                  tier="gold"
                  delay={0}
                />
                <PodiumStep
                  rank={1}
                  tier="gold"
                  height="h-48 sm:h-56"
                />
              </div>
            ) : (
              <GhostPodiumSpot
                rank={1}
                tier="gold"
                height="h-48 sm:h-56"
                orderClass="order-1 lg:order-2"
              />
            )}

            {/* ── 3RD PLACE (Bronze - Right Column) ── */}
            {thirdPlace ? (
              <div className="order-3 lg:order-3 flex flex-col justify-end">
                <FloatingPlayerDetails
                  player={thirdPlace}
                  rank={3}
                  tier="bronze"
                  delay={0.2}
                />
                <PodiumStep
                  rank={3}
                  tier="bronze"
                  height="h-20 sm:h-24"
                />
              </div>
            ) : (
              <GhostPodiumSpot
                rank={3}
                tier="bronze"
                height="h-20 sm:h-24"
                orderClass="order-3 lg:order-3"
              />
            )}

          </div>

          {/* CTA Actions */}
          <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-4">
            <MergulharButton label="Mergulhar no Mar" size="lg" />

            <Link
              href="/ranking"
              className="group relative inline-flex h-12 items-center justify-center gap-2.5 rounded-[8px] border border-white/[0.08] bg-surface-card px-8 text-[14px] font-medium text-mute transition-all duration-300 hover:text-white hover:bg-white/[0.06] hover:border-white/20"
            >
              <span>Ver Classificação Geral</span>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

{/* ── FLOATING PLAYER DETAILS (Completely free of cards or background boxes) ── */}
interface FloatingPlayerDetailsProps {
  player: LeaderboardPlayer;
  rank: number;
  tier: "gold" | "silver" | "bronze";
  delay: number;
}

function FloatingPlayerDetails({ player, rank, tier, delay }: FloatingPlayerDetailsProps) {
  const eloValue = player.kurageElo ?? player.faceitElo ?? 2000;

  const tierStyles = {
    gold: {
      eloColor: "text-[#e5c158] drop-shadow-[0_0_16px_rgba(229,193,88,0.4)]",
      avatarRing: "ring-2 ring-[#e5c158] shadow-[0_0_24px_rgba(229,193,88,0.35)]",
      hoverText: "group-hover/player:text-[#e5c158]",
    },
    silver: {
      eloColor: "text-[#e2e8f0] drop-shadow-[0_0_12px_rgba(226,232,240,0.3)]",
      avatarRing: "ring-2 ring-[#e2e8f0] shadow-[0_0_18px_rgba(255,255,255,0.25)]",
      hoverText: "group-hover/player:text-white",
    },
    bronze: {
      eloColor: "text-[#cd7f32] drop-shadow-[0_0_12px_rgba(205,127,50,0.3)]",
      avatarRing: "ring-2 ring-[#cd7f32] shadow-[0_0_18px_rgba(205,127,50,0.25)]",
      hoverText: "group-hover/player:text-[#cd7f32]",
    },
  }[tier];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, delay, ease: EASE }}
      className="group/player flex flex-col items-center text-center pb-6 px-4"
    >
      {/* 1. Contextual Badges Row (Country, Team, Role, Level) */}
      <div className="flex items-center gap-2 mb-4">
        <CountryFlag country={player.country} expandOnHover={true} />

        {/* Team Logo with Expand-on-Hover & Fallback Shield */}
        {player.teamTag && (
          <TeamLogo
            teamTag={player.teamTag}
            teamName={player.teamName}
            logoUrl={player.teamLogoUrl}
            size={16}
            expandOnHover={true}
            isLink={true}
          />
        )}

        {/* In-Game Role */}
        {player.primaryFunction && (
          <RoleIcon 
            role={player.primaryFunction} 
            size={16} 
            expandOnHover={true}
          />
        )}

        {/* Player Level */}
        {player.kurageLevel !== undefined && player.kurageLevel !== null && player.kurageLevel > 0 ? (
          <KurageLevelIcon level={player.kurageLevel} className="h-5 w-5 text-[9px]" />
        ) : player.faceitLevel ? (
          <FaceitLevelIcon level={player.faceitLevel} className="w-5 h-5" />
        ) : null}
      </div>

      {/* 2. Avatar with Metallic Ring */}
      <Link href={`/player/${player.kurageId}`} className="group/avatar relative block mb-3 transition-transform duration-300 group-hover/avatar:scale-105">
        <Avatar
          src={player.avatarUrl}
          username={player.username}
          size={rank === 1 ? "xl" : "lg"}
          className={tierStyles.avatarRing}
        />
      </Link>

      {/* 3. Player Username */}
      <Link href={`/player/${player.kurageId}`} className="flex flex-col items-center">
        <span className={cn(
          "font-display text-ink transition-colors duration-200 tracking-tight",
          rank === 1 ? "text-[28px] sm:text-[34px]" : "text-[22px] sm:text-[26px]",
          tierStyles.hoverText
        )}>
          {player.username}
        </span>
      </Link>

      {/* 4. Rating ELO */}
      <div className="mt-2 flex flex-col items-center">
        <span className={cn(
          "font-display leading-none tracking-tight",
          rank === 1 ? "text-[46px] sm:text-[54px]" : "text-[36px] sm:text-[42px]",
          tierStyles.eloColor
        )}>
          {eloValue}
        </span>
        <span className="text-[10px] font-sans font-semibold tracking-widest text-mute uppercase mt-1">
          Rating ELO
        </span>
      </div>

      {/* 5. Minimal Floating Stats Line */}
      <div className="mt-4 flex items-center justify-center gap-3 text-[12px] font-sans text-body">
        <span><strong className="text-white">{player.kdRatio != null ? player.kdRatio.toFixed(2) : "-"}</strong> K/D</span>
        <span className="text-stone-600">·</span>
        <span><strong className="text-white">{player.winRate != null ? `${player.winRate.toFixed(0)}%` : "-"}</strong> WR</span>
        <span className="text-stone-600">·</span>
        <span><strong className="text-white">{player.matches ?? 0}</strong> Partidas</span>
      </div>
    </motion.div>
  );
}

{/* ── GHOST PODIUM SPOT (When a podium position is open for contention) ── */}
interface GhostPodiumSpotProps {
  rank: number;
  tier: "gold" | "silver" | "bronze";
  height: string;
  orderClass?: string;
}

function GhostPodiumSpot({ rank, tier, height, orderClass }: GhostPodiumSpotProps) {
  const tierConfig = {
    gold: {
      title: "1º Lugar",
      color: "text-[#e5c158]/60",
      ring: "border-[#e5c158]/30 shadow-[0_0_20px_rgba(229,193,88,0.1)]",
      aura: "rgba(229,193,88,0.06)",
    },
    silver: {
      title: "2º Lugar",
      color: "text-[#e2e8f0]/50",
      ring: "border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)]",
      aura: "rgba(255,255,255,0.04)",
    },
    bronze: {
      title: "3º Lugar",
      color: "text-[#cd7f32]/50",
      ring: "border-[#cd7f32]/30 shadow-[0_0_15px_rgba(205,127,50,0.08)]",
      aura: "rgba(205,127,50,0.05)",
    },
  }[tier];

  return (
    <div className={cn("flex flex-col justify-end", orderClass)}>
      <div className="flex flex-col items-center text-center pb-6 px-4">
        {/* Ghost Avatar Circle */}
        <div
          className={cn(
            "rounded-full border border-dashed flex items-center justify-center mb-3 transition-transform duration-300 hover:scale-105",
            rank === 1 ? "w-20 h-20 sm:w-24 sm:h-24" : "w-16 h-16 sm:w-20 sm:h-20",
            tierConfig.ring
          )}
          style={{ background: tierConfig.aura }}
        >
          <PiTrophy className={cn(rank === 1 ? "w-8 h-8 sm:w-10 sm:h-10" : "w-6 h-6 sm:w-8 sm:h-8", tierConfig.color)} />
        </div>

        {/* Ghost Title */}
        <span className={cn(
          "font-display font-semibold tracking-tight text-stone-400",
          rank === 1 ? "text-[22px] sm:text-[26px]" : "text-[18px] sm:text-[22px]"
        )}>
          {tierConfig.title}
        </span>

        {/* Subtitle */}
        <span className="text-[11px] font-sans text-stone-500 mt-1 uppercase tracking-widest">
          Aguardando Calibração
        </span>
      </div>

      <PodiumStep rank={rank} tier={tier} height={height} isGhost={true} />
    </div>
  );
}

{/* ── PHYSICAL PODIUM STEP (Stepped 3D Geometric Base with Metallic Engraved Numbers) ── */}
interface PodiumStepProps {
  rank: number;
  tier: "gold" | "silver" | "bronze";
  height: string;
  isGhost?: boolean;
}

function PodiumStep({ rank, tier, height, isGhost = false }: PodiumStepProps) {
  const stepStyles = {
    gold: {
      numberColor: isGhost ? "text-[#e5c158]/30" : "text-[#e5c158] drop-shadow-[0_0_24px_rgba(229,193,88,0.6)]",
      borderTop: isGhost ? "border-t border-dashed border-[rgba(229,193,88,0.4)]" : "border-t border-[rgba(229,193,88,0.7)] shadow-[0_-1px_15px_rgba(229,193,88,0.2)]",
      bgGradient: isGhost ? "bg-gradient-to-b from-[rgba(229,193,88,0.08)] via-surface-card/60 to-surface-deep/80 border-x border-dashed border-[rgba(229,193,88,0.15)]" : "bg-gradient-to-b from-[rgba(229,193,88,0.18)] via-surface-elevated/90 to-surface-deep/95 border-x border-[rgba(229,193,88,0.25)]",
    },
    silver: {
      numberColor: isGhost ? "text-white/20" : "text-[#e2e8f0] drop-shadow-[0_0_20px_rgba(226,232,240,0.5)]",
      borderTop: isGhost ? "border-t border-dashed border-white/20" : "border-t border-white/40 shadow-[0_-1px_12px_rgba(255,255,255,0.15)]",
      bgGradient: isGhost ? "bg-gradient-to-b from-white/[0.04] via-surface-card/60 to-surface-deep/80 border-x border-dashed border-white/10" : "bg-gradient-to-b from-white/[0.12] via-surface-card/90 to-surface-deep/95 border-x border-white/15",
    },
    bronze: {
      numberColor: isGhost ? "text-[#cd7f32]/25" : "text-[#cd7f32] drop-shadow-[0_0_20px_rgba(205,127,50,0.5)]",
      borderTop: isGhost ? "border-t border-dashed border-[rgba(205,127,50,0.3)]" : "border-t border-[rgba(205,127,50,0.5)] shadow-[0_-1px_12px_rgba(205,127,50,0.15)]",
      bgGradient: isGhost ? "bg-gradient-to-b from-[rgba(205,127,50,0.06)] via-surface-card/60 to-surface-deep/80 border-x border-dashed border-[rgba(205,127,50,0.12)]" : "bg-gradient-to-b from-[rgba(205,127,50,0.14)] via-surface-card/90 to-surface-deep/95 border-x border-[rgba(205,127,50,0.2)]",
    },
  }[tier];

  return (
    <div className={cn(
      "relative w-full rounded-t-[12px] flex items-center justify-center backdrop-blur-xl transition-all duration-500 overflow-hidden",
      height,
      stepStyles.borderTop,
      stepStyles.bgGradient
    )}>
      {/* Subtle top edge glow beam */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      
      {/* Large Engraved Podium Number (1, 2, 3) */}
      <span className={cn(
        "font-display font-extrabold leading-none tracking-tight select-none",
        rank === 1 ? "text-[64px] sm:text-[84px]" : "text-[48px] sm:text-[64px]",
        stepStyles.numberColor
      )}>
        {rank}
      </span>
    </div>
  );
}
