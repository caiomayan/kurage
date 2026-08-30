/**
 * Kurage System Constants
 * Centralized configuration, navigation links, and domain definitions.
 */

export const APP_NAME = "Kurage";
export const APP_TAGLINE = "O competitivo em um só lugar";

function publicUrl(name: string, configuredValue: string | undefined, localFallback: string) {
  const value = configuredValue?.trim() || localFallback;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("unsupported protocol");
    }
    return url.origin;
  } catch {
    throw new Error(`${name} must be a valid absolute HTTP(S) URL`);
  }
}

export const APP_DOMAIN = publicUrl(
  "NEXT_PUBLIC_APP_URL",
  process.env.NEXT_PUBLIC_APP_URL,
  "http://localhost:3000",
);
export const API_BASE_URL = publicUrl(
  "NEXT_PUBLIC_API_URL",
  process.env.NEXT_PUBLIC_API_URL,
  "http://localhost:8080",
);
export const CS2_CONNECT_HOST = process.env.NEXT_PUBLIC_CS2_CONNECT_HOST?.trim() || "";

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
