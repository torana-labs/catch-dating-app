import {validateReconcilePrivateEventSeatsCallablePayload} from
  "../../shared/generated/validators/reconcilePrivateEventSeatsInput";
import {validatePrivateSeatReconciliationCallableResponse} from
  "../../shared/generated/validators/privateSeatReconciliationOutput";
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import {requireAuth} from "../../shared/auth";
import {appCheckCallableOptions} from "../../shared/callableOptions";
import {checkRateLimit} from "../../shared/rateLimit";
import {validateCallableWithAjv} from "../../shared/validation";
import {validateCreatePrivateEventSetupCallablePayload} from
  "../../shared/generated/validators/createPrivateEventSetupInput";
import {validateUpdatePrivateEventBasicsCallablePayload} from
  "../../shared/generated/validators/updatePrivateEventBasicsInput";
import {
  createPrivateEventSetup as createSetup,
  updatePrivateEventBasics as updateBasics,
  ProgressiveSetupDependencies,
} from "./service";
import {createPrivateEventSeries as createSeries} from "./series";
import {validateCreatePrivateEventSeriesCallablePayload} from
  "../../shared/generated/validators/createPrivateEventSeriesInput";
import {validatePrivateEventSeriesCallableResponse} from
  "../../shared/generated/validators/privateEventSeriesOutput";
import {updatePrivateEventPreferences as updatePreferences} from
  "./preferences";
import {validateUpdatePrivateEventPreferencesCallablePayload} from
  "../../shared/generated/validators/updatePrivateEventPreferencesInput";
import {assertPrivateEventBasicsEditable} from "./commitments";

import {updatePrivateEventDetails as updateDetails} from "./details";
import {validateUpdatePrivateEventDetailsCallablePayload} from
  "../../shared/generated/validators/updatePrivateEventDetailsInput";
import {validatePrivateEventSetupMutationCallableResponse} from
  "../../shared/generated/validators/privateEventSetupMutationOutput";

import {setEventPublication as setPublication} from "./publication";
import {armDefaultMomentsOnPublish} from "./publishMoments";
import {validateSetEventPublicationCallablePayload} from
  "../../shared/generated/validators/setEventPublicationInput";
import {validateEventPublicationCallableResponse} from
  "../../shared/generated/validators/eventPublicationOutput";

export interface SetupCallableDependencies {
  nowMillis?: () => number;
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  service: (db: FirebaseFirestore.Firestore) => ProgressiveSetupDependencies;
}

const defaultDeps: SetupCallableDependencies = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  service: (db) => ({
    db,
    timestampFromMillis: admin.firestore.Timestamp.fromMillis,
    serverTimestamp: admin.firestore.FieldValue.serverTimestamp,
    assertBasicsEditable: assertPrivateEventBasicsEditable,
  }),
};

/** Authenticated entry point; transaction owns final manager authority. */
export async function createPrivateEventSetupHandler(
  request: CallableRequest<unknown>, deps = defaultDeps
) {
  const actorUid = requireAuth(request);
  const command = validateCallableWithAjv(request,
    validateCreatePrivateEventSetupCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "createPrivateEventSetup", {
    maxRequests: 10, windowMs: 60 * 1000,
  });
  return createSetup({actorUid, command, deps: deps.service(db)});
}

/** Keeps mutation request identity intact through the service receipt. */
export async function updatePrivateEventBasicsHandler(
  request: CallableRequest<unknown>, deps = defaultDeps
) {
  const actorUid = requireAuth(request);
  const command = validateCallableWithAjv(request,
    validateUpdatePrivateEventBasicsCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "updatePrivateEventBasics", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  return updateBasics({actorUid, command, deps: deps.service(db)});
}

/** A weekly series has its own bucket: one request creates up to eight. */
export async function createPrivateEventSeriesHandler(
  request: CallableRequest<unknown>, deps = defaultDeps
) {
  const actorUid = requireAuth(request);
  const command = validateCallableWithAjv(request,
    validateCreatePrivateEventSeriesCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "createPrivateEventSeries", {
    maxRequests: 5, windowMs: 10 * 60 * 1000,
  });
  const result = await createSeries({actorUid, command,
    deps: deps.service(db)});
  if (!validatePrivateEventSeriesCallableResponse(result)) {
    throw new HttpsError("internal", "Invalid event series result.");
  }
  return result;
}

export const createPrivateEventSeries = onCall(appCheckCallableOptions,
  (request) => createPrivateEventSeriesHandler(request));

export const createPrivateEventSetup = onCall(appCheckCallableOptions,
  (request) => createPrivateEventSetupHandler(request));
export const updatePrivateEventBasics = onCall(appCheckCallableOptions,
  (request) => updatePrivateEventBasicsHandler(request));

/** Saves a reviewed event-local settings snapshot in private storage. */
export async function updatePrivateEventPreferencesHandler(
  request: CallableRequest<unknown>, deps = defaultDeps
) {
  const actorUid = requireAuth(request);
  const command = validateCallableWithAjv(request,
    validateUpdatePrivateEventPreferencesCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "updatePrivateEventPreferences", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  return updatePreferences({actorUid, command, deps: deps.service(db)});
}

export const updatePrivateEventPreferences = onCall(appCheckCallableOptions,
  (request) => updatePrivateEventPreferencesHandler(request));

/** Adds optional details without publishing or activating paid admission. */
export async function updatePrivateEventDetailsHandler(
  request: CallableRequest<unknown>, deps = defaultDeps
) {
  const actorUid = requireAuth(request);
  const command = validateCallableWithAjv(request,
    validateUpdatePrivateEventDetailsCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "updatePrivateEventDetails", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  const result = await updateDetails({actorUid, command,
    deps: deps.service(db)});
  if (!validatePrivateEventSetupMutationCallableResponse(result)) {
    throw new HttpsError("internal", "Invalid event setup result.");
  }
  return result;
}
export const updatePrivateEventDetails = onCall(appCheckCallableOptions,
  (request) => updatePrivateEventDetailsHandler(request));

/** Changes visibility; registration and guest state stay separate. */
export async function setEventPublicationHandler(
  request: CallableRequest<unknown>, deps = defaultDeps
) {
  const actorUid = requireAuth(request);
  const command = validateCallableWithAjv(request,
    validateSetEventPublicationCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "setEventPublication", {
    maxRequests: 15, windowMs: 60 * 1000,
  });
  const result = await setPublication({actorUid, command,
    deps: deps.service(db)});
  if (!validateEventPublicationCallableResponse(result)) {
    throw new HttpsError("internal", "Invalid event publication result.");
  }
  // The organizer's automatic-message defaults arm their moments once the
  // event is public; each is create-only, so settings saves change nothing.
  if (!result.replayed && result.publicationState === "published") {
    await armDefaultMomentsOnPublish({db, eventId: command.eventId,
      organizerId: command.organizerId, actorUid,
      nowMillis: (deps.nowMillis ?? Date.now)()});
  }
  return result;
}
export const setEventPublication = onCall(appCheckCallableOptions,
  (request) => setEventPublicationHandler(request));

/**
 * Kept for installed Host builds that send admission-terms saves here; the
 * current app calls updatePrivateEventDetails. Every event has its seat
 * ledger, so there is nothing to reconcile: a save is the ordinary details
 * save, and a discard applies nothing. Retire under D1 with the older-build
 * callables (#2174).
 */
export async function reconcilePrivateEventSeatsHandler(
  request: CallableRequest<unknown>, deps = defaultDeps
) {
  const actorUid = requireAuth(request);
  const command = validateCallableWithAjv(request,
    validateReconcilePrivateEventSeatsCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "reconcilePrivateEventSeats", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  const {discard, ...settings} = command;
  const result = discard ?
    {kind: "discarded" as const, eventId: settings.eventId,
      requestId: settings.requestId} :
    {kind: "complete" as const, receipt: await updateDetails({actorUid,
      command: settings, deps: deps.service(db)})};
  if (!validatePrivateSeatReconciliationCallableResponse(result)) {
    throw new HttpsError("internal", "Invalid admission settings result.");
  }
  return result;
}
