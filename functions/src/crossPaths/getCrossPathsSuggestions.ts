import {createHash, createHmac, timingSafeEqual} from "node:crypto";
import {defineSecret} from "firebase-functions/params";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {
  assertPolicyAllowsSignup,
  cohortIdForUser,
  eventPolicyFromEvent,
  rosterFromEvent,
  rosterWithReservedWaitlistOffers,
} from "../events/eventPolicy";
import {assertNoUserEventScheduleConflict} from
  "../events/scheduleConflicts";
import {isPublicConfiguredEvent,
  type ConfiguredEventDocument} from "../events/configuredEvent";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithSecrets} from
  "../shared/callableOptions";
import {
  fetchUidsBlockedWithViewer,
} from "../shared/candidateVisibility";
import type {
  CrossPathsShowcaseEligibilityDocument,
  EventCrossPathsConsentDocument,
  EventDocument,
  EventParticipationDocument,
  PublicProfileDocument,
  UserProfileDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {GetCrossPathsSuggestionsCallablePayload} from
  "../shared/generated/getCrossPathsSuggestionsCallablePayload";
import type {GetCrossPathsSuggestionsCallableResponse} from
  "../shared/generated/getCrossPathsSuggestionsCallableResponse";
import {
  validateGetCrossPathsSuggestionsCallablePayload,
} from "../shared/generated/validators/getCrossPathsSuggestionsInput";
import {
  validateGetCrossPathsSuggestionsCallableResponse,
} from
  "../shared/generated/validators/getCrossPathsSuggestionsOutput";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {isReciprocallyEligible, ageAt} from
  "../shared/relationshipEligibility";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {
  effectiveCrossPathsShowcaseEligibility,
  evaluateCrossPathsShowcaseReadiness,
} from "./showcaseEligibility";
import {
  crossPathsConsentId,
  currentCrossPathsTermsVersion,
} from "./setCrossPathsEventConsent";
import {crossPathsPilotEventEnabled} from "./pilotPolicy";

export const crossPathsSuggestionSigningKey = defineSecret(
  "CROSS_PATHS_SUGGESTION_SIGNING_KEY"
);
export const crossPathsSuggestionRankingVersion = 1 as const;

const minimumLeadMillis = 6 * 60 * 60 * 1000;
const maximumHorizonMillis = 14 * 24 * 60 * 60 * 1000;
const suggestionTokenLifetimeMillis = 10 * 60 * 1000;
const exposureRetentionMillis = 30 * 24 * 60 * 60 * 1000;
const fatigueWindowMillis = 7 * 24 * 60 * 60 * 1000;
const maximumSuggestions = 2;
const maximumEventRosterCandidates = 200;
const maximumCandidatePairs = 120;
const maximumWeeklyCandidateExposures = 3;

type Suggestion =
  GetCrossPathsSuggestionsCallableResponse["suggestions"][number];

interface GetCrossPathsSuggestionsDeps {
  firestore: () => FirebaseFirestore.Firestore;
  now: () => FirebaseFirestore.Timestamp;
  checkRateLimit?: typeof defaultCheckRateLimit;
  signToken?: (payload: SuggestionTokenPayload) => string;
}

export interface SuggestionTokenPayload {
  version: 1;
  rankingVersion: 1;
  viewerUid: string;
  candidateUid: string;
  eventId: string;
  sessionIdHash: string;
  issuedAtMillis: number;
  expiresAtMillis: number;
}

interface EventContext {
  eventId: string;
  event: ConfiguredEventDocument;
  viewerBookingStatus: "signedUp" | "canBookNow";
  pairHoldAvailable: boolean;
  candidateUids: string[];
}

interface CandidatePair {
  eventContext: EventContext;
  candidateUid: string;
  stableTieBreak: string;
}

interface ExposureRow {
  candidateUid: string;
  eventId: string;
  sessionIdHash: string;
  shownAtMillis: number;
}

const defaultDeps: GetCrossPathsSuggestionsDeps = {
  firestore: () => admin.firestore(),
  now: () => admin.firestore.Timestamp.now(),
  checkRateLimit: defaultCheckRateLimit,
  signToken: signSuggestionToken,
};

/** Resolves a roster-private batch of Cross Paths suggestions for Explore. */
export async function getCrossPathsSuggestionsHandler(
  request: CallableRequest<unknown>,
  deps: GetCrossPathsSuggestionsDeps = defaultDeps
): Promise<GetCrossPathsSuggestionsCallableResponse> {
  const viewerUid = requireAuth(request);
  const data = validateCallableWithAjv<GetCrossPathsSuggestionsCallablePayload>(
    request,
    validateGetCrossPathsSuggestionsCallablePayload,
    normalizePayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, viewerUid, "getCrossPathsSuggestions", {
    maxRequests: 12, windowMs: 60 * 1000,
  });
  const now = deps.now();
  const nowMillis = now.toMillis();
  const sessionIdHash = sha256(data.sessionId);

  const viewerSnap = await db.collection("users").doc(viewerUid).get();
  if (!viewerSnap.exists) return emptyResponse();
  const viewer = requireDoc<UserProfileDocument>(
    viewerSnap,
    "UserProfileDocument (Cross Paths viewer)"
  );
  if (viewer.profileComplete !== true || viewer.deleted === true) {
    return emptyResponse();
  }

  const [
    blockedUids,
    reportResult,
    moderationResult,
    matchResult,
    exposureResult,
    eventContexts,
  ] = await Promise.all([
    fetchUidsBlockedWithViewer(db, viewerUid),
    fetchOpenReportBoundary(db, viewerUid),
    fetchPendingModerationUids(db),
    fetchActiveMatchUids(db, viewerUid),
    fetchExposureRows(db, viewerUid),
    Promise.all(data.eventIds.map((eventId) => loadEventContext({
      db,
      eventId,
      viewerUid,
      viewer,
      nowMillis,
    }))),
  ]);
  if (
    exposureResult.saturated ||
    reportResult.saturated ||
    moderationResult.saturated ||
    matchResult.saturated
  ) {
    return emptyResponse();
  }
  const exposureRows = exposureResult.rows;
  const reportedUids = reportResult.uids;
  const moderatedUids = moderationResult.uids;
  const matchedUids = matchResult.uids;

  const pairs = eventContexts
    .filter((context): context is EventContext => context !== null)
    .flatMap((eventContext) => eventContext.candidateUids.map(
      (candidateUid): CandidatePair => ({
        eventContext,
        candidateUid,
        stableTieBreak: sha256(
          `${sessionIdHash}|${eventContext.eventId}|${candidateUid}`
        ),
      })
    ))
    .sort(compareInitialPairs)
    .slice(0, maximumCandidatePairs);
  if (pairs.length === 0) return emptyResponse();

  const uniqueCandidateUids = [...new Set(
    pairs.map((pair) => pair.candidateUid)
  )];
  const candidateBundles = new Map(await Promise.all(
    uniqueCandidateUids.map(async (candidateUid) => [
      candidateUid,
      await loadCandidateBundle(db, candidateUid),
    ] as const)
  ));
  const fatigueCounts = weeklyFatigueCounts(exposureRows, nowMillis);
  const existingSessionPairs = new Set(
    exposureRows
      .filter((row) => row.sessionIdHash === sessionIdHash)
      .map((row) => `${row.eventId}|${row.candidateUid}`)
  );
  const existingSessionCandidateUids = new Set(
    exposureRows
      .filter((row) => row.sessionIdHash === sessionIdHash)
      .map((row) => row.candidateUid)
  );

  const consentSnaps = new Map(await Promise.all(pairs.map(async (pair) => {
    const key = `${pair.eventContext.eventId}|${pair.candidateUid}`;
    const snap = await db.collection("eventCrossPathsConsents")
      .doc(crossPathsConsentId(
        pair.eventContext.eventId,
        pair.candidateUid
      )).get();
    return [key, snap] as const;
  })));

  const eligiblePairs: CandidatePair[] = [];
  for (const pair of pairs) {
    const bundle = candidateBundles.get(pair.candidateUid);
    if (!bundle) continue;
    const pairKey = `${pair.eventContext.eventId}|${pair.candidateUid}`;
    const sameSession = existingSessionPairs.has(pairKey);
    if (!sameSession &&
        (fatigueCounts.get(pair.candidateUid) ?? 0) >=
          maximumWeeklyCandidateExposures) {
      continue;
    }
    if (
      blockedUids.has(pair.candidateUid) ||
      reportedUids.has(pair.candidateUid) ||
      moderatedUids.has(pair.candidateUid) ||
      matchedUids.has(pair.candidateUid) ||
      !candidateBundleEligible({
        viewer,
        bundle,
        event: pair.eventContext.event,
        nowMillis,
      })
    ) {
      continue;
    }
    const consentSnap = consentSnaps.get(pairKey);
    if (!consentSnap) continue;
    if (!consentSnap.exists) continue;
    const consent = requireDoc<EventCrossPathsConsentDocument>(
      consentSnap,
      "EventCrossPathsConsentDocument (Cross Paths candidate)"
    );
    if (
      consent.enabled !== true ||
      consent.termsVersion !== currentCrossPathsTermsVersion
    ) {
      continue;
    }
    eligiblePairs.push(pair);
  }

  eligiblePairs.sort((left, right) => compareEligiblePairs({
    left,
    right,
    existingSessionPairs,
    fatigueCounts,
  }));
  const chosen = chooseSessionBoundedPairs({
    eligiblePairs,
    existingSessionPairs,
    existingSessionCandidateUids,
  });
  const expiresAtMillis = nowMillis + suggestionTokenLifetimeMillis;
  const suggestions = chosen.map((pair): Suggestion => {
    const bundle = candidateBundles.get(pair.candidateUid)!;
    const tokenPayload: SuggestionTokenPayload = {
      version: 1,
      rankingVersion: crossPathsSuggestionRankingVersion,
      viewerUid,
      candidateUid: pair.candidateUid,
      eventId: pair.eventContext.eventId,
      sessionIdHash,
      issuedAtMillis: nowMillis,
      expiresAtMillis,
    };
    return suggestionProjection({
      pair,
      publicProfile: bundle.publicProfile,
      token: deps.signToken?.(tokenPayload) ??
        signSuggestionToken(tokenPayload),
      expiresAtMillis,
    });
  });

  await recordExposureReceipts({
    db,
    viewerUid,
    sessionIdHash,
    pairs: chosen,
    now,
  });
  return validatedResponse({
    schemaVersion: 1,
    rankingVersion: crossPathsSuggestionRankingVersion,
    suggestions,
  });
}

function normalizePayload(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const raw = value as Record<string, unknown>;
  const eventIds = Array.isArray(raw.eventIds) ?
    raw.eventIds.map((eventId) =>
      typeof eventId === "string" ? eventId.trim() : eventId
    ) : raw.eventIds;
  return {
    ...raw,
    eventIds,
    sessionId: typeof raw.sessionId === "string" ?
      raw.sessionId.trim() : raw.sessionId,
  };
}

async function loadEventContext(params: {
  db: FirebaseFirestore.Firestore;
  eventId: string;
  viewerUid: string;
  viewer: UserProfileDocument;
  nowMillis: number;
}): Promise<EventContext | null> {
  const {db, eventId, viewerUid, viewer, nowMillis} = params;
  const [eventSnap, viewerParticipationSnap] = await Promise.all([
    db.collection("events").doc(eventId).get(),
    db.collection("eventParticipations")
      .doc(`${eventId}_${viewerUid}`).get(),
  ]);
  if (!eventSnap.exists) return null;
  const candidate = requireDoc<EventDocument>(
    eventSnap,
    "EventDocument (Cross Paths suggestion)"
  );
  if (!isPublicConfiguredEvent(candidate)) return null;
  const event = candidate;
  const startMillis = event.startTime.toMillis();
  if (
    !crossPathsPilotEventEnabled(event) ||
    event.status !== "active" ||
    startMillis < nowMillis + minimumLeadMillis ||
    startMillis > nowMillis + maximumHorizonMillis ||
    !syntheticScopesMatch(viewer, event)
  ) {
    return null;
  }
  const viewerAge = ageAt(viewer.dateOfBirth, nowMillis);
  if (
    viewerAge === null || viewerAge < (event.constraints?.minAge ?? 0) ||
    viewerAge > (event.constraints?.maxAge ?? 99)
  ) {
    return null;
  }

  let viewerBookingStatus: EventContext["viewerBookingStatus"];
  let pairHoldAvailable = false;
  const viewerParticipation = viewerParticipationSnap.exists ?
    requireDoc<EventParticipationDocument>(
      viewerParticipationSnap,
      "EventParticipationDocument (Cross Paths viewer)"
    ) : null;
  if (viewerParticipation?.status === "signedUp") {
    viewerBookingStatus = "signedUp";
  } else {
    if (viewerParticipation && viewerParticipation.status !== "cancelled") {
      return null;
    }
    const policy = eventPolicyFromEvent(event);
    const pairPolicy = policy.admission.crossPathsPairInventory;
    if (
      policy.admission.inviteRequired === true ||
      policy.admission.membershipRequired === true ||
      policy.admission.manualApprovalRequired === true ||
      (event.discoveryAvailability !== "open" &&
        pairPolicy?.enabled !== true)
    ) {
      return null;
    }
    try {
      const roster = await rosterWithReservedWaitlistOffers(
        db,
        eventId,
        rosterFromEvent(event),
        {nowMillis}
      );
      const cohortId = cohortIdForUser(viewer);
      try {
        assertPolicyAllowsSignup({policy, cohortId, roster});
      } catch {
        assertPolicyAllowsSignup({
          policy,
          cohortId,
          roster,
          admissionMode: "crossPathsPair",
        });
        pairHoldAvailable = true;
      }
      if (pairPolicy?.enabled === true) {
        try {
          assertPolicyAllowsSignup({
            policy,
            cohortId,
            roster,
            admissionMode: "crossPathsPair",
          });
          pairHoldAvailable = true;
        } catch {
          // General admission can remain valid after pair inventory fills.
        }
      }
      await assertNoUserEventScheduleConflict(db, {
        uid: viewerUid,
        eventId,
        organizerId: event.organizerId,
        startTimeMillis: startMillis,
        endTimeMillis: event.endTime.toMillis(),
      });
    } catch {
      return null;
    }
    viewerBookingStatus = "canBookNow";
  }

  const participationSnap = await db.collection("eventParticipations")
    .where("eventId", "==", eventId)
    .where("status", "==", "signedUp")
    .limit(maximumEventRosterCandidates)
    .get();
  const candidateUids = [...new Set(participationSnap.docs
    .map((snap) => requireDoc<EventParticipationDocument>(
      snap,
      "EventParticipationDocument (Cross Paths roster)"
    ))
    .filter((participation) =>
      participation.eventId === eventId &&
      participation.status === "signedUp" &&
      participation.uid !== viewerUid
    )
    .map((participation) => participation.uid))];
  return {
    eventId,
    event,
    viewerBookingStatus,
    pairHoldAvailable,
    candidateUids,
  };
}

async function loadCandidateBundle(
  db: FirebaseFirestore.Firestore,
  candidateUid: string
): Promise<{
  user: UserProfileDocument;
  publicProfile: PublicProfileDocument;
  showcase: CrossPathsShowcaseEligibilityDocument;
} | null> {
  const [userSnap, publicSnap, showcaseSnap] = await Promise.all([
    db.collection("users").doc(candidateUid).get(),
    db.collection("publicProfiles").doc(candidateUid).get(),
    db.collection("crossPathsShowcaseEligibility").doc(candidateUid).get(),
  ]);
  if (!userSnap.exists || !publicSnap.exists || !showcaseSnap.exists) {
    return null;
  }
  return {
    user: requireDoc<UserProfileDocument>(
      userSnap,
      "UserProfileDocument (Cross Paths candidate)"
    ),
    publicProfile: requireDoc<PublicProfileDocument>(
      publicSnap,
      "PublicProfileDocument (Cross Paths candidate)"
    ),
    showcase: requireDoc<CrossPathsShowcaseEligibilityDocument>(
      showcaseSnap,
      "CrossPathsShowcaseEligibilityDocument"
    ),
  };
}

function candidateBundleEligible(params: {
  viewer: UserProfileDocument;
  bundle: NonNullable<Awaited<ReturnType<typeof loadCandidateBundle>>>;
  event: EventDocument;
  nowMillis: number;
}): boolean {
  const {viewer, bundle, event, nowMillis} = params;
  const {user, publicProfile, showcase} = bundle;
  if (
    user.profileComplete !== true ||
    user.prefsShowInCrossPaths !== true ||
    user.deleted === true ||
    !syntheticScopesMatch(user, event) ||
    syntheticFlag(publicProfile) !== syntheticFlag(user) ||
    !isReciprocallyEligible({viewer, candidate: user, nowMillis})
  ) {
    return false;
  }
  const readiness = evaluateCrossPathsShowcaseReadiness(publicProfile);
  return effectiveCrossPathsShowcaseEligibility(
    readiness,
    showcase
  ).status === "eligible";
}

function syntheticScopesMatch(
  user: unknown,
  event: unknown
): boolean {
  const userSynthetic = syntheticFlag(user);
  const eventSynthetic = syntheticFlag(event);
  if (userSynthetic !== eventSynthetic) return false;
  if (!userSynthetic) return true;
  const userPrefix = syntheticSeedPrefix(user);
  const eventPrefix = syntheticSeedPrefix(event);
  return userPrefix !== null && userPrefix === eventPrefix;
}

function syntheticFlag(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return (value as Record<string, unknown>).synthetic === true;
}

function syntheticSeedPrefix(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const prefix = (value as Record<string, unknown>).seedPrefix;
  return typeof prefix === "string" && prefix.trim().length > 0 ?
    prefix.trim() : null;
}

async function fetchOpenReportBoundary(
  db: FirebaseFirestore.Firestore,
  viewerUid: string
): Promise<{uids: Set<string>; saturated: boolean}> {
  const [outgoing, incoming] = await Promise.all([
    db.collection("reports").where("reporterUserId", "==", viewerUid)
      .limit(500).get(),
    db.collection("reports").where("targetUserId", "==", viewerUid)
      .limit(500).get(),
  ]);
  const uids = new Set<string>();
  for (const snap of outgoing.docs) {
    const data = snap.data();
    if (data.status === "open" && typeof data.targetUserId === "string") {
      uids.add(data.targetUserId);
    }
  }
  for (const snap of incoming.docs) {
    const data = snap.data();
    if (data.status === "open" && typeof data.reporterUserId === "string") {
      uids.add(data.reporterUserId);
    }
  }
  return {
    uids,
    saturated: outgoing.docs.length >= 500 || incoming.docs.length >= 500,
  };
}

async function fetchPendingModerationUids(
  db: FirebaseFirestore.Firestore
): Promise<{uids: Set<string>; saturated: boolean}> {
  const snap = await db.collection("moderationFlags")
    .where("status", "==", "pending").limit(1000).get();
  return {
    uids: new Set(snap.docs
      .map((doc) => doc.data().targetUserId)
      .filter((uid): uid is string => typeof uid === "string")),
    saturated: snap.docs.length >= 1000,
  };
}

async function fetchActiveMatchUids(
  db: FirebaseFirestore.Firestore,
  viewerUid: string
): Promise<{uids: Set<string>; saturated: boolean}> {
  const snap = await db.collection("matches")
    .where("participantIds", "array-contains", viewerUid).limit(500).get();
  const uids = new Set<string>();
  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.status !== "active" || !Array.isArray(data.participantIds)) {
      continue;
    }
    for (const uid of data.participantIds) {
      if (typeof uid === "string" && uid !== viewerUid) uids.add(uid);
    }
  }
  return {uids, saturated: snap.docs.length >= 500};
}

async function fetchExposureRows(
  db: FirebaseFirestore.Firestore,
  viewerUid: string
): Promise<{rows: ExposureRow[]; saturated: boolean}> {
  const snap = await db.collection("crossPathsSuggestionExposures")
    .where("viewerUid", "==", viewerUid).limit(201).get();
  const saturated = snap.docs.length > 200;
  const rows = snap.docs.slice(0, 200).flatMap((doc): ExposureRow[] => {
    const data = doc.data();
    const shownAt = data.shownAt;
    if (
      typeof data.candidateUid !== "string" ||
      typeof data.eventId !== "string" ||
      typeof data.sessionIdHash !== "string" ||
      typeof shownAt?.toMillis !== "function"
    ) {
      return [];
    }
    return [{
      candidateUid: data.candidateUid,
      eventId: data.eventId,
      sessionIdHash: data.sessionIdHash,
      shownAtMillis: shownAt.toMillis(),
    }];
  });
  return {rows, saturated};
}

function weeklyFatigueCounts(
  rows: ExposureRow[],
  nowMillis: number
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (row.shownAtMillis < nowMillis - fatigueWindowMillis) continue;
    counts.set(row.candidateUid, (counts.get(row.candidateUid) ?? 0) + 1);
  }
  return counts;
}

function compareInitialPairs(
  left: CandidatePair,
  right: CandidatePair
): number {
  const byStart = left.eventContext.event.startTime.toMillis() -
    right.eventContext.event.startTime.toMillis();
  return byStart !== 0 ? byStart :
    left.stableTieBreak.localeCompare(right.stableTieBreak);
}

function compareEligiblePairs(params: {
  left: CandidatePair;
  right: CandidatePair;
  existingSessionPairs: Set<string>;
  fatigueCounts: Map<string, number>;
}): number {
  const {left, right, existingSessionPairs, fatigueCounts} = params;
  const leftExisting = existingSessionPairs.has(
    `${left.eventContext.eventId}|${left.candidateUid}`
  );
  const rightExisting = existingSessionPairs.has(
    `${right.eventContext.eventId}|${right.candidateUid}`
  );
  if (leftExisting !== rightExisting) return leftExisting ? -1 : 1;
  const fatigue = (fatigueCounts.get(left.candidateUid) ?? 0) -
    (fatigueCounts.get(right.candidateUid) ?? 0);
  if (fatigue !== 0) return fatigue;
  return compareInitialPairs(left, right);
}

function uniqueCandidates(pairs: CandidatePair[]): CandidatePair[] {
  const seen = new Set<string>();
  return pairs.filter((pair) => {
    if (seen.has(pair.candidateUid)) return false;
    seen.add(pair.candidateUid);
    return true;
  });
}

function chooseSessionBoundedPairs(params: {
  eligiblePairs: CandidatePair[];
  existingSessionPairs: Set<string>;
  existingSessionCandidateUids: Set<string>;
}): CandidatePair[] {
  const unique = uniqueCandidates(params.eligiblePairs);
  const existing = unique.filter((pair) => params.existingSessionPairs.has(
    `${pair.eventContext.eventId}|${pair.candidateUid}`
  ));
  const remaining = Math.max(
    0,
    maximumSuggestions - params.existingSessionCandidateUids.size
  );
  const fresh = unique.filter((pair) =>
    !params.existingSessionCandidateUids.has(pair.candidateUid)
  ).slice(0, remaining);
  return [...existing, ...fresh].slice(0, maximumSuggestions);
}

function suggestionProjection(params: {
  pair: CandidatePair;
  publicProfile: PublicProfileDocument;
  token: string;
  expiresAtMillis: number;
}): Suggestion {
  const {pair, publicProfile, token, expiresAtMillis} = params;
  const event = pair.eventContext.event;
  const photoUrls = [...publicProfile.profilePhotos]
    .sort((left, right) => left.position - right.position)
    .map((photo) => photo.thumbnailUrl || photo.url);
  return {
    person: {
      uid: pair.candidateUid,
      name: publicProfile.name,
      age: publicProfile.age,
      gender: publicProfile.gender,
      city: publicProfile.city ?? null,
      photoUrls,
      promptAnswers: publicProfile.profilePrompts.map((prompt) => ({
        prompt: prompt.prompt,
        answer: prompt.answer,
      })),
      relationshipGoal: publicProfile.relationshipGoal!,
    },
    event: {
      eventId: pair.eventContext.eventId,
      organizerId: event.organizerId ?? null,
      startTime: event.startTime.toDate().toISOString(),
      endTime: event.endTime.toDate().toISOString(),
      meetingPoint: event.meetingPoint,
      activityKind: event.eventFormat.activityKind,
      photoUrl: event.photoUrl ?? null,
      viewerBookingStatus: pair.eventContext.viewerBookingStatus,
      pairHoldAvailable: pair.eventContext.pairHoldAvailable,
    },
    reasonCodes: [
      "attending_event",
      pair.eventContext.viewerBookingStatus === "signedUp" ?
        "viewer_attending" : "booking_available",
      "mutual_preferences",
      "showcase_ready",
    ],
    suggestionToken: token,
    tokenExpiresAt: new Date(expiresAtMillis).toISOString(),
  };
}

async function recordExposureReceipts(params: {
  db: FirebaseFirestore.Firestore;
  viewerUid: string;
  sessionIdHash: string;
  pairs: CandidatePair[];
  now: FirebaseFirestore.Timestamp;
}) {
  const {db, viewerUid, sessionIdHash, pairs, now} = params;
  if (pairs.length === 0) return;
  await db.runTransaction(async (tx) => {
    const receipts = pairs.map((pair) => {
      const exposureId = sha256(
        `${viewerUid}|${sessionIdHash}|${pair.eventContext.eventId}|` +
        pair.candidateUid
      );
      return {
        pair,
        ref: db.collection("crossPathsSuggestionExposures").doc(exposureId),
      };
    });
    const existingReceipts = await Promise.all(
      receipts.map(({ref}) => tx.get(ref))
    );
    receipts.forEach(({pair, ref}, index) => {
      const existing = existingReceipts[index];
      if (existing.exists) return;
      tx.create(ref, {
        viewerUid,
        candidateUid: pair.candidateUid,
        eventId: pair.eventContext.eventId,
        sessionIdHash,
        rankingVersion: crossPathsSuggestionRankingVersion,
        shownAt: now,
        expiresAt: admin.firestore.Timestamp.fromMillis(
          now.toMillis() + exposureRetentionMillis
        ),
      });
    });
  });
}

export function signSuggestionToken(payload: SuggestionTokenPayload): string {
  const key = crossPathsSuggestionSigningKey.value();
  if (key.length < 32) {
    throw new HttpsError(
      "internal",
      "Cross Paths suggestions are temporarily unavailable."
    );
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", key)
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${signature}`;
}

/** Verifies and decodes a short-lived roster-private suggestion token. */
export function verifyCrossPathsSuggestionToken(
  token: string,
  nowMillis: number
): SuggestionTokenPayload {
  const [encoded, suppliedSignature, ...extra] = token.split(".");
  const key = crossPathsSuggestionSigningKey.value();
  if (!encoded || !suppliedSignature || extra.length > 0 || key.length < 32) {
    throw invalidSuggestionToken();
  }
  const expectedSignature = createHmac("sha256", key)
    .update(encoded)
    .digest("base64url");
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  ) {
    throw invalidSuggestionToken();
  }
  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as Partial<SuggestionTokenPayload>;
    if (
      payload.version !== 1 ||
      payload.rankingVersion !== 1 ||
      typeof payload.viewerUid !== "string" ||
      typeof payload.candidateUid !== "string" ||
      typeof payload.eventId !== "string" ||
      typeof payload.sessionIdHash !== "string" ||
      typeof payload.issuedAtMillis !== "number" ||
      typeof payload.expiresAtMillis !== "number" ||
      payload.issuedAtMillis > nowMillis + 60_000 ||
      payload.expiresAtMillis <= nowMillis
    ) {
      throw invalidSuggestionToken();
    }
    return payload as SuggestionTokenPayload;
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw invalidSuggestionToken();
  }
}

function invalidSuggestionToken(): HttpsError {
  return new HttpsError(
    "failed-precondition",
    "This Cross Paths suggestion is no longer available."
  );
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function emptyResponse(): GetCrossPathsSuggestionsCallableResponse {
  return validatedResponse({
    schemaVersion: 1,
    rankingVersion: crossPathsSuggestionRankingVersion,
    suggestions: [],
  });
}

function validatedResponse(
  response: GetCrossPathsSuggestionsCallableResponse
): GetCrossPathsSuggestionsCallableResponse {
  if (!validateGetCrossPathsSuggestionsCallableResponse(response)) {
    throw new HttpsError(
      "internal",
      "getCrossPathsSuggestions produced an invalid response."
    );
  }
  return response;
}

export const getCrossPathsSuggestions = onCall(
  appCheckCallableOptionsWithSecrets([crossPathsSuggestionSigningKey]),
  (request) => getCrossPathsSuggestionsHandler(request)
);
