import {onCall, CallableRequest, HttpsError} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import type {
  EventDocument,
  BlockDocument,
  OrganizerEventSuccessLayoutDocument,
} from
  "../shared/generated/firestoreAdminTypes";
import {requireAuth} from "../shared/auth";
import type {PrepareEventSuccessRotationDraftCallablePayload} from
  "../shared/generated/prepareEventSuccessRotationDraftCallablePayload";
import type {OverrideEventSuccessRotationsCallablePayload} from
  "../shared/generated/overrideEventSuccessRotationsCallablePayload";
import {
  validatePrepareEventSuccessRotationDraftCallablePayload,
} from
  "../shared/generated/validators/prepareEventSuccessRotationDraftInput";
import {
  validateOverrideEventSuccessRotationsCallablePayload,
} from
  "../shared/generated/validators/overrideEventSuccessRotationsInput";
import {validateCallableWithAjv, requireDoc} from "../shared/validation";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {normalizeEventIdPayload} from "../events/eventPayloadNormalization";
import {requireScheduledEvent,
  type ScheduledEventDocument} from "../events/configuredEvent";
import {
  eventOrganizerRef,
  isEventOrganizerManager,
  requireEventOrganizer,
} from "../shared/eventOrganizers";
import {
  AssignmentParticipant,
  assignmentPairKey,
  AssignmentRotationPolicy,
  OptimizedPair,
  runAssignmentEngine,
} from "./assignmentOptimizer";
import {
  AssignmentConstraintConfig,
  normalizeAssignmentConstraints,
} from "./assignmentConstraints";
import {
  AssignmentTopology,
  EventSuccessResourceLabelId,
  EventSuccessUnitKind,
  assertPairRotationTopology,
  resolveAssignmentTopology,
  resolveRotationIntervalMinutes,
  resolveSequenceConcurrentUnits,
  rotationRoundCountForDuration,
} from "./assignmentTopology";
import {
  CompatibilitySignal,
  QuestionnaireScoringMode,
  scoreDatingCompatibilityPair,
  scoreQuestionnaireObjectivePair,
} from "./compatibilityPolicy";
import {
  EventSuccessAssignmentAlgorithm,
  EventSuccessCompatibilityPolicy,
  EventSuccessMatchingObjective,
  eventSuccessPrimitivesFor,
  eventSuccessVariableResolutionFor,
} from "./formatPrimitives";
import {
  assignmentConstraintsForStructureConfig,
  AssignmentPrimitiveStructureConfig,
  rotationPolicyForStructureConfig,
} from "./assignmentPrimitiveControls";
import {loadEventSuccessRoster} from "./eventSuccessRoster";
import {loadAuthorizedAssignmentFeatures,
  recheckAssignmentFeatureSnapshots} from "./assignmentFeatureConsent";
import type {AssignmentFeatureRule,
  EventAssignmentFeatureSnapshot} from "./assignmentFeatureScoring";
import {buildAssignmentFeatureAudit,
  type AssignmentFeatureAudit} from "./assignmentFeatureAudit";
import {
  eventSuccessPresencePolicy,
  loadLikelyDepartedEventSuccessUids,
} from "./presence";
import {
  applyEventSuccessSpatialLayout,
  assignmentConstraintsForSpatialPlan,
  deriveEventSuccessUnitProximity,
  loadSelectedEventSuccessLayout,
  persistentSpatialPlanFields,
} from "./spatialLayout";
import {buildEventSuccessSequenceSchedule} from "./sequenceScheduler";

const GUIDED_ROTATIONS_MODULE_ID = "guided_rotations";
const COMPATIBILITY_QUESTIONNAIRE_MODULE_ID = "compatibility_questionnaire";
const ROUND_LENGTH_MINUTES = 15;
const MAX_IN_FILTER_VALUES = 30;
type ActiveStatus = "attended" | "signedUp";

interface EventSuccessRotationsDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  checkRateLimit?: typeof defaultCheckRateLimit;
  nowMillis?: () => number;
  environment?: NodeJS.ProcessEnv;
}

interface EventSuccessPlanDocument {
  eventId?: string;
  organizerId?: string;
  selectedModuleIds?: unknown;
  assignmentFeatureRules?: AssignmentFeatureRule[];
  assignmentFeatureRevision?: number;
  assignmentFeatureConfigHash?: string;
  compatibilityAffectsRanking?: unknown;
  liveControlRevision?: unknown;
  assignmentDraftRevision?: unknown;
  publishedRotationRoundIndex?: unknown;
  layoutId?: string | null;
  affinityConstraints?: Array<{
    aUid: string;
    bUid: string;
    value: "mustPair" | "mustSplit" | "avoidRepeat" | "neutral";
    scope: "thisRound" | "pinned";
  }>;
  spatialOverrides?: Array<{
    uid: string;
    targetPeerUid: string;
    layoutUnitId: string;
    scope: "thisRound" | "pinned";
  }>;
  structureConfig?: {
    unitKind?: unknown;
    unitSize?: unknown;
    unitCount?: unknown;
    rotationIntervalMinutes?: unknown;
    topology?: unknown;
    resourceCapacity?: unknown;
  } & AssignmentPrimitiveStructureConfig;
}

interface EventSuccessPreferenceDocument {
  uid?: string;
  guidedRotationsOptedOut?: boolean;
}

interface EventSuccessCompatibilityResponseDocument {
  uid?: string;
  eventId?: string;
  answerIds?: unknown;
}

interface RotationParticipant extends AssignmentParticipant {
  uid: string;
  status: ActiveStatus;
  gender?: string;
  interestedInGenders: string[];
  compatibilityAnswerIds: string[];
}

interface RotationPair {
  a: RotationParticipant;
  b: RotationParticipant;
  score: number;
  compatibility: CompatibilitySignal | "host_override";
  unitIndex?: number;
  resourceUnitId?: string;
  movementCost?: number;
  meetingIndex?: number;
}

interface RotationRound {
  roundIndex: number;
  pairs: RotationPair[];
}

type AssignmentWhyCode =
  "host_override" |
  "mutual_interest" |
  "one_way_interest" |
  "questionnaire_match" |
  "social_fallback" |
  "fresh_peer" |
  "repeat_peer" |
  "sit_out" |
  "pair_slot";

interface RotationFairnessSummary {
  assignedRoundCount: number;
  sitOutRoundCount: number;
  uniquePeerCount: number;
  repeatPeerCount: number;
}

interface GeneratedRotationSlot {
  slotId?: string;
  roundIndex: number;
  label: string;
  startsAt: FirebaseFirestore.Timestamp;
  endsAt: FirebaseFirestore.Timestamp;
  peerUid: string;
  unitKind?: EventSuccessUnitKind;
  unitIndex?: number;
  peerCount?: number;
  resourceUnitId?: string;
  compatibility: RotationPair["compatibility"];
  whySummary?: string;
  whyCodes?: AssignmentWhyCode[];
}

interface GeneratedSitOutSlot {
  roundIndex: number;
  label: string;
  startsAt: FirebaseFirestore.Timestamp;
  endsAt: FirebaseFirestore.Timestamp;
  whySummary: string;
  whyCodes: AssignmentWhyCode[];
}

interface GeneratedAssignment {
  eventId: string;
  organizerId: string;
  uid: string;
  moduleId: string;
  label: string;
  displayTitle: string;
  displaySubtitle: string;
  peerUids: string[];
  unitKind?: EventSuccessUnitKind;
  unitLabel?: string;
  layoutUnitId?: string;
  confirmedLayoutUnitId?: string | null;
  whySummary?: string;
  whyCodes?: AssignmentWhyCode[];
  rotationFairness?: RotationFairnessSummary;
  rotationSlots: GeneratedRotationSlot[];
  sitOutSlots?: GeneratedSitOutSlot[];
  source: string;
  assignmentFeatureAudit?: AssignmentFeatureAudit;
  createdAt: FirebaseFirestore.FieldValue;
  updatedAt: FirebaseFirestore.FieldValue;
}

const defaultDeps: EventSuccessRotationsDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  checkRateLimit: defaultCheckRateLimit,
  nowMillis: () => Date.now(),
  environment: process.env,
};

/**
 * Generates guided one-to-one rotation schedules for a hosted event.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {EventSuccessRotationsDeps} deps Injectable dependencies for tests.
 * @return {Promise<{assignmentCount: number, roundCount: number}>} Summary.
 */
export async function generateEventSuccessRotationsHandler(
  request: CallableRequest<unknown>,
  deps: EventSuccessRotationsDeps = defaultDeps
): Promise<{assignmentCount: number; roundCount: number}> {
  const uid = requireAuth(request);
  const payload =
    validateCallableWithAjv<PrepareEventSuccessRotationDraftCallablePayload>(
      request,
      validatePrepareEventSuccessRotationDraftCallablePayload,
      normalizeEventIdPayload
    );

  const db = deps.firestore();
  await deps.checkRateLimit?.(db, uid, "generateEventSuccessRotations", {
    maxRequests: 30, windowMs: 60 * 1000,
  });

  return prepareEventSuccessRotationDraft({
    eventId: payload.eventId,
    expectedRevision: payload.expectedRevision,
    managerUid: uid,
  }, deps);
}

/**
 * Pre-computes the next unpublished round and stores it in the Host-only
 * draft collection. This function is also used by the asynchronous plan
 * trigger after a publish; beat transitions never import or invoke it.
 * @param {object} input Preparation fence and optional manager authorization.
 * @param {EventSuccessRotationsDeps} deps Injectable dependencies for tests.
 * @return {Promise<object>} Prepared round summary.
 */
export async function prepareEventSuccessRotationDraft(
  input: {
    eventId: string;
    expectedRevision: number;
    managerUid?: string;
  },
  deps: EventSuccessRotationsDeps = defaultDeps
): Promise<{assignmentCount: number; roundCount: number}> {
  const db = deps.firestore();

  const {
    event,
    plan,
    rotationIntervalMinutes,
    questionnaireMode,
    constraints,
    rotationPolicy,
  } =
    await loadRotationEventContext(db, input.eventId, input.managerUid);
  const liveControlRevision = nonNegativeInteger(plan.liveControlRevision);
  if (liveControlRevision !== input.expectedRevision) {
    throw staleLiveControlError();
  }
  const featureRules = plan.assignmentFeatureRules ?? [];
  const primitives = eventSuccessPrimitivesFor(event.eventFormat);
  const {participants, blockedPairs} =
    await loadEligibleRotationParticipants(
      db,
      input.eventId,
      questionnaireMode !== "icebreaker",
      deps.nowMillis?.() ?? Date.now(),
      eventSuccessPresencePolicy(deps.environment ?? process.env),
      featureRules.length ? 1000 : undefined
    );
  const featureSnapshots = await loadAuthorizedAssignmentFeatures({db,
    eventId: input.eventId,
    organizerId: event.organizerId,
    eligibleUids: participants.map((person) => person.uid),
    rules: featureRules});
  const topology = {
    ...resolveAssignmentTopology(plan, participants.length, {
      defaultUnitKind: "pairs",
      defaultUnitSize: 2,
    }),
    rotationIntervalMinutes,
    rotationsEnabled: true,
  };
  if (featureRules.length && topology.topology === "sequence") {
    throw new HttpsError("failed-precondition",
      "Structured matching is unavailable for sequence assignments.");
  }
  const assignmentResolution = eventSuccessVariableResolutionFor({
    assignmentAlgorithm: primitives.assignmentAlgorithm,
    compatibilityPolicy: primitives.compatibilityPolicy,
    matchingObjective: primitives.matchingObjective,
    topology: topology.topology ?? "set",
  });
  if (assignmentResolution.status === "unsupported") {
    throw new HttpsError("failed-precondition", assignmentResolution.reason);
  }
  const layout = await loadSelectedEventSuccessLayout(
    db,
    event.organizerId,
    plan
  );
  const rounds = buildRotationRounds({
    participants,
    blockedPairs,
    eventStartMillis: event.startTime.toMillis(),
    eventEndMillis: event.endTime.toMillis(),
    rotationIntervalMinutes,
    questionnaireMode,
    assignmentAlgorithm: primitives.assignmentAlgorithm,
    compatibilityPolicy: primitives.compatibilityPolicy,
    matchingObjective: primitives.matchingObjective,
    constraints,
    rotationPolicy,
    topology,
    layout,
    softFeatures: {eventId: input.eventId,
      organizerId: event.organizerId,
      rules: featureRules, snapshots: featureSnapshots},
  });
  const publishedRoundIndex = integerOr(
    plan.publishedRotationRoundIndex,
    -1
  );
  const targetRoundIndex = publishedRoundIndex + 1;
  const hasTargetRound = rounds.some(
    (round) => round.roundIndex === targetRoundIndex
  );
  const assignments = hasTargetRound ? buildAssignments({
    eventId: input.eventId,
    organizerId: event.organizerId,
    participants,
    rounds,
    eventStartMillis: event.startTime.toMillis(),
    rotationIntervalMinutes,
    resourceLabelId: topology.resourceCapacity?.resourceLabelId,
    source: "server_v1",
    now: deps.serverTimestamp(),
  }) : new Map<string, GeneratedAssignment>();
  applyEventSuccessSpatialLayout(
    assignments,
    layout,
    plan,
    targetRoundIndex
  );
  if (featureRules.length) {
    const audit = buildAssignmentFeatureAudit({eventId: input.eventId,
      organizerId: event.organizerId,
      configHash: plan.assignmentFeatureConfigHash ?? "",
      snapshots: featureSnapshots});
    for (const assignment of assignments.values()) {
      assignment.assignmentFeatureAudit = audit;
    }
  }
  await writeAssignmentDrafts({
    db,
    eventId: input.eventId,
    expectedRevision: input.expectedRevision,
    expectedPublishedRoundIndex: publishedRoundIndex,
    targetRoundIndex,
    assignments,
    now: deps.serverTimestamp(),
    featureGuard: featureRules.length ? {
      organizerId: event.organizerId,
      rules: featureRules, snapshots: featureSnapshots,
      revision: plan.assignmentFeatureRevision ?? 0,
      configHash: plan.assignmentFeatureConfigHash ?? "",
    } : undefined,
  });

  return {
    assignmentCount: assignments.size,
    roundCount: rounds.length,
  };
}

export const generateEventSuccessRotations = onCall(
  appCheckCallableOptions,
  (request) => generateEventSuccessRotationsHandler(request)
);

/**
 * Applies host-authored guided rotation pairings for a hosted event.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {EventSuccessRotationsDeps} deps Injectable dependencies for tests.
 * @return {Promise<{assignmentCount: number, roundCount: number}>} Summary.
 */
export async function overrideEventSuccessRotationsHandler(
  request: CallableRequest<unknown>,
  deps: EventSuccessRotationsDeps = defaultDeps
): Promise<{assignmentCount: number; roundCount: number}> {
  const uid = requireAuth(request);
  const payload =
    validateCallableWithAjv<OverrideEventSuccessRotationsCallablePayload>(
      request,
      validateOverrideEventSuccessRotationsCallablePayload
    );

  const db = deps.firestore();
  await deps.checkRateLimit?.(db, uid, "overrideEventSuccessRotations", {
    maxRequests: 30, windowMs: 60 * 1000,
  });

  const {event, plan, rotationIntervalMinutes} =
    await loadRotationEventContext(db, payload.eventId, uid);
  const liveControlRevision = nonNegativeInteger(plan.liveControlRevision);
  if (liveControlRevision !== payload.expectedRevision) {
    throw staleLiveControlError();
  }
  const {participants, blockedPairs} =
    await loadEligibleRotationParticipants(
      db,
      payload.eventId,
      false,
      deps.nowMillis?.() ?? Date.now(),
      eventSuccessPresencePolicy(deps.environment ?? process.env)
    );
  const primitives = eventSuccessPrimitivesFor(event.eventFormat);
  const topology = {
    ...resolveAssignmentTopology(plan, participants.length, {
      defaultUnitKind: "pairs",
      defaultUnitSize: 2,
    }),
    rotationIntervalMinutes,
    rotationsEnabled: true,
  };
  const assignmentResolution = eventSuccessVariableResolutionFor({
    assignmentAlgorithm: primitives.assignmentAlgorithm,
    compatibilityPolicy: primitives.compatibilityPolicy,
    matchingObjective: primitives.matchingObjective,
    topology: topology.topology ?? "set",
  });
  if (assignmentResolution.status === "unsupported") {
    throw new HttpsError("failed-precondition", assignmentResolution.reason);
  }
  const layout = await loadSelectedEventSuccessLayout(
    db,
    event.organizerId,
    plan
  );
  const rounds = buildOverrideRounds({
    inputRounds: payload.rounds,
    participants,
    blockedPairs,
    eventStartMillis: event.startTime.toMillis(),
    eventEndMillis: event.endTime.toMillis(),
    rotationIntervalMinutes,
    concurrentUnits: topology.topology === "sequence" ?
      resolveSequenceConcurrentUnits(
        plan,
        participants.length,
        layout?.units.length ?? null
      ) :
      null,
    resourceUnitIds: sequenceResourceUnitIds({
      topology,
      layout,
      participantCount: participants.length,
    }),
  });
  const assignments = buildAssignments({
    eventId: payload.eventId,
    organizerId: event.organizerId,
    participants,
    rounds,
    eventStartMillis: event.startTime.toMillis(),
    rotationIntervalMinutes,
    resourceLabelId: topology.resourceCapacity?.resourceLabelId,
    source: "host_override_v1",
    now: deps.serverTimestamp(),
  });
  const publishedRoundIndex = integerOr(
    plan.publishedRotationRoundIndex,
    -1
  );
  const targetRoundIndex = publishedRoundIndex + 1;
  if (!rounds.some((round) => round.roundIndex === targetRoundIndex)) {
    throw new HttpsError("failed-precondition",
      "The override must include the next unpublished round.");
  }
  applyEventSuccessSpatialLayout(
    assignments,
    layout,
    plan,
    targetRoundIndex
  );
  await writeAssignmentDrafts({
    db,
    eventId: payload.eventId,
    expectedRevision: payload.expectedRevision,
    expectedPublishedRoundIndex: publishedRoundIndex,
    targetRoundIndex,
    assignments,
    now: deps.serverTimestamp(),
  });

  return {
    assignmentCount: assignments.size,
    roundCount: rounds.length,
  };
}

export const overrideEventSuccessRotations = onCall(
  appCheckCallableOptions,
  (request) => overrideEventSuccessRotationsHandler(request)
);

/**
 * Loads and authorizes the event-success guided rotation context.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {string} eventId Event id.
 * @param {string} uid Requesting user id.
 * @return {Promise<object>} Authorized event context.
 */
async function loadRotationEventContext(
  db: FirebaseFirestore.Firestore,
  eventId: string,
  uid?: string
): Promise<{
  event: ScheduledEventDocument;
  plan: EventSuccessPlanDocument;
  rotationIntervalMinutes: number;
  questionnaireMode: QuestionnaireScoringMode;
  constraints: AssignmentConstraintConfig;
  rotationPolicy: AssignmentRotationPolicy;
}> {
  const eventRef = db.collection("events").doc(eventId);
  const planRef = db.collection("eventSuccessPlans").doc(eventId);
  const [eventSnap, planSnap] = await Promise.all([
    eventRef.get(),
    planRef.get(),
  ]);

  if (!eventSnap.exists) {
    throw new HttpsError("not-found", "Event not found.");
  }
  if (!planSnap.exists) {
    throw new HttpsError("failed-precondition",
      "Event-success setup has not been saved.");
  }

  const event = requireScheduledEvent(requireDoc<EventDocument>(

    eventSnap,

    "EventDocument"

  ));
  if (event.status === "cancelled") {
    throw new HttpsError("failed-precondition",
      "This event has been cancelled.");
  }

  if (uid !== undefined) {
    const organizerSnap = await eventOrganizerRef(db, event).get();
    const organizer = requireEventOrganizer(organizerSnap, event);
    if (!isEventOrganizerManager(organizer, event, uid)) {
      throw new HttpsError("permission-denied",
        "Only an organizer manager can manage event rotations.");
    }
  }

  const plan = requireDoc<EventSuccessPlanDocument>(
    planSnap,
    "EventSuccessPlanDocument"
  );
  if (plan.eventId !== undefined && plan.eventId !== eventId) {
    throw new HttpsError("failed-precondition",
      "Event-success plan does not match this event.");
  }
  if (plan.organizerId !== undefined && plan.organizerId !== event.organizerId) {
    throw new HttpsError("failed-precondition",
      "Event-success plan does not match this club.");
  }
  if (!moduleSelected(plan.selectedModuleIds, GUIDED_ROTATIONS_MODULE_ID)) {
    throw new HttpsError("failed-precondition",
      "Guided rotations are not enabled for this event.");
  }
  assertPairRotationTopology(plan);

  return {
    event,
    plan,
    rotationIntervalMinutes:
      resolveRotationIntervalMinutes(plan) ?? ROUND_LENGTH_MINUTES,
    questionnaireMode:
      moduleSelected(
        plan.selectedModuleIds,
        COMPATIBILITY_QUESTIONNAIRE_MODULE_ID
      ) && plan.compatibilityAffectsRanking === true ?
        "light" :
        "icebreaker",
    constraints: assignmentConstraintsForSpatialPlan(
      assignmentConstraintsForStructureConfig(plan.structureConfig),
      plan
    ),
    rotationPolicy: rotationPolicyForStructureConfig(plan.structureConfig),
  };
}

/**
 * Loads eligible, opt-in participants and current safety block edges.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {string} eventId Event id.
 * @param {boolean} compatibilityAffectsRanking Whether answers can rank pairs.
 * @return {Promise<object>} Eligible participants and blocked pair keys.
 */
async function loadEligibleRotationParticipants(
  db: FirebaseFirestore.Firestore,
  eventId: string,
  compatibilityAffectsRanking: boolean,
  nowMillis: number,
  presencePolicy: ReturnType<typeof eventSuccessPresencePolicy>,
  maxEntries?: number
): Promise<{
  participants: RotationParticipant[];
  blockedPairs: Set<string>;
}> {
  const [roster, optedOutUids] = await Promise.all([
    loadEventSuccessRoster(db, eventId, maxEntries),
    fetchGuidedRotationOptOutUids(db, eventId),
  ]);
  const activeEdges = roster
    .filter((participant) => !optedOutUids.has(participant.uid));
  const preferredEdges = preferCheckedInParticipants(activeEdges);
  const likelyDepartedUids = await loadLikelyDepartedEventSuccessUids({
    db,
    eventId,
    eligibleUids: new Set(preferredEdges.map((participant) => participant.uid)),
    nowMillis,
    policy: presencePolicy,
  });
  const eligibleEdges = preferredEdges.filter(
    (participant) => !likelyDepartedUids.has(participant.uid)
  );
  let participants = eligibleEdges.map((participant): RotationParticipant => ({
    uid: participant.uid,
    status: participant.status,
    gender: participant.gender,
    interestedInGenders: participant.interestedInGenders,
    arrivalGroup: participant.arrivalGroup,
    compatibilityAnswerIds: [],
    activityAttributes: participant.activityAttributes,
  }));
  if (compatibilityAffectsRanking) {
    const answerIdsByUid = await fetchCompatibilityAnswerIdsByUid(db, eventId);
    participants = participants.map((participant) => ({
      ...participant,
      compatibilityAnswerIds: answerIdsByUid.get(participant.uid) ?? [],
    }));
  }
  const blockedPairs = await fetchBlockedPairs(db, participants);
  return {participants, blockedPairs};
}

/**
 * Checks whether the saved event-success plan includes a module.
 * @param {unknown} selectedModuleIds Persisted selected module ids.
 * @param {string} moduleId Module id to check.
 * @return {boolean} True when selected.
 */
function moduleSelected(selectedModuleIds: unknown, moduleId: string): boolean {
  return Array.isArray(selectedModuleIds) &&
    selectedModuleIds.includes(moduleId);
}

/**
 * Uses checked-in attendees when at least two are present.
 * @param {Array<object>} edges Active participation edges.
 * @return {Array<object>} Rotation input.
 */
function preferCheckedInParticipants<
  T extends {uid: string; status: ActiveStatus}
>(edges: T[]): T[] {
  const attended = edges.filter((edge) => edge.status === "attended");
  return attended.length >= 2 ? attended : edges;
}

/**
 * Loads attendee guided-rotation opt-outs for the event.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {string} eventId Event id.
 * @return {Promise<Set<string>>} Uids excluded from rotations.
 */
async function fetchGuidedRotationOptOutUids(
  db: FirebaseFirestore.Firestore,
  eventId: string
): Promise<Set<string>> {
  const snap = await db
    .collection("eventSuccessPreferences")
    .where("eventId", "==", eventId)
    .get();
  const optedOut = new Set<string>();
  for (const doc of snap.docs) {
    const preference = doc.data() as EventSuccessPreferenceDocument;
    if (
      preference.guidedRotationsOptedOut === true &&
      typeof preference.uid === "string" &&
      preference.uid.length > 0
    ) {
      optedOut.add(preference.uid);
    }
  }
  return optedOut;
}

/**
 * Loads attendee questionnaire answers for optional ranking boosts.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {string} eventId Event id.
 * @return {Promise<Map<string, string[]>>} Answer ids keyed by uid.
 */
async function fetchCompatibilityAnswerIdsByUid(
  db: FirebaseFirestore.Firestore,
  eventId: string
): Promise<Map<string, string[]>> {
  const snap = await db
    .collection("eventSuccessCompatibilityResponses")
    .where("eventId", "==", eventId)
    .get();
  const answerIdsByUid = new Map<string, string[]>();
  for (const doc of snap.docs) {
    const response = doc.data() as EventSuccessCompatibilityResponseDocument;
    if (
      typeof response.uid !== "string" ||
      response.uid.length === 0 ||
      !Array.isArray(response.answerIds)
    ) {
      continue;
    }
    answerIdsByUid.set(
      response.uid,
      response.answerIds.filter((answerId) => typeof answerId === "string")
    );
  }
  return answerIdsByUid;
}

/**
 * Loads block edges among the rotation participants in either direction.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {RotationParticipant[]} participants Rotation participants.
 * @return {Promise<Set<string>>} Undirected blocked pair keys.
 */
async function fetchBlockedPairs(
  db: FirebaseFirestore.Firestore,
  participants: RotationParticipant[]
): Promise<Set<string>> {
  const participantUids = [...new Set(
    participants.map((participant) => participant.uid)
  )];
  if (participantUids.length < 2) return new Set();

  const participantSet = new Set(participantUids);
  const chunks = chunk(participantUids, MAX_IN_FILTER_VALUES);
  const snaps = await Promise.all(
    chunks.map((uids) =>
      db
        .collection("blocks")
        .where("blockerUserId", "in", uids)
        .get()
    )
  );

  const pairs = new Set<string>();
  for (const snap of snaps) {
    for (const doc of snap.docs) {
      const block = doc.data() as Partial<BlockDocument>;
      if (
        typeof block.blockerUserId !== "string" ||
        typeof block.blockedUserId !== "string" ||
        !participantSet.has(block.blockerUserId) ||
        !participantSet.has(block.blockedUserId)
      ) {
        continue;
      }
      pairs.add(pairKey(block.blockerUserId, block.blockedUserId));
    }
  }
  return pairs;
}

/** Returns stable physical resource ids in traversal order. */
function sequenceResourceUnitIds(params: {
  topology: AssignmentTopology;
  layout: OrganizerEventSuccessLayoutDocument | null;
  participantCount: number;
}): string[] {
  if (params.topology.topology !== "sequence") return [];
  const concurrentUnits = resolveSequenceConcurrentUnits({
    structureConfig: {
      resourceCapacity: params.topology.resourceCapacity,
    },
  }, params.participantCount, params.layout?.units.length ?? null);
  if (params.layout !== null) {
    return [...params.layout.units]
      .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
      .slice(0, concurrentUnits)
      .map((unit) => unit.id);
  }
  const prefix = params.topology.resourceCapacity?.resourceLabelId ??
    "resource";
  return Array.from(
    {length: concurrentUnits},
    (_, index) => `${prefix}-${index + 1}`
  );
}

/** Scores explainability metadata without changing round-robin ordering. */
function sequencePairCompatibility(params: {
  a: RotationParticipant;
  b: RotationParticipant;
  questionnaireMode: QuestionnaireScoringMode;
  compatibilityPolicy: EventSuccessCompatibilityPolicy;
  matchingObjective: EventSuccessMatchingObjective;
}): Pick<RotationPair, "score" | "compatibility"> {
  if (params.compatibilityPolicy === "mutualInterestOnly") {
    const result = scoreDatingCompatibilityPair(params.a, params.b, {
      questionnaireMode: "off",
      allowOrientationFallback: true,
    });
    return {score: result.score, compatibility: result.compatibility};
  }
  if (
    params.compatibilityPolicy === "questionnaireClueOnly" &&
    (params.questionnaireMode === "light" ||
      params.questionnaireMode === "strong") &&
    (params.matchingObjective === "affinity" ||
      params.matchingObjective === "novelty")
  ) {
    const result = scoreQuestionnaireObjectivePair(
      params.a,
      params.b,
      params.matchingObjective
    );
    return {score: result.score, compatibility: result.compatibility};
  }
  return {score: 0, compatibility: "social"};
}

/**
 * Builds scored, non-repeating rotation rounds.
 * @param {object} params Rotation inputs.
 * @param {Array<object>} params.participants Participants.
 * @param {object} params.blockedPairs Blocked pair keys.
 * @param {number} params.eventStartMillis Event start time in millis.
 * @param {number} params.eventEndMillis Event end time in millis.
 * @param {number} params.rotationIntervalMinutes Round length in minutes.
 * @param {QuestionnaireScoringMode} params.questionnaireMode Answer weighting.
 * @param {EventSuccessAssignmentAlgorithm} params.assignmentAlgorithm Format.
 * @param {EventSuccessCompatibilityPolicy} params.compatibilityPolicy Scoring.
 * @return {RotationRound[]} Pairings by round.
 */
function buildRotationRounds(params: {
  participants: RotationParticipant[];
  blockedPairs: Set<string>;
  eventStartMillis: number;
  eventEndMillis: number;
  rotationIntervalMinutes: number;
  questionnaireMode: QuestionnaireScoringMode;
  assignmentAlgorithm: EventSuccessAssignmentAlgorithm;
  compatibilityPolicy: EventSuccessCompatibilityPolicy;
  matchingObjective: EventSuccessMatchingObjective;
  constraints?: AssignmentConstraintConfig;
  rotationPolicy?: AssignmentRotationPolicy;
  topology: AssignmentTopology;
  layout: OrganizerEventSuccessLayoutDocument | null;
  softFeatures?: {eventId: string; organizerId: string;
    rules: AssignmentFeatureRule[];
    snapshots: EventAssignmentFeatureSnapshot[]};
}): RotationRound[] {
  if (params.participants.length < 2) return [];
  const requestedRounds = rotationRoundCountForDuration({
    eventStartMillis: params.eventStartMillis,
    eventEndMillis: params.eventEndMillis,
    rotationIntervalMinutes: params.rotationIntervalMinutes,
  });
  if (params.topology.topology === "sequence") {
    const constraints = normalizeAssignmentConstraints(
      params.constraints,
      params.rotationIntervalMinutes
    );
    const resourceUnitIds = sequenceResourceUnitIds({
      topology: params.topology,
      layout: params.layout,
      participantCount: params.participants.length,
    });
    const blockedPairKeys = new Set([
      ...params.blockedPairs,
      ...constraints.keepApartPairs,
    ]);
    const priorityPairKeys = new Set([
      ...constraints.keepTogetherPairs,
      ...constraints.requestedRepeatPairs,
    ]);
    const schedule = buildEventSuccessSequenceSchedule({
      participants: params.participants,
      roundLimit: requestedRounds,
      concurrentUnits: resourceUnitIds.length,
      resourceUnitIds,
      unitProximity: params.layout === null ?
        [] :
        deriveEventSuccessUnitProximity(params.layout.units),
      blockedPairKeys,
      priorityPairKeys,
      exclusionMinutesByUid: constraints.exclusionMinutesByUid,
      exclusionIntervalMinutes: constraints.exclusionIntervalMinutes,
      maxPairMeetings: params.rotationPolicy?.repeatStrategy ===
        "allowWhenExhausted" ?
        params.rotationPolicy.maxPairMeetings :
        1,
    });
    return schedule.rounds.map((round) => ({
      roundIndex: round.roundIndex,
      pairs: round.matches.map((match) => ({
        a: match.a,
        b: match.b,
        ...sequencePairCompatibility({
          a: match.a,
          b: match.b,
          questionnaireMode: params.questionnaireMode,
          compatibilityPolicy: params.compatibilityPolicy,
          matchingObjective: params.matchingObjective,
        }),
        unitIndex: match.unitIndex,
        resourceUnitId: match.resourceUnitId,
        movementCost: match.movementCost,
        meetingIndex: match.meetingIndex,
      })),
    }));
  }
  const maxRounds = params.participants.length % 2 === 0 ?
    params.participants.length - 1 :
    params.participants.length;
  const roundCount = params.rotationPolicy?.repeatStrategy ===
    "allowWhenExhausted" ?
    requestedRounds :
    Math.min(requestedRounds, maxRounds);
  return runAssignmentEngine({
    participants: params.participants,
    blockedPairs: params.blockedPairs,
    topology: {
      ...params.topology,
      topology: params.topology.topology ?? "set",
    },
    assignmentAlgorithm: params.assignmentAlgorithm,
    compatibilityPolicy: params.compatibilityPolicy,
    matchingObjective: params.matchingObjective,
    questionnaireMode: params.questionnaireMode,
    rotationRoundCount: roundCount,
    allowOrientationFallback: true,
    constraints: params.constraints,
    rotationPolicy: params.rotationPolicy,
    softFeatures: params.softFeatures,
  }).rotationRounds.map((round) => ({
    roundIndex: round.roundIndex,
    pairs: round.pairs.map(toRotationPair),
  }));
}

/**
 * Builds host-authored rotation rounds after safety and eligibility checks.
 * @param {object} params Override inputs.
 * @param {Array<object>} params.inputRounds Host-authored rounds.
 * @param {RotationParticipant[]} params.participants Eligible participants.
 * @param {Set<string>} params.blockedPairs Blocked pair keys.
 * @param {number} params.eventStartMillis Event start time in millis.
 * @param {number} params.eventEndMillis Event end time in millis.
 * @param {number} params.rotationIntervalMinutes Round length in minutes.
 * @return {RotationRound[]} Validated host-authored rounds.
 */
function buildOverrideRounds(params: {
  inputRounds: OverrideEventSuccessRotationsCallablePayload["rounds"];
  participants: RotationParticipant[];
  blockedPairs: Set<string>;
  eventStartMillis: number;
  eventEndMillis: number;
  rotationIntervalMinutes: number;
  concurrentUnits: number | null;
  resourceUnitIds: string[];
}): RotationRound[] {
  const maxRoundCount = rotationRoundCountForDuration({
    eventStartMillis: params.eventStartMillis,
    eventEndMillis: params.eventEndMillis,
    rotationIntervalMinutes: params.rotationIntervalMinutes,
  });
  const participantsByUid = new Map(
    params.participants.map((participant) => [participant.uid, participant])
  );
  const seenRoundIndexes = new Set<number>();
  const rounds: RotationRound[] = [];

  for (const inputRound of params.inputRounds) {
    if (seenRoundIndexes.has(inputRound.roundIndex)) {
      throw new HttpsError("invalid-argument",
        "Each rotation round can be overridden only once.");
    }
    seenRoundIndexes.add(inputRound.roundIndex);
    if (inputRound.roundIndex >= maxRoundCount) {
      throw new HttpsError("invalid-argument",
        "Rotation round is outside the event duration.");
    }

    const usedInRound = new Set<string>();
    const pairs: RotationPair[] = [];
    for (const pairing of inputRound.pairings) {
      if (pairing.uidA === pairing.uidB) {
        throw new HttpsError("invalid-argument",
          "A participant cannot be paired with themselves.");
      }
      const participantA = participantsByUid.get(pairing.uidA);
      const participantB = participantsByUid.get(pairing.uidB);
      if (participantA === undefined || participantB === undefined) {
        throw new HttpsError("failed-precondition",
          "One or more attendees are no longer eligible for rotations.");
      }
      if (usedInRound.has(pairing.uidA) || usedInRound.has(pairing.uidB)) {
        throw new HttpsError("invalid-argument",
          "A participant can have only one partner per round.");
      }
      if (params.blockedPairs.has(pairKey(pairing.uidA, pairing.uidB))) {
        throw new HttpsError("failed-precondition",
          "Blocked attendees cannot be paired.");
      }
      usedInRound.add(pairing.uidA);
      usedInRound.add(pairing.uidB);
      const unitIndex = pairs.length;
      pairs.push({
        a: participantA,
        b: participantB,
        score: 0,
        compatibility: "host_override",
        ...(params.concurrentUnits === null ? {} : {
          unitIndex,
          resourceUnitId: params.resourceUnitIds[unitIndex],
        }),
      });
    }
    if (
      params.concurrentUnits !== null &&
      pairs.length > params.concurrentUnits
    ) {
      throw new HttpsError(
        "failed-precondition",
        "This round exceeds the configured simultaneous resource capacity."
      );
    }
    if (pairs.length > 0) {
      rounds.push({roundIndex: inputRound.roundIndex, pairs});
    }
  }

  if (rounds.length === 0) {
    throw new HttpsError("invalid-argument",
      "Add at least one rotation pair.");
  }

  return rounds.sort((a, b) => a.roundIndex - b.roundIndex);
}

/**
 * Converts optimizer pair metadata into persisted rotation pair shape.
 * @param {OptimizedPair<RotationParticipant>} pair Optimizer pair.
 * @return {RotationPair} Scored pair.
 */
function toRotationPair(
  pair: OptimizedPair<RotationParticipant>
): RotationPair {
  return {
    a: pair.a,
    b: pair.b,
    score: pair.score,
    compatibility: pair.compatibility,
  };
}

/**
 * Builds assignment documents from rotation rounds.
 * @param {object} params Assignment inputs.
 * @param {string} params.eventId Event id.
 * @param {string} params.organizerId Club id.
 * @param {Array<object>} params.participants Participants.
 * @param {Array<object>} params.rounds Rotation rounds.
 * @param {number} params.eventStartMillis Event start time in millis.
 * @param {number} params.rotationIntervalMinutes Round length in minutes.
 * @param {string} params.source Assignment source.
 * @param {FirebaseFirestore.FieldValue} params.now Server timestamp.
 * @return {Map<string, GeneratedAssignment>} Assignment docs by id.
 */
function buildAssignments(params: {
  eventId: string;
  organizerId: string;
  participants: RotationParticipant[];
  rounds: RotationRound[];
  eventStartMillis: number;
  rotationIntervalMinutes: number;
  resourceLabelId?: EventSuccessResourceLabelId;
  source: string;
  now: FirebaseFirestore.FieldValue;
}): Map<string, GeneratedAssignment> {
  const slotsByUid = new Map<string, GeneratedRotationSlot[]>(
    params.participants.map((participant) => [participant.uid, []])
  );
  const sitOutSlotsByUid = new Map<string, GeneratedSitOutSlot[]>(
    params.participants.map((participant) => [participant.uid, []])
  );
  const seenPeersByUid = new Map<string, Set<string>>(
    params.participants.map((participant) => [participant.uid, new Set()])
  );
  params.rounds.forEach((round) => {
    const startsAt = admin.firestore.Timestamp.fromMillis(
      params.eventStartMillis +
        round.roundIndex * params.rotationIntervalMinutes * 60000
    );
    const endsAt = admin.firestore.Timestamp.fromMillis(
      startsAt.toMillis() + params.rotationIntervalMinutes * 60000
    );
    const usedUids = new Set<string>();
    for (const [pairIndex, pair] of round.pairs.entries()) {
      const unitIndex = pair.unitIndex ?? pairIndex;
      const label = rotationSlotLabel(
        round.roundIndex,
        params.resourceLabelId,
        unitIndex
      );
      const repeatedForA =
        seenPeersByUid.get(pair.a.uid)?.has(pair.b.uid) === true;
      const repeatedForB =
        seenPeersByUid.get(pair.b.uid)?.has(pair.a.uid) === true;
      const slotA: GeneratedRotationSlot = {
        slotId: `round-${round.roundIndex}-pair-${unitIndex}`,
        roundIndex: round.roundIndex,
        label,
        startsAt,
        endsAt,
        peerUid: pair.b.uid,
        unitKind: "pairs" as const,
        unitIndex,
        peerCount: 1,
        ...(pair.resourceUnitId === undefined ? {} : {
          resourceUnitId: pair.resourceUnitId,
        }),
        compatibility: pair.compatibility,
        whySummary: rotationWhySummary({
          compatibility: pair.compatibility,
          peerLabel: "partner",
          source: params.source,
          repeatedPeer: repeatedForA,
        }),
        whyCodes: rotationWhyCodes({
          compatibility: pair.compatibility,
          source: params.source,
          repeatedPeer: repeatedForA,
        }),
      };
      const slotB: GeneratedRotationSlot = {
        slotId: `round-${round.roundIndex}-pair-${unitIndex}`,
        roundIndex: round.roundIndex,
        label,
        startsAt,
        endsAt,
        peerUid: pair.a.uid,
        unitKind: "pairs" as const,
        unitIndex,
        peerCount: 1,
        ...(pair.resourceUnitId === undefined ? {} : {
          resourceUnitId: pair.resourceUnitId,
        }),
        compatibility: pair.compatibility,
        whySummary: rotationWhySummary({
          compatibility: pair.compatibility,
          peerLabel: "partner",
          source: params.source,
          repeatedPeer: repeatedForB,
        }),
        whyCodes: rotationWhyCodes({
          compatibility: pair.compatibility,
          source: params.source,
          repeatedPeer: repeatedForB,
        }),
      };
      slotsByUid.get(pair.a.uid)?.push(slotA);
      slotsByUid.get(pair.b.uid)?.push(slotB);
      seenPeersByUid.get(pair.a.uid)?.add(pair.b.uid);
      seenPeersByUid.get(pair.b.uid)?.add(pair.a.uid);
      usedUids.add(pair.a.uid);
      usedUids.add(pair.b.uid);
    }
    for (const participant of params.participants) {
      if (usedUids.has(participant.uid)) continue;
      sitOutSlotsByUid.get(participant.uid)?.push({
        roundIndex: round.roundIndex,
        label: `Round ${round.roundIndex + 1}`,
        startsAt,
        endsAt,
        whySummary: "Planned break to keep rotation counts fair.",
        whyCodes: ["sit_out"],
      });
    }
  });

  const assignments = new Map<string, GeneratedAssignment>();
  for (const [uid, slots] of slotsByUid.entries()) {
    const sitOutSlots = sitOutSlotsByUid.get(uid) ?? [];
    if (slots.length === 0 && sitOutSlots.length === 0) continue;
    const peerUids = [...new Set(slots.map((slot) => slot.peerUid))].sort();
    const fairness = rotationFairnessSummary(slots, sitOutSlots);
    const breakLabel = sitOutSlots.length === 0 ?
      "" :
      ` · ${sitOutSlots.length} ` +
        `break${sitOutSlots.length === 1 ? "" : "s"}`;
    const docId = assignmentId(params.eventId, uid);
    assignments.set(docId, {
      eventId: params.eventId,
      organizerId: params.organizerId,
      uid,
      moduleId: GUIDED_ROTATIONS_MODULE_ID,
      label: "Guided rotations",
      displayTitle: `${slots.length} guided rotations`,
      displaySubtitle: `${params.rotationIntervalMinutes} min each · ` +
        `${peerUids.length} ${peerUids.length === 1 ? "person" : "people"}` +
        breakLabel,
      peerUids,
      unitKind: "pairs",
      unitLabel: "Guided rotations",
      whySummary: `${slots.length} partner rounds with ` +
        `${peerUids.length} unique ${peerUids.length === 1 ?
          "person" :
          "people"}.`,
      whyCodes: uniqueWhyCodes([
        ...slots.flatMap((slot) => slot.whyCodes ?? []),
        ...sitOutSlots.flatMap((slot) => slot.whyCodes),
      ]),
      rotationFairness: fairness,
      rotationSlots: slots,
      ...(sitOutSlots.length > 0 ? {sitOutSlots} : {}),
      source: params.source,
      createdAt: params.now,
      updatedAt: params.now,
    });
  }
  return assignments;
}

function rotationSlotLabel(
  roundIndex: number,
  resourceLabelId: EventSuccessResourceLabelId | undefined,
  unitIndex: number
): string {
  const round = `Round ${roundIndex + 1}`;
  if (resourceLabelId === undefined) return round;
  const resource = resourceLabelId.charAt(0).toUpperCase() +
    resourceLabelId.slice(1);
  return `${round} · ${resource} ${unitIndex + 1}`;
}

/**
 * Builds a short reason summary for a rotation slot.
 * @param {object} params Slot metadata inputs.
 * @return {string} Human-readable slot reason.
 */
function rotationWhySummary(params: {
  compatibility: RotationPair["compatibility"];
  peerLabel: string;
  source: string;
  repeatedPeer: boolean;
}): string {
  if (params.source === "host_override_v1") {
    return `Host override selected this ${params.peerLabel}.`;
  }
  const freshness = params.repeatedPeer ? "repeat" : "new";
  switch (params.compatibility) {
  case "mutual_interest":
    return `Matched with a ${freshness} ${params.peerLabel}.`;
  case "questionnaire_match":
    return `Matched with a ${freshness} ${params.peerLabel} by answers.`;
  case "one_way_interest":
    return `Fallback ${params.peerLabel} with one-way interest.`;
  case "social":
  default:
    return `Social fallback with a ${freshness} ${params.peerLabel}.`;
  }
}

/**
 * Builds machine-safe reason codes for a rotation slot.
 * @param {object} params Slot metadata inputs.
 * @return {AssignmentWhyCode[]} Stable reason codes.
 */
function rotationWhyCodes(params: {
  compatibility: RotationPair["compatibility"];
  source: string;
  repeatedPeer: boolean;
}): AssignmentWhyCode[] {
  const codes: AssignmentWhyCode[] = [
    "pair_slot",
    params.repeatedPeer ? "repeat_peer" : "fresh_peer",
  ];
  if (params.source === "host_override_v1") {
    codes.push("host_override");
  } else {
    switch (params.compatibility) {
    case "mutual_interest":
      codes.push("mutual_interest");
      break;
    case "questionnaire_match":
      codes.push("questionnaire_match");
      break;
    case "one_way_interest":
      codes.push("one_way_interest");
      break;
    case "social":
    default:
      codes.push("social_fallback");
      break;
    }
  }
  return uniqueWhyCodes(codes);
}

/**
 * Builds fairness metadata from rotation slots and sit-outs.
 * @param {GeneratedRotationSlot[]} slots Assigned rotation slots.
 * @param {GeneratedSitOutSlot[]} sitOutSlots Sit-out slots.
 * @return {RotationFairnessSummary} Fairness counts.
 */
function rotationFairnessSummary(
  slots: GeneratedRotationSlot[],
  sitOutSlots: GeneratedSitOutSlot[]
): RotationFairnessSummary {
  const peerCounts = new Map<string, number>();
  for (const slot of slots) {
    peerCounts.set(slot.peerUid, (peerCounts.get(slot.peerUid) ?? 0) + 1);
  }
  return {
    assignedRoundCount: slots.length,
    sitOutRoundCount: sitOutSlots.length,
    uniquePeerCount: peerCounts.size,
    repeatPeerCount: [...peerCounts.values()].reduce(
      (sum, count) => sum + Math.max(0, count - 1),
      0
    ),
  };
}

/**
 * Deduplicates reason codes while preserving first-seen order.
 * @param {AssignmentWhyCode[]} codes Raw reason codes.
 * @return {AssignmentWhyCode[]} Unique codes.
 */
function uniqueWhyCodes(codes: AssignmentWhyCode[]): AssignmentWhyCode[] {
  return [...new Set(codes)];
}

/**
 * Replaces stale guided rotation assignment docs for this event.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {string} eventId Event id.
 * @param {Map<string, GeneratedAssignment>} assignments New assignments.
 */
async function writeAssignmentDrafts(params: {
  db: FirebaseFirestore.Firestore;
  eventId: string;
  expectedRevision: number;
  expectedPublishedRoundIndex: number;
  targetRoundIndex: number;
  assignments: Map<string, GeneratedAssignment>;
  now: FirebaseFirestore.FieldValue;
  featureGuard?: {organizerId: string; rules: AssignmentFeatureRule[];
    snapshots: EventAssignmentFeatureSnapshot[];
    revision: number; configHash: string};
}): Promise<{revision: number; assignmentRevision: number}> {
  const planRef = params.db.collection("eventSuccessPlans").doc(params.eventId);
  const draftQuery = params.db.collection("eventSuccessAssignmentDrafts")
    .where("eventId", "==", params.eventId)
    .where("moduleId", "==", GUIDED_ROTATIONS_MODULE_ID);
  if (params.featureGuard &&
      (params.assignments.size > 400 ||
        !params.featureGuard.configHash)) {
    throw new HttpsError("failed-precondition",
      "Structured matching exceeds the supported draft size.");
  }
  return params.db.runTransaction(async (transaction) => {
    const [planSnap, existingSnap] = await Promise.all([
      transaction.get(planRef),
      transaction.get(params.featureGuard ? draftQuery.limit(401) :
        draftQuery),
    ]);
    const staleDrafts = existingSnap.docs.filter((doc) =>
      !params.assignments.has(doc.id));
    if (params.featureGuard &&
        (existingSnap.size > 400 ||
          staleDrafts.length + params.assignments.size > 400)) {
      throw new HttpsError("failed-precondition",
        "Structured matching exceeds the supported draft size.");
    }
    if (!planSnap.exists) {
      throw new HttpsError("failed-precondition",
        "Event-success setup has not been saved.");
    }
    const plan = planSnap.data() as EventSuccessPlanDocument;
    if (params.featureGuard) {
      if (!params.featureGuard.configHash ||
          plan.assignmentFeatureRevision !==
            params.featureGuard.revision ||
          plan.assignmentFeatureConfigHash !==
            params.featureGuard.configHash) {
        throw new HttpsError("aborted", "Assignment feature setup changed.");
      }
      await recheckAssignmentFeatureSnapshots({tx: transaction,
        db: params.db, eventId: params.eventId,
        organizerId: params.featureGuard.organizerId,
        rules: params.featureGuard.rules,
        snapshots: params.featureGuard.snapshots});
    }
    const currentRevision = nonNegativeInteger(plan.liveControlRevision);
    const publishedRoundIndex = integerOr(
      plan.publishedRotationRoundIndex,
      -1
    );
    if (
      currentRevision !== params.expectedRevision ||
      publishedRoundIndex !== params.expectedPublishedRoundIndex
    ) {
      throw staleLiveControlError();
    }
    const revision = nextLiveControlRevision(currentRevision);
    const assignmentRevision = nextLiveControlRevision(
      nonNegativeInteger(plan.assignmentDraftRevision)
    );
    for (const doc of params.featureGuard ? staleDrafts : existingSnap.docs) {
      transaction.delete(doc.ref);
    }
    for (const [docId, assignment] of params.assignments.entries()) {
      transaction.set(
        params.db.collection("eventSuccessAssignmentDrafts").doc(docId),
        {
          eventId: params.eventId,
          organizerId: assignment.organizerId,
          uid: assignment.uid,
          moduleId: GUIDED_ROTATIONS_MODULE_ID,
          roundIndex: params.targetRoundIndex,
          baseAssignmentRevision: assignmentRevision,
          assignment,
          ...(params.featureGuard ? {assignmentFeatureGuard: {
            revision: params.featureGuard.revision,
            configHash: params.featureGuard.configHash,
            snapshots: params.featureGuard.snapshots.filter((snapshot) =>
              snapshot.uid === assignment.uid),
          }} : {}),
          createdAt: params.now,
          updatedAt: params.now,
        }
      );
    }
    transaction.update(planRef, {
      ...persistentSpatialPlanFields(plan),
      liveControlRevision: revision,
      assignmentDraftRevision: assignmentRevision,
      updatedAt: params.now,
    });
    return {revision, assignmentRevision};
  });
}

/**
 * Returns the deterministic guided-rotation assignment document id.
 * @param {string} eventId Event id.
 * @param {string} uid User id.
 * @return {string} Assignment document id.
 */
function assignmentId(eventId: string, uid: string): string {
  return `${eventId}_${GUIDED_ROTATIONS_MODULE_ID}_${uid}`;
}

/**
 * Builds a deterministic undirected pair key.
 * @param {string} uidA First uid.
 * @param {string} uidB Second uid.
 * @return {string} Pair key.
 */
function pairKey(uidA: string, uidB: string): string {
  return assignmentPairKey(uidA, uidB);
}

/**
 * Splits an array into chunks for Firestore `in` query limits.
 * @template T
 * @param {Array<T>} values Values to chunk.
 * @param {number} size Chunk size.
 * @return {Array<Array<T>>} Chunks.
 */
function chunk<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function staleLiveControlError(): HttpsError {
  return new HttpsError("aborted",
    "The live event guide changed on another device. Refresh and retry.");
}

function nextLiveControlRevision(current: number): number {
  if (current >= 2147483647) {
    throw new HttpsError("resource-exhausted",
      "The live-control revision limit has been reached.");
  }
  return current + 1;
}

function nonNegativeInteger(value: unknown): number {
  return Number.isInteger(value) && (value as number) >= 0 ?
    value as number : 0;
}

function integerOr(value: unknown, fallback: number): number {
  return Number.isInteger(value) ? value as number : fallback;
}
