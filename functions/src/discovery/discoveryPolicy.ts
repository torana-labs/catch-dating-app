import type {DiscoverySettingsDocument} from
  "../shared/generated/firestoreAdminTypes";

/**
 * Settings → Discovery, decided by the owner on 19 Nov 2026. Organisers not
 * on Catch yet (claimState unclaimed or claimPending) exist to be found and
 * claimed, so by default they appear nowhere guests browse. These rules only
 * hide: a per-organiser switch can never bring back an organiser they hide.
 * Search-engine indexing and the app's Explore are not governed here.
 */
export const DISCOVERY_SETTINGS_PATH = "discoverySettings/current";

/** The ops roles that read Settings; only the owner edits them. */
export const DISCOVERY_READ_ROLES = [
  "admin",
  "adminOwner",
  "safetyReviewer",
  "support",
] as const;
export const DISCOVERY_OWNER_ROLES = ["adminOwner"] as const;

export const DISCOVERY_HOME_ORGANIZERS_MINIMUM = {min: 1, max: 24} as const;

export type DiscoverySurfaces = DiscoverySettingsDocument["surfaces"];
export type DiscoverySurface = keyof DiscoverySurfaces;
export type DiscoverySurfaceRule = DiscoverySurfaces[DiscoverySurface];

export const discoverySurfaces = ["homeOrganizers", "cityOrganizers",
  "plans", "totals"] as const satisfies readonly DiscoverySurface[];

/** The rules themselves, without who changed them. */
export interface DiscoveryRules {
  surfaces: DiscoverySurfaces;
  homeOrganizersMinimum: number;
  homeClaimAction: boolean;
}

export interface DiscoverySettings extends DiscoveryRules {
  updatedAtMillis: number | null;
  updatedByUid: string | null;
}

const onCatchOnly = (): DiscoverySurfaceRule =>
  ({onCatch: true, notOnCatch: false});

/**
 * The rules until the owner edits them, and whenever nothing is stored: only
 * organisers on Catch appear, the homepage band needs one of them, and the
 * guest homepage has no claim-your-page button. A fresh copy each call.
 * @return {DiscoveryRules} Default rules.
 */
export function defaultDiscoveryRules(): DiscoveryRules {
  return {
    surfaces: {
      homeOrganizers: onCatchOnly(),
      cityOrganizers: onCatchOnly(),
      plans: onCatchOnly(),
      totals: onCatchOnly(),
    },
    homeOrganizersMinimum: 1,
    homeClaimAction: false,
  };
}

export const DEFAULT_DISCOVERY_SETTINGS: Readonly<DiscoverySettings> =
  Object.freeze({
    ...defaultDiscoveryRules(),
    updatedAtMillis: null,
    updatedByUid: null,
  });

/**
 * Whether an organiser is on Catch: claimed or verified. Every other claim
 * state, including one this code does not know, reads as not on Catch, so
 * an unexpected value is hidden rather than shown.
 * @param {unknown} claimState The organiser's claim state.
 * @return {boolean} True when the organiser is on Catch.
 */
export function organizerOnCatch(claimState: unknown): boolean {
  return claimState === "claimed" || claimState === "verified";
}

/**
 * Whether a surface's rule lets an organiser with this claim state appear.
 * @param {DiscoverySurfaceRule} rule The surface's rule.
 * @param {unknown} claimState The organiser's claim state.
 * @return {boolean} True when the organiser may appear there.
 */
export function allowedOn(
  rule: DiscoverySurfaceRule, claimState: unknown
): boolean {
  return organizerOnCatch(claimState) ? rule.onCatch : rule.notOnCatch;
}

/**
 * Reads the owner's discovery settings, falling back to the defaults when
 * nothing is stored. A stored field of the wrong shape (the callable never
 * writes one) falls back to its default, which hides rather than shows.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {FirebaseFirestore.Transaction=} tx Optional transaction.
 * @return {Promise<DiscoverySettings>} Current settings.
 */
export async function readDiscoverySettings(
  db: FirebaseFirestore.Firestore,
  tx?: FirebaseFirestore.Transaction
): Promise<DiscoverySettings> {
  const ref = db.doc(DISCOVERY_SETTINGS_PATH);
  const snap = tx ? await tx.get(ref) : await ref.get();
  if (!snap.exists) {
    return {...defaultDiscoveryRules(), updatedAtMillis: null,
      updatedByUid: null};
  }
  return discoverySettingsFromDocument(snap.data());
}

/**
 * Normalises a stored settings document.
 * @param {unknown} value Stored document data.
 * @return {DiscoverySettings} Settings.
 */
export function discoverySettingsFromDocument(
  value: unknown
): DiscoverySettings {
  const data = (value && typeof value === "object" ? value : {}) as
    Partial<Record<keyof DiscoverySettingsDocument, unknown>>;
  const defaults = defaultDiscoveryRules();
  const stored = (data.surfaces && typeof data.surfaces === "object" ?
    data.surfaces : {}) as Partial<Record<DiscoverySurface, unknown>>;
  const surfaces = Object.fromEntries(discoverySurfaces.map((surface) =>
    [surface, surfaceRule(stored[surface], defaults.surfaces[surface])])) as
    DiscoverySurfaces;
  const minimum = data.homeOrganizersMinimum;
  return {
    surfaces,
    homeOrganizersMinimum: Number.isInteger(minimum) &&
      (minimum as number) >= DISCOVERY_HOME_ORGANIZERS_MINIMUM.min &&
      (minimum as number) <= DISCOVERY_HOME_ORGANIZERS_MINIMUM.max ?
      minimum as number : defaults.homeOrganizersMinimum,
    homeClaimAction: typeof data.homeClaimAction === "boolean" ?
      data.homeClaimAction : defaults.homeClaimAction,
    updatedAtMillis: millisOf(data.updatedAt),
    updatedByUid: typeof data.updatedByUid === "string" ?
      data.updatedByUid : null,
  };
}

function surfaceRule(
  value: unknown, fallback: DiscoverySurfaceRule
): DiscoverySurfaceRule {
  const rule = (value && typeof value === "object" ? value : {}) as
    Partial<Record<keyof DiscoverySurfaceRule, unknown>>;
  return {
    onCatch: typeof rule.onCatch === "boolean" ?
      rule.onCatch : fallback.onCatch,
    notOnCatch: typeof rule.notOnCatch === "boolean" ?
      rule.notOnCatch : fallback.notOnCatch,
  };
}

/**
 * The rules without who changed them.
 * @param {DiscoveryRules} settings Settings or rules.
 * @return {DiscoveryRules} A copy of the rules.
 */
export function discoveryRulesOf(settings: DiscoveryRules): DiscoveryRules {
  return {
    surfaces: Object.fromEntries(discoverySurfaces.map((surface) =>
      [surface, {...settings.surfaces[surface]}])) as DiscoverySurfaces,
    homeOrganizersMinimum: settings.homeOrganizersMinimum,
    homeClaimAction: settings.homeClaimAction,
  };
}

function millisOf(value: unknown): number | null {
  if (value instanceof Date) return value.getTime();
  if (value && typeof value === "object" &&
      typeof (value as {toMillis?: unknown}).toMillis === "function") {
    return (value as {toMillis: () => number}).toMillis();
  }
  return null;
}
