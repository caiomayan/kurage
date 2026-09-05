import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveIdentity, themeAttributeFor } from "../lib/identity.ts";
import { createThemeController } from "../lib/theme.ts";

test("1. Identity precedence: Owner > Admin > Maré > default", () => {
  assert.equal(resolveIdentity({ role: "OWNER", subscriptionTier: "MARE" }), "owner");
  assert.equal(resolveIdentity({ role: "ADMIN", subscriptionTier: "MARE" }), "admin");
  assert.equal(resolveIdentity({ role: "USER", subscriptionTier: "MARE" }), "mare");
  assert.equal(resolveIdentity({ role: "USER", subscriptionTier: "FREE" }), "default");

  // A subscribing admin keeps both identities, but admin is the one that paints.
  assert.equal(resolveIdentity({ role: "ADMIN", subscriptionTier: "FREE" }), "admin");
  // Buying Maré never grants administration.
  assert.equal(resolveIdentity({ role: "USER", subscriptionTier: "MARE" }), "mare");
});

test("2. Identity: missing, unknown and anonymous inputs fall back to default", () => {
  assert.equal(resolveIdentity(null), "default");
  assert.equal(resolveIdentity(undefined), "default");
  assert.equal(resolveIdentity({}), "default");
  assert.equal(resolveIdentity({ role: "TEAM_OWNER" }), "default");
  assert.equal(resolveIdentity({ subscriptionTier: "PLUS" }), "default");
  assert.equal(resolveIdentity({ role: null, subscriptionTier: null }), "default");
  // Case is normalised rather than trusted.
  assert.equal(resolveIdentity({ role: "owner" }), "owner");
  assert.equal(resolveIdentity({ subscriptionTier: "mare" }), "mare");
});

test("3. Identity: an expired subscription reads as FREE", () => {
  const past = new Date(Date.now() - 86_400_000).toISOString();
  const future = new Date(Date.now() + 86_400_000).toISOString();

  assert.equal(resolveIdentity({ subscriptionTier: "MARE", subscriptionExpiresAt: past }), "default");
  assert.equal(resolveIdentity({ subscriptionTier: "MARE", subscriptionExpiresAt: future }), "mare");
  // No expiry recorded means the backend already resolved the tier.
  assert.equal(resolveIdentity({ subscriptionTier: "MARE", subscriptionExpiresAt: null }), "mare");
  assert.equal(resolveIdentity({ subscriptionTier: "MARE", subscriptionExpiresAt: "not-a-date" }), "mare");
});

test("4. Theme attribute: default is the absence of the attribute", () => {
  assert.equal(themeAttributeFor("default"), null);
  assert.equal(themeAttributeFor("owner"), "owner");
  assert.equal(themeAttributeFor("admin"), "admin");
  assert.equal(themeAttributeFor("mare"), "mare");
});

function trackingController() {
  const applied = [];
  const controller = createThemeController((attribute) => applied.push(attribute));
  return { controller, applied };
}

test("5. Theme scope: a profile paints with its owner identity and restores the viewer", () => {
  const { controller, applied } = trackingController();

  controller.setViewer("owner");
  assert.equal(controller.current(), "owner");

  // Owner visits a plain user's profile: the page takes the profile's identity.
  const leave = controller.pushOverride("default");
  assert.equal(controller.current(), "default");

  // Leaving restores the viewer's own gold.
  leave();
  assert.equal(controller.current(), "owner");
  assert.deepEqual(applied, ["owner", null, "owner"]);
});

test("6. Theme scope: works for an anonymous visitor on a direct URL hit", () => {
  const { controller } = trackingController();

  // No session at all; the profile scope mounts first on a direct hit.
  const leave = controller.pushOverride("mare");
  assert.equal(controller.current(), "mare");

  leave();
  assert.equal(controller.current(), "default");
});

test("7. Theme scope: profile to profile navigation keeps the incoming theme", () => {
  const { controller } = trackingController();
  controller.setViewer("admin");

  // React mounts the next scope before unmounting the previous one.
  const leaveFirst = controller.pushOverride("mare");
  const leaveSecond = controller.pushOverride("owner");
  assert.equal(controller.current(), "owner");

  // The stale release must not wipe the theme that is now on screen.
  leaveFirst();
  assert.equal(controller.current(), "owner");

  leaveSecond();
  assert.equal(controller.current(), "admin");
});

test("8. Theme scope: releasing twice is harmless and login updates under a scope", () => {
  const { controller, applied } = trackingController();
  controller.setViewer("default");

  const leave = controller.pushOverride("owner");
  leave();
  leave();
  assert.equal(controller.current(), "default");

  // Signing in while reading a profile must not steal the profile's theme.
  const scoped = controller.pushOverride("mare");
  controller.setViewer("admin");
  assert.equal(controller.current(), "mare");
  scoped();
  assert.equal(controller.current(), "admin");

  // The first sync always writes, so the DOM is guaranteed to match the resolved
  // state even when that state is the default. After that, redundant writes are
  // collapsed and the DOM is only touched on real changes.
  assert.deepEqual(applied, [null, "owner", null, "mare", "admin"]);
});
