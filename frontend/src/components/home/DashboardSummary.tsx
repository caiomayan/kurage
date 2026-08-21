"use client";

import React from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/components/ui/Avatar";
import { KurageLevelIcon } from "@/components/ui/KurageLevelIcon";
import { FaceitLevelIcon } from "@/components/ui/faceit-levels/FaceitLevelIcon";
import { RoleIcon } from "@/components/ui/RoleIcon";
import { 
  PiCrosshair, 
  PiTrophy, 
  PiClockCounterClockwise, 
  PiWarningCircle,
  PiArrowUpRight,
  PiArrowDownRight,
  PiTarget,
  PiChartLineUp,
  PiCalendarBlank
} from "react-icons/pi";
import { SiFaceit } from "react-icons/si";
import { Logo } from "@/components/ui/Logo";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { FaceitProfile } from "@/types/profile";
import type { PlayerRankingContext, LeaderboardPlayer } from "@/types/ranking";
import { PerformanceLineChart } from "@/components/charts/PerformanceLineChart";
import { WinRateDonutChart } from "@/components/charts/WinRateDonutChart";
import { MapPerformanceChart } from "@/components/charts/MapPerformanceChart";

const EASE = [0.16, 1, 0.3, 1] as const;

export function DashboardSummary() {
  const { user } = useAuth();

  const { data: faceitData, isLoading: isLoadingFaceit } = useQuery({
    queryKey: ["faceit", user?.steamId64],
    queryFn: () => api.get<FaceitProfile>(`/users/${user?.steamId64}/faceit`),
    enabled: !!user?.steamId64,
  });

  const { data: rankingData, isLoading: isLoadingRanking } = useQuery({
    queryKey: ["rankingContext", user?.kurageId],
    queryFn: () => api.get<PlayerRankingContext>(`/leaderboard/players/${user?.kurageId}/context`),
    enabled: !!user?.kurageId,
  });

  if (!user) return null;

  const playerStats = rankingData?.player;
  const history = rankingData?.history || [];
  const currentPosition = rankingData?.currentPosition;
  const deltaYesterday = rankingData?.deltaYesterday || 0;
  
  // Condicional de dados do Kurage
  const hasKurageData = (playerStats?.matches || 0) > 0;

  // Helpers para o bloco dinâmico do top left
  const displayElo = hasKurageData ? playerStats?.kurageElo : faceitData?.elo;
  const displayWinRate = hasKurageData ? playerStats?.winRate : faceitData?.winRate;
  const displayKd = hasKurageData ? playerStats?.kdRatio?.toFixed(2) : faceitData?.kdRatio?.toFixed(2);
  const displayLevel = hasKurageData ? (
    <KurageLevelIcon level={playerStats?.kurageLevel || 1} className="w-5 h-5" />
  ) : (
    <FaceitLevelIcon level={faceitData?.level || 1} className="w-5 h-5" />
  );
  const displayMatches = hasKurageData ? playerStats?.matches : 0;
  const displayWins = hasKurageData ? playerStats?.wins : 0;
  const displayWinRateDonutSource = hasKurageData 
    ? { wins: playerStats?.wins || 0, matches: playerStats?.matches || 0 } 
    : { wins: faceitData?.winRate ? Math.round((faceitData.winRate / 100) * 100) : 0, matches: faceitData?.winRate ? 100 : 0 };

  return (
    <div className="relative z-10 w-full bg-canvas shadow-[0_-20px_40px_rgba(0,0,0,0.5)]">
      <section className="mx-auto w-full max-w-[1400px] px-6 py-12">
        <div className="flex flex-col mb-8">
          <h2 className="font-display text-[24px] text-ink sm:text-[32px] flex items-center gap-3">
            <Logo size={28} className="text-accent" />
            Central de Comando
          </h2>
          <p className="mt-1 text-[14px] text-mute font-sans font-semibold uppercase tracking-widest">
            Telemetria Principal & Performance Analítica
          </p>
        </div>

        {/* BENTO GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 auto-rows-max">
          
          {/* PAINEL 1: Perfil e Snapshot Dinâmico (Ocupa 8 colunas) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: EASE }}
            className={`lg:col-span-8 rounded-[24px] bg-surface-card border ${hasKurageData ? 'border-white/5' : 'border-[#ff5500]/20'} p-8 shadow-xl flex flex-col justify-between relative overflow-hidden`}
          >
            {!hasKurageData && (
               <div className="absolute top-0 right-0 p-4 opacity-10">
                 <SiFaceit className="w-32 h-32 text-[#ff5500]" />
               </div>
            )}
            <div className="flex items-start justify-between relative z-10">
              <div className="flex flex-col">
                <h3 className="font-display text-[28px] text-ink leading-none mb-1">
                  Bem-vindo de volta, {user.username}.
                </h3>
                <p className="text-mute text-[14px] font-sans">
                  {hasKurageData ? "Confira todas as suas estatísticas recentes no Kurage." : "Exibindo estatísticas da Faceit enquanto você não joga no Kurage."}
                </p>
              </div>
              <Avatar
                src={user.avatarUrl}
                username={user.username}
                size="xl"
                isVerifiedPro={user.isVerifiedPro}
                className="shrink-0"
              />
            </div>

            <div className="flex items-end justify-between mt-12 pt-6 border-t border-white/5 relative z-10">
              <div className="flex flex-col gap-1">
                <span className="text-[12px] text-mute uppercase tracking-widest flex items-center gap-2">
                  {displayLevel}
                  {hasKurageData ? "Kurage ELO" : "Faceit ELO"}
                </span>
                <div className="flex items-baseline gap-4">
                  <span className="font-display text-[48px] text-ink leading-none">
                    {displayElo || "---"}
                  </span>
                  {hasKurageData && deltaYesterday !== 0 && (
                    <span className={`text-[14px] font-sans font-semibold rounded-full px-2 py-0.5 ${deltaYesterday > 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                      {deltaYesterday > 0 ? "+" : ""}{deltaYesterday} pts
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-12 mr-8">
                <div className="flex flex-col">
                  <span className="text-[12px] text-mute uppercase tracking-widest mb-1">Win Rate</span>
                  <span className="font-sans font-semibold text-[24px] text-ink">{displayWinRate || 0}%</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[12px] text-mute uppercase tracking-widest mb-1">K/D Ratio</span>
                  <span className="font-sans font-semibold text-[24px] text-ink">{displayKd || "0.00"}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* PAINEL 2: Map Performance Widget (Ocupa 4 colunas) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
            className="lg:col-span-4 rounded-[24px] bg-surface-card border border-white/5 p-6 shadow-xl flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-col">
                <h4 className="font-sans font-semibold text-[14px] text-ink">Map Performance</h4>
                <span className="text-[10px] text-mute uppercase">Win Rate por Mapa</span>
              </div>
              <div className="p-2 bg-white/5 rounded-full">
                <PiCrosshair className="text-mute" />
              </div>
            </div>

            <div className="flex-1 w-full min-h-[140px] flex items-center justify-center">
              <MapPerformanceChart data={rankingData?.mapStats || []} />
            </div>
          </motion.div>

          {/* PAINEL 3: Gráfico Evolução Montanha (Ocupa 8 colunas) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
            className="lg:col-span-8 rounded-[24px] bg-surface-card border border-white/5 p-6 shadow-xl flex flex-col relative overflow-hidden"
          >
            {!hasKurageData && (
              <div className="absolute inset-0 z-20 bg-surface-card/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6">
                <PiWarningCircle className="text-accent mb-3 w-8 h-8" />
                <h4 className="text-ink font-display text-[20px] mb-1">Sem Histórico Kurage</h4>
                <p className="text-mute text-[12px] font-sans font-semibold max-w-sm">
                  Jogue sua primeira partida no matchmaking da Kurage para desbloquear sua curva de evolução analítica de ELO.
                </p>
                <Link href="/mar-aberto" className="btn-primary mt-6 px-6 py-2 text-[12px] rounded-full">
                  Encontrar Partida
                </Link>
              </div>
            )}
            <div className={`flex flex-col h-full ${!hasKurageData ? 'opacity-30 blur-sm pointer-events-none' : ''}`}>
              <div className="flex items-center justify-between mb-8">
                <div className="flex flex-col">
                  <h4 className="font-sans font-semibold text-[14px] text-ink mb-1">
                    Evolução do ELO Kurage
                  </h4>
                  <span className="text-[12px] text-mute">Overview da última semana</span>
                </div>
                <div className="flex items-center gap-2 bg-surface-deep border border-white/5 px-3 py-1.5 rounded-lg text-[12px] text-ink font-sans font-semibold">
                  <PiCalendarBlank />
                  Últimos 10 Dias
                </div>
              </div>
              
              <div className="flex-1 w-full min-h-[220px]">
                {isLoadingRanking ? (
                  <div className="w-full h-full flex items-center justify-center bg-white/5 rounded-xl animate-pulse" />
                ) : (
                  <PerformanceLineChart 
                    history={history} 
                    currentElo={playerStats?.kurageElo || 0} 
                  />
                )}
              </div>
            </div>
          </motion.div>

          {/* PAINEL 4: Donut Chart de Win Rate (Ocupa 4 colunas) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: 0.2, ease: EASE }}
            className="lg:col-span-4 rounded-[24px] bg-surface-card border border-white/5 p-6 shadow-xl flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-sans font-semibold text-[14px] text-ink">Win Rate Overview</h4>
              <div className="p-2 bg-white/5 rounded-full">
                <PiTarget className="text-mute" />
              </div>
            </div>

            <div className="flex-1 w-full flex items-center justify-center mb-4">
              <WinRateDonutChart wins={displayWinRateDonutSource.wins} matches={displayWinRateDonutSource.matches} />
            </div>

            <div className="bg-surface-deep border border-white/5 rounded-xl p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent-blue" />
                <span className="text-[12px] text-mute">Vitórias ({hasKurageData ? 'Kurage' : 'Faceit'})</span>
              </div>
              <span className="text-[12px] text-ink font-sans font-semibold">{displayWinRateDonutSource.wins}</span>
            </div>
          </motion.div>

          {/* PAINEL 5: Fallback Telemetria (Kurage Base ou Faceit Completa) (Ocupa 8 colunas) */}
          <motion.div
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true, margin: "-50px" }}
             transition={{ duration: 0.5, delay: 0.2, ease: EASE }}
             className={`lg:col-span-8 rounded-[24px] ${hasKurageData ? 'bg-white/[0.015] border-[var(--hairline-strong)]' : 'bg-surface-deep border-white/5'} p-6 shadow-lg flex flex-col relative overflow-hidden group`}
          >
            {hasKurageData ? (
              // Mostra as info Faceit de forma sutil
              <>
                <SiFaceit className="absolute -right-4 -bottom-4 w-32 h-32 text-[#ff5500] opacity-[0.03] rotate-12 transition-transform duration-500 group-hover:scale-110" />
                <div className="flex items-center justify-between mb-6 z-10">
                  <h4 className="font-sans font-semibold text-[12px] uppercase tracking-widest text-ink flex items-center gap-2">
                    <SiFaceit className="text-[#ff5500]" /> Telemetria Faceit
                  </h4>
                  <span className="text-[10px] text-mute">Sincronização Externa</span>
                </div>

                <div className="flex items-center gap-8 h-full z-10">
                  <div className="flex flex-col items-center">
                    <FaceitLevelIcon level={faceitData?.level || 1} className="w-16 h-16 [&>svg]:w-full [&>svg]:h-full drop-shadow-md mb-2" />
                    <span className="font-sans font-semibold text-[18px] text-ink font-bold">{faceitData?.elo || "---"} ELO</span>
                  </div>

                  <div className="w-px h-full bg-white/10" />

                  <div className="flex-1 flex flex-col justify-center">
                    <span className="text-[10px] text-mute uppercase tracking-widest mb-3">Últimos Resultados Faceit</span>
                    <div className="flex items-center gap-2">
                      {isLoadingFaceit ? (
                        <span className="text-[12px] text-white/20 animate-pulse font-sans font-semibold">Processando...</span>
                      ) : faceitData?.recentResults?.length ? (
                        faceitData.recentResults.slice(0, 10).map((res, i) => (
                          <div 
                            key={i} 
                            className={`h-3 w-3 rounded-full border border-black/50 ${res === "1" ? "bg-[#22c55e] shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.4)]"}`}
                            title={res === "1" ? "Vitória" : "Derrota"}
                          />
                        ))
                      ) : (
                        <span className="text-[12px] text-white/30 flex items-center gap-1 font-sans font-semibold">
                          <PiWarningCircle /> N/A
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-6 mt-4">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-mute uppercase">K/D</span>
                        <span className="font-sans font-semibold text-[14px] text-ink">{faceitData?.kdRatio?.toFixed(2) || "0.00"}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] text-mute uppercase">Win Rate</span>
                        <span className="font-sans font-semibold text-[14px] text-ink">{faceitData?.winRate || 0}%</span>
                      </div>
                      {faceitData?.faceitUrl && (
                        <a href={faceitData.faceitUrl} target="_blank" rel="noopener noreferrer" className="mt-auto ml-auto text-[10px] text-mute hover:text-[#ff5500] transition-colors underline underline-offset-2 flex items-center gap-1">
                          Ver perfil na Faceit
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              // Mostra Kurage vazio
              <div className="flex items-center gap-8 h-full">
                <div className="flex flex-col items-center">
                  <Logo size={48} className="text-accent mb-4 opacity-50" />
                  <span className="font-sans font-semibold text-[18px] text-ink font-bold">1000 ELO (Base)</span>
                </div>
                <div className="w-px h-full bg-white/10" />
                <div className="flex flex-col">
                  <h4 className="font-sans font-semibold text-[14px] text-ink mb-2">Telemetria Kurage</h4>
                  <p className="text-mute text-[12px] max-w-sm mb-4 font-sans">
                    Você ainda não jogou partidas no Kurage. Suas estatísticas primárias e seu ELO inicial estão aguardando dados reais de jogo.
                  </p>
                  <Link href="/servers" className="text-accent hover:text-accent-blue transition-colors text-[12px] font-sans font-semibold underline underline-offset-4">
                    Jogar Agora
                  </Link>
                </div>
              </div>
            )}
          </motion.div>

          {/* PAINEL 6: Espelho Leaderboard (Ocupa 4 colunas) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3, ease: EASE }}
            className="lg:col-span-4 rounded-[24px] bg-surface-card border border-white/5 p-6 shadow-xl flex flex-col relative"
          >
             {!hasKurageData && (
              <div className="absolute inset-0 z-20 bg-surface-card/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 rounded-[24px]">
                <PiTrophy className="text-mute mb-2 w-6 h-6" />
                <span className="text-ink text-[14px] font-sans font-semibold">Ranking Indisponível</span>
                <span className="text-mute text-[10px] uppercase mt-1">É necessário jogar</span>
              </div>
            )}
            <div className={`flex flex-col h-full ${!hasKurageData ? 'opacity-30 blur-sm pointer-events-none' : ''}`}>
              <div className="flex items-center justify-between mb-6">
                <h4 className="font-sans font-semibold text-[14px] text-ink">Ranking Atual</h4>
                <div className="p-2 bg-white/5 rounded-full">
                  <PiTrophy className="text-mute" />
                </div>
              </div>

              <div className="flex flex-col gap-3 flex-1 overflow-hidden">
                {isLoadingRanking ? (
                  <div className="w-full h-full flex items-center justify-center bg-white/5 rounded-xl animate-pulse" />
                ) : rankingData?.adjacentPlayers ? (
                  rankingData.adjacentPlayers.map((player: LeaderboardPlayer) => (
                    <div 
                      key={player.kurageId} 
                      className={`flex items-center gap-3 p-3 rounded-xl border ${player.kurageId === user.kurageId ? "bg-white/10 border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)]" : "bg-surface-deep/50 border-white/5 opacity-80"}`}
                    >
                      <span className={`text-[12px] font-sans font-semibold w-6 text-center ${player.kurageId === user.kurageId ? "text-accent" : "text-mute"}`}>
                        #{player.position}
                      </span>
                      <Avatar src={player.avatarUrl} username={player.username} size="sm" />
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-[13px] text-ink truncate font-semibold">
                          {player.username} {player.kurageId === user.kurageId && <span className="text-[10px] text-mute font-normal">(Você)</span>}
                        </span>
                        <span className="text-[10px] text-mute">{player.kurageElo} pts</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <span className="text-mute text-[12px] m-auto">Sem dados.</span>
                )}
              </div>

              <Link href="/ranking" className="btn-secondary w-full py-2 mt-4 text-[12px] rounded-xl flex items-center justify-center gap-2">
                Ver Ranking Completo
              </Link>
            </div>
          </motion.div>

        </div>
      </section>
    </div>
  );
}
