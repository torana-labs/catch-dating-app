import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import type {
  EventAttendeeDocument,
  EventDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {EventSuccessLiveActionCallablePayload} from
  "../shared/generated/eventSuccessLiveActionCallablePayload";
import type {PublishEventSuccessRotationRoundCallablePayload} from
  "../shared/generated/publishEventSuccessRotationRoundCallablePayload";
import {
  validateEventSuccessLiveActionCallablePayload,
} from "../shared/generated/validators/eventSuccessLiveActionInput";
import {
  validatePublishEventSuccessRotationRoundCallablePayload,
} from
  "../shared/generated/validators/publishEventSuccessRotationRoundInput";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {
  eventOrganizerRef,
  isEventOrganizerManager,
  requireEventOrganizer,
} from "../shared/eventOrganizers";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {
  requireAccountabilityAcknowledgement,
  unresolvedAccountabilityCount,
} from "./accountability";
import {
  EventSuccessAccountability,
  eventSuccessPrimitivesFor,
} from "./formatPrimitives";
import {recheckAssignmentFeatureSnapshots} from
  "./assignmentFeatureConsent";
import {buildAssignmentFeatureAudit} from "./assignmentFeatureAudit";
import {validateAssignmentFeatureRules} from
  "./assignmentFeatureScoring";
import type {AssignmentFeatureRule, EventAssignmentFeatureSnapshot} from
  "./assignmentFeatureScoring";

const GUIDED_ROTATIONS_MODULE_ID = "guided_rotations";

interface EventSuccessLiveControlDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  nowMillis: () => number;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

interface LivePlanDocument {
  eventId?: string;
  organizerId?: string;
  activeStepIndex?: number;
  liveControlRevision?: number;
  assignmentDraftRevision?: number;
  assignmentFeatureRules?: AssignmentFeatureRule[];
  assignmentFeatureRevision?: number;
  assignmentFeatureConfigHash?: string;
  publishedRotationRoundIndex?: number;
  publishedRevealRoundIndex?: number;
  status?: "setup" | "live" | "complete";
  revealStatus?: "idle" | "countingDown" | "revealed";
  activeRevealRoundIndex?: number;
  revealStartedAt?: FirebaseFirestore.Timestamp | null;
  frozenAt?: FirebaseFirestore.Timestamp | null;
  structureConfig?: {
    revealCountdownSeconds?: number;
  };
}

export interface LivePlanState {
  activeStepIndex: number;
  liveControlRevision: number;
  publishedRotationRoundIndex: number;
  publishedRevealRoundIndex: number;
  status: "setup" | "live" | "complete";
  revealStatus: "idle" | "countingDown" | "revealed";
  activeRevealRoundIndex: number;
  revealStartedAtMillis: number | null;
  revealCountdownSeconds: number;
}

type LivePlanUpdate = Partial<Omit<LivePlanState,
  "revealStartedAtMillis" | "revealCountdownSeconds">> & {
  revealStartedAt?: "serverTimestamp" | null;
};

export interface LiveActionResolution {
  replayed: boolean;
  update: LivePlanUpdate;
}

export interface LiveCompletionAccountability {
  accountability: EventSuccessAccountability;
  unresolvedCount: number;
}

export interface RotationPublishResolution {
  replayed: boolean;
  revision: number;
  publishedRotationRoundIndex: number;
}

const defaultDeps: EventSuccessLiveControlDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  nowMillis: () => Date.now(),
  checkRateLimit: defaultCheckRateLimit,
};

/**
 * Resolves one live-control command without touching Firestore.
 * @param {LivePlanState} state Persisted live state.
 * @param {EventSuccessLiveActionCallablePayload} payload Requested action.
 * @param {number} nowMillis Server time used for countdown boundaries.
 * @return {LiveActionResolution} Idempotent replay or exact persisted update.
 */
export function resolveEventSuccessLiveAction(
  state: LivePlanState,
  payload: EventSuccessLiveActionCallablePayload,
  nowMillis: number,
  completionAccountability: LiveCompletionAccountability = {
    accountability: "none",
    unresolvedCount: 0,
  }
): LiveActionResolution {
  const effectiveRevealIndex = effectivePublishedRevealIndex(state, nowMillis);
  if (payload.action === "complete" && state.status === "complete") {
    return {replayed: true, update: {}};
  }
  if (
    payload.action === "publishReveal" &&
    payload.roundIndex !== undefined &&
    payload.roundIndex <= effectiveRevealIndex
  ) {
    return {replayed: true, update: {}};
  }
  if (
    payload.action === "setActiveStep" &&
    payload.activeStepIndex === state.activeStepIndex &&
    state.status === "live"
  ) {
    return {replayed: true, update: {}};
  }
  requireRevision(state.liveControlRevision, payload.expectedRevision);
  if (state.status === "complete") {
    throw new HttpsError("failed-precondition",
      "The live event guide is already complete.");
  }
  if (payload.action === "complete") {
    requireAccountabilityAcknowledgement({
      ...completionAccountability,
      acknowledged: payload.accountabilityAcknowledged,
    });
  }

  const common: LivePlanUpdate = {
    liveControlRevision: nextRevision(state.liveControlRevision),
    publishedRevealRoundIndex: effectiveRevealIndex,
  };
  switch (payload.action) {
  case "setActiveStep": {
    if (payload.activeStepIndex === undefined) {
      throw new HttpsError("invalid-argument",
        "activeStepIndex is required for setActiveStep.");
    }
    return {
      replayed: false,
      update: {
        ...common,
        activeStepIndex: payload.activeStepIndex,
        status: "live",
      },
    };
  }
  case "startRevealCountdown": {
    requireConfirmed(payload.confirmed, "Start the reveal countdown");
    const roundIndex = requireRoundIndex(payload.roundIndex);
    requireNextRevealRound(roundIndex, effectiveRevealIndex);
    if (
      state.revealStatus === "countingDown" &&
      state.activeRevealRoundIndex === roundIndex &&
      countdownEndsAtMillis(state) > nowMillis
    ) {
      return {replayed: true, update: {}};
    }
    return {
      replayed: false,
      update: {
        ...common,
        status: "live",
        revealStatus: "countingDown",
        activeRevealRoundIndex: roundIndex,
        revealStartedAt: "serverTimestamp",
      },
    };
  }
  case "cancelRevealCountdown": {
    if (
      state.revealStatus !== "countingDown" ||
      state.revealStartedAtMillis === null
    ) {
      throw new HttpsError("failed-precondition",
        "There is no active reveal countdown to cancel.");
    }
    if (countdownEndsAtMillis(state) <= nowMillis) {
      throw new HttpsError("failed-precondition",
        "This reveal is already published and cannot be reverted.");
    }
    return {
      replayed: false,
      update: {
        ...common,
        revealStatus: effectiveRevealIndex >= 0 ? "revealed" : "idle",
        activeRevealRoundIndex: Math.max(0, effectiveRevealIndex),
        revealStartedAt: null,
      },
    };
  }
  case "publishReveal": {
    requireConfirmed(payload.confirmed, "Publish the reveal");
    const roundIndex = requireRoundIndex(payload.roundIndex);
    requireNextRevealRound(roundIndex, effectiveRevealIndex);
    return {
      replayed: false,
      update: {
        ...common,
        status: "live",
        revealStatus: "revealed",
        activeRevealRoundIndex: roundIndex,
        publishedRevealRoundIndex: roundIndex,
        revealStartedAt: state.revealStartedAtMillis === null ?
          "serverTimestamp" : undefined,
      },
    };
  }
  case "complete":
    return {
      replayed: false,
      update: {...common, status: "complete"},
    };
  }
}

/** Resolves the monotonic/idempotent portion of rotation publication. */
export function resolveRotationPublish(
  state: {
    liveControlRevision: number;
    publishedRotationRoundIndex: number;
  },
  payload: PublishEventSuccessRotationRoundCallablePayload
): RotationPublishResolution {
  if (payload.roundIndex <= state.publishedRotationRoundIndex) {
    return {
      replayed: true,
      revision: state.liveControlRevision,
      publishedRotationRoundIndex: state.publishedRotationRoundIndex,
    };
  }
  requireConfirmed(payload.confirmed, "Publish the rotation round");
  requireRevision(state.liveControlRevision, payload.expectedRevision);
  if (payload.roundIndex !== state.publishedRotationRoundIndex + 1) {
    throw new HttpsError("failed-precondition",
      "Rotation rounds must be published in order.");
  }
  return {
    replayed: false,
    revision: nextRevision(state.liveControlRevision),
    publishedRotationRoundIndex: payload.roundIndex,
  };
}

/** Removes every future slot before a draft crosses the attendee boundary. */
export function publishedAssignmentThroughRound(
  assignment: Record<string, unknown>,
  roundIndex: number
): Record<string, unknown> {
  const rotationSlots = objectArray(assignment.rotationSlots).filter(
    (slot) => integerOr(slot.roundIndex, -1) <= roundIndex
  );
  const sitOutSlots = objectArray(assignment.sitOutSlots).filter(
    (slot) => integerOr(slot.roundIndex, -1) <= roundIndex
  );
  const peerUids = [...new Set(
    rotationSlots
      .map((slot) => slot.peerUid)
      .filter((uid): uid is string => typeof uid === "string")
  )].sort();
  const peerCounts = new Map<string, number>();
  for (const uid of peerUids) {
    const meetingCount = rotationSlots.filter(
      (slot) => slot.peerUid === uid
    ).length;
    peerCounts.set(uid, meetingCount);
  }
  const whyCodes = [...new Set([
    ...rotationSlots.flatMap((slot) => stringArray(slot.whyCodes)),
    ...sitOutSlots.flatMap((slot) => stringArray(slot.whyCodes)),
  ])];
  const breakLabel = sitOutSlots.length === 0 ? "" :
    ` · ${sitOutSlots.length} break${sitOutSlots.length === 1 ? "" : "s"}`;
  return {
    ...assignment,
    displayTitle: `${rotationSlots.length} guided rotation${
      rotationSlots.length === 1 ? "" : "s"}`,
    displaySubtitle: `${peerUids.length} ${
      peerUids.length === 1 ? "person" : "people"}${breakLabel}`,
    peerUids,
    whySummary: `${rotationSlots.length} partner round${
      rotationSlots.length === 1 ? "" : "s"} with ${peerUids.length} unique ${
      peerUids.length === 1 ? "person" : "people"}.`,
    whyCodes,
    rotationFairness: {
      assignedRoundCount: rotationSlots.length,
      sitOutRoundCount: sitOutSlots.length,
      uniquePeerCount: peerUids.length,
      repeatPeerCount: [...peerCounts.values()].reduce(
        (sum, count) => sum + Math.max(0, count - 1),
        0
      ),
    },
    rotationSlots,
    ...(sitOutSlots.length > 0 ? {sitOutSlots} : {sitOutSlots: []}),
  };
}

/** Handles revision-fenced live pointer and reveal mutations. */
export async function controlEventSuccessLiveHandler(
  request: CallableRequest<unknown>,
  deps: EventSuccessLiveControlDeps = defaultDeps
): Promise<{replayed: boolean; revision: number}> {
  const uid = requireAuth(request);
  const payload =
    validateCallableWithAjv<EventSuccessLiveActionCallablePayload>(
      request,
      validateEventSuccessLiveActionCallablePayload
    );
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, uid, "controlEventSuccessLive", {
    maxRequests: 120, windowMs: 60 * 1000,
  });
  const event = await requireEventManager(db, payload.eventId, uid);
  let accountability: EventSuccessAccountability = "none";
  let unresolvedCount = 0;
  if (payload.action === "complete") {
    accountability = eventSuccessPrimitivesFor(
      event.eventFormat
    ).accountability;
    if (accountability === "sweep") {
      const attendeeSnap = await db.collection("eventAttendees")
        .where("eventId", "==", payload.eventId)
        .limit(1001)
        .get();
      if (attendeeSnap.docs.length > 1000) {
        throw new HttpsError(
          "failed-precondition",
          "The accountability sweep exceeds the supported roster size."
        );
      }
      unresolvedCount = unresolvedAccountabilityCount(
        attendeeSnap.docs.map((doc) => doc.data() as EventAttendeeDocument)
      );
    }
  }
  const planRef = db.collection("eventSuccessPlans").doc(payload.eventId);

  return db.runTransaction(async (transaction) => {
    const planSnap = await transaction.get(planRef);
    if (!planSnap.exists) {
      throw new HttpsError("failed-precondition",
        "Event-success setup has not been saved.");
    }
    const plan = planSnap.data() as LivePlanDocument;
    assertPlanIdentity(plan, payload.eventId);
    const state = livePlanState(plan);
    const resolution = resolveEventSuccessLiveAction(
      state,
      payload,
      deps.nowMillis(),
      {accountability, unresolvedCount}
    );
    if (resolution.replayed) {
      return {replayed: true, revision: state.liveControlRevision};
    }
    const update = firestoreLiveUpdate(
      resolution.update,
      deps.serverTimestamp()
    );
    if (plan.frozenAt === undefined || plan.frozenAt === null) {
      update.frozenAt = deps.serverTimestamp();
    }
    if (payload.action === "complete") {
      update.completedAt = deps.serverTimestamp();
    }
    update.updatedAt = deps.serverTimestamp();
    transaction.update(planRef, update);
    return {
      replayed: false,
      revision: resolution.update.liveControlRevision!,
    };
  });
}

export const controlEventSuccessLive = onCall(
  appCheckCallableOptions,
  (request) => controlEventSuccessLiveHandler(request)
);

/** Publishes exactly one already-computed rotation round atomically. */
export async function publishEventSuccessRotationRoundHandler(
  request: CallableRequest<unknown>,
  deps: EventSuccessLiveControlDeps = defaultDeps
): Promise<{assignmentCount: number; replayed: boolean; revision: number}> {
  const uid = requireAuth(request);
  const payload =
    validateCallableWithAjv<PublishEventSuccessRotationRoundCallablePayload>(
      request,
      validatePublishEventSuccessRotationRoundCallablePayload
    );
  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    uid,
    "publishEventSuccessRotationRound",
    {maxRequests: 30, windowMs: 60 * 1000}
  );
  const event = await requireEventManager(db, payload.eventId, uid);
  const planRef = db.collection("eventSuccessPlans").doc(payload.eventId);
  const draftQuery = db.collection("eventSuccessAssignmentDrafts")
    .where("eventId", "==", payload.eventId)
    .where("moduleId", "==", GUIDED_ROTATIONS_MODULE_ID);

  return db.runTransaction(async (transaction) => {
    const planSnap = await transaction.get(planRef);
    if (!planSnap.exists) {
      throw new HttpsError("failed-precondition",
        "Event-success setup has not been saved.");
    }
    const plan = planSnap.data() as LivePlanDocument;
    assertPlanIdentity(plan, payload.eventId);
    const currentRevision = nonNegativeInt(plan.liveControlRevision);
    const publishedRoundIndex = integerOr(plan.publishedRotationRoundIndex, -1);
    const resolution = resolveRotationPublish({
      liveControlRevision: currentRevision,
      publishedRotationRoundIndex: publishedRoundIndex,
    }, payload);
    if (resolution.replayed) {
      return {
        assignmentCount: 0,
        replayed: true,
        revision: resolution.revision,
      };
    }
    const draftSnap = await transaction.get(draftQuery);
    const assignmentRevision = nonNegativeInt(plan.assignmentDraftRevision);
    const drafts = draftSnap.docs.filter((doc) => {
      const data = doc.data();
      return data.roundIndex === payload.roundIndex &&
        data.baseAssignmentRevision === assignmentRevision;
    });
    if (drafts.length === 0) {
      throw new HttpsError("failed-precondition",
        "The next rotation round is not prepared yet.");
    }
    const rules = validateAssignmentFeatureRules(
      plan.assignmentFeatureRules ?? []);
    const featureSnapshots: EventAssignmentFeatureSnapshot[] = [];
    let guardedDrafts = 0;
    for (const draft of drafts) {
      const data = draft.data();
      const guard = data.assignmentFeatureGuard;
      if (guard === undefined) {
        if (rules.length && data.assignment?.source !==
            "host_override_v1") {
          throw new HttpsError("aborted",
            "Prepared assignments lack matching consent audit.");
        }
        continue;
      }
      if (!guard || typeof guard !== "object" ||
          guard.revision !== plan.assignmentFeatureRevision ||
          guard.configHash !== plan.assignmentFeatureConfigHash ||
          !Array.isArray(guard.snapshots) ||
          guard.snapshots.length > rules.length ||
          data.uid !== data.assignment?.uid) {
        throw new HttpsError("aborted",
          "Assignment feature setup changed after preparation.");
      }
      guardedDrafts++;
      for (const snapshot of guard.snapshots) {
        if (!snapshot || typeof snapshot !== "object" ||
            snapshot.uid !== data.uid ||
            snapshot.eventId !== payload.eventId) {
          throw new HttpsError("aborted",
            "Prepared matching consent audit is invalid.");
        }
        featureSnapshots.push(snapshot as EventAssignmentFeatureSnapshot);
      }
    }
    if (guardedDrafts && guardedDrafts !== drafts.length) {
      throw new HttpsError("aborted",
        "Prepared assignments have mixed matching consent audits.");
    }
    let expectedFeatureAudit: ReturnType<
      typeof buildAssignmentFeatureAudit> | null = null;
    if (guardedDrafts) {
      const organizerId = event.organizerId;
      if (!organizerId || drafts.some((draft) =>
        draft.data().organizerId !== organizerId)) {
        throw new HttpsError("aborted",
          "Prepared assignments do not match this organizer.");
      }
      await recheckAssignmentFeatureSnapshots({tx: transaction, db,
        eventId: payload.eventId, organizerId, rules,
        snapshots: featureSnapshots});
      expectedFeatureAudit = buildAssignmentFeatureAudit({
        eventId: payload.eventId, organizerId,
        configHash: plan.assignmentFeatureConfigHash ?? "",
        snapshots: featureSnapshots});
    }
    const now = deps.serverTimestamp();
    for (const draft of drafts) {
      const data = draft.data();
      if (data.assignment === null || typeof data.assignment !== "object") {
        throw new HttpsError("failed-precondition",
          "A prepared rotation assignment is invalid.");
      }
      const assignment = data.assignment as Record<string, unknown>;
      if (expectedFeatureAudit && (
        !assignment.assignmentFeatureAudit ||
        typeof assignment.assignmentFeatureAudit !== "object" ||
        (assignment.assignmentFeatureAudit as Record<string, unknown>)
          .algorithmVersion !== expectedFeatureAudit.algorithmVersion ||
        (assignment.assignmentFeatureAudit as Record<string, unknown>)
          .configHash !== expectedFeatureAudit.configHash ||
        (assignment.assignmentFeatureAudit as Record<string, unknown>)
          .inputSnapshotId !== expectedFeatureAudit.inputSnapshotId)) {
        throw new HttpsError("aborted",
          "Prepared matching input audit changed.");
      }
      if (
        assignment.eventId !== payload.eventId ||
        assignment.moduleId !== GUIDED_ROTATIONS_MODULE_ID ||
        typeof assignment.uid !== "string"
      ) {
        throw new HttpsError("failed-precondition",
          "A prepared rotation assignment does not match this event.");
      }
      transaction.set(
        db.collection("eventSuccessAssignments").doc(draft.id),
        {
          ...publishedAssignmentThroughRound(assignment, payload.roundIndex),
          updatedAt: now,
        },
        {merge: true}
      );
    }
    transaction.update(planRef, {
      publishedRotationRoundIndex: resolution.publishedRotationRoundIndex,
      liveControlRevision: resolution.revision,
      status: "live",
      updatedAt: now,
      ...(plan.frozenAt === undefined || plan.frozenAt === null ?
        {frozenAt: now} : {}),
    });
    return {
      assignmentCount: drafts.length,
      replayed: false,
      revision: resolution.revision,
    };
  });
}

export const publishEventSuccessRotationRound = onCall(
  appCheckCallableOptions,
  (request) => publishEventSuccessRotationRoundHandler(request)
);

async function requireEventManager(
  db: FirebaseFirestore.Firestore,
  eventId: string,
  uid: string
): Promise<EventDocument> {
  const eventSnap = await db.collection("events").doc(eventId).get();
  if (!eventSnap.exists) {
    throw new HttpsError("not-found", "Event not found.");
  }
  const event = requireDoc<EventDocument>(eventSnap, "EventDocument");
  const organizerSnap = await eventOrganizerRef(db, event).get();
  const organizer = requireEventOrganizer(organizerSnap, event);
  if (!isEventOrganizerManager(organizer, event, uid)) {
    throw new HttpsError("permission-denied",
      "Only an organizer manager can control this live event.");
  }
  return event;
}

function livePlanState(plan: LivePlanDocument): LivePlanState {
  const legacyPublishedReveal = plan.revealStatus === "revealed" ?
    nonNegativeInt(plan.activeRevealRoundIndex) : -1;
  return {
    activeStepIndex: nonNegativeInt(plan.activeStepIndex),
    liveControlRevision: nonNegativeInt(plan.liveControlRevision),
    publishedRotationRoundIndex:
      integerOr(plan.publishedRotationRoundIndex, -1),
    publishedRevealRoundIndex: Math.max(
      integerOr(plan.publishedRevealRoundIndex, -1),
      legacyPublishedReveal
    ),
    status: plan.status ?? "setup",
    revealStatus: plan.revealStatus ?? "idle",
    activeRevealRoundIndex: nonNegativeInt(plan.activeRevealRoundIndex),
    revealStartedAtMillis: plan.revealStartedAt?.toMillis() ?? null,
    revealCountdownSeconds: Math.max(
      0,
      nonNegativeInt(plan.structureConfig?.revealCountdownSeconds)
    ),
  };
}

function effectivePublishedRevealIndex(
  state: LivePlanState,
  nowMillis: number
): number {
  if (
    state.revealStatus === "countingDown" &&
    state.revealStartedAtMillis !== null &&
    countdownEndsAtMillis(state) <= nowMillis
  ) {
    return Math.max(
      state.publishedRevealRoundIndex,
      state.activeRevealRoundIndex
    );
  }
  return state.publishedRevealRoundIndex;
}

function countdownEndsAtMillis(state: LivePlanState): number {
  if (state.revealStartedAtMillis === null) return Number.POSITIVE_INFINITY;
  return state.revealStartedAtMillis + state.revealCountdownSeconds * 1000;
}

function firestoreLiveUpdate(
  update: LivePlanUpdate,
  serverTimestamp: FirebaseFirestore.FieldValue
): FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> {
  const result: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> =
    {...update};
  delete result.revealStartedAtMillis;
  delete result.revealCountdownSeconds;
  if (update.revealStartedAt === "serverTimestamp") {
    result.revealStartedAt = serverTimestamp;
  } else if (update.revealStartedAt === undefined) {
    delete result.revealStartedAt;
  }
  return result;
}

function requireRevision(actual: number, expected: number): void {
  if (actual !== expected) {
    throw new HttpsError("aborted",
      "The live event guide changed on another device. Refresh and retry.");
  }
}

function requireConfirmed(confirmed: boolean | undefined, label: string): void {
  if (confirmed !== true) {
    throw new HttpsError("failed-precondition",
      `${label} requires explicit confirmation.`);
  }
}

function requireRoundIndex(value: number | undefined): number {
  if (!Number.isInteger(value) || value === undefined || value < 0) {
    throw new HttpsError("invalid-argument", "roundIndex is required.");
  }
  return value;
}

function requireNextRevealRound(roundIndex: number, published: number): void {
  if (roundIndex !== published + 1) {
    throw new HttpsError("failed-precondition",
      "Reveal rounds must be published in order.");
  }
}

function assertPlanIdentity(plan: LivePlanDocument, eventId: string): void {
  if (plan.eventId !== undefined && plan.eventId !== eventId) {
    throw new HttpsError("failed-precondition",
      "Event-success plan does not match this event.");
  }
}

function nextRevision(current: number): number {
  if (current >= 2147483647) {
    throw new HttpsError("resource-exhausted",
      "The live-control revision limit has been reached.");
  }
  return current + 1;
}

function nonNegativeInt(value: unknown): number {
  return Number.isInteger(value) && (value as number) >= 0 ?
    value as number : 0;
}

function integerOr(value: unknown, fallback: number): number {
  return Number.isInteger(value) ? value as number : fallback;
}

function objectArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter(
    (item): item is Record<string, unknown> =>
      item !== null && typeof item === "object" && !Array.isArray(item)
  ) : [];
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter(
    (item): item is string => typeof item === "string"
  ) : [];
}
