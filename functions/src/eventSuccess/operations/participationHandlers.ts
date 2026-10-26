import {getFirestore} from "firebase-admin/firestore";
import {CallableRequest, onCall} from "firebase-functions/v2/https";
import {requireAuth} from "../../shared/auth";
import {appCheckCallableOptions} from "../../shared/callableOptions";
import {checkRateLimit} from "../../shared/rateLimit";
import {EventParticipationStore} from "./participationStore";

interface Dependencies {
  db: typeof getFirestore;
  rateLimit: typeof checkRateLimit;
  store: (db: ReturnType<typeof getFirestore>) =>
    Pick<EventParticipationStore, "get" | "set">;
}
const defaults: Dependencies = {db: getFirestore, rateLimit: checkRateLimit,
  store: (db) => new EventParticipationStore(db)};

export async function getEventAssistanceParticipationHandler(
  request: CallableRequest<unknown>, deps: Dependencies = defaults
) {
  const uid = requireAuth(request);
  const db = deps.db();
  await deps.rateLimit(db, uid, "getEventAssistanceParticipation", {
    maxRequests: 60, windowMs: 60_000,
  });
  return deps.store(db).get(uid, request.data);
}

export async function setEventAssistanceParticipationHandler(
  request: CallableRequest<unknown>, deps: Dependencies = defaults
) {
  const uid = requireAuth(request);
  const db = deps.db();
  await deps.rateLimit(db, uid, "setEventAssistanceParticipation", {
    maxRequests: 30, windowMs: 60_000,
  });
  return deps.store(db).set(uid, request.data);
}

export const getEventAssistanceParticipation = onCall(appCheckCallableOptions,
  (request) => getEventAssistanceParticipationHandler(request));
export const setEventAssistanceParticipation = onCall(appCheckCallableOptions,
  (request) => setEventAssistanceParticipationHandler(request));
