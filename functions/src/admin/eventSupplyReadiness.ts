import {onCall, CallableRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {requireAdminRole} from "./adminAuth";

const eventSupplyReadinessRoles = ["admin", "adminOwner", "support"] as const;

interface EventSupplyReadinessDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: EventSupplyReadinessDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit: defaultCheckRateLimit,
};

export interface AdminGetEventSupplyReadinessResponse {
  generatedAt: string | null;
  source: "event_supply_readiness" | "empty";
  importPlan: Record<string, unknown>;
  executionPlan: Record<string, unknown>;
}

/**
 * Returns the current external event import readiness snapshot for Events.
 * This is read-only operator state; it does not import or publish events.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {EventSupplyReadinessDeps} deps Injectable dependencies.
 * @return {Promise<AdminGetEventSupplyReadinessResponse>} Readiness response.
 */
export async function adminGetEventSupplyReadinessHandler(
  request: CallableRequest<unknown>,
  deps: EventSupplyReadinessDeps = defaultDeps
): Promise<AdminGetEventSupplyReadinessResponse> {
  const adminContext = requireAdminRole(request, eventSupplyReadinessRoles);
  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    adminContext.uid,
    "adminGetEventSupplyReadiness",
    {maxRequests: 60, windowMs: 60 * 1000}
  );

  const snap = await db
    .collection("eventSupplyReadiness")
    .doc("current")
    .get();
  const data = snap.exists ? snap.data() ?? {} : {};
  const importPlan = asObject(data.importPlan);
  const executionPlan = asObject(data.executionPlan);
  if (importPlan && executionPlan) {
    return {
      generatedAt: nullableString(data.generatedAt),
      source: "event_supply_readiness",
      importPlan,
      executionPlan,
    };
  }

  return {
    generatedAt: null,
    source: "empty",
    importPlan: emptyExternalEventImportPlan(),
    executionPlan: emptyExternalEventImportExecutionPlan(),
  };
}

/**
 * Narrows unknown values into plain objects.
 * @param {unknown} value Raw value.
 * @return {Record<string, unknown> | null} Object or null.
 */
function asObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

/**
 * Narrows nullable generated-at values.
 * @param {unknown} value Raw value.
 * @return {string | null} String or null.
 */
function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

/**
 * Empty import plan matching the admin UI contract.
 * @return {Record<string, unknown>} Empty plan.
 */
function emptyExternalEventImportPlan(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    summary: {
      candidates: 0,
      proposedReadOnlyEvents: 0,
      proposedCreates: 0,
      mergedSourceLinks: 0,
      writeReady: 0,
      blocked: 0,
      waitingReview: 0,
      rejected: 0,
      duplicateEventKeys: 0,
      actionsByStatus: {},
      actionsByPlatform: {},
    },
    policy: {
      status: "disabled",
      writeEnabled: false,
      reason: "No external event import readiness snapshot has been published.",
    },
    generatedFrom: {
      externalEventCandidateQueue:
        "tool/organizer_intake/generated/external_event_candidate_queue.json",
      batches: [],
      reviewDecisionBatches: [],
      locationResolutionBatches: [],
    },
    guardrails: [
      "event_import_writes_disabled_by_default",
      "plan_outputs_are_review_artifacts_not_firestore_mutations",
    ],
    actions: [],
    commands: {
      plan: "node tool/organizer_intake/plan_external_event_imports.mjs",
    },
  };
}

/**
 * Empty execution preflight matching the admin UI contract.
 * @return {Record<string, unknown>} Empty execution plan.
 */
function emptyExternalEventImportExecutionPlan(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    summary: {
      importActions: 0,
      createActions: 0,
      readOnlyActions: 0,
      skipped: 0,
      blocked: 0,
      projectionInvalid: 0,
      schemaInvalid: 0,
      wouldPublishReadOnly: 0,
      wouldCreate: 0,
      projectionValid: 0,
      projectionInvalidCount: 0,
      payloadValid: 0,
      payloadInvalid: 0,
      actionsByStatus: {},
    },
    policy: {
      status: "disabled",
      writeEnabled: false,
      authorityModel: "undecided",
      reason: "No external event import preflight snapshot has been published.",
    },
    generatedFrom: {
      externalEventImportPlan:
        "tool/organizer_intake/generated/external_event_import_plan.json",
      importPlanGeneratedFrom: {},
    },
    guardrails: [
      "execution_preflight_never_writes_firestore",
      "write_enabled_requires_explicit_authority_policy",
    ],
    actions: [],
    commands: {
      plan: "node tool/organizer_intake/plan_external_event_imports.mjs",
      preflight:
        "node tool/organizer_intake/preflight_external_event_imports.mjs",
      write:
        "not available: approve ownership, defaults, and import policy first",
    },
  };
}

export const adminGetEventSupplyReadiness = onCall(
  appCheckCallableOptions,
  (request) => adminGetEventSupplyReadinessHandler(request)
);
