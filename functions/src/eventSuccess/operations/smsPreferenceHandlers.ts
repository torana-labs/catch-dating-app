import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAuth} from "../../shared/auth";
import {appCheckCallableOptions} from "../../shared/callableOptions";
import {checkRateLimit} from "../../shared/rateLimit";
import {validateCallableWithAjv} from "../../shared/validation";
import {validateGetEventAssistanceSmsPreferenceCallablePayload} from
  "../../shared/generated/validators/getEventAssistanceSmsPreferenceInput";
import {validateSetEventAssistanceSmsPreferenceCallablePayload} from
  "../../shared/generated/validators/setEventAssistanceSmsPreferenceInput";
import {validateEventAssistanceSmsPreferenceCallableResponse} from
  "../../shared/generated/validators/eventAssistanceSmsPreferenceOutput";
import {SmsPreferenceActor, SmsPreferenceStore} from "./smsPreferenceStore";

export interface SmsPreferenceDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  now: () => number;
}
const defaultDeps: SmsPreferenceDeps = {
  firestore: () => admin.firestore(), checkRateLimit, now: Date.now,
};

function actorFor(request: CallableRequest<unknown>): SmsPreferenceActor {
  const uid = requireAuth(request);
  const phone = request.auth?.token.phone_number;
  return {uid, phone: typeof phone === "string" &&
    /^\+91[6-9][0-9]{9}$/.test(phone) ? phone : null};
}

export async function getEventAssistanceSmsPreferenceHandler(
  request: CallableRequest<unknown>, deps: SmsPreferenceDeps = defaultDeps
) {
  const actor = actorFor(request);
  const input = validateCallableWithAjv(request,
    validateGetEventAssistanceSmsPreferenceCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actor.uid, "getEventAssistanceSmsPreference", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  const result = await new SmsPreferenceStore(db, deps.now, input.senderId)
    .get(actor, input);
  if (!validateEventAssistanceSmsPreferenceCallableResponse(result)) {
    throw new HttpsError("internal", "Event text preference unavailable.");
  }
  return result;
}

export async function setEventAssistanceSmsPreferenceHandler(
  request: CallableRequest<unknown>, deps: SmsPreferenceDeps = defaultDeps
) {
  const actor = actorFor(request);
  const input = validateCallableWithAjv(request,
    validateSetEventAssistanceSmsPreferenceCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actor.uid, "setEventAssistanceSmsPreference", {
    maxRequests: 20, windowMs: 60 * 1000,
  });
  const result = await new SmsPreferenceStore(db, deps.now, input.senderId)
    .set(actor, input);
  if (!validateEventAssistanceSmsPreferenceCallableResponse(result)) {
    throw new HttpsError("internal",
      "Event text preference could not be saved.");
  }
  return result;
}

export const getEventAssistanceSmsPreference = onCall(
  appCheckCallableOptions,
  (request) => getEventAssistanceSmsPreferenceHandler(request)
);
export const setEventAssistanceSmsPreference = onCall(
  appCheckCallableOptions,
  (request) => setEventAssistanceSmsPreferenceHandler(request)
);
