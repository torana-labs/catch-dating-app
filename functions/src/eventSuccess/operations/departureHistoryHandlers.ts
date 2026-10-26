import {getFirestore} from "firebase-admin/firestore";
import {CallableRequest, onCall} from "firebase-functions/v2/https";
import {requireAuth} from "../../shared/auth";
import {appCheckCallableOptions} from "../../shared/callableOptions";
import {checkRateLimit} from "../../shared/rateLimit";
import {EventDepartureHistoryStore} from "./departureHistoryStore";

interface Dependencies {
  db: typeof getFirestore;
  rateLimit: typeof checkRateLimit;
  store: (db: ReturnType<typeof getFirestore>) =>
    Pick<EventDepartureHistoryStore, "list">;
}
const defaults: Dependencies = {db: getFirestore, rateLimit: checkRateLimit,
  store: (db) => new EventDepartureHistoryStore(db)};

export async function listEventAssistanceDepartureRostersHandler(
  request: CallableRequest<unknown>, deps: Dependencies = defaults
) {
  const uid = requireAuth(request);
  const db = deps.db();
  await deps.rateLimit(db, uid, "listEventAssistanceDepartureRosters", {
    maxRequests: 30, windowMs: 60_000,
  });
  return deps.store(db).list(uid, request.data);
}

export const listEventAssistanceDepartureRosters = onCall(
  appCheckCallableOptions,
  (request) => listEventAssistanceDepartureRostersHandler(request));
