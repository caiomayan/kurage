import { test } from "node:test";
import assert from "node:assert/strict";
import {
  historyKey,
  readRecents,
  rememberSearch,
  forgetSearch,
  clearHistory,
  SEARCH_HISTORY_LIMITS,
  searchHistoryStore,
} from "../lib/search-history.ts";
import { shortcutsFor } from "../lib/search-shortcuts.ts";

function memoryStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, v),
    removeItem: (k) => map.delete(k),
    _dump: () => Object.fromEntries(map),
  };
}

function throwingStorage() {
  return {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("quota");
    },
    removeItem() {
      throw new Error("blocked");
    },
  };
}

test("1. History is namespaced per account and never shared", () => {
  assert.notEqual(historyKey(1007), historyKey(2001));
  assert.notEqual(historyKey(1007), historyKey(null));
  assert.equal(historyKey(null), historyKey(undefined));
  assert.equal(historyKey(null), historyKey(""));

  const storage = memoryStorage();
  rememberSearch(storage, 1007, "furia");
  rememberSearch(storage, 2001, "mibr");

  assert.deepEqual(readRecents(storage, 1007).map((e) => e.term), ["furia"]);
  assert.deepEqual(readRecents(storage, 2001).map((e) => e.term), ["mibr"]);
  // Signing out must not expose what the account searched.
  assert.deepEqual(readRecents(storage, null), []);
});

test("2. Repeating a search moves it up instead of duplicating", () => {
  const storage = memoryStorage();
  rememberSearch(storage, 1007, "furia");
  rememberSearch(storage, 1007, "mibr");
  rememberSearch(storage, 1007, "FURIA");

  assert.deepEqual(readRecents(storage, 1007).map((e) => e.term), ["FURIA", "mibr"]);
});

test("3. The list is capped and terms are trimmed and bounded", () => {
  const storage = memoryStorage();
  for (let i = 0; i < SEARCH_HISTORY_LIMITS.MAX_ENTRIES + 4; i++) {
    rememberSearch(storage, 1007, `termo-${i}`);
  }
  const recents = readRecents(storage, 1007);
  assert.equal(recents.length, SEARCH_HISTORY_LIMITS.MAX_ENTRIES);
  assert.equal(recents[0].term, `termo-${SEARCH_HISTORY_LIMITS.MAX_ENTRIES + 3}`);

  rememberSearch(storage, 1007, "   espacos   ");
  assert.equal(readRecents(storage, 1007)[0].term, "espacos");

  const long = "x".repeat(500);
  rememberSearch(storage, 1007, long);
  assert.equal(readRecents(storage, 1007)[0].term.length, SEARCH_HISTORY_LIMITS.MAX_TERM_LENGTH);

  // Blank input is not a search.
  const before = readRecents(storage, 1007).length;
  rememberSearch(storage, 1007, "   ");
  assert.equal(readRecents(storage, 1007).length, before);
});

test("4. Entries are erasable, one at a time or all at once", () => {
  const storage = memoryStorage();
  rememberSearch(storage, 1007, "furia");
  rememberSearch(storage, 1007, "mibr");

  forgetSearch(storage, 1007, "FURIA");
  assert.deepEqual(readRecents(storage, 1007).map((e) => e.term), ["mibr"]);

  clearHistory(storage, 1007);
  assert.deepEqual(readRecents(storage, 1007), []);
});

test("5. Corrupt or unavailable storage degrades to no history", () => {
  const corrupt = memoryStorage({ [historyKey(1007)]: "{not json" });
  assert.deepEqual(readRecents(corrupt, 1007), []);

  const wrongShape = memoryStorage({ [historyKey(1007)]: '["plain string", {"term": 1}]' });
  assert.deepEqual(readRecents(wrongShape, 1007), []);

  // Private browsing throws on every access; the search box must still work.
  const blocked = throwingStorage();
  assert.deepEqual(readRecents(blocked, 1007), []);
  assert.doesNotThrow(() => rememberSearch(blocked, 1007, "furia"));
  assert.doesNotThrow(() => clearHistory(blocked, 1007));

  // No storage at all (server render).
  assert.deepEqual(readRecents(null, 1007), []);
  assert.doesNotThrow(() => rememberSearch(null, 1007, "furia"));
});

test("6. Shortcuts only point at routes that exist", () => {
  const real = new Set(["/ranking", "/mar", "/inventory", "/settings"]);

  const anonymous = shortcutsFor({ isAuthenticated: false });
  assert.ok(anonymous.length > 0);
  assert.ok(anonymous.every((s) => real.has(s.href)));
  // An anonymous viewer is not offered an account-only destination.
  assert.ok(!anonymous.some((s) => s.id === "profile"));

  const signedIn = shortcutsFor({ isAuthenticated: true, kurageId: 1007 });
  const profile = signedIn.find((s) => s.id === "profile");
  assert.equal(profile.href, "/player/1007");

  // Without a resolved id the shortcut falls back to a route that exists
  // instead of building /player/null.
  const withoutId = shortcutsFor({ isAuthenticated: true, kurageId: null });
  assert.equal(withoutId.find((s) => s.id === "profile").href, "/settings");
});

test("7. The observable store keeps a stable snapshot until a write", () => {
  // No localStorage in Node: the store degrades to empty rather than throwing,
  // and must still hand React the same reference every time or it re-renders
  // forever.
  const first = searchHistoryStore.getSnapshot(1007);
  const second = searchHistoryStore.getSnapshot(1007);
  assert.equal(first, second, "getSnapshot must be reference-stable");
  assert.deepEqual(first, []);

  assert.equal(searchHistoryStore.getServerSnapshot(), searchHistoryStore.getServerSnapshot());
  assert.deepEqual(searchHistoryStore.getServerSnapshot(), []);

  let notified = 0;
  const unsubscribe = searchHistoryStore.subscribe(() => { notified++; });
  searchHistoryStore.remember(1007, "furia");
  searchHistoryStore.forget(1007, "furia");
  searchHistoryStore.clear(1007);
  assert.equal(notified, 3, "every write notifies subscribers");

  unsubscribe();
  searchHistoryStore.clear(1007);
  assert.equal(notified, 3, "unsubscribed listeners stop being called");
});
