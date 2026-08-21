"use client";

import React, { useState, useEffect, useRef, useId } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  PiMagnifyingGlass,
  PiUsers,
  PiShield,
  PiArrowRight,
  PiSpinnerGap,
  PiX,
  PiSparkle,
  PiCrosshair,
  PiTrophy,
  PiWaves,
} from "react-icons/pi";
import { SiFaceit } from "react-icons/si";
import { api } from "@/lib/api";
import { searchEvents } from "@/lib/search-store";
import { QuickSearchResponse, SearchPlayerResult, SearchTeamResult } from "@/types/search";
import { Avatar } from "@/components/ui/Avatar";
import { KurageLevelIcon } from "@/components/ui/KurageLevelIcon";
import { VerifiedProBadge } from "@/components/ui/VerifiedProBadge";
import { RoleIcon } from "@/components/ui/RoleIcon";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";

export function HeaderSearch({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const searchInputId = useId();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  // Global focus shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    return searchEvents.subscribe(() => {
      onOpenChange(true);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    });
  }, [onOpenChange]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onOpenChange(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onOpenChange]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen) {
        onOpenChange(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onOpenChange]);

  // Debounce logic
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setSelectedIndex(0);
    }, 180);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isLoading, isFetching } = useQuery<QuickSearchResponse>({
    queryKey: ["quickSearch", debouncedQuery],
    queryFn: () =>
      api.get<QuickSearchResponse>("/search", {
        params: { q: debouncedQuery, limit: 6 },
      }),
    enabled: isOpen && debouncedQuery.length > 0,
    staleTime: 1000 * 30,
    placeholderData: keepPreviousData,
  });

  const handleSelectPlayer = (player: SearchPlayerResult) => {
    onOpenChange(false);
    setQuery("");
    setDebouncedQuery("");
    inputRef.current?.blur();
    router.push(`/player/${player.kurageId}/${encodeURIComponent(player.username.toLowerCase())}`);
  };

  const handleSelectTeam = (team: SearchTeamResult) => {
    onOpenChange(false);
    setQuery("");
    setDebouncedQuery("");
    inputRef.current?.blur();
    router.push(`/team/${team.tag.toLowerCase()}`);
  };

  // Deduplication & categorization
  const topResult = data?.topResult;
  const filteredPlayers = (data?.players || []).filter((p) => {
    if (topResult?.type === "PLAYER" && topResult.player) {
      return p.kurageId !== topResult.player.kurageId;
    }
    return true;
  });
  const filteredTeams = (data?.teams || []).filter((t) => {
    if (topResult?.type === "TEAM" && topResult.team) {
      return t.id !== topResult.team.id;
    }
    return true;
  });

  // Flat list for keyboard navigation
  const flatItems: Array<{ type: "player" | "team"; data: any }> = [];
  if (data) {
    if (topResult) {
      if (topResult.type === "PLAYER" && topResult.player) {
        flatItems.push({ type: "player", data: topResult.player });
      } else if (topResult.type === "TEAM" && topResult.team) {
        flatItems.push({ type: "team", data: topResult.team });
      }
    }
    filteredPlayers.forEach((p) => flatItems.push({ type: "player", data: p }));
    filteredTeams.forEach((t) => flatItems.push({ type: "team", data: t }));
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < flatItems.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flatItems.length > 0 && flatItems[selectedIndex]) {
        const item = flatItems[selectedIndex];
        if (item.type === "player") handleSelectPlayer(item.data);
        if (item.type === "team") handleSelectTeam(item.data);
      }
    }
  };

  return (
    <>
      {/* ── 1. SPOTLIGHT BACKDROP OVERLAY ── */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[39] bg-black/70 backdrop-blur-sm"
                aria-hidden="true"
              />
            )}
          </AnimatePresence>,
          document.body
        )}

      <div className="relative z-50 flex items-center justify-end" ref={containerRef}>
        {/* ── 2. EXPANDABLE SEARCH INPUT (Restoring classic spring expansion) ── */}
        <motion.div
          initial={false}
          animate={{ width: isOpen ? 360 : 180 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className={cn(
            "relative flex items-center h-8 rounded-lg border transition-colors",
            isOpen
              ? "border-[var(--hairline-strong)] bg-surface-deep shadow-inner"
              : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"
          )}
        >
          <PiMagnifyingGlass
            className={cn(
              "absolute left-2.5 h-3.5 w-3.5 transition-colors",
              isOpen ? "text-[#a9c8c0]" : "text-charcoal"
            )}
            aria-hidden="true"
          />

          <input
            id={searchInputId}
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!isOpen) onOpenChange(true);
            }}
            onFocus={() => onOpenChange(true)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar jogador ou time..."
            className={cn(
              "h-full w-full bg-transparent pl-8 pr-10 text-[13px] text-ink placeholder:text-white/50 focus:outline-none",
              !isOpen && "cursor-pointer"
            )}
            autoComplete="off"
            spellCheck="false"
          />

          <div className="absolute right-2 flex items-center gap-1">
            {isFetching ? (
              <PiSpinnerGap className="h-3.5 w-3.5 animate-spin text-[#a9c8c0]" />
            ) : query && isOpen ? (
              <button
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="text-mute hover:text-ink transition-colors cursor-pointer"
                title="Limpar busca"
              >
                <PiX className="h-3.5 w-3.5" />
              </button>
            ) : !isOpen ? (
              <kbd className="hidden font-sans font-semibold text-[10px] text-mute sm:inline-block pointer-events-none">
                ⌘K
              </kbd>
            ) : null}
          </div>
        </motion.div>

        {/* ── 3. BESPOKE SEARCH RESULTS PANEL (Brand New Architecture) ── */}
        <AnimatePresence>
          {isOpen && query.trim().length > 0 && (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="absolute top-11 right-0 w-[460px] max-h-[75vh] overflow-hidden rounded-[12px] bg-[#07090b]/98 backdrop-blur-2xl border border-white/[0.08] shadow-[0_30px_90px_rgba(0,0,0,0.95)] z-50 flex flex-col select-none"
            >
              {/* Atmospheric Depth Lighting */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[12px]">
                <div
                  className="absolute -top-16 left-1/2 -translate-x-1/2 w-80 h-40 opacity-20 blur-3xl pointer-events-none"
                  style={{
                    background: "radial-gradient(circle, #a9c8c0 0%, #92bce3 35%, transparent 75%)",
                  }}
                />
                <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#a9c8c0]/50 to-transparent" />
              </div>

              {/* Scrollable Results Stream */}
              <div className="relative z-10 p-3 overflow-y-auto max-h-[calc(75vh-44px)] flex flex-col gap-3.5 scrollbar-thin">
                {/* 1. Loading Skeleton */}
                {isLoading && (
                  <div className="flex flex-col gap-2 p-1 animate-pulse">
                    <div className="h-20 rounded-[10px] bg-white/[0.03] border border-white/[0.06]" />
                    <div className="h-12 rounded-[8px] bg-white/[0.02] border border-white/[0.04]" />
                    <div className="h-12 rounded-[8px] bg-white/[0.02] border border-white/[0.04]" />
                  </div>
                )}

                {/* 2. Empty State */}
                {!isLoading && data && flatItems.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-11 h-11 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-3 text-mute">
                      <PiWaves className="h-5 w-5 text-[#a9c8c0]/60 animate-pulse" />
                    </div>
                    <p className="font-display text-[17px] font-bold text-ink">Nenhum sinal encontrado</p>
                    <p className="mt-1 text-[12px] font-sans text-mute max-w-xs">
                      Não encontramos jogadores ou equipes correspondentes a &quot;{query}&quot;.
                    </p>
                  </div>
                )}

                {/* 3. Results Stream */}
                {data && flatItems.length > 0 && (
                  <div className="flex flex-col gap-3">
                    {/* ── 3A. SPOTLIGHT PRIME MATCH ── */}
                    {topResult && (
                      <div>
                        <div className="mb-1.5 px-1.5 text-[9px] font-mono font-semibold uppercase tracking-widest text-[#a9c8c0] flex items-center gap-1.5">
                          <PiSparkle className="h-3 w-3" />
                          <span>Destaque Principal</span>
                        </div>

                        {topResult.type === "PLAYER" && topResult.player && (
                          <div
                            onClick={() => handleSelectPlayer(topResult.player!)}
                            onMouseEnter={() => setSelectedIndex(0)}
                            className={cn(
                              "group relative flex cursor-pointer items-center justify-between rounded-[10px] p-3.5 border transition-all duration-200 overflow-hidden",
                              selectedIndex === 0
                                ? "border-[#a9c8c0]/40 bg-white/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]"
                                : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.14] hover:bg-white/[0.04]"
                            )}
                          >
                            <div className="flex items-center gap-3.5 relative z-10">
                              <Avatar
                                src={topResult.player.avatarUrl}
                                username={topResult.player.username}
                                size="lg"
                                isVerifiedPro={topResult.player.isVerifiedPro}
                              />
                              <div className="flex flex-col text-left">
                                <div className="flex items-center gap-2">
                                  <span className="font-display text-[19px] font-bold text-white leading-none tracking-tight">
                                    {topResult.player.username}
                                  </span>
                                  {topResult.player.isVerifiedPro && (
                                    <VerifiedProBadge isVerifiedPro={true} size="sm" />
                                  )}
                                  {topResult.player.teamTag && (
                                    <span className="text-[10px] font-mono font-bold tracking-wider text-[#92bce3] bg-[#92bce3]/10 px-1.5 py-0.5 rounded border border-[#92bce3]/20">
                                      [{topResult.player.teamTag}]
                                    </span>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] font-sans text-mute">
                                  <span className="flex items-center gap-1 text-[#a9c8c0] font-mono font-bold">
                                    <Logo size={11} className="text-[#a9c8c0]" /> {topResult.player.kurageElo} ELO
                                  </span>
                                  {topResult.player.faceitElo != null && (
                                    <span className="flex items-center gap-1 text-stone-300 font-mono">
                                      <SiFaceit className="text-[#ff5500] text-[11px]" /> {topResult.player.faceitElo}
                                    </span>
                                  )}
                                  {topResult.player.kdRatio != null && (
                                    <span className="flex items-center gap-1 text-stone-400 font-mono">
                                      <PiCrosshair className="w-3 h-3" /> {topResult.player.kdRatio.toFixed(2)} K/D
                                    </span>
                                  )}
                                  {topResult.player.primaryFunction && (
                                    <span className="flex items-center gap-1 text-stone-400">
                                      <RoleIcon role={topResult.player.primaryFunction} size={12} />
                                      {topResult.player.primaryFunction}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 relative z-10">
                              <KurageLevelIcon level={topResult.player.kurageLevel} className="w-6 h-6" />
                              <PiArrowRight className="w-4 h-4 text-mute/50 group-hover:text-white group-hover:translate-x-1 transition-transform duration-200" />
                            </div>
                          </div>
                        )}

                        {topResult.type === "TEAM" && topResult.team && (
                          <div
                            onClick={() => handleSelectTeam(topResult.team!)}
                            onMouseEnter={() => setSelectedIndex(0)}
                            className={cn(
                              "group relative flex cursor-pointer items-center justify-between rounded-[10px] p-3.5 border transition-all duration-200 overflow-hidden",
                              selectedIndex === 0
                                ? "border-[#a9c8c0]/40 bg-white/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]"
                                : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.14] hover:bg-white/[0.04]"
                            )}
                          >
                            <div className="flex items-center gap-3.5 relative z-10">
                              <TeamLogo
                                teamTag={topResult.team.tag}
                                logoUrl={topResult.team.logoUrl}
                                size={38}
                                isLink={false}
                              />
                              <div className="flex flex-col text-left">
                                <div className="flex items-center gap-2">
                                  <span className="font-display text-[19px] font-bold text-white leading-none tracking-tight">
                                    {topResult.team.name}
                                  </span>
                                  <span className="text-[10px] font-mono font-bold text-[#a9c8c0] bg-[#a9c8c0]/10 px-1.5 py-0.5 rounded border border-[#a9c8c0]/20">
                                    [{topResult.team.tag}]
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 mt-1.5 text-[11px] font-sans text-mute">
                                  <span className="flex items-center gap-1">
                                    <PiUsers className="w-3.5 h-3.5" /> {topResult.team.memberCount} membros
                                  </span>
                                  {topResult.team.teamElo != null && (
                                    <span className="flex items-center gap-1 font-mono text-stone-300">
                                      <PiTrophy className="w-3.5 h-3.5 text-[#e5c158]" /> {topResult.team.teamElo} ELO Médio
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <PiArrowRight className="w-4 h-4 text-mute/50 group-hover:text-white group-hover:translate-x-1 transition-transform duration-200 relative z-10" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── 3B. PLAYERS LIST ── */}
                    {filteredPlayers.length > 0 && (
                      <div>
                        <div className="mb-1 px-1.5 text-[9px] font-mono font-semibold uppercase tracking-widest text-mute flex items-center gap-1.5">
                          <PiUsers className="h-3 w-3" />
                          <span>Jogadores ({filteredPlayers.length})</span>
                        </div>

                        <div className="flex flex-col gap-1">
                          {filteredPlayers.map((player, idx) => {
                            const globalIdx = (topResult ? 1 : 0) + idx;
                            const isSelected = selectedIndex === globalIdx;
                            return (
                              <div
                                key={`player-${player.kurageId}`}
                                onClick={() => handleSelectPlayer(player)}
                                onMouseEnter={() => setSelectedIndex(globalIdx)}
                                className={cn(
                                  "group flex cursor-pointer items-center justify-between rounded-[8px] px-3 py-2.5 transition-all duration-150 border border-transparent",
                                  isSelected
                                    ? "bg-white/[0.06] border-white/[0.08] text-white"
                                    : "hover:bg-white/[0.03] text-stone-300"
                                )}
                              >
                                <div className="flex items-center gap-3">
                                  <Avatar
                                    src={player.avatarUrl}
                                    username={player.username}
                                    size="sm"
                                    isVerifiedPro={player.isVerifiedPro}
                                  />
                                  <div className="flex flex-col text-left">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[13px] font-sans font-medium text-white leading-none">
                                        {player.username}
                                      </span>
                                      {player.teamTag && (
                                        <span className="text-[9px] font-mono font-semibold text-[#92bce3] bg-[#92bce3]/10 px-1 py-0.2 rounded border border-[#92bce3]/20">
                                          [{player.teamTag}]
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 text-[10px] text-mute font-sans">
                                      {player.primaryFunction && (
                                        <span className="flex items-center gap-1">
                                          <RoleIcon role={player.primaryFunction} size={11} /> {player.primaryFunction}
                                        </span>
                                      )}
                                      {player.kdRatio != null && (
                                        <span className="font-mono">{player.kdRatio.toFixed(2)} K/D</span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  <span className="font-mono text-[12px] font-semibold text-[#a9c8c0] leading-none">
                                    {player.kurageElo} ELO
                                  </span>
                                  <KurageLevelIcon level={player.kurageLevel} className="w-4 h-4" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* ── 3C. TEAMS LIST ── */}
                    {filteredTeams.length > 0 && (
                      <div>
                        <div className="mb-1 px-1.5 text-[9px] font-mono font-semibold uppercase tracking-widest text-mute flex items-center gap-1.5">
                          <PiShield className="h-3 w-3" />
                          <span>Equipes ({filteredTeams.length})</span>
                        </div>

                        <div className="flex flex-col gap-1">
                          {filteredTeams.map((team, idx) => {
                            const globalIdx = (topResult ? 1 : 0) + filteredPlayers.length + idx;
                            const isSelected = selectedIndex === globalIdx;
                            return (
                              <div
                                key={`team-${team.id}`}
                                onClick={() => handleSelectTeam(team)}
                                onMouseEnter={() => setSelectedIndex(globalIdx)}
                                className={cn(
                                  "group flex cursor-pointer items-center justify-between rounded-[8px] px-3 py-2.5 transition-all duration-150 border border-transparent",
                                  isSelected
                                    ? "bg-white/[0.06] border-white/[0.08] text-white"
                                    : "hover:bg-white/[0.03] text-stone-300"
                                )}
                              >
                                <div className="flex items-center gap-3">
                                  <TeamLogo
                                    teamTag={team.tag}
                                    logoUrl={team.logoUrl}
                                    size={24}
                                    isLink={false}
                                  />
                                  <span className="text-[13px] font-sans font-medium text-white">{team.name}</span>
                                  <span className="text-[10px] font-mono text-mute">[{team.tag}]</span>
                                </div>

                                <div className="flex items-center gap-2.5 text-[11px] font-sans text-mute">
                                  <span>{team.memberCount} membros</span>
                                  <PiArrowRight className="w-3.5 h-3.5 text-mute/40 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── 4. FOOTER TELEMETRY / KEYBOARD HELPER ── */}
              <div className="relative z-10 px-4 py-2.5 border-t border-white/[0.06] bg-black/40 flex items-center justify-between text-[11px] font-sans text-mute select-none">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <kbd className="font-mono text-[9px] bg-white/[0.06] border border-white/[0.1] px-1 py-0.5 rounded">↑</kbd>
                    <kbd className="font-mono text-[9px] bg-white/[0.06] border border-white/[0.1] px-1 py-0.5 rounded">↓</kbd>
                    <span>navegar</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="font-mono text-[9px] bg-white/[0.06] border border-white/[0.1] px-1 py-0.5 rounded">↵</kbd>
                    <span>abrir</span>
                  </span>
                </div>
                <span className="flex items-center gap-1 text-[10px]">
                  <kbd className="font-mono text-[9px] bg-white/[0.06] border border-white/[0.1] px-1 py-0.5 rounded">esc</kbd>
                  <span>fechar</span>
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
