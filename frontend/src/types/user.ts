export type UserRole = "USER" | "ADMIN" | "OWNER";

export type SubscriptionTier = "FREE" | "MARE";

export type InGameFunction =
  | "IGL"
  | "AWPER"
  | "ENTRY"
  | "SUPPORT"
  | "LURKER"
  | "CORINGA";

export type ManagementRole = "OWNER" | "ADMIN" | "MEMBER";

export type TeamRole = "PLAYER" | "SUBSTITUTE" | "COACH" | "ASSISTANT_COACH";

export interface User {
  id: string;
  kurageId: number;
  username: string;
  steamId64: string;
  avatarUrl: string | null;
  faceitUsername: string | null;
  role: UserRole;
  primaryFunction: InGameFunction;
  secondaryFunction?: InGameFunction | null;
  country?: string | null;
  subscriptionTier: SubscriptionTier;
  subscriptionExpiresAt?: string | null;
  isVerifiedPro: boolean;
  createdAt: string;
}

export interface PlayerStats {
  kurageElo: number | null;
  kurageLevel: number | null;
  hltvRating?: number;
  kastPercentage?: number;
  kills: number;
  deaths: number;
  assists: number;
  headshots: number;
  roundsPlayed: number;
  matchesPlayed: number;
  matchesWon: number;
  kdRatio?: number;
  winRate?: number;
  totalDamage: number;
  lastMatchAt?: string | null;
  calibrationMatchesCompleted?: number;
  calibrationMatchesRequired?: number;
  isCalibrated?: boolean;
}

export interface UserWithStats extends User {
  stats?: PlayerStats;
  faceitLevel?: number | null;
  rankPosition?: number | null;
  rankDelta?: number | null;
}

const TIER_ORDER: Record<SubscriptionTier, number> = {
  FREE: 0,
  MARE: 1,
};

export type SubscriptionFeature =
  | "PROFILE_VISITORS"
  | "MARE_BADGE"
  | "ADVANCED_STATS"
  | "RANKING_FILTERS"
  | "SERVER_PRIORITY"
  | "PROFILE_HIGHLIGHT"
  | "EARLY_ACCESS";

export function hasSubscriptionFeature(
  tier: SubscriptionTier | null | undefined,
  feature: SubscriptionFeature
): boolean {
  if (!tier) return false;
  const rank = TIER_ORDER[tier as SubscriptionTier] ?? 0;
  if (rank < TIER_ORDER.MARE) return false;

  switch (feature) {
    case "PROFILE_VISITORS":
    case "MARE_BADGE":
    case "ADVANCED_STATS":
    case "RANKING_FILTERS":
    case "SERVER_PRIORITY":
    case "PROFILE_HIGHLIGHT":
    case "EARLY_ACCESS":
      return true;
    default:
      return false;
  }
}
