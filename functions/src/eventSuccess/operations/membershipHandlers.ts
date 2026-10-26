import {getFirestore} from "firebase-admin/firestore";
import {CallableRequest, onCall} from "firebase-functions/v2/https";
import {requireAuth} from "../../shared/auth";
import {appCheckCallableOptions} from "../../shared/callableOptions";
import {checkRateLimit} from "../../shared/rateLimit";
import {EventMembershipStore} from "./membershipStore";
interface Dependencies {
  db: typeof getFirestore;
  rateLimit: typeof checkRateLimit;
  store: (db: ReturnType<typeof getFirestore>) =>
    Pick<EventMembershipStore, "get" | "transfer">;
}
const defaults: Dependencies = {db: getFirestore, rateLimit: checkRateLimit,
  store: (db) => new EventMembershipStore(db)};
export async function getEventAssistanceMembershipHandler(
  request: CallableRequest<unknown>, deps: Dependencies = defaults
) {
  const actor = requireAuth(request);
  const db = deps.db();
  await deps.rateLimit(db, actor, "getEventAssistanceMembership", {
    maxRequests: 60, windowMs: 60_000,
  });
  return deps.store(db).get(actor, request.data);
}
export async function transferEventAssistanceGroupHandler(
  request: CallableRequest<unknown>, deps: Dependencies = defaults
) {
  const actor = requireAuth(request);
  const db = deps.db();
  await deps.rateLimit(db, actor, "transferEventAssistanceGroup", {
    maxRequests: 30, windowMs: 60_000,
  });
  return deps.store(db).transfer(actor, request.data);
}
export const getEventAssistanceMembership = onCall(appCheckCallableOptions,
  (request) => getEventAssistanceMembershipHandler(request));
export const transferEventAssistanceGroup = onCall(appCheckCallableOptions,
  (request) => transferEventAssistanceGroupHandler(request));
