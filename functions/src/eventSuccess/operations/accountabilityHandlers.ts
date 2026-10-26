import {getFirestore} from "firebase-admin/firestore";
import {CallableRequest, onCall} from "firebase-functions/v2/https";
import {requireAuth} from "../../shared/auth";
import {appCheckCallableOptions} from "../../shared/callableOptions";
import {checkRateLimit} from "../../shared/rateLimit";
import {EventAccountabilityStore} from "./accountabilityStore";

interface Dependencies {
  db: typeof getFirestore;
  rateLimit: typeof checkRateLimit;
  store: (db: ReturnType<typeof getFirestore>) =>
    Pick<EventAccountabilityStore, "get" | "resolve">;
}
const defaults: Dependencies = {db: getFirestore, rateLimit: checkRateLimit,
  store: (db) => new EventAccountabilityStore(db)};

export async function getEventAssistanceAccountabilityHandler(
  request: CallableRequest<unknown>, deps: Dependencies = defaults
) {
  const uid = requireAuth(request);
  const db = deps.db();
  await deps.rateLimit(db, uid, "getEventAssistanceAccountability", {
    maxRequests: 60, windowMs: 60_000,
  });
  return deps.store(db).get(uid, request.data);
}

export async function resolveEventAssistanceAccountabilityHandler(
  request: CallableRequest<unknown>, deps: Dependencies = defaults
) {
  const uid = requireAuth(request);
  const db = deps.db();
  await deps.rateLimit(db, uid, "resolveEventAssistanceAccountability", {
    maxRequests: 30, windowMs: 60_000,
  });
  return deps.store(db).resolve(uid, request.data);
}

export const getEventAssistanceAccountability = onCall(appCheckCallableOptions,
  (request) => getEventAssistanceAccountabilityHandler(request));
export const resolveEventAssistanceAccountability = onCall(
  appCheckCallableOptions,
  (request) => resolveEventAssistanceAccountabilityHandler(request));
