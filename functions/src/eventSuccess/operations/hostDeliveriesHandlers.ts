import {getFirestore} from "firebase-admin/firestore";
import {CallableRequest, onCall} from "firebase-functions/v2/https";
import {requireAuth} from "../../shared/auth";
import {appCheckCallableOptions} from "../../shared/callableOptions";
import {checkRateLimit} from "../../shared/rateLimit";
import {EventAssistanceDeliveriesStore} from "./hostDeliveriesStore";

interface Dependencies {
  db: typeof getFirestore;
  rateLimit: typeof checkRateLimit;
  store: (db: ReturnType<typeof getFirestore>) =>
    Pick<EventAssistanceDeliveriesStore, "list" | "repair">;
}
const defaults: Dependencies = {db: getFirestore, rateLimit: checkRateLimit,
  store: (db) => new EventAssistanceDeliveriesStore(db)};

export async function listEventAssistanceDeliveriesHandler(
  request: CallableRequest<unknown>, deps: Dependencies = defaults
) {
  const uid = requireAuth(request);
  const db = deps.db();
  await deps.rateLimit(db, uid, "listEventAssistanceDeliveries", {
    maxRequests: 30, windowMs: 60_000,
  });
  return deps.store(db).list(uid, request.data);
}

export async function repairEventAssistanceDeliveryHandler(
  request: CallableRequest<unknown>, deps: Dependencies = defaults
) {
  const uid = requireAuth(request);
  const db = deps.db();
  await deps.rateLimit(db, uid, "repairEventAssistanceDelivery", {
    maxRequests: 30, windowMs: 60_000,
  });
  return deps.store(db).repair(uid, request.data);
}

export const listEventAssistanceDeliveries = onCall(appCheckCallableOptions,
  (request) => listEventAssistanceDeliveriesHandler(request));
export const repairEventAssistanceDelivery = onCall(appCheckCallableOptions,
  (request) => repairEventAssistanceDeliveryHandler(request));
