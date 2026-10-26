import {getFirestore} from "firebase-admin/firestore";
import {CallableRequest, onCall} from "firebase-functions/v2/https";
import {requireAuth} from "../../shared/auth";
import {appCheckCallableOptions} from "../../shared/callableOptions";
import {checkRateLimit} from "../../shared/rateLimit";
import {CheckpointReporterStore} from "./checkpointReporterStore";

interface Dependencies {
  db: typeof getFirestore;
  rateLimit: typeof checkRateLimit;
  store: (db: ReturnType<typeof getFirestore>) =>
    Pick<CheckpointReporterStore, "reassign">;
}
const defaults: Dependencies = {db: getFirestore, rateLimit: checkRateLimit,
  store: (db) => new CheckpointReporterStore(db)};

export async function reassignEventAssistanceCheckpointReporterHandler(
  request: CallableRequest<unknown>, deps: Dependencies = defaults
) {
  const uid = requireAuth(request);
  const db = deps.db();
  await deps.rateLimit(db, uid, "reassignEventAssistanceCheckpointReporter", {
    maxRequests: 30, windowMs: 60_000,
  });
  return deps.store(db).reassign(uid, request.data);
}
export const reassignEventAssistanceCheckpointReporter = onCall(
  appCheckCallableOptions,
  (request) => reassignEventAssistanceCheckpointReporterHandler(request));
