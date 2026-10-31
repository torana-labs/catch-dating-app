import * as admin from "firebase-admin";
import type {Firestore} from "firebase-admin/firestore";
import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import {requireAuth} from "../../shared/auth";
import {appCheckCallableOptions} from "../../shared/callableOptions";
import {checkRateLimit} from "../../shared/rateLimit";
import {validateCallableWithAjv} from "../../shared/validation";
import {validateGetEventAssistanceParticipantContextCallablePayload} from
  "../../shared/generated/validators/getEventAssistanceParticipantContextInput";
import {validateEventAssistanceParticipantContextCallableResponse} from
  "../../shared/generated/validators/eventAssistanceParticipantContextOutput";
import type {EventAssistanceParticipantContextCallableResponse as Result} from
  "../../shared/generated/eventAssistanceParticipantContextCallableResponse";
import {operationContentHash} from "../../operations/durableActions";
import {guestSourceFactsFromSnapshots, requireDocumentId} from "./guestRecords";

/** Only linked UID resolves identity; names and phone guesses cannot. */
export async function readParticipantContext(db: Firestore, uid: string,
  eventId: string, clock: () => number = Date.now): Promise<Result> {
  requireDocumentId(uid); requireDocumentId(eventId);
  return db.runTransaction(async (tx) => {
    const eventSnap = await tx.get(db.collection("events").doc(eventId));
    const event = eventSnap.data();
    const organizerId = event?.organizerId;
    if (!event || typeof organizerId !== "string" || !organizerId ||
        !["active", "cancelled"].includes(event.status)) {
      throw unavailable();
    }
    requireDocumentId(organizerId);
    // Two matching rows prove ambiguity. There is no full roster read and no
    // ranking by status, phone, booking source or arbitrary document order.
    const linked = await tx.get(db.collection("eventAttendees")
      .where("eventId", "==", eventId).where("linkedUid", "==", uid).limit(2));
    const serverTime = clock();
    if (!Number.isSafeInteger(serverTime) || serverTime < 0) {
      throw new HttpsError("unavailable", "Event identity clock is behind.");
    }
    const base = {eventId, subjectUid: uid, serverTime};
    if (!linked.docs.length) {
      return {...base, resolution: {kind: "unlinked" as const}};
    }
    if (linked.docs.length > 1) {
      return {...base, resolution: {kind: "ambiguous" as const}};
    }
    const attendeeId = requireDocumentId(linked.docs[0].id);
    const attendeeSnap = await tx.get(db.collection("eventAttendees")
      .doc(attendeeId));
    if (attendeeSnap.data()?.linkedUid !== uid) throw unavailable();
    const context = {mode: "live" as const, eventId, organizerId};
    const source = guestSourceFactsFromSnapshots(context, attendeeId,
      eventSnap, attendeeSnap);
    return {...base, resolution: {kind: "linked" as const,
      organizerId, attendeeId, sourceHash: operationContentHash([
        context, attendeeId, uid, source.sourceGeneration,
        source.attendeeGeneration,
      ])}};
  }, {readOnly: true});
}

export interface ParticipantContextDeps {
  firestore: () => Firestore;
  checkRateLimit: typeof checkRateLimit;
  now: () => number;
}
const defaults: ParticipantContextDeps = {
  firestore: () => admin.firestore(), checkRateLimit, now: Date.now,
};
export async function getEventAssistanceParticipantContextHandler(
  request: CallableRequest<unknown>, deps: ParticipantContextDeps = defaults
): Promise<Result> {
  const uid = requireAuth(request);
  const input = validateCallableWithAjv(request,
    validateGetEventAssistanceParticipantContextCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, uid, "getEventAssistanceParticipantContext", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  const result = await readParticipantContext(db, uid, input.eventId, deps.now);
  if (!validateEventAssistanceParticipantContextCallableResponse(result)) {
    throw new HttpsError("internal", "Event identity unavailable.");
  }
  return result;
}
export const getEventAssistanceParticipantContext = onCall(
  appCheckCallableOptions,
  (request) => getEventAssistanceParticipantContextHandler(request)
);
function unavailable(): HttpsError {
  return new HttpsError("not-found", "Event identity unavailable.");
}
