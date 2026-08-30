import type { ServerGameMode } from "@/types/server";

export function toServerGameMode(gameMode: string | null | undefined): ServerGameMode {
  const normalized = String(gameMode ?? "").toUpperCase();
  if (normalized.includes("RETAKE")) return "RETAKE";
  if (normalized.includes("DEATHMATCH") || normalized === "DM") return "DEATHMATCH";
  if (normalized.includes("PRACTICE")) return "PRACTICE";
  return "COMPETITIVO";
}
