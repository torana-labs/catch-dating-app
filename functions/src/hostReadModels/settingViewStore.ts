import {logger} from "firebase-functions";
import type {HostEventAssistanceSettingViewDocument as ViewDocument} from
  "../shared/generated/firestoreAdminTypes";
import {settingId} from "../eventSuccess/operations/policySettings";
import {readSettingState} from
  "../eventSuccess/operations/policySettingsReader";
import {settingView} from "../eventSuccess/operations/policySettingsStore";
import {
  configuredGroupIds,
  consoleSettingKinds,
  defaultGuestViewDeps,
  GuestSourceInvalidError,
  GuestViewDeps,
  operableEvent,
  parsing,
  planViewWrite,
  settingViewsCollection,
} from "./guestViewSupport";

export type SettingViewsOutcome = {
  eventId: string;
  written: number;
  unchanged: number;
  removed: number;
  invalidSource: Array<{settingId: string; source: string; detail: string}>;
};

/**
 * Re-evaluates the event's assistance setting views (each configured group,
 * event:whole included, for each workflow kind the console reads) in one
 * transaction: the event and each setting row with its event:whole parent,
 * as the retired getEventAssistanceSetting read them. The view reads no
 * clock. Views of groups that left the route plan, or of an event that is
 * gone, are deleted. A source that fails validation records invalidSource on
 * the affected views and keeps their previous projection.
 */
export async function reconcileSettingViews(
  db: FirebaseFirestore.Firestore,
  eventId: string,
  deps: GuestViewDeps = defaultGuestViewDeps
): Promise<SettingViewsOutcome> {
  const outcome = await db.runTransaction(async (tx) => {
    const result: SettingViewsOutcome = {eventId, written: 0, unchanged: 0,
      removed: 0, invalidSource: []};
    const eventSnap = await tx.get(db.collection("events").doc(eventId));
    const existing = await tx.get(db.collection(settingViewsCollection)
      .where("eventId", "==", eventId).limit(200));
    const operable = operableEvent(eventId, eventSnap.data());
    const nowStamp = deps.now();
    const now = nowStamp.toMillis();
    const desired = new Map<string, Omit<ViewDocument,
      "revision" | "evaluatedAt">>();
    if (operable) {
      const {context, endAtMillis} = operable;
      const previous = new Map(existing.docs.map((doc) =>
        [doc.id, doc.data() as ViewDocument]));
      for (const groupId of configuredGroupIds(eventSnap.data()!)) {
        for (const workflowKind of consoleSettingKinds) {
          const scope = {context, groupId, workflowKind};
          const id = settingId(scope);
          let view: ViewDocument["view"] = previous.get(id)?.view ?? null;
          let invalid: GuestSourceInvalidError | null = null;
          try {
            const state = await parsing("eventAssistanceSettings", () =>
              readSettingState(db, tx, scope, eventSnap, () => now));
            view = await parsing("events", () => settingView(state));
          } catch (error) {
            if (!(error instanceof GuestSourceInvalidError)) throw error;
            invalid = error;
            result.invalidSource.push({settingId: id, source: error.source,
              detail: error.detail});
          }
          desired.set(id, {schemaVersion: 1, settingId: id, eventId,
            organizerId: context.organizerId, groupId, workflowKind,
            sourceCoverage: invalid ? "invalidSource" : "complete",
            incompleteSource: invalid?.source ?? null,
            eventEndAtMillis: endAtMillis, view});
        }
      }
    }
    for (const doc of existing.docs) {
      if (desired.has(doc.id)) continue;
      tx.delete(doc.ref);
      result.removed++;
    }
    for (const [id, next] of desired) {
      const previous = existing.docs.find((doc) => doc.id === id);
      const plan = planViewWrite(previous ?
        previous.data() as ViewDocument : null, next, nowStamp);
      if (plan.unchanged) {
        result.unchanged++;
        continue;
      }
      tx.set(db.collection(settingViewsCollection).doc(id), plan.document);
      result.written++;
    }
    return result;
  });
  // Logged once per committed evaluation, not once per transaction attempt.
  for (const invalid of outcome.invalidSource) {
    logger.error("Live assistance setting view read an invalid source.", {
      eventId, ...invalid});
  }
  return outcome;
}
