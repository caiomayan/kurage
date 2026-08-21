"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  PiArrowRight,
  PiWaves,
  PiClock,
  PiTrophy,
  PiWrench,
  PiCheck,
  PiLightning,
  PiShieldCheck,
} from "react-icons/pi";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { KurageLevelIcon } from "@/components/ui/KurageLevelIcon";
import { FaceitLevelIcon } from "@/components/ui/faceit-levels/FaceitLevelIcon";
import { RoleIcon } from "@/components/ui/RoleIcon";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { MergulharButton } from "@/components/ui/MergulharButton";
import { api } from "@/lib/api";
import { mapServerPlayersToLiveStats } from "@/lib/serverTelemetry";
import type { LiveServerState, ServerGameMode } from "@/types/server";

const EASE = [0.16, 1, 0.3, 1] as const;

// Default initial state matching official live server
const DEFAULT_HOME_SERVER: LiveServerState = {
  ip: "play.kurage.caiomayan.com",
  map: "de_mirage",
  mode: "COMPETITIVO",
  tickrate: 128,
  status: "offline",
  maxPlayers: 10,
  ctScore: 0,
  trScore: 0,
  ctPlayers: [],
  trPlayers: [],
};

interface HomeMarAbertoProps {
  initialState?: LiveServerState;
}

export function HomeMarAberto({
  initialState = DEFAULT_HOME_SERVER,
}: HomeMarAbertoProps) {
  const [serverState, setServerState] = useState<LiveServerState>(initialState);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchLiveServer() {
      try {
        const servers = await api.get<any[]>("/servers");
        if (isMounted) {
          if (Array.isArray(servers) && servers.length > 0) {
            const active = servers.find((s) => s.isOnline);
            if (active && active.isOnline) {
              const rawMode = String(active.gameMode || "").toUpperCase();
              let mode: ServerGameMode = "COMPETITIVO";
              if (rawMode.includes("RETAKE")) mode = "RETAKE";
              else if (rawMode.includes("DM") || rawMode.includes("DEATHMATCH"))
                mode = "DEATHMATCH";
              else if (rawMode.includes("PRACTICE")) mode = "PRACTICE";
              else mode = "COMPETITIVO";

              const { ctPlayers, trPlayers } = mapServerPlayersToLiveStats(
                active.players ?? [],
              );

              setServerState({
                ip: `connect ${active.hostname || "play.kurage.caiomayan.com"}:${active.port || 27015}`,
                map: active.currentMap || "de_mirage",
                mode,
                tickrate: 128,
                status: active.currentPlayers > 0 ? "live" : "warmup",
                maxPlayers: active.maxPlayers || 10,
                ctScore: 0,
                trScore: 0,
                ctPlayers,
                trPlayers,
              });
            } else {
              setServerState(DEFAULT_HOME_SERVER);
            }
          } else {
            setServerState(DEFAULT_HOME_SERVER);
          }
        }
      } catch {
        if (isMounted) {
          setServerState(DEFAULT_HOME_SERVER);
        }
      } finally {
        if (isMounted) setIsLoaded(true);
      }
    }
    fetchLiveServer();
    const interval = setInterval(fetchLiveServer, 8000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <section className="relative z-10 w-full overflow-hidden bg-canvas py-24 sm:py-32 border-t border-[var(--divider-soft)]">
      {/* ── BESPOKE SECTION ATMOSPHERE: Tidal Current Wave & Tactical Pulse ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none"
      >
        <motion.div
          animate={{
            x: ["-12%", "12%", "-12%"],
            y: ["0%", "10%", "0%"],
            opacity: [0.5, 0.85, 0.5],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-[-10%] top-[15%] h-[480px] w-[120%] rounded-full mix-blend-screen blur-3xl opacity-75"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(169, 200, 192, 0.35) 0%, rgba(146, 188, 227, 0.16) 50%, transparent 75%)",
          }}
        />

        <motion.div
          animate={{
            scale: [0.85, 1.25, 0.85],
            opacity: [0.35, 0.75, 0.35],
          }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute right-[8%] top-[20%] h-[550px] w-[550px] rounded-full mix-blend-screen blur-3xl opacity-65"
          style={{
            background:
              "radial-gradient(circle, rgba(169, 200, 192, 0.45) 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-12 lg:gap-16">
          {/* ── Left Column: Editorial Presentation ── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: EASE }}
            className="flex flex-col lg:col-span-5"
          >
            <h2 className="font-display text-[44px] leading-[1.05] tracking-tight text-ink sm:text-[56px]">
              O Mar.
            </h2>

            <p className="mt-6 text-[16px] leading-relaxed text-body">
              O servidor oficial e coração competitivo da Kurage. Conecte-se ao
              ecossistema 128-tick para disputar partidas ranqueadas com
              telemetria milimétrica, gravação instantânea de rounds e
              calibração contínua do seu ELO.
            </p>

            {/* Bespoke Underwater Mergulhar Action Button */}
            <div className="mt-10 flex items-center gap-4">
              <MergulharButton
                size="lg"
                label="Mergulhar no Mar"
                onClick={() => {
                  window.location.href = "/mar";
                }}
              />
            </div>
          </motion.div>

          {/* ── Right Column: 3D Isometric Tilted Interactive Arena Card ── */}
          <div className="w-full lg:col-span-7 [perspective:1400px]">
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.95,
                y: 30,
                rotateY: -8,
                rotateX: 6,
              }}
              whileInView={{
                opacity: 1,
                scale: 1,
                y: 0,
                rotateY: -5,
                rotateX: 3,
              }}
              viewport={{ once: true, margin: "-100px" }}
              whileHover={{ rotateY: 0, rotateX: 0, scale: 1.015 }}
              transition={{ duration: 0.7, ease: EASE }}
              style={{ transformStyle: "preserve-3d" }}
              className="w-full"
            >
              <Link
                href="/mar"
                className="group relative block rounded-[16px] border border-[rgba(169,200,192,0.25)] bg-surface-card overflow-hidden transition-all duration-700 hover:border-[rgba(169,200,192,0.6)] shadow-[0_30px_80px_rgba(0,0,0,0.85)] hover:shadow-[0_35px_90px_rgba(0,0,0,0.95),0_0_35px_rgba(169,200,192,0.15)]"
              >
                {/* Background Map Image with Deep-Sea Gradient Masks */}
                <div className="absolute inset-0 z-0">
                  <Image
                    src={`/thumbs/${serverState.map || "de_mirage"}.png`}
                    alt={serverState.map || "map"}
                    fill
                    className={cn(
                      "object-cover transition-all duration-[2.5s] ease-out group-hover:scale-105",
                      serverState.status === "offline"
                        ? "opacity-10 saturate-0"
                        : "opacity-35 saturate-100 group-hover:opacity-45",
                    )}
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/85 to-black/35" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black via-black/55 to-transparent" />
                </div>

                {/* Glowing Top Hairline */}
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[rgba(169,200,192,0.5)] to-transparent opacity-80" />

                {/* ── CARD CONTENT (Polymorphic per Server Mode) ── */}
                <div className="relative z-10 p-6 sm:p-8 flex flex-col justify-between min-h-[360px]">
                  {/* 1. Header: Server Title & Clean Live Dot */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h3 className="font-display text-[22px] leading-none text-white tracking-tight">
                        O Mar
                      </h3>
                      <span className="text-[11px] font-sans uppercase tracking-wider text-mute">
                        {serverState.status === "offline"
                          ? "Repouso"
                          : serverState.status === "warmup"
                            ? "Warmup"
                            : serverState.mode}
                      </span>
                    </div>

                    {/* Clean Status Dot */}
                    <div className="flex items-center">
                      {serverState.status === "live" ? (
                        <div
                          className="w-2.5 h-2.5 rounded-full bg-accent-green shadow-[0_0_12px_rgba(17,255,153,0.8)] animate-pulse"
                          title="Online em tempo real"
                        />
                      ) : serverState.status === "warmup" ? (
                        <div
                          className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.8)] animate-pulse"
                          title="Aquecimento"
                        />
                      ) : (
                        <div
                          className="w-2.5 h-2.5 rounded-full bg-mute/40"
                          title="Offline"
                        />
                      )}
                    </div>
                  </div>

                  {/* 2. BODY CONTENT: Polymorphic per mode */}
                  {serverState.status === "offline" ? (
                    <div className="flex flex-col items-center justify-center my-auto py-8 text-center">
                      <div className="w-12 h-12 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-mute mb-3 shadow-[0_0_20px_rgba(169,200,192,0.05)]">
                        <PiWaves className="w-6 h-6 text-[#a9c8c0]/70" />
                      </div>
                      <h4 className="font-display text-[24px] sm:text-[28px] text-white">
                        O servidor está em repouso.
                      </h4>
                      <p className="text-[13px] text-body mt-1.5 max-w-xs font-sans">
                        Conecte-se para despertar o servidor e iniciar o
                        aquecimento.
                      </p>
                    </div>
                  ) : serverState.status === "warmup" ? (
                    /* Warmup State Preview */
                    <div className="flex flex-col items-center justify-center my-auto py-4 text-center">
                      <span className="text-[10px] font-sans font-semibold uppercase tracking-widest text-amber-400 mb-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        Aquecimento Pré-Partida
                      </span>
                      <span className="text-[48px] sm:text-[56px] font-display text-white leading-none my-1">
                        {serverState.warmupInfo?.timeRemaining || "01:24"}
                      </span>
                      <span className="text-[12px] font-sans text-stone-400 mt-1">
                        {serverState.warmupInfo?.readyCount || 0} /{" "}
                        {serverState.warmupInfo?.totalRequired || 10} Jogadores
                        Prontos
                      </span>
                    </div>
                  ) : serverState.mode === "RETAKE" ? (
                    /* Retake Mode Preview */
                    <div className="py-4 my-auto flex flex-col gap-4 border-y border-white/[0.08]">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-sans font-semibold text-[#92BCE3] uppercase">
                          Defensores CT
                        </span>
                        <div className="flex items-center gap-4">
                          <span className="text-[44px] font-display text-[#92BCE3] leading-none">
                            {serverState.ctScore ?? 0}
                          </span>
                          <span className="text-[20px] font-display text-stone-400">
                            -
                          </span>
                          <span className="text-[44px] font-display text-[#E3B778] leading-none">
                            {serverState.trScore ?? 0}
                          </span>
                        </div>
                        <span className="text-[13px] font-sans font-semibold text-[#E3B778] uppercase">
                          Plantadores TR
                        </span>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-[11px] font-sans font-semibold text-amber-400 uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                        <span>
                          Bombsite {serverState.activeBombsite || "A"} Ativo
                        </span>
                      </div>
                    </div>
                  ) : serverState.mode === "DEATHMATCH" ? (
                    /* Deathmatch Mode Preview */
                    <div className="py-5 my-auto flex flex-col items-center justify-center gap-2 border-y border-white/[0.08]">
                      {serverState.killLeader ? (
                        <div className="flex items-center gap-2 text-[12px] font-sans text-amber-300">
                          <PiTrophy className="w-4 h-4 text-amber-400" />
                          <span className="font-semibold">
                            Líder: {serverState.killLeader.username}
                          </span>
                          <span className="text-stone-400">
                            ({serverState.killLeader.kills} Kills)
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-[12px] font-sans text-stone-400">
                          <span>Aguardando primeiros abates</span>
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-[13px] font-sans text-stone-300 mt-1">
                        <span>
                          Tempo:{" "}
                          <strong className="text-white">
                            {serverState.timeRemaining || "--:--"}
                          </strong>
                        </span>
                        <span className="text-stone-600">·</span>
                        <span>
                          Total de Abates:{" "}
                          <strong className="text-white">
                            {serverState.totalKills || 0}
                          </strong>
                        </span>
                      </div>
                    </div>
                  ) : serverState.mode === "PRACTICE" ? (
                    /* Practice Mode Preview */
                    <div className="py-5 my-auto flex flex-col items-center justify-center gap-2 border-y border-white/[0.08]">
                      <div className="flex items-center gap-2 text-[14px] font-sans text-white font-medium">
                        <PiWrench className="w-4 h-4 text-[#a9c8c0]" />
                        <span>Treino de Granadas & Linhas</span>
                      </div>
                      <span className="text-[12px] font-sans text-mute">
                        Trajetórias 3D, .rethrow e câmera de impacto ativa.
                      </span>
                    </div>
                  ) : (
                    /* Default Competitivo Mode (5v5 Scoreboard) */
                    <div className="py-4 my-2 flex flex-col justify-center border-y border-white/[0.08]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TeamLogo
                            teamTag={serverState.ctTeamTag || "CT"}
                            logoUrl={serverState.ctTeamLogoUrl}
                            size={18}
                            isLink={false}
                          />
                          <span className="text-[13px] font-sans font-semibold text-[#92BCE3] uppercase tracking-[0.08em]">
                            {serverState.ctTeamName || "Counter-Terrorists"}
                          </span>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="text-[44px] sm:text-[52px] font-display text-[#92BCE3] leading-none drop-shadow-md">
                            {serverState.ctScore ?? 0}
                          </span>
                          <span className="text-[20px] font-display text-stone-300 leading-none">
                            -
                          </span>
                          <span className="text-[44px] sm:text-[52px] font-display text-[#E3B778] leading-none drop-shadow-md">
                            {serverState.trScore ?? 0}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-sans font-semibold text-[#E3B778] uppercase tracking-[0.08em]">
                            {serverState.trTeamName || "Terrorists"}
                          </span>
                          <TeamLogo
                            teamTag={serverState.trTeamTag || "TR"}
                            logoUrl={serverState.trTeamLogoUrl}
                            size={18}
                            isLink={false}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. Live Snapshot Players (If in competitive and online) */}
                  {serverState.mode === "COMPETITIVO" &&
                    serverState.status === "live" && (
                      <div className="grid grid-cols-2 gap-4 my-2">
                        <div className="flex flex-col gap-1">
                          {serverState.ctPlayers?.slice(0, 2).map((player) => (
                            <div
                              key={player.kurageId}
                              className="flex items-center justify-between text-[12px] font-sans py-0.5"
                            >
                              <span className="text-stone-300 truncate max-w-[90px]">
                                {player.username}
                              </span>
                              <span className="text-white font-medium">
                                {player.kills}k
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-col gap-1 border-l border-white/[0.06] pl-4">
                          {serverState.trPlayers?.slice(0, 2).map((player) => (
                            <div
                              key={player.kurageId}
                              className="flex items-center justify-between text-[12px] font-sans py-0.5"
                            >
                              <span className="text-stone-300 truncate max-w-[90px]">
                                {player.username}
                              </span>
                              <span className="text-white font-medium">
                                {player.kills}k
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* 4. Tactical Footer Info Grid (Only rendered when online) */}
                  {serverState.status !== "offline" && (
                    <div className="grid grid-cols-3 gap-4 border-t border-white/[0.08] pt-4 mt-2">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-mute uppercase font-sans font-semibold tracking-wider mb-0.5">
                          Mapa
                        </span>
                        <span className="text-white font-sans text-[13px] font-medium flex items-center gap-1.5 capitalize">
                          <PiWaves className="h-3.5 w-3.5 text-[#a9c8c0]" />
                          {serverState.map
                            ? serverState.map.replace("de_", "")
                            : "-"}
                        </span>
                      </div>

                      <div className="flex flex-col border-x border-white/[0.08] px-3">
                        <span className="text-[10px] text-mute uppercase font-sans font-semibold tracking-wider mb-0.5">
                          Jogadores
                        </span>
                        <span className="text-white font-sans text-[13px] font-medium">
                          {`${(serverState.ctPlayers?.length || 0) + (serverState.trPlayers?.length || 0)} / ${serverState.maxPlayers || 10}`}
                        </span>
                      </div>

                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-mute uppercase font-sans font-semibold tracking-wider mb-0.5">
                          Modo
                        </span>
                        <span className="text-white font-sans text-[13px] font-medium capitalize">
                          {serverState.mode
                            ? serverState.mode.toLowerCase()
                            : "-"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
