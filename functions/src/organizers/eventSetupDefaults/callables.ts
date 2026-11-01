import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import {requireAuth} from "../../shared/auth";
import {appCheckCallableOptions} from "../../shared/callableOptions";
import {checkRateLimit} from "../../shared/rateLimit";
import {checkInstanceRateLimit} from "../../shared/instanceRateLimit";
import {validateCallableWithAjv} from "../../shared/validation";
import {validateGetOrganizerEventSetupDefaultsCallablePayload} from
  "../../shared/generated/validators/getOrganizerEventSetupDefaultsInput";
import {validateUpdateOrganizerEventSetupDefaultsCallablePayload} from
  "../../shared/generated/validators/updateOrganizerEventSetupDefaultsInput";
import {validateOrganizerEventSetupDefaultsCallableResponse} from
  "../../shared/generated/validators/organizerEventSetupDefaultsOutput";
import {validateUpdateOrganizerEventSetupDefaultsCallableResponse} from
  "../../shared/generated/validators/updateOrganizerEventSetupDefaultsOutput";
import {eventSetupDefaultsDependencies} from "./dependencies";
import {getManagerEventSetupDefaults, updateManagerEventSetupDefaults} from
  "./service";

export interface DefaultsCallableDependencies {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
}

const defaultDeps: DefaultsCallableDependencies = {
  firestore: () => admin.firestore(), checkRateLimit,
};

/** Returns a whitelist after current-manager authorization in a transaction. */
export async function getOrganizerEventSetupDefaultsHandler(
  request: CallableRequest<unknown>, deps = defaultDeps
) {
  const actorUid = requireAuth(request);
  const {organizerId} = validateCallableWithAjv(request,
    validateGetOrganizerEventSetupDefaultsCallablePayload);
  const db = deps.firestore();
  checkInstanceRateLimit(actorUid, "getOrganizerEventSetupDefaults", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  const result = await getManagerEventSetupDefaults({actorUid, organizerId,
    deps: eventSetupDefaultsDependencies(db)});
  if (!validateOrganizerEventSetupDefaultsCallableResponse(result)) {
    throw new HttpsError("internal", "Organizer defaults need review.");
  }
  return result;
}

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

export const getOrganizerEventSetupDefaults = onCall(appCheckCallableOptions,
  (request) => getOrganizerEventSetupDefaultsHandler(request));
export const updateOrganizerEventSetupDefaults = onCall(appCheckCallableOptions,
  (request) => updateOrganizerEventSetupDefaultsHandler(request));
