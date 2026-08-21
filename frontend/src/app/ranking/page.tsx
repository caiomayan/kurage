"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  PiMagnifyingGlass, 
  PiArrowUp, 
  PiArrowDown, 
  PiMinus, 
  PiUsers, 
  PiCrosshair, 
  PiArrowRight,
  PiTrophy
} from "react-icons/pi";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { KurageLevelIcon } from "@/components/ui/KurageLevelIcon";
import { FaceitLevelIcon } from "@/components/ui/faceit-levels/FaceitLevelIcon";
import { RoleIcon } from "@/components/ui/RoleIcon";
import { TeamLogo, KNOWN_TEAM_LOGOS } from "@/components/ui/TeamLogo";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { RankingOceanicBackground } from "@/components/ranking/RankingOceanicBackground";
import { UserRankingAnchorBar } from "@/components/ranking/UserRankingAnchorBar";
import type { LeaderboardPlayer, TeamLeaderboardItem, PageResponse, PlayerRankingContext } from "@/types/ranking";

const EASE = [0.16, 1, 0.3, 1] as const;

type RankingTab = "PLAYERS" | "TEAMS";
type SortOption = "ELO" | "RATING" | "KD" | "WINRATE" | "MATCHES";

export default function RankingPage() {
  const { user, isAuthenticated, loginWithSteam } = useAuth();
  
  const [activeTab, setActiveTab] = useState<RankingTab>("PLAYERS");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("ELO");

  // Fetch real user context
  const { data: userContext } = useQuery({
    queryKey: ["rankingContext", user?.kurageId],
    queryFn: () => api.get<PlayerRankingContext>(`/leaderboard/players/${user?.kurageId}/context`),
    enabled: !!user?.kurageId,
  });

  // Fetch real players from API
  const { data: playersData } = useQuery({
    queryKey: ["leaderboard", "players"],
    queryFn: async () => {
      try {
        const res = await api.get<PageResponse<LeaderboardPlayer>>("/leaderboard/players?page=0&size=50");
        return res?.content || [];
      } catch {
        return [];
      }
    },
    staleTime: 60 * 1000,
  });

  // Fetch real teams from API
  const { data: teamsData } = useQuery({
    queryKey: ["leaderboard", "teams"],
    queryFn: async () => {
      try {
        const res = await api.get<PageResponse<TeamLeaderboardItem>>("/leaderboard/teams?page=0&size=30");
        return res?.content || [];
      } catch {
        return [];
      }
    },
    staleTime: 60 * 1000,
  });

  const playersList = playersData || [];
  const teamsList = teamsData || [];

  // Filtered & Sorted Players
  const filteredPlayers = useMemo(() => {
    return playersList
      .filter((p) => {
        return p.username.toLowerCase().includes(searchQuery.toLowerCase());
      })
      .sort((a, b) => {
        if (sortBy === "ELO") return (b.kurageElo || 0) - (a.kurageElo || 0);
        if (sortBy === "RATING") return (b.hltvRating || 0) - (a.hltvRating || 0);
        if (sortBy === "KD") return (b.kdRatio || 0) - (a.kdRatio || 0);
        if (sortBy === "WINRATE") return (b.winRate || 0) - (a.winRate || 0);
        if (sortBy === "MATCHES") return (b.matches || 0) - (a.matches || 0);
        return 0;
      });
  }, [playersList, searchQuery, sortBy]);

  // Filtered & Sorted Teams
  const filteredTeams = useMemo(() => {
    return teamsList
      .filter((t) => {
        return (
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.tag.toLowerCase().includes(searchQuery.toLowerCase())
        );
      })
      .sort((a, b) => (b.teamElo || 0) - (a.teamElo || 0));
  }, [teamsList, searchQuery]);

  // Stepped Podium (2nd Place - 1st Place - 3rd Place)
  const firstPlacePlayer = filteredPlayers[0];
  const secondPlacePlayer = filteredPlayers[1];
  const thirdPlacePlayer = filteredPlayers[2];
  const remainingPlayers = filteredPlayers.slice(3);

  const firstPlaceTeam = filteredTeams[0];
  const secondPlaceTeam = filteredTeams[1];
  const thirdPlaceTeam = filteredTeams[2];
  const remainingTeams = filteredTeams.slice(3);

  return (
    <div className="relative min-h-screen bg-[#020507] font-sans text-ink overflow-hidden pb-32">
      
      {/* ── BESPOKE DEEP-SEA LIVING ATMOSPHERE (God-rays, Caustics & Pelagic Particles) ── */}
      <RankingOceanicBackground />

      {/* ── MAIN CONTAINER ── */}
      <main className="relative z-10 mx-auto w-full max-w-7xl px-6 pt-[90px] sm:pt-[110px] flex flex-col gap-12 sm:gap-16">
        
        {/* ══════════════════════════════════════════════════════════════
            1. EM PRIMEIRO: O PÓDIO VISUAL (2 - 1 - 3 COM DEGRAUS FÍSICOS)
           ══════════════════════════════════════════════════════════════ */}
        {activeTab === "PLAYERS" ? (
          searchQuery === "" && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE }}
              className="mx-auto w-full max-w-5xl pt-4 pb-2"
            >
              <div className="grid grid-cols-1 gap-6 sm:gap-4 lg:grid-cols-3 lg:items-end">
                
                {/* ── 2ND PLACE (Prata / Silver - Left Column) ── */}
                {secondPlacePlayer ? (
                  <div className="order-2 lg:order-1 flex flex-col justify-end">
                    <FloatingPlayerDetails
                      player={secondPlacePlayer}
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
                {firstPlacePlayer ? (
                  <div className="order-1 lg:order-2 flex flex-col justify-end">
                    <FloatingPlayerDetails
                      player={firstPlacePlayer}
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
                {thirdPlacePlayer ? (
                  <div className="order-3 lg:order-3 flex flex-col justify-end">
                    <FloatingPlayerDetails
                      player={thirdPlacePlayer}
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
            </motion.div>
          )
        ) : (
          searchQuery === "" && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE }}
              className="mx-auto w-full max-w-5xl pt-4 pb-2"
            >
              <div className="grid grid-cols-1 gap-6 sm:gap-4 lg:grid-cols-3 lg:items-end">
                
                {/* ── 2ND PLACE TEAM (Silver - Left) ── */}
                {secondPlaceTeam ? (
                  <div className="order-2 lg:order-1 flex flex-col justify-end">
                    <FloatingTeamDetails
                      team={secondPlaceTeam}
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
                  <GhostTeamPodiumSpot
                    rank={2}
                    tier="silver"
                    height="h-32 sm:h-36"
                    orderClass="order-2 lg:order-1"
                  />
                )}

                {/* ── 1ST PLACE TEAM (Gold - Center) ── */}
                {firstPlaceTeam ? (
                  <div className="order-1 lg:order-2 flex flex-col justify-end">
                    <FloatingTeamDetails
                      team={firstPlaceTeam}
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
                  <GhostTeamPodiumSpot
                    rank={1}
                    tier="gold"
                    height="h-48 sm:h-56"
                    orderClass="order-1 lg:order-2"
                  />
                )}

                {/* ── 3RD PLACE TEAM (Bronze - Right) ── */}
                {thirdPlaceTeam ? (
                  <div className="order-3 lg:order-3 flex flex-col justify-end">
                    <FloatingTeamDetails
                      team={thirdPlaceTeam}
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
                  <GhostTeamPodiumSpot
                    rank={3}
                    tier="bronze"
                    height="h-20 sm:h-24"
                    orderClass="order-3 lg:order-3"
                  />
                )}

              </div>
            </motion.div>
          )
        )}

        {/* ══════════════════════════════════════════════════════════════
            2. DEPOIS: TÍTULO E DESCRIÇÃO DA PÁGINA + SELETOR JOGADORES/TIMES
           ══════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 border-b border-white/[0.08] pb-8">
          <div className="flex flex-col">
            <h1 className="font-display text-[48px] sm:text-[64px] leading-none tracking-tight text-white">
              Os Melhores.
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-body font-sans">
              O ranking oficial dos jogadores da Kurage. Calibração por ELO, taxa de vitória, impacto e estatísticas em tempo real.
            </p>
          </div>

          {/* Tab Switcher: Jogadores | Times */}
          <div className="flex items-center rounded-[8px] bg-surface-card border border-white/[0.08] p-1 shrink-0">
            <button
              onClick={() => { setActiveTab("PLAYERS"); setSearchQuery(""); }}
              className={cn(
                "px-4 py-2 rounded-[6px] text-[12px] font-sans font-medium uppercase tracking-wider transition-all duration-200 cursor-pointer",
                activeTab === "PLAYERS"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-mute hover:text-ink hover:bg-white/[0.03]"
              )}
            >
              Jogadores
            </button>
            <button
              onClick={() => { setActiveTab("TEAMS"); setSearchQuery(""); }}
              className={cn(
                "px-4 py-2 rounded-[6px] text-[12px] font-sans font-medium uppercase tracking-wider transition-all duration-200 cursor-pointer",
                activeTab === "TEAMS"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-mute hover:text-ink hover:bg-white/[0.03]"
              )}
            >
              Times
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            3. DEPOIS: BARRA DE CONTROLE (BUSCA, ORDENAR)
           ══════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <PiMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-mute" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === "PLAYERS" ? "Buscar por nick..." : "Buscar por nome do time ou tag..."}
              className="w-full h-10 pl-10 pr-4 rounded-[8px] bg-surface-card border border-white/[0.08] text-[13px] text-white placeholder-stone-500 focus:outline-none focus:border-white/20 transition-colors"
            />
          </div>

          {/* Sorting Selectors (Only for Players) */}
          {activeTab === "PLAYERS" && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-surface-card border border-white/[0.08] text-[12px] text-stone-300">
              <span className="text-mute text-[11px] uppercase">Ordenar:</span>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer pr-1"
              >
                <option value="ELO" className="bg-[#12161a] text-white">Por ELO</option>
                <option value="RATING" className="bg-[#12161a] text-white">Por HLTV Rating</option>
                <option value="KD" className="bg-[#12161a] text-white">Por K/D</option>
                <option value="WINRATE" className="bg-[#12161a] text-white">Por Win Rate</option>
                <option value="MATCHES" className="bg-[#12161a] text-white">Por Partidas</option>
              </select>
            </div>
          )}

        </div>

        {/* ══════════════════════════════════════════════════════════════
            4. DEPOIS: TABELA COM O RESTANTE DAS POSIÇÕES (4+)
           ══════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col w-full">
          
          {activeTab === "PLAYERS" ? (
            /* Players Table */
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.08] text-[11px] font-sans font-semibold uppercase tracking-wider text-mute">
                    <th className="py-3 px-3 w-16 text-center">#</th>
                    <th className="py-3 px-4">Operador</th>
                    <th className="py-3 px-4 text-center">ELO</th>
                    <th className="py-3 px-4 text-center">HLTV Rating</th>
                    <th className="py-3 px-4 text-center">K/D</th>
                    <th className="py-3 px-4 text-center">Win Rate</th>
                    <th className="py-3 px-4 text-right pr-6">Partidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {(searchQuery !== "" ? filteredPlayers : remainingPlayers).map((player, idx) => {
                    const rankNumber = searchQuery !== "" ? idx + 1 : idx + 4;
                    return (
                      <tr 
                        key={player.kurageId}
                        className="group hover:bg-white/[0.03] transition-colors"
                      >
                        {/* Position & Delta */}
                        <td className="py-3.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className="font-mono text-[13px] text-stone-400 font-medium">
                              {rankNumber}
                            </span>
                            <PositionDelta delta={player.positionDelta} />
                          </div>
                        </td>

                        {/* Player Name & Badge */}
                        <td className="py-3.5 px-4">
                          <Link 
                            href={`/player/${player.kurageId}`}
                            className="flex items-center gap-3 group/link w-fit"
                          >
                            <Avatar 
                              src={player.avatarUrl} 
                              username={player.username} 
                              size="sm" 
                              isVerifiedPro={player.isVerifiedPro} 
                            />
                            <div className="flex items-center gap-2">
                              <span className="text-[14px] font-sans font-medium text-white group-hover/link:text-[#a9c8c0] transition-colors">
                                {player.username}
                              </span>
                              <CountryFlag country={player.country} expandOnHover={true} />
                              {player.kurageLevel > 0 ? (
                                <KurageLevelIcon level={player.kurageLevel} className="w-4 h-4 text-[9px]" />
                              ) : null}
                            </div>
                          </Link>
                        </td>

                        {/* ELO */}
                        <td className="py-3.5 px-4 text-center font-sans font-bold text-white text-[14px]">
                          {player.kurageElo}
                        </td>

                        {/* HLTV Rating */}
                        <td className="py-3.5 px-4 text-center font-sans font-bold text-[13px] tabular-nums">
                          <span className={cn(
                            (player.hltvRating || 0) >= 1.30 ? "text-[#a9c8c0]" : (player.hltvRating || 0) >= 1.05 ? "text-white" : "text-stone-400"
                          )}>
                            {player.hltvRating ? player.hltvRating.toFixed(2) : "-"}
                          </span>
                        </td>

                        {/* K/D */}
                        <td className="py-3.5 px-4 text-center font-sans font-medium text-[13px] tabular-nums">
                          <span className={cn(
                            (player.kdRatio || 0) >= 1.3 ? "text-[#a9c8c0]" : (player.kdRatio || 0) >= 1.0 ? "text-stone-300" : "text-stone-400"
                          )}>
                            {player.kdRatio ? player.kdRatio.toFixed(2) : "-"}
                          </span>
                        </td>

                        {/* Win Rate */}
                        <td className="py-3.5 px-4 text-center font-sans font-medium text-[13px] tabular-nums text-stone-300">
                          {player.winRate != null ? `${player.winRate.toFixed(1)}%` : "-"}
                        </td>

                        {/* Matches */}
                        <td className="py-3.5 px-4 text-right pr-6 font-sans text-[13px] text-stone-400 tabular-nums">
                          {player.matches || 0}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredPlayers.length === 0 && (
                <div className="w-full py-20 flex flex-col items-center justify-center text-center text-mute">
                  <PiCrosshair className="w-8 h-8 mb-3 opacity-40" />
                  <p className="text-[14px]">Nenhum operador encontrado com os filtros selecionados.</p>
                </div>
              )}
            </div>
          ) : (
            /* Teams Table */
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.08] text-[11px] font-sans font-semibold uppercase tracking-wider text-mute">
                    <th className="py-3 px-3 w-16 text-center">#</th>
                    <th className="py-3 px-4">Equipe</th>
                    <th className="py-3 px-4">Tag</th>
                    <th className="py-3 px-4 text-center">Membros</th>
                    <th className="py-3 px-4 text-center">ELO Médio</th>
                    <th className="py-3 px-4 text-right pr-6">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {(searchQuery !== "" ? filteredTeams : remainingTeams).map((team, idx) => {
                    const rankNumber = searchQuery !== "" ? idx + 1 : idx + 4;
                    return (
                      <tr key={team.teamId} className="group hover:bg-white/[0.03] transition-colors">
                        <td className="py-3.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className="font-mono text-[13px] text-stone-400 font-medium">
                              {rankNumber}
                            </span>
                            <PositionDelta delta={team.positionDelta} />
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <Link 
                            href={`/team/${team.tag}`}
                            className="flex items-center gap-3 group/link w-fit"
                          >
                            <TeamLogo teamTag={team.tag} logoUrl={team.logoUrl} size={24} isLink={false} />
                            <span className="text-[14px] font-sans font-medium text-white group-hover/link:text-[#a9c8c0] transition-colors">
                              {team.name}
                            </span>
                          </Link>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[12px] text-stone-400">
                          [{team.tag}]
                        </td>

                        <td className="py-3.5 px-4 text-center font-sans text-[13px] text-stone-300">
                          {team.memberCount} titulares
                        </td>

                        <td className="py-3.5 px-4 text-center font-sans font-bold text-white text-[14px]">
                          {team.teamElo}
                        </td>

                        <td className="py-3.5 px-4 text-right pr-6">
                          <Link 
                            href={`/team/${team.tag}`}
                            className="inline-flex items-center gap-1 text-[12px] text-stone-400 hover:text-white transition-colors"
                          >
                            <span>Ver Roster</span>
                            <PiArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredTeams.length === 0 && (
                <div className="w-full py-20 flex flex-col items-center justify-center text-center text-mute">
                  <PiUsers className="w-8 h-8 mb-3 opacity-40" />
                  <p className="text-[14px]">Nenhuma equipe encontrada com esse nome ou tag.</p>
                </div>
              )}
            </div>
          )}

        </div>

      </main>

      {/* ── 5. PLAYER RANKING ANCHOR BAR & TACTICAL MODAL ── */}
      <UserRankingAnchorBar
        user={user}
        isAuthenticated={isAuthenticated}
        userContext={userContext}
        onLogin={loginWithSteam}
      />

    </div>
  );
}

// ── FLOATING PLAYER DETAILS (EXACT SAME COMPONENT AS HOME) ──
interface FloatingPlayerDetailsProps {
  player: LeaderboardPlayer;
  rank: number;
  tier: "gold" | "silver" | "bronze";
  delay: number;
}

function FloatingPlayerDetails({ player, rank, tier, delay }: FloatingPlayerDetailsProps) {
  const eloValue = player.kurageElo ?? 2000;

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
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: EASE }}
      className="group/player flex flex-col items-center text-center pb-6 px-4"
    >
      {/* 1. Contextual Badges Row (Country, Level) */}
      <div className="flex items-center gap-2 mb-4">
        <CountryFlag country={player.country} expandOnHover={true} />

        {/* Player Level */}
        {player.kurageLevel !== undefined && player.kurageLevel !== null && player.kurageLevel > 0 ? (
          <KurageLevelIcon level={player.kurageLevel} className="h-5 w-5 text-[9px]" />
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
        <span><strong className="text-[#a9c8c0]">{player.hltvRating ? player.hltvRating.toFixed(2) : "-"}</strong> Rating</span>
        <span className="text-stone-600">·</span>
        <span><strong className="text-white">{player.kdRatio ? player.kdRatio.toFixed(2) : "-"}</strong> K/D</span>
        <span className="text-stone-600">·</span>
        <span><strong className="text-white">{player.winRate != null ? `${player.winRate.toFixed(0)}%` : "-"}</strong> WR</span>
        <span className="text-stone-600">·</span>
        <span><strong className="text-white">{player.matches ?? 0}</strong> Partidas</span>
      </div>
    </motion.div>
  );
}

// ── FLOATING TEAM DETAILS (MATCHING THE PLAYER PODIUM AESTHETIC) ──
interface FloatingTeamDetailsProps {
  team: TeamLeaderboardItem;
  rank: number;
  tier: "gold" | "silver" | "bronze";
  delay: number;
}

function FloatingTeamDetails({ team, rank, tier, delay }: FloatingTeamDetailsProps) {
  const tierStyles = {
    gold: {
      eloColor: "text-[#e5c158] drop-shadow-[0_0_16px_rgba(229,193,88,0.4)]",
      logoRing: "ring-2 ring-[#e5c158] shadow-[0_0_24px_rgba(229,193,88,0.35)]",
      hoverText: "group-hover/team:text-[#e5c158]",
    },
    silver: {
      eloColor: "text-[#e2e8f0] drop-shadow-[0_0_12px_rgba(226,232,240,0.3)]",
      logoRing: "ring-2 ring-[#e2e8f0] shadow-[0_0_18px_rgba(255,255,255,0.25)]",
      hoverText: "group-hover/team:text-white",
    },
    bronze: {
      eloColor: "text-[#cd7f32] drop-shadow-[0_0_12px_rgba(205,127,50,0.3)]",
      logoRing: "ring-2 ring-[#cd7f32] shadow-[0_0_18px_rgba(205,127,50,0.25)]",
      hoverText: "group-hover/team:text-[#cd7f32]",
    },
  }[tier];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: EASE }}
      className="group/team flex flex-col items-center text-center pb-6 px-4"
    >
      {/* Contextual Badges Row */}
      <div className="flex items-center gap-2 mb-4">
        <CountryFlag country={team.country} expandOnHover={true} />
        <span className="text-[10px] font-mono uppercase tracking-wider text-mute px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
          [{team.tag}]
        </span>
      </div>

      {/* Team Logo with Metallic Ring */}
      <Link href={`/team/${team.tag}`} className="group/logo relative block mb-3 transition-transform duration-300 group-hover/logo:scale-105 p-3 rounded-full bg-surface-card border border-white/[0.08]">
        <div className={cn("p-1 rounded-full", tierStyles.logoRing)}>
          <TeamLogo teamTag={team.tag} logoUrl={team.logoUrl} size={rank === 1 ? 48 : 38} isLink={false} />
        </div>
      </Link>

      {/* Team Name */}
      <Link href={`/team/${team.tag}`} className="flex flex-col items-center">
        <span className={cn(
          "font-display text-ink transition-colors duration-200 tracking-tight",
          rank === 1 ? "text-[26px] sm:text-[32px]" : "text-[20px] sm:text-[24px]",
          tierStyles.hoverText
        )}>
          {team.name}
        </span>
      </Link>

      {/* Rating ELO */}
      <div className="mt-2 flex flex-col items-center">
        <span className={cn(
          "font-display leading-none tracking-tight",
          rank === 1 ? "text-[46px] sm:text-[54px]" : "text-[36px] sm:text-[42px]",
          tierStyles.eloColor
        )}>
          {team.teamElo}
        </span>
        <span className="text-[10px] font-sans font-semibold tracking-widest text-mute uppercase mt-1">
          ELO Médio
        </span>
      </div>

      {/* Minimal Floating Stats Line */}
      <div className="mt-4 flex items-center justify-center gap-3 text-[12px] font-sans text-body">
        <span><strong className="text-white">{team.memberCount}</strong> Titulares</span>
        <span className="text-stone-600">·</span>
        <span className="text-stone-400">Equipe Oficial</span>
      </div>
    </motion.div>
  );
}

// ── GHOST PODIUM SPOT (When a podium position is open for contention) ──
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

// ── GHOST TEAM PODIUM SPOT ──
function GhostTeamPodiumSpot({ rank, tier, height, orderClass }: GhostPodiumSpotProps) {
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
        <div
          className={cn(
            "rounded-full border border-dashed flex items-center justify-center mb-3 transition-transform duration-300 hover:scale-105",
            rank === 1 ? "w-20 h-20 sm:w-24 sm:h-24" : "w-16 h-16 sm:w-20 sm:h-20",
            tierConfig.ring
          )}
          style={{ background: tierConfig.aura }}
        >
          <PiUsers className={cn(rank === 1 ? "w-8 h-8 sm:w-10 sm:h-10" : "w-6 h-6 sm:w-8 sm:h-8", tierConfig.color)} />
        </div>

        <span className={cn(
          "font-display font-semibold tracking-tight text-stone-400",
          rank === 1 ? "text-[22px] sm:text-[26px]" : "text-[18px] sm:text-[22px]"
        )}>
          {tierConfig.title}
        </span>

        <span className="text-[11px] font-sans text-stone-500 mt-1 uppercase tracking-widest">
          Aguardando Calibração
        </span>
      </div>

      <PodiumStep rank={rank} tier={tier} height={height} isGhost={true} />
    </div>
  );
}

// ── PHYSICAL PODIUM STEP (EXACT SAME COMPONENT AS HOME) ──
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

// ── POSITION DELTA HELPER ──
function PositionDelta({ delta }: { delta?: number | null }) {
  if (delta === undefined || delta === null || delta === 0) {
    return <PiMinus className="w-3 h-3 text-stone-600" title="Posição inalterada" />;
  }
  if (delta > 0) {
    return (
      <span className="flex items-center text-[10px] font-sans font-semibold text-accent-green" title={`Subiu ${delta} posições`}>
        <PiArrowUp className="w-3 h-3" />
        <span>{delta}</span>
      </span>
    );
  }
  return (
    <span className="flex items-center text-[10px] font-sans font-semibold text-accent-red" title={`Caiu ${Math.abs(delta)} posições`}>
      <PiArrowDown className="w-3 h-3" />
      <span>{Math.abs(delta)}</span>
    </span>
  );
}
