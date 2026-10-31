import {onCall, CallableRequest, HttpsError} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import type {
  EventAttendeeDocument,
  EventDocument,
  EventParticipationDocument,
  EventRuntimeParticipantDocument,
} from "../shared/generated/firestoreAdminTypes";
import {requireAuth} from "../shared/auth";
import type {EventIdCallablePayload} from
  "../shared/generated/eventIdCallablePayload";
import type {SubmitEventSuccessWingmanRequestCallablePayload} from
  "../shared/generated/submitEventSuccessWingmanRequestCallablePayload";
import {
  validateEventIdCallablePayload,
} from "../shared/generated/validators/eventIdInput";
import {
  validateSubmitEventSuccessWingmanRequestCallablePayload,
} from
  "../shared/generated/validators/submitEventSuccessWingmanRequestInput";
import {validateCallableWithAjv, requireDoc} from "../shared/validation";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {normalizeEventIdPayload} from "../events/eventPayloadNormalization";
import {blockDocId} from "../safety/blocking";
import {
  CandidatePublicProfile,
  fetchCandidatePublicProfiles,
  fetchUidsBlockedWithViewer,
} from "../shared/candidateVisibility";
import {
  EventSuccessRosterParticipant,
  loadEventSuccessRoster,
  loadEventSuccessRosterParticipant,
} from "./eventSuccessRoster";
import {eventRuntimeParticipantId} from "./eventRuntime";

const WINGMAN_REQUESTS_MODULE_ID = "wingman_requests";

interface WingmanRequestDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  nowMillis: () => number;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

interface EventSuccessPlanDocument {
  eventId?: string;
  organizerId?: string;
  selectedModuleIds?: unknown;
  wingmanRequestsEnabled?: boolean;
}

interface ExistingWingmanRequestDocument {
  eventId?: string;
  requesterUid?: string;
  targetUid?: string;
  hostVisibleConsent?: boolean;
  note?: string | null;
  createdAt?: unknown;
}

const defaultDeps: WingmanRequestDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  nowMillis: () => Date.now(),
  checkRateLimit: defaultCheckRateLimit,
};

/**
 * Fetches host-help candidates for the caller from server-owned eligibility.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {WingmanRequestDeps} deps Injectable dependencies for tests.
 * @return {Promise<{profiles: CandidatePublicProfile[]}>} Candidate profiles.
 */
export async function fetchEventSuccessWingmanCandidatesHandler(
  request: CallableRequest<unknown>,
  deps: WingmanRequestDeps = defaultDeps
): Promise<{
  profiles: CandidatePublicProfile[];
  candidates: Array<{
    uid: string;
    displayName: string;
    gender: EventSuccessRosterParticipant["gender"] | null;
    source: EventSuccessRosterParticipant["source"];
  }>;
}> {
  const viewerUid = requireAuth(request);
  const data = validateCallableWithAjv<EventIdCallablePayload>(
    request,
    validateEventIdCallablePayload,
    normalizeEventIdPayload
  );

  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    viewerUid,
    "fetchEventSuccessWingmanCandidates",
    {maxRequests: 30, windowMs: 60 * 1000}
  );

  const [
    eventSnap,
    planSnap,
  ] = await Promise.all([
    db.collection("events").doc(data.eventId).get(),
    db.collection("eventSuccessPlans").doc(data.eventId).get(),
  ]);

  const event = requireActiveWingmanEvent(eventSnap, deps.nowMillis());
  requireWingmanPlan(planSnap, data.eventId, event.organizerId);
  const viewer = await loadEventSuccessRosterParticipant(
    db,
    data.eventId,
    viewerUid
  );
  if (
    !viewer ||
    viewer.status !== "attended"
  ) {
    throw new HttpsError(
      "failed-precondition",
      "Host help is only available to checked-in attendees."
    );
  }
  const roster = await loadEventSuccessRoster(db, data.eventId);
  const candidateRoster = roster
    .filter((candidate) => isEligibleWingmanRequestCandidate({
      viewer,
      viewerUid,
      candidate,
    }))
    .sort((a, b) => {
      const preferenceDifference = wingmanPreferenceRank(viewer, a) -
        wingmanPreferenceRank(viewer, b);
      return preferenceDifference !== 0 ? preferenceDifference :
        a.uid.localeCompare(b.uid);
    });

  const blockedUids = await fetchUidsBlockedWithViewer(db, viewerUid);
  const visibleRoster = candidateRoster.filter((candidate) =>
    !blockedUids.has(candidate.uid));
  const visibleIds = visibleRoster.map((candidate) => candidate.uid);
  const profiles = await fetchCandidatePublicProfiles(db, visibleIds);

  return {
    profiles,
    candidates: visibleRoster.map((candidate) => ({
      uid: candidate.uid,
      displayName: candidate.displayName,
      gender: candidate.gender ?? null,
      source: candidate.source,
    })),
  };
}

/**
 * Creates or updates a host-visible wingman request for the caller.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {WingmanRequestDeps} deps Injectable dependencies for tests.
 * @return {Promise<{saved: boolean}>} Operation result.
 */
export async function submitEventSuccessWingmanRequestHandler(
  request: CallableRequest<unknown>,
  deps: WingmanRequestDeps = defaultDeps
): Promise<{saved: boolean}> {
  const requesterUid = requireAuth(request);
  const data =
    validateCallableWithAjv<SubmitEventSuccessWingmanRequestCallablePayload>(
      request,
      validateSubmitEventSuccessWingmanRequestCallablePayload,
      normalizeSubmitWingmanPayload
    );
  if (data.targetUid === requesterUid) {
    throw new HttpsError(
      "invalid-argument",
      "Choose another attendee for host help."
    );
  }

  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    requesterUid,
    "submitEventSuccessWingmanRequest",
    {maxRequests: 10, windowMs: 60 * 1000}
  );

  const requestRef = db
    .collection("eventSuccessWingmanRequests")
    .doc(wingmanRequestId(data.eventId, requesterUid));
  const eventRef = db.collection("events").doc(data.eventId);
  const planRef = db.collection("eventSuccessPlans").doc(data.eventId);
  const requesterBlocksTargetRef = db
    .collection("blocks")
    .doc(blockDocId(requesterUid, data.targetUid));
  const targetBlocksRequesterRef = db
    .collection("blocks")
    .doc(blockDocId(data.targetUid, requesterUid));

  await db.runTransaction(async (tx) => {
    const [
      eventSnap,
      planSnap,
      requesterBlocksTargetSnap,
      targetBlocksRequesterSnap,
      existingRequestSnap,
    ] = await Promise.all([
      tx.get(eventRef),
      tx.get(planRef),
      tx.get(requesterBlocksTargetRef),
      tx.get(targetBlocksRequesterRef),
      tx.get(requestRef),
    ]);

    const event = requireActiveWingmanEvent(
      eventSnap,
      deps.nowMillis()
    );
    requireWingmanPlan(planSnap, data.eventId, event.organizerId);
    await requireCheckedInEventSuccessParticipant(
      tx,
      db,
      data.eventId,
      requesterUid
    );
    await requireCheckedInEventSuccessParticipant(
      tx,
      db,
      data.eventId,
      data.targetUid
    );
    if (requesterBlocksTargetSnap.exists || targetBlocksRequesterSnap.exists) {
      throw new HttpsError(
        "failed-precondition",
        "Host help is not available for this attendee."
      );
    }

    const existing = existingRequestSnap.exists ?
      existingRequestSnap.data() as ExistingWingmanRequestDocument :
      null;
    const now = deps.serverTimestamp();
    tx.set(requestRef, {
      eventId: data.eventId,
      organizerId: event.organizerId,
      requesterUid,
      targetUid: data.targetUid,
      status: "active",
      hostVisibleConsent: true,
      note: normalizeNullableString(data.note),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
  });

  return {saved: true};
}

/**
 * Withdraws the caller's wingman request for an event.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {WingmanRequestDeps} deps Injectable dependencies for tests.
 * @return {Promise<{withdrawn: boolean}>} Operation result.
 */
export async function withdrawEventSuccessWingmanRequestHandler(
  request: CallableRequest<unknown>,
  deps: WingmanRequestDeps = defaultDeps
): Promise<{withdrawn: boolean}> {
  const requesterUid = requireAuth(request);
  const data = validateCallableWithAjv<EventIdCallablePayload>(
    request,
    validateEventIdCallablePayload,
    normalizeEventIdPayload
  );

  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    requesterUid,
    "withdrawEventSuccessWingmanRequest",
    {maxRequests: 10, windowMs: 60 * 1000}
  );

  const requestRef = db
    .collection("eventSuccessWingmanRequests")
    .doc(wingmanRequestId(data.eventId, requesterUid));
  let withdrawn = false;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(requestRef);
    if (!snap.exists) return;
    const existing = snap.data() as ExistingWingmanRequestDocument;
    if (existing.eventId !== data.eventId ||
      existing.requesterUid !== requesterUid) {
      throw new HttpsError(
        "permission-denied",
        "You can only withdraw your own host-help request."
      );
    }
    tx.set(requestRef, {
      ...existing,
      eventId: data.eventId,
      requesterUid,
      targetUid: existing.targetUid,
      status: "withdrawn",
      hostVisibleConsent: existing.hostVisibleConsent ?? true,
      note: existing.note ?? null,
      createdAt: existing.createdAt ?? deps.serverTimestamp(),
      updatedAt: deps.serverTimestamp(),
    });
    withdrawn = true;
  });

  return {withdrawn};
}

export const submitEventSuccessWingmanRequest = onCall(
  appCheckCallableOptions,
  (request) => submitEventSuccessWingmanRequestHandler(request)
);

export const withdrawEventSuccessWingmanRequest = onCall(
  appCheckCallableOptions,
  (request) => withdrawEventSuccessWingmanRequestHandler(request)
);

export const fetchEventSuccessWingmanCandidates = onCall(
  appCheckCallableOptions,
  (request) => fetchEventSuccessWingmanCandidatesHandler(request)
);

/**
 * Normalizes submit-wingman callable payload strings.
 * @param {unknown} data Raw callable payload.
 * @return {unknown} Normalized payload.
 */
function normalizeSubmitWingmanPayload(data: unknown): unknown {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return data;
  }
  const payload = {...data} as Record<string, unknown>;
  if (typeof payload.eventId === "string") {
    payload.eventId = payload.eventId.trim();
  }
  if (typeof payload.targetUid === "string") {
    payload.targetUid = payload.targetUid.trim();
  }
  if (typeof payload.note === "string") {
    payload.note = payload.note.trim();
  }
  return payload;
}

/**
 * Requires an active event that has not ended.
 * @param {FirebaseFirestore.DocumentSnapshot} snap Event snapshot.
 * @param {number} nowMillis Current epoch millis.
 * @return {EventDocument} Event document.
 */
function requireActiveWingmanEvent(
  snap: FirebaseFirestore.DocumentSnapshot,
  nowMillis: number
): EventDocument {
  if (!snap.exists) {
    throw new HttpsError("not-found", "Event not found.");
  }
  const event = requireDoc<EventDocument>(
    snap,
    "EventDocument"
  );
  if (event.status === "cancelled") {
    throw new HttpsError("failed-precondition", "This event is cancelled.");
  }
  const endAtMillis = event.endTime?.toMillis();
  if (typeof endAtMillis !== "number" ||
      !Number.isFinite(endAtMillis) || endAtMillis <= nowMillis) {
    throw new HttpsError(
      "failed-precondition",
      "Host help is only available while the event is live."
    );
  }
  return event;
}

/**
 * Requires a saved event-success plan with wingman requests enabled.
 * @param {FirebaseFirestore.DocumentSnapshot} snap Plan snapshot.
 * @param {string} eventId Event id.
 * @param {string} organizerId Club id.
 */
function requireWingmanPlan(
  snap: FirebaseFirestore.DocumentSnapshot,
  eventId: string,
  organizerId: string
) {
  if (!snap.exists) {
    throw new HttpsError(
      "failed-precondition",
      "The host has not enabled live guidance for this event."
    );
  }
  const plan = requireDoc<EventSuccessPlanDocument>(
    snap,
    "EventSuccessPlanDocument"
  );
  if (
    (plan.eventId !== undefined && plan.eventId !== eventId) ||
    (plan.organizerId !== undefined && plan.organizerId !== organizerId) ||
    plan.wingmanRequestsEnabled === false ||
    !moduleSelected(plan.selectedModuleIds, WINGMAN_REQUESTS_MODULE_ID)
  ) {
    throw new HttpsError(
      "failed-precondition",
      "Host help is not enabled for this event."
    );
  }
}

/**
 * Requires a checked-in Consumer participation or ready event-scoped runtime
 * participant without synthesizing a Consumer eventParticipation document.
 */
async function requireCheckedInEventSuccessParticipant(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  eventId: string,
  uid: string
): Promise<void> {
  const participationRef = db.collection("eventParticipations")
    .doc(eventParticipationId(eventId, uid));
  const runtimeRef = db.collection("eventRuntimeParticipants")
    .doc(eventRuntimeParticipantId(eventId, uid));
  const [participationSnap, runtimeSnap] = await Promise.all([
    tx.get(participationRef),
    tx.get(runtimeRef),
  ]);
  if (participationSnap.exists) {
    const participation = requireDoc<EventParticipationDocument>(
      participationSnap,
      "EventParticipationDocument"
    );
    if (
      participation.eventId === eventId &&
      participation.uid === uid &&
      participation.status === "attended"
    ) return;
  }
  if (!runtimeSnap.exists) {
    throw checkedInRequiredError();
  }
  const runtime = requireDoc<EventRuntimeParticipantDocument>(
    runtimeSnap,
    "EventRuntimeParticipantDocument"
  );
  if (
    runtime.eventId !== eventId ||
    runtime.uid !== uid ||
    runtime.accessStatus !== "ready" ||
    !runtime.eventAttendeeId
  ) {
    throw checkedInRequiredError();
  }
  const attendeeSnap = await tx.get(
    db.collection("eventAttendees").doc(runtime.eventAttendeeId)
  );
  if (!attendeeSnap.exists) throw checkedInRequiredError();
  const attendee = requireDoc<EventAttendeeDocument>(
    attendeeSnap,
    "EventAttendeeDocument"
  );
  if (
    attendee.eventId !== eventId ||
    attendee.linkedUid !== uid ||
    attendee.status !== "checkedIn"
  ) {
    throw checkedInRequiredError();
  }
}

function checkedInRequiredError(): HttpsError {
  return new HttpsError(
    "failed-precondition",
    "Host help is only available to checked-in attendees."
  );
}

/**
 * Checks whether a checked-in participant can be shown as a host-help target.
 * @param {Object} params Eligibility inputs.
 * @param {EventSuccessRosterParticipant} params.viewer Caller profile.
 * @param {string} params.viewerUid Caller user id.
 * @param {EventSuccessRosterParticipant} params.candidate Candidate edge.
 * @return {boolean} True when eligible.
 */
function isEligibleWingmanRequestCandidate(params: {
  viewer: EventSuccessRosterParticipant;
  viewerUid: string;
  candidate: EventSuccessRosterParticipant;
}): boolean {
  const candidate = params.candidate;
  if (
    candidate.uid === params.viewerUid ||
    candidate.status !== "attended"
  ) {
    return false;
  }
  return true;
}

function wingmanPreferenceRank(
  viewer: EventSuccessRosterParticipant,
  candidate: EventSuccessRosterParticipant
): number {
  if (!viewer.gender || !candidate.gender ||
      viewer.interestedInGenders.length === 0 ||
      candidate.interestedInGenders.length === 0) return 1;
  return viewer.interestedInGenders.includes(candidate.gender) &&
      candidate.interestedInGenders.includes(viewer.gender) ? 0 : 2;
}

/**
 * Checks whether a plan includes a module.
 * @param {unknown} selectedModuleIds Persisted module ids.
 * @param {string} moduleId Module id.
 * @return {boolean} True when selected.
 */
function moduleSelected(selectedModuleIds: unknown, moduleId: string): boolean {
  return Array.isArray(selectedModuleIds) &&
    selectedModuleIds.includes(moduleId);
}

/**
 * Builds the deterministic event participation document id.
 * @param {string} eventId Event id.
 * @param {string} uid User id.
 * @return {string} Document id.
 */
function eventParticipationId(eventId: string, uid: string): string {
  return `${eventId}_${uid}`;
}

/**
 * Builds the deterministic wingman request document id.
 * @param {string} eventId Event id.
 * @param {string} uid Requester user id.
 * @return {string} Document id.
 */
function wingmanRequestId(eventId: string, uid: string): string {
  return `${eventId}_${uid}`;
}

/**
 * Normalizes nullable note text.
 * @param {unknown} value Raw note.
 * @return {string|null} Normalized note.
 */
function normalizeNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length === 0 ? null : normalized;
}
