import {getFirestore} from "firebase-admin/firestore";
import {CallableRequest, onCall} from "firebase-functions/v2/https";
import {requireAuth} from "../../shared/auth";
import {appCheckCallableOptions} from "../../shared/callableOptions";
import {checkRateLimit} from "../../shared/rateLimit";
import {EventCheckpointStore} from "./checkpointStore";

interface Dependencies {
  db: typeof getFirestore;
  rateLimit: typeof checkRateLimit;
  store: (db: ReturnType<typeof getFirestore>) =>
    Pick<EventCheckpointStore, "get" | "record">;
}
const defaults: Dependencies = {db: getFirestore, rateLimit: checkRateLimit,
  store: (db) => new EventCheckpointStore(db)};

export async function getEventAssistanceCheckpointHandler(
  request: CallableRequest<unknown>, deps: Dependencies = defaults
) {
  const uid = requireAuth(request);
  const db = deps.db();
  await deps.rateLimit(db, uid, "getEventAssistanceCheckpoint", {
    maxRequests: 60, windowMs: 60_000,
  });
  return deps.store(db).get(uid, request.data);
}
export async function recordEventAssistanceCheckpointHandler(
  request: CallableRequest<unknown>, deps: Dependencies = defaults
) {
  const uid = requireAuth(request);
  const db = deps.db();
  await deps.rateLimit(db, uid, "recordEventAssistanceCheckpoint", {
    maxRequests: 30, windowMs: 60_000,
  });
  return deps.store(db).record(uid, request.data);
}
export const getEventAssistanceCheckpoint = onCall(appCheckCallableOptions,
  (request) => getEventAssistanceCheckpointHandler(request));
export const recordEventAssistanceCheckpoint = onCall(appCheckCallableOptions,
  (request) => recordEventAssistanceCheckpointHandler(request));
