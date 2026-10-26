import {getFirestore} from "firebase-admin/firestore";
import {CallableRequest, onCall} from "firebase-functions/v2/https";
import {requireAuth} from "../../shared/auth";
import {appCheckCallableOptions} from "../../shared/callableOptions";
import {checkRateLimit} from "../../shared/rateLimit";
import {EventGroupProgressStore} from "./groupProgressStore";

interface Dependencies {
  db: typeof getFirestore;
  rateLimit: typeof checkRateLimit;
  store: (db: ReturnType<typeof getFirestore>) =>
    Pick<EventGroupProgressStore, "get" | "confirmDeparture" | "changeRoute">;
}
const defaults: Dependencies = {db: getFirestore, rateLimit: checkRateLimit,
  store: (db) => new EventGroupProgressStore(db)};

export async function getEventAssistanceGroupProgressHandler(
  request: CallableRequest<unknown>, deps: Dependencies = defaults
) {
  const uid = requireAuth(request);
  const db = deps.db();
  await deps.rateLimit(db, uid, "getEventAssistanceGroupProgress", {
    maxRequests: 60, windowMs: 60_000,
  });
  return deps.store(db).get(uid, request.data);
}

export async function confirmEventAssistanceDepartureHandler(
  request: CallableRequest<unknown>, deps: Dependencies = defaults
) {
  const uid = requireAuth(request);
  const db = deps.db();
  await deps.rateLimit(db, uid, "confirmEventAssistanceDeparture", {
    maxRequests: 30, windowMs: 60_000,
  });
  return deps.store(db).confirmDeparture(uid, request.data);
}

export async function changeEventAssistanceRouteHandler(
  request: CallableRequest<unknown>, deps: Dependencies = defaults
) {
  const uid = requireAuth(request);
  const db = deps.db();
  await deps.rateLimit(db, uid, "changeEventAssistanceRoute", {
    maxRequests: 30, windowMs: 60_000,
  });
  return deps.store(db).changeRoute(uid, request.data);
}

export const getEventAssistanceGroupProgress = onCall(appCheckCallableOptions,
  (request) => getEventAssistanceGroupProgressHandler(request));
export const confirmEventAssistanceDeparture = onCall(appCheckCallableOptions,
  (request) => confirmEventAssistanceDepartureHandler(request));
export const changeEventAssistanceRoute = onCall(appCheckCallableOptions,
  (request) => changeEventAssistanceRouteHandler(request));
