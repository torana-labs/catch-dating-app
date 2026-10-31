import type {EventDocument} from "../shared/generated/firestoreAdminTypes";
import {marketForIdOrAlias} from "../locations/marketConfig";
import {
  cohortIds,
  EventCohortId,
  EventPolicyBundleDocument,
  EventRosterSnapshot,
  eventPolicyFromEvent,
  rosterFromEvent,
} from "./eventPolicy";

export const eventDiscoveryGeoCellSizeDegrees = 0.08;

type DiscoveryAvailability = "open" | "waitlist" | "gated" | "full" |
  "cancelled";

type EventDiscoveryProjectionInput = {
  event: EventDiscoveryProjectionSource;
  organizerLocation?: string | null;
  organizerLocationMarketId?: string | null;
  bookedCount?: number;
};

type EventDiscoveryField =
  "discoveryMarketId" |
  "discoveryCityName" |
  "discoveryActivityKind" |
  "discoveryGeoCell" |
  "discoveryHasOpenSpots" |
  "discoveryAvailability" |
  "discoveryOpenCohorts" |
  "discoveryWaitlistCohorts" |
  "discoveryInviteRequired" |
  "discoveryMembershipRequired" |
  "discoveryManualApprovalRequired" |
  "discoveryMinAge" |
  "discoveryMaxAge";

type EventDiscoveryProjection = Pick<EventDocument, EventDiscoveryField>;

type EventDiscoveryProjectionSource =
  Omit<EventDocument, EventDiscoveryField> &
  Partial<Pick<EventDocument, EventDiscoveryField>>;

type DiscoveryCohortId = Exclude<EventCohortId, "unspecified">;
const discoveryCohortIds = Object.values(cohortIds).filter(
  (id): id is DiscoveryCohortId => id !== "unspecified");

/**
 * Builds the callable-owned fields that let Explore query events directly.
 * @param {EventDiscoveryProjectionInput} input Event plus club city context.
 * @return {Partial<EventDocument>} Projection fields for events/{eventId}.
 */
export function eventDiscoveryProjection(
  input: EventDiscoveryProjectionInput
): EventDiscoveryProjection {
  const event = input.event;
  const policy = eventPolicyFromEvent(event as EventDocument);
  const bookedCount = Math.max(0, Math.trunc(
    input.bookedCount ?? event.bookedCount ?? 0
  ));
  const projectedEvent = {...event, bookedCount};
  const roster = rosterFromEvent(projectedEvent as EventDocument);
  const isCancelled = event.status === "cancelled";
  const pairInventory = policy.admission.crossPathsPairInventory;
  const reservedPairCapacity = pairInventory?.enabled ?
    pairInventory.reservedPairCapacity : 0;
  const confirmedPairCount = Math.max(
    0,
    Math.trunc(event.crossPathsPairConfirmedCount ?? 0)
  );
  const generalBookedCount = Math.max(0, bookedCount - confirmedPairCount);
  const generalCapacity = Math.max(
    0,
    policy.admission.capacityLimit - reservedPairCapacity
  );
  const hasOpenSpots =
    !isCancelled && generalBookedCount < generalCapacity;
  const waitlistOpen =
    policy.admission.waitlistPolicy?.mode !== "disabled";
  const gated =
    policy.admission.inviteRequired === true ||
    policy.admission.membershipRequired === true ||
    policy.admission.manualApprovalRequired === true ||
    policy.admission.format === "inviteOnly" ||
    policy.admission.format === "membersOnly" ||
    policy.admission.format === "manualApproval";
  const availability: DiscoveryAvailability = isCancelled ?
    "cancelled" :
    gated ?
      "gated" :
      hasOpenSpots ?
        "open" :
        waitlistOpen ?
          "waitlist" :
          "full";
  const latitude = requiredDiscoveryCoordinate(
    event.meetingLocation?.latitude ?? event.startingPointLat,
    "latitude",
    -90,
    90
  );
  const longitude = requiredDiscoveryCoordinate(
    event.meetingLocation?.longitude ?? event.startingPointLng,
    "longitude",
    -180,
    180
  );
  const cohortProjection = discoveryCohortProjection({
    policy,
    roster,
    gated,
    isCancelled,
  });

  return {
    discoveryMarketId: normalizeDiscoveryMarketId({
      marketId: input.organizerLocationMarketId,
      location: input.organizerLocation,
    }),
    discoveryCityName: normalizeDiscoveryCityName({
      location: input.organizerLocation,
      marketId: input.organizerLocationMarketId,
    }),
    discoveryActivityKind:
      event.eventFormat?.activityKind ?? "socialRun",
    discoveryGeoCell: discoveryGeoCellFor(latitude, longitude),
    discoveryHasOpenSpots: hasOpenSpots,
    discoveryAvailability: availability,
    discoveryOpenCohorts: cohortProjection.open,
    discoveryWaitlistCohorts: cohortProjection.waitlist,
    discoveryInviteRequired:
      policy.admission.inviteRequired === true ||
      policy.admission.format === "inviteOnly",
    discoveryMembershipRequired:
      policy.admission.membershipRequired === true ||
      policy.admission.format === "membersOnly",
    discoveryManualApprovalRequired:
      policy.admission.manualApprovalRequired === true ||
      policy.admission.format === "manualApproval",
    discoveryMinAge: event.constraints?.minAge ?? 0,
    discoveryMaxAge: event.constraints?.maxAge ?? 99,
  };
}

/**
 * Normalizes a club city/location slug for event discovery indexes.
 * @param {{location?: string | null, marketId?: string | null}} input Raw
 * club location and canonical market id.
 * @return {string} Lowercase city slug.
 */
export function normalizeDiscoveryCityName(input: {
  location?: string | null;
  marketId?: string | null;
}): string {
  const market = marketForIdOrAlias(input.marketId) ??
    marketForIdOrAlias(input.location);
  if (market) return market.slug;
  const normalized = (input.location ?? "").trim().toLowerCase();
  if (normalized.length > 0) return normalized;
  throw new Error("Event discovery projection requires a club city slug.");
}

/**
 * Normalizes canonical market identity for event discovery indexes.
 * @param {{marketId?: string | null, location?: string | null}} input Club
 * market projection and legacy location fallback.
 * @return {string} Canonical market id.
 */
export function normalizeDiscoveryMarketId(input: {
  marketId?: string | null;
  location?: string | null;
}): string {
  const market = marketForIdOrAlias(input.marketId) ??
    marketForIdOrAlias(input.location);
  if (!market) {
    throw new Error("Event discovery projection requires a club market id.");
  }
  return market.marketId;
}

/**
 * Returns the coarse geo-cell key used by event discovery queries.
 * @param {number} latitude Latitude.
 * @param {number} longitude Longitude.
 * @return {string} Stable cell key.
 */
export function discoveryGeoCellFor(
  latitude: number,
  longitude: number
): string {
  const latBucket = Math.floor(latitude / eventDiscoveryGeoCellSizeDegrees);
  const lngBucket = Math.floor(longitude / eventDiscoveryGeoCellSizeDegrees);
  return `${latBucket}:${lngBucket}`;
}

/**
 * Requires a finite event coordinate before publishing discovery projection.
 * @param {unknown} value Candidate coordinate.
 * @param {string} field Coordinate label.
 * @param {number} minimum Minimum accepted value.
 * @param {number} maximum Maximum accepted value.
 * @return {number} Validated coordinate.
 */
function requiredDiscoveryCoordinate(
  value: unknown,
  field: string,
  minimum: number,
  maximum: number
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new Error(`Event discovery requires a valid ${field}.`);
  }
  return value;
}

/**
 * Computes coarse cohort buckets for Firestore event discovery indexes.
 * @param {{policy: EventPolicyBundleDocument, roster: EventRosterSnapshot,
 * gated: boolean, isCancelled: boolean}} params Projection inputs.
 * @return {object} Open and waitlist cohort buckets.
 */
function discoveryCohortProjection(params: {
  policy: EventPolicyBundleDocument;
  roster: EventRosterSnapshot;
  gated: boolean;
  isCancelled: boolean;
}): {open: DiscoveryCohortId[]; waitlist: DiscoveryCohortId[]} {
  if (params.isCancelled || params.gated) {
    return {open: [], waitlist: []};
  }
  const open: DiscoveryCohortId[] = [];
  const waitlist: DiscoveryCohortId[] = [];
  for (const cohortId of discoveryCohortIds) {
    const availability = cohortDiscoveryAvailability({
      policy: params.policy,
      roster: params.roster,
      cohortId,
    });
    if (availability === "open") open.push(cohortId);
    if (availability === "waitlist") waitlist.push(cohortId);
  }
  return {open, waitlist};
}

/**
 * Resolves indexable slot state for a single standard event cohort.
 * @param {{policy: EventPolicyBundleDocument, roster: EventRosterSnapshot,
 * cohortId: string}} params Policy, roster, and cohort id.
 * @return {"open"|"waitlist"|null} Coarse discovery availability.
 */
function cohortDiscoveryAvailability(params: {
  policy: EventPolicyBundleDocument;
  roster: EventRosterSnapshot;
  cohortId: string;
}): "open" | "waitlist" | null {
  const admission = params.policy.admission;
  if (params.roster.totalBooked >= admission.capacityLimit) {
    return waitlistAvailability(admission);
  }

  const cohortLimit = admission.cohortCapacityLimits?.[params.cohortId];
  if (cohortLimit != null &&
      (params.roster.bookedCountsByCohort[params.cohortId] ?? 0) >=
        cohortLimit) {
    return waitlistAvailability(admission);
  }

  const ratio = admission.balancedRatioPolicy;
  if (admission.format !== "balancedRatio" || !ratio) return "open";

  const applies = params.cohortId === ratio.leftCohortId ||
    params.cohortId === ratio.rightCohortId;
  if (!applies) {
    switch (ratio.outOfRatioCohortPolicy) {
    case "admitWithinGeneralCapacity":
      return "open";
    case "waitlist":
      return waitlistAvailability(admission);
    case "manualReview":
    case "reject":
      return null;
    }
  }

  const counterpartId = params.cohortId === ratio.leftCohortId ?
    ratio.rightCohortId :
    ratio.leftCohortId;
  const currentCount =
    params.roster.bookedCountsByCohort[params.cohortId] ?? 0;
  const counterpartCount =
    params.roster.bookedCountsByCohort[counterpartId] ?? 0;
  const nextCount = currentCount + 1;
  if (counterpartCount === 0 &&
      currentCount < ratio.openingBufferPerCohort) {
    return "open";
  }
  if (nextCount <= counterpartCount + ratio.maxSkew) return "open";
  return waitlistAvailability(admission);
}

/**
 * Returns the waitlist bucket only when the event has an enabled waitlist.
 * @param {object} admission Admission policy.
 * @return {string|null} Waitlist availability.
 */
function waitlistAvailability(
  admission: EventPolicyBundleDocument["admission"]
): "waitlist" | null {
  return admission.waitlistPolicy?.mode !== "disabled" ? "waitlist" : null;
}
