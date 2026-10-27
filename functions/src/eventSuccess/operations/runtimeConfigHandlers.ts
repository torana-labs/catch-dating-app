import {getFirestore} from "firebase-admin/firestore";
import {CallableRequest, onCall} from "firebase-functions/v2/https";
import {requireAuth} from "../../shared/auth";
import {appCheckCallableOptions} from "../../shared/callableOptions";
import {checkRateLimit} from "../../shared/rateLimit";
import {EventAssistanceRuntimeConfigStore} from "./runtimeConfigStore";

interface Dependencies {
  db: typeof getFirestore;
  rateLimit: typeof checkRateLimit;
  store: (db: ReturnType<typeof getFirestore>) =>
    Pick<EventAssistanceRuntimeConfigStore, "get" | "set">;
}
const defaults: Dependencies = {db: getFirestore, rateLimit: checkRateLimit,
  store: (db) => new EventAssistanceRuntimeConfigStore(db)};

export async function getEventAssistanceRuntimeConfigHandler(
  request: CallableRequest<unknown>, deps: Dependencies = defaults
) {
  const uid = requireAuth(request);
  const db = deps.db();
  await deps.rateLimit(db, uid, "getEventAssistanceRuntimeConfig", {
    maxRequests: 60, windowMs: 60_000,
  });
  return deps.store(db).get(uid, request.data);
}

export async function setEventAssistanceRuntimeConfigHandler(
  request: CallableRequest<unknown>, deps: Dependencies = defaults
) {
  const uid = requireAuth(request);
  const db = deps.db();
  await deps.rateLimit(db, uid, "setEventAssistanceRuntimeConfig", {
    maxRequests: 30, windowMs: 60_000,
  });
  return deps.store(db).set(uid, request.data);
}

export const getEventAssistanceRuntimeConfig = onCall(appCheckCallableOptions,
  (request) => getEventAssistanceRuntimeConfigHandler(request));
export const setEventAssistanceRuntimeConfig = onCall(appCheckCallableOptions,
  (request) => setEventAssistanceRuntimeConfigHandler(request));
