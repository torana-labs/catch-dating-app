/* eslint-disable max-len */
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import type {SaveEventSuccessPlanSetupCallablePayload} from
  "../shared/generated/saveEventSuccessPlanSetupCallablePayload";
import type {SaveEventSuccessPlanSetupCallableResponse} from
  "../shared/generated/saveEventSuccessPlanSetupCallableResponse";
import {validateSaveEventSuccessPlanSetupCallablePayload} from
  "../shared/generated/validators/saveEventSuccessPlanSetupInput";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {requireEventManager} from "./liveControl";
import {planSetupRefusal, stagePlanSetupUpdate, timestampMicros} from "./planSetup";

// saveEventSuccessPlanSetup: Catch Host's plan screen saves the live event
// guide's setup fields here instead of writing the plan directly. Same
// authority as the former rule (an organizer manager of the event's
// organizer), same fences (setup open, plan in setup and not frozen, and the
// plan's updatedAt unchanged since the host read it), and the same field set.

export interface SaveEventSuccessPlanSetupDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  nowMillis: () => number;
  checkRateLimit: typeof defaultCheckRateLimit;
}

const defaultDeps: SaveEventSuccessPlanSetupDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  nowMillis: () => Date.now(),
  checkRateLimit: defaultCheckRateLimit,
};

const REFUSALS = {
  plan_missing: ["failed-precondition", "The live event guide no longer exists."],
  event_mismatch: ["failed-precondition", "This live event guide belongs to another event."],
  setup_closed: ["failed-precondition", "Setup is closed: the event has started or has guests."],
  plan_locked: ["failed-precondition", "The live event guide is already locked."],
} as const;

export async function saveEventSuccessPlanSetupHandler(request: CallableRequest<unknown>,
  deps: SaveEventSuccessPlanSetupDeps = defaultDeps): Promise<SaveEventSuccessPlanSetupCallableResponse> {
  const uid = requireAuth(request);
  const payload = validateCallableWithAjv<SaveEventSuccessPlanSetupCallablePayload>(request,
    validateSaveEventSuccessPlanSetupCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, uid, "saveEventSuccessPlanSetup", {maxRequests: 60, windowMs: 60 * 1000});
  await requireEventManager(db, payload.eventId, uid);
  const eventRef = db.collection("events").doc(payload.eventId);
  const planRef = db.collection("eventSuccessPlans").doc(payload.eventId);
  await db.runTransaction(async (tx) => {
    const [eventSnap, planSnap] = await Promise.all([tx.get(eventRef), tx.get(planRef)]);
    const plan = planSnap.exists ? planSnap.data() : undefined;
    const refusal = planSetupRefusal(eventSnap.data(), plan, payload.eventId, deps.nowMillis());
    if (refusal) {
      const [code, message] = REFUSALS[refusal];
      throw new HttpsError(code, message, {reason: refusal});
    }
    if (timestampMicros(plan?.updatedAt) !== payload.expectedUpdatedAtMicros) {
      throw new HttpsError("aborted", "The live event guide changed on another device.", {reason: "stale_plan"});
    }
    stagePlanSetupUpdate(tx, planRef, payload.setup, deps.serverTimestamp);
  });
  return {eventId: payload.eventId, saved: true};
}

export const saveEventSuccessPlanSetup = onCall(appCheckCallableOptions,
  (request) => saveEventSuccessPlanSetupHandler(request));
