import { InGameFunction } from "./user";

export interface RankingHistoryPoint {
  date: string;
  position: number;
  kurageElo: number;
}

export interface PageResponse<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  isLast: boolean;
  lastUpdatedAt?: string | null;
  nextUpdateAt?: string | null;
}

export interface LeaderboardPlayer {
  kurageId: number;
  steamId64: string;
  username: string;
  avatarUrl: string | null;
  country: string | null;
  kurageLevel: number | null;
  kurageElo: number | null;
  kdRatio: number | null;
  winRate: number | null;
  matches: number | null;
  wins: number | null;
  position: number | null;
  positionDelta: number | null;
  primaryFunction: InGameFunction | string | null;
  teamTag: string | null;
  isVerifiedPro: boolean;
}

export interface TeamLeaderboardItem {
  teamId: string;
  name: string;
  tag: string;
  logoUrl: string | null;
  country: string | null;
  teamElo: number;
  position: number;
  positionDelta: number | null;
  memberCount: number;
}

export interface PlayerRankingContext {
  player: LeaderboardPlayer;
  currentPosition: number | null;
  deltaYesterday: number | null;
  deltaWeek: number | null;
  adjacentPlayers: LeaderboardPlayer[];
  nextPlayerToPass: LeaderboardPlayer | null;
  history: RankingHistoryPoint[];
  mapStats?: Array<{ mapName: string; winRate: number; matches: number }>;
}
