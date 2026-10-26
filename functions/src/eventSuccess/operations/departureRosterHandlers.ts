import {getFirestore} from "firebase-admin/firestore";
import {CallableRequest, onCall} from "firebase-functions/v2/https";
import {requireAuth} from "../../shared/auth";
import {appCheckCallableOptions} from "../../shared/callableOptions";
import {checkRateLimit} from "../../shared/rateLimit";
import {EventDepartureRosterStore} from "./departureRosterStore";

interface Dependencies {
  db: typeof getFirestore;
  rateLimit: typeof checkRateLimit;
  store: (db: ReturnType<typeof getFirestore>) =>
    Pick<EventDepartureRosterStore, "get">;
}
const defaults: Dependencies = {db: getFirestore, rateLimit: checkRateLimit,
  store: (db) => new EventDepartureRosterStore(db)};

export async function getEventAssistanceDepartureRosterHandler(
  request: CallableRequest<unknown>, deps: Dependencies = defaults
) {
  const uid = requireAuth(request);
  const db = deps.db();
  await deps.rateLimit(db, uid, "getEventAssistanceDepartureRoster", {
    maxRequests: 60, windowMs: 60_000,
  });
  return deps.store(db).get(uid, request.data);
}

export const getEventAssistanceDepartureRoster = onCall(appCheckCallableOptions,
  (request) => getEventAssistanceDepartureRosterHandler(request));
