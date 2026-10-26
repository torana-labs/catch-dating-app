import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import type {
  EventDocument,
  EventParticipationDocument,
  UserProfileDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {EventIdCallablePayload} from
  "../shared/generated/eventIdCallablePayload";
import type {FetchSwipeCandidatesCallableResponse} from
  "../shared/generated/fetchSwipeCandidatesCallableResponse";
import {
  validateEventIdCallablePayload,
} from "../shared/generated/validators/eventIdInput";
import {
  validateFetchSwipeCandidatesCallableResponse,
} from "../shared/generated/validators/fetchSwipeCandidatesOutput";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {
  fetchCandidatePublicProfiles,
  fetchUidsBlockedWithViewer,
} from "../shared/candidateVisibility";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {isReciprocallyEligible} from
  "../shared/relationshipEligibility";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {normalizeEventIdPayload} from "../events/eventPayloadNormalization";

const swipeWindowDurationMs = 24 * 60 * 60 * 1000;
const boundedCandidateLimit = 1000;

interface SwipeCandidateDeps {
  firestore: () => FirebaseFirestore.Firestore;
  nowMillis: () => number;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: SwipeCandidateDeps = {
  firestore: () => admin.firestore(),
  nowMillis: () => Date.now(),
  checkRateLimit: defaultCheckRateLimit,
};

/**
 * Resolves post-event swipe candidates without exposing the event roster.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {SwipeCandidateDeps} deps Injectable dependencies for tests.
 * @return {Promise<FetchSwipeCandidatesCallableResponse>} Candidate profiles.
 */
export async function fetchSwipeCandidatesHandler(
  request: CallableRequest<unknown>,
  deps: SwipeCandidateDeps = defaultDeps
): Promise<FetchSwipeCandidatesCallableResponse> {
  const viewerUid = requireAuth(request);
  const data = validateCallableWithAjv<EventIdCallablePayload>(
    request,
    validateEventIdCallablePayload,
    normalizeEventIdPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, viewerUid, "fetchSwipeCandidates", {
    maxRequests: 30, windowMs: 60 * 1000,
  });

  const [eventSnap, viewerParticipationSnap, viewerSnap] = await Promise.all([
    db.collection("events").doc(data.eventId).get(),
    db.collection("eventParticipations")
      .doc(eventParticipationId(data.eventId, viewerUid)).get(),
    db.collection("users").doc(viewerUid).get(),
  ]);

  if (
    !eventSnap.exists ||
    !viewerParticipationSnap.exists ||
    !viewerSnap.exists
  ) {
    return emptyResponse();
  }

  const event = requireDoc<EventDocument>(eventSnap, "EventDocument");
  const viewerParticipation = requireDoc<EventParticipationDocument>(
    viewerParticipationSnap,
    "EventParticipationDocument"
  );
  const viewer = requireDoc<UserProfileDocument>(
    viewerSnap,
    "UserProfileDocument"
  );
  const nowMillis = deps.nowMillis();
  if (
    !hasOpenSwipeWindow(event, nowMillis) ||
    viewerParticipation.uid !== viewerUid ||
    viewerParticipation.status !== "attended" ||
    viewer.profileComplete !== true
  ) {
    return emptyResponse();
  }

  const participationSnap = await db.collection("eventParticipations")
    .where("eventId", "==", data.eventId)
    .where("status", "==", "attended")
    .limit(boundedCandidateLimit)
    .get();
  const orderedCandidateIds = orderedUniqueCandidateIds(
    participationSnap.docs,
    viewerUid
  );
  if (orderedCandidateIds.length === 0) return emptyResponse();

  const [decisionSnap, blockedUids] = await Promise.all([
    db.collection("profileDecisions").doc(viewerUid)
      .collection("outgoing").limit(boundedCandidateLimit).get(),
    fetchUidsBlockedWithViewer(db, viewerUid),
  ]);
  const decidedUids = new Set(decisionSnap.docs.map((doc) => doc.id));
  const visibleIds = orderedCandidateIds.filter(
    (uid) => !decidedUids.has(uid) && !blockedUids.has(uid)
  );
  if (visibleIds.length === 0) return emptyResponse();

  const candidateUserSnaps = await Promise.all(
    visibleIds.map((uid) => db.collection("users").doc(uid).get())
  );
  const reciprocalIds = visibleIds.filter((uid, index) => {
    const snap = candidateUserSnaps[index];
    if (!snap.exists) return false;
    const candidate = requireDoc<UserProfileDocument>(
      snap,
      "UserProfileDocument"
    );
    return candidate.profileComplete === true && isReciprocallyEligible({
      viewer,
      candidate,
      nowMillis,
    });
  });
  if (reciprocalIds.length === 0) return emptyResponse();

  const profiles = await fetchCandidatePublicProfiles(db, reciprocalIds);
  return validatedResponse({profiles});
}

function emptyResponse(): FetchSwipeCandidatesCallableResponse {
  return validatedResponse({profiles: []});
}

function validatedResponse(
  response: FetchSwipeCandidatesCallableResponse
): FetchSwipeCandidatesCallableResponse {
  if (!validateFetchSwipeCandidatesCallableResponse(response)) {
    throw new HttpsError(
      "internal",
      "fetchSwipeCandidates produced an invalid response."
    );
  }
  return response;
}

function hasOpenSwipeWindow(event: EventDocument, nowMillis: number): boolean {
  if (event.status === "cancelled") return false;
  const endMillis = event.endTime?.toMillis();
  if (typeof endMillis !== "number" || !Number.isFinite(endMillis)) {
    return false;
  }
  return nowMillis >= endMillis &&
    nowMillis <= endMillis + swipeWindowDurationMs;
}

function orderedUniqueCandidateIds(
  docs: FirebaseFirestore.QueryDocumentSnapshot[],
  viewerUid: string
): string[] {
  const participations = docs
    .map((doc) => requireDoc<EventParticipationDocument>(
      doc,
      "EventParticipationDocument"
    ))
    .filter((participation) =>
      participation.uid !== viewerUid && participation.status === "attended"
    )
    .sort((a, b) => {
      const byTime = participationTimeMillis(a) - participationTimeMillis(b);
      return byTime !== 0 ? byTime : a.uid.localeCompare(b.uid);
    });
  const seen = new Set<string>();
  return participations
    .map((participation) => participation.uid)
    .filter((uid) => {
      if (seen.has(uid)) return false;
      seen.add(uid);
      return true;
    });
}

function participationTimeMillis(
  participation: EventParticipationDocument
): number {
  return (
    participation.attendedAt ??
    participation.signedUpAt ??
    participation.createdAt
  ).toMillis();
}

function eventParticipationId(eventId: string, uid: string): string {
  return `${eventId}_${uid}`;
}

export const fetchSwipeCandidates = onCall(
  appCheckCallableOptions,
  (request) => fetchSwipeCandidatesHandler(request)
);
