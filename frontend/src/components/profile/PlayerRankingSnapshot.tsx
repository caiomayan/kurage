"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { PiArrowUp, PiArrowDown, PiMinus, PiTrophy } from "react-icons/pi";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";

export interface SnapshotPlayerRow {
  kurageId: string | number;
  username: string;
  avatarUrl: string | null;
  country?: string | null;
  kurageElo?: number;
  position: number;
  positionDelta?: number;
  isVerifiedPro?: boolean;
}

interface PlayerRankingSnapshotProps {
  currentRank: number;
  player: {
    kurageId: string | number;
    username: string;
    avatarUrl: string | null;
    country?: string | null;
    kurageElo?: number;
    isVerifiedPro?: boolean;
  };
  previousPlayer?: SnapshotPlayerRow | null;
  nextPlayer?: SnapshotPlayerRow | null;
  rankDelta?: number | null;
}

function PositionDelta({ delta }: { delta?: number | null }) {
  if (delta === undefined || delta === null || delta === 0) {
    return <PiMinus className="w-2.5 h-2.5 text-mute/50" />;
  }
  if (delta > 0) {
    return (
      <span className="flex items-center text-[9px] font-mono text-accent-green">
        <PiArrowUp className="w-2.5 h-2.5" />
      </span>
    );
  }
  return (
    <span className="flex items-center text-[9px] font-mono text-accent-red">
      <PiArrowDown className="w-2.5 h-2.5" />
    </span>
  );
}

/**
 * PlayerRankingSnapshot (Subtle Ranking Icon with Expandable Ladder on Hover)
 * Resting state: A discreet, semi-transparent ranking icon at the top-right.
 * Hover state: Expands smoothly into the vertical live snapshot ladder.
 */
export function PlayerRankingSnapshot({
  currentRank,
  player,
  previousPlayer = null,
  nextPlayer = null,
  rankDelta = null,
}: PlayerRankingSnapshotProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative flex flex-col items-end select-none text-[12px] font-sans"
    >
      {/* 1. Subtle Resting Ranking Trigger (Semi-transparent, discreet) */}
      <div
        className={cn(
          "flex items-center gap-1.5 py-1 px-1.5 rounded-md transition-all duration-300 cursor-pointer",
          isHovered
            ? "opacity-100 text-[var(--kurage-accent)]"
            : "opacity-30 hover:opacity-80 text-mute hover:text-ink"
        )}
        title={`Classificação: #${currentRank}`}
      >
        <PiTrophy className="w-4 h-4" />
        <span className="font-mono text-[11px] font-semibold tracking-tight">#{currentRank}</span>
      </div>

      {/* 2. Expandable Snapshot Ladder on Hover */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-full mt-1.5 z-50 flex flex-col gap-1 select-none text-[12px] font-sans text-left min-w-[160px] p-2 rounded-lg bg-black/10 backdrop-blur-sm border border-white/[0.04]"
          >
            {/* PREVIOUS PLAYER (#N-1) */}
            {previousPlayer && (
              <Link
                href={`/player/${previousPlayer.kurageId}`}
                className="group/prev flex items-center gap-2 py-0.5 transition-colors hover:text-ink"
                title={`#${previousPlayer.position} ${previousPlayer.username}`}
              >
                <div className="flex items-center gap-0.5 w-6 text-mute">
                  <span className="font-mono text-[11px] font-medium">#{previousPlayer.position}</span>
                  <PositionDelta delta={previousPlayer.positionDelta} />
                </div>

                <Avatar
                  src={previousPlayer.avatarUrl}
                  username={previousPlayer.username}
                  kurageId={previousPlayer.kurageId}
                  size="xs"
                  isVerifiedPro={previousPlayer.isVerifiedPro}
                  className="w-3.5 h-3.5"
                />

                <span className="text-mute group-hover/prev:text-ink font-medium text-[12px] truncate max-w-[95px]">
                  {previousPlayer.username}
                </span>
              </Link>
            )}

            {/* CURRENT PLAYER (#N - VOCÊ COM MICRO-AVATAR E NOME 'Você') */}
            <div className="flex items-center gap-2 py-0.5 px-1.5 rounded-md bg-white/[0.04]">
              <div className="flex items-center gap-0.5 w-6 text-[var(--kurage-accent)]">
                <span className="font-mono text-[12px] font-bold">#{currentRank}</span>
                <PositionDelta delta={rankDelta} />
              </div>

              <Avatar
                src={player.avatarUrl}
                username={player.username}
                kurageId={player.kurageId}
                size="xs"
                isVerifiedPro={player.isVerifiedPro}
                className="w-3.5 h-3.5"
              />

              <span className="text-ink font-semibold text-[13px] tracking-wide truncate max-w-[95px]">
                Você
              </span>
            </div>

            {/* NEXT PLAYER (#N+1) */}
            {nextPlayer && (
              <Link
                href={`/player/${nextPlayer.kurageId}`}
                className="group/next flex items-center gap-2 py-0.5 transition-colors hover:text-ink"
                title={`#${nextPlayer.position} ${nextPlayer.username}`}
              >
                <div className="flex items-center gap-0.5 w-6 text-mute">
                  <span className="font-mono text-[11px] font-medium">#{nextPlayer.position}</span>
                  <PositionDelta delta={nextPlayer.positionDelta} />
                </div>

                <Avatar
                  src={nextPlayer.avatarUrl}
                  username={nextPlayer.username}
                  kurageId={nextPlayer.kurageId}
                  size="xs"
                  isVerifiedPro={nextPlayer.isVerifiedPro}
                  className="w-3.5 h-3.5"
                />

                <span className="text-mute group-hover/next:text-ink font-medium text-[12px] truncate max-w-[95px]">
                  {nextPlayer.username}
                </span>
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
