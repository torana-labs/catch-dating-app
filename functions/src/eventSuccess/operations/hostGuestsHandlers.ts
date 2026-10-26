import {getFirestore} from "firebase-admin/firestore";
import {CallableRequest, onCall} from "firebase-functions/v2/https";
import {requireAuth} from "../../shared/auth";
import {appCheckCallableOptions} from "../../shared/callableOptions";
import {checkRateLimit} from "../../shared/rateLimit";
import {EventAssistanceHostGuestsStore} from "./hostGuestsStore";

interface Dependencies {
  db: typeof getFirestore;
  rateLimit: typeof checkRateLimit;
  store: (db: ReturnType<typeof getFirestore>) =>
    Pick<EventAssistanceHostGuestsStore, "get">;
}
const defaults: Dependencies = {db: getFirestore, rateLimit: checkRateLimit,
  store: (db) => new EventAssistanceHostGuestsStore(db)};

export async function getEventAssistanceHostGuestsHandler(
  request: CallableRequest<unknown>, deps: Dependencies = defaults
) {
  const uid = requireAuth(request);
  const db = deps.db();
  await deps.rateLimit(db, uid, "getEventAssistanceHostGuests", {
    maxRequests: 30, windowMs: 60_000,
  });
  return deps.store(db).get(uid, request.data);
}

export const getEventAssistanceHostGuests = onCall(appCheckCallableOptions,
  (request) => getEventAssistanceHostGuestsHandler(request));
