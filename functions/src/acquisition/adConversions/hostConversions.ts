import {createHash} from "node:crypto";

/**
 * Host-programme conversions (docs/ads_conversion_spec.md, event map):
 * a new owned organizer is `organizer_signup`; its first event that takes a
 * booking is `organizer_qualified`, the host campaigns' bidding goal.
 */
export type HostConversionName = "organizer_signup" | "organizer_qualified";
export type AdDestination = "meta" | "google";
export const AD_DESTINATIONS: readonly AdDestination[] = ["meta", "google"];

/** Meta rejects server events older than seven days. */
export const HOST_CONVERSION_MAX_AGE_MILLIS = 7 * 24 * 60 * 60 * 1000;
/** A first event further in the past than this is a replay, not news. */
const QUALIFYING_EVENT_LOOKBACK_MILLIS = 30 * 24 * 60 * 60 * 1000;

type Raw = Record<string, unknown> | undefined;

function millisOf(value: unknown): number | null {
  if (value && typeof value === "object" &&
      typeof (value as {toMillis?: unknown}).toMillis === "function") {
    return (value as {toMillis: () => number}).toMillis();
  }
  return null;
}

const milestone = (facts: Raw, key: string) =>
  millisOf((facts?.milestones as Raw)?.[key]);

/**
 * Conversions a growth-facts write newly reached. A step counts only when it
 * is new in this write and recent: a replay that rebuilds old milestones, or
 * a step dated beyond the platforms' windows, sends nothing.
 * @param {Raw} before Growth facts before the write.
 * @param {Raw} after Growth facts after the write.
 * @param {number} nowMillis Current time.
 * @return {HostConversionName[]} Conversions to enqueue.
 */
export function newHostConversions(before: Raw, after: Raw,
  nowMillis: number): HostConversionName[] {
  if (!after) return [];
  const found: HostConversionName[] = [];
  const claimed = milestone(after, "claimedAt");
  if (claimed !== null && milestone(before, "claimedAt") === null &&
      nowMillis - claimed <= HOST_CONVERSION_MAX_AGE_MILLIS &&
      claimed <= nowMillis + 60_000) {
    found.push("organizer_signup");
  }
  const firstEvent = milestone(after, "firstEventAt");
  if (firstEvent !== null && milestone(before, "firstEventAt") === null &&
      claimed !== null &&
      nowMillis - firstEvent <= QUALIFYING_EVENT_LOOKBACK_MILLIS) {
    found.push("organizer_qualified");
  }
  return found;
}

/** Opaque event ID shared by every destination for one conversion. */
export function hostConversionEventId(organizerId: string,
  name: HostConversionName): string {
  return "hc_" + createHash("sha256")
    .update(`catch-host-conversion-v1:${organizerId}:${name}`)
    .digest("hex").slice(0, 32);
}

export const sha256Hex = (value: string) =>
  createHash("sha256").update(value, "utf8").digest("hex");

/** E.164 only; anything else is not a matching key. */
export function hashedPhone(value: unknown): string | null {
  return typeof value === "string" && /^\+[1-9][0-9]{7,14}$/u.test(value) ?
    sha256Hex(value) : null;
}

/** Trimmed and lowercased, as both platforms normalise email. */
export function hashedEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email) && email.length <= 254 ?
    sha256Hex(email) : null;
}

export const hashedOrganizerId = (organizerId: string) =>
  sha256Hex(`catch-host-organizer-v1:${organizerId}`);

const ownedStates = new Set(["userCreated", "claimed", "transferred"]);

/**
 * The owner whose sign-up this is, or null when the organizer is not a real,
 * owned business: programmatic listings, synthetic and demo organizers never
 * become advertising conversions.
 * @param {Raw} organizer Organizer document.
 * @return {string|null} Owner UID.
 */
export function conversionOwner(organizer: Raw): string | null {
  if (!organizer || organizer.synthetic === true ||
      organizer.demoOps === true || typeof organizer.demoOpsId === "string") {
    return null;
  }
  const ownership = organizer.ownership as Raw;
  const owner = ownership?.ownerUserId;
  return ownedStates.has(String(ownership?.state)) &&
    typeof owner === "string" && owner.length > 0 ? owner : null;
}
