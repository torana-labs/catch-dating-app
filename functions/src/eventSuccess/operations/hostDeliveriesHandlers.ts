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
    Pick<EventAssistanceDeliveriesStore, "repair">;
}
const defaults: Dependencies = {db: getFirestore, rateLimit: checkRateLimit,
  store: (db) => new EventAssistanceDeliveriesStore(db)};

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

export const repairEventAssistanceDelivery = onCall(appCheckCallableOptions,
  (request) => repairEventAssistanceDeliveryHandler(request));
