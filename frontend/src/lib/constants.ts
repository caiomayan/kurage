/**
 * Kurage System Constants
 * Centralized configuration, navigation links, and domain definitions.
 */

export const APP_NAME = "Kurage";
export const APP_TAGLINE = "O competitivo em um só lugar";
export const APP_DOMAIN = "https://kurage.caiomayan.com";
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export const REDIRECT_STORAGE_KEY = "kurage_auth_redirect_to";

export interface NavLink {
  href: string;
  label: string;
}

export const NAV_LINKS: readonly NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/mar", label: "Mar" },
  { href: "/ranking", label: "Ranking" },
  { href: "/inventory", label: "Inventário" },
] as const;

export const ELO_LEVEL_RANGES = [
  { level: 1, min: 0, max: 99 },
  { level: 2, min: 100, max: 199 },
  { level: 3, min: 200, max: 299 },
  { level: 4, min: 300, max: 399 },
  { level: 5, min: 400, max: 499 },
  { level: 6, min: 500, max: 599 },
  { level: 7, min: 600, max: 699 },
  { level: 8, min: 700, max: 799 },
  { level: 9, min: 800, max: 899 },
  { level: 10, min: 900, max: Infinity },
] as const;
