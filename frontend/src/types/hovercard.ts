import { SubscriptionTier } from "./user";

export interface HovercardData {
  userId: string;
  kurageId: number;
  username: string;
  avatarUrl: string | null;
  country: string | null;
  kurageLevel: number;
  kurageElo: number;
  primaryFunction: string | null;
  teamTag: string | null;
  teamName: string | null;
  kdRatio: number | null;
  winRate: number | null;
  matchesPlayed: number | null;
  hltvRating: number | null;
  isVerifiedPro: boolean;
  subscriptionTier: SubscriptionTier;
}
