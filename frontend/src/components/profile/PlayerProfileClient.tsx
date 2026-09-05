"use client";

import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import {
  PiChartBar,
  PiSword,
  PiScroll,
} from "react-icons/pi";
import { useAuth } from "@/lib/auth";
import { ProfileDepthField } from "./ProfileDepthField";
import { ProfileTabs, type ProfileTab as ProfileTabDefinition } from "./ProfileTabs";
import { PlayerProfileHeader } from "./PlayerProfileHeader";
import { PlayerMetricsRibbon } from "./PlayerMetricsRibbon";
import { EloEvolutionBentoCell } from "./PlayerChartsSection";
import { PlayerInventoryShowcase } from "./PlayerInventoryShowcase";
import { PlayerMatchesFeed } from "./PlayerMatchesFeed";
import { ProfileVisitors } from "./ProfileVisitors";
import { api } from "@/lib/api";
import { hasSubscriptionFeature, type PlayerStats, type UserWithStats } from "@/types/user";
import { resolveIdentity } from "@/lib/identity";
import { useGsapScope } from "@/lib/motion";
import { themeController } from "@/lib/theme";

interface PlayerProfileClientProps {
  user: UserWithStats;
  isOwner?: boolean;
}

type ProfileTab = "overview" | "inventory" | "matches";

// Short labels: a tab is a signpost, not a sentence. "Visão Geral & Telemetria"
// and "Skins & Loadout CS2" said no more than one word each already does.
const PROFILE_TABS: readonly ProfileTabDefinition<ProfileTab>[] = [
  { id: "overview", label: "Visão geral", icon: PiChartBar },
  { id: "inventory", label: "Inventário", icon: PiSword },
  { id: "matches", label: "Partidas", icon: PiScroll },
];

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

  // One entrance timeline for the page, and one crossfade per section change.
  // The panel animates its own container rather than remounting three near
  // identical motion wrappers, so a tab switch never re-runs the header reveal.
  const scopeRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useGsapScope(scopeRef, () => {
    gsap.from("[data-reveal]", {
      y: 18,
      autoAlpha: 0,
      duration: 0.7,
      ease: "power3.out",
      stagger: 0.08,
    });
  }, []);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const tween = gsap.fromTo(
      panel,
      { autoAlpha: 0, y: 10 },
      { autoAlpha: 1, y: 0, duration: 0.35, ease: "power2.out", overwrite: "auto" }
    );
    return () => {
      tween.kill();
      gsap.set(panel, { clearProps: "opacity,visibility,transform" });
    };
  }, [activeTab]);

  return (
    <div
      ref={scopeRef}
      className="relative min-h-screen overflow-hidden bg-canvas pt-28 pb-32 font-sans text-ink sm:pt-36"
    >
      <ProfileDepthField />

      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <div data-reveal>
          <PlayerProfileHeader
            user={user}
            faceitLevel={user.faceitLevel ?? null}
            currentRank={user.rankPosition ?? null}
            rankDelta={user.rankDelta ?? null}
          />
        </div>

        <div data-reveal className="mt-8 flex items-center justify-center">
          <ProfileTabs
            tabs={PROFILE_TABS}
            active={activeTab}
            onChange={setActiveTab}
            label="Seções do perfil"
          />
        </div>

        <div
          ref={panelRef}
          role="tabpanel"
          id={`profile-panel-${activeTab}`}
          aria-labelledby={`profile-tab-${activeTab}`}
          tabIndex={-1}
          className="mt-6 outline-none"
        >
          {activeTab === "overview" && (
            <div className="flex flex-col gap-6">
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

              <EloEvolutionBentoCell
                currentElo={stats?.kurageElo ?? null}
                matchesPlayed={matches}
              />
            </div>
          )}

          {activeTab === "inventory" && (
            <PlayerInventoryShowcase
              steamId64={user.steamId64 || ""}
              isOwner={isOwner}
            />
          )}

          {activeTab === "matches" && <PlayerMatchesFeed />}
        </div>
      </div>
    </div>
  );
}
