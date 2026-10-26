import {getFirestore} from "firebase-admin/firestore";
import {CallableRequest, onCall} from "firebase-functions/v2/https";
import {requireAuth} from "../../shared/auth";
import {appCheckCallableOptions} from "../../shared/callableOptions";
import {checkRateLimit} from "../../shared/rateLimit";
import {CheckpointCloseoutStore} from "./checkpointCloseoutStore";

interface Dependencies {
  db: typeof getFirestore;
  rateLimit: typeof checkRateLimit;
  store: (db: ReturnType<typeof getFirestore>) =>
    Pick<CheckpointCloseoutStore, "set">;
}
const defaults: Dependencies = {db: getFirestore, rateLimit: checkRateLimit,
  store: (db) => new CheckpointCloseoutStore(db)};

export async function setEventAssistanceCheckpointCloseoutHandler(
  request: CallableRequest<unknown>, deps: Dependencies = defaults
) {
  const uid = requireAuth(request);
  const db = deps.db();
  await deps.rateLimit(db, uid, "setEventAssistanceCheckpointCloseout", {
    maxRequests: 30, windowMs: 60_000,
  });
  return deps.store(db).set(uid, request.data);
}
export const setEventAssistanceCheckpointCloseout = onCall(
  appCheckCallableOptions,
  (request) => setEventAssistanceCheckpointCloseoutHandler(request));
