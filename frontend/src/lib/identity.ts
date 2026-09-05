/**
 * Visual identity resolution.
 *
 * Platform role and subscription are independent dimensions (docs/pt/19 §2): an
 * admin may subscribe, buying Maré never grants administration, and owning a
 * team is not owning the platform. An account keeps every identity it has, but
 * only one of them paints the interface, in the order Owner > Admin > Maré >
 * default.
 *
 * Pure on purpose — the DOM side lives in `theme.ts`, so the precedence rule can
 * be tested without a browser.
 */

export type KurageIdentity = "owner" | "admin" | "mare" | "default";

/** Roles the platform recognises. Team roles are a different concept entirely. */
export type PlatformRole = "OWNER" | "ADMIN" | "USER";

export interface IdentitySource {
  role?: string | null;
  subscriptionTier?: string | null;
  /** Present when the backend already resolved expiry; see SubscriptionService. */
  subscriptionExpiresAt?: string | null;
}

/**
 * Resolves which identity paints the interface for an account.
 *
 * An expired subscription reads as FREE even before reconciliation persists the
 * change (docs/pt/12), so a stale `MARE` tier with a past expiry never themes
 * the page. Unknown or missing values fall back to the default sea-glass accent
 * rather than guessing.
 */
export function resolveIdentity(source: IdentitySource | null | undefined): KurageIdentity {
  if (!source) return "default";

  const role = typeof source.role === "string" ? source.role.toUpperCase() : null;
  if (role === "OWNER") return "owner";
  if (role === "ADMIN") return "admin";

  const tier = typeof source.subscriptionTier === "string"
    ? source.subscriptionTier.toUpperCase()
    : null;
  if (tier === "MARE" && !hasExpired(source.subscriptionExpiresAt)) return "mare";

  return "default";
}

function hasExpired(expiresAt: string | null | undefined): boolean {
  if (expiresAt === null || expiresAt === undefined || expiresAt === "") return false;
  const expiry = new Date(expiresAt).getTime();
  if (Number.isNaN(expiry)) return false;
  return expiry <= Date.now();
}

/**
 * The `data-kurage-theme` value for an identity, or null for the default theme,
 * which is expressed by the absence of the attribute.
 */
export function themeAttributeFor(identity: KurageIdentity): string | null {
  return identity === "default" ? null : identity;
}
