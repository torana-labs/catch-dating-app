import {getFirestore} from "firebase-admin/firestore";
import {CallableRequest, onCall} from "firebase-functions/v2/https";
import {requireAuth} from "../../shared/auth";
import {appCheckCallableOptions} from "../../shared/callableOptions";
import {checkRateLimit} from "../../shared/rateLimit";
import {EventAssistanceSettingsStore} from "./policySettingsStore";

interface Dependencies {
  db: typeof getFirestore;
  rateLimit: typeof checkRateLimit;
  store: (db: ReturnType<typeof getFirestore>) =>
    Pick<EventAssistanceSettingsStore, "get" | "set">;
}
const defaults: Dependencies = {db: getFirestore, rateLimit: checkRateLimit,
  store: (db) => new EventAssistanceSettingsStore(db)};

export async function getEventAssistanceSettingHandler(
  request: CallableRequest<unknown>, deps: Dependencies = defaults
) {
  const uid = requireAuth(request);
  const db = deps.db();
  await deps.rateLimit(db, uid, "getEventAssistanceSetting", {
    maxRequests: 60, windowMs: 60_000,
  });
  return deps.store(db).get(uid, request.data);
}

export async function setEventAssistanceSettingHandler(
  request: CallableRequest<unknown>, deps: Dependencies = defaults
) {
  const uid = requireAuth(request);
  const db = deps.db();
  await deps.rateLimit(db, uid, "setEventAssistanceSetting", {
    maxRequests: 30, windowMs: 60_000,
  });
  return deps.store(db).set(uid, request.data);
}

export const getEventAssistanceSetting = onCall(appCheckCallableOptions,
  (request) => getEventAssistanceSettingHandler(request));
export const setEventAssistanceSetting = onCall(appCheckCallableOptions,
  (request) => setEventAssistanceSettingHandler(request));
