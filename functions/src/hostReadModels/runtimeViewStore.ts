import {logger} from "firebase-functions";
import type {HostEventRuntimeViewDocument as ViewDocument} from
  "../shared/generated/firestoreAdminTypes";
import {validateOrganizerDocument} from
  "../shared/generated/validators/organizerDocument";
import {runtimeConfigId, runtimeConfigSource} from
  "../eventSuccess/operations/runtimeConfigRecords";
import {readRuntimeConfigState, runtimeView} from
  "../eventSuccess/operations/runtimeConfigStore";
import type {GuestViewOutcome} from "./accountabilityViewStore";
import {
  defaultGuestViewDeps,
  GuestSourceInvalidError,
  GuestViewDeps,
  operableEvent,
  parsing,
  planViewWrite,
  runtimeViewsCollection,
} from "./guestViewSupport";

/**
 * Re-evaluates the event's late-join automation view in one transaction:
 * the event, its plan, the organizer and the automation record, as the
 * runtime read reads them, without the sender setup (the picker keeps the
 * callable). The view is evaluated as if the time were one millisecond
 * before the event ends; `closed` is the event's own closure. Deleted when
 * the event is gone (or moved organizer). A source that fails validation
 * records invalidSource and keeps the previous view.
 */
export async function reconcileRuntimeView(
  db: FirebaseFirestore.Firestore,
  eventId: string,
  deps: GuestViewDeps = defaultGuestViewDeps
): Promise<GuestViewOutcome> {
  const outcome = await db.runTransaction(async (tx):
    Promise<GuestViewOutcome> => {
    const [eventSnap, planSnap] = await tx.getAll(
      db.collection("events").doc(eventId),
      db.collection("eventSuccessPlans").doc(eventId));
    const existing = await tx.get(db.collection(runtimeViewsCollection)
      .where("eventId", "==", eventId).limit(5));
    const operable = operableEvent(eventId, eventSnap.data());
    const id = operable ? runtimeConfigId(operable.context) : null;
    const stale = existing.docs.filter((doc) => doc.id !== id);
    for (const doc of stale) tx.delete(doc.ref);
    if (!operable) return {kind: "removed", existed: stale.length > 0};
    const {context, endAtMillis} = operable;
    const organizerSnap = await tx.get(db.collection("organizers")
      .doc(context.organizerId));
    const viewRef = db.collection(runtimeViewsCollection).doc(id!);
    const previousSnap = existing.docs.find((doc) => doc.id === id);
    const previous = previousSnap ? previousSnap.data() as ViewDocument :
      null;
    const nowStamp = deps.now();
    const now = nowStamp.toMillis();
    const keys = {runtimeId: id!, eventId, organizerId: context.organizerId,
      eventEndAtMillis: endAtMillis};
    let view: NonNullable<ViewDocument["view"]>;
    let closed: boolean;
    try {
      if (!validateOrganizerDocument(organizerSnap.data())) {
        throw new GuestSourceInvalidError("organizers",
          "The organizer fails its contract.");
      }
      const state = await parsing("eventAssistanceRuntimeConfigs", () =>
        readRuntimeConfigState(db, tx, context, () => now));
      // Evaluated as if before the end: the phone applies the clock.
      const source = await parsing("events", () => runtimeConfigSource(
        context, eventSnap, planSnap, endAtMillis - 1));
      closed = source.closed;
      view = runtimeView({...state, source, now: endAtMillis - 1});
    } catch (error) {
      if (!(error instanceof GuestSourceInvalidError)) throw error;
      const plan = planViewWrite(previous, {schemaVersion: 1 as const,
        ...keys, closed: previous?.closed ?? true,
        sourceCoverage: "invalidSource" as const,
        incompleteSource: error.source, view: previous?.view ?? null},
      nowStamp);
      if (!plan.unchanged) tx.set(viewRef, plan.document);
      return {kind: "invalidSource", source: error.source,
        detail: error.detail, written: !plan.unchanged};
    }
    const plan = planViewWrite(previous, {schemaVersion: 1 as const, ...keys,
      closed, sourceCoverage: "complete" as const, incompleteSource: null,
      view}, nowStamp);
    if (plan.unchanged) return {kind: "unchanged", revision: plan.revision};
    tx.set(viewRef, plan.document);
    return {kind: "complete", revision: plan.revision};
  });
  // Logged once per committed evaluation, not once per transaction attempt.
  if (outcome.kind === "invalidSource") {
    logger.error("Live automation view read an invalid source.", {
      eventId, source: outcome.source, detail: outcome.detail});
  }
  return outcome;
}
