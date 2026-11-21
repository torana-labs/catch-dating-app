import {isDeepStrictEqual} from "node:util";
import * as admin from "firebase-admin";
import {isEventPubliclyAccessible} from "./eventPublicationAccess";

/**
 * Public event copy (#1666).
 *
 * events/{id} holds booking counts by gender and cohort, Cross Paths pair
 * counts, admin search, demo markers, setup defaults, provider evidence and
 * the runtime join id, and Firestore rules cannot hide single fields. Guests
 * and the website read publicEvents/{id} instead, so events/{id} is limited
 * to the organizer's team and event staff. Fields are copied by allowlist: a
 * field added to events later stays private until it is deliberately listed
 * here and in public_events.schema.json. The host's visibility settings are
 * applied here, on the server, rather than only in the apps:
 * - a hidden price (priceHiddenUntilBookingOpens while Catch registration is
 *   closed) leaves out priceInPaise and zeroes every eventPolicy amount;
 * - a hidden guest list (showGuestList false) leaves out the checked-in and
 *   waitlisted counts. bookedCount stays: both apps and the website show
 *   places left (capacity minus booked) for every event.
 */
export const PUBLIC_EVENT_FIELDS = [
  "name", "organizerId", "startTime", "endTime", "meetingPoint",
  "meetingLocation", "startingPointLat", "startingPointLng",
  "locationDetails", "itinerary", "photoUrl", "eventPhotos", "distanceKm",
  "eventFormat", "pace", "capacityLimit", "description", "priceInPaise",
  "currency", "bookedCount", "checkedInCount", "waitlistedCount", "status",
  "cancelledAt", "cancellationReason", "publicRegistrationEnabled",
  "constraints", "eventPolicy", "crossPathsDiscoveryEnabled", "womenLed",
  "discoveryMarketId", "discoveryCityName", "discoveryActivityKind",
  "discoveryGeoCell", "discoveryHasOpenSpots", "discoveryAvailability",
  "discoveryOpenCohorts", "discoveryWaitlistCohorts",
  "discoveryInviteRequired", "discoveryMembershipRequired",
  "discoveryManualApprovalRequired", "discoveryMinAge", "discoveryMaxAge",
  "createdAt", "updatedAt", "planChangeRevision", "publicationState",
  "setupRevision", "eventCityId", "eventMarketId", "eventLocalDate",
  "eventLocalStartTime", "eventTimezone", "publicRegistrationMode",
  "publicRegistrationRevision", "firstPublishedAt",
  "catchExperienceActivities", "showGuestList",
  "priceHiddenUntilBookingOpens", "planVisibleToGuests", "organizerSummary",
  "externalBooking", "bookingQuestionIds", "followersFirstUntilMs",
  "seriesId", "seriesIndex",
] as const;

/**
 * Public fields computed from the canonical document rather than copied:
 * listing is always written so the list rule can require it, synthetic folds
 * the demo markers into one flag, and eventOrigin and runtimeAccess lose
 * their provider evidence and join id.
 */
export const PUBLIC_EVENT_DERIVED_FIELDS =
  ["listing", "synthetic", "eventOrigin", "runtimeAccess"] as const;

/** events fields that never reach the public copy. */
export const PRIVATE_EVENT_FIELDS = [
  "sourceVenueId", "genderCounts", "cohortCounts", "waitlistedCohortCounts",
  "crossPathsPairHeldCount", "crossPathsPairConfirmedCount",
  "crossPathsPairHeldCohortCounts", "adminSearch", "seedPrefix", "scenario",
  "demoOps", "demoOpsId", "demoOpsCommand", "setupDefaults",
] as const;

const DEMO_MARKERS = ["seedPrefix", "scenario", "demoOps", "demoOpsId",
  "demoOpsCommand"] as const;

export const PUBLIC_EVENTS = "publicEvents";

type Source = Record<string, unknown>;

const record = (value: unknown): Source | null =>
  value !== null && typeof value === "object" && !Array.isArray(value) ?
    value as Source : null;

/**
 * Whether guests may not see the price yet: the host hides it until Catch
 * registration opens. Mirrors EventX.priceHiddenForGuests in the apps.
 * @param {object} source The canonical event document.
 * @return {boolean} True while the price is hidden.
 */
export function publicEventPriceHidden(source: {
  priceHiddenUntilBookingOpens?: unknown;
  publicRegistrationEnabled?: unknown;
}): boolean {
  return source.priceHiddenUntilBookingOpens === true &&
    source.publicRegistrationEnabled !== true;
}

/**
 * The event policy with every amount zeroed, for a hidden price. Admission,
 * cancellation and settlement terms stay; demand pricing rules go, since
 * their steps and caps are amounts too.
 * @param {unknown} policy events/{id}.eventPolicy.
 * @return {unknown} The policy without prices.
 */
function withoutPrices(policy: unknown): unknown {
  const bundle = record(policy);
  const pricing = record(bundle?.pricing);
  if (!bundle || !pricing) return policy;
  const adjustments = record(pricing.cohortAdjustmentsInPaise) ?? {};
  return {...bundle, pricing: {...pricing, basePriceInPaise: 0,
    cohortAdjustmentsInPaise: Object.fromEntries(
      Object.keys(adjustments).map((cohort) => [cohort, 0])),
    demandPricingRules: []}};
}

/**
 * Copies the public allowlist out of a published event document and applies
 * the host's visibility settings.
 * @param {Source} source The canonical event document.
 * @return {Source} The public copy, before validation.
 */
export function projectPublicEvent(source: Source): Source {
  const projection: Source = {};
  for (const field of PUBLIC_EVENT_FIELDS) {
    if (source[field] !== undefined) projection[field] = source[field];
  }
  projection.listing = source.listing === "link" ? "link" : "listed";
  if (source.synthetic === true || source.dataOrigin === "catchDemo" ||
      DEMO_MARKERS.some((field) => source[field] != null)) {
    projection.synthetic = true;
  }
  const origin = record(source.eventOrigin);
  if (origin) {
    projection.eventOrigin = {...origin, externalEventId: null,
      sourceExternalEventId: null, adapterVersion: null, connectedAt: null,
      connectedBy: null};
  }
  const runtime = record(source.runtimeAccess);
  if (runtime) projection.runtimeAccess = {...runtime, publicRuntimeId: null};
  if (publicEventPriceHidden(source)) {
    delete projection.priceInPaise;
    if (projection.eventPolicy !== undefined) {
      projection.eventPolicy = withoutPrices(projection.eventPolicy);
    }
  }
  if (source.showGuestList === false) {
    delete projection.checkedInCount;
    delete projection.waitlistedCount;
  }
  return projection;
}

export type PublicEventOutcome = "written" | "unchanged" | "removed" | "absent";

interface PublicEventDeps {
  firestore: () => FirebaseFirestore.Firestore;
}

const defaultDeps: PublicEventDeps = {
  firestore: () => admin.firestore(),
};

/**
 * Rebuilds publicEvents/{id} from the current event inside a transaction, so
 * out-of-order trigger delivery cannot leave a stale copy. A private or
 * deleted event has no copy. The copy is not validated here: a published
 * event must never vanish for guests over a legacy field, and the contract
 * fixtures hold the allowlist to public_events.schema.json.
 * @param {string} eventId Event id.
 * @param {PublicEventDeps} deps Injectable Firebase dependencies.
 * @return {Promise<PublicEventOutcome>} What happened to the copy.
 */
export async function reconcilePublicEvent(eventId: string,
  deps: PublicEventDeps = defaultDeps): Promise<PublicEventOutcome> {
  const db = deps.firestore();
  const sourceRef = db.collection("events").doc(eventId);
  const publicRef = db.collection(PUBLIC_EVENTS).doc(eventId);
  return db.runTransaction(async (tx) => {
    const [sourceSnap, publicSnap] =
      await Promise.all([tx.get(sourceRef), tx.get(publicRef)]);
    const source = sourceSnap.exists ?
      sourceSnap.data() as Source : undefined;
    if (!source || !isEventPubliclyAccessible(source)) {
      if (!publicSnap.exists) return "absent" as const;
      tx.delete(publicRef);
      return "removed" as const;
    }
    const projection = projectPublicEvent(source);
    if (publicSnap.exists && isDeepStrictEqual(publicSnap.data(),
      projection)) {
      return "unchanged" as const;
    }
    tx.set(publicRef, projection);
    return "written" as const;
  });
}

/**
 * Creates, refreshes or removes the copy for every event. Dry run by default.
 * It writes only publicEvents documents and never changes an events document.
 * @param {PublicEventDeps} deps Injectable Firebase dependencies.
 * @param {boolean} apply Whether to write.
 * @return {Promise<Record<string, number>>} Counts by outcome.
 */
export async function backfillPublicEvents(deps: PublicEventDeps,
  apply: boolean): Promise<Record<string, number>> {
  const db = deps.firestore();
  const counts: Record<string, number> = {};
  const count = (key: string) => {
    counts[key] = (counts[key] ?? 0) + 1;
  };
  for (const collection of ["events", PUBLIC_EVENTS]) {
    let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
    for (;;) {
      let query = db.collection(collection)
        .orderBy(admin.firestore.FieldPath.documentId()).limit(200);
      if (cursor) query = query.startAfter(cursor);
      const page = await query.get();
      for (const doc of page.docs) {
        // A copy whose event still exists was handled in the events pass.
        if (collection === PUBLIC_EVENTS &&
            (await db.collection("events").doc(doc.id).get()).exists) {
          continue;
        }
        if (apply) {
          count(await reconcilePublicEvent(doc.id, deps));
        } else if (collection === PUBLIC_EVENTS) {
          count("orphanCopy");
        } else {
          count(isEventPubliclyAccessible(doc.data()) ?
            "published" : "notPublished");
        }
      }
      if (page.docs.length < 200) break;
      cursor = page.docs[page.docs.length - 1];
    }
  }
  return counts;
}
