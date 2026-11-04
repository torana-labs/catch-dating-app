import {logger} from "firebase-functions";
import {validateEventDocument} from
  "../shared/generated/validators/eventDocument";
import type {HostEventGroupProgressViewDocument as ViewDocument} from
  "../shared/generated/firestoreAdminTypes";
import {
  groupProgressSource,
  progressIdentity,
  projectGroupProgress,
} from "../eventSuccess/operations/groupProgressSource";
import {
  GROUP_PROGRESS,
  parseGroupProgress,
  parseGroupProgressEvent,
} from "../eventSuccess/operations/groupProgressReader";
import {
  configuredGroupIds,
  defaultMovementViewDeps,
  groupProgressViewsCollection,
  MovementSourceInvalidError,
  MovementViewDeps,
  operableEvent,
  parsing,
  planViewWrite,
} from "./movementViewSupport";

/** More progress rows than this for one event cannot be legitimate. */
const maxProgressRows = 200;

export type GroupProgressViewsOutcome = {
  eventId: string;
  written: number;
  unchanged: number;
  removed: number;
  invalidSource: Array<{groupId: string; source: string; detail: string}>;
};

/**
 * Re-evaluates hostEventGroupProgressViews for every configured group of one
 * event (event:whole and each pace group) in one transaction: the event, its
 * event success plan, every eventAssistanceGroupProgress row of the event and
 * the event's current views. Each view is what the retired
 * getEventAssistanceGroupProgress callable returned for a manager, evaluated
 * as if the time were one millisecond before the event ends, so the phone
 * applies the clock. Writes only views that changed and deletes the views of
 * groups that left the route plan, or of an event that is gone. A source that
 * fails validation records invalidSource on the affected views and keeps
 * their previous projection; nothing it causes throws.
 */
export async function reconcileGroupProgressViews(
  db: FirebaseFirestore.Firestore,
  eventId: string,
  deps: MovementViewDeps = defaultMovementViewDeps
): Promise<GroupProgressViewsOutcome> {
  const outcome = await db.runTransaction(async (tx) => {
    const result: GroupProgressViewsOutcome = {eventId, written: 0,
      unchanged: 0, removed: 0, invalidSource: []};
    const [eventSnap, planSnap] = await tx.getAll(
      db.collection("events").doc(eventId),
      db.collection("eventSuccessPlans").doc(eventId));
    const existing = await tx.get(db.collection(groupProgressViewsCollection)
      .where("eventId", "==", eventId).limit(maxProgressRows));
    const operable = operableEvent(eventId, eventSnap.data());
    const progressRows = operable ? await tx.get(db.collection(GROUP_PROGRESS)
      .where("context.eventId", "==", eventId).limit(maxProgressRows + 1)) :
      null;
    const nowStamp = deps.now();
    const now = nowStamp.toMillis();
    const desired = new Map<string, Omit<ViewDocument,
      "revision" | "evaluatedAt">>();
    if (operable) {
      const {context, endAtMillis} = operable;
      const beforeEnd = endAtMillis - 1;
      let eventSource: ReturnType<typeof parseGroupProgressEvent> | null =
        null;
      let eventError: MovementSourceInvalidError | null = null;
      try {
        const event = eventSnap.data();
        eventSource = await parsing(validateEventDocument(event) &&
          event.organizerId === context.organizerId ? "eventSuccessPlans" :
          "events", () => parseGroupProgressEvent(context, eventSnap,
          planSnap));
        if (progressRows!.size > maxProgressRows) {
          throw new MovementSourceInvalidError(GROUP_PROGRESS,
            "More progress rows than any event can configure.");
        }
      } catch (error) {
        if (!(error instanceof MovementSourceInvalidError)) throw error;
        eventError = error;
      }
      const rows = new Map(progressRows!.docs.map((doc) =>
        [doc.id, doc.data()]));
      const previous = new Map(existing.docs.map((doc) =>
        [doc.id, doc.data() as ViewDocument]));
      for (const groupId of configuredGroupIds(eventSnap.data()!)) {
        const progressId = progressIdentity(context, groupId);
        let view: ViewDocument["view"] = previous.get(progressId)?.view ?? null;
        let invalid = eventError;
        if (eventSource) {
          try {
            const progress = await parsing(GROUP_PROGRESS, () =>
              parseGroupProgress(rows.get(progressId), progressId, groupId,
                now));
            const source = await parsing("events", () => groupProgressSource({
              context, groupId, event: eventSource!.event,
              plan: eventSource!.plan, eventGeneration: eventSnap.createTime,
              planGeneration: planSnap.createTime, now: beforeEnd}));
            const {serverTime: _serverTime, ...projected} =
              projectGroupProgress(source, progress, beforeEnd);
            void _serverTime;
            view = projected;
          } catch (error) {
            if (!(error instanceof MovementSourceInvalidError)) throw error;
            invalid = error;
          }
        }
        if (invalid) {
          result.invalidSource.push({groupId, source: invalid.source,
            detail: invalid.detail});
        }
        desired.set(progressId, {schemaVersion: 1, progressId, eventId,
          organizerId: context.organizerId, groupId,
          sourceCoverage: invalid ? "invalidSource" : "complete",
          incompleteSource: invalid?.source ?? null,
          eventEndAtMillis: endAtMillis, view});
      }
    }
    for (const doc of existing.docs) {
      if (desired.has(doc.id)) continue;
      tx.delete(doc.ref);
      result.removed++;
    }
    for (const [progressId, next] of desired) {
      const previous = existing.docs.find((doc) => doc.id === progressId);
      const plan = planViewWrite(previous ?
        previous.data() as ViewDocument : null, next, nowStamp);
      if (plan.unchanged) {
        result.unchanged++;
        continue;
      }
      tx.set(db.collection(groupProgressViewsCollection).doc(progressId),
        plan.document);
      result.written++;
    }
    return result;
  });
  // Logged once per committed evaluation, not once per transaction attempt.
  for (const invalid of outcome.invalidSource) {
    logger.error("Live group progress view read an invalid source.", {
      eventId, ...invalid});
  }
  return outcome;
}
