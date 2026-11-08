import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import type {SaveEventPlanStepCallablePayload} from
  "../shared/generated/saveEventPlanStepCallablePayload";
import type {SaveEventPlanStepCallableResponse} from
  "../shared/generated/saveEventPlanStepCallableResponse";
import {validateSaveEventPlanStepCallablePayload} from
  "../shared/generated/validators/saveEventPlanStepInput";
import {validateSaveEventPlanStepCallableResponse} from
  "../shared/generated/validators/saveEventPlanStepOutput";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {nextRevision, requireEventManager} from "./liveControl";
import {
  buildLiveCommandReceipt,
  liveCommandReceiptId,
  liveCommandReceiptRef,
  liveCommandRequestHash,
  matchingLiveCommandReceipt,
} from "./liveCommandReceipts";

/**
 * Run-of-show step edits. The run of show derives from the playbook until
 * the host first adds, edits, removes or reorders a step; from then on the
 * plan stores the whole list as `stepOverrides`, which replaces the
 * playbook's steps everywhere they are read. `savePlan` keeps the playbook
 * fields; this command owns only the step list.
 *
 * Each edit is fenced on `liveControlRevision` (it shifts step indices the
 * live controls point at) and replay-safe on `requestId`.
 */

export type PlanStep = NonNullable<SaveEventPlanStepCallablePayload["step"]>;

const MAX_STEPS = 40;

interface PlanStepsDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  timestampFromMillis: (millis: number) => FirebaseFirestore.Timestamp;
  nowMillis: () => number;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: PlanStepsDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  timestampFromMillis: (millis) => admin.firestore.Timestamp.fromMillis(millis),
  nowMillis: () => Date.now(),
  checkRateLimit: defaultCheckRateLimit,
};

/**
 * Applies one edit to the run of show, without touching Firestore.
 * @param {PlanStep[] | null} current The stored overrides, or null.
 * @param {SaveEventPlanStepCallablePayload} payload The edit.
 * @return {PlanStep[]} The whole run of show after the edit.
 */
export function applyPlanStepEdit(
  current: PlanStep[] | null,
  payload: SaveEventPlanStepCallablePayload
): PlanStep[] {
  const base = current ?? payload.baseSteps ?? null;
  if (base === null) {
    throw new HttpsError("failed-precondition",
      "The first step edit must send the plan's current steps.");
  }
  requireUniqueIds(base);
  const steps = base.map((step) => ({...step}));
  const indexOf = (stepId: string | undefined) => {
    const index = stepId === undefined ? -1 :
      steps.findIndex((step) => step.stepId === stepId);
    if (index < 0) {
      throw new HttpsError("not-found",
        "That step is no longer in the plan.");
    }
    return index;
  };
  switch (payload.op) {
  case "add": {
    const step = requireStep(payload.step);
    if (steps.some((existing) => existing.stepId === step.stepId)) {
      throw new HttpsError("already-exists",
        "A step with this id is already in the plan.");
    }
    if (steps.length >= MAX_STEPS) {
      throw new HttpsError("failed-precondition",
        "A plan can hold at most 40 steps.");
    }
    const at = Math.min(payload.atIndex ?? steps.length, steps.length);
    steps.splice(at, 0, step);
    return steps;
  }
  case "edit": {
    const step = requireStep(payload.step);
    if (payload.stepId !== undefined && payload.stepId !== step.stepId) {
      throw new HttpsError("invalid-argument",
        "stepId must match the edited step.");
    }
    steps[indexOf(step.stepId)] = step;
    return steps;
  }
  case "remove": {
    const index = indexOf(payload.stepId);
    if (steps.length === 1) {
      throw new HttpsError("failed-precondition",
        "A plan keeps at least one step.");
    }
    steps.splice(index, 1);
    return steps;
  }
  case "reorder": {
    const order = payload.orderedStepIds;
    if (!order || order.length !== steps.length ||
        new Set(order).size !== order.length) {
      throw new HttpsError("invalid-argument",
        "orderedStepIds must list every step once.");
    }
    return order.map((stepId) => steps[indexOf(stepId)]);
  }
  }
}

/**
 * Where the live pointer goes after an edit: the same step if it is still
 * in the plan, otherwise the step now at its old place.
 */
export function activeStepIndexAfterEdit(
  before: PlanStep[],
  after: PlanStep[],
  activeStepIndex: number
): number {
  const clamped = Math.max(0, Math.min(activeStepIndex, before.length - 1));
  const activeId = before[clamped]?.stepId;
  const moved = after.findIndex((step) => step.stepId === activeId);
  if (moved >= 0) return moved;
  return Math.max(0, Math.min(clamped, after.length - 1));
}

/** Handles one revision-fenced, replay-safe run-of-show edit. */
export async function saveEventPlanStepHandler(
  request: CallableRequest<unknown>,
  deps: PlanStepsDeps = defaultDeps
): Promise<SaveEventPlanStepCallableResponse> {
  const uid = requireAuth(request);
  const payload =
    validateCallableWithAjv<SaveEventPlanStepCallablePayload>(
      request,
      validateSaveEventPlanStepCallablePayload
    );
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, uid, "saveEventPlanStep", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  await requireEventManager(db, payload.eventId, uid);
  const planRef = db.collection("eventSuccessPlans").doc(payload.eventId);
  const receiptId = liveCommandReceiptId("saveEventPlanStep", uid,
    payload.eventId, payload.requestId);
  const receiptRef = liveCommandReceiptRef(db, receiptId);
  const command: Record<string, unknown> = {...payload};
  delete command.requestId;
  const requestHash = liveCommandRequestHash("saveEventPlanStep", command);

  const response = await db.runTransaction(async (transaction) => {
    const [planSnap, receiptSnap] = await Promise.all([
      transaction.get(planRef),
      transaction.get(receiptRef),
    ]);
    const receipt = matchingLiveCommandReceipt(receiptSnap.data(), {
      receiptId, command: "saveEventPlanStep", eventId: payload.eventId,
      actorUid: uid, requestHash,
    });
    if (receipt) {
      return {
        eventId: payload.eventId,
        liveControlRevision: receipt.appliedRevision,
        stepCount: receipt.result?.stepCount ?? 1,
        replayed: true,
      };
    }
    if (!planSnap.exists) {
      throw new HttpsError("failed-precondition",
        "Event-success setup has not been saved.");
    }
    const plan = planSnap.data() as Record<string, unknown>;
    if (plan.eventId !== undefined && plan.eventId !== payload.eventId) {
      throw new HttpsError("failed-precondition",
        "Event-success plan does not match this event.");
    }
    if (plan.status === "complete") {
      throw new HttpsError("failed-precondition",
        "The live event guide is already complete.");
    }
    const revision = nonNegativeInt(plan.liveControlRevision);
    if (revision !== payload.expectedLiveControlRevision) {
      throw new HttpsError("aborted",
        "The plan changed on another device. Refresh and retry.",
        {reason: "staleLiveControlRevision"});
    }
    const current = Array.isArray(plan.stepOverrides) ?
      plan.stepOverrides as PlanStep[] : null;
    const before = current ?? payload.baseSteps ?? [];
    const after = applyPlanStepEdit(current, payload);
    const appliedRevision = nextRevision(revision);
    const update: Record<string, unknown> = {
      stepOverrides: after,
      liveControlRevision: appliedRevision,
      updatedAt: deps.serverTimestamp(),
    };
    if (plan.status === "live" && before.length > 0) {
      update.activeStepIndex = activeStepIndexAfterEdit(before, after,
        nonNegativeInt(plan.activeStepIndex));
    }
    transaction.update(planRef, update);
    transaction.create(receiptRef, buildLiveCommandReceipt({
      receiptId, command: "saveEventPlanStep", eventId: payload.eventId,
      actorUid: uid, requestHash, appliedRevision,
      result: {stepCount: after.length},
      nowMillis: deps.nowMillis(),
      timestampFromMillis: deps.timestampFromMillis,
    }));
    return {
      eventId: payload.eventId,
      liveControlRevision: appliedRevision,
      stepCount: after.length,
      replayed: false,
    };
  });
  if (!validateSaveEventPlanStepCallableResponse(response)) {
    throw new HttpsError("internal", "Plan step response is invalid.");
  }
  return response;
}

export const saveEventPlanStep = onCall(
  appCheckCallableOptions,
  (request) => saveEventPlanStepHandler(request)
);

function requireStep(step: PlanStep | undefined): PlanStep {
  if (step === undefined) {
    throw new HttpsError("invalid-argument", "step is required.");
  }
  return {...step};
}

function requireUniqueIds(steps: PlanStep[]): void {
  if (new Set(steps.map((step) => step.stepId)).size !== steps.length) {
    throw new HttpsError("invalid-argument",
      "Every step in the plan needs its own id.");
  }
}

function nonNegativeInt(value: unknown): number {
  return Number.isInteger(value) && (value as number) >= 0 ?
    value as number : 0;
}
