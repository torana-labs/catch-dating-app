import type {EventDocument} from "../shared/generated/firestoreAdminTypes";
import {HttpsError} from "firebase-functions/v2/https";
import {
  evaluateHostMembershipContext,
  hostMembershipRestrictionCopy,
  readHostMembershipContext,
} from "./entitlementReader";
import {hostMembershipBenefitUseId} from "./ids";
import {collections} from "./membershipStore";

export interface PublicMemberQuoteTerms {
  priceInPaise: number;
  listPriceInPaise: number;
}

/**
 * Paid-membership terms for the website's paid checkout. Gates apply here
 * too; an included (free) member price is refused because paid checkout
 * collects at least ₹1, so the member books in the Catch app instead.
 */
export async function publicHostMembershipQuoteTerms(params: {
  db: FirebaseFirestore.Firestore; tx: FirebaseFirestore.Transaction;
  eventId: string; event: EventDocument; uid: string; nowMillis: number;
}): Promise<PublicMemberQuoteTerms | null> {
  const {event, nowMillis} = params;
  const context = await readHostMembershipContext({db: params.db,
    tx: params.tx, organizerId: event.organizerId ?? event.clubId,
    uid: params.uid, eventId: params.eventId, nowMillis});
  const entitlement = evaluateHostMembershipContext(context,
    event.priceInPaise ?? 0, nowMillis);
  if (!entitlement.admission.allowed) {
    throw new HttpsError("failed-precondition",
      hostMembershipRestrictionCopy[entitlement.admission.reason]);
  }
  if (!entitlement.memberPriceApplied) return null;
  if (entitlement.priceInPaise === 0) {
    throw new HttpsError("failed-precondition",
      "This event is included with your membership. Book it in the Catch app.");
  }
  return {priceInPaise: entitlement.priceInPaise,
    listPriceInPaise: entitlement.listPriceInPaise};
}

/** Best-effort savings record after a discounted public paid admission. */
export async function recordPublicMemberBenefitUse(params: {
  db: FirebaseFirestore.Firestore; eventId: string; uid: string;
  paidAmountPaise: number; nowMillis: number;
}): Promise<void> {
  const {db, eventId, uid, nowMillis} = params;
  const event = (await db.collection("events").doc(eventId).get()).data() as
    EventDocument | undefined;
  if (!event) return;
  const list = event.priceInPaise ?? 0;
  if (params.paidAmountPaise >= list) return;
  const context = await readHostMembershipContext({db,
    organizerId: event.organizerId ?? event.clubId, uid, eventId, nowMillis});
  const membership = context.membership;
  if (!membership) return;
  await db.collection(collections.benefitUses)
    .doc(hostMembershipBenefitUseId(eventId, uid))
    .create({schemaVersion: 1, membershipId: context.membershipId,
      organizerId: membership.organizerId, uid, eventId,
      planId: membership.planId, listPriceInPaise: list,
      paidPriceInPaise: params.paidAmountPaise,
      savingsInPaise: list - params.paidAmountPaise,
      eventStartMillis: event.startTime.toMillis(), state: "booked",
      createdAtMillis: nowMillis})
    .catch(() => undefined);
}
