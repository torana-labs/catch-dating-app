import {onCall, CallableRequest, HttpsError} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import type {
  EventDocument,
  EventSuccessAssignmentDocument,
  EventSuccessConversationGraphDocument,
  EventSuccessPlanDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {EventIdCallablePayload} from
  "../shared/generated/eventIdCallablePayload";
import type {GetEventSuccessConversationGraphCallableResponse} from
  "../shared/generated/getEventSuccessConversationGraphCallableResponse";
import type {SubmitEventSuccessConversationGraphCallablePayload} from
  "../shared/generated/submitEventSuccessConversationGraphCallablePayload";
import type {SubmitEventSuccessConversationGraphCallableResponse} from
  "../shared/generated/submitEventSuccessConversationGraphCallableResponse";
import {
  validateEventIdCallablePayload,
} from "../shared/generated/validators/eventIdInput";
import {
  validateSubmitEventSuccessConversationGraphCallablePayload,
} from
  "../shared/generated/validators/submitEventSuccessConversationGraphInput";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {fetchUidsBlockedWithViewer} from "../shared/candidateVisibility";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {normalizeEventIdPayload} from "../events/eventPayloadNormalization";
import {requireScheduledEvent,
  type ScheduledEventDocument} from "../events/configuredEvent";
import {
  effectiveInteractionModelFor,
  eventSuccessPrimitivesFor,
} from "./formatPrimitives";
import {
  loadEventSuccessRoster,
  loadEventSuccessRosterParticipant,
} from "./eventSuccessRoster";

const ASSIGNMENT_MODULE_IDS = ["micro_pods", "guided_rotations"] as const;

interface ConversationGraphDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  nowMillis: () => number;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: ConversationGraphDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  nowMillis: () => Date.now(),
  checkRateLimit: defaultCheckRateLimit,
};

interface ConversationGraphContext {
  event: ScheduledEventDocument;
  plan: EventSuccessPlanDocument | null;
  candidates: GetEventSuccessConversationGraphCallableResponse["candidates"];
  assignedUids: Set<string>;
  existing: EventSuccessConversationGraphDocument | null;
}

/** Returns the attendee-only end-of-event roster and prior response. */
export async function getEventSuccessConversationGraphHandler(
  request: CallableRequest<unknown>,
  deps: ConversationGraphDeps = defaultDeps
): Promise<GetEventSuccessConversationGraphCallableResponse> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv<EventIdCallablePayload>(
    request,
    validateEventIdCallablePayload,
    normalizeEventIdPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    uid,
    "getEventSuccessConversationGraph",
    {maxRequests: 30, windowMs: 60 * 1000}
  );
  const context = await loadConversationGraphContext({
    db,
    eventId: data.eventId,
    uid,
    nowMillis: deps.nowMillis(),
  });
  const consentMode = conversationGraphConsentMode(context.plan);
  const candidateUids = new Set(context.candidates.map((item) => item.uid));
  let selectedUids: string[] = [];
  if (context.existing?.status === "submitted") {
    selectedUids = context.existing.selectedUids.filter((selectedUid) =>
      candidateUids.has(selectedUid));
  } else if (!context.existing && consentMode === "optOut") {
    selectedUids = context.candidates
      .filter((item) => item.assigned)
      .map((item) => item.uid);
  }
  return {
    eventId: data.eventId,
    consentMode,
    prompt: conversationGraphPrompt(context.event),
    candidates: context.candidates,
    selectedUids,
    submissionStatus: context.existing?.status ?? "unsubmitted",
  };
}

/** Validates and stores one attendee-private graph response. */
export async function submitEventSuccessConversationGraphHandler(
  request: CallableRequest<unknown>,
  deps: ConversationGraphDeps = defaultDeps
): Promise<SubmitEventSuccessConversationGraphCallableResponse> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv<
    SubmitEventSuccessConversationGraphCallablePayload
  >(
    request,
    validateSubmitEventSuccessConversationGraphCallablePayload,
    normalizeConversationGraphPayload
  );
  if (data.skipped && data.selectedUids.length > 0) {
    throw new HttpsError(
      "invalid-argument",
      "A skipped response cannot include attendees."
    );
  }
  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    uid,
    "submitEventSuccessConversationGraph",
    {maxRequests: 30, windowMs: 60 * 1000}
  );
  const context = await loadConversationGraphContext({
    db,
    eventId: data.eventId,
    uid,
    nowMillis: deps.nowMillis(),
  });
  const candidateUids = new Set(context.candidates.map((item) => item.uid));
  const selectedUids = [...data.selectedUids].sort();
  if (selectedUids.some((selectedUid) => !candidateUids.has(selectedUid))) {
    throw new HttpsError(
      "failed-precondition",
      "Choose only checked-in attendees available in this event."
    );
  }
  const now = deps.serverTimestamp();
  const status = data.skipped ? "skipped" as const : "submitted" as const;
  const graphRef = db.collection("eventSuccessConversationGraphs")
    .doc(eventSuccessConversationGraphId(data.eventId, uid));
  await graphRef.set({
    eventId: data.eventId,
    clubId: context.event.clubId,
    organizerId: context.event.organizerId ?? context.event.clubId,
    uid,
    status,
    selectedUids: data.skipped ? [] : selectedUids,
    assignedSelectedCount: data.skipped ? 0 :
      selectedUids.filter((selectedUid) =>
        context.assignedUids.has(selectedUid)).length,
    assignedCandidateCount: context.candidates.filter((candidate) =>
      candidate.assigned).length,
    consentMode: conversationGraphConsentMode(context.plan),
    createdAt: context.existing?.createdAt ?? now,
    updatedAt: now,
  });
  return {
    saved: true,
    status,
    conversationCount: data.skipped ? 0 : selectedUids.length,
  };
}

export function eventSuccessConversationGraphId(
  eventId: string,
  uid: string
): string {
  return `${eventId}_${uid}`;
}

export function conversationGraphConsentMode(
  plan: Pick<EventSuccessPlanDocument, "conversationGraphConsentMode"> | null
): "optIn" | "optOut" {
  return plan?.conversationGraphConsentMode === "optOut" ?
    "optOut" : "optIn";
}

export function conversationGraphPrompt(
  event: ScheduledEventDocument
): string {
  const primitives = eventSuccessPrimitivesFor(event.eventFormat);
  const interactionModel = effectiveInteractionModelFor(
    event.eventFormat.interactionModel,
    primitives.assignmentAlgorithm
  );
  switch (interactionModel) {
  case "pacePods":
    return "Who did you run or ride with?";
  case "teamRotations":
    return "Who were your teammates?";
  case "seatedTable":
    return "Who were your tablemates?";
  case "pairedRotations":
    return "Who were your opponents or partners?";
  case "freeFormMixer":
  case "hostLedProgram":
  case "openFormat":
  default:
    return "Who did you actually talk to?";
  }
}

async function loadConversationGraphContext(params: {
  db: FirebaseFirestore.Firestore;
  eventId: string;
  uid: string;
  nowMillis: number;
}): Promise<ConversationGraphContext> {
  const {db, eventId, uid, nowMillis} = params;
  const eventRef = db.collection("events").doc(eventId);
  const planRef = db.collection("eventSuccessPlans").doc(eventId);
  const graphRef = db.collection("eventSuccessConversationGraphs")
    .doc(eventSuccessConversationGraphId(eventId, uid));
  const assignmentRefs = ASSIGNMENT_MODULE_IDS.map((moduleId) =>
    db.collection("eventSuccessAssignments")
      .doc(`${eventId}_${moduleId}_${uid}`));
  const [eventSnap, planSnap, graphSnap, assignmentSnaps] = await Promise.all([
    eventRef.get(),
    planRef.get(),
    graphRef.get(),
    Promise.all(assignmentRefs.map((ref) => ref.get())),
  ]);
  if (!eventSnap.exists) {
    throw new HttpsError("not-found", "Event not found.");
  }
  const event = requireScheduledEvent(
    requireDoc<EventDocument>(eventSnap, "EventDocument"));
  if (event.status === "cancelled" || event.endTime.toMillis() > nowMillis) {
    throw new HttpsError(
      "failed-precondition",
      "The conversation check is available after this event ends."
    );
  }
  const viewer = await loadEventSuccessRosterParticipant(db, eventId, uid);
  if (!viewer || viewer.status !== "attended") {
    throw new HttpsError(
      "failed-precondition",
      "The conversation check is available to checked-in attendees."
    );
  }
  const [roster, blockedUids] = await Promise.all([
    loadEventSuccessRoster(db, eventId),
    fetchUidsBlockedWithViewer(db, uid),
  ]);
  const assignedUids = assignedPeerUids(assignmentSnaps, eventId, uid);
  const candidates = roster
    .filter((candidate) =>
      candidate.status === "attended" &&
      candidate.uid !== uid &&
      !blockedUids.has(candidate.uid))
    .map((candidate) => ({
      uid: candidate.uid,
      displayName: candidate.displayName,
      assigned: assignedUids.has(candidate.uid),
    }))
    .sort((left, right) =>
      Number(right.assigned) - Number(left.assigned) ||
      left.displayName.localeCompare(right.displayName, "en") ||
      left.uid.localeCompare(right.uid));
  const plan = planSnap.exists ? requireDoc<EventSuccessPlanDocument>(
    planSnap,
    "EventSuccessPlanDocument"
  ) : null;
  const existing = graphSnap.exists ?
    requireDoc<EventSuccessConversationGraphDocument>(
      graphSnap,
      "EventSuccessConversationGraphDocument"
    ) : null;
  return {event, plan, candidates, assignedUids, existing};
}

function assignedPeerUids(
  snapshots: FirebaseFirestore.DocumentSnapshot[],
  eventId: string,
  uid: string
): Set<string> {
  const assigned = new Set<string>();
  for (const snapshot of snapshots) {
    if (!snapshot.exists) continue;
    const assignment = requireDoc<EventSuccessAssignmentDocument>(
      snapshot,
      "EventSuccessAssignmentDocument"
    );
    if (assignment.eventId !== eventId || assignment.uid !== uid) continue;
    for (const peerUid of assignment.peerUids) assigned.add(peerUid);
    for (const slot of assignment.rotationSlots ?? []) {
      assigned.add(slot.peerUid);
    }
    for (const slot of assignment.groupRotationSlots ?? []) {
      for (const peerUid of slot.peerUids) assigned.add(peerUid);
    }
  }
  assigned.delete(uid);
  return assigned;
}

function normalizeConversationGraphPayload(data: unknown): unknown {
  const normalized = normalizeEventIdPayload(data);
  if (!isRecord(normalized) || !Array.isArray(normalized.selectedUids)) {
    return normalized;
  }
  return {
    ...normalized,
    selectedUids: normalized.selectedUids.map((value) =>
      typeof value === "string" ? value.trim() : value),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const getEventSuccessConversationGraph = onCall(
  appCheckCallableOptions,
  (request) => getEventSuccessConversationGraphHandler(request)
);

export const submitEventSuccessConversationGraph = onCall(
  appCheckCallableOptions,
  (request) => submitEventSuccessConversationGraphHandler(request)
);
