import { test } from "node:test";
import assert from "node:assert/strict";
import { hasSubscriptionFeature } from "../types/user.ts";
import { formatRelativeTime } from "../types/profile.ts";

test("1. Subscription Features: hasSubscriptionFeature mapping", () => {
  // Free access
  assert.equal(hasSubscriptionFeature("FREE", "PROFILE_VISITORS"), false);
  assert.equal(hasSubscriptionFeature("FREE", "MARE_BADGE"), false);
  assert.equal(hasSubscriptionFeature("FREE", "ADVANCED_STATS"), false);

  // One platform-wide paid membership
  assert.equal(hasSubscriptionFeature("MARE", "PROFILE_VISITORS"), true);
  assert.equal(hasSubscriptionFeature("MARE", "MARE_BADGE"), true);
  assert.equal(hasSubscriptionFeature("MARE", "ADVANCED_STATS"), true);
  assert.equal(hasSubscriptionFeature("MARE", "RANKING_FILTERS"), true);
  assert.equal(hasSubscriptionFeature("MARE", "SERVER_PRIORITY"), true);
  assert.equal(hasSubscriptionFeature("MARE", "PROFILE_HIGHLIGHT"), true);
  assert.equal(hasSubscriptionFeature("MARE", "EARLY_ACCESS"), true);

  // Null, undefined, and unsupported tier
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
  assert.equal(formatRelativeTime(null), "Horário indisponível");
  assert.equal(formatRelativeTime(undefined), "Horário indisponível");
  assert.equal(formatRelativeTime("not-a-valid-date"), "Horário indisponível");
  assert.equal(formatRelativeTime(""), "Horário indisponível");
  assert.equal(formatRelativeTime(new Date(now + 60_000)), "Horário indisponível");
});
