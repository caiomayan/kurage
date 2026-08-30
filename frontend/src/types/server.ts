export type ServerGameMode = "COMPETITIVO" | "RETAKE" | "DEATHMATCH" | "PRACTICE";
export type GameServerKind = "FIXED" | "EPHEMERAL";

export type RoundWinReason = "elimination" | "bomb_exploded" | "bomb_defused" | "time_out";

export type RoundResult = {
  roundNumber: number;
  winnerSide: "CT" | "TR";
  winReason: RoundWinReason;
};

export interface SpectatorInfo {
  kurageId: number;
  username: string;
  avatarUrl: string;
  isVerifiedPro: boolean;
  ping: number;
}

export interface CoachInfo {
  kurageId: number;
  username: string;
  avatarUrl: string;
  isVerifiedPro: boolean;
  ping: number;
}

export interface PlayerLiveStats {
  kurageId?: number;
  steamId64?: string;
  isKurageMember: boolean;
  username: string;
  avatarUrl: string;
  isVerifiedPro: boolean;
  kurageLevel?: number;
  faceitLevel?: number;
  role?: string;
  kills: number;
  deaths: number;
  assists?: number;
  hsPercentage?: number;
  kdRatio?: number;
  killStreak?: number;
  utilityCount?: number;
  sessionDurationMinutes?: number;
  ping: number;
  isAlive?: boolean;
  isReady?: boolean; // Warmup readiness indicator
}

export interface WarmupState {
  timeRemaining: string; // e.g. "01:24"
  readyCount: number;
  totalRequired: number;
  isKnifeRound?: boolean;
}

export interface LiveServerState {
  ip: string;
  map: string;
  mode: ServerGameMode;
  tickrate?: number;
  status: "live" | "offline" | "warmup";
  maxPlayers: number;
  
  // Warmup Telemetry
  warmupInfo?: WarmupState;

  // Spectators / Observers
  spectators?: SpectatorInfo[];
  
  // Mode: COMPETITIVO & RETAKE
  ctScore?: number;
  trScore?: number;
  halfScoreCt?: number;
  halfScoreTr?: number;
  secondHalfScoreCt?: number;
  secondHalfScoreTr?: number;
  isSecondHalf?: boolean;
  ctTeamTag?: string;
  ctTeamName?: string;
  ctTeamLogoUrl?: string | null;
  trTeamTag?: string;
  trTeamName?: string;
  trTeamLogoUrl?: string | null;
  ctPlayers?: PlayerLiveStats[];
  trPlayers?: PlayerLiveStats[];
  ctCoach?: CoachInfo;
  trCoach?: CoachInfo;
  roundHistory?: RoundResult[];
  activeBombsite?: "A" | "B"; // Retake specific

  // Mode: DEATHMATCH
  timeRemaining?: string; // e.g. "08:45"
  totalKills?: number;
  killLeader?: {
    username: string;
    kills: number;
  };
  ffaPlayers?: PlayerLiveStats[];

  // Mode: PRACTICE
  practiceFeatures?: string[];
  practicePlayers?: PlayerLiveStats[];
}

export interface GameServer {
  id: string;
  name: string;
  hostname: string;
  port: number;
  gameMode: ServerGameMode | string;
  serverKind: GameServerKind;
  currentMap: string;
  currentPlayers: number;
  maxPlayers: number;
  ctScore: number;
  trScore: number;
  isOnline: boolean;
  lastHeartbeat?: string | null;
}
