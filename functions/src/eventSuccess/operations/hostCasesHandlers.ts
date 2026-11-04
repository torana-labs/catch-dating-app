import {getFirestore} from "firebase-admin/firestore";
import {CallableRequest, onCall} from "firebase-functions/v2/https";
import {requireAuth} from "../../shared/auth";
import {appCheckCallableOptions} from "../../shared/callableOptions";
import {checkRateLimit} from "../../shared/rateLimit";
import {EventAssistanceCasesStore} from "./hostCasesStore";

interface Dependencies {
  db: typeof getFirestore;
  rateLimit: typeof checkRateLimit;
  store: (db: ReturnType<typeof getFirestore>) =>
    Pick<EventAssistanceCasesStore, "resolve">;
}
const defaults: Dependencies = {db: getFirestore, rateLimit: checkRateLimit,
  store: (db) => new EventAssistanceCasesStore(db)};

export async function resolveEventAssistanceCaseHandler(
  request: CallableRequest<unknown>, deps: Dependencies = defaults
) {
  const uid = requireAuth(request);
  const db = deps.db();
  await deps.rateLimit(db, uid, "resolveEventAssistanceCase", {
    maxRequests: 30, windowMs: 60_000,
  });
  return deps.store(db).resolve(uid, request.data);
}

export const resolveEventAssistanceCase = onCall(appCheckCallableOptions,
  (request) => resolveEventAssistanceCaseHandler(request));
