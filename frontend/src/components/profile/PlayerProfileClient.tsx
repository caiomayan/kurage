"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PiChartBar,
  PiSword,
  PiScroll,
} from "react-icons/pi";
import { useAuth } from "@/lib/auth";
import { ProfileOceanicBackground } from "./ProfileOceanicBackground";
import { PlayerProfileHeader } from "./PlayerProfileHeader";
import { PlayerMetricsRibbon } from "./PlayerMetricsRibbon";
import { EloEvolutionBentoCell } from "./PlayerChartsSection";
import { PlayerInventoryShowcase } from "./PlayerInventoryShowcase";
import { PlayerMatchesFeed } from "./PlayerMatchesFeed";
import { ProfileVisitors } from "./ProfileVisitors";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { hasSubscriptionFeature, type PlayerStats, type UserWithStats } from "@/types/user";
import { resolveIdentity } from "@/lib/identity";
import { themeController } from "@/lib/theme";

interface PlayerProfileClientProps {
  user: UserWithStats;
  isOwner?: boolean;
}

type ProfileTab = "overview" | "inventory" | "matches";

export function PlayerProfileClient({ user: initialUser }: PlayerProfileClientProps) {
  const { user: authUser, isLoading: isAuthLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");

  // Check if current visitor is the profile owner
  const isOwner = Boolean(
    authUser &&
      (authUser.kurageId === initialUser.kurageId ||
        String(authUser.kurageId) === String(initialUser.kurageId) ||
        (authUser.steamId64 && authUser.steamId64 === initialUser.steamId64))
  );

  // Seamlessly merge authenticated user data (real Steam avatar, username, stats) when viewing own profile
  const authenticatedStats: Partial<PlayerStats> | undefined = isOwner
    ? (authUser as (typeof authUser & { stats?: Partial<PlayerStats> }) | null)?.stats
    : undefined;
  const mergedStats = initialUser.stats
    ? { ...initialUser.stats, ...authenticatedStats }
    : undefined;
  const user: UserWithStats = {
    ...initialUser,
    ...(isOwner && authUser ? authUser : {}),
    stats: mergedStats,
  };

  const canViewVisitors = Boolean(
    authUser &&
      (authUser.role === "OWNER" ||
        authUser.role === "ADMIN" ||
        hasSubscriptionFeature(authUser.subscriptionTier, "PROFILE_VISITORS"))
  );

  // The page adopts the identity of the profile being read, not the viewer's
  // (docs/pt/19 §2.2). Releasing on unmount restores the visitor's own theme,
  // and it resolves from `initialUser` so a direct URL hit and an anonymous
  // visitor behave the same as an authenticated navigation.
  const profileIdentity = resolveIdentity(initialUser);
  useEffect(() => {
    return themeController.pushOverride(profileIdentity);
  }, [profileIdentity]);

  useEffect(() => {
    if (isAuthLoading || !authUser || isOwner) return;

    api.post<void>(`/users/kurage/${initialUser.kurageId}/visit`).catch(() => {
      // A visita é telemetria auxiliar e não deve bloquear a leitura do perfil.
    });
  }, [authUser, initialUser.kurageId, isAuthLoading, isOwner]);

  const stats = user.stats;
  const matches = stats?.matchesPlayed ?? 0;
  const hltvRating = stats?.hltvRating ?? null;
  const kdRatio = stats && stats.deaths > 0 ? Number((stats.kills / stats.deaths).toFixed(2)) : (stats?.kills ?? null);
  const adr = stats && stats.roundsPlayed > 0 ? Number((stats.totalDamage / stats.roundsPlayed).toFixed(1)) : null;
  const hsPercentage = stats && stats.kills > 0 ? Number(((stats.headshots / stats.kills) * 100).toFixed(1)) : null;
  const winRate = stats && matches > 0 ? Number(((stats.matchesWon / matches) * 100).toFixed(1)) : null;

  return (
    <div className="relative min-h-screen bg-canvas font-sans text-ink overflow-hidden pt-28 sm:pt-36 pb-32">
      {/* 1. Bespoke Oceanic Atmospheric Background */}
      <ProfileOceanicBackground />

      {/* 2. Main Page Container with Generous Spacing */}
      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <PlayerProfileHeader
          user={user}
          faceitLevel={user.faceitLevel ?? null}
          currentRank={user.rankPosition ?? null}
          rankDelta={user.rankDelta ?? null}
        />

        {/* 3. PROFILE NAVIGATION TABS */}
        <div className="mt-8 flex items-center justify-center">
          <div className="inline-flex items-center p-1 rounded-[12px] bg-[#060a0d]/90 backdrop-blur-2xl border border-white/[0.08] shadow-lg">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-[9px] text-[13px] font-sans font-semibold transition-all cursor-pointer",
                activeTab === "overview"
                  ? "bg-white text-black shadow-md"
                  : "text-stone-400 hover:text-white"
              )}
            >
              <PiChartBar className="w-4 h-4" />
              <span>Visão Geral & Telemetria</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("inventory")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-[9px] text-[13px] font-sans font-semibold transition-all cursor-pointer",
                activeTab === "inventory"
                  ? "bg-[var(--kurage-accent)] text-black shadow-md font-bold"
                  : "text-stone-400 hover:text-white"
              )}
            >
              <PiSword className="w-4 h-4" />
              <span>Skins & Loadout CS2</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("matches")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-[9px] text-[13px] font-sans font-semibold transition-all cursor-pointer",
                activeTab === "matches"
                  ? "bg-white text-black shadow-md"
                  : "text-stone-400 hover:text-white"
              )}
            >
              <PiScroll className="w-4 h-4" />
              <span>Histórico de Partidas</span>
            </button>
          </div>
        </div>

        {/* 4. ACTIVE TAB CONTENT */}
        <div className="mt-6">
          <AnimatePresence mode="wait">
            {activeTab === "overview" && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col gap-6"
              >
                {/* Key Performance Indicators */}
                <PlayerMetricsRibbon
                  stats={stats}
                  hltvRating={hltvRating}
                  kdRatio={kdRatio}
                  adr={adr}
                  hsPercentage={hsPercentage}
                  kastPercentage={stats?.kastPercentage ?? null}
                  winRate={winRate}
                />

                {canViewVisitors && <ProfileVisitors kurageId={user.kurageId} />}

                {/* ELO Evolution / Calibration Tide Curve */}
                <EloEvolutionBentoCell
                  currentElo={stats?.kurageElo ?? null}
                  matchesPlayed={matches}
                />
              </motion.div>
            )}

            {activeTab === "inventory" && (
              <motion.div
                key="inventory"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                <PlayerInventoryShowcase
                  steamId64={user.steamId64 || ""}
                  isOwner={isOwner}
                />
              </motion.div>
            )}

            {activeTab === "matches" && (
              <motion.div
                key="matches"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                <PlayerMatchesFeed />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
