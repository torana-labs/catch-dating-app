import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAuth} from "../../shared/auth";
import {appCheckCallableOptions} from "../../shared/callableOptions";
import {checkRateLimit} from "../../shared/rateLimit";
import {validateCallableWithAjv} from "../../shared/validation";
import {validateGetEventWhatsappPreferenceCallablePayload} from
  "../../shared/generated/validators/getEventWhatsappPreferenceInput";
import {validateSetEventWhatsappPreferenceCallablePayload} from
  "../../shared/generated/validators/setEventWhatsappPreferenceInput";
import {validateEventWhatsappPreferenceCallableResponse} from
  "../../shared/generated/validators/eventWhatsappPreferenceOutput";
import {WhatsappPreferenceActor, WhatsappPreferenceStore} from
  "./whatsappPreferenceStore";
import {whatsappEndpointHash} from "./whatsappReplyProtocol";

export interface WhatsappPreferenceDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  now: () => number;
}
const defaultDeps: WhatsappPreferenceDeps = {
  firestore: () => admin.firestore(), checkRateLimit, now: Date.now,
};

function actorFor(request: CallableRequest<unknown>): WhatsappPreferenceActor {
  const uid = requireAuth(request);
  const phone = request.auth?.token.phone_number;
  return {uid, phone: typeof phone === "string" &&
    whatsappEndpointHash(phone) ? phone : null};
}

export async function getEventWhatsappPreferenceHandler(
  request: CallableRequest<unknown>, deps: WhatsappPreferenceDeps = defaultDeps
) {
  const actor = actorFor(request);
  const input = validateCallableWithAjv(request,
    validateGetEventWhatsappPreferenceCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actor.uid, "getEventWhatsappPreference", {
    maxRequests: 60, windowMs: 60_000,
  });
  const result = await new WhatsappPreferenceStore(db, deps.now)
    .get(actor, input);
  if (!validateEventWhatsappPreferenceCallableResponse(result)) {
    throw new HttpsError("internal", "Event WhatsApp preference unavailable.");
  }
  return result;
}

export async function setEventWhatsappPreferenceHandler(
  request: CallableRequest<unknown>, deps: WhatsappPreferenceDeps = defaultDeps
) {
  const actor = actorFor(request);
  const input = validateCallableWithAjv(request,
    validateSetEventWhatsappPreferenceCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actor.uid, "setEventWhatsappPreference", {
    maxRequests: 20, windowMs: 60_000,
  });
  const result = await new WhatsappPreferenceStore(db, deps.now)
    .set(actor, input);
  if (!validateEventWhatsappPreferenceCallableResponse(result)) {
    throw new HttpsError("internal",
      "Event WhatsApp preference could not be saved.");
  }
  return result;
}

export const getEventWhatsappPreference = onCall(
  appCheckCallableOptions,
  (request) => getEventWhatsappPreferenceHandler(request)
);
export const setEventWhatsappPreference = onCall(
  appCheckCallableOptions,
  (request) => setEventWhatsappPreferenceHandler(request)
);
