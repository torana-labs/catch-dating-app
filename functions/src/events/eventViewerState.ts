import {readGuestEventViewerState} from "./guestEventViewerState";
import * as admin from "firebase-admin";
import {onCall, HttpsError, type CallableRequest} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {validateGetEventViewerStateCallablePayload} from
  "../shared/generated/validators/getEventViewerStateInput";
import {validateGetEventViewerStateCallableResponse} from
  "../shared/generated/validators/getEventViewerStateOutput";
import type {GetEventViewerStateCallableResponse as Response} from
  "../shared/generated/getEventViewerStateCallableResponse";
import {readEventViewerStateSource} from "./eventViewerStateSource";

interface Deps {
  db: () => FirebaseFirestore.Firestore;
  rateLimit: typeof checkRateLimit;
  nowMillis: () => number;
  read: typeof readEventViewerStateSource;
  readGuest?: typeof readGuestEventViewerState;
}
const defaults: Deps = {db: () => admin.firestore(), rateLimit: checkRateLimit,
  nowMillis: Date.now, read: readEventViewerStateSource};

export async function getEventViewerStateHandler(
  request: CallableRequest<unknown>, deps: Deps = defaults
): Promise<Response> {
  const uid = requireAuth(request);
  const payload = validateCallableWithAjv(request,
    validateGetEventViewerStateCallablePayload);
  const db = deps.db();
  await deps.rateLimit(db, uid, "getEventViewerState", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  const phoneE164 = request.auth?.token.phone_number;
  if (payload.surface === "guest" && typeof phoneE164 !== "string") {
    throw new HttpsError("unauthenticated", "Verify your phone to continue.");
  }
  const viewer = payload.surface === "guest" ?
    await (deps.readGuest ?? readGuestEventViewerState)({db, uid,
      eventId: payload.eventId, phoneE164: phoneE164 as string,
      nowMillis: deps.nowMillis()}) : await deps.read({db, uid,
      eventId: payload.eventId,
      inviteCode: payload.inviteCode, publicPaymentId: payload.publicPaymentId,
      nowMillis: deps.nowMillis(),
      ...(payload.includeHostMembership ? {includeHostMembership: true} : {})});
  if (!viewer) {
    throw new HttpsError("not-found", "This event is unavailable.");
  }
  const result = {viewer};
  if (!validateGetEventViewerStateCallableResponse(result)) {
    throw new HttpsError("internal", "Invalid event viewer state.");
  }
  return result;
}

const limits = {timeoutSeconds: 30, maxInstances: 20};
export const getEventViewerState = onCall(
  appCheckCallableOptionsWithLimits(limits),
  (request) => getEventViewerStateHandler(request));
