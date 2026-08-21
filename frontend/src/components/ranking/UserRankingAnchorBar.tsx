"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  PiTrophy,
  PiArrowRight,
  PiX,
  PiCrosshair,
  PiWaves,
  PiChartLineUp,
  PiArrowUp,
  PiArrowDown,
  PiMinus,
  PiSignIn,
  PiLightning,
  PiArrowsClockwise,
} from "react-icons/pi";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { KurageLevelIcon } from "@/components/ui/KurageLevelIcon";
import { RoleIcon } from "@/components/ui/RoleIcon";
import { MergulharButton } from "@/components/ui/MergulharButton";
import type { User, UserWithStats } from "@/types/user";
import type { PlayerRankingContext } from "@/types/ranking";

const CALIBRATION_REQUIREMENT = 5;

interface UserRankingAnchorBarProps {
  user: User | UserWithStats | null;
  isAuthenticated: boolean;
  userContext?: PlayerRankingContext | null;
  onLogin: () => void;
}

export function UserRankingAnchorBar({
  user,
  isAuthenticated,
  userContext,
  onLogin,
}: UserRankingAnchorBarProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Unauthenticated Visitor State
  if (!isAuthenticated || !user) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-auto flex items-center justify-between p-3.5 rounded-[14px] bg-[#070b0e]/95 backdrop-blur-2xl border border-white/[0.08] shadow-[0_12px_45px_rgba(0,0,0,0.85)]"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#a9c8c0]/10 border border-[#a9c8c0]/20 flex items-center justify-center text-[#a9c8c0]">
              <PiTrophy className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] font-sans font-medium text-white">
                Acompanhe sua Posição
              </span>
              <span className="text-[11px] font-sans text-stone-400">
                Conecte sua Steam para calcular seu ELO e calibrar seu ranking.
              </span>
            </div>
          </div>

          <button
            onClick={onLogin}
            className="inline-flex h-8 items-center justify-center gap-1.5 px-3.5 rounded-[6px] bg-[#a9c8c0]/15 hover:bg-[#a9c8c0]/25 border border-[#a9c8c0]/30 text-[12px] font-sans font-medium text-[#a9c8c0] transition-colors cursor-pointer"
          >
            <PiSignIn className="w-3.5 h-3.5" />
            <span>Entrar com Steam</span>
          </button>
        </motion.div>
      </div>
    );
  }

  const userStats = (user as UserWithStats).stats;
  const contextPlayer = userContext?.player;

  const matches = userStats?.matchesPlayed ?? (contextPlayer?.matches ?? 0);
  const isUncalibrated = matches === 0;
  const isCalibrating = matches > 0 && matches < CALIBRATION_REQUIREMENT;
  const isFullyCalibrated = matches >= CALIBRATION_REQUIREMENT;

  const currentPosition = userContext?.currentPosition;
  const positionDelta = userContext?.deltaYesterday ?? 0;
  const kurageElo = userStats?.kurageElo ?? (contextPlayer?.kurageElo ?? 200);
  const kurageLevel = userStats?.kurageLevel ?? (contextPlayer?.kurageLevel ?? 1);

  let kdRatio = "-";
  if (contextPlayer?.kdRatio !== undefined && contextPlayer?.kdRatio !== null) {
    kdRatio = contextPlayer.kdRatio.toFixed(2);
  } else if (userStats && userStats.deaths > 0) {
    kdRatio = (userStats.kills / userStats.deaths).toFixed(2);
  } else if (userStats && userStats.kills > 0) {
    kdRatio = `${userStats.kills}.00`;
  }

  let winRate = "-";
  if (contextPlayer?.winRate !== undefined && contextPlayer?.winRate !== null) {
    winRate = `${contextPlayer.winRate}%`;
  } else if (userStats && matches > 0) {
    winRate = `${Math.round(((userStats.matchesWon || 0) / matches) * 100)}%`;
  }

  const profileUrl = user.kurageId ? `/player/${user.kurageId}` : `/player/${user.steamId64}`;

  return (
    <>
      {/* ── 1. COMPACT FLOATING BAR (Fixed Bottom Center) ── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-auto flex items-center justify-between gap-4 p-3 sm:p-3.5 rounded-[14px] bg-[#070b0e]/95 backdrop-blur-2xl border border-[rgba(169,200,192,0.25)] shadow-[0_16px_50px_rgba(0,0,0,0.9)]"
        >
          {/* Left: User Identity & Calibration / Rank Pill */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsModalOpen(true)}
              className="relative shrink-0 cursor-pointer group/avatar focus:outline-none"
              title="Ver detalhes de ranking"
            >
              <Avatar
                src={user.avatarUrl}
                username={user.username}
                size="sm"
                isVerifiedPro={user.isVerifiedPro}
                enableHovercard={false}
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-surface-deep flex items-center justify-center">
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isFullyCalibrated ? "bg-accent-green" : isCalibrating ? "bg-amber-400 animate-pulse" : "bg-mute"
                )} />
              </div>
            </button>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-sans font-semibold uppercase tracking-wider text-mute truncate">
                  Sua Posição
                </span>

                {isUncalibrated ? (
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded-full bg-white/[0.06] text-[10px] font-sans text-stone-400">
                    Sem Calibração
                  </span>
                ) : isCalibrating ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full bg-amber-400/10 border border-amber-400/20 text-[10px] font-sans font-medium text-amber-300">
                    <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
                    Calibrando ({matches}/{CALIBRATION_REQUIREMENT})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-sans font-bold text-accent-green">
                    <PositionDeltaMini delta={positionDelta} />
                  </span>
                )}
              </div>

              {/* Status / Position Display */}
              <div className="flex items-center gap-2 mt-0.5">
                {isFullyCalibrated ? (
                  <>
                    <span className="font-display text-[17px] font-extrabold text-white leading-none">
                      #{currentPosition ?? "-"}
                    </span>
                    <span className="text-stone-600">·</span>
                    <span className="font-sans text-[13px] text-[#a9c8c0] font-medium leading-none">
                      {kurageElo} ELO
                    </span>
                    <span className="text-stone-600 hidden sm:inline">·</span>
                    <span className="text-[11px] font-sans text-stone-400 hidden sm:inline">
                      {kdRatio} K/D
                    </span>
                  </>
                ) : isCalibrating ? (
                  <>
                    <span className="font-sans text-[13px] font-medium text-stone-300">
                      {kurageElo} ELO
                    </span>
                    <span className="text-stone-600">·</span>
                    <span className="text-[11px] font-sans text-amber-300/90">
                      Faltam {CALIBRATION_REQUIREMENT - matches} partidas
                    </span>
                  </>
                ) : (
                  <span className="text-[12px] font-sans text-stone-400 truncate">
                    Jogue partidas ranqueadas para calibrar seu ELO
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="hidden sm:inline-flex h-8 items-center justify-center gap-1 px-3 rounded-[6px] bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[12px] font-sans font-medium text-stone-300 hover:text-white transition-colors cursor-pointer"
            >
              <PiChartLineUp className="w-3.5 h-3.5 text-[#a9c8c0]" />
              <span>Detalhes</span>
            </button>

            {isUncalibrated || isCalibrating ? (
              <Link
                href="/mar"
                className="inline-flex h-8 items-center justify-center gap-1.5 px-3.5 rounded-[6px] bg-[#a9c8c0]/15 hover:bg-[#a9c8c0]/25 border border-[#a9c8c0]/35 text-[12px] font-sans font-medium text-white transition-all shadow-[0_0_15px_rgba(169,200,192,0.1)]"
              >
                <span>Jogar Agora</span>
                <PiArrowRight className="w-3 h-3 text-[#a9c8c0]" />
              </Link>
            ) : (
              <Link
                href={profileUrl}
                className="inline-flex h-8 items-center justify-center gap-1.5 px-3.5 rounded-[6px] bg-white/[0.08] hover:bg-white/15 border border-white/10 text-[12px] font-sans font-medium text-white transition-colors"
              >
                <span>Meu Perfil</span>
                <PiArrowRight className="w-3 h-3 text-mute" />
              </Link>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── 2. DETAILED TACTICAL RANKING MODAL ── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 w-full max-w-lg rounded-[16px] bg-[#070b0e] border border-white/[0.1] shadow-[0_24px_80px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col"
            >
              {/* Atmospheric Background Aurora */}
              <div className="absolute top-0 inset-x-0 h-40 pointer-events-none overflow-hidden opacity-35">
                <div
                  className="w-full h-full"
                  style={{
                    background:
                      "radial-gradient(ellipse at 50% 0%, rgba(169, 200, 192, 0.4) 0%, rgba(146, 188, 227, 0.15) 50%, transparent 80%)",
                  }}
                />
              </div>

              {/* Modal Header */}
              <div className="relative z-10 flex items-start justify-between p-6 pb-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-3.5">
                  <Avatar
                    src={user.avatarUrl}
                    username={user.username}
                    size="lg"
                    isVerifiedPro={user.isVerifiedPro}
                    enableHovercard={false}
                  />

                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-[22px] font-bold text-white tracking-tight">
                        {user.username}
                      </span>
                      <CountryFlag country={user.country} expandOnHover={true} />
                      {kurageLevel > 0 && <KurageLevelIcon level={kurageLevel} />}
                    </div>

                    <span className="text-[12px] font-sans text-stone-400">
                      Kurage ID #{user.kurageId}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg p-1.5 text-stone-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <PiX className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="relative z-10 p-6 flex flex-col gap-6">
                {/* Calibration Status HUD */}
                {!isFullyCalibrated ? (
                  <div className="flex flex-col gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PiCrosshair className="w-4 h-4 text-amber-400" />
                        <span className="text-[13px] font-sans font-semibold text-white">
                          Status de Calibração
                        </span>
                      </div>
                      <span className="text-[12px] font-mono font-bold text-amber-400">
                        {matches} / {CALIBRATION_REQUIREMENT} Partidas
                      </span>
                    </div>

                    {/* Stepped Checkpoint Dots */}
                    <div className="grid grid-cols-5 gap-2 my-1">
                      {Array.from({ length: CALIBRATION_REQUIREMENT }).map((_, idx) => {
                        const isCompleted = idx < matches;
                        return (
                          <div
                            key={idx}
                            className={cn(
                              "h-2 rounded-full transition-all duration-500",
                              isCompleted
                                ? "bg-[#a9c8c0] shadow-[0_0_10px_rgba(169,200,192,0.6)]"
                                : "bg-white/10"
                            )}
                          />
                        );
                      })}
                    </div>

                    <p className="text-[12px] font-sans text-stone-400 leading-relaxed">
                      {isUncalibrated
                        ? "Você ainda não possui partidas ranqueadas registradas no servidor. Jogue para definir sua colocação inicial no ranking."
                        : `Faltam apenas ${CALIBRATION_REQUIREMENT - matches} partida(s) competitiva(s) para consolidar seu índice de rating oficial.`}
                    </p>
                  </div>
                ) : null}

                {/* Primary Metrics Grid */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col items-center justify-center">
                    <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-mute">
                      Posição Oficial
                    </span>
                    <span className="font-display text-[26px] font-extrabold text-white mt-1 leading-none">
                      {isFullyCalibrated ? `#${currentPosition ?? "-"}` : "—"}
                    </span>
                    <div className="mt-1 text-[11px] font-sans text-stone-400 flex items-center justify-center gap-1">
                      {isFullyCalibrated ? (
                        <PositionDeltaMini delta={positionDelta} />
                      ) : (
                        <span>Em calibração</span>
                      )}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col items-center justify-center">
                    <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-mute">
                      Rating ELO
                    </span>
                    <span className="font-display text-[26px] font-extrabold text-[#a9c8c0] mt-1 leading-none">
                      {kurageElo}
                    </span>
                    <span className="mt-1 text-[11px] font-sans text-stone-400">
                      Nível {kurageLevel}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col items-center justify-center">
                    <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-mute">
                      Taxa de Vitória
                    </span>
                    <span className="font-display text-[26px] font-extrabold text-white mt-1 leading-none">
                      {winRate}
                    </span>
                    <span className="mt-1 text-[11px] font-sans text-stone-400">
                      {matches} partidas
                    </span>
                  </div>
                </div>

                {/* Next Target / Competitor to Pass (If calibrated and exists) */}
                {isFullyCalibrated && userContext?.nextPlayerToPass && (
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#e5c158]/10 flex items-center justify-center text-[#e5c158]">
                        <PiTrophy className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-sans uppercase tracking-wider text-mute">
                          Próximo Alvo no Ranking
                        </span>
                        <span className="text-[13px] font-sans font-semibold text-white">
                          #{userContext.nextPlayerToPass.position} {userContext.nextPlayerToPass.username}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-sans text-stone-400 block">Diferença</span>
                      <span className="text-[13px] font-mono font-bold text-[#a9c8c0]">
                        +{(userContext.nextPlayerToPass.kurageElo || 0) - kurageElo} ELO
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="relative z-10 p-6 pt-0 flex items-center justify-end gap-3">
                <Link
                  href="/mar"
                  onClick={() => setIsModalOpen(false)}
                  className="inline-flex h-10 items-center justify-center gap-2 px-5 rounded-[8px] bg-[#a9c8c0]/15 hover:bg-[#a9c8c0]/25 border border-[#a9c8c0]/35 text-[13px] font-sans font-medium text-white transition-all shadow-[0_0_20px_rgba(169,200,192,0.1)]"
                >
                  <PiWaves className="w-4 h-4 text-[#a9c8c0]" />
                  <span>Mergulhar no Mar</span>
                </Link>

                <Link
                  href={profileUrl}
                  onClick={() => setIsModalOpen(false)}
                  className="inline-flex h-10 items-center justify-center gap-2 px-5 rounded-[8px] bg-white/[0.08] hover:bg-white/15 border border-white/10 text-[13px] font-sans font-medium text-white transition-colors"
                >
                  <span>Ver Perfil Completo</span>
                  <PiArrowRight className="w-4 h-4 text-mute" />
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── POSITION DELTA MINI HELPER ──
function PositionDeltaMini({ delta }: { delta?: number | null }) {
  if (delta === undefined || delta === null || delta === 0) {
    return (
      <span className="flex items-center gap-0.5 text-stone-500 font-sans" title="Posição estável">
        <PiMinus className="w-2.5 h-2.5" />
        <span>Estável</span>
      </span>
    );
  }
  if (delta > 0) {
    return (
      <span className="flex items-center gap-0.5 text-accent-green font-sans" title={`Subiu ${delta} posições`}>
        <PiArrowUp className="w-3 h-3" />
        <span>+{delta}</span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-accent-red font-sans" title={`Caiu ${Math.abs(delta)} posições`}>
      <PiArrowDown className="w-3 h-3" />
      <span>{delta}</span>
    </span>
  );
}
