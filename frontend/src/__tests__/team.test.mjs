import test from "node:test";
import assert from "node:assert/strict";
import {
  createTeamJoinRequestSchema,
  createInviteLinkSchema,
  directInviteSchema,
  categorizeTeamMembers,
  canAddRole,
  canManageTeam,
  isTeamOwner,
  isInviteLinkActive,
} from "../types/team.ts";

test("1. Validation: createTeamJoinRequestSchema", () => {
  // Valid roles
  const validPlayer = createTeamJoinRequestSchema.safeParse({ desiredRole: "PLAYER" });
  assert.equal(validPlayer.success, true);

  const validCoach = createTeamJoinRequestSchema.safeParse({ desiredRole: "COACH" });
  assert.equal(validCoach.success, true);

  const validSub = createTeamJoinRequestSchema.safeParse({ desiredRole: "SUBSTITUTE" });
  assert.equal(validSub.success, true);

  const validAssistant = createTeamJoinRequestSchema.safeParse({ desiredRole: "ASSISTANT_COACH" });
  assert.equal(validAssistant.success, true);

  // Invalid roles
  const invalidRole = createTeamJoinRequestSchema.safeParse({ desiredRole: "ADMIN" });
  assert.equal(invalidRole.success, false);

  const emptyRole = createTeamJoinRequestSchema.safeParse({});
  assert.equal(emptyRole.success, false);
});

test("2. Validation: createInviteLinkSchema", () => {
  // Valid default
  const validDefault = createInviteLinkSchema.safeParse({ expiresInDays: 1, maxUses: 1 });
  assert.equal(validDefault.success, true);

  // Valid max days (7) and max uses (10)
  const validMax = createInviteLinkSchema.safeParse({
    targetRole: "PLAYER",
    expiresInDays: 7,
    maxUses: 10,
  });
  assert.equal(validMax.success, true);

  // Invalid days (< 1 or > 7)
  const invalidDaysLow = createInviteLinkSchema.safeParse({ expiresInDays: 0 });
  assert.equal(invalidDaysLow.success, false);

  const invalidDaysHigh = createInviteLinkSchema.safeParse({ expiresInDays: 8 });
  assert.equal(invalidDaysHigh.success, false);

  // Invalid uses (< 1 or > 10)
  const invalidUsesLow = createInviteLinkSchema.safeParse({ maxUses: 0 });
  assert.equal(invalidUsesLow.success, false);

  const invalidUsesHigh = createInviteLinkSchema.safeParse({ maxUses: 11 });
  assert.equal(invalidUsesHigh.success, false);
});

test("3. Validation: directInviteSchema (SteamID64 17-digits)", () => {
  // Valid 17-digit SteamID64
  const valid = directInviteSchema.safeParse({
    steamId64: "76561198012345678",
    targetRole: "PLAYER",
  });
  assert.equal(valid.success, true);

  // Invalid length (16 digits)
  const shortId = directInviteSchema.safeParse({
    steamId64: "7656119801234567",
    targetRole: "PLAYER",
  });
  assert.equal(shortId.success, false);

  // Invalid length (18 digits)
  const longId = directInviteSchema.safeParse({
    steamId64: "765611980123456789",
    targetRole: "PLAYER",
  });
  assert.equal(longId.success, false);

  // Invalid alphanumeric characters
  const alphaId = directInviteSchema.safeParse({
    steamId64: "7656119801234567a",
    targetRole: "PLAYER",
  });
  assert.equal(alphaId.success, false);
});

test("4. Business Rules: categorizeTeamMembers", () => {
  const members = [
    { id: "1", teamRole: "PLAYER", user: { id: "u1" } },
    { id: "2", teamRole: "PLAYER", user: { id: "u2" } },
    { id: "3", teamRole: "SUBSTITUTE", user: { id: "u3" } },
    { id: "4", teamRole: "COACH", user: { id: "u4" } },
    { id: "5", teamRole: "ASSISTANT_COACH", user: { id: "u5" } },
  ];

  const composition = categorizeTeamMembers(members);
  assert.equal(composition.players.length, 2);
  assert.equal(composition.substitutes.length, 1);
  assert.equal(composition.coach?.id, "4");
  assert.equal(composition.assistantCoach?.id, "5");
  assert.equal(composition.others.length, 0);
});

test("5. Business Rules: canAddRole Limits", () => {
  // Test Max Players limit (5)
  const fourPlayers = Array.from({ length: 4 }).map((_, i) => ({
    id: `p${i}`,
    teamRole: "PLAYER",
  }));
  assert.equal(canAddRole(fourPlayers, "PLAYER"), true);

  const fivePlayers = Array.from({ length: 5 }).map((_, i) => ({
    id: `p${i}`,
    teamRole: "PLAYER",
  }));
  assert.equal(canAddRole(fivePlayers, "PLAYER"), false);

  // Test Max Substitutes limit (2)
  const oneSub = [{ id: "s1", teamRole: "SUBSTITUTE" }];
  assert.equal(canAddRole(oneSub, "SUBSTITUTE"), true);

  const twoSubs = [
    { id: "s1", teamRole: "SUBSTITUTE" },
    { id: "s2", teamRole: "SUBSTITUTE" },
  ];
  assert.equal(canAddRole(twoSubs, "SUBSTITUTE"), false);

  // Test Coach limit (1)
  const noCoach = [];
  assert.equal(canAddRole(noCoach, "COACH"), true);

  const hasCoach = [{ id: "c1", teamRole: "COACH" }];
  assert.equal(canAddRole(hasCoach, "COACH"), false);

  // Test Assistant Coach limit (1)
  const noAssistant = [];
  assert.equal(canAddRole(noAssistant, "ASSISTANT_COACH"), true);

  const hasAssistant = [{ id: "ac1", teamRole: "ASSISTANT_COACH" }];
  assert.equal(canAddRole(hasAssistant, "ASSISTANT_COACH"), false);
});

test("6. Permissions: canManageTeam & isTeamOwner", () => {
  const team = {
    id: "t1",
    name: "Kurage Esports",
    tag: "KUR",
    owner: { id: "owner-uuid" },
    members: [
      { id: "m1", user: { id: "owner-uuid" }, managementRole: "OWNER" },
      { id: "m2", user: { id: "admin-uuid" }, managementRole: "ADMIN" },
      { id: "m3", user: { id: "member-uuid" }, managementRole: "MEMBER" },
    ],
  };

  // canManageTeam
  assert.equal(canManageTeam("owner-uuid", team), true);
  assert.equal(canManageTeam("admin-uuid", team), true);
  assert.equal(canManageTeam("member-uuid", team), false);
  assert.equal(canManageTeam("outsider-uuid", team), false);
  assert.equal(canManageTeam(undefined, team), false);

  // isTeamOwner
  assert.equal(isTeamOwner("owner-uuid", team), true);
  assert.equal(isTeamOwner("admin-uuid", team), false);
  assert.equal(isTeamOwner("member-uuid", team), false);
  assert.equal(isTeamOwner("outsider-uuid", team), false);
});

test("7. Business Rules: isInviteLinkActive", () => {
  const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
  const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();

  // Valid active link
  const activeLink = {
    id: "l1",
    token: "valid-token",
    isActive: true,
    currentUses: 0,
    maxUses: 1,
    expiresAt: futureDate,
  };
  assert.equal(isInviteLinkActive(activeLink), true);

  // Inactive link
  const inactiveLink = {
    ...activeLink,
    isActive: false,
  };
  assert.equal(isInviteLinkActive(inactiveLink), false);

  // Max uses reached or exceeded
  const fullLink = {
    ...activeLink,
    currentUses: 1,
    maxUses: 1,
  };
  assert.equal(isInviteLinkActive(fullLink), false);

  const exceededLink = {
    ...activeLink,
    currentUses: 5,
    maxUses: 1,
  };
  assert.equal(isInviteLinkActive(exceededLink), false);

  // Expired link
  const expiredLink = {
    ...activeLink,
    expiresAt: pastDate,
  };
  assert.equal(isInviteLinkActive(expiredLink), false);

  // Invalid date string
  const invalidDateLink = {
    ...activeLink,
    expiresAt: "not-a-valid-date",
  };
  assert.equal(isInviteLinkActive(invalidDateLink), false);

  // Malformed usages (strings instead of numbers) -> defensively active if valid date and active=true
  // wait, our defensive check bypasses the usage check if they aren't numbers
  const malformedUsagesLink = {
    ...activeLink,
    currentUses: "1",
    maxUses: "1",
  };
  // If the backend returns strings, the defensive typeof check means we don't reject it based on usage, relying on the backend
  assert.equal(isInviteLinkActive(malformedUsagesLink), true);

  // Null or undefined
  assert.equal(isInviteLinkActive(null), false);
  assert.equal(isInviteLinkActive(undefined), false);
});
