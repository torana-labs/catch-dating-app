import {SeatLedger} from "../seatAuthority/seatAuthority";
import {deriveEventSeatPolicy} from "../seatAuthority/firestoreAdapter";
import {requireEventSeatLedger} from "../seatAuthority/eventSeatLedgers";
import {HttpsError} from "firebase-functions/v2/https";
import type {EventDocument} from
  "../../shared/generated/firestoreAdminTypes";
import type {UpdatePrivateEventDetailsCallablePayload} from
  "../../shared/generated/updatePrivateEventDetailsCallablePayload";
import {EventPolicyBundleDocument, eventPolicyFromEvent, initialPolicyFromTerms,
  normalizeInviteCode, normalizePolicy} from "../eventPolicy";
import {prepareEventMutationLedger} from "../eventPolicyMutation";
import {canonicalJson} from
  "../../domain/formats/eventSetupPreferences/resolve";

export type PrivateAdmissionTerms = NonNullable<
  UpdatePrivateEventDetailsCallablePayload["details"]["admissionTerms"]
>;

/** Complete explicit price/capacity choices without changing offer snapshots.
 * Advanced admission restrictions are preserved, never silently made open.
 * A full `eventPolicy` and `constraints` replace them with the same rules the
 * published-event update applies: the policy is normalized and must agree with
 * the capacity, price and cancellation chosen beside it, and the age bounds
 * must be ordered.
 */
export function eventListingTermsPatch(event: EventDocument,
  terms: PrivateAdmissionTerms): Partial<EventDocument> {
  if (terms.priceInPaise === 0 ?
    terms.cancellationPolicyId !== "notApplicable" :
    terms.cancellationPolicyId === "notApplicable") {
    throw new HttpsError("invalid-argument",
      "Review the cancellation policy for this price.");
  }
  const constraints = terms.constraints ?
    listingConstraints(terms.constraints) :
    event.constraints ?? {minAge: 0, maxAge: 99, maxMen: null,
      maxWomen: null};
  if (terms.eventPolicy) {
    const policy = normalizePolicy(
      terms.eventPolicy as EventPolicyBundleDocument);
    if (policy.admission.capacityLimit !== terms.capacityLimit ||
        policy.pricing.basePriceInPaise !== terms.priceInPaise ||
        policy.cancellation.policyId !== terms.cancellationPolicyId) {
      throw new HttpsError("invalid-argument",
        "The admission policy must match the capacity, price and " +
        "cancellation policy.");
    }
    return {capacityLimit: terms.capacityLimit,
      priceInPaise: terms.priceInPaise, currency: terms.currency,
      eventPolicy: policy as EventDocument["eventPolicy"], constraints};
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
    currency: terms.currency, eventPolicy: policy, constraints};
}

/** The stored constraints shape, with the published update's age check. */
function listingConstraints(
  constraints: NonNullable<PrivateAdmissionTerms["constraints"]>
): NonNullable<EventDocument["constraints"]> {
  const minAge = constraints.minAge ?? 0;
  const maxAge = constraints.maxAge ?? 99;
  if (maxAge < minAge) {
    throw new HttpsError("invalid-argument",
      "maxAge must be greater than or equal to minAge");
  }
  return {minAge, maxAge, maxMen: constraints.maxMen ?? null,
    maxWomen: constraints.maxWomen ?? null};
}

/** The invite code an invite-only private event keeps in
 * `eventPrivateAccess/{eventId}`, as the published update syncs it: a new
 * code replaces the saved one, the saved one is kept otherwise, and an event
 * that is no longer invite-only drops it. Null means delete the document.
 */
export function privateListingInviteCode(params: {
  eventPolicy: EventDocument["eventPolicy"] | undefined;
  terms: PrivateAdmissionTerms;
  savedCode: unknown;
}): string | null {
  if (!params.eventPolicy?.admission?.inviteRequired) return null;
  const code = normalizeInviteCode(params.terms.privateAccess?.inviteCode) ??
    normalizeInviteCode(params.savedCode);
  if (!code || code.length < 4 || code.length > 64) {
    throw new HttpsError("invalid-argument",
      "Invite-only events need an invite code between 4 and 64 characters.");
  }
  return code;
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
}): Promise<{ledger: SeatLedger | null} | null> {
  const {db, tx, eventId, before, after} = params;
  const unchanged = canonicalJson([before.capacityLimit, before.priceInPaise,
    before.currency, before.eventPolicy, before.constraints]) ===
    canonicalJson([after.capacityLimit, after.priceInPaise,
      after.currency, after.eventPolicy, after.constraints]);
  await requireEventSeatLedger({db, tx, eventId});
  if (unchanged) return null;
  const state = await prepareEventMutationLedger(db, tx, eventId,
    before, after);
  // Reserved places keep their price and terms: only the capacity may
  // move, or the event's first terms be set.
  if (state.reserved > 0 &&
      deriveEventSeatPolicy(before).termsConfigured &&
      termsWithoutCapacity(before) !== termsWithoutCapacity(after)) {
    throw new HttpsError("failed-precondition",
      "Admission terms cannot change while places are reserved.");
  }
  return {ledger: state.update};
}

/** The listing terms an existing booking relies on, capacity left out. */
function termsWithoutCapacity(event: EventDocument): string {
  const policy = event.eventPolicy;
  return canonicalJson([event.priceInPaise, event.currency,
    policy ? {...policy, admission: {...policy.admission,
      capacityLimit: undefined}} : null,
    event.constraints]);
}
