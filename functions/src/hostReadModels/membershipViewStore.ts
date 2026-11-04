import {logger} from "firebase-functions";
import type {HostEventMembershipViewDocument as ViewDocument} from
  "../shared/generated/firestoreAdminTypes";
import {validateEventDocument} from
  "../shared/generated/validators/eventDocument";
import {validateEventAttendeeDocument} from
  "../shared/generated/validators/eventAttendeeDocument";
import {membershipIdentity, membershipReady} from
  "../eventSuccess/operations/membershipReader";
import {membershipResponse} from
  "../eventSuccess/operations/membershipTransitions";
import {readMembershipReceiverCandidates} from
  "../eventSuccess/operations/membershipReceivers";
import {
  isAssistanceDocumentId,
  MovementSourceInvalidError,
  operableEvent,
  parsing,
  planViewWrite,
} from "./movementViewSupport";
import {
  defaultGuestViewDeps,
  GuestViewDeps,
  membershipViewsCollection,
  GuestViewOutcome,
  readManagerMembership,
} from "./guestViewSupport";

type View = NonNullable<ViewDocument["view"]>;

/**
 * Re-evaluates one guest's membership view in one transaction: what the
 * retired getEventAssistanceMembership read for a manager (event, attendee,
 * organizer, plan, guest episode, membership) and every operator who could
 * receive the guest. The view is evaluated as if the time were one
 * millisecond before the event ends; receivers keep their uncapped authority
 * instants, and the phone applies the clock and the review window. Deleted
 * when the attendee or the event is gone (or the event moved organizer). A
 * source that fails validation records invalidSource and keeps the previous
 * view; nothing it causes throws.
 */
export async function reconcileMembershipView(
  db: FirebaseFirestore.Firestore,
  eventId: string,
  attendeeId: string,
  deps: GuestViewDeps = defaultGuestViewDeps
): Promise<GuestViewOutcome> {
  const outcome = await db.runTransaction(async (tx):
    Promise<GuestViewOutcome> => {
    const [eventSnap, attendeeSnap] = await tx.getAll(
      db.collection("events").doc(eventId),
      db.collection("eventAttendees").doc(attendeeId));
    const existing = await tx.get(db.collection(membershipViewsCollection)
      .where("eventId", "==", eventId).where("attendeeId", "==", attendeeId)
      .limit(5));
    const event = eventSnap.data();
    const attendee = attendeeSnap.data();
    const operable = isAssistanceDocumentId(attendeeId) ?
      operableEvent(eventId, event) : null;
    const id = operable ? membershipIdentity({context: operable.context,
      attendeeId}) : null;
    const stale = existing.docs.filter((doc) => doc.id !== id ||
      !attendee || attendee.eventId !== eventId);
    if (!operable || !attendee || attendee.eventId !== eventId) {
      for (const doc of stale) tx.delete(doc.ref);
      return {kind: "removed", existed: stale.length > 0};
    }
    const {context, endAtMillis} = operable;
    const viewRef = db.collection(membershipViewsCollection).doc(id!);
    const previousSnap = existing.docs.find((doc) => doc.id === id);
    const previous = previousSnap ? previousSnap.data() as ViewDocument :
      null;
    const nowStamp = deps.now();
    const now = nowStamp.toMillis();
    const keys = {membershipId: id!, eventId,
      organizerId: context.organizerId, attendeeId,
      eventEndAtMillis: endAtMillis};
    let view: View;
    let receivers: ViewDocument["receivers"];
    try {
      const read = await parsing(!validateEventDocument(event) ? "events" :
        !validateEventAttendeeDocument(attendee) ? "eventAttendees" :
          "eventAssistanceMemberships", () => readManagerMembership(db, tx,
        {context, attendeeId}, now));
      // Only managers read the view: authority is the manager's.
      const state = read;
      const beforeEnd = {...state, now: endAtMillis - 1};
      receivers = membershipReady(beforeEnd) ?
        await parsing("eventStaffGrants", () =>
          readMembershipReceiverCandidates(db, tx, {...state}, () => now)) :
        [];
      const response = await parsing("eventAssistanceMemberships", () =>
        membershipResponse("read", beforeEnd));
      const {serverTime: _serverTime, handoverReview: _review, ...rest} =
        response.view;
      void _serverTime;
      void _review;
      view = rest;
    } catch (error) {
      if (!(error instanceof MovementSourceInvalidError)) throw error;
      for (const doc of stale) tx.delete(doc.ref);
      const plan = planViewWrite(previous, {schemaVersion: 1 as const,
        ...keys, sourceCoverage: "invalidSource" as const,
        incompleteSource: error.source, view: previous?.view ?? null,
        receivers: previous?.receivers ?? []}, nowStamp);
      if (!plan.unchanged) tx.set(viewRef, plan.document);
      return {kind: "invalidSource", source: error.source,
        detail: error.detail, written: !plan.unchanged};
    }
    for (const doc of stale) tx.delete(doc.ref);
    const plan = planViewWrite(previous, {schemaVersion: 1 as const, ...keys,
      sourceCoverage: "complete" as const, incompleteSource: null, view,
      receivers}, nowStamp);
    if (plan.unchanged) return {kind: "unchanged", revision: plan.revision};
    tx.set(viewRef, plan.document);
    return {kind: "complete", revision: plan.revision};
  });
  // Logged once per committed evaluation, not once per transaction attempt.
  if (outcome.kind === "invalidSource") {
    logger.error("Live membership view read an invalid source.", {
      eventId, attendeeId, source: outcome.source, detail: outcome.detail});
  }
  return outcome;
}
