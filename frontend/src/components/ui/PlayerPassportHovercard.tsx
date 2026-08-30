"use client";

import React, { useState, useRef, useEffect, useCallback, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  PiShieldCheck,
  PiArrowRight,
} from "react-icons/pi";
import { api } from "@/lib/api";
import { Avatar } from "@/components/ui/Avatar";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { RoleIcon } from "@/components/ui/RoleIcon";
import { KurageLevelIcon } from "@/components/ui/KurageLevelIcon";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { VerifiedProBadge } from "@/components/ui/VerifiedProBadge";
import type { HovercardData } from "@/types/hovercard";
import type { UserWithStats, InGameFunction, PlayerStats } from "@/types/user";

type PassportInitialData = Partial<HovercardData> &
  Partial<UserWithStats> & {
    matches?: number;
    teamTag?: string | null;
    teamName?: string | null;
    stats?: Partial<PlayerStats> & { kdRatio?: number; winRate?: number };
  };

const subscribeToClient = () => () => undefined;

interface PlayerPassportHovercardProps {
  children: React.ReactNode;
  kurageId?: number | string | null;
  username?: string;
  avatarUrl?: string | null;
  initialData?: PassportInitialData;
  enabled?: boolean;
}

export function PlayerPassportHovercard({
  children,
  kurageId,
  username = "Jogador",
  avatarUrl,
  initialData,
  enabled = true,
}: PlayerPassportHovercardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const mounted = useSyncExternalStore(subscribeToClient, () => true, () => false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    vertical: "top" | "bottom";
    horizontal: "center" | "left" | "right";
  }>({
    top: 0,
    left: 0,
    vertical: "top",
    horizontal: "center",
  });

  const openTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  // ── Smart Viewport & Header Boundary Calculation via Fixed Screen Coordinates ──
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const HEADER_HEIGHT = 76;
    const CARD_HEIGHT = 310;
    const CARD_WIDTH = 230;

    // Available space above trigger (below header)
    const spaceTop = rect.top - HEADER_HEIGHT;
    // Available space below trigger
    const spaceBottom = window.innerHeight - rect.bottom;

    // Decide vertical orientation: flip downwards if top is tight or hits header
    const vertical = (spaceTop < CARD_HEIGHT && spaceBottom >= 100) || spaceTop < 10 ? "bottom" : "top";

    // Target Y position (fixed on screen)
    const top = vertical === "top" ? rect.top - 8 : rect.bottom + 8;

    // Decide horizontal alignment
    const centerX = rect.left + rect.width / 2;
    let horizontal: "center" | "left" | "right" = "center";
    let left = centerX;

    if (centerX - CARD_WIDTH / 2 < 16) {
      horizontal = "left";
      left = Math.max(16, rect.left);
    } else if (centerX + CARD_WIDTH / 2 > window.innerWidth - 16) {
      horizontal = "right";
      left = Math.min(window.innerWidth - 16 - CARD_WIDTH, rect.right - CARD_WIDTH);
    }

    setCoords({ top, left, vertical, horizontal });
  }, []);

  // Intentional Hover Delay to prevent unnecessary API fetches on rapid mouse movements
  const handleMouseEnter = () => {
    if (!enabled || (!kurageId && !username)) return;
    updatePosition();
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    openTimeoutRef.current = setTimeout(() => {
      updatePosition();
      setIsOpen(true);
    }, 180);
  };

  const handleMouseLeave = () => {
    if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  // Close or recalculate on global scroll/resize to keep UI aligned
  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener("scroll", handleScrollOrResize, { passive: true });
    window.addEventListener("resize", handleScrollOrResize, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScrollOrResize);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    return () => {
      if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  // Track mouse coordinates over card for subtle 3D tilt reaction
  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x, y });
  };

  // ── High Performance Cache via TanStack Query ──
  const numericKurageId = typeof kurageId === "number" ? kurageId : (typeof kurageId === "string" && /^\d+$/.test(kurageId) ? Number(kurageId) : undefined);

  const hovercardUsername = username.trim();
  const canFetchHovercard = Boolean(numericKurageId || (hovercardUsername && hovercardUsername !== "Jogador"));

  const { data: remoteData } = useQuery<HovercardData | null>({
    queryKey: ["playerHovercard", numericKurageId ?? hovercardUsername],
    queryFn: async () => {
      try {
        if (numericKurageId) {
          return await api.get<HovercardData>(`/users/${numericKurageId}/hovercard`);
        }
        return await api.get<HovercardData>("/users/hovercard", {
          params: { username: hovercardUsername },
        });
      } catch {
        // Keep the compact card available when this optional public lookup fails.
        // Do not manufacture profile data locally.
      }
      return null;
    },
    enabled: isOpen && canFetchHovercard,
    staleTime: 1000 * 60 * 5, // 5 minutes fresh cache
    gcTime: 1000 * 60 * 30, // 30 minutes in memory
  });

  // Consolidated real data resolution
  const resolvedKurageId = numericKurageId || remoteData?.kurageId || initialData?.kurageId || null;
  const matchesPlayed = remoteData?.matchesPlayed ?? initialData?.stats?.matchesPlayed ?? initialData?.matches ?? 0;
  const isUncalibrated = matchesPlayed === 0;

  const resolvedUsername = remoteData?.username || initialData?.username || username;
  const resolvedAvatar = remoteData?.avatarUrl !== undefined ? remoteData.avatarUrl : (initialData?.avatarUrl !== undefined ? initialData.avatarUrl : avatarUrl);
  const resolvedCountry = remoteData?.country || initialData?.country || null;
  const resolvedLevel = remoteData?.kurageLevel ?? initialData?.stats?.kurageLevel ?? initialData?.kurageLevel ?? null;
  const resolvedElo = remoteData?.kurageElo ?? initialData?.stats?.kurageElo ?? initialData?.kurageElo ?? null;
  const resolvedRole = (remoteData?.primaryFunction || initialData?.primaryFunction || null) as InGameFunction | null;
  const resolvedTeamTag = remoteData?.teamTag || initialData?.teamTag || null;
  const resolvedTeamName = remoteData?.teamName || initialData?.teamName || null;
  const resolvedIsPro = remoteData?.isVerifiedPro ?? initialData?.isVerifiedPro ?? false;
  const resolvedSubscriptionTier = remoteData?.subscriptionTier ?? initialData?.subscriptionTier ?? "FREE";

  // Real statistics formatting without mock defaults
  let displayRating = "-";
  if (!isUncalibrated) {
    const rawRating = remoteData?.hltvRating ?? initialData?.stats?.hltvRating;
    if (rawRating !== null && rawRating !== undefined && rawRating > 0) {
      displayRating = Number(rawRating).toFixed(2);
    }
  }

  let displayKd = "-";
  if (!isUncalibrated) {
    const rawKd = remoteData?.kdRatio ?? initialData?.stats?.kdRatio;
    if (rawKd !== null && rawKd !== undefined) {
      displayKd = Number(rawKd).toFixed(2);
    } else if (initialData?.stats && (initialData.stats.deaths ?? 0) > 0) {
      displayKd = ((initialData.stats.kills ?? 0) / (initialData.stats.deaths ?? 1)).toFixed(2);
    } else if ((initialData?.stats?.kills ?? 0) > 0) {
      displayKd = `${initialData?.stats?.kills}.00`;
    }
  }

  let displayWinRate = "-";
  if (!isUncalibrated) {
    const rawWr = remoteData?.winRate ?? initialData?.stats?.winRate;
    if (rawWr !== null && rawWr !== undefined) {
      displayWinRate = `${rawWr}%`;
    } else if (initialData?.stats && matchesPlayed > 0) {
      displayWinRate = `${Math.round(((initialData.stats.matchesWon ?? 0) / matchesPlayed) * 100)}%`;
    }
  }

  if (!enabled) {
    return <>{children}</>;
  }

  const initialY = coords.vertical === "top" ? 10 : -10;
  const initialRotateX = coords.vertical === "top" ? 8 : -8;
  const baseRotateX = coords.vertical === "top" ? -2 : 2;

  // Transform offset according to horizontal alignment
  const transformOrigin = coords.vertical === "top" ? "bottom center" : "top center";
  const translateCSS =
    coords.horizontal === "center"
      ? coords.vertical === "top"
        ? "translate(-50%, -100%)"
        : "translate(-50%, 0)"
      : coords.vertical === "top"
      ? "translate(0, -100%)"
      : "translate(0, 0)";

  const profileHref = resolvedKurageId ? `/player/${resolvedKurageId}` : `/player/${encodeURIComponent(resolvedUsername)}`;

  const portalContent = mounted && (
    <AnimatePresence>
      {isOpen && (
        <div
          style={{
            position: "fixed",
            top: coords.top,
            left: coords.left,
            transform: translateCSS,
            transformOrigin,
            zIndex: 999999,
          }}
          className="pointer-events-auto [perspective:1200px]"
          onMouseEnter={() => {
            if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
            setIsHovered(true);
          }}
          onMouseLeave={() => {
            setIsHovered(false);
            handleMouseLeave();
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: initialY, scale: 0.94, rotateX: initialRotateX, rotateY: -3 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              rotateX: isHovered ? mousePos.y * -12 : baseRotateX,
              rotateY: isHovered ? mousePos.x * 12 : 2,
            }}
            exit={{ opacity: 0, y: initialY > 0 ? 6 : -6, scale: 0.95, rotateX: initialRotateX > 0 ? 4 : -4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onMouseMove={handleCardMouseMove}
            style={{ transformStyle: "preserve-3d" }}
            className="w-[230px] rounded-[12px] bg-[#07080a]/98 backdrop-blur-2xl border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.95),0_0_25px_rgba(var(--kurage-accent-rgb),0.06)] overflow-hidden select-none flex flex-col items-center pt-4 pb-3 text-center"
          >
            {/* ── 1. BIOLUMINESCENT ATMOSPHERIC AURA ── */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[12px]">
              <div
                className="absolute top-2 left-1/2 -translate-x-1/2 w-36 h-36 opacity-25 blur-2xl pointer-events-none"
                style={{
                  background: "radial-gradient(circle, var(--kurage-accent) 0%, #92bce3 45%, transparent 75%)",
                }}
              />
              <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--kurage-accent)]/40 to-transparent" />
            </div>

            {/* ── 2. PASSPORT DISCREET ID ── */}
            <div className="relative z-10 w-full px-3.5 mb-1.5 flex items-center justify-between text-[9px] font-mono text-mute/70">
              <span className="uppercase tracking-widest text-[var(--kurage-accent)]/80 font-semibold text-[8px]">
                Passaporte
              </span>
              {resolvedKurageId ? (
                <span>#{resolvedKurageId}</span>
              ) : (
                <span className="text-stone-500">Convidado</span>
              )}
            </div>

            {/* ── 3. CENTRAL HERO AVATAR ── */}
            <div className="relative z-10 my-1 flex items-center justify-center">
              <div className="relative">
                <Avatar
                  src={resolvedAvatar}
                  username={resolvedUsername}
                  size="xl"
                  isVerifiedPro={false}
                  enableHovercard={false}
                  className="w-[66px] h-[66px] border-none bg-transparent shadow-none"
                />

                {/* Verified Pro Badge */}
                {resolvedIsPro && (
                  <div
                    className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full bg-[#07080a] border border-[#facc15]/40 flex items-center justify-center text-[#facc15] shadow-md"
                    title="Profissional Verificado"
                  >
                    <PiShieldCheck className="w-3 h-3" />
                  </div>
                )}
              </div>
            </div>

            {/* ── 4. IDENTITY CORE: NAME & BADGES ── */}
            <div className="relative z-10 mt-1.5 px-3 flex flex-col items-center">
              <span className="font-display text-[18px] font-bold text-white tracking-tight truncate max-w-[200px] leading-tight">
                {resolvedUsername}
              </span>
              {resolvedSubscriptionTier === "MARE" && (
                <VerifiedProBadge subscriptionTier="MARE" size="sm" className="mt-2" />
              )}

              {/* Badges: Country, Role, Level, Team */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
                {resolvedCountry && <CountryFlag country={resolvedCountry} expandOnHover={true} />}

                {resolvedRole && (
                  <RoleIcon role={resolvedRole} size={14} expandOnHover={true} />
                )}

                {resolvedLevel !== null && resolvedLevel > 0 && (
                  <KurageLevelIcon level={resolvedLevel} expandOnHover={true} />
                )}

                {resolvedTeamTag && (
                  <TeamLogo
                    teamTag={resolvedTeamTag}
                    teamName={resolvedTeamName}
                    size={14}
                    expandOnHover={true}
                    isLink={false}
                  />
                )}
              </div>
            </div>

            {/* ── 5. TELEMETRY STRIP (Real stats / Calibrating feedback) ── */}
            <div className="relative z-10 w-[206px] mt-3.5 py-1.5 px-1 rounded-[6px] bg-white/[0.02] border border-white/[0.06] grid grid-cols-4 gap-1 text-center">
              <div className="flex flex-col">
                <span className="text-[8px] font-sans font-semibold uppercase tracking-wider text-mute">ELO</span>
                <span className="font-display text-[15px] font-bold text-[var(--kurage-accent)] leading-tight mt-0.5">
                  {!isUncalibrated && resolvedElo !== null ? resolvedElo : "—"}
                </span>
              </div>

              <div className="flex flex-col border-l border-white/[0.05]">
                <span className="text-[8px] font-sans font-semibold uppercase tracking-wider text-mute">Rating</span>
                <span className="font-mono text-[11px] font-semibold text-white leading-normal mt-0.5">
                  {displayRating}
                </span>
              </div>

              <div className="flex flex-col border-l border-white/[0.05]">
                <span className="text-[8px] font-sans font-semibold uppercase tracking-wider text-mute">K/D</span>
                <span className="font-mono text-[11px] font-semibold text-white leading-normal mt-0.5">
                  {displayKd}
                </span>
              </div>

              <div className="flex flex-col border-l border-white/[0.05]">
                <span className="text-[8px] font-sans font-semibold uppercase tracking-wider text-mute">Win %</span>
                <span className="font-mono text-[11px] font-semibold text-white leading-normal mt-0.5">
                  {displayWinRate}
                </span>
              </div>
            </div>

            {/* ── 6. PASSPORT ACTION LINK ── */}
            <div className="relative z-10 w-full px-3 mt-2 pt-2 border-t border-white/[0.05]">
              <Link
                href={profileHref}
                className="w-full py-0.5 text-center flex items-center justify-center gap-1 text-[11px] font-sans font-medium text-mute hover:text-white transition-colors group/link cursor-pointer"
              >
                <span>Ver Perfil</span>
                <PiArrowRight className="w-3 h-3 text-mute group-hover/link:text-white group-hover/link:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative inline-flex items-center justify-center"
    >
      {children}
      {mounted && createPortal(portalContent, document.body)}
    </div>
  );
}
