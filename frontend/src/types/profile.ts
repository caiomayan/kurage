import type { User } from "./user";

export type ProfileTab = "overview" | "inventory" | "matches";

export interface ProfileVisitor {
  visitor: User;
  visitedAt: string;
}

export interface ProfileVisitorItem {
  userId: string;
  kurageId: number;
  username: string;
  avatarUrl: string | null;
  country: string | null;
  kurageLevel: number;
  kurageElo: number;
  isVerifiedPro: boolean;
  visitedAt: string;
}

export function formatRelativeTime(dateInput: string | Date | number | null | undefined): string {
  if (!dateInput) return "recentemente";
  const date = new Date(dateInput);
  const time = date.getTime();
  if (Number.isNaN(time)) return "recentemente";

  const diffMs = Date.now() - time;
  if (diffMs < 0) return "agora há pouco";

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "agora há pouco";

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `há ${diffMin} min`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `há ${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "ontem";
  if (diffDays < 7) return `há ${diffDays} dias`;

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `há ${diffWeeks} sem`;

  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export const FUNCTION_LABELS: Record<string, string> = {
  IGL: "Capitão (IGL)",
  AWPER: "Sniper (AWP)",
  ENTRY: "Entry Fragger",
  SUPPORT: "Suporte",
  LURKER: "Lurker",
  CORINGA: "Coringa",
};

export const FUNCTION_SHORT_LABELS: Record<string, string> = {
  IGL: "IGL",
  AWPER: "AWP",
  ENTRY: "Entry",
  SUPPORT: "Support",
  LURKER: "Lurk",
  CORINGA: "Coringa",
};

export interface FaceitProfile {
  username: string | null;
  level: number | null;
  elo: number | null;
  kdRatio: number | null;
  winRate: number | null;
  matches: number | null;
  faceitUrl: string | null;
  recentResults: string[] | null;
  cached: boolean;
}

export interface CsItem {
  id: string;
  name: string;
  icon_url?: string;
  rarity?: {
    name: string;
    color: string;
  };
  float_value?: number;
  stattrak?: boolean;
}
