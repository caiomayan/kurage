/**
 * Destinations offered by the search panel before anything is typed.
 *
 * docs/pt/19 §8 asks for "contextual shortcuts and real useful destinations".
 * Every entry here points at a route that exists, because P0-12 in the audit was
 * raised precisely for links to pages that were never built — a shortcut to a
 * 404 is worse than no shortcut.
 *
 * Deliberately absent: a "most searched" section. §8 allows it only with real
 * collection, a time window, a minimum sample and protection against
 * manipulation, and forbids fabricating popularity while traffic is small.
 * None of that exists yet, so the panel offers no trending list rather than an
 * invented one.
 */

export interface SearchShortcut {
  id: string;
  label: string;
  hint: string;
  href: string;
  /** Only offered to a signed-in viewer. */
  requiresAuth?: boolean;
}

const SHORTCUTS: readonly SearchShortcut[] = [
  {
    id: "ranking",
    label: "Ranking",
    hint: "Jogadores e times classificados",
    href: "/ranking",
  },
  {
    id: "mar",
    label: "Mar",
    hint: "Servidores e telemetria ao vivo",
    href: "/mar",
  },
  {
    id: "inventory",
    label: "Inventário",
    hint: "Suas skins e loadout de CS2",
    href: "/inventory",
  },
  {
    id: "profile",
    label: "Meu perfil",
    hint: "Identidade, estatísticas e partidas",
    href: "/settings",
    requiresAuth: true,
  },
];

export function shortcutsFor(options: {
  isAuthenticated: boolean;
  kurageId?: number | null;
}): SearchShortcut[] {
  return SHORTCUTS.filter((shortcut) => !shortcut.requiresAuth || options.isAuthenticated).map(
    (shortcut) =>
      shortcut.id === "profile" && options.kurageId
        ? { ...shortcut, href: `/player/${options.kurageId}` }
        : shortcut
  );
}
