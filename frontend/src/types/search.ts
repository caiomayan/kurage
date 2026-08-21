export interface HighlightStat {
  label: string;
  value: string;
}

export interface SearchPlayerResult {
  id: string;
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
  faceitElo: number | null;
  faceitLevel: number | null;
  faceitKdRatio: number | null;
  isVerifiedPro: boolean;
  highlightStat?: HighlightStat | null;
}

export interface SearchTeamResult {
  id: string;
  name: string;
  tag: string;
  logoUrl: string | null;
  country: string | null;
  teamElo: number | null;
  memberCount: number;
}

export interface TopResult {
  type: "PLAYER" | "TEAM";
  player?: SearchPlayerResult | null;
  team?: SearchTeamResult | null;
}

export interface QuickSearchResponse {
  topResult?: TopResult | null;
  players: SearchPlayerResult[];
  teams: SearchTeamResult[];
}

export interface SearchResultPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
}

export interface FullSearchResponse {
  query: string;
  type: "ALL" | "PLAYERS" | "TEAMS";
  players?: SearchResultPage<SearchPlayerResult> | null;
  teams?: SearchResultPage<SearchTeamResult> | null;
}
