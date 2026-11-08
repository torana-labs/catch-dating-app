import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {operationContentHash} from "../operations/durableActions";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithSecrets} from
  "../shared/callableOptions";
import type {EventAssistanceCaseDocument} from
  "../shared/generated/eventAssistanceCaseDocument";
import type {EventAttendeeDocument} from
  "../shared/generated/firestoreAdminTypes";
import type {RequestEventRuntimeHostHelpCallablePayload} from
  "../shared/generated/requestEventRuntimeHostHelpCallablePayload";
import type {RequestEventRuntimeHostHelpCallableResponse} from
  "../shared/generated/requestEventRuntimeHostHelpCallableResponse";
import {validateEventAssistanceCaseDocument} from
  "../shared/generated/validators/eventAssistanceCaseDocument";
import {validateRequestEventRuntimeHostHelpCallablePayload} from
  "../shared/generated/validators/requestEventRuntimeHostHelpInput";
import {validateRequestEventRuntimeHostHelpCallableResponse} from
  "../shared/generated/validators/requestEventRuntimeHostHelpOutput";
import {checkRateLimit} from "../shared/rateLimit";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {
  eventVenueSessionSigningKey,
  verifyEventVenueSessionToken,
} from "../events/venueSessions";
import {
  eventRuntimeParticipantId,
  normalizeRuntimeIdPayload,
  requireRuntimeParticipant,
  resolveRuntimeEvent,
} from "./eventRuntime";
import {
  guestCollections,
  type GuestSourceFacts,
  guestIdentity,
  readGuestSourceFacts,
} from "./operations/guestRecords";

/** Help stays open to guests for a while after the event's end. */
const helpAfterEndMillis = 2 * 60 * 60 * 1000;

type LiveContext = {mode: "live"; eventId: string; organizerId: string};

export interface EventRuntimeHostHelpDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  nowMillis: () => number;
  resolveEvent: typeof resolveRuntimeEvent;
  verifyVenueSessionToken: typeof verifyEventVenueSessionToken;
  sourceFacts: (db: FirebaseFirestore.Firestore,
    tx: FirebaseFirestore.Transaction, context: LiveContext,
    attendeeId: string) => Promise<GuestSourceFacts>;
}

const defaultDeps: EventRuntimeHostHelpDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  nowMillis: () => Date.now(),
  resolveEvent: resolveRuntimeEvent,
  verifyVenueSessionToken: verifyEventVenueSessionToken,
  sourceFacts: readGuestSourceFacts,
};

/** The response id of one runtime help request, stable across retries. */
export function runtimeHelpResponseId(eventId: string, uid: string,
  requestId: string): string {
  return "runtimeHelp:" + operationContentHash(
    ["runtime-help/v1", eventId, uid, requestId]);
}

/**
 * A ready no-download participant asks the host for practical help. It
 * opens the same event-lead case a guest's in-app help request does, so the
 * live console sees it through hostEventCaseViews and resolves it there.
 * The case id derives from the caller, the event and requestId, so a retry
 * returns the case the first attempt opened. Runtime requests have no
 * outbox message: messageId is the deterministic hash of the request.
 */
export async function requestEventRuntimeHostHelpHandler(
  request: CallableRequest<unknown>,
  deps: EventRuntimeHostHelpDeps = defaultDeps
): Promise<RequestEventRuntimeHostHelpCallableResponse> {
  const uid = requireAuth(request);
  const payload =
    validateCallableWithAjv<RequestEventRuntimeHostHelpCallablePayload>(
      request, validateRequestEventRuntimeHostHelpCallablePayload,
      normalizeRuntimeIdPayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, uid, "requestEventRuntimeHostHelp", {
    maxRequests: 5, windowMs: 10 * 60 * 1000,
  });
  const resolved = await deps.resolveEvent(db, payload.publicRuntimeId);
  const eventId = resolved.eventId;
  const context: LiveContext = {mode: "live", eventId,
    organizerId: resolved.event.organizerId};
  const responseId = runtimeHelpResponseId(eventId, uid, payload.requestId);
  const caseId = "case:" + operationContentHash(responseId);
  const caseRef = db.collection(guestCollections.cases).doc(caseId);
  const participantRef = db.collection("eventRuntimeParticipants")
    .doc(eventRuntimeParticipantId(eventId, uid));

  const response = await db.runTransaction(async (tx):
    Promise<RequestEventRuntimeHostHelpCallableResponse> => {
    const [caseSnap, participantSnap] = await Promise.all([
      tx.get(caseRef), tx.get(participantRef)]);
    if (caseSnap.exists) {
      const existing = caseSnap.data() as Partial<EventAssistanceCaseDocument>;
      if (existing.responseId !== responseId) {
        throw new HttpsError("internal", "Help request identity collided.");
      }
      return {caseId, status: existing.status === "resolved" ?
        "resolved" : "open", replayed: true};
    }
    const participant = requireRuntimeParticipant(participantSnap, eventId,
      uid);
    if (participant.accessStatus !== "ready" || !participant.eventAttendeeId) {
      throw new HttpsError("failed-precondition",
        "Finish the event profile before asking the host.");
    }
    const attendeeId = participant.eventAttendeeId;
    const attendeeSnap = await tx.get(
      db.collection("eventAttendees").doc(attendeeId));
    if (!attendeeSnap.exists) {
      throw new HttpsError("not-found", "Guest-list entry not found.");
    }
    const attendee = requireDoc<EventAttendeeDocument>(attendeeSnap,
      "EventAttendeeDocument");
    if (attendee.eventId !== eventId || attendee.linkedUid !== uid ||
        (attendee.status !== "registered" &&
          attendee.status !== "checkedIn")) {
      throw new HttpsError("failed-precondition",
        "This guest-list entry cannot ask the host for help.");
    }
    const now = deps.nowMillis();
    if (attendee.status !== "checkedIn") {
      // Not checked in yet: prove presence the way check-in does.
      if (!payload.venueSessionToken) {
        throw new HttpsError("failed-precondition",
          "Scan the host's code at the venue first.",
          {reason: "venueSessionRequired"});
      }
      deps.verifyVenueSessionToken({token: payload.venueSessionToken,
        eventId, nowMillis: now});
    }
    let source: GuestSourceFacts;
    try {
      source = await deps.sourceFacts(db, tx, context, attendeeId);
    } catch {
      throw new HttpsError("failed-precondition",
        "This event cannot take help requests right now.");
    }
    if (source.eventStatus !== "active" ||
        now > source.eventEnd + helpAfterEndMillis) {
      throw new HttpsError("failed-precondition",
        "This event has ended. Use Help and safety instead.",
        {reason: "eventEnded"});
    }
    const guestId = guestIdentity(context, attendeeId);
    const helpCase = {
      schemaVersion: 1 as const,
      caseId,
      guestId,
      context,
      attendeeId,
      episodeId: "episode:" + operationContentHash(["runtime-help/v1",
        guestId, source.sourceGeneration, source.attendeeGeneration]),
      responseId,
      messageId: "outbox:" + operationContentHash(
        ["runtime-help/v1", responseId]),
      status: "open" as const,
      category: payload.category,
      receivedAt: now,
      sourceGeneration: source.sourceGeneration,
      attendeeGeneration: source.attendeeGeneration,
      handling: {revision: 0, assigneeUid: null, updatedAt: now,
        resolution: null},
      owner: "eventLead" as const,
    };
    if (!validateEventAssistanceCaseDocument(helpCase)) {
      throw new HttpsError("internal", "Help request failed its contract.");
    }
    tx.create(caseRef, helpCase);
    return {caseId, status: "open", replayed: false};
  });
  if (!validateRequestEventRuntimeHostHelpCallableResponse(response)) {
    throw new HttpsError("internal", "Help request failed its contract.");
  }
  return response;
}

export const requestEventRuntimeHostHelp = onCall(
  appCheckCallableOptionsWithSecrets([eventVenueSessionSigningKey]),
  (request) => requestEventRuntimeHostHelpHandler(request)
);
