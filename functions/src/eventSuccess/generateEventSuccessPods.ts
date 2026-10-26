import {onCall, CallableRequest, HttpsError} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import type {
  BlockDocument,
  EventDocument,
} from "../shared/generated/firestoreAdminTypes";
import {requireAuth} from "../shared/auth";
import type {EventIdCallablePayload} from
  "../shared/generated/eventIdCallablePayload";
import type {OverrideEventSuccessGroupsCallablePayload} from
  "../shared/generated/overrideEventSuccessGroupsCallablePayload";
import {
  validateEventIdCallablePayload,
} from "../shared/generated/validators/eventIdInput";
import {
  validateOverrideEventSuccessGroupsCallablePayload,
} from
  "../shared/generated/validators/overrideEventSuccessGroupsInput";
import {validateCallableWithAjv, requireDoc} from "../shared/validation";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {normalizeEventIdPayload} from "../events/eventPayloadNormalization";
import {
  eventOrganizerRef,
  isEventOrganizerManager,
  requireEventOrganizer,
} from "../shared/eventOrganizers";
import {
  AssignmentParticipant,
  assignmentPairKey,
  AssignmentRotationPolicy,
  OptimizedGroup,
  OptimizedRotationRound,
  runAssignmentEngine,
} from "./assignmentOptimizer";
import {AssignmentConstraintConfig} from "./assignmentConstraints";
import {
  AssignmentTopology,
  EventSuccessUnitKind,
  resolveAssignmentTopology,
  rotationRoundCountForDuration,
  unitLabel,
  unitSingularLabel,
  unitSubtitle,
} from "./assignmentTopology";
import {
  EventSuccessAssignmentAlgorithm,
  EventSuccessCompatibilityPolicy,
  EventSuccessMatchingObjective,
  eventSuccessPrimitivesFor,
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
  applyEventSuccessSpatialLayout,
  assignmentConstraintsForSpatialPlan,
  loadSelectedEventSuccessLayout,
} from "./spatialLayout";

const MICRO_PODS_MODULE_ID = "micro_pods";
const DEFAULT_TARGET_UNIT_SIZE = 5;
const MAX_IN_FILTER_VALUES = 30;
type ActiveStatus = "attended" | "signedUp";

interface EventSuccessPodsDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

interface EventSuccessPlanDocument {
  eventId?: string;
  clubId?: string;
  selectedModuleIds?: unknown;
  assignmentFeatureRules?: AssignmentFeatureRule[];
  assignmentFeatureRevision?: number;
  assignmentFeatureConfigHash?: string;
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
  } & AssignmentPrimitiveStructureConfig;
}

interface EventSuccessPreferenceDocument {
  uid?: string;
  microPodsOptedOut?: boolean;
}

interface ActiveParticipant extends AssignmentParticipant {
  uid: string;
  status: ActiveStatus;
  gender?: string;
  interestedInGenders: string[];
}

type GroupCompatibilitySignal =
  "mutual_interest" |
  "one_way_interest" |
  "questionnaire_match" |
  "social" |
  "mixed" |
  "host_override";

type AssignmentWhyCode =
  "host_override" |
  "mutual_interest" |
  "questionnaire_match" |
  "social_fallback" |
  "balanced_group" |
  "fresh_peer" |
  "repeat_peer" |
  "pair_slot" |
  "pod_slot" |
  "table_slot" |
  "team_slot" |
  "whole_group_slot";

interface RotationFairnessSummary {
  assignedRoundCount: number;
  sitOutRoundCount: number;
  uniquePeerCount: number;
  repeatPeerCount: number;
}

interface GeneratedGroupRotationSlot {
  slotId?: string;
  roundIndex: number;
  label: string;
  unitLabel: string;
  unitKind?: EventSuccessUnitKind;
  unitIndex?: number;
  startsAt: FirebaseFirestore.Timestamp;
  endsAt: FirebaseFirestore.Timestamp;
  peerUids: string[];
  peerCount?: number;
  compatibility: GroupCompatibilitySignal;
  whySummary?: string;
  whyCodes?: AssignmentWhyCode[];
}

interface GeneratedAssignment {
  eventId: string;
  clubId: string;
  organizerId: string;
  uid: string;
  moduleId: string;
  label: string;
  displayTitle: string;
  displaySubtitle: string;
  peerUids: string[];
  unitKind?: EventSuccessUnitKind;
  unitIndex?: number;
  unitLabel?: string;
  layoutUnitId?: string;
  confirmedLayoutUnitId?: string | null;
  whySummary?: string;
  whyCodes?: AssignmentWhyCode[];
  rotationFairness?: RotationFairnessSummary;
  groupRotationSlots?: GeneratedGroupRotationSlot[];
  source: string;
  assignmentFeatureAudit?: AssignmentFeatureAudit;
  createdAt: FirebaseFirestore.FieldValue;
  updatedAt: FirebaseFirestore.FieldValue;
}

interface AssignmentGroup extends OptimizedGroup<ActiveParticipant> {
  label?: string;
}

interface AssignmentGroupRound {
  roundIndex: number;
  groups: AssignmentGroup[];
}

interface BuiltPods {
  groups: AssignmentGroup[];
  groupRounds: AssignmentGroupRound[];
  podCount: number;
}

interface EventTiming {
  startMillis: number;
  endMillis: number;
}

const defaultDeps: EventSuccessPodsDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  checkRateLimit: defaultCheckRateLimit,
};

/**
 * Generates deterministic V1 micro-pod assignment docs for a hosted event.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {EventSuccessPodsDeps} deps Injectable dependencies for tests.
 * @return {Promise<{assignmentCount: number, podCount: number}>} Summary.
 */
export async function generateEventSuccessPodsHandler(
  request: CallableRequest<unknown>,
  deps: EventSuccessPodsDeps = defaultDeps
): Promise<{assignmentCount: number; podCount: number}> {
  const uid = requireAuth(request);
  const {eventId} = validateCallableWithAjv<EventIdCallablePayload>(
    request,
    validateEventIdCallablePayload,
    normalizeEventIdPayload
  );

  const db = deps.firestore();
  await deps.checkRateLimit?.(db, uid, "generateEventSuccessPods", {
    maxRequests: 30, windowMs: 60 * 1000,
  });

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

  const event = requireDoc<EventDocument>(

    eventSnap,

    "EventDocument"

  );
  if (event.status === "cancelled") {
    throw new HttpsError("failed-precondition",
      "This event has been cancelled.");
  }

  const organizerSnap = await eventOrganizerRef(db, event).get();
  const organizer = requireEventOrganizer(organizerSnap, event);
  if (!isEventOrganizerManager(organizer, event, uid)) {
    throw new HttpsError("permission-denied",
      "Only an organizer manager can generate event pods.");
  }

  const plan = requireDoc<EventSuccessPlanDocument>(
    planSnap,
    "EventSuccessPlanDocument"
  );
  if (plan.eventId !== undefined && plan.eventId !== eventId) {
    throw new HttpsError("failed-precondition",
      "Event-success plan does not match this event.");
  }
  if (plan.clubId !== undefined && plan.clubId !== event.clubId) {
    throw new HttpsError("failed-precondition",
      "Event-success plan does not match this club.");
  }
  if (!moduleSelected(plan.selectedModuleIds, MICRO_PODS_MODULE_ID)) {
    throw new HttpsError("failed-precondition",
      "Micro-pods are not enabled for this event.");
  }

  const primitives = eventSuccessPrimitivesFor(event.eventFormat);
  if (primitives.assignmentResolution.status === "unsupported") {
    throw new HttpsError(
      "failed-precondition",
      primitives.assignmentResolution.reason
    );
  }

  const roster = await loadEventSuccessRoster(db, eventId,
    plan.assignmentFeatureRules?.length ? 1000 : undefined);
  const optedOutUids = await fetchMicroPodsOptOutUids(db, eventId);
  const participants = roster
    .map((participant): ActiveParticipant => ({
      uid: participant.uid,
      status: participant.status,
      gender: participant.gender,
      interestedInGenders: participant.interestedInGenders,
      arrivalGroup: participant.arrivalGroup,
      activityAttributes: participant.activityAttributes,
    }))
    .filter((participant) => !optedOutUids.has(participant.uid))
    .sort(compareParticipants);
  const eligibleParticipants = preferCheckedInParticipants(participants);

  const featureRules = plan.assignmentFeatureRules ?? [];
  const featureSnapshots = await loadAuthorizedAssignmentFeatures({db,
    eventId, organizerId: event.organizerId ?? event.clubId,
    eligibleUids: eligibleParticipants.map((person) => person.uid),
    rules: featureRules});

  const blockedPairs = await fetchBlockedPairs(db, eligibleParticipants);
  const constraints = assignmentConstraintsForSpatialPlan(
    assignmentConstraintsForStructureConfig(plan.structureConfig),
    plan
  );
  const rotationPolicy = rotationPolicyForStructureConfig(
    plan.structureConfig
  );
  const topology = resolveAssignmentTopology(
    plan,
    eligibleParticipants.length,
    {
      defaultUnitKind: "pods",
      defaultUnitSize: DEFAULT_TARGET_UNIT_SIZE,
    }
  );
  const timing = topology.rotationsEnabled ? eventTimingFor(event) : undefined;
  if (featureRules.length && topology.topology === "sequence") {
    throw new HttpsError("failed-precondition",
      "Structured matching is unavailable for sequence assignments.");
  }
  const builtPods = buildPods({
    participants: eligibleParticipants,
    blockedPairs,
    topology,
    assignmentAlgorithm: primitives.assignmentAlgorithm,
    compatibilityPolicy: primitives.compatibilityPolicy,
    matchingObjective: primitives.matchingObjective,
    constraints,
    rotationPolicy,
    timing,
    softFeatures: {eventId, organizerId: event.organizerId ?? event.clubId,
      rules: featureRules, snapshots: featureSnapshots},
  });
  const assignments = buildAssignments({
    eventId,
    clubId: event.clubId,

    organizerId: event.organizerId ?? event.clubId,
    unitKind: topology.unitKind,
    groups: builtPods.groups,
    groupRounds: builtPods.groupRounds,
    rotationIntervalMinutes: topology.rotationIntervalMinutes,
    eventStartMillis: timing?.startMillis,
    source: "server_v1",
    now: deps.serverTimestamp(),
  });
  const layout = await loadSelectedEventSuccessLayout(
    db,
    event.organizerId ?? event.clubId,
    plan
  );
  applyEventSuccessSpatialLayout(assignments, layout, plan, 0);
  if (featureRules.length) {
    const audit = buildAssignmentFeatureAudit({eventId,
      organizerId: event.organizerId ?? event.clubId,
      configHash: plan.assignmentFeatureConfigHash ?? "",
      snapshots: featureSnapshots});
    for (const assignment of assignments.values()) {
      assignment.assignmentFeatureAudit = audit;
    }
  }
  await writeAssignments(db, eventId, assignments, featureRules.length ? {
    organizerId: event.organizerId ?? event.clubId, rules: featureRules,
    snapshots: featureSnapshots,
    revision: plan.assignmentFeatureRevision ?? 0,
    configHash: plan.assignmentFeatureConfigHash ?? "",
  } : undefined);

  return {
    assignmentCount: assignments.size,
    podCount: builtPods.podCount,
  };
}

export const generateEventSuccessPods = onCall(
  appCheckCallableOptions,
  (request) => generateEventSuccessPodsHandler(request)
);

/**
 * Applies host-authored group, table, team, or pod assignments.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {EventSuccessPodsDeps} deps Injectable dependencies for tests.
 * @return {Promise<{assignmentCount: number, roundCount: number}>} Summary.
 */
export async function overrideEventSuccessGroupsHandler(
  request: CallableRequest<unknown>,
  deps: EventSuccessPodsDeps = defaultDeps
): Promise<{
  assignmentCount: number;
  roundCount: number;
  groupCount: number;
}> {
  const uid = requireAuth(request);
  const payload =
    validateCallableWithAjv<OverrideEventSuccessGroupsCallablePayload>(
      request,
      validateOverrideEventSuccessGroupsCallablePayload
    );

  const db = deps.firestore();
  await deps.checkRateLimit?.(db, uid, "overrideEventSuccessGroups", {
    maxRequests: 30, windowMs: 60 * 1000,
  });

  const {event, plan} = await loadGroupEventContext(db, payload.eventId, uid);
  const roster = await loadEventSuccessRoster(db, payload.eventId);
  const optedOutUids = await fetchMicroPodsOptOutUids(db, payload.eventId);
  const participants = roster
    .map((participant): ActiveParticipant => ({
      uid: participant.uid,
      status: participant.status,
      gender: participant.gender,
      interestedInGenders: participant.interestedInGenders,
      arrivalGroup: participant.arrivalGroup,
      activityAttributes: participant.activityAttributes,
    }))
    .filter((participant) => !optedOutUids.has(participant.uid))
    .sort(compareParticipants);
  const eligibleParticipants = preferCheckedInParticipants(participants);
  const blockedPairs = await fetchBlockedPairs(db, eligibleParticipants);
  const topology = resolveAssignmentTopology(
    plan,
    eligibleParticipants.length,
    {
      defaultUnitKind: "pods",
      defaultUnitSize: DEFAULT_TARGET_UNIT_SIZE,
    }
  );
  const timing = topology.rotationsEnabled ? eventTimingFor(event) : undefined;
  const rounds = buildOverrideGroupRounds({
    inputRounds: payload.rounds,
    participants: eligibleParticipants,
    blockedPairs,
    topology,
    timing,
  });
  const assignments = buildAssignments({
    eventId: payload.eventId,
    clubId: event.clubId,

    organizerId: event.organizerId ?? event.clubId,
    unitKind: topology.unitKind,
    groups: topology.rotationsEnabled ? [] : rounds[0].groups,
    groupRounds: topology.rotationsEnabled ? rounds : [],
    rotationIntervalMinutes: topology.rotationIntervalMinutes,
    eventStartMillis: timing?.startMillis,
    source: "host_override_v1",
    now: deps.serverTimestamp(),
  });
  await writeAssignments(db, payload.eventId, assignments);

  return {
    assignmentCount: assignments.size,
    roundCount: rounds.length,
    groupCount: rounds.reduce((count, round) => count + round.groups.length, 0),
  };
}

export const overrideEventSuccessGroups = onCall(
  appCheckCallableOptions,
  (request) => overrideEventSuccessGroupsHandler(request)
);

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
 * Loads and authorizes the group assignment context for a hosted event.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {string} eventId Event id.
 * @param {string} uid Requesting user id.
 * @return {Promise<object>} Authorized event and saved plan.
 */
async function loadGroupEventContext(
  db: FirebaseFirestore.Firestore,
  eventId: string,
  uid: string
): Promise<{event: EventDocument; plan: EventSuccessPlanDocument}> {
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

  const event = requireDoc<EventDocument>(

    eventSnap,

    "EventDocument"

  );
  if (event.status === "cancelled") {
    throw new HttpsError("failed-precondition",
      "This event has been cancelled.");
  }

  const organizerSnap = await eventOrganizerRef(db, event).get();
  const organizer = requireEventOrganizer(organizerSnap, event);
  if (!isEventOrganizerManager(organizer, event, uid)) {
    throw new HttpsError("permission-denied",
      "Only an organizer manager can manage event groups.");
  }

  const plan = requireDoc<EventSuccessPlanDocument>(
    planSnap,
    "EventSuccessPlanDocument"
  );
  if (plan.eventId !== undefined && plan.eventId !== eventId) {
    throw new HttpsError("failed-precondition",
      "Event-success plan does not match this event.");
  }
  if (plan.clubId !== undefined && plan.clubId !== event.clubId) {
    throw new HttpsError("failed-precondition",
      "Event-success plan does not match this club.");
  }
  if (!moduleSelected(plan.selectedModuleIds, MICRO_PODS_MODULE_ID)) {
    throw new HttpsError("failed-precondition",
      "Micro-pods are not enabled for this event.");
  }

  return {event, plan};
}

/**
 * Loads attendee micro-pod opt-outs for the event.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {string} eventId Event id.
 * @return {Promise<Set<string>>} Uids excluded from micro-pod generation.
 */
async function fetchMicroPodsOptOutUids(
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
      preference.microPodsOptedOut === true &&
      typeof preference.uid === "string" &&
      preference.uid.length > 0
    ) {
      optedOut.add(preference.uid);
    }
  }
  return optedOut;
}

/**
 * Sorts active participants into deterministic pod input order.
 * @param {ActiveParticipant} a First participant.
 * @param {ActiveParticipant} b Second participant.
 * @return {number} Sort comparison value.
 */
function compareParticipants(
  a: ActiveParticipant,
  b: ActiveParticipant
): number {
  const byStatus = statusRank(a.status) - statusRank(b.status);
  if (byStatus !== 0) return byStatus;
  return a.uid.localeCompare(b.uid);
}

/**
 * Ranks checked-in attendees ahead of signed-up attendees.
 * @param {string} status Participation status.
 * @return {number} Sort rank.
 */
function statusRank(status: ActiveParticipant["status"]): number {
  return status === "attended" ? 0 : 1;
}

/**
 * Uses checked-in attendees once a live pod can be formed.
 * Falls back to signed-up attendees for pre-arrival planning.
 * @param {ActiveParticipant[]} participants Active participation edges.
 * @return {ActiveParticipant[]} Pod input.
 */
function preferCheckedInParticipants(
  participants: ActiveParticipant[]
): ActiveParticipant[] {
  const attended = participants.filter((participant) =>
    participant.status === "attended"
  );
  return attended.length >= 2 ? attended : participants;
}

/**
 * Reads event timing for rotating group assignments.
 * @param {EventDocument} event Firestore event document.
 * @return {EventTiming} Event start and end in millis.
 */
function eventTimingFor(event: EventDocument): EventTiming {
  const startMillis = timestampMillis(event.startTime, "startTime");
  const endMillis = timestampMillis(event.endTime, "endTime");
  if (endMillis <= startMillis) {
    throw new HttpsError("failed-precondition",
      "Event end time must be after the start time.");
  }
  return {startMillis, endMillis};
}

/**
 * Converts a Firestore timestamp-like value to millis.
 * @param {unknown} value Raw timestamp-like value.
 * @param {string} field Field name for error copy.
 * @return {number} Milliseconds since epoch.
 */
function timestampMillis(value: unknown, field: string): number {
  if (
    value !== null &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof value.toMillis === "function"
  ) {
    const millis = value.toMillis();
    if (typeof millis === "number" && Number.isFinite(millis)) return millis;
  }
  throw new HttpsError("failed-precondition",
    `Event is missing ${field} for rotating groups.`);
}

/**
 * Splits active participants into deterministic topology-driven units.
 * @param {object} params Pod-build inputs.
 * @return {BuiltPods} Assignment groups and optional group rounds.
 */
function buildPods(params: {
  participants: ActiveParticipant[];
  blockedPairs: Set<string>;
  topology: AssignmentTopology;
  assignmentAlgorithm: EventSuccessAssignmentAlgorithm;
  compatibilityPolicy: EventSuccessCompatibilityPolicy;
  matchingObjective: EventSuccessMatchingObjective;
  constraints?: AssignmentConstraintConfig;
  rotationPolicy?: AssignmentRotationPolicy;
  timing?: EventTiming;
  softFeatures?: {eventId: string; organizerId: string;
    rules: AssignmentFeatureRule[];
    snapshots: EventAssignmentFeatureSnapshot[]};
}): BuiltPods {
  if (params.participants.length === 0) {
    return {groups: [], groupRounds: [], podCount: 0};
  }
  const rotationIntervalMinutes = params.topology.rotationIntervalMinutes;
  const rotationRoundCount = rotationIntervalMinutes === null ?
    0 :
    rotationRoundCountForDuration({
      eventStartMillis: params.timing?.startMillis ?? 0,
      eventEndMillis: params.timing?.endMillis ?? 0,
      rotationIntervalMinutes,
    });
  const plan = runAssignmentEngine({
    participants: params.participants,
    blockedPairs: params.blockedPairs,
    topology: params.topology,
    assignmentAlgorithm: params.assignmentAlgorithm,
    compatibilityPolicy: params.compatibilityPolicy,
    matchingObjective: params.matchingObjective,
    questionnaireMode: "icebreaker",
    rotationRoundCount,
    constraints: params.constraints,
    rotationPolicy: params.rotationPolicy,
    softFeatures: params.softFeatures,
  });
  const groupRounds = [
    ...plan.groupRounds,
    ...plan.rotationRounds.map(pairRoundToGroupRound),
  ];
  if (groupRounds.length > 0) {
    return {
      groups: [],
      groupRounds,
      podCount: groupRounds[0]?.groups.length ?? 0,
    };
  }
  const groups = plan.groups.map((group) => ({
    ...group,
    label: unitLabel(params.topology.unitKind, group.groupIndex),
  }));
  return {groups, groupRounds: [], podCount: groups.length};
}

/**
 * Adapts pair-sized optimizer rounds into the group-slot payload shape.
 * @param {OptimizedRotationRound<ActiveParticipant>} round Pair round.
 * @return {AssignmentGroupRound} Group-compatible round.
 */
function pairRoundToGroupRound(
  round: OptimizedRotationRound<ActiveParticipant>
): AssignmentGroupRound {
  return {
    roundIndex: round.roundIndex,
    groups: round.pairs.map((pair, index) => ({
      groupIndex: index,
      participants: [pair.a, pair.b],
      score: pair.score,
      mutualDyadCount: pair.mutualInterest ? 1 : 0,
      plausibleDyadCount: pair.compatibility === "social" ? 0 : 1,
    })),
  };
}

/**
 * Builds host-authored group rounds after safety and eligibility checks.
 * @param {object} params Override inputs.
 * @return {AssignmentGroupRound[]} Validated host-authored group rounds.
 */
function buildOverrideGroupRounds(params: {
  inputRounds: OverrideEventSuccessGroupsCallablePayload["rounds"];
  participants: ActiveParticipant[];
  blockedPairs: Set<string>;
  topology: AssignmentTopology;
  timing?: EventTiming;
}): AssignmentGroupRound[] {
  const participantsByUid = new Map(
    params.participants.map((participant) => [participant.uid, participant])
  );
  const maxRoundCount = overrideMaxRoundCount({
    topology: params.topology,
    timing: params.timing,
  });
  const seenRoundIndexes = new Set<number>();
  const rounds: AssignmentGroupRound[] = [];

  for (const inputRound of params.inputRounds) {
    if (seenRoundIndexes.has(inputRound.roundIndex)) {
      throw new HttpsError("invalid-argument",
        "Each group round can be overridden only once.");
    }
    seenRoundIndexes.add(inputRound.roundIndex);
    if (inputRound.roundIndex >= maxRoundCount) {
      throw new HttpsError("invalid-argument",
        "Group round is outside the event format.");
    }

    const usedInRound = new Set<string>();
    const groups: AssignmentGroup[] = [];
    for (const [groupIndex, inputGroup] of inputRound.groups.entries()) {
      const participants = inputGroup.participantUids.map((memberUid) => {
        const participant = participantsByUid.get(memberUid);
        if (participant === undefined) {
          throw new HttpsError("failed-precondition",
            "One or more attendees are no longer eligible for groups.");
        }
        if (!usedInRound.add(memberUid)) {
          throw new HttpsError("invalid-argument",
            "Each attendee can appear once per group round.");
        }
        return participant;
      });
      assertGroupHasNoBlockedPair(participants, params.blockedPairs);
      groups.push({
        groupIndex,
        label: inputGroup.label.trim() ||
          unitLabel(params.topology.unitKind, groupIndex),
        participants,
        score: 0,
        mutualDyadCount: 0,
        plausibleDyadCount: 0,
      });
    }
    if (groups.length > 0) {
      rounds.push({roundIndex: inputRound.roundIndex, groups});
    }
  }

  if (rounds.length === 0) {
    throw new HttpsError("invalid-argument", "Add at least one group.");
  }

  return rounds.sort((a, b) => a.roundIndex - b.roundIndex);
}

/**
 * Computes the maximum number of override rounds for this topology.
 * @param {object} params Topology and timing inputs.
 * @return {number} Maximum override round count.
 */
function overrideMaxRoundCount(params: {
  topology: AssignmentTopology;
  timing?: EventTiming;
}): number {
  const rotationIntervalMinutes = params.topology.rotationIntervalMinutes;
  if (!params.topology.rotationsEnabled || rotationIntervalMinutes === null) {
    return 1;
  }
  if (params.timing === undefined) return 0;
  return rotationRoundCountForDuration({
    eventStartMillis: params.timing.startMillis,
    eventEndMillis: params.timing.endMillis,
    rotationIntervalMinutes,
  });
}

/**
 * Rejects a host group that contains a blocked pair.
 * @param {ActiveParticipant[]} participants Participants in one group.
 * @param {Set<string>} blockedPairs Undirected blocked pair keys.
 */
function assertGroupHasNoBlockedPair(
  participants: ActiveParticipant[],
  blockedPairs: Set<string>
): void {
  for (let i = 0; i < participants.length; i++) {
    for (let j = i + 1; j < participants.length; j++) {
      if (blockedPairs.has(blockedPairKey(
        participants[i].uid,
        participants[j].uid
      ))) {
        throw new HttpsError("failed-precondition",
          "Blocked attendees cannot share a group.");
      }
    }
  }
}

/**
 * Loads block edges among the active participants in either direction.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {ActiveParticipant[]} participants Active participants.
 * @return {Promise<Set<string>>} Undirected blocked pair keys.
 */
async function fetchBlockedPairs(
  db: FirebaseFirestore.Firestore,
  participants: ActiveParticipant[]
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
      pairs.add(blockedPairKey(block.blockerUserId, block.blockedUserId));
    }
  }
  return pairs;
}

/**
 * Builds a deterministic undirected pair key.
 * @param {string} uidA First uid.
 * @param {string} uidB Second uid.
 * @return {string} Pair key.
 */
function blockedPairKey(uidA: string, uidB: string): string {
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

/**
 * Builds assignment documents for each participant in each generated pod.
 * @param {object} params Assignment build params.
 * @param {string} params.eventId Event id.
 * @param {string} params.clubId Club id.
 * @param {AssignmentGroup[]} params.groups Pod groups.
 * @param {AssignmentGroupRound[]} params.groupRounds Rotations.
 * @param {FirebaseFirestore.FieldValue} params.now Server timestamp field.
 * @return {Map<string, GeneratedAssignment>} Assignment docs by id.
 */
function buildAssignments(params: {
  eventId: string;
  clubId: string;
  organizerId?: string;
  unitKind: EventSuccessUnitKind;
  groups: AssignmentGroup[];
  groupRounds: AssignmentGroupRound[];
  rotationIntervalMinutes: number | null;
  eventStartMillis?: number;
  source: string;
  now: FirebaseFirestore.FieldValue;
}): Map<string, GeneratedAssignment> {
  if (
    params.groupRounds.length > 0 &&
    params.rotationIntervalMinutes !== null &&
    params.eventStartMillis !== undefined
  ) {
    return buildGroupRotationAssignments({
      eventId: params.eventId,
      clubId: params.clubId,
      organizerId: params.organizerId ?? params.clubId,
      unitKind: params.unitKind,
      groupRounds: params.groupRounds,
      rotationIntervalMinutes: params.rotationIntervalMinutes,
      eventStartMillis: params.eventStartMillis,
      source: params.source,
      now: params.now,
    });
  }
  const assignments = new Map<string, GeneratedAssignment>();
  params.groups.forEach((group, index) => {
    const label = group.label ?? unitLabel(params.unitKind, index);
    const groupUids = group.participants.map((participant) => participant.uid);
    const whyCodes = groupWhyCodes({
      group,
      unitKind: params.unitKind,
      source: params.source,
    });
    for (const participant of group.participants) {
      const docId = assignmentId(params.eventId, participant.uid);
      assignments.set(docId, {
        eventId: params.eventId,
        clubId: params.clubId,
        organizerId: params.organizerId ?? params.clubId,
        uid: participant.uid,
        moduleId: MICRO_PODS_MODULE_ID,
        label,
        displayTitle: label,
        displaySubtitle: unitSubtitle(
          params.unitKind,
          group.participants.length
        ),
        peerUids: groupUids.filter((peerUid) => peerUid !== participant.uid),
        unitKind: params.unitKind,
        unitIndex: group.groupIndex,
        unitLabel: label,
        whySummary: groupWhySummary({
          group,
          unitKind: params.unitKind,
          unitLabel: label,
          source: params.source,
        }),
        whyCodes,
        source: params.source,
        createdAt: params.now,
        updatedAt: params.now,
      });
    }
  });
  return assignments;
}

/**
 * Builds attendee assignment docs for rotating group units.
 * @param {object} params Assignment build params.
 * @return {Map<string, GeneratedAssignment>} Assignment docs by id.
 */
function buildGroupRotationAssignments(params: {
  eventId: string;
  clubId: string;
  organizerId?: string;
  unitKind: EventSuccessUnitKind;
  groupRounds: AssignmentGroupRound[];
  rotationIntervalMinutes: number;
  eventStartMillis: number;
  source: string;
  now: FirebaseFirestore.FieldValue;
}): Map<string, GeneratedAssignment> {
  const slotsByUid = new Map<string, GeneratedGroupRotationSlot[]>();
  const participantUids = new Set<string>();
  for (const round of params.groupRounds) {
    for (const group of round.groups) {
      const groupUids = group.participants.map((participant) => {
        participantUids.add(participant.uid);
        return participant.uid;
      });
      const slotStartsAtMillis = params.eventStartMillis +
        round.roundIndex * params.rotationIntervalMinutes * 60000;
      const slotEndsAtMillis = slotStartsAtMillis +
        params.rotationIntervalMinutes * 60000;
      const compatibility = params.source === "host_override_v1" ?
        "host_override" :
        groupCompatibilitySignal(group);
      const whyCodes = groupWhyCodes({
        group,
        unitKind: params.unitKind,
        source: params.source,
      });
      const unitDisplayLabel = group.label ??
        unitLabel(params.unitKind, group.groupIndex);
      for (const participant of group.participants) {
        const slot: GeneratedGroupRotationSlot = {
          slotId: `round-${round.roundIndex}-unit-${group.groupIndex}`,
          roundIndex: round.roundIndex,
          label: `Round ${round.roundIndex + 1}`,
          unitLabel: unitDisplayLabel,
          unitKind: params.unitKind,
          unitIndex: group.groupIndex,
          startsAt: admin.firestore.Timestamp.fromMillis(slotStartsAtMillis),
          endsAt: admin.firestore.Timestamp.fromMillis(slotEndsAtMillis),
          peerUids: groupUids.filter((uid) => uid !== participant.uid),
          peerCount: Math.max(0, group.participants.length - 1),
          compatibility,
          whySummary: groupWhySummary({
            group,
            unitKind: params.unitKind,
            unitLabel: unitDisplayLabel,
            source: params.source,
          }),
          whyCodes,
        };
        const slotsForUid = slotsByUid.get(participant.uid);
        if (slotsForUid === undefined) {
          slotsByUid.set(participant.uid, [slot]);
        } else {
          slotsForUid.push(slot);
        }
      }
    }
  }

  const assignments = new Map<string, GeneratedAssignment>();
  for (const uid of [...participantUids].sort()) {
    const slots = (slotsByUid.get(uid) ?? [])
      .sort((a, b) => a.roundIndex - b.roundIndex);
    const peerUids = uniqueSorted(
      slots.flatMap((slot) => slot.peerUids)
    );
    const rotationNoun = unitSingularLabel(params.unitKind).toLowerCase();
    const title =
      `${slots.length} ${rotationNoun} ` +
      `rotation${slots.length === 1 ? "" : "s"}`;
    const intervalLabel =
      `${params.rotationIntervalMinutes}-minute ${rotationNoun}s`;
    const peerCountLabel =
      `${peerUids.length} ${peerUids.length === 1 ? "person" : "people"}`;
    const docId = assignmentId(params.eventId, uid);
    assignments.set(docId, {
      eventId: params.eventId,
      clubId: params.clubId,
      organizerId: params.organizerId ?? params.clubId,
      uid,
      moduleId: MICRO_PODS_MODULE_ID,
      label: `${unitSingularLabel(params.unitKind)} rotations`,
      displayTitle: title,
      displaySubtitle:
        `${intervalLabel} with ${peerCountLabel} across the event.`,
      peerUids,
      unitKind: params.unitKind,
      unitLabel: `${unitSingularLabel(params.unitKind)} rotations`,
      whySummary: `${title} with ${peerCountLabel}.`,
      whyCodes: uniqueWhyCodes(slots.flatMap((slot) =>
        slot.whyCodes ?? []
      )),
      rotationFairness: rotationFairnessSummary(slots, []),
      groupRotationSlots: slots,
      source: params.source,
      createdAt: params.now,
      updatedAt: params.now,
    });
  }
  return assignments;
}

/**
 * Builds a short reason summary for a generated group.
 * @param {object} params Group metadata inputs.
 * @return {string} Human-readable assignment reason.
 */
function groupWhySummary(params: {
  group: OptimizedGroup<ActiveParticipant>;
  unitKind: EventSuccessUnitKind;
  unitLabel: string;
  source: string;
}): string {
  const peerCount = Math.max(0, params.group.participants.length - 1);
  const peerLabel = `${peerCount} ${peerCount === 1 ? "peer" : "peers"}`;
  if (params.source === "host_override_v1") {
    return `Host override for ${params.unitLabel} with ${peerLabel}.`;
  }
  if (params.group.mutualDyadCount > 0) {
    return `${params.unitLabel} balances ${peerLabel} with compatible dyads.`;
  }
  if (params.group.plausibleDyadCount > 0) {
    return `${params.unitLabel} creates a social fallback with ${peerLabel}.`;
  }
  const unitName = unitSingularLabel(params.unitKind).toLowerCase();
  return `${params.unitLabel} keeps this ${unitName} assignment available.`;
}

/**
 * Builds machine-safe reason codes for a generated group.
 * @param {object} params Group metadata inputs.
 * @return {AssignmentWhyCode[]} Stable reason codes.
 */
function groupWhyCodes(params: {
  group: OptimizedGroup<ActiveParticipant>;
  unitKind: EventSuccessUnitKind;
  source: string;
}): AssignmentWhyCode[] {
  const codes: AssignmentWhyCode[] = [unitWhyCode(params.unitKind)];
  if (params.source === "host_override_v1") {
    codes.push("host_override");
  } else if (params.group.mutualDyadCount > 0) {
    codes.push("mutual_interest");
  } else if (params.group.plausibleDyadCount > 0) {
    codes.push("social_fallback");
  }
  if (params.group.participants.length > 1) {
    codes.push("balanced_group");
  }
  return uniqueWhyCodes(codes);
}

/**
 * Maps unit kinds to stable reason codes.
 * @param {EventSuccessUnitKind} unitKind Assignment unit kind.
 * @return {AssignmentWhyCode} Unit reason code.
 */
function unitWhyCode(unitKind: EventSuccessUnitKind): AssignmentWhyCode {
  switch (unitKind) {
  case "pairs":
    return "pair_slot";
  case "teams":
    return "team_slot";
  case "tables":
    return "table_slot";
  case "wholeGroup":
    return "whole_group_slot";
  case "pods":
  default:
    return "pod_slot";
  }
}

/**
 * Builds fairness metadata from rotation slots and sit-outs.
 * @param {GeneratedGroupRotationSlot[]} slots Assigned rotation slots.
 * @param {unknown[]} sitOutSlots Sit-out slots.
 * @return {RotationFairnessSummary} Fairness counts.
 */
function rotationFairnessSummary(
  slots: GeneratedGroupRotationSlot[],
  sitOutSlots: unknown[]
): RotationFairnessSummary {
  const peerCounts = new Map<string, number>();
  for (const slot of slots) {
    for (const peerUid of slot.peerUids) {
      peerCounts.set(peerUid, (peerCounts.get(peerUid) ?? 0) + 1);
    }
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
 * Summarizes group compatibility into the assignment contract enum.
 * @param {OptimizedGroup<ActiveParticipant>} group Optimized group summary.
 * @return {GroupCompatibilitySignal} Group compatibility label.
 */
function groupCompatibilitySignal(
  group: OptimizedGroup<ActiveParticipant>
): GroupCompatibilitySignal {
  if (group.mutualDyadCount > 0 && group.plausibleDyadCount > 1) {
    return "mixed";
  }
  if (group.mutualDyadCount > 0) return "mutual_interest";
  if (group.plausibleDyadCount > 0) return "social";
  return "mixed";
}

/**
 * Returns sorted unique values.
 * @param {string[]} values Raw values.
 * @return {string[]} Stable unique list.
 */
function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort();
}

/**
 * Replaces stale generated assignment docs for this event and module.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {string} eventId Event id.
 * @param {Map<string, GeneratedAssignment>} assignments New assignments.
 */
async function writeAssignments(
  db: FirebaseFirestore.Firestore,
  eventId: string,
  assignments: Map<string, GeneratedAssignment>,
  featureGuard?: {organizerId: string; rules: AssignmentFeatureRule[];
    snapshots: EventAssignmentFeatureSnapshot[];
    revision: number; configHash: string}
): Promise<void> {
  const existingQuery = db.collection("eventSuccessAssignments")
    .where("eventId", "==", eventId)
    .where("moduleId", "==", MICRO_PODS_MODULE_ID);
  if (featureGuard) {
    if (assignments.size > 400 || !featureGuard.configHash) {
      throw new HttpsError("failed-precondition",
        "Structured matching exceeds the supported publication size.");
    }
    await db.runTransaction(async (tx) => {
      const planRef = db.collection("eventSuccessPlans").doc(eventId);
      const [planSnap, existingSnap] = await Promise.all([
        tx.get(planRef), tx.get(existingQuery.limit(401)),
      ]);
      const staleDocs = existingSnap.docs.filter((doc) =>
        !assignments.has(doc.id));
      if (existingSnap.size > 400 ||
          staleDocs.length + assignments.size > 400) {
        throw new HttpsError("failed-precondition",
          "Structured matching exceeds the supported publication size.");
      }
      if (!planSnap.exists) {
        throw new HttpsError("aborted",
          "Assignment feature setup changed.");
      }
      const plan = planSnap.data() as EventSuccessPlanDocument;
      if (plan.assignmentFeatureRevision !== featureGuard.revision ||
          plan.assignmentFeatureConfigHash !== featureGuard.configHash) {
        throw new HttpsError("aborted", "Assignment feature setup changed.");
      }
      await recheckAssignmentFeatureSnapshots({tx, db, eventId,
        organizerId: featureGuard.organizerId,
        rules: featureGuard.rules,
        snapshots: featureGuard.snapshots});
      for (const doc of staleDocs) tx.delete(doc.ref);
      for (const [docId, assignment] of assignments.entries()) {
        tx.set(db.collection("eventSuccessAssignments").doc(docId),
          assignment);
      }
    });
    return;
  }
  const existingSnap = await existingQuery.get();
  const batch = db.batch();
  for (const doc of existingSnap.docs) {
    if (!assignments.has(doc.id)) {
      batch.delete(doc.ref);
    }
  }
  for (const [docId, assignment] of assignments.entries()) {
    batch.set(
      db.collection("eventSuccessAssignments").doc(docId),
      assignment
    );
  }
  await batch.commit();
}

/**
 * Returns the deterministic micro-pod assignment document id.
 * @param {string} eventId Event id.
 * @param {string} uid User id.
 * @return {string} Assignment document id.
 */
function assignmentId(eventId: string, uid: string): string {
  return `${eventId}_${MICRO_PODS_MODULE_ID}_${uid}`;
}
