import {randomUUID} from "crypto";
import {SeatLedger} from "../seatAuthority/seatAuthority";
import {deriveEventSeatPolicy} from "../seatAuthority/firestoreAdapter";
import {HttpsError} from "firebase-functions/v2/https";
import type {EventDocument} from
  "../../shared/generated/firestoreAdminTypes";
import type {UpdatePrivateEventDetailsCallablePayload} from
  "../../shared/generated/updatePrivateEventDetailsCallablePayload";
import {eventPolicyFromEvent, initialPolicyFromTerms, normalizePolicy} from
  "../eventPolicy";
import {prepareEventMutationLedger} from "../eventPolicyMutation";
import {readSeatMigrationWriterFence} from "../seatMigrationPaged";
import {canonicalJson} from "../eventSetupPreferences/resolve";

export type PrivateAdmissionTerms = NonNullable<
  UpdatePrivateEventDetailsCallablePayload["details"]["admissionTerms"]
>;

/** Complete explicit price/capacity choices without changing offer snapshots.
 * Advanced admission restrictions are preserved, never silently made open.
 */
export function eventListingTermsPatch(event: EventDocument,
  terms: PrivateAdmissionTerms): Partial<EventDocument> {
  if (terms.priceInPaise === 0 ?
    terms.cancellationPolicyId !== "notApplicable" :
    terms.cancellationPolicyId === "notApplicable") {
    throw new HttpsError("invalid-argument",
      "Review the cancellation policy for this price.");
  }
  const configured = {...event, capacityLimit: terms.capacityLimit,
    priceInPaise: terms.priceInPaise};
  const previous = configured.eventPolicy ?
    eventPolicyFromEvent(configured) : initialPolicyFromTerms(configured);
  const policy = normalizePolicy({...previous,
    admission: {...previous.admission, capacityLimit: terms.capacityLimit},
    pricing: {...previous.pricing, basePriceInPaise: terms.priceInPaise},
    cancellation: {policyId: terms.cancellationPolicyId}});
  return {capacityLimit: terms.capacityLimit, priceInPaise: terms.priceInPaise,
    currency: terms.currency, eventPolicy: policy,
    constraints: event.constraints ?? {minAge: 0, maxAge: 99,
      maxMen: null, maxWomen: null}};
}

/** Read-only preparation; the caller applies the returned ledger with its event
 * write after completing every other transaction read.
 */
export async function preparePrivateListingTerms(params: {
  db: FirebaseFirestore.Firestore;
  tx: FirebaseFirestore.Transaction;
  eventId: string;
  before: EventDocument;
  after: EventDocument;
}): Promise<{ledger: SeatLedger | null;
  fence?: Record<string, unknown>} | null> {
  const {db, tx, eventId, before, after} = params;
  const unchanged = canonicalJson([before.capacityLimit, before.priceInPaise,
    before.currency, before.eventPolicy, before.constraints]) ===
    canonicalJson([after.capacityLimit, after.priceInPaise,
      after.currency, after.eventPolicy, after.constraints]);
  const mode = await readSeatMigrationWriterFence({db, tx, eventId});
  if (mode === "ready") {
    if (unchanged) return null;
    const state = await prepareEventMutationLedger(db, tx, eventId,
      before, after);
    if (state.reserved > 0) {
      throw new HttpsError("failed-precondition",
        "Admission terms cannot change while places are reserved.");
    }
    return {ledger: state.update};
  }
  const markers = before as unknown as Record<string, unknown>;
  if (markers.demoOps === true || markers.synthetic === true ||
      typeof markers.seedPrefix === "string") {
    throw new HttpsError("failed-precondition",
      "Demo events need their own seat reconciliation.");
  }
  const run = await tx.get(db.collection("eventSeatMigrationRuns")
    .doc(eventId));
  if (run.exists) {
    throw new HttpsError("failed-precondition",
      "Resume event seat reconciliation first.");
  }
  // Before the shared ledger exists, only a demonstrably empty source can
  // change admission terms. Offers alone are not reserved places.
  if (before.bookedCount !== 0 || before.checkedInCount !== 0 ||
      before.waitlistedCount !== 0 ||
      (before.crossPathsPairHeldCount ?? 0) !== 0 ||
      (before.crossPathsPairConfirmedCount ?? 0) !== 0 ||
      [before.genderCounts, before.cohortCounts,
        before.waitlistedCohortCounts, before.crossPathsPairHeldCohortCounts]
        .some((counts) => Object.values(counts ?? {}).some((n) => n !== 0))) {
    throw new HttpsError("failed-precondition",
      "Reconcile existing guests before changing admission terms.");
  }
  for (const collection of ["eventAttendees", "eventParticipations",
    "eventWaitlistOffers", "publicEventPayments", "payments",
    "organizerEventOfferPayments", "organizerContactOrigins",
    "eventSeatReservations", "eventSeatIdentityAliases",
    "eventAttendeeImports", "razorpayPendingOrders"]) {
    const witness = await tx.get(db.collection(collection)
      .where("eventId", "==", eventId).limit(1));
    if (!witness.empty) {
      throw new HttpsError("failed-precondition",
        "Reconcile existing guest and payment records first.");
    }
  }
  const policy = deriveEventSeatPolicy(after);
  const ledger: SeatLedger = {eventId, capacity: policy.capacity,
    occupied: 0, checkoutHeld: 0, revision: 1, capacityRevision: 1,
    policyVersion: policy.policyVersion, policyHash: policy.policyHash,
    migrationRevision: 1, state: "ready"};
  return {ledger, fence: {eventId, organizerId: policy.organizerId,
    migrationRevision: 1, token: randomUUID(), state: "ready"}};
}
