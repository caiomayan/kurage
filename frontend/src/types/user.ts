export type UserRole = "USER" | "ADMIN" | "OWNER";

export type SubscriptionTier = "FREE" | "PLUS" | "PRO" | "MAX";

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
  kurageElo: number;
  kurageLevel: number;
  hltvRating?: number;
  kastPercentage?: number;
  kills: number;
  deaths: number;
  assists: number;
  headshots: number;
  roundsPlayed: number;
  matchesPlayed: number;
  matchesWon: number;
  totalDamage: number;
  lastMatchAt?: string | null;
}

export interface UserWithStats extends User {
  stats?: PlayerStats;
  faceitLevel?: number | null;
  rankPosition?: number | null;
  rankDelta?: number | null;
}

const TIER_ORDER: Record<SubscriptionTier, number> = {
  FREE: 0,
  PLUS: 1,
  PRO: 2,
  MAX: 3,
};

export type SubscriptionFeature =
  | "PROFILE_VISITORS"
  | "PLUS_BADGE"
  | "ADVANCED_STATS"
  | "RANKING_FILTERS"
  | "PRO_BADGE"
  | "MAX_BADGE"
  | "SERVER_PRIORITY"
  | "PROFILE_HIGHLIGHT";

export function hasSubscriptionFeature(
  tier: SubscriptionTier | null | undefined,
  feature: SubscriptionFeature
): boolean {
  if (!tier) return false;
  const rank = TIER_ORDER[tier] ?? 0;

  switch (feature) {
    case "PROFILE_VISITORS":
    case "PLUS_BADGE":
      return rank >= TIER_ORDER.PLUS;
    case "ADVANCED_STATS":
    case "RANKING_FILTERS":
    case "PRO_BADGE":
      return rank >= TIER_ORDER.PRO;
    case "MAX_BADGE":
    case "SERVER_PRIORITY":
    case "PROFILE_HIGHLIGHT":
      return rank >= TIER_ORDER.MAX;
    default:
      return false;
  }
}
