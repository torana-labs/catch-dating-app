import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {appCheckCallableOptions} from "../shared/callableOptions";
import type {AdminListIntakeOperationsCallablePayload} from
  "../shared/generated/adminListIntakeOperationsCallablePayload";
import {
  validateAdminListIntakeOperationsCallablePayload,
} from
  "../shared/generated/validators/adminListIntakeOperationsInput";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {FirestoreOperationsRepository} from
  "../operations/firestoreRepository";
import {
  MAX_OPERATION_WORK_ITEMS_PER_RUN,
  OperationRun,
  OperationWorkItem,
  WorkItemPrimaryStage,
} from "../operations/models";
import {
  OperationRunRepository,
  OperationWorkItemAdminReadRepository,
  UnavailableWorkItem,
} from "../operations/repositories";
import {requireAdminRole} from "./adminAuth";
import {organizerDraftOperationId} from "./organizerDraftIdentity";

const intakeOperationsRoles = ["admin", "adminOwner", "support"] as const;
/** Paging two full exception inventories must fit in one window. */
export const listIntakeOperationsRateLimit = {
  maxRequests: 120, windowMs: 60 * 1000,
};
const supplyIntakeWorkflowId = "supply-intake";
const supplyIntakeStages = new Set([
  "incoming",
  "verify",
  "resolve",
  "ready",
]);

type IntakeOperationsReadRepository =
  OperationRunRepository & OperationWorkItemAdminReadRepository;

interface IntakeOperationsDeps {
  firestore: () => FirebaseFirestore.Firestore;
  repository?: IntakeOperationsReadRepository;
  now?: () => Date;
  checkRateLimit?: typeof defaultCheckRateLimit;
  loadOrganizerDraftLinks?: (
    db: FirebaseFirestore.Firestore,
    workItems: OperationWorkItem[]
  ) => Promise<OrganizerDraftLink[]>;
}

const defaultDeps: IntakeOperationsDeps = {
  firestore: () => admin.firestore(),
  now: () => new Date(),
  checkRateLimit: defaultCheckRateLimit,
};

export interface AdminListIntakeOperationsResponse {
  schemaVersion: 1;
  generatedAt: string;
  workflowId: typeof supplyIntakeWorkflowId;
  executionMode: "shadow";
  source: "firestore";
  capabilities: {
    requestRuns: false;
    networkFetches: false;
    modelCalls: false;
    publicWrites: false;
    ruleDeployment: false;
  };
  summary: {
    loadedRunCount: number;
    workItemCount: number;
    humanReviewCount: number;
    stages: Record<WorkItemPrimaryStage, number>;
  };
  runs: OperationRun[];
  workItems: OperationWorkItem[];
  workItemPage: {
    scannedCount: number;
    unavailableRecords: UnavailableWorkItem[];
  };
  organizerDraftLinks: OrganizerDraftLink[];
  nextRunCursor: string | null;
  nextWorkItemCursor: string | null;
}

export interface OrganizerDraftLink {
  workItemId: string;
  candidateId: string;
  organizerId: string;
  curationPath: string;
}

/**
 * Lists the durable, read-only Supply Intake operations projection.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {IntakeOperationsDeps} deps Injectable dependencies.
 * @return {Promise<AdminListIntakeOperationsResponse>} Persisted operations.
 */
export async function adminListIntakeOperationsHandler(
  request: CallableRequest<unknown>,
  deps: IntakeOperationsDeps = defaultDeps
): Promise<AdminListIntakeOperationsResponse> {
  const adminContext = requireAdminRole(request, intakeOperationsRoles);
  const data =
    validateCallableWithAjv<AdminListIntakeOperationsCallablePayload>(
      request,
      validateAdminListIntakeOperationsCallablePayload,
      normalizePayload
    );
  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    adminContext.uid,
    "adminListIntakeOperations",
    listIntakeOperationsRateLimit
  );

  const repository = deps.repository ??
    new FirestoreOperationsRepository(db);
  const workflowId = data.workflowId ?? supplyIntakeWorkflowId;
  const runsPage = data.runId ?
    await exactRunPage(repository, data.runId, workflowId, data.runStatus) :
    await repository.listRuns({
      workflowId,
      status: data.runStatus ?? undefined,
      limit: data.runLimit ?? 10,
      cursor: data.runCursor ?? undefined,
    });
  const shadowRuns = runsPage.items.filter((run) => run.mode === "shadow");
  const selectedRunId = shadowRuns[0]?.runId ?? null;
  const workItemsPage = selectedRunId ?
    await repository.listWorkItemsForAdmin({
      allowedPrimaryStages: [...supplyIntakeStages],
      workflowId,
      runId: selectedRunId,
      primaryStage: data.primaryStage ?? undefined,
      entityKind: data.entityKind ?? undefined,
      lifecycleStatus: data.lifecycleStatus ?? undefined,
      humanReviewRequired: data.humanReviewRequired ?? undefined,
      limit: data.workItemLimit ?? 200,
      cursor: data.workItemCursor ?? undefined,
    }) :
    {items: [], nextCursor: null, scannedCount: 0, unavailableRecords: []};
  const workItems = workItemsPage.items;
  if (workItems.some((item) =>
    item.workflowId !== supplyIntakeWorkflowId ||
    item.runId !== selectedRunId ||
    !supplyIntakeStages.has(item.primaryStage))) {
    throw new HttpsError(
      "failed-precondition",
      "Supply Intake work-item projection contains an invalid workflow " +
        "join or stage."
    );
  }
  const persistedSummary = shadowRuns[0] ?
    projectionSummary(shadowRuns[0]) : null;
  if (shadowRuns[0] && !persistedSummary) {
    throw new HttpsError(
      "failed-precondition",
      `Operations run ${shadowRuns[0].runId} is missing authoritative ` +
        "projection aggregates."
    );
  }
  const organizerDraftLinks = deps.loadOrganizerDraftLinks ?
    await deps.loadOrganizerDraftLinks(db, workItems) :
    deps.repository ?
      [] :
      await loadOrganizerDraftLinks(db, workItems);

  return {
    schemaVersion: 1,
    generatedAt: (deps.now?.() ?? new Date()).toISOString(),
    workflowId: supplyIntakeWorkflowId,
    executionMode: "shadow",
    source: "firestore",
    capabilities: {
      requestRuns: false,
      networkFetches: false,
      modelCalls: false,
      publicWrites: false,
      ruleDeployment: false,
    },
    summary: {
      loadedRunCount: shadowRuns.length,
      workItemCount: persistedSummary?.workItemCount ?? 0,
      humanReviewCount: persistedSummary?.humanReviewCount ?? 0,
      stages: persistedSummary?.stages ?? {
        incoming: 0,
        verify: 0,
        resolve: 0,
        ready: 0,
      },
    },
    runs: shadowRuns,
    workItems,
    workItemPage: {
      scannedCount: workItemsPage.scannedCount,
      unavailableRecords: workItemsPage.unavailableRecords,
    },
    organizerDraftLinks,
    nextRunCursor: runsPage.nextCursor,
    nextWorkItemCursor: workItemsPage.nextCursor,
  };
}

export async function loadOrganizerDraftLinks(
  db: FirebaseFirestore.Firestore,
  workItems: OperationWorkItem[]
): Promise<OrganizerDraftLink[]> {
  const sources = workItems.flatMap((item) => {
    if (item.entityKind !== "organizer") return [];
    const intake = recordValue(item.normalizedPayload.intake);
    const candidate = recordValue(intake?.candidate);
    if (
      intake?.recordType !== "organizer_search_candidate" ||
      !candidate ||
      typeof candidate.candidateId !== "string" ||
      item.externalKey !== candidate.candidateId
    ) {
      return [];
    }
    const normalizedKey = nonEmptyString(candidate.normalizedKey) ??
      nonEmptyString(candidate.canonicalUrl)?.toLowerCase();
    if (!normalizedKey) return [];
    return [{
      workItemId: item.workItemId,
      candidateId: candidate.candidateId,
      normalizedKey,
      operationId: organizerDraftOperationId(normalizedKey),
    }];
  });
  if (sources.length === 0) return [];
  const sourceByOperationId = new Map(sources.map((source) => [
    source.operationId,
    source,
  ]));
  const refs = Array.from(sourceByOperationId.keys()).map((operationId) =>
    db.collection("organizerIntakeCurationDecisions").doc(operationId)
  );
  const snapshots = await db.getAll(...refs);
  return snapshots.flatMap((snapshot) => {
    if (!snapshot.exists) return [];
    const source = sourceByOperationId.get(snapshot.id);
    const value = snapshot.data();
    if (
      !source ||
      value?.operationType !== "create_entity_draft" ||
      value.sourceCandidateId !== source.candidateId ||
      value.sourceNormalizedKey !== source.normalizedKey ||
      typeof value.entityId !== "string"
    ) {
      return [];
    }
    return [{
      workItemId: source.workItemId,
      candidateId: source.candidateId,
      organizerId: value.entityId,
      curationPath: snapshot.ref.path,
    }];
  });
}

async function exactRunPage(
  repository: IntakeOperationsReadRepository,
  runId: string,
  workflowId: string,
  runStatus: OperationRun["status"] | null | undefined
) {
  const run = await repository.getRun(runId);
  const matches = run?.workflowId === workflowId &&
    (!runStatus || run.status === runStatus);
  return {items: matches && run ? [run] : [], nextCursor: null};
}

function projectionSummary(run: OperationRun): {
  workItemCount: number;
  humanReviewCount: number;
  stages: Record<WorkItemPrimaryStage, number>;
} | null {
  const value = run.metadata.projection;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const projection = value as Record<string, unknown>;
  const stagesValue = projection.stageCounts;
  if (!stagesValue || typeof stagesValue !== "object" ||
      Array.isArray(stagesValue)) return null;
  const counts = stagesValue as Record<string, unknown>;
  const workItemCount = nonNegativeInteger(projection.workItemCount);
  const activeItems = nonNegativeInteger(projection.activeItems);
  const terminalItems = nonNegativeInteger(projection.terminalItems);
  const humanReviewCount = nonNegativeInteger(projection.humanReviewCount);
  const incoming = nonNegativeInteger(counts.incoming);
  const verify = nonNegativeInteger(counts.verify);
  const resolve = nonNegativeInteger(counts.resolve);
  const ready = nonNegativeInteger(counts.ready);
  if ([
    workItemCount,
    activeItems,
    terminalItems,
    humanReviewCount,
    incoming,
    verify,
    resolve,
    ready,
  ].some((entry) => entry === null)) return null;
  if ((activeItems as number) + (terminalItems as number) !==
        workItemCount ||
      (incoming as number) + (verify as number) + (resolve as number) +
        (ready as number) !== activeItems ||
      (humanReviewCount as number) > (activeItems as number) ||
      !Number.isSafeInteger(run.budgets.maxWorkItems) ||
      run.budgets.maxWorkItems < 1 ||
      run.budgets.maxWorkItems > MAX_OPERATION_WORK_ITEMS_PER_RUN ||
      (workItemCount as number) > run.budgets.maxWorkItems) {
    return null;
  }
  return {
    workItemCount: workItemCount as number,
    humanReviewCount: humanReviewCount as number,
    stages: {
      incoming: incoming as number,
      verify: verify as number,
      resolve: resolve as number,
      ready: ready as number,
    },
  };
}

function nonNegativeInteger(value: unknown): number | null {
  return Number.isInteger(value) && (value as number) >= 0 ?
    value as number : null;
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ?
    value as Record<string, unknown> :
    null;
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizePayload(value: unknown): unknown {
  if (value === undefined || value === null) return {};
  if (typeof value !== "object" || Array.isArray(value)) return value;
  const data = value as Record<string, unknown>;
  return {
    ...data,
    workflowId: normalizeOptionalString(data.workflowId),
    runId: normalizeNullableString(data.runId),
    primaryStage: normalizeNullableString(data.primaryStage),
    entityKind: normalizeNullableString(data.entityKind),
    lifecycleStatus: normalizeNullableString(data.lifecycleStatus),
    runStatus: normalizeNullableString(data.runStatus),
    runCursor: normalizeNullableString(data.runCursor),
    // Document-ID cursors are opaque, including malformed IDs with spaces.
    workItemCursor: data.workItemCursor ?? null,
  };
}

function normalizeOptionalString(value: unknown): unknown {
  if (value === undefined) return undefined;
  return normalizeNullableString(value);
}

function normalizeNullableString(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export const adminListIntakeOperations = onCall(
  appCheckCallableOptions,
  (request) => adminListIntakeOperationsHandler(request)
);
