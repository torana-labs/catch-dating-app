/**
 * Events-owned writes to events/{eventId} for the contexts that keep an
 * event's derived state current: bookings move its counters, connections
 * release Cross Paths pair holds, organizers refresh its organizer summary
 * and provider origin, Admin edits its details and the website disposes of
 * try-it drafts.
 *
 * Each caller computes the values; this module owns which fields each
 * purpose may change and how they are written. Every function stages its
 * write on the caller's transaction or batch, so the caller's read/write
 * order, FieldValue sentinels and atomicity are unchanged, and rejects any
 * field outside its purpose's allowlist before staging anything.
 */

import type {EventDocument} from
  "../../shared/generated/firestoreAdminTypes";
import type {EventOrganizerSummary} from
  "../../shared/generated/eventOrganizerSummary";
import type {EventOrigin} from "../../shared/generated/eventOrigin";
import * as admin from "firebase-admin";
import {eventCohortCountFields, eventCohortCountsRef} from
  "./eventCohortCounts";

/** Thrown when a caller asks to write a field its purpose does not own. */
export class EventDocumentWriteError extends Error {
  /**
   * @param {string} message What was refused and why.
   */
  constructor(message: string) {
    super(message);
    this.name = "EventDocumentWriteError";
  }
}

/** A transaction or batch that can stage an update. */
export type EventDocumentUpdater = {
  update(
    ref: FirebaseFirestore.DocumentReference,
    data: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>
  ): unknown;
};

/** A transaction or batch that can also stage a set, for cohort totals. */
export type EventCounterWriter = EventDocumentUpdater & {
  set(
    ref: FirebaseFirestore.DocumentReference,
    data: FirebaseFirestore.DocumentData,
    options: FirebaseFirestore.SetOptions
  ): unknown;
};

/** A field value, or a FieldValue sentinel such as increment or delete. */
type Writable<T> = T | FirebaseFirestore.FieldValue;

/**
 * The Explore projection fields eventDiscoveryProjection computes. Every
 * write that changes availability rewrites them together.
 */
export const eventDiscoveryProjectionFields = [
  "discoveryMarketId",
  "discoveryCityName",
  "discoveryActivityKind",
  "discoveryGeoCell",
  "discoveryHasOpenSpots",
  "discoveryAvailability",
  "discoveryOpenCohorts",
  "discoveryWaitlistCohorts",
  "discoveryInviteRequired",
  "discoveryMembershipRequired",
  "discoveryManualApprovalRequired",
  "discoveryMinAge",
  "discoveryMaxAge",
] as const satisfies ReadonlyArray<keyof EventDocument>;

type DiscoveryProjectionField = typeof eventDiscoveryProjectionFields[number];
type DiscoveryProjectionPatch = {
  [K in DiscoveryProjectionField]?: Writable<EventDocument[K]>;
};

/** Cross Paths pair-hold counters a pair hold reserves and releases. */
export const eventPairHoldCounterFields = [
  "crossPathsPairHeldCount",
  "crossPathsPairHeldCohortCounts",
  "crossPathsPairConfirmedCount",
] as const satisfies ReadonlyArray<keyof EventDocument>;

/**
 * Booking counters: places booked, waitlisted and checked in, their gender
 * and cohort breakdowns, the pair-hold counters a pair booking confirms,
 * the timestamp and the discovery projection they feed. A key may also be a
 * dotted path into one of the map counters (`genderCounts.<gender>`).
 */
export const eventBookingCounterFields = [
  "bookedCount",
  "waitlistedCount",
  "checkedInCount",
  "genderCounts",
  "cohortCounts",
  "waitlistedCohortCounts",
  ...eventPairHoldCounterFields,
  "updatedAt",
  ...eventDiscoveryProjectionFields,
] as const satisfies ReadonlyArray<keyof EventDocument>;

type BookingCounterField = typeof eventBookingCounterFields[number];
export type EventBookingCountersPatch = {
  [K in BookingCounterField]?: Writable<EventDocument[K]>;
} & {
  [path: `genderCounts.${string}`]: Writable<number>;
};

export type EventPairHoldCountersPatch = {
  [K in typeof eventPairHoldCounterFields[number]]?:
    Writable<EventDocument[K]>;
};

/** Public registration mode, its derived flag, revision and timestamp. */
export const eventPublicRegistrationFields = [
  "publicRegistrationMode",
  "publicRegistrationEnabled",
  "publicRegistrationRevision",
  "updatedAt",
] as const satisfies ReadonlyArray<keyof EventDocument>;

export type EventPublicRegistrationPatch = {
  [K in typeof eventPublicRegistrationFields[number]]?: EventDocument[K];
};

/**
 * The event details Admin may edit, the Admin search projection those edits
 * rebuild and the discovery projection they feed.
 */
export const eventAdminDetailsFields = [
  "description",
  "photoUrl",
  "distanceKm",
  "pace",
  "crossPathsDiscoveryEnabled",
  "eventFormat",
  "womenLed",
  "adminSearch",
  ...eventDiscoveryProjectionFields,
] as const satisfies ReadonlyArray<keyof EventDocument>;

type AdminDetailsField = typeof eventAdminDetailsFields[number];
type AdminSearchProjection = NonNullable<EventDocument["adminSearch"]>;
export type EventAdminDetailsPatch = {
  [K in Exclude<AdminDetailsField, "adminSearch">]?:
    Writable<EventDocument[K]>;
} & DiscoveryProjectionPatch & {
  /** Its timestamp may be a server-timestamp sentinel. */
  adminSearch?: Omit<AdminSearchProjection, "updatedAt"> & {
    updatedAt: Writable<AdminSearchProjection["updatedAt"]>;
  };
};

/**
 * An event origin as written: the stored origin with the fields a provider
 * connection changes. It is spread from the stored origin, which older
 * events may lack, so every field is optional.
 */
export type EventOriginWrite = Partial<Omit<EventOrigin, "connectedAt">> & {
  connectedAt?: FirebaseFirestore.Timestamp | null;
};

/**
 * Collections keyed by the event id that hold the event's own setup state
 * and go with it when the event is deleted.
 */
export const eventKeyedSetupCollections =
  ["eventSetupPreferences", "eventPrivateAccess"] as const;

/**
 * Stages an update of an event's booking counters.
 * @param {EventDocumentUpdater} writer The caller's transaction or batch.
 * @param {FirebaseFirestore.DocumentReference} eventRef events/{eventId}.
 * @param {EventBookingCountersPatch} patch Counter values or sentinels.
 */
export function updateEventBookingCounters(
  writer: EventCounterWriter,
  eventRef: FirebaseFirestore.DocumentReference,
  patch: EventBookingCountersPatch
): void {
  stageCounterUpdate("booking counters", eventBookingCounterFields, writer,
    eventRef, patch);
}

/**
 * Stages an update of an event's Cross Paths pair-hold counters, as a hold
 * is released.
 * @param {EventDocumentUpdater} writer The caller's transaction.
 * @param {FirebaseFirestore.DocumentReference} eventRef events/{eventId}.
 * @param {EventPairHoldCountersPatch} patch Pair-hold counter values.
 */
export function updateEventPairHoldCounters(
  writer: EventCounterWriter,
  eventRef: FirebaseFirestore.DocumentReference,
  patch: EventPairHoldCountersPatch
): void {
  stageCounterUpdate("pair-hold counters", eventPairHoldCounterFields, writer,
    eventRef, patch);
}

/**
 * Stages an update of the organizer summary an event carries.
 * @param {EventDocumentUpdater} writer The caller's transaction.
 * @param {FirebaseFirestore.DocumentReference} eventRef events/{eventId}.
 * @param {EventOrganizerSummary} organizerSummary The summary to store.
 */
export function updateEventOrganizerSummary(
  writer: EventDocumentUpdater,
  eventRef: FirebaseFirestore.DocumentReference,
  organizerSummary: EventOrganizerSummary
): void {
  stageUpdate("organizer summary", ["organizerSummary"], writer, eventRef,
    {organizerSummary});
}

/**
 * Stages an update of an event's public registration configuration.
 * @param {EventDocumentUpdater} writer The caller's transaction.
 * @param {FirebaseFirestore.DocumentReference} eventRef events/{eventId}.
 * @param {EventPublicRegistrationPatch} patch Registration fields.
 */
export function updateEventPublicRegistration(
  writer: EventDocumentUpdater,
  eventRef: FirebaseFirestore.DocumentReference,
  patch: EventPublicRegistrationPatch
): void {
  stageUpdate("public registration", eventPublicRegistrationFields, writer,
    eventRef, patch);
}

/**
 * Stages an update of an event's origin as a roster provider is connected
 * or disconnected. The caller passes the whole origin it computed.
 * @param {EventDocumentUpdater} writer The caller's batch.
 * @param {FirebaseFirestore.DocumentReference} eventRef events/{eventId}.
 * @param {EventOriginWrite} eventOrigin The event origin to store.
 */
export function updateEventProviderOrigin(
  writer: EventDocumentUpdater,
  eventRef: FirebaseFirestore.DocumentReference,
  eventOrigin: EventOriginWrite
): void {
  stageUpdate("provider origin", ["eventOrigin"], writer, eventRef,
    {eventOrigin});
}

/**
 * Stages an Admin edit of an event's details with the projections it
 * rebuilds.
 * @param {EventDocumentUpdater} writer The caller's transaction.
 * @param {FirebaseFirestore.DocumentReference} eventRef events/{eventId}.
 * @param {EventAdminDetailsPatch} patch Edited details and projections.
 */
export function updateEventAdminDetails(
  writer: EventDocumentUpdater,
  eventRef: FirebaseFirestore.DocumentReference,
  patch: EventAdminDetailsPatch
): void {
  stageUpdate("admin details", eventAdminDetailsFields, writer, eventRef,
    patch);
}

/**
 * Stages the deletion of a try-it draft event and its event-keyed setup
 * state. The caller has read the event in this transaction and checked it
 * is still a disposable draft.
 * @param {FirebaseFirestore.Transaction} tx The caller's transaction.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} eventId The draft event.
 * @return {number} How many documents the deletion stages.
 */
export function deleteTryItDraftEvent(
  tx: Pick<FirebaseFirestore.Transaction, "delete">,
  db: FirebaseFirestore.Firestore,
  eventId: string
): number {
  tx.delete(db.collection("events").doc(eventId));
  for (const collection of eventKeyedSetupCollections) {
    tx.delete(db.collection(collection).doc(eventId));
  }
  return 1 + eventKeyedSetupCollections.length;
}

/**
 * Checks the reference and every patch key against the purpose's
 * allowlist, then stages one update with the patch exactly as given.
 * @param {string} purpose Write purpose, for the error message.
 * @param {ReadonlyArray<string>} allowed Top-level fields it may change.
 * @param {EventDocumentUpdater} writer Transaction or batch.
 * @param {FirebaseFirestore.DocumentReference} eventRef events/{eventId}.
 * @param {object} patch Fields to update.
 */
/**
 * Stages a counter update. Cohort totals (orientation, #2493) go to the
 * server-only eventCohortCounts document, one map per field, and
 * the event's legacy copy of each such map is removed in the same write.
 * @param {string} purpose What the write is for, in errors.
 * @param {ReadonlyArray<string>} allowed Top-level fields it may change.
 * @param {EventCounterWriter} writer The caller's transaction or batch.
 * @param {FirebaseFirestore.DocumentReference} eventRef events/{eventId}.
 * @param {object} patch Counter values or sentinels.
 */
function stageCounterUpdate(
  purpose: string,
  allowed: ReadonlyArray<string>,
  writer: EventCounterWriter,
  eventRef: FirebaseFirestore.DocumentReference,
  patch: object
): void {
  const eventPatch: Record<string, unknown> = {};
  const cohortPatch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    const field = key.split(".")[0];
    if ((eventCohortCountFields as ReadonlyArray<string>).includes(field)) {
      if (key !== field) {
        throw new EventDocumentWriteError(
          `Event ${purpose} write must replace ${field} whole, not ${key}.`);
      }
      cohortPatch[field] = value;
      eventPatch[field] = admin.firestore.FieldValue.delete();
    } else {
      eventPatch[key] = value;
    }
  }
  stageUpdate(purpose, allowed, writer, eventRef, eventPatch);
  const fields = Object.keys(cohortPatch);
  if (fields.length > 0) {
    writer.set(eventCohortCountsRef(eventRef.firestore, eventRef.id),
      {eventId: eventRef.id, ...cohortPatch,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()},
      // Each map holds every cohort key the read map held (counts drop to 0,
      // never vanish), so a merge leaves exactly the written totals.
      {merge: true});
  }
}

function stageUpdate(
  purpose: string,
  allowed: ReadonlyArray<string>,
  writer: EventDocumentUpdater,
  eventRef: FirebaseFirestore.DocumentReference,
  patch: object
): void {
  if (!/^events\/[^/]+$/u.test(eventRef.path)) {
    throw new EventDocumentWriteError(
      `Event ${purpose} write needs an events/{eventId} reference, ` +
      `got ${eventRef.path}.`);
  }
  const refused = Object.keys(patch)
    .filter((key) => !allowed.includes(key.split(".")[0]));
  if (refused.length > 0) {
    throw new EventDocumentWriteError(
      `Event ${purpose} write may not change ${refused.sort().join(", ")}.`);
  }
  writer.update(eventRef,
    patch as FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>);
}
