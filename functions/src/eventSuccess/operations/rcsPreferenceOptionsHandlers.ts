import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAuth} from "../../shared/auth";
import {appCheckCallableOptions} from "../../shared/callableOptions";
import {checkRateLimit} from "../../shared/rateLimit";
import {validateCallableWithAjv} from "../../shared/validation";
import {validateListEventRcsPreferencesCallablePayload} from
  "../../shared/generated/validators/listEventRcsPreferencesInput";
import {validateListEventRcsPreferencesCallableResponse} from
  "../../shared/generated/validators/listEventRcsPreferencesOutput";
import {RcsPreferenceOptionsStore} from "./rcsPreferenceOptionsStore";

interface Dependencies {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  now: () => number;
}
const defaults: Dependencies = {
  firestore: () => admin.firestore(), checkRateLimit, now: Date.now,
};

export async function listEventRcsPreferencesHandler(
  request: CallableRequest<unknown>, deps: Dependencies = defaults) {
  const uid = requireAuth(request);
  const input = validateCallableWithAjv(request,
    validateListEventRcsPreferencesCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, uid, "listEventRcsPreferences", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  const output = await new RcsPreferenceOptionsStore(db, deps.now)
    .list(uid, input);
  if (!validateListEventRcsPreferencesCallableResponse(output)) {
    throw new HttpsError("internal", "Event RCS preferences unavailable.");
  }
  return output;
}

export const listEventRcsPreferences = onCall(appCheckCallableOptions,
  (request) => listEventRcsPreferencesHandler(request));
