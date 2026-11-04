import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import {requireAuth} from "../../shared/auth";
import {appCheckCallableOptions} from "../../shared/callableOptions";
import {checkRateLimit} from "../../shared/rateLimit";
import {validateCallableWithAjv} from "../../shared/validation";
import {validateUpdateOrganizerEventSetupDefaultsCallablePayload} from
  "../../shared/generated/validators/updateOrganizerEventSetupDefaultsInput";
import {validateUpdateOrganizerEventSetupDefaultsCallableResponse} from
  "../../shared/generated/validators/updateOrganizerEventSetupDefaultsOutput";
import {eventSetupDefaultsDependencies} from "./dependencies";
import {updateManagerEventSetupDefaults} from "./service";

export interface DefaultsCallableDependencies {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
}

const defaultDeps: DefaultsCallableDependencies = {
  firestore: () => admin.firestore(), checkRateLimit,
};

/** Stores private suggestions without activating event or payment features. */
export async function updateOrganizerEventSetupDefaultsHandler(
  request: CallableRequest<unknown>, deps = defaultDeps
) {
  const actorUid = requireAuth(request);
  const command = validateCallableWithAjv(request,
    validateUpdateOrganizerEventSetupDefaultsCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "updateOrganizerEventSetupDefaults", {
    maxRequests: 10, windowMs: 60 * 1000,
  });
  const result = await updateManagerEventSetupDefaults({actorUid, command,
    deps: eventSetupDefaultsDependencies(db)});
  if (!validateUpdateOrganizerEventSetupDefaultsCallableResponse(result)) {
    throw new HttpsError("internal", "Organizer defaults need review.");
  }
  return result;
}

export const updateOrganizerEventSetupDefaults = onCall(appCheckCallableOptions,
  (request) => updateOrganizerEventSetupDefaultsHandler(request));
