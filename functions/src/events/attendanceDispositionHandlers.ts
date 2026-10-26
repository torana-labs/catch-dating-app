import {getFirestore} from "firebase-admin/firestore";
import {CallableRequest, onCall} from "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {EventAttendanceDispositionStore} from "./attendanceDispositionStore";

interface Dependencies {
  db: typeof getFirestore;
  rateLimit: typeof checkRateLimit;
  store: (db: ReturnType<typeof getFirestore>) =>
    Pick<EventAttendanceDispositionStore, "get" | "recordNoShow">;
}
const defaults: Dependencies = {db: getFirestore, rateLimit: checkRateLimit,
  store: (db) => new EventAttendanceDispositionStore(db)};

export async function getEventAttendanceDispositionHandler(
  request: CallableRequest<unknown>, deps: Dependencies = defaults
) {
  const uid = requireAuth(request);
  const db = deps.db();
  await deps.rateLimit(db, uid, "getEventAttendanceDisposition", {
    maxRequests: 120, windowMs: 60 * 1000,
  });
  return deps.store(db).get(uid, request.data);
}

export async function recordEventNoShowHandler(
  request: CallableRequest<unknown>, deps: Dependencies = defaults
) {
  const uid = requireAuth(request);
  const db = deps.db();
  await deps.rateLimit(db, uid, "recordEventNoShow", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  return deps.store(db).recordNoShow(uid, request.data);
}

export const getEventAttendanceDisposition = onCall(appCheckCallableOptions,
  (request) => getEventAttendanceDispositionHandler(request));
export const recordEventNoShow = onCall(appCheckCallableOptions,
  (request) => recordEventNoShowHandler(request));
