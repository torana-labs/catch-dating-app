import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import type {EventDocument} from "../shared/generated/firestoreAdminTypes";
import type {ResolveEventSuccessLateArrivalCallablePayload} from
  "../shared/generated/resolveEventSuccessLateArrivalCallablePayload";
import type {ResolveEventSuccessLateArrivalCallableResponse} from
  "../shared/generated/resolveEventSuccessLateArrivalCallableResponse";
import {
  validateResolveEventSuccessLateArrivalCallablePayload,
} from
  "../shared/generated/validators/resolveEventSuccessLateArrivalInput";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {
  eventOrganizerRef,
  isEventOrganizerManager,
  requireEventOrganizer,
} from "../shared/eventOrganizers";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {loadEventSuccessRosterParticipant} from "./eventSuccessRoster";
import {
  deriveEventSuccessPresenceState,
  eventSuccessPresencePolicy,
} from "./presence";

type LateArrivalStatus = ResolveEventSuccessLateArrivalCallableResponse[
  "status"
];

export interface LateArrivalDraft {
  id: string;
  data: Record<string, unknown>;
}

export interface LateArrivalDraftResolution {
  status: LateArrivalStatus;
  reason: string;
  changed: boolean;
  drafts: LateArrivalDraft[];
}

interface EventSuccessLateArrivalDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  nowMillis: () => number;
  environment: NodeJS.ProcessEnv;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: EventSuccessLateArrivalDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  nowMillis: () => Date.now(),
  environment: process.env,
  checkRateLimit: defaultCheckRateLimit,
};

/**
 * Patches only an unpublished assignment draft. Pair insertion first consumes
 * a liveness-vacated slot, then a capacity-safe sit-out slot. Group insertion
 * extends an existing unit only below its configured maximum.
 */
export function resolveEventSuccessLateArrivalDraft(params: {
  eventId: string;
  lateUid: string;
  targetRoundIndex: number;
  publishedRoundIndex: number;
  drafts: LateArrivalDraft[];
  likelyDepartedUids: ReadonlySet<string>;
  maxUnitSize: number;
  concurrentUnits: number | null;
  now: FirebaseFirestore.FieldValue;
}): LateArrivalDraftResolution {
  if (params.targetRoundIndex <= params.publishedRoundIndex) {
    throw new HttpsError(
      "failed-precondition",
      "A published rotation round cannot be changed."
    );
  }
  const drafts = params.drafts.map((draft) => ({
    id: draft.id,
    data: {...draft.data},
  }));
  const alreadyAssigned = drafts.some((draft) =>
    assignment(draft)?.uid === params.lateUid &&
    assignmentHasRound(assignment(draft), params.targetRoundIndex)
  );
  if (alreadyAssigned) {
    return {
      status: "insertedIntoOpenPair",
      reason: "You are already placed in the next prepared round.",
      changed: false,
      drafts,
    };
  }

  const departedDraft = drafts.find((draft) => {
    const value = assignment(draft);
    return typeof value?.uid === "string" &&
      params.likelyDepartedUids.has(value.uid) &&
      targetRotationSlot(value, params.targetRoundIndex) !== null;
  });
  if (departedDraft !== undefined) {
    const departedAssignment = assignment(departedDraft)!;
    const departedUid = departedAssignment.uid as string;
    const departedSlot = targetRotationSlot(
      departedAssignment,
      params.targetRoundIndex
    )!;
    const peerUid = departedSlot.peerUid as string;
    const peerDraft = drafts.find((draft) =>
      assignment(draft)?.uid === peerUid
    );
    const peerAssignment = assignment(peerDraft);
    const peerSlot = targetRotationSlot(
      peerAssignment,
      params.targetRoundIndex,
      departedUid
    );
    if (peerDraft !== undefined && peerAssignment !== null && peerSlot) {
      replaceRotationSlotPeer(
        peerAssignment,
        params.targetRoundIndex,
        departedUid,
        params.lateUid,
        params.now
      );
      peerDraft.data.assignment = peerAssignment;
      const lateAssignment = latePairAssignment({
        template: departedAssignment,
        lateUid: params.lateUid,
        peerUid,
        slot: {...departedSlot, peerUid},
        now: params.now,
      });
      const remaining = drafts.filter((draft) => draft !== departedDraft);
      remaining.push(lateDraft({
        eventId: params.eventId,
        template: departedDraft,
        assignmentValue: lateAssignment,
        lateUid: params.lateUid,
        now: params.now,
      }));
      return {
        status: "insertedIntoOpenPair",
        reason: "A guest who may have left was replaced " +
          "in the next prepared round.",
        changed: true,
        drafts: stableDrafts(remaining),
      };
    }
  }

  const activeUnitKeys = targetUnitKeys(drafts, params.targetRoundIndex);
  const capacityAvailable = params.concurrentUnits === null ||
    activeUnitKeys.size < params.concurrentUnits;
  if (capacityAvailable) {
    const sitOutDraft = drafts.find((draft) => {
      const value = assignment(draft);
      return typeof value?.uid === "string" &&
        !params.likelyDepartedUids.has(value.uid) &&
        targetSitOutSlot(value, params.targetRoundIndex) !== null;
    });
    if (sitOutDraft !== undefined) {
      const sitOutAssignment = assignment(sitOutDraft)!;
      const sitOutUid = sitOutAssignment.uid as string;
      const sitOutSlot = targetSitOutSlot(
        sitOutAssignment,
        params.targetRoundIndex
      )!;
      const unitIndex = firstUnusedUnitIndex(
        drafts,
        params.targetRoundIndex
      );
      const slotId = `round-${params.targetRoundIndex}-late-${unitIndex}`;
      const candidateSlot = {
        slotId,
        roundIndex: params.targetRoundIndex,
        label: sitOutSlot.label,
        startsAt: sitOutSlot.startsAt,
        endsAt: sitOutSlot.endsAt,
        peerUid: params.lateUid,
        unitKind: "pairs",
        unitIndex,
        peerCount: 1,
        compatibility: "host_override",
        whySummary: "Paired with a late arrival for the next round.",
        whyCodes: ["host_override", "pair_slot"],
      };
      replaceSitOutWithRotation(
        sitOutAssignment,
        params.targetRoundIndex,
        candidateSlot,
        params.now
      );
      sitOutDraft.data.assignment = sitOutAssignment;
      const lateAssignment = latePairAssignment({
        template: sitOutAssignment,
        lateUid: params.lateUid,
        peerUid: sitOutUid,
        slot: {...candidateSlot, peerUid: sitOutUid},
        now: params.now,
      });
      drafts.push(lateDraft({
        eventId: params.eventId,
        template: sitOutDraft,
        assignmentValue: lateAssignment,
        lateUid: params.lateUid,
        now: params.now,
      }));
      return {
        status: "insertedIntoOpenPair",
        reason: "A planned sit-out became an open pair " +
          "in the next prepared round.",
        changed: true,
        drafts: stableDrafts(drafts),
      };
    }
  }

  const group = findExpandableGroup(
    drafts,
    params.targetRoundIndex,
    params.maxUnitSize
  );
  if (group !== null) {
    const memberUids = group.members.map((member) =>
      assignment(member)!.uid as string
    ).sort();
    for (const member of group.members) {
      const value = assignment(member)!;
      extendGroupSlot(
        value,
        params.targetRoundIndex,
        group.key,
        params.lateUid,
        params.now
      );
      member.data.assignment = value;
    }
    const templateAssignment = assignment(group.members[0])!;
    const templateSlot = targetGroupSlot(
      templateAssignment,
      params.targetRoundIndex,
      group.key
    )!;
    const lateAssignment = lateGroupAssignment({
      template: templateAssignment,
      lateUid: params.lateUid,
      peerUids: memberUids,
      slot: templateSlot,
      now: params.now,
    });
    drafts.push(lateDraft({
      eventId: params.eventId,
      template: group.members[0],
      assignmentValue: lateAssignment,
      lateUid: params.lateUid,
      now: params.now,
    }));
    return {
      status: "extendedUnit",
      reason: "You were added to a prepared group that still had room.",
      changed: true,
      drafts: stableDrafts(drafts),
    };
  }

  return {
    status: "heldForNextRound",
    reason: "The current round is already published or its prepared units " +
      "are full. You will join the next round.",
    changed: false,
    drafts: stableDrafts(drafts),
  };
}

/**
 * Resolves one checked-in late attendee under the shared live revision fence.
 */
export async function resolveEventSuccessLateArrivalHandler(
  request: CallableRequest<unknown>,
  deps: EventSuccessLateArrivalDeps = defaultDeps
): Promise<ResolveEventSuccessLateArrivalCallableResponse> {
  const hostUid = requireAuth(request);
  const payload =
    validateCallableWithAjv<ResolveEventSuccessLateArrivalCallablePayload>(
      request,
      validateResolveEventSuccessLateArrivalCallablePayload
    );
  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    hostUid,
    "resolveEventSuccessLateArrival",
    {maxRequests: 30, windowMs: 60 * 1000}
  );
  const [eventSnap, participant] = await Promise.all([
    db.collection("events").doc(payload.eventId).get(),
    loadEventSuccessRosterParticipant(db, payload.eventId, payload.uid),
  ]);
  if (!eventSnap.exists) {
    throw new HttpsError("not-found", "Event not found.");
  }
  const event = requireDoc<EventDocument>(eventSnap, "EventDocument");
  const organizerSnap = await eventOrganizerRef(db, event).get();
  const organizer = requireEventOrganizer(organizerSnap, event);
  if (!isEventOrganizerManager(organizer, event, hostUid)) {
    throw new HttpsError(
      "permission-denied",
      "Only an organizer manager can place a late attendee."
    );
  }
  if (participant?.status !== "attended") {
    throw new HttpsError(
      "failed-precondition",
      "The attendee must be checked in before late placement."
    );
  }
  const planRef = db.collection("eventSuccessPlans").doc(payload.eventId);
  const draftQuery = db.collection("eventSuccessAssignmentDrafts")
    .where("eventId", "==", payload.eventId)
    .limit(200);
  const presenceQuery = db.collection("eventSuccessPresence")
    .where("eventId", "==", payload.eventId)
    .limit(200);
  const resolutionRef = db.collection("eventSuccessLateArrivals")
    .doc(`${payload.eventId}_${payload.uid}`);
  const now = deps.serverTimestamp();
  const nowMillis = deps.nowMillis();
  const policy = eventSuccessPresencePolicy(deps.environment);

  return db.runTransaction(async (transaction) => {
    const [planSnap, draftSnap, presenceSnap, currentResolutionSnap] =
      await Promise.all([
        transaction.get(planRef),
        transaction.get(draftQuery),
        transaction.get(presenceQuery),
        transaction.get(resolutionRef),
      ]);
    if (!planSnap.exists) {
      throw new HttpsError(
        "failed-precondition",
        "Event-success setup has not been saved."
      );
    }
    const plan = planSnap.data()!;
    const publishedRoundIndex = integerOr(
      plan.publishedRotationRoundIndex,
      -1
    );
    if (publishedRoundIndex >= 100) {
      throw new HttpsError(
        "failed-precondition",
        "The rotation schedule has no later round for late placement."
      );
    }
    const targetRoundIndex = publishedRoundIndex + 1;
    const currentResolution = currentResolutionSnap.data();
    if (
      currentResolutionSnap.exists &&
      currentResolution?.eventId === payload.eventId &&
      currentResolution?.uid === payload.uid &&
      currentResolution?.targetRoundIndex === targetRoundIndex &&
      isLateArrivalStatus(currentResolution.status)
    ) {
      return {
        status: currentResolution.status,
        targetRoundIndex,
        revision: nonNegativeInteger(plan.liveControlRevision),
        assignmentDraftRevision: nonNegativeInteger(
          currentResolution.assignmentDraftRevision
        ),
        reason: boundedReason(currentResolution.reason),
        replayed: true,
      };
    }
    const currentRevision = nonNegativeInteger(plan.liveControlRevision);
    if (currentRevision !== payload.expectedRevision) {
      throw new HttpsError(
        "aborted",
        "The live event guide changed on another device. Refresh and retry."
      );
    }
    const assignmentDraftRevision = nonNegativeInteger(
      plan.assignmentDraftRevision
    );
    const drafts: LateArrivalDraft[] = draftSnap.docs
      .filter((doc) => {
        const data = doc.data();
        return data.roundIndex === targetRoundIndex &&
          data.baseAssignmentRevision === assignmentDraftRevision;
      })
      .map((doc) => ({id: doc.id, data: doc.data()}));
    const likelyDepartedUids = new Set<string>();
    for (const doc of presenceSnap.docs) {
      const data = doc.data();
      const heartbeatAtMillis = timestampMillis(data.heartbeatAt);
      if (
        data.eventId === payload.eventId &&
        typeof data.uid === "string" &&
        heartbeatAtMillis !== null &&
        deriveEventSuccessPresenceState({
          heartbeatAtMillis,
          nowMillis,
          policy,
        }) === "likelyDeparted"
      ) likelyDepartedUids.add(data.uid);
    }
    const structure = recordValue(plan.structureConfig);
    const capacity = recordValue(structure?.resourceCapacity);
    const concurrentUnits = positiveIntegerOrNull(capacity?.concurrentUnits);
    const maxUnitSize = boundedUnitSize(structure?.unitSize);
    const resolution = resolveEventSuccessLateArrivalDraft({
      eventId: payload.eventId,
      lateUid: payload.uid,
      targetRoundIndex,
      publishedRoundIndex,
      drafts,
      likelyDepartedUids,
      maxUnitSize,
      concurrentUnits,
      now,
    });
    const revision = nextRevision(currentRevision);
    const nextDraftRevision = resolution.changed ?
      nextRevision(assignmentDraftRevision) : assignmentDraftRevision;
    if (resolution.changed) {
      const nextIds = new Set(resolution.drafts.map((draft) => draft.id));
      for (const draft of drafts) {
        if (!nextIds.has(draft.id)) {
          transaction.delete(
            db.collection("eventSuccessAssignmentDrafts").doc(draft.id)
          );
        }
      }
      for (const draft of resolution.drafts) {
        transaction.set(
          db.collection("eventSuccessAssignmentDrafts").doc(draft.id),
          {
            ...draft.data,
            baseAssignmentRevision: nextDraftRevision,
            updatedAt: now,
          }
        );
      }
    }
    transaction.update(planRef, {
      liveControlRevision: revision,
      ...(resolution.changed ?
        {assignmentDraftRevision: nextDraftRevision} : {}),
      updatedAt: now,
    });
    transaction.set(resolutionRef, {
      eventId: payload.eventId,
      organizerId: event.organizerId,
      uid: payload.uid,
      resolvedByUid: hostUid,
      status: resolution.status,
      targetRoundIndex,
      assignmentDraftRevision: nextDraftRevision,
      reason: resolution.reason,
      createdAt: currentResolutionSnap.exists ?
        currentResolutionSnap.data()!.createdAt : now,
      updatedAt: now,
    });
    return {
      status: resolution.status,
      targetRoundIndex,
      revision,
      assignmentDraftRevision: nextDraftRevision,
      reason: resolution.reason,
      replayed: false,
    };
  });
}

export const resolveEventSuccessLateArrival = onCall(
  appCheckCallableOptions,
  (request) => resolveEventSuccessLateArrivalHandler(request)
);

function assignment(draft: LateArrivalDraft | undefined):
  Record<string, unknown> | null {
  return recordValue(draft?.data.assignment);
}

function assignmentHasRound(
  value: Record<string, unknown> | null,
  roundIndex: number
): boolean {
  return targetRotationSlot(value, roundIndex) !== null ||
    targetGroupSlot(value, roundIndex) !== null ||
    targetSitOutSlot(value, roundIndex) !== null;
}

function targetRotationSlot(
  value: Record<string, unknown> | null,
  roundIndex: number,
  peerUid?: string
): Record<string, unknown> | null {
  return objectArray(value?.rotationSlots).find((slot) =>
    slot.roundIndex === roundIndex &&
    (peerUid === undefined || slot.peerUid === peerUid)
  ) ?? null;
}

function targetSitOutSlot(
  value: Record<string, unknown> | null,
  roundIndex: number
): Record<string, unknown> | null {
  return objectArray(value?.sitOutSlots).find((slot) =>
    slot.roundIndex === roundIndex
  ) ?? null;
}

function targetGroupSlot(
  value: Record<string, unknown> | null,
  roundIndex: number,
  key?: string
): Record<string, unknown> | null {
  return objectArray(value?.groupRotationSlots).find((slot) =>
    slot.roundIndex === roundIndex &&
    (key === undefined || groupSlotKey(slot) === key)
  ) ?? null;
}

function replaceRotationSlotPeer(
  value: Record<string, unknown>,
  roundIndex: number,
  oldPeerUid: string,
  newPeerUid: string,
  now: FirebaseFirestore.FieldValue
): void {
  value.rotationSlots = objectArray(value.rotationSlots).map((slot) =>
    slot.roundIndex === roundIndex && slot.peerUid === oldPeerUid ? {
      ...slot,
      peerUid: newPeerUid,
      compatibility: "host_override",
      whySummary: "Paired with a late arrival for the next round.",
      whyCodes: ["host_override", "pair_slot"],
    } : slot
  );
  refreshAssignmentSummary(value, now);
}

function replaceSitOutWithRotation(
  value: Record<string, unknown>,
  roundIndex: number,
  slot: Record<string, unknown>,
  now: FirebaseFirestore.FieldValue
): void {
  value.sitOutSlots = objectArray(value.sitOutSlots).filter(
    (candidate) => candidate.roundIndex !== roundIndex
  );
  value.rotationSlots = [...objectArray(value.rotationSlots), slot]
    .sort(compareRoundSlots);
  refreshAssignmentSummary(value, now);
}

function latePairAssignment(params: {
  template: Record<string, unknown>;
  lateUid: string;
  peerUid: string;
  slot: Record<string, unknown>;
  now: FirebaseFirestore.FieldValue;
}): Record<string, unknown> {
  const value = {
    ...params.template,
    uid: params.lateUid,
    peerUids: [params.peerUid],
    rotationSlots: [params.slot],
    groupRotationSlots: [],
    sitOutSlots: [],
    source: "host_override_v1",
    confirmedLayoutUnitId: null,
    createdAt: params.now,
    updatedAt: params.now,
  };
  refreshAssignmentSummary(value, params.now);
  return value;
}

function lateGroupAssignment(params: {
  template: Record<string, unknown>;
  lateUid: string;
  peerUids: string[];
  slot: Record<string, unknown>;
  now: FirebaseFirestore.FieldValue;
}): Record<string, unknown> {
  const value = {
    ...params.template,
    uid: params.lateUid,
    peerUids: params.peerUids,
    rotationSlots: [],
    groupRotationSlots: [{
      ...params.slot,
      peerUids: params.peerUids,
      peerCount: params.peerUids.length,
      compatibility: "host_override",
      whySummary: "Added to an available group for the next round.",
      whyCodes: ["host_override", groupWhyCode(params.slot.unitKind)],
    }],
    sitOutSlots: [],
    source: "host_override_v1",
    confirmedLayoutUnitId: null,
    createdAt: params.now,
    updatedAt: params.now,
  };
  refreshAssignmentSummary(value, params.now);
  return value;
}

function lateDraft(params: {
  eventId: string;
  template: LateArrivalDraft;
  assignmentValue: Record<string, unknown>;
  lateUid: string;
  now: FirebaseFirestore.FieldValue;
}): LateArrivalDraft {
  const moduleId = typeof params.assignmentValue.moduleId === "string" ?
    params.assignmentValue.moduleId : "guided_rotations";
  return {
    id: `${params.eventId}_${moduleId}_${params.lateUid}`,
    data: {
      ...params.template.data,
      uid: params.lateUid,
      assignment: params.assignmentValue,
      ...(params.template.data.assignmentFeatureGuard ? {
        assignmentFeatureGuard: {
          ...(params.template.data.assignmentFeatureGuard as
            Record<string, unknown>),
          // Host placement did not consume the late attendee's form answer.
          snapshots: [],
        },
      } : {}),
      createdAt: params.now,
      updatedAt: params.now,
    },
  };
}

function targetUnitKeys(
  drafts: LateArrivalDraft[],
  roundIndex: number
): Set<string> {
  return new Set(drafts.flatMap((draft) => {
    const slot = targetRotationSlot(assignment(draft), roundIndex);
    return slot === null ? [] : [rotationSlotKey(slot)];
  }));
}

function firstUnusedUnitIndex(
  drafts: LateArrivalDraft[],
  roundIndex: number
): number {
  const used = new Set(drafts.flatMap((draft) => {
    const slot = targetRotationSlot(assignment(draft), roundIndex);
    return slot !== null && Number.isInteger(slot.unitIndex) ?
      [slot.unitIndex as number] : [];
  }));
  let index = 0;
  while (used.has(index)) index += 1;
  return index;
}

function findExpandableGroup(
  drafts: LateArrivalDraft[],
  roundIndex: number,
  maxUnitSize: number
): {key: string; members: LateArrivalDraft[]} | null {
  const byKey = new Map<string, LateArrivalDraft[]>();
  for (const draft of drafts) {
    const slot = targetGroupSlot(assignment(draft), roundIndex);
    if (slot === null) continue;
    const key = groupSlotKey(slot);
    const members = byKey.get(key) ?? [];
    members.push(draft);
    byKey.set(key, members);
  }
  return [...byKey.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, members]) => ({key, members}))
    .find(({members}) => members.length < maxUnitSize) ?? null;
}

function extendGroupSlot(
  value: Record<string, unknown>,
  roundIndex: number,
  key: string,
  lateUid: string,
  now: FirebaseFirestore.FieldValue
): void {
  value.groupRotationSlots = objectArray(value.groupRotationSlots).map(
    (slot) => slot.roundIndex === roundIndex && groupSlotKey(slot) === key ? {
      ...slot,
      peerUids: [...new Set([...stringArray(slot.peerUids), lateUid])].sort(),
      peerCount: stringArray(slot.peerUids).length + 1,
      compatibility: "host_override",
      whySummary: "A late arrival joined this prepared group.",
      whyCodes: ["host_override", groupWhyCode(slot.unitKind)],
    } : slot
  );
  refreshAssignmentSummary(value, now);
}

function refreshAssignmentSummary(
  value: Record<string, unknown>,
  now: FirebaseFirestore.FieldValue
): void {
  const rotationSlots = objectArray(value.rotationSlots);
  const groupSlots = objectArray(value.groupRotationSlots);
  const sitOutSlots = objectArray(value.sitOutSlots);
  const peerUids = [...new Set([
    ...rotationSlots.map((slot) => slot.peerUid).filter(isString),
    ...groupSlots.flatMap((slot) => stringArray(slot.peerUids)),
  ])].sort();
  const assignedRoundCount = rotationSlots.length + groupSlots.length;
  value.peerUids = peerUids;
  value.displayTitle = `${assignedRoundCount} guided rotation${
    assignedRoundCount === 1 ? "" : "s"}`;
  value.displaySubtitle = `${peerUids.length} ${
    peerUids.length === 1 ? "person" : "people"}${
    sitOutSlots.length === 0 ? "" : ` · ${sitOutSlots.length} break${
      sitOutSlots.length === 1 ? "" : "s"}`}`;
  value.whySummary = `${assignedRoundCount} partner round${
    assignedRoundCount === 1 ? "" : "s"} with ${peerUids.length} unique ${
    peerUids.length === 1 ? "person" : "people"}.`;
  value.whyCodes = [...new Set([
    ...rotationSlots.flatMap((slot) => stringArray(slot.whyCodes)),
    ...groupSlots.flatMap((slot) => stringArray(slot.whyCodes)),
    ...sitOutSlots.flatMap((slot) => stringArray(slot.whyCodes)),
  ])];
  value.rotationFairness = {
    assignedRoundCount,
    sitOutRoundCount: sitOutSlots.length,
    uniquePeerCount: peerUids.length,
    repeatPeerCount: Math.max(0, assignedRoundCount - peerUids.length),
  };
  value.updatedAt = now;
}

function stableDrafts(drafts: LateArrivalDraft[]): LateArrivalDraft[] {
  return drafts.sort((left, right) => left.id.localeCompare(right.id));
}

function rotationSlotKey(slot: Record<string, unknown>): string {
  if (typeof slot.slotId === "string") return `id:${slot.slotId}`;
  return `index:${integerOr(slot.unitIndex, 0)}`;
}

function groupSlotKey(slot: Record<string, unknown>): string {
  if (typeof slot.slotId === "string") return `id:${slot.slotId}`;
  const unitLabel = String(slot.unitLabel ?? "");
  return `index:${integerOr(slot.unitIndex, 0)}:${unitLabel}`;
}

function groupWhyCode(value: unknown): string {
  switch (value) {
  case "pods": return "pod_slot";
  case "tables": return "table_slot";
  case "teams": return "team_slot";
  case "pairs": return "pair_slot";
  default: return "whole_group_slot";
  }
}

function compareRoundSlots(
  left: Record<string, unknown>,
  right: Record<string, unknown>
): number {
  return integerOr(left.roundIndex, 0) - integerOr(right.roundIndex, 0) ||
    rotationSlotKey(left).localeCompare(rotationSlotKey(right));
}

function boundedUnitSize(value: unknown): number {
  return Number.isInteger(value) && (value as number) >= 2 &&
    (value as number) <= 20 ? value as number : 2;
}

function positiveIntegerOrNull(value: unknown): number | null {
  return Number.isInteger(value) && (value as number) > 0 ?
    value as number : null;
}

function nextRevision(current: number): number {
  if (current >= 2147483647) {
    throw new HttpsError(
      "resource-exhausted",
      "The live-control revision limit has been reached."
    );
  }
  return current + 1;
}

function timestampMillis(value: unknown): number | null {
  if (
    value !== null &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof value.toMillis === "function"
  ) {
    const millis = value.toMillis();
    return Number.isFinite(millis) && millis >= 0 ? millis : null;
  }
  return null;
}

function boundedReason(value: unknown): string {
  return typeof value === "string" && value.trim().length > 0 ?
    value.slice(0, 240) : "Late-arrival placement was resolved.";
}

function isLateArrivalStatus(value: unknown): value is LateArrivalStatus {
  return value === "insertedIntoOpenPair" || value === "extendedUnit" ||
    value === "heldForNextRound";
}

function objectArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value
    .filter((entry): entry is Record<string, unknown> =>
      entry !== null && typeof entry === "object" && !Array.isArray(entry)
    )
    .map((entry) => ({...entry})) : [];
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter(isString) : [];
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ?
    value as Record<string, unknown> : null;
}

function nonNegativeInteger(value: unknown): number {
  return Number.isInteger(value) && (value as number) >= 0 ?
    value as number : 0;
}

function integerOr(value: unknown, fallback: number): number {
  return Number.isInteger(value) ? value as number : fallback;
}
