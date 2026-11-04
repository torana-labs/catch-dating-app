import {logger} from "firebase-functions";
import type {HostEventAccountabilityViewDocument as ViewDocument} from
  "../shared/generated/firestoreAdminTypes";
import {validateEventDocument} from
  "../shared/generated/validators/eventDocument";
import {validateEventAttendeeDocument} from
  "../shared/generated/validators/eventAttendeeDocument";
import {eventSuccessPrimitivesFor} from "../eventSuccess/formatPrimitives";
import {accountabilityState} from
  "../eventSuccess/operations/accountabilityProjection";
import {
  isAssistanceDocumentId,
  MovementSourceInvalidError,
  operableEvent,
  parsing,
  planViewWrite,
} from "./movementViewSupport";
import {
  accountabilityViewsCollection,
  defaultGuestViewDeps,
  GuestViewDeps,
  GuestViewOutcome,
  readManagerMembership,
} from "./guestViewSupport";

export function accountabilityViewId(eventId: string, attendeeId: string) {
  return `${eventId}_${attendeeId}`;
}

/**
 * Re-evaluates one guest's sweep accountability view (the scope
 * {context, groupId: event:whole, attendeeId}) in one transaction: the event,
 * the attendee, the organizer, the event success plan, the guest's episode
 * and membership, as the retired getEventAssistanceAccountability read them.
 * Deleted when the attendee or the event is gone, or the format has no sweep.
 * A source that fails validation records invalidSource and keeps the
 * previous view; nothing it causes throws.
 */
export async function reconcileAccountabilityView(
  db: FirebaseFirestore.Firestore,
  eventId: string,
  attendeeId: string,
  deps: GuestViewDeps = defaultGuestViewDeps
): Promise<GuestViewOutcome> {
  const id = accountabilityViewId(eventId, attendeeId);
  const outcome = await db.runTransaction(async (tx):
    Promise<GuestViewOutcome> => {
    const viewRef = db.collection(accountabilityViewsCollection).doc(id);
    const [viewSnap, eventSnap, attendeeSnap] = await tx.getAll(viewRef,
      db.collection("events").doc(eventId),
      db.collection("eventAttendees").doc(attendeeId));
    const previous = viewSnap.exists ? viewSnap.data() as ViewDocument : null;
    const event = eventSnap.data();
    const attendee = attendeeSnap.data();
    const operable = operableEvent(eventId, event);
    if (!operable || !attendee || attendee.eventId !== eventId ||
        !isAssistanceDocumentId(attendeeId) ||
        eventSuccessPrimitivesFor(event!.eventFormat).accountability !==
          "sweep") {
      if (viewSnap.exists) tx.delete(viewRef);
      return {kind: "removed", existed: viewSnap.exists};
    }
    const {context} = operable;
    const nowStamp = deps.now();
    const now = nowStamp.toMillis();
    const keys = {accountabilityViewId: id, eventId,
      organizerId: context.organizerId, attendeeId};
    let view: NonNullable<ViewDocument["view"]>;
    try {
      const member = await parsing(!validateEventDocument(event) ? "events" :
        !validateEventAttendeeDocument(attendee) ? "eventAttendees" :
          "eventAssistanceGuests", () => readManagerMembership(db, tx,
        {context, attendeeId}, now));
      view = accountabilityState({scope: {context, groupId: "event:whole",
        attendeeId}, member, checkpoint: null});
    } catch (error) {
      if (!(error instanceof MovementSourceInvalidError)) throw error;
      const plan = planViewWrite(previous, {schemaVersion: 1 as const,
        ...keys, sourceCoverage: "invalidSource" as const,
        incompleteSource: error.source, view: previous?.view ?? null},
      nowStamp);
      if (!plan.unchanged) tx.set(viewRef, plan.document);
      return {kind: "invalidSource", source: error.source,
        detail: error.detail, written: !plan.unchanged};
    }
    const plan = planViewWrite(previous, {schemaVersion: 1 as const, ...keys,
      sourceCoverage: "complete" as const, incompleteSource: null, view},
    nowStamp);
    if (plan.unchanged) return {kind: "unchanged", revision: plan.revision};
    tx.set(viewRef, plan.document);
    return {kind: "complete", revision: plan.revision};
  });
  // Logged once per committed evaluation, not once per transaction attempt.
  if (outcome.kind === "invalidSource") {
    logger.error("Live accountability view read an invalid source.", {
      eventId, attendeeId, source: outcome.source, detail: outcome.detail});
  }
  return outcome;
}
