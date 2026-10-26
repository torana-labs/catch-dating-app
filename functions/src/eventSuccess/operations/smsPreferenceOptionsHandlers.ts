import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAuth} from "../../shared/auth";
import {appCheckCallableOptions} from "../../shared/callableOptions";
import {checkRateLimit} from "../../shared/rateLimit";
import {validateCallableWithAjv} from "../../shared/validation";
import {validateListEventSmsPreferencesCallablePayload} from
  "../../shared/generated/validators/listEventSmsPreferencesInput";
import {validateListEventSmsPreferencesCallableResponse} from
  "../../shared/generated/validators/listEventSmsPreferencesOutput";
import {SmsPreferenceOptionsStore} from "./smsPreferenceOptionsStore";

interface Dependencies {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  now: () => number;
}
const defaults: Dependencies = {
  firestore: () => admin.firestore(), checkRateLimit, now: Date.now,
};

export async function listEventSmsPreferencesHandler(
  request: CallableRequest<unknown>, deps: Dependencies = defaults) {
  const uid = requireAuth(request);
  const input = validateCallableWithAjv(request,
    validateListEventSmsPreferencesCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, uid, "listEventSmsPreferences", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  const output = await new SmsPreferenceOptionsStore(db, deps.now)
    .list(uid, input);
  if (!validateListEventSmsPreferencesCallableResponse(output)) {
    throw new HttpsError("internal", "Event SMS preferences unavailable.");
  }
  return output;
}

export const listEventSmsPreferences = onCall(appCheckCallableOptions,
  (request) => listEventSmsPreferencesHandler(request));
