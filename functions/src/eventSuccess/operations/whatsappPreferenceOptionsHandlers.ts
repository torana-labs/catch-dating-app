import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAuth} from "../../shared/auth";
import {appCheckCallableOptions} from "../../shared/callableOptions";
import {checkRateLimit} from "../../shared/rateLimit";
import {validateCallableWithAjv} from "../../shared/validation";
import {validateListEventWhatsappPreferencesCallablePayload} from
  "../../shared/generated/validators/listEventWhatsappPreferencesInput";
import {validateListEventWhatsappPreferencesCallableResponse} from
  "../../shared/generated/validators/listEventWhatsappPreferencesOutput";
import {WhatsappPreferenceOptionsStore} from "./whatsappPreferenceOptionsStore";

interface Dependencies {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  now: () => number;
}
const defaults: Dependencies = {
  firestore: () => admin.firestore(), checkRateLimit, now: Date.now,
};

export async function listEventWhatsappPreferencesHandler(
  request: CallableRequest<unknown>, deps: Dependencies = defaults) {
  const uid = requireAuth(request);
  const input = validateCallableWithAjv(request,
    validateListEventWhatsappPreferencesCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, uid, "listEventWhatsappPreferences", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  const output = await new WhatsappPreferenceOptionsStore(db, deps.now)
    .list(uid, input);
  if (!validateListEventWhatsappPreferencesCallableResponse(output)) {
    throw new HttpsError("internal", "Event WhatsApp preferences unavailable.");
  }
  return output;
}

export const listEventWhatsappPreferences = onCall(appCheckCallableOptions,
  (request) => listEventWhatsappPreferencesHandler(request));
