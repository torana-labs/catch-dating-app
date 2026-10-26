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
    Pick<EventAssistanceCasesStore, "list" | "resolve">;
}
const defaults: Dependencies = {db: getFirestore, rateLimit: checkRateLimit,
  store: (db) => new EventAssistanceCasesStore(db)};

export async function listEventAssistanceCasesHandler(
  request: CallableRequest<unknown>, deps: Dependencies = defaults
) {
  const uid = requireAuth(request);
  const db = deps.db();
  await deps.rateLimit(db, uid, "listEventAssistanceCases", {
    maxRequests: 30, windowMs: 60_000,
  });
  return deps.store(db).list(uid, request.data);
}

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

export const listEventAssistanceCases = onCall(appCheckCallableOptions,
  (request) => listEventAssistanceCasesHandler(request));
export const resolveEventAssistanceCase = onCall(appCheckCallableOptions,
  (request) => resolveEventAssistanceCaseHandler(request));
