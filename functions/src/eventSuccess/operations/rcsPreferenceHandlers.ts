import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAuth} from "../../shared/auth";
import {appCheckCallableOptions} from "../../shared/callableOptions";
import {checkRateLimit} from "../../shared/rateLimit";
import {validateCallableWithAjv} from "../../shared/validation";
import {validateGetEventRcsPreferenceCallablePayload} from
  "../../shared/generated/validators/getEventRcsPreferenceInput";
import {validateSetEventRcsPreferenceCallablePayload} from
  "../../shared/generated/validators/setEventRcsPreferenceInput";
import {validateEventRcsPreferenceCallableResponse} from
  "../../shared/generated/validators/eventRcsPreferenceOutput";
import {RcsPreferenceActor, RcsPreferenceStore} from "./rcsPreferenceStore";
import {rcsPhoneHash} from "./rcsProtocol";

export interface RcsPreferenceDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  now: () => number;
}
const defaultDeps: RcsPreferenceDeps = {
  firestore: () => admin.firestore(), checkRateLimit, now: Date.now,
};

function actorFor(request: CallableRequest<unknown>): RcsPreferenceActor {
  const uid = requireAuth(request);
  const phone = request.auth?.token.phone_number;
  return {uid, phone: typeof phone === "string" && rcsPhoneHash(phone) ?
    phone : null};
}

export async function getEventRcsPreferenceHandler(
  request: CallableRequest<unknown>, deps: RcsPreferenceDeps = defaultDeps
) {
  const actor = actorFor(request);
  const input = validateCallableWithAjv(request,
    validateGetEventRcsPreferenceCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actor.uid, "getEventRcsPreference", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  const result = await new RcsPreferenceStore(db, deps.now).get(actor, input);
  if (!validateEventRcsPreferenceCallableResponse(result)) {
    throw new HttpsError("internal", "Event RCS preference unavailable.");
  }
  return result;
}

export async function setEventRcsPreferenceHandler(
  request: CallableRequest<unknown>, deps: RcsPreferenceDeps = defaultDeps
) {
  const actor = actorFor(request);
  const input = validateCallableWithAjv(request,
    validateSetEventRcsPreferenceCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actor.uid, "setEventRcsPreference", {
    maxRequests: 20, windowMs: 60 * 1000,
  });
  const result = await new RcsPreferenceStore(db, deps.now).set(actor, input);
  if (!validateEventRcsPreferenceCallableResponse(result)) {
    throw new HttpsError("internal",
      "Event RCS preference could not be saved.");
  }
  return result;
}

export const getEventRcsPreference = onCall(appCheckCallableOptions,
  (request) => getEventRcsPreferenceHandler(request));
export const setEventRcsPreference = onCall(appCheckCallableOptions,
  (request) => setEventRcsPreferenceHandler(request));
