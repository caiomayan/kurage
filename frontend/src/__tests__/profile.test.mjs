import { test } from "node:test";
import assert from "node:assert/strict";
import { hasSubscriptionFeature } from "../types/user.ts";
import { formatRelativeTime } from "../types/profile.ts";

test("1. Subscription Features: hasSubscriptionFeature mapping", () => {
  // FREE tier
  assert.equal(hasSubscriptionFeature("FREE", "PROFILE_VISITORS"), false);
  assert.equal(hasSubscriptionFeature("FREE", "PLUS_BADGE"), false);
  assert.equal(hasSubscriptionFeature("FREE", "ADVANCED_STATS"), false);
  assert.equal(hasSubscriptionFeature("FREE", "PRO_BADGE"), false);
  assert.equal(hasSubscriptionFeature("FREE", "MAX_BADGE"), false);

  // PLUS tier
  assert.equal(hasSubscriptionFeature("PLUS", "PROFILE_VISITORS"), true);
  assert.equal(hasSubscriptionFeature("PLUS", "PLUS_BADGE"), true);
  assert.equal(hasSubscriptionFeature("PLUS", "ADVANCED_STATS"), false);
  assert.equal(hasSubscriptionFeature("PLUS", "PRO_BADGE"), false);
  assert.equal(hasSubscriptionFeature("PLUS", "MAX_BADGE"), false);

  // PRO tier
  assert.equal(hasSubscriptionFeature("PRO", "PROFILE_VISITORS"), true);
  assert.equal(hasSubscriptionFeature("PRO", "PLUS_BADGE"), true);
  assert.equal(hasSubscriptionFeature("PRO", "ADVANCED_STATS"), true);
  assert.equal(hasSubscriptionFeature("PRO", "RANKING_FILTERS"), true);
  assert.equal(hasSubscriptionFeature("PRO", "PRO_BADGE"), true);
  assert.equal(hasSubscriptionFeature("PRO", "MAX_BADGE"), false);
  assert.equal(hasSubscriptionFeature("PRO", "SERVER_PRIORITY"), false);

  // MAX tier
  assert.equal(hasSubscriptionFeature("MAX", "PROFILE_VISITORS"), true);
  assert.equal(hasSubscriptionFeature("MAX", "PLUS_BADGE"), true);
  assert.equal(hasSubscriptionFeature("MAX", "ADVANCED_STATS"), true);
  assert.equal(hasSubscriptionFeature("MAX", "PRO_BADGE"), true);
  assert.equal(hasSubscriptionFeature("MAX", "MAX_BADGE"), true);
  assert.equal(hasSubscriptionFeature("MAX", "SERVER_PRIORITY"), true);
  assert.equal(hasSubscriptionFeature("MAX", "PROFILE_HIGHLIGHT"), true);

  // Null, undefined, and fallback
  assert.equal(hasSubscriptionFeature(null, "PROFILE_VISITORS"), false);
  assert.equal(hasSubscriptionFeature(undefined, "PROFILE_VISITORS"), false);
  assert.equal(hasSubscriptionFeature("INVALID", "PROFILE_VISITORS"), false);
});

test("2. Time Formatting: formatRelativeTime helper", () => {
  const now = Date.now();

  // Recent / seconds
  assert.equal(formatRelativeTime(new Date(now - 10 * 1000)), "agora há pouco");
  assert.equal(formatRelativeTime(new Date(now - 55 * 1000)), "agora há pouco");

  // Minutes
  assert.equal(formatRelativeTime(new Date(now - 5 * 60 * 1000)), "há 5 min");
  assert.equal(formatRelativeTime(new Date(now - 45 * 60 * 1000)), "há 45 min");

  // Hours
  assert.equal(formatRelativeTime(new Date(now - 2 * 3600 * 1000)), "há 2 h");
  assert.equal(formatRelativeTime(new Date(now - 20 * 3600 * 1000)), "há 20 h");

  // Days
  assert.equal(formatRelativeTime(new Date(now - 26 * 3600 * 1000)), "ontem");
  assert.equal(formatRelativeTime(new Date(now - 3 * 24 * 3600 * 1000)), "há 3 dias");

  // Weeks
  assert.equal(formatRelativeTime(new Date(now - 14 * 24 * 3600 * 1000)), "há 2 sem");

  // Edge cases & null safety
  assert.equal(formatRelativeTime(null), "recentemente");
  assert.equal(formatRelativeTime(undefined), "recentemente");
  assert.equal(formatRelativeTime("not-a-valid-date"), "recentemente");
  assert.equal(formatRelativeTime(""), "recentemente");
});
