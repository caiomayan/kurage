"use client";

import React from "react";
import { Avatar } from "@/components/ui/Avatar";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { RoleIcon } from "@/components/ui/RoleIcon";
import { KurageLevelIcon } from "@/components/ui/KurageLevelIcon";
import { FaceitLevelIcon } from "@/components/ui/faceit-levels/FaceitLevelIcon";
import { SteamIcon, FaceitIcon } from "@/components/ui/PlatformIcons";
import { PlayerRankingSnapshot } from "./PlayerRankingSnapshot";
import { VerifiedProBadge } from "@/components/ui/VerifiedProBadge";
import type { UserWithStats } from "@/types/user";

interface PlayerProfileHeaderProps {
  user: UserWithStats;
  faceitLevel?: number | null;
  currentRank?: number | null;
  rankDelta?: number;
}

export function PlayerProfileHeader({
  user,
  faceitLevel = null,
  currentRank = null,
  rankDelta = 0,
}: PlayerProfileHeaderProps) {
  const kurageLevel = user.stats?.kurageLevel ?? 0;

  return (
    <div className="relative w-full flex flex-col items-center text-center pb-10">
      {/* 1. Row with Centered Avatar and Left-Flush Horizontal Ranking Feedback */}
      <div className="relative flex items-center justify-center w-full min-h-[160px] sm:min-h-[192px]">
        {/* Vertical Subtle Ranking Ladder flush against the top-right margin */}
        {currentRank != null && currentRank > 0 && (
          <div className="hidden lg:block absolute right-0 top-0">
            <PlayerRankingSnapshot
              currentRank={currentRank}
            player={{
              kurageId: user.kurageId,
              username: user.username,
              avatarUrl: user.avatarUrl,
              country: user.country,
              kurageElo: user.stats?.kurageElo,
              isVerifiedPro: user.isVerifiedPro,
            }}
            rankDelta={rankDelta}
            />
          </div>
        )}

        {/* Main Imposing Centered Avatar */}
        <Avatar
          src={user.avatarUrl}
          username={user.username}
          kurageId={user.kurageId}
          size="2xl"
          isVerifiedPro={user.isVerifiedPro}
          className="w-40 h-40 sm:w-48 sm:h-48 rounded-full object-cover shadow-[0_20px_60px_rgba(0,0,0,0.9)] select-none"
        />
      </div>

      {/* 2. Username in Editorial EB Garamond Font */}
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <h1 className="font-display text-[44px] sm:text-[56px] font-bold text-white tracking-tight leading-none select-text">
          {user.username}
        </h1>
        <VerifiedProBadge subscriptionTier={user.subscriptionTier} />
      </div>

      {/* 3. Unified Tactical & Platform Badges (All expand-on-hover without backgrounds) */}
      <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-[13px] font-sans text-stone-300">
        {/* Country */}
        <CountryFlag country={user.country} expandOnHover={true} />
        
        {/* In-Game Role */}
        {user.primaryFunction && (
          <RoleIcon role={user.primaryFunction} size={18} expandOnHover={true} />
        )}

        {/* Kurage Level */}
        {kurageLevel > 0 && (
          <KurageLevelIcon level={kurageLevel} expandOnHover={true} />
        )}

        {/* Faceit Level */}
        {faceitLevel && (
          <FaceitLevelIcon level={faceitLevel} size={18} expandOnHover={true} />
        )}

        {/* Steam Clickable Icon (No background, expands on hover) */}
        {user.steamId64 && (
          <a
            href={`https://steamcommunity.com/profiles/${user.steamId64}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group/steam inline-flex items-center gap-0 overflow-hidden rounded-full transition-all duration-300 cursor-pointer p-0.5 hover:bg-white/10 shrink-0 text-mute hover:text-white"
            title="Steam"
          >
            <SteamIcon size={16} className="shrink-0 transition-transform duration-300 group-hover/steam:scale-110" />
            <span className="max-w-0 overflow-hidden whitespace-nowrap text-[9px] font-semibold tracking-widest uppercase text-mute group-hover/steam:text-white opacity-0 transition-all duration-300 group-hover/steam:max-w-[80px] group-hover/steam:opacity-100 group-hover/steam:pl-1.5 group-hover/steam:pr-1">
              Steam
            </span>
          </a>
        )}

        {/* Faceit Clickable Icon (No background, expands on hover) */}
        {user.faceitUsername && (
          <a
            href={`https://www.faceit.com/en/players/${user.faceitUsername}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group/faceit inline-flex items-center gap-0 overflow-hidden rounded-full transition-all duration-300 cursor-pointer p-0.5 hover:bg-white/10 shrink-0 text-mute hover:text-[#ff5500]"
            title="FACEIT"
          >
            <FaceitIcon size={16} className="shrink-0 transition-transform duration-300 group-hover/faceit:scale-110" />
            <span className="max-w-0 overflow-hidden whitespace-nowrap text-[9px] font-semibold tracking-widest uppercase text-mute group-hover/faceit:text-[#ff5500] opacity-0 transition-all duration-300 group-hover/faceit:max-w-[80px] group-hover/faceit:opacity-100 group-hover/faceit:pl-1.5 group-hover/faceit:pr-1">
              FACEIT
            </span>
          </a>
        )}
      </div>

      {/* Mobile Subtle Ranking Feedback */}
      {currentRank != null && currentRank > 0 && (
        <div className="block lg:hidden mt-5">
          <PlayerRankingSnapshot
            currentRank={currentRank}
          player={{
            kurageId: user.kurageId,
            username: user.username,
            avatarUrl: user.avatarUrl,
            country: user.country,
            kurageElo: user.stats?.kurageElo,
            isVerifiedPro: user.isVerifiedPro,
          }}
          rankDelta={rankDelta}
          />
        </div>
      )}
    </div>
  );
}
