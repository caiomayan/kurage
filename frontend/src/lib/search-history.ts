/**
 * Private, per-account search history.
 *
 * docs/pt/19 §8 asks the empty search panel to offer recents that belong to the
 * viewer, can be erased, and never leak across a logout or an account switch.
 * That is why history is namespaced by account and never sent anywhere: these
 * are the viewer's own words, kept on the viewer's own device.
 *
 * Storage is injectable so the rules are testable without a DOM, and every
 * access is guarded — Safari private mode throws on `localStorage`, and a search
 * box must not break because history is unavailable.
 */

const KEY_PREFIX = "kurage_search_history";
const MAX_ENTRIES = 6;
/** Longer than this is a paste, not a search term worth keeping. */
const MAX_TERM_LENGTH = 64;

export interface SearchHistoryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface RecentSearch {
  term: string;
  /** Epoch milliseconds, used only for ordering. */
  at: number;
}

/**
 * The namespace for an account. A signed-out viewer gets their own bucket, so
 * signing in never exposes what someone typed before, and signing out never
 * exposes what the account searched.
 */
export function historyKey(accountId: string | number | null | undefined): string {
  if (accountId === null || accountId === undefined || accountId === "") {
    return `${KEY_PREFIX}:anon`;
  }
  return `${KEY_PREFIX}:${accountId}`;
}

function safeRead(storage: SearchHistoryStorage | null, key: string): RecentSearch[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (entry): entry is RecentSearch =>
          typeof entry === "object" &&
          entry !== null &&
          typeof (entry as RecentSearch).term === "string" &&
          typeof (entry as RecentSearch).at === "number"
      )
      .slice(0, MAX_ENTRIES);
  } catch {
    // Unreadable or corrupt history is the same as no history.
    return [];
  }
}

function safeWrite(
  storage: SearchHistoryStorage | null,
  key: string,
  entries: RecentSearch[]
): void {
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(entries));
  } catch {
    // Quota or a blocked store: history is a convenience, never a requirement.
  }
}

export function readRecents(
  storage: SearchHistoryStorage | null,
  accountId: string | number | null | undefined
): RecentSearch[] {
  return safeRead(storage, historyKey(accountId));
}

/**
 * Records a term, most recent first, case-insensitively de-duplicated so
 * repeating a search moves it up instead of filling the list.
 */
export function rememberSearch(
  storage: SearchHistoryStorage | null,
  accountId: string | number | null | undefined,
  rawTerm: string
): RecentSearch[] {
  const term = rawTerm.trim().slice(0, MAX_TERM_LENGTH);
  if (term.length === 0) return readRecents(storage, accountId);

  const key = historyKey(accountId);
  const existing = safeRead(storage, key).filter(
    (entry) => entry.term.toLowerCase() !== term.toLowerCase()
  );
  const next = [{ term, at: Date.now() }, ...existing].slice(0, MAX_ENTRIES);
  safeWrite(storage, key, next);
  return next;
}

export function forgetSearch(
  storage: SearchHistoryStorage | null,
  accountId: string | number | null | undefined,
  term: string
): RecentSearch[] {
  const key = historyKey(accountId);
  const next = safeRead(storage, key).filter(
    (entry) => entry.term.toLowerCase() !== term.toLowerCase()
  );
  safeWrite(storage, key, next);
  return next;
}

export function clearHistory(
  storage: SearchHistoryStorage | null,
  accountId: string | number | null | undefined
): RecentSearch[] {
  if (storage) {
    try {
      storage.removeItem(historyKey(accountId));
    } catch {
      // Nothing to do: the caller still renders an empty list.
    }
  }
  return [];
}

/** `localStorage` when it is reachable, otherwise null. */
export function browserStorage(): SearchHistoryStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export const SEARCH_HISTORY_LIMITS = { MAX_ENTRIES, MAX_TERM_LENGTH };

/**
 * A small observable view over the stored history, so React can subscribe to it
 * with `useSyncExternalStore` instead of mirroring it into state.
 *
 * `getSnapshot` must return a stable reference between writes or React
 * re-renders forever, hence the per-key cache. Writes invalidate the entry and
 * notify listeners, which also keeps two mounted search boxes in step.
 */
const listeners = new Set<() => void>();
const snapshots = new Map<string, RecentSearch[]>();
const EMPTY: RecentSearch[] = [];

function invalidate(key: string) {
  snapshots.delete(key);
  listeners.forEach((listener) => listener());
}

export const searchHistoryStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /** Client snapshot: cached so the reference only changes after a write. */
  getSnapshot(accountId: string | number | null | undefined): RecentSearch[] {
    const key = historyKey(accountId);
    const cached = snapshots.get(key);
    if (cached) return cached;
    const fresh = safeRead(browserStorage(), key);
    snapshots.set(key, fresh);
    return fresh;
  },

  /** Server snapshot: history is device-local, so there is nothing to render. */
  getServerSnapshot(): RecentSearch[] {
    return EMPTY;
  },

  remember(accountId: string | number | null | undefined, term: string) {
    rememberSearch(browserStorage(), accountId, term);
    invalidate(historyKey(accountId));
  },

  forget(accountId: string | number | null | undefined, term: string) {
    forgetSearch(browserStorage(), accountId, term);
    invalidate(historyKey(accountId));
  },

  clear(accountId: string | number | null | undefined) {
    clearHistory(browserStorage(), accountId);
    invalidate(historyKey(accountId));
  },
};
