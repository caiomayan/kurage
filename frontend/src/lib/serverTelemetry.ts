import type { PlayerLiveStats } from "@/types/server";

export type ServerPlayerApiRow = {
  kurageId?: number | null;
  steamId64?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  team?: string | null;
  kurageLevel?: number | null;
  faceitLevel?: number | null;
  isVerifiedPro?: boolean | null;
  clanTag?: string | null;
  kills?: number | null;
  deaths?: number | null;
  ping?: number | null;
  isAlive?: boolean | null;
};

export function normalizeServerPlayer(
  row: ServerPlayerApiRow,
): PlayerLiveStats {
  const kills = Number(row.kills ?? 0);
  const deaths = Number(row.deaths ?? 0);
  const kdRatio =
    deaths > 0
      ? Number((kills / deaths).toFixed(2))
      : kills > 0
        ? Number(kills.toFixed(2))
        : 0;

  return {
    kurageId: Number(row.kurageId ?? 0),
    username: row.username ?? "Player",
    avatarUrl: row.avatarUrl ?? "",
    isVerifiedPro: Boolean(row.isVerifiedPro),
    kurageLevel: Number(row.kurageLevel ?? 0),
    faceitLevel: row.faceitLevel ?? undefined,
    kills,
    deaths,
    kdRatio,
    ping: Number(row.ping ?? 0),
    isAlive: row.isAlive ?? true,
  };
}

export function mapServerPlayersToLiveStats(
  players: ServerPlayerApiRow[] = [],
) {
  const ctPlayers = players
    .filter((player) => (player.team ?? "SPEC").toUpperCase() === "CT")
    .map((player) => normalizeServerPlayer(player));

  const trPlayers = players
    .filter((player) => (player.team ?? "SPEC").toUpperCase() === "TR")
    .map((player) => normalizeServerPlayer(player));

  return { ctPlayers, trPlayers };
}
