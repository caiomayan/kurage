"use client";

import React, { memo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  PiUser,
  PiTrophy,
  PiGear,
  PiSignOut,
  PiArrowRight,
  PiSparkle,
} from "react-icons/pi";
import { Avatar } from "@/components/ui/Avatar";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { RoleIcon } from "@/components/ui/RoleIcon";
import { KurageLevelIcon } from "@/components/ui/KurageLevelIcon";
import { FaceitLevelIcon } from "@/components/ui/faceit-levels/FaceitLevelIcon";
import { cn } from "@/lib/utils";
import type { User, UserWithStats } from "@/types/user";

interface UserMenuDropdownProps {
  user: User | UserWithStats;
  onClose: () => void;
  onLogout: () => void;
}

export const UserMenuDropdown = memo(function UserMenuDropdown({
  user,
  onClose,
  onLogout,
}: UserMenuDropdownProps) {
  const stats = (user as UserWithStats).stats;
  const matches = stats?.matchesPlayed ?? 0;
  const kurageLevel = stats?.kurageLevel ?? 1;
  const kurageElo = stats?.kurageElo ?? 200;
  const hltvRating = stats?.hltvRating ? stats.hltvRating.toFixed(2) : (matches > 0 ? "1.00" : "-");
  const kdRatio = stats && stats.deaths > 0 ? (stats.kills / stats.deaths).toFixed(2) : (stats && stats.kills > 0 ? `${stats.kills}.00` : "-");
  const winRate = stats && matches > 0 ? `${((stats.matchesWon / matches) * 100).toFixed(0)}%` : "-";

  const profileUrl = user.kurageId ? `/player/${user.kurageId}` : `/player/${user.steamId64}`;

  const menuItems = [
    {
      label: "Perfil",
      href: profileUrl,
      icon: PiUser,
      accentColor: "group-hover:text-[#a9c8c0]",
      glowColor: "group-hover:border-[#a9c8c0]/30",
      description: "Telemetria e calibração",
    },
    {
      label: "Ranking",
      href: "/ranking",
      icon: PiTrophy,
      accentColor: "group-hover:text-[#e5c158]",
      glowColor: "group-hover:border-[#e5c158]/30",
      description: "Classificação da temporada",
    },
    {
      label: "Inventário & Craft",
      href: "/inventory",
      icon: PiSparkle,
      accentColor: "group-hover:text-[#a9c8c0]",
      glowColor: "group-hover:border-[#a9c8c0]/30",
      description: "Customizador de skins e loadout",
    },
    {
      label: "Configurações",
      href: "/settings",
      icon: PiGear,
      accentColor: "group-hover:text-white",
      glowColor: "group-hover:border-white/20",
      description: "Preferências da conta",
    },
  ];

  return (
    <motion.div
      id="user-menu-dropdown"
      role="menu"
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.98 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="absolute right-0 mt-3 w-[320px] rounded-[12px] bg-[#080808]/95 backdrop-blur-xl border border-white/[0.08] z-50 flex flex-col overflow-hidden select-none will-change-transform"
    >
      {/* ── 1. ATMOSPHERIC OCEANIC BACKGROUND (Lightweight & GPU accelerated) ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[12px]">
        {/* Soft bioluminescent radial gradient */}
        <div
          className="absolute -top-12 left-1/2 -translate-x-1/2 w-60 h-40 opacity-20 blur-2xl pointer-events-none"
          style={{
            background: "radial-gradient(circle, #a9c8c0 0%, #92bce3 40%, transparent 75%)",
          }}
        />

        {/* Top Glowing Hairline */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#a9c8c0]/40 to-transparent" />
      </div>

      {/* ── 2. HEADER IDENTITY: CENTERED AVATAR & PROMINENT PROFILE ── */}
      <div className="relative z-10 p-5 pb-4 flex flex-col items-center text-center border-b border-white/[0.06]">
        {/* Centered Avatar (No rings/borders, pure floating elegance) */}
        <Link href={profileUrl} onClick={onClose} className="flex flex-col items-center group/profile">
          <div className="relative mb-3 group/avatar cursor-pointer">
            <Avatar
              src={user.avatarUrl}
              username={user.username}
              size="xl"
              isVerifiedPro={user.isVerifiedPro}
              enableHovercard={false}
              className="w-20 h-20 rounded-full object-cover transition-transform duration-200 group-hover/avatar:scale-105 select-none"
            />
            {/* Status node */}
            <div className="absolute -bottom-0.5 right-1 w-3.5 h-3.5 rounded-full bg-[#080808] flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-[#a9c8c0]" />
            </div>
          </div>

          {/* Username */}
          <div className="flex items-center gap-2">
            <span className="font-display text-[22px] font-bold text-white tracking-tight leading-none group-hover/profile:text-[#a9c8c0] transition-colors">
              {user.username}
            </span>
            {user.subscriptionTier && user.subscriptionTier !== "FREE" && (
              <span className="rounded-full bg-[#a9c8c0]/10 px-2 py-0.5 text-[9px] font-mono font-semibold tracking-wider text-[#a9c8c0] uppercase border border-[#a9c8c0]/25">
                {user.subscriptionTier}
              </span>
            )}
          </div>
        </Link>

        {/* Badges: Country, Role, Levels */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-2 text-[11px] font-sans text-stone-400">
          <CountryFlag country={user.country} expandOnHover={true} />
          
          {user.primaryFunction && (
            <RoleIcon role={user.primaryFunction} size={15} expandOnHover={true} />
          )}

          {kurageLevel > 0 ? (
            <KurageLevelIcon level={kurageLevel} expandOnHover={true} />
          ) : (
            <FaceitLevelIcon level={10} expandOnHover={true} />
          )}
        </div>

        {/* Telemetry Strip */}
        <div className="mt-3.5 pt-3 border-t border-white/[0.05] grid grid-cols-4 gap-1 w-full text-center">
          <div className="flex flex-col">
            <span className="text-[9px] font-sans font-semibold uppercase tracking-wider text-mute">ELO</span>
            <span className="font-display text-[17px] font-bold text-[#a9c8c0] leading-tight mt-0.5">
              {kurageElo}
            </span>
          </div>

          <div className="flex flex-col border-l border-white/[0.05]">
            <span className="text-[9px] font-sans font-semibold uppercase tracking-wider text-mute">Rating</span>
            <span className="font-mono text-[13px] font-semibold text-white leading-normal mt-0.5">
              {hltvRating}
            </span>
          </div>

          <div className="flex flex-col border-l border-white/[0.05]">
            <span className="text-[9px] font-sans font-semibold uppercase tracking-wider text-mute">K/D</span>
            <span className="font-mono text-[13px] font-semibold text-white leading-normal mt-0.5">
              {kdRatio}
            </span>
          </div>

          <div className="flex flex-col border-l border-white/[0.05]">
            <span className="text-[9px] font-sans font-semibold uppercase tracking-wider text-mute">Win %</span>
            <span className="font-mono text-[13px] font-semibold text-white leading-normal mt-0.5">
              {winRate}
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. CREATIVE HOVER MENU ACTIONS (No backgrounds on icons, pure floating) ── */}
      <div className="relative z-10 p-2 flex flex-col gap-0.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              role="menuitem"
              href={item.href}
              onClick={onClose}
              className={cn(
                "group relative flex items-center justify-between rounded-[8px] p-2.5 transition-colors duration-150 cursor-pointer",
                "hover:bg-white/[0.04]"
              )}
            >
              <div className="flex items-center gap-3 relative z-10">
                {/* Pure icon without background, scales smoothly on hover */}
                <Icon className={cn("w-4 h-4 text-mute transition-all duration-200 group-hover:scale-110", item.accentColor)} />

                <div className="flex flex-col text-left">
                  <span className="text-[13px] font-sans font-medium text-stone-300 group-hover:text-white transition-colors">
                    {item.label}
                  </span>
                  <span className="text-[10px] font-sans text-mute/80 group-hover:text-mute transition-colors">
                    {item.description}
                  </span>
                </div>
              </div>

              <PiArrowRight className="w-3.5 h-3.5 text-mute/40 group-hover:text-white group-hover:translate-x-0.5 transition-transform duration-150 relative z-10" />
            </Link>
          );
        })}
      </div>

      {/* ── 4. LOGOUT ACTION ── */}
      <div className="relative z-10 p-2 pt-1 border-t border-white/[0.06]">
        <button
          role="menuitem"
          onClick={() => {
            onClose();
            onLogout();
          }}
          className="group flex w-full items-center justify-between rounded-[8px] p-2 text-left text-[12px] font-sans font-medium text-mute hover:bg-accent-red/10 hover:text-accent-red transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <PiSignOut className="w-4 h-4 text-mute group-hover:text-accent-red transition-colors" />
            <span>Encerrar Sessão</span>
          </div>
          <span className="text-[10px] font-mono opacity-0 group-hover:opacity-60 transition-opacity">
            Esc
          </span>
        </button>
      </div>
    </motion.div>
  );
});
