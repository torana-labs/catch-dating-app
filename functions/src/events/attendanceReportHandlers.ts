import {getFirestore} from "firebase-admin/firestore";
import {CallableRequest, onCall} from "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {EventAttendanceReportStore} from "./attendanceReport";

interface Dependencies {
  db: typeof getFirestore;
  rateLimit: typeof checkRateLimit;
  store: (db: ReturnType<typeof getFirestore>) =>
    Pick<EventAttendanceReportStore, "get">;
}
const defaults: Dependencies = {db: getFirestore, rateLimit: checkRateLimit,
  store: (db) => new EventAttendanceReportStore(db)};

export async function getEventAttendanceReportHandler(
  request: CallableRequest<unknown>, deps: Dependencies = defaults
) {
  const uid = requireAuth(request);
  const db = deps.db();
  await deps.rateLimit(db, uid, "getEventAttendanceReport", {
    maxRequests: 10, windowMs: 60 * 1000,
  });
  return deps.store(db).get(uid, request.data);
}

export const getEventAttendanceReport = onCall(appCheckCallableOptions,
  (request) => getEventAttendanceReportHandler(request));
