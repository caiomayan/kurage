"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  PiCopy,
  PiCheck,
  PiWarningCircle,
  PiSkull,
  PiBomb,
  PiShieldCheck,
  PiClock,
  PiTrophy,
  PiFlame,
  PiLightning,
  PiWrench,
  PiEye,
  PiArrowLeft,
} from "react-icons/pi";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { KurageLevelIcon } from "@/components/ui/KurageLevelIcon";
import { FaceitLevelIcon } from "@/components/ui/faceit-levels/FaceitLevelIcon";
import { RoleIcon } from "@/components/ui/RoleIcon";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { MergulharButton } from "@/components/ui/MergulharButton";
import { FixedServerDirectory } from "@/components/servers/FixedServerDirectory";
import { api } from "@/lib/api";
import {
  expireStaleServers,
  gameServerToLiveState,
  type GameServerWithPlayers,
} from "@/lib/game-servers";
import type {
  RoundResult,
  RoundWinReason,
  PlayerLiveStats,
  LiveServerState,
  SpectatorInfo,
} from "@/types/server";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function MarAbertoPage() {
  const [activeMode, setActiveMode] = useState<string>("OFFLINE");
  const [serverState, setServerState] = useState<LiveServerState | null>(null);
  const [servers, setServers] = useState<GameServerWithPlayers[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const serversRef = useRef<GameServerWithPlayers[]>([]);

  useEffect(() => {
    const syncSelectionFromUrl = () => {
      setSelectedServerId(new URLSearchParams(window.location.search).get("server"));
    };

    syncSelectionFromUrl();
    window.addEventListener("popstate", syncSelectionFromUrl);
    return () => window.removeEventListener("popstate", syncSelectionFromUrl);
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function fetchServerTelemetry() {
      try {
        const response = await api.get<GameServerWithPlayers[]>("/servers");
        if (isMounted) {
          const nextServers = expireStaleServers(
            Array.isArray(response) ? response : [],
          );
          serversRef.current = nextServers;
          setServers(nextServers);
          setLoadError(false);

          if (selectedServerId) {
            const selected = nextServers.find(
              (server) =>
                server.id === selectedServerId && server.serverKind === "FIXED",
            );
            if (selected) {
              const liveState = gameServerToLiveState(selected);
              setServerState(liveState);
              setActiveMode(liveState.mode);
            } else {
              setServerState(null);
              setActiveMode("OFFLINE");
            }
          } else {
            setServerState(null);
            setActiveMode("OFFLINE");
          }
        }
      } catch {
        if (isMounted) {
          const nextServers = expireStaleServers(serversRef.current);
          serversRef.current = nextServers;
          setServers(nextServers);

          if (selectedServerId) {
            const selected = nextServers.find(
              (server) =>
                server.id === selectedServerId && server.serverKind === "FIXED",
            );
            if (selected) {
              const liveState = gameServerToLiveState(selected);
              setServerState(liveState);
              setActiveMode(liveState.mode);
            }
          }
          setLoadError(true);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchServerTelemetry();
    const interval = setInterval(fetchServerTelemetry, 8000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedServerId]);

  const handleSelectServer = (serverId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("server", serverId);
    window.history.pushState({}, "", url);
    setSelectedServerId(serverId);
  };

  const handleBackToServers = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("server");
    window.history.pushState({}, "", url);
    setSelectedServerId(null);
    setServerState(null);
  };

  const handleCopy = () => {
    if (serverState) {
      navigator.clipboard.writeText(serverState.ip);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  if (!selectedServerId) {
    return (
      <MarServerDirectory
        servers={servers}
        isLoading={isLoading}
        loadError={loadError}
        onSelect={handleSelectServer}
      />
    );
  }

  return (
    <div className="relative w-full flex flex-col font-sans min-h-screen bg-canvas overflow-hidden">
      {/* ── BACKGROUND MAP WITH DEEP-SEA GRADIENT MASKS ── */}
      <div className="fixed inset-0 z-0 pointer-events-none w-full h-full overflow-hidden select-none">
        <AnimatePresence mode="wait">
          {serverState?.map && (
            <motion.div
              key={serverState.map}
              initial={{ opacity: 0, scale: 1.08 }}
              animate={{
                opacity: serverState.status === "live" ? 0.32 : 0.08,
                scale: 1.02,
              }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="absolute inset-0 w-full h-full"
            >
              <Image
                src={`/thumbs/${serverState.map}.png`}
                alt={serverState.map}
                fill
                className="object-cover"
                unoptimized
                priority
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Soft volumetric oceanic depth overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-canvas/40 via-canvas/80 to-canvas" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_var(--canvas)_90%)] opacity-80" />

        {/* Bioluminescent Deep-Sea Aurora current */}
        <motion.div
          animate={{
            x: ["-10%", "10%", "-10%"],
            y: ["0%", "10%", "0%"],
            opacity: [0.35, 0.65, 0.35],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-[-5%] top-[10%] h-[600px] w-[110%] rounded-full mix-blend-screen blur-3xl opacity-50"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(var(--kurage-accent-rgb),0.3) 0%, rgba(146, 188, 227, 0.12) 50%, transparent 75%)",
          }}
        />
      </div>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <main className="relative z-10 mx-auto w-full max-w-7xl px-6 pt-[110px] sm:pt-[130px] pb-24 flex flex-col gap-12">
        {/* ── TOP HEADER: Title, Live Status & Server Actions ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 border-b border-white/[0.08] pb-8">
          {/* Left: Server Identity */}
          <div className="flex flex-col">
            <button
              type="button"
              onClick={handleBackToServers}
              className="mb-5 flex w-fit items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-mute transition hover:text-white"
            >
              <PiArrowLeft size={15} aria-hidden />
              Todos os servidores
            </button>
            <div className="flex items-center gap-3.5">
              <h1 className="font-display text-[48px] sm:text-[60px] leading-none tracking-tight text-white">
                O Mar.
              </h1>
              <div className="flex items-center mt-2">
                {serverState?.status === "live" ? (
                  <div
                    className="w-2.5 h-2.5 rounded-full bg-accent-green shadow-[0_0_14px_rgba(17,255,153,0.8)] animate-pulse"
                    title="Partida ao vivo"
                  />
                ) : serverState?.status === "warmup" ? (
                  <div
                    className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.8)] animate-pulse"
                    title="Em aquecimento"
                  />
                ) : (
                  <div
                    className="w-2.5 h-2.5 rounded-full bg-accent-red"
                    title="Servidor Offline"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Right: Dynamic Mode Badge (Automatic Detection) & Connect Group */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Automatic Mode Indicator */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-[8px] bg-surface-card border border-white/[0.08] text-[12px] font-sans">
              <span
                className={cn(
                  "w-2 h-2 rounded-full",
                  serverState?.status === "live"
                    ? "bg-accent-green animate-pulse shadow-[0_0_10px_rgba(17,255,153,0.8)]"
                    : serverState?.status === "warmup"
                      ? "bg-amber-400 animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.8)]"
                      : "bg-accent-red",
                )}
              />
              <span className="font-semibold text-white uppercase tracking-wider text-[11px]">
                {serverState?.status === "offline" || activeMode === "OFFLINE"
                  ? "Servidor Offline"
                  : activeMode === "COMPETITIVO"
                    ? "Modo 5v5 Competitivo"
                    : activeMode === "WARMUP"
                      ? "Aquecimento"
                      : activeMode === "RETAKE"
                        ? "Modo Retake"
                        : activeMode === "DEATHMATCH"
                          ? "Deathmatch FFA"
                          : activeMode === "PRACTICE"
                            ? "Treino & Utilitários"
                            : activeMode}
              </span>
            </div>

            {/* Bespoke Underwater Mergulhar Button (Only if online) */}
            {serverState &&
              (serverState.status === "live" ||
                serverState.status === "warmup") && (
                <MergulharButton serverIp={serverState.ip} />
              )}

            {/* Copiar IP Button with Feedback */}
            {serverState && (
              <button
                onClick={handleCopy}
                title="Copiar comando de conexão"
                className="group relative flex h-10 w-10 items-center justify-center rounded-[8px] border border-white/[0.08] bg-surface-card text-mute hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                {copied ? (
                  <PiCheck className="h-4 w-4 text-accent-green animate-in zoom-in-50 duration-200" />
                ) : (
                  <PiCopy className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* ── MODE SPECIFIC TELEMETRY RENDERERS ── */}
        {isLoading ? (
          <div className="w-full h-[450px] flex flex-col items-center justify-center text-mute gap-4 animate-pulse">
            <div className="w-7 h-7 rounded-full border-2 border-mute/30 border-t-[var(--kurage-accent)] animate-spin" />
            <span className="text-[11px] uppercase tracking-[0.2em] font-sans text-stone">
              Sincronizando modo {activeMode}...
            </span>
          </div>
        ) : serverState ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeMode}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="flex flex-col gap-10"
            >
              {serverState.status === "offline" || activeMode === "OFFLINE" ? (
                <OfflineView
                  serverState={serverState}
                  onCopyIp={handleCopy}
                  copied={copied}
                />
              ) : (
                <>
                  {(activeMode === "COMPETITIVO" ||
                    activeMode === "WARMUP") && (
                    <CompetitiveView serverState={serverState} />
                  )}
                  {activeMode === "RETAKE" && (
                    <RetakeView serverState={serverState} />
                  )}
                  {activeMode === "DEATHMATCH" && (
                    <DeathmatchView serverState={serverState} />
                  )}
                  {activeMode === "PRACTICE" && (
                    <PracticeView serverState={serverState} />
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="w-full py-28 flex flex-col items-center justify-center text-center">
            <PiWarningCircle className="w-10 h-10 text-mute mb-4" />
            <h3 className="font-display text-[28px] text-ink mb-2">
              O servidor está inativo
            </h3>
            <p className="text-body font-sans text-[15px] max-w-sm">
              Não há dados de telemetria disponíveis no momento. Conecte-se
              novamente em instantes.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function MarServerDirectory({
  servers,
  isLoading,
  loadError,
  onSelect,
}: {
  servers: GameServerWithPlayers[];
  isLoading: boolean;
  loadError: boolean;
  onSelect: (serverId: string) => void;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-canvas font-sans">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_65%_10%,rgba(var(--kurage-accent-rgb),0.12),transparent_48%)]" />
        <div className="absolute inset-x-0 top-0 h-[520px] bg-gradient-to-b from-[#0b1719]/60 to-transparent" />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-28 pt-[120px] sm:pt-[145px]">
        <header className="max-w-3xl border-b border-white/[0.08] pb-9">
          <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-mute">
            Servidores oficiais
          </p>
          <h1 className="mt-3 font-display text-[50px] leading-none tracking-tight text-white sm:text-[66px]">
            O Mar.
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-body">
            Escolha uma corrente. Cada card representa um servidor fixo e mostra somente telemetria recebida pelo Kurage.Core.
          </p>
        </header>

        <div className="mt-12">
          {isLoading ? (
            <div className="grid gap-8 lg:grid-cols-2">
              {[0, 1].map((item) => (
                <div key={item} className="space-y-4 animate-pulse">
                  <div className="h-10 w-40 rounded bg-white/[0.04]" />
                  <div className="h-[188px] rounded-[14px] border border-white/[0.06] bg-white/[0.025]" />
                </div>
              ))}
            </div>
          ) : (
            <FixedServerDirectory servers={servers} onSelect={onSelect} />
          )}
        </div>

        {loadError ? (
          <div className="mt-6 flex items-center gap-2 text-[12px] text-[#d7a57f]">
            <PiWarningCircle size={17} aria-hidden />
            A API de servidores não respondeu. Os dados serão atualizados automaticamente quando a conexão voltar.
          </div>
        ) : null}
      </main>
    </div>
  );
}

{
  /* ══════════════════════════════════════════════════════════════
    1. MODO COMPETITIVO (5v5 MR12)
   ══════════════════════════════════════════════════════════════ */
}
function CompetitiveView({ serverState }: { serverState: LiveServerState }) {
  const isWarmup = serverState.status === "warmup";

  return (
    <div className="flex flex-col gap-10">
      {/* Scoreboard Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* CT Column */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="flex items-center justify-start border-b border-white/[0.08] pb-4 mb-4">
            <div className="flex items-center gap-2.5">
              <TeamLogo
                teamTag={serverState.ctTeamTag || "CT"}
                teamName={serverState.ctTeamName}
                logoUrl={serverState.ctTeamLogoUrl}
                size={20}
                isLink={false}
              />
              <span className="text-[14px] font-sans font-semibold text-[#92BCE3] uppercase tracking-[0.08em]">
                {serverState.ctTeamName || "Counter-Terrorists"}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between px-3 py-1.5 text-[10px] font-sans font-semibold uppercase tracking-wider text-mute border-b border-white/[0.04] mb-1">
            <span>Jogador</span>
            {isWarmup ? (
              <div className="flex items-center gap-4 text-right">
                <span className="w-16 text-center">Status</span>
                <span className="w-7 text-center">Ping</span>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-right">
                <span className="w-5 text-center">K</span>
                <span className="w-5 text-center">A</span>
                <span className="w-5 text-center text-accent-red">D</span>
                <span className="w-7 text-center">Ping</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1">
            {serverState.ctPlayers?.map((player) => (
              <PlayerRow
                key={player.kurageId ?? player.steamId64 ?? player.username}
                player={player}
                isWarmup={isWarmup}
              />
            ))}
          </div>

          {/* Coach CT (exibido apenas se houver coach) */}
          {serverState.ctCoach && (
            <Link
              href={`/player/${serverState.ctCoach.kurageId}`}
              className="group flex items-center justify-between p-2.5 rounded-[8px] transition-all duration-200 hover:bg-white/[0.04] mt-2 pt-2 border-t border-white/[0.05]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar
                  src={serverState.ctCoach.avatarUrl}
                  username={serverState.ctCoach.username}
                  kurageId={serverState.ctCoach.kurageId}
                  size="sm"
                  isVerifiedPro={serverState.ctCoach.isVerifiedPro}
                />
                <span className="text-[13px] font-sans font-medium text-stone-300 group-hover:text-white transition-colors truncate">
                  {serverState.ctCoach.username}
                </span>
                <span className="text-[10px] font-sans uppercase tracking-wider text-[#92BCE3] font-medium">
                  Coach
                </span>
              </div>
              <span className="text-stone-500 text-[11px] tabular-nums">
                {serverState.ctCoach.ping}ms
              </span>
            </Link>
          )}
        </div>

        {/* Center Display: Live Score OR Warmup Ready Hub */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center py-6 px-4">
          {isWarmup ? (
            <div className="flex flex-col items-center text-center">
              <span className="text-[11px] font-sans font-semibold uppercase tracking-widest text-amber-400 mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Aquecimento Pré-Partida
              </span>

              <div className="flex flex-col items-center my-3">
                <span className="text-[64px] sm:text-[80px] font-display text-white leading-none tracking-tight">
                  {serverState.warmupInfo?.timeRemaining || "01:30"}
                </span>
                <span className="text-[12px] font-sans text-stone-400 mt-2">
                  {serverState.warmupInfo?.readyCount || 0} /{" "}
                  {serverState.warmupInfo?.totalRequired || 10} Jogadores
                  Prontos (!ready)
                </span>
              </div>

              {/* Ready progress bar */}
              <div className="w-48 h-1 rounded-full bg-white/10 overflow-hidden mt-2">
                <div
                  className="h-full bg-amber-400 transition-all duration-500 rounded-full"
                  style={{
                    width: `${((serverState.warmupInfo?.readyCount || 0) / (serverState.warmupInfo?.totalRequired || 10)) * 100}%`,
                  }}
                />
              </div>

              <div className="mt-8 flex items-center gap-3 text-[13px] font-sans text-body">
                <span className="font-medium text-white capitalize">
                  {serverState.map.replace("de_", "")}
                </span>
                <span className="text-stone-600">·</span>
                <span>Warmup 128-Tick</span>
              </div>
            </div>
          ) : (
            <>
              <span className="text-[12px] font-sans font-semibold uppercase tracking-widest text-mute mb-4">
                Partida em Andamento
              </span>

              <div className="flex items-center gap-5 sm:gap-6">
                <span className="text-[72px] sm:text-[92px] font-display text-[#92BCE3] leading-none drop-shadow-[0_0_25px_rgba(146,188,227,0.3)]">
                  {serverState.ctScore}
                </span>
                <span className="text-[32px] sm:text-[44px] font-display text-stone-400 leading-none">
                  -
                </span>
                <span className="text-[72px] sm:text-[92px] font-display text-[#E3B778] leading-none drop-shadow-[0_0_25px_rgba(227,183,120,0.3)]">
                  {serverState.trScore}
                </span>
              </div>

              {/* 1º Half & 2º Half Score Comparison */}
              {serverState.isSecondHalf && (
                <div className="flex items-center gap-6 mt-4 pt-3 border-t border-white/[0.06]">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-sans text-mute tracking-widest uppercase mb-1">
                      1º Half
                    </span>
                    <div className="flex items-center gap-2 text-[13px] font-sans font-medium">
                      <span className="text-[#92BCE3]">
                        {serverState.halfScoreCt}
                      </span>
                      <span className="text-stone-600">·</span>
                      <span className="text-[#E3B778]">
                        {serverState.halfScoreTr}
                      </span>
                    </div>
                  </div>

                  <div className="h-6 w-px bg-white/[0.08]" />

                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-sans text-mute tracking-widest uppercase mb-1">
                      2º Half
                    </span>
                    <div className="flex items-center gap-2 text-[13px] font-sans font-medium">
                      <span className="text-[#92BCE3]">
                        {serverState.secondHalfScoreCt}
                      </span>
                      <span className="text-stone-600">·</span>
                      <span className="text-[#E3B778]">
                        {serverState.secondHalfScoreTr}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-8 flex items-center gap-3 text-[13px] font-sans text-body">
                <span className="font-medium text-white capitalize">
                  {serverState.map.replace("de_", "")}
                </span>
                <span className="text-stone-600">·</span>
                <span>Competitivo</span>
              </div>
            </>
          )}
        </div>

        {/* TR Column */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="flex items-center justify-end border-b border-white/[0.08] pb-4 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="text-[14px] font-sans font-semibold text-[#E3B778] uppercase tracking-[0.08em]">
                {serverState.trTeamName || "Terrorists"}
              </span>
              <TeamLogo
                teamTag={serverState.trTeamTag || "TR"}
                teamName={serverState.trTeamName}
                logoUrl={serverState.trTeamLogoUrl}
                size={20}
                isLink={false}
              />
            </div>
          </div>

          <div className="flex items-center justify-between px-3 py-1.5 text-[10px] font-sans font-semibold uppercase tracking-wider text-mute border-b border-white/[0.04] mb-1">
            <span>Jogador</span>
            {isWarmup ? (
              <div className="flex items-center gap-4 text-right">
                <span className="w-16 text-center">Status</span>
                <span className="w-7 text-center">Ping</span>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-right">
                <span className="w-5 text-center">K</span>
                <span className="w-5 text-center">A</span>
                <span className="w-5 text-center text-accent-red">D</span>
                <span className="w-7 text-center">Ping</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1">
            {serverState.trPlayers?.map((player) => (
              <PlayerRow
                key={player.kurageId ?? player.steamId64 ?? player.username}
                player={player}
                isWarmup={isWarmup}
              />
            ))}
          </div>

          {/* Coach TR (exibido apenas se houver coach) */}
          {serverState.trCoach && (
            <Link
              href={`/player/${serverState.trCoach.kurageId}`}
              className="group flex items-center justify-between p-2.5 rounded-[8px] transition-all duration-200 hover:bg-white/[0.04] mt-2 pt-2 border-t border-white/[0.05]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar
                  src={serverState.trCoach.avatarUrl}
                  username={serverState.trCoach.username}
                  kurageId={serverState.trCoach.kurageId}
                  size="sm"
                  isVerifiedPro={serverState.trCoach.isVerifiedPro}
                />
                <span className="text-[13px] font-sans font-medium text-stone-300 group-hover:text-white transition-colors truncate">
                  {serverState.trCoach.username}
                </span>
                <span className="text-[10px] font-sans uppercase tracking-wider text-[#E3B778] font-medium">
                  Coach
                </span>
              </div>
              <span className="text-stone-500 text-[11px] tabular-nums">
                {serverState.trCoach.ping}ms
              </span>
            </Link>
          )}
        </div>
      </div>

      {/* Round Timeline OR Warmup Instruction */}
      {isWarmup ? (
        <div className="w-full mt-4 pt-6 border-t border-white/[0.08] text-center text-[13px] text-mute font-sans">
          Digite{" "}
          <span className="font-mono text-white bg-white/[0.06] px-1.5 py-0.5 rounded">
            !ready
          </span>{" "}
          no chat do servidor para confirmar prontidão e iniciar o round de
          faca.
        </div>
      ) : (
        serverState.roundHistory && (
          <RoundTimeline rounds={serverState.roundHistory} />
        )
      )}

      {/* Spectators & Coaches Stream */}
      {serverState.spectators && serverState.spectators.length > 0 && (
        <SpectatorsSection spectators={serverState.spectators} />
      )}
    </div>
  );
}

{
  /* ══════════════════════════════════════════════════════════════
    2. MODO RETAKE (Rounds Rápidos com Bombsite Ativo)
   ══════════════════════════════════════════════════════════════ */
}
function RetakeView({ serverState }: { serverState: LiveServerState }) {
  return (
    <div className="flex flex-col gap-10">
      {/* Scoreboard Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* CT Defensores Column */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-4">
            <span className="text-[14px] font-sans font-semibold text-[#92BCE3] uppercase tracking-[0.08em]">
              Invasores (CT)
            </span>
            <span className="text-[11px] font-sans text-mute uppercase">
              {serverState.ctPlayers?.length} Vivos
            </span>
          </div>

          <div className="flex items-center justify-between px-3 py-1.5 text-[10px] font-sans font-semibold uppercase tracking-wider text-mute border-b border-white/[0.04] mb-1">
            <span>Jogador</span>
            <div className="flex items-center gap-3 text-right">
              <span className="w-5 text-center">K</span>
              <span className="w-5 text-center">A</span>
              <span className="w-5 text-center text-accent-red">D</span>
              <span className="w-7 text-center">Ping</span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            {serverState.ctPlayers?.map((player) => (
              <PlayerRow
                key={player.kurageId ?? player.steamId64 ?? player.username}
                player={player}
              />
            ))}
          </div>
        </div>

        {/* Center Display: Active Bombsite & Round Score */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center py-6 px-4">
          {/* Active Bombsite Beacon */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent-red/10 border border-accent-red/30 mb-4 animate-pulse">
            <PiBomb className="w-3.5 h-3.5 text-accent-red" />
            <span className="text-[11px] font-sans font-bold uppercase tracking-widest text-accent-red">
              {serverState.activeBombsite
                ? `Bombsite ${serverState.activeBombsite} plantada`
                : "Retake em andamento"}
            </span>
          </div>

          <div className="flex items-center gap-5 sm:gap-6">
            <span className="text-[72px] sm:text-[92px] font-display text-[#92BCE3] leading-none drop-shadow-[0_0_25px_rgba(146,188,227,0.3)]">
              {serverState.ctScore}
            </span>
            <span className="text-[32px] sm:text-[44px] font-display text-stone-400 leading-none">
              -
            </span>
            <span className="text-[72px] sm:text-[92px] font-display text-[#E3B778] leading-none drop-shadow-[0_0_25px_rgba(227,183,120,0.3)]">
              {serverState.trScore}
            </span>
          </div>

          <div className="mt-6 flex items-center gap-3 text-[13px] font-sans text-body">
            <span className="font-medium text-white capitalize">
              {serverState.map.replace("de_", "")}
            </span>
            <span className="text-stone-600">·</span>
            <span>Retake Rápido</span>
          </div>
        </div>

        {/* TR Plantadores Column */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-4">
            <span className="text-[11px] font-sans text-mute uppercase">
              {serverState.trPlayers?.length} Vivos
            </span>
            <span className="text-[14px] font-sans font-semibold text-[#E3B778] uppercase tracking-[0.08em]">
              Plantadores (TR)
            </span>
          </div>

          <div className="flex items-center justify-between px-3 py-1.5 text-[10px] font-sans font-semibold uppercase tracking-wider text-mute border-b border-white/[0.04] mb-1">
            <span>Jogador</span>
            <div className="flex items-center gap-3 text-right">
              <span className="w-5 text-center">K</span>
              <span className="w-5 text-center">A</span>
              <span className="w-5 text-center text-accent-red">D</span>
              <span className="w-7 text-center">Ping</span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            {serverState.trPlayers?.map((player) => (
              <PlayerRow
                key={player.kurageId ?? player.steamId64 ?? player.username}
                player={player}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Retake Round Timeline (12-15 rounds) */}
      {serverState.roundHistory && (
        <RoundTimeline
          rounds={serverState.roundHistory}
          maxSlots={15}
          targetWins={8}
        />
      )}

      {/* Spectators & Coaches Stream */}
      {serverState.spectators && serverState.spectators.length > 0 && (
        <SpectatorsSection spectators={serverState.spectators} />
      )}
    </div>
  );
}

{
  /* ══════════════════════════════════════════════════════════════
    3. MODO DEATHMATCH (Mata-Mata FFA Leaderboard)
   ══════════════════════════════════════════════════════════════ */
}
function DeathmatchView({ serverState }: { serverState: LiveServerState }) {
  return (
    <div className="flex flex-col gap-8">
      {/* Deathmatch Server Meta Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 border-b border-white/[0.08] pb-6">
        {/* Map */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-sans uppercase tracking-widest text-mute">
            Mapa Atual
          </span>
          <div className="flex items-center gap-2 text-[22px] font-display text-white">
            <span className="capitalize">
              {serverState.map.replace("de_", "")}
            </span>
            <span className="text-[12px] font-sans text-stone-400">· FFA</span>
          </div>
        </div>

        {/* Time Remaining */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-sans uppercase tracking-widest text-mute">
            Tempo Restante
          </span>
          <div className="flex items-center gap-2 text-[22px] font-display text-white">
            <PiClock className="w-4 h-4 text-[var(--kurage-accent)]" />
            <span>{serverState.timeRemaining || "--:--"}</span>
          </div>
        </div>

        {/* Kill Leader */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-sans uppercase tracking-widest text-mute">
            Líder Atual
          </span>
          <div className="flex items-center gap-2 text-[20px] font-display text-amber-300">
            <PiTrophy className="w-4 h-4 text-amber-400" />
            <span className="truncate">
              {serverState.killLeader?.username} (
              {serverState.killLeader?.kills} Kills)
            </span>
          </div>
        </div>

        {/* Total Server Kills */}
        <div className="flex flex-col gap-1 text-left sm:text-right">
          <span className="text-[11px] font-sans uppercase tracking-widest text-mute">
            Abates Totais
          </span>
          <div className="flex items-center gap-2 sm:justify-end text-[22px] font-display text-[#92BCE3]">
            <PiFlame className="w-4 h-4 text-[#92BCE3]" />
            <span>{serverState.totalKills} Kills</span>
          </div>
        </div>
      </div>

      {/* FFA Unified Leaderboard Table */}
      <div className="flex flex-col w-full">
        {/* Table Header */}
        <div className="flex items-center justify-between px-4 py-2 text-[11px] font-sans font-semibold uppercase tracking-wider text-mute border-b border-white/[0.06]">
          <div className="flex items-center gap-6">
            <span className="w-6 text-center">#</span>
            <span>Jogador</span>
          </div>
          <div className="flex items-center gap-5 sm:gap-8 text-right tabular-nums">
            <span className="w-10 text-center font-bold text-white">Kills</span>
            <span className="w-10 text-center text-accent-red">Deaths</span>
            <span className="w-10 text-center text-stone-300">HS%</span>
            <span className="w-10 text-center text-[#92BCE3]">K/D</span>
            <span className="w-10 text-center text-amber-400">Streak</span>
            <span className="w-10 text-center text-stone-500">Ping</span>
          </div>
        </div>

        {/* Players List */}
        <div className="flex flex-col divide-y divide-white/[0.03]">
          {serverState.ffaPlayers?.map((player, idx) => (
            <PlayerProfileLink
              key={player.kurageId ?? player.steamId64 ?? player.username}
              player={player}
              className={cn(
                "group flex items-center justify-between px-4 py-3 transition-colors hover:bg-white/[0.04] rounded-[6px]",
                idx === 0 && "bg-white/[0.02]",
              )}
            >
              {/* Left: Position & Avatar & Identity */}
              <div className="flex items-center gap-6">
                <span
                  className={cn(
                    "w-6 text-center font-display text-[16px]",
                    idx === 0
                      ? "text-amber-400 font-bold"
                      : idx === 1
                        ? "text-slate-300 font-bold"
                        : idx === 2
                          ? "text-amber-600 font-bold"
                          : "text-stone-500",
                  )}
                >
                  {idx + 1}
                </span>

                <div className="flex items-center gap-3">
                  <Avatar
                    src={player.avatarUrl}
                    username={player.username}
                    kurageId={player.kurageId}
                    size="sm"
                    isVerifiedPro={player.isVerifiedPro}
                    enableHovercard={Boolean(
                      player.isKurageMember && player.kurageId,
                    )}
                  />
                  <span className="text-[14px] font-sans font-medium text-ink group-hover:text-white transition-colors">
                    {player.username}
                  </span>
                  {player.kurageLevel && player.kurageLevel > 0 ? (
                    <KurageLevelIcon
                      level={player.kurageLevel}
                      className="w-4 h-4 text-[9px]"
                    />
                  ) : player.faceitLevel ? (
                    <FaceitLevelIcon
                      level={player.faceitLevel}
                      expandOnHover={true}
                    />
                  ) : null}
                </div>
              </div>

              {/* Right: Detailed Deathmatch Metrics */}
              <div className="flex items-center gap-5 sm:gap-8 text-[13px] font-sans tabular-nums text-right">
                <span className="w-10 text-center font-bold text-white">
                  {player.kills}
                </span>
                <span className="w-10 text-center text-accent-red">
                  {player.deaths}
                </span>
                <span className="w-10 text-center text-stone-300">
                  {player.hsPercentage}%
                </span>
                <span className="w-10 text-center font-semibold text-[#92BCE3]">
                  {player.kdRatio?.toFixed(2)}
                </span>
                <span className="w-10 text-center font-bold text-amber-400">
                  {player.killStreak || 0}
                </span>
                <span className="w-10 text-center text-stone-500 text-[11px]">
                  {player.ping}ms
                </span>
              </div>
            </PlayerProfileLink>
          ))}
        </div>
      </div>

      {/* Spectators & Coaches Stream */}
      {serverState.spectators && serverState.spectators.length > 0 && (
        <SpectatorsSection spectators={serverState.spectators} />
      )}
    </div>
  );
}

{
  /* ══════════════════════════════════════════════════════════════
    4. MODO PRACTICE (Treino de Granadas, Utilitários & Linhas)
   ══════════════════════════════════════════════════════════════ */
}
function PracticeView({ serverState }: { serverState: LiveServerState }) {
  return (
    <div className="flex flex-col gap-10">
      {/* Practice Header & Active Modifiers */}
      <div className="flex flex-col gap-6 border-b border-white/[0.08] pb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-lg bg-[var(--kurage-accent)]/10 border border-[var(--kurage-accent)]/20 text-[var(--kurage-accent)]">
              <PiWrench className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-3">
                <span className="text-[18px] font-display font-semibold text-white">
                  Treino de Granadas & Utilitários
                </span>
                <span className="text-stone-500">·</span>
                <span className="text-[14px] font-sans font-medium text-[var(--kurage-accent)] capitalize">
                  {serverState.map.replace("de_", "")}
                </span>
              </div>
              <span className="text-[12px] font-sans text-mute">
                Física de granadas sincronizada para alinhamento de smokes,
                molotovs e flashbangs.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[12px] font-sans text-stone-300 bg-white/[0.04] border border-white/[0.06] px-3 py-1.5 rounded-[6px]">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
            <span>
              {serverState.practicePlayers?.length || 0} /{" "}
              {serverState.maxPlayers} Jogadores em Treino
            </span>
          </div>
        </div>

        {/* Feature Commands List */}
        <div className="flex flex-wrap items-center gap-2">
          {serverState.practiceFeatures?.map((feat, idx) => (
            <span
              key={idx}
              className="px-2.5 py-1 rounded-[6px] bg-surface-card border border-white/[0.06] text-[11px] font-mono text-stone-300 flex items-center gap-1.5"
            >
              <PiLightning className="w-3 h-3 text-[var(--kurage-accent)]" />
              {feat}
            </span>
          ))}
        </div>
      </div>

      {/* Practice Active Players Table */}
      <div className="flex flex-col w-full">
        <div className="flex items-center justify-between px-4 py-2 text-[11px] font-sans font-semibold uppercase tracking-wider text-mute border-b border-white/[0.06]">
          <span>Jogador em Treino</span>
          <div className="flex items-center gap-8 text-right">
            <span className="w-28 text-center text-white">
              Granadas Lançadas
            </span>
            <span className="w-24 text-center text-stone-300">
              Tempo de Sessão
            </span>
            <span className="w-12 text-center text-stone-500">Ping</span>
          </div>
        </div>

        <div className="flex flex-col divide-y divide-white/[0.03]">
          {serverState.practicePlayers?.map((player) => (
            <PlayerProfileLink
              key={player.kurageId ?? player.steamId64 ?? player.username}
              player={player}
              className="group flex items-center justify-between px-4 py-3 transition-colors hover:bg-white/[0.04] rounded-[6px]"
            >
              <div className="flex items-center gap-3">
                <Avatar
                  src={player.avatarUrl}
                  username={player.username}
                  kurageId={player.kurageId}
                  size="sm"
                  isVerifiedPro={player.isVerifiedPro}
                  enableHovercard={Boolean(
                    player.isKurageMember && player.kurageId,
                  )}
                />
                <span className="text-[14px] font-sans font-medium text-ink group-hover:text-white transition-colors">
                  {player.username}
                </span>
                {player.kurageLevel && player.kurageLevel > 0 ? (
                  <KurageLevelIcon
                    level={player.kurageLevel}
                    className="w-4 h-4 text-[9px]"
                  />
                ) : player.faceitLevel ? (
                  <FaceitLevelIcon
                    level={player.faceitLevel}
                    expandOnHover={true}
                  />
                ) : null}
              </div>

              <div className="flex items-center gap-8 text-[13px] font-sans tabular-nums text-right">
                <span className="w-28 text-center font-bold text-[var(--kurage-accent)]">
                  {player.utilityCount} utilitários
                </span>
                <span className="w-24 text-center text-stone-300">
                  {player.sessionDurationMinutes} min
                </span>
                <span className="w-12 text-center text-stone-500 text-[11px]">
                  {player.ping}ms
                </span>
              </div>
            </PlayerProfileLink>
          ))}
        </div>
      </div>

      {/* Spectators & Coaches Stream */}
      {serverState.spectators && serverState.spectators.length > 0 && (
        <SpectatorsSection spectators={serverState.spectators} />
      )}
    </div>
  );
}

{
  /* ══════════════════════════════════════════════════════════════
    SHARED SUB-COMPONENTS
   ══════════════════════════════════════════════════════════════ */
}

function RoundTimeline({
  rounds,
  maxSlots = 24,
  targetWins = 13,
}: {
  rounds: RoundResult[];
  maxSlots?: number;
  targetWins?: number;
}) {
  return (
    <div className="w-full mt-4 pt-8 border-t border-white/[0.08] flex flex-col items-center">
      <div className="w-full max-w-4xl flex flex-col gap-3">
        {/* Timeline Header & Subtitle */}
        <div className="flex items-center justify-between text-[11px] font-sans text-mute uppercase tracking-wider">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-white">
              Histórico de Rounds
            </span>
            <span className="text-stone-600">·</span>
            <span>
              {maxSlots === 24
                ? "MR12 (24 Rounds)"
                : `Melhor de ${maxSlots} Rounds`}
            </span>
          </div>

          {/* Legend */}
          <div className="hidden sm:flex items-center gap-4 text-[10px] text-stone-400">
            <span className="flex items-center gap-1.5">
              <PiSkull className="w-3.5 h-3.5 text-stone-300" /> Eliminação
            </span>
            <span className="flex items-center gap-1.5">
              <PiBomb className="w-3.5 h-3.5 text-[#E3B778]" /> Explosão C4
            </span>
            <span className="flex items-center gap-1.5">
              <PiShieldCheck className="w-3.5 h-3.5 text-[#92BCE3]" /> Defuse C4
            </span>
            <span className="flex items-center gap-1.5">
              <PiClock className="w-3.5 h-3.5 text-stone-300" /> Tempo
            </span>
          </div>
        </div>

        {/* CS2 Interactive Timeline Track (100% Fluid Floating on Canvas) */}
        <div className="relative w-full overflow-visible py-4">
          <div className="w-full flex items-center justify-between relative">
            <div
              className="w-full gap-1 sm:gap-1.5 relative items-center"
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${maxSlots}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: maxSlots }).map((_, index) => {
                const roundNum = index + 1;
                const roundData = rounds.find(
                  (r) => r.roundNumber === roundNum,
                );
                const isHalfDivider = maxSlots === 24 && roundNum === 12;
                const isPlayed = !!roundData;
                const isTargetWinRound = roundNum === targetWins;

                return (
                  <div
                    key={roundNum}
                    className={cn(
                      "relative flex flex-col items-center justify-center group/round",
                      isHalfDivider &&
                        "pr-2.5 sm:pr-3 border-r border-white/20 mr-0.5 sm:mr-1",
                    )}
                  >
                    {/* CT Win Slot (Top) */}
                    <div className="h-6 sm:h-7 w-full flex items-center justify-center mb-1">
                      {roundData && roundData.winnerSide === "CT" && (
                        <div
                          className="flex items-center justify-center text-[#92BCE3] drop-shadow-[0_0_8px_rgba(146,188,227,0.4)] transition-transform duration-200 group-hover/round:scale-125 cursor-default"
                          title={`Round ${roundNum} · Vitória CT por ${getWinReasonLabel(roundData.winReason)}`}
                        >
                          {getWinReasonIcon(roundData.winReason)}
                        </div>
                      )}
                    </div>

                    {/* Center Tick Mark & Numbers */}
                    <div className="relative flex flex-col items-center justify-center w-full my-0.5">
                      <div
                        className={cn(
                          "h-[2px] w-full rounded-full transition-colors",
                          isPlayed
                            ? roundData?.winnerSide === "CT"
                              ? "bg-[#92BCE3]"
                              : "bg-[#E3B778]"
                            : "bg-white/10",
                        )}
                      />

                      <div className="absolute -top-3.5 flex flex-col items-center pointer-events-none">
                        {isTargetWinRound && !isPlayed && (
                          <PiTrophy
                            className="w-3.5 h-3.5 text-amber-400 mb-0.5"
                            title={`Alvo de Vitória (${targetWins})`}
                          />
                        )}
                      </div>

                      {(roundNum === 5 ||
                        roundNum === 10 ||
                        roundNum === 15 ||
                        roundNum === 20) && (
                        <span className="absolute top-2 text-[9px] font-mono text-stone-400 font-semibold">
                          {roundNum}
                        </span>
                      )}
                    </div>

                    {/* TR Win Slot (Bottom) */}
                    <div className="h-6 sm:h-7 w-full flex items-center justify-center mt-3">
                      {roundData && roundData.winnerSide === "TR" && (
                        <div
                          className="flex items-center justify-center text-[#E3B778] drop-shadow-[0_0_8px_rgba(227,183,120,0.4)] transition-transform duration-200 group-hover/round:scale-125 cursor-default"
                          title={`Round ${roundNum} · Vitória TR por ${getWinReasonLabel(roundData.winReason)}`}
                        >
                          {getWinReasonIcon(roundData.winReason)}
                        </div>
                      )}
                    </div>

                    {/* Tooltip on Hover */}
                    {roundData && (
                      <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 bg-surface-elevated border border-white/15 rounded text-[10px] text-white opacity-0 pointer-events-none transition-opacity duration-200 group-hover/round:opacity-100 z-30 shadow-xl font-sans">
                        R{roundNum}: {roundData.winnerSide} (
                        {getWinReasonLabel(roundData.winReason)})
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getWinReasonIcon(reason: RoundWinReason) {
  switch (reason) {
    case "elimination":
      return <PiSkull className="w-3.5 h-3.5" />;
    case "bomb_exploded":
      return <PiBomb className="w-3.5 h-3.5" />;
    case "bomb_defused":
      return <PiShieldCheck className="w-3.5 h-3.5" />;
    case "time_out":
      return <PiClock className="w-3.5 h-3.5" />;
    default:
      return <PiSkull className="w-3.5 h-3.5" />;
  }
}

function getWinReasonLabel(reason: RoundWinReason) {
  switch (reason) {
    case "elimination":
      return "Eliminação Total";
    case "bomb_exploded":
      return "Explosão da C4";
    case "bomb_defused":
      return "Desarme da C4";
    case "time_out":
      return "Tempo Esgotado";
    default:
      return "Eliminação";
  }
}

function PlayerRow({
  player,
  isWarmup = false,
}: {
  player: PlayerLiveStats;
  isWarmup?: boolean;
}) {
  return (
    <PlayerProfileLink
      player={player}
      className={cn(
        "group flex items-center justify-between p-2.5 rounded-[8px] transition-all duration-200 hover:bg-white/[0.04] border border-transparent hover:border-white/[0.05]",
        player.isAlive === false && !isWarmup && "opacity-45 hover:opacity-75",
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <Avatar
          src={player.avatarUrl}
          username={player.username}
          kurageId={player.kurageId}
          size="sm"
          isVerifiedPro={player.isVerifiedPro}
          enableHovercard={Boolean(player.isKurageMember && player.kurageId)}
        />

        <span
          className={cn(
            "text-[14px] font-sans font-medium transition-colors truncate max-w-[100px] sm:max-w-[130px]",
            player.isAlive !== false || isWarmup
              ? "text-ink group-hover:text-white"
              : "text-mute",
          )}
        >
          {player.username}
        </span>

        {player.kurageLevel && player.kurageLevel > 0 ? (
          <KurageLevelIcon
            level={player.kurageLevel}
            className="w-4 h-4 text-[9px] shrink-0"
          />
        ) : player.faceitLevel ? (
          <FaceitLevelIcon level={player.faceitLevel} expandOnHover={true} />
        ) : null}

        {player.role && (
          <div className="group/role inline-flex items-center gap-0 overflow-hidden rounded-full transition-all duration-300 cursor-default p-0.5 hover:bg-white/10 shrink-0">
            <RoleIcon
              role={player.role}
              size={15}
              className="text-mute group-hover/role:text-ink shrink-0 transition-transform duration-300 group-hover/role:scale-110"
            />
            <span className="max-w-0 overflow-hidden whitespace-nowrap text-[8px] font-medium tracking-widest uppercase text-mute group-hover/role:text-ink opacity-0 transition-all duration-300 group-hover/role:max-w-[85px] group-hover/role:opacity-100 group-hover/role:pl-1.5 group-hover/role:pr-1">
              {player.role}
            </span>
          </div>
        )}
      </div>

      {isWarmup ? (
        <div className="flex items-center gap-2 text-[12px] font-sans tabular-nums shrink-0">
          {player.isReady ? (
            <span className="text-accent-green font-medium flex items-center gap-1">
              <PiCheck className="w-3.5 h-3.5" /> Pronto
            </span>
          ) : (
            <span className="text-stone-400 font-medium">Aguardando</span>
          )}
          <span className="text-stone-500 text-[11px] w-7 text-center ml-2">
            {player.ping}ms
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-[13px] font-sans tabular-nums shrink-0">
          <span className="text-white font-semibold w-5 text-center">
            {player.kills}
          </span>
          <span className="text-mute w-5 text-center">
            {player.assists ?? 0}
          </span>
          <span className="text-accent-red font-medium w-5 text-center">
            {player.deaths}
          </span>
          <span className="text-stone-500 text-[11px] w-7 text-center">
            {player.ping}ms
          </span>
        </div>
      )}
    </PlayerProfileLink>
  );
}

function PlayerProfileLink({
  player,
  className,
  children,
}: {
  player: Pick<PlayerLiveStats, "kurageId" | "isKurageMember">;
  className: string;
  children: React.ReactNode;
}) {
  if (!player.isKurageMember || !player.kurageId) {
    return <div className={cn(className, "cursor-default")}>{children}</div>;
  }

  return (
    <Link href={`/player/${player.kurageId}`} className={className}>
      {children}
    </Link>
  );
}

{
  /* ══════════════════════════════════════════════════════════════
    5. MODO OFFLINE (Servidor em Repouso / Manutenção)
   ══════════════════════════════════════════════════════════════ */
}
function OfflineView({
  onCopyIp,
  copied,
}: {
  serverState?: LiveServerState;
  onCopyIp: () => void;
  copied: boolean;
}) {
  return (
    <div className="w-full flex flex-col items-center justify-center py-20 sm:py-28 text-center">
      {/* Pure Typography Headline */}
      <h2 className="font-display text-[38px] sm:text-[50px] text-white leading-tight tracking-tight">
        O servidor está em repouso.
      </h2>

      {/* Editorial Subtitle */}
      <p className="mt-3 max-w-md text-[15px] leading-relaxed text-body font-sans">
        Manutenção ou calibração de rotas em andamento. O sinal e a telemetria
        ao vivo serão restabelecidos em breve.
      </p>

      {/* Minimal Action: Direct Connect Command Copy */}
      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={onCopyIp}
          className="inline-flex h-9 items-center gap-2 rounded-[6px] border border-white/[0.1] bg-white/[0.03] px-4 text-[12px] font-sans text-stone-300 transition-colors hover:border-white/20 hover:bg-white/[0.08] hover:text-white cursor-pointer"
        >
          {copied ? (
            <>
              <PiCheck className="w-3.5 h-3.5 text-accent-green" />
              <span>Comando copiado</span>
            </>
          ) : (
            <>
              <PiCopy className="w-3.5 h-3.5 text-mute" />
              <span>Copiar comando de conexão</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

{
  /* ══════════════════════════════════════════════════════════════
    6. BARRA DE ESPECTADORES / OBSERVADORES
   ══════════════════════════════════════════════════════════════ */
}
function SpectatorsSection({ spectators }: { spectators?: SpectatorInfo[] }) {
  if (!spectators || spectators.length === 0) return null;

  return (
    <div className="w-full pt-6 border-t border-white/[0.08] flex items-center justify-between flex-wrap gap-4 text-mute">
      <div className="flex items-center gap-2 text-[12px] font-sans text-stone-400">
        <PiEye className="w-4 h-4 text-[var(--kurage-accent)]" />
        <span className="font-semibold text-white">{spectators.length}</span>
        <span>
          {spectators.length === 1 ? "Espectador" : "Espectadores"} no Servidor
        </span>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        {spectators.map((spec) => (
          <Link
            key={spec.kurageId}
            href={`/player/${spec.kurageId}`}
            className="group flex items-center gap-2 text-[12px] text-stone-300 font-sans hover:text-white transition-colors"
          >
            <Avatar
              src={spec.avatarUrl}
              username={spec.username}
              kurageId={spec.kurageId}
              size="sm"
              isVerifiedPro={spec.isVerifiedPro}
            />
            <span className="font-medium text-stone-200 group-hover:text-white transition-colors">
              {spec.username}
            </span>
            <span className="text-stone-500 text-[11px] tabular-nums">
              ({spec.ping}ms)
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
