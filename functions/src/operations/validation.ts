import {ValidateFunction} from "ajv";
import {
  validateOperationRun as validateOperationRunContract,
} from "../shared/generated/validators/operationRunContract";
import {
  validateOperationWorkItem as validateOperationWorkItemContract,
} from "../shared/generated/validators/operationWorkItemContract";
import {
  OperationActionReceipt,
  OperationDecision,
  OperationLease,
  OperationMetricSet,
  OperationPublicationPlan,
  OperationRuleEvaluation,
  OperationRuleProposal,
  OperationRun,
  OperationWorkItem,
  MAX_OPERATION_WORK_ITEMS_PER_RUN,
} from "./models";

export interface ValidationIssue {
  path: string;
  code: string;
  message: string;
}

export type ValidationResult<T> =
  | {ok: true; value: T; issues: []}
  | {ok: false; issues: ValidationIssue[]};

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,179}$/;
const WORKFLOW_PATTERN = /^[a-z][a-z0-9_-]{0,119}$/;
const CODE_PATTERN = /^[a-z][a-z0-9_.:-]{0,119}$/;
const STAGE_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

function recordValue(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function required(
  record: Record<string, unknown>,
  fields: readonly string[],
  issues: ValidationIssue[]
): void {
  for (const field of fields) {
    if (!(field in record)) {
      issues.push({
        path: field,
        code: "required",
        message: `${field} is required`,
      });
    }
  }
}

function checkString(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  pattern?: RegExp
): value is string {
  if (typeof value !== "string" || !value.length ||
      (pattern && !pattern.test(value))) {
    issues.push({path, code: "invalid_string", message: `${path} is invalid`});
    return false;
  }
  return true;
}

function checkOptionalString(
  value: unknown,
  path: string,
  issues: ValidationIssue[]
): void {
  if (value !== null && typeof value !== "string") {
    issues.push({
      path,
      code: "invalid_optional_string",
      message: `${path} must be a string or null`,
    });
  }
}

function checkInteger(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  minimum = 0,
  maximum = Number.MAX_SAFE_INTEGER
): value is number {
  if (!Number.isInteger(value) ||
      (value as number) < minimum ||
      (value as number) > maximum) {
    issues.push({
      path,
      code: "invalid_integer",
      message: `${path} must be an integer from ${minimum} to ${maximum}`,
    });
    return false;
  }
  return true;
}

function checkEnum(
  value: unknown,
  path: string,
  allowed: readonly string[],
  issues: ValidationIssue[]
): value is string {
  if (typeof value !== "string" || !allowed.includes(value)) {
    issues.push({
      path,
      code: "invalid_enum",
      message: `${path} must be one of ${allowed.join(", ")}`,
    });
    return false;
  }
  return true;
}

function checkIsoDateTime(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  nullable = false
): value is string | null {
  if (nullable && value === null) return true;
  if (typeof value !== "string" ||
      !Number.isFinite(Date.parse(value)) ||
      !value.includes("T")) {
    issues.push({
      path,
      code: "invalid_datetime",
      message: `${path} must be an ISO date-time${nullable ? " or null" : ""}`,
    });
    return false;
  }
  return true;
}

function checkBoolean(
  value: unknown,
  path: string,
  issues: ValidationIssue[]
): value is boolean {
  if (typeof value !== "boolean") {
    issues.push({
      path,
      code: "invalid_boolean",
      message: `${path} must be a boolean`,
    });
    return false;
  }
  return true;
}

function checkStringArray(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  options: {required?: boolean; pattern?: RegExp} = {}
): value is string[] {
  if (!Array.isArray(value) ||
      value.some((entry) => typeof entry !== "string" ||
        (options.pattern && !options.pattern.test(entry)))) {
    issues.push({
      path,
      code: "invalid_string_array",
      message: `${path} must contain valid strings`,
    });
    return false;
  }
  if (options.required && value.length === 0) {
    issues.push({
      path,
      code: "empty_array",
      message: `${path} must not be empty`,
    });
  }
  if (new Set(value).size !== value.length) {
    issues.push({
      path,
      code: "duplicate_array_value",
      message: `${path} must contain unique values`,
    });
  }
  return true;
}

function checkActor(
  value: unknown,
  path: string,
  issues: ValidationIssue[]
): void {
  const actor = recordValue(value);
  if (!actor) {
    issues.push({path, code: "invalid_actor", message: `${path} is invalid`});
    return;
  }
  checkEnum(
    actor.actorType,
    `${path}.actorType`,
    ["human", "agent", "system"],
    issues
  );
  checkString(actor.actorId, `${path}.actorId`, issues, ID_PATTERN);
}

function checkMetricSet(
  value: unknown,
  path: string,
  issues: ValidationIssue[]
): void {
  const metrics = recordValue(value);
  if (!metrics) {
    issues.push({
      path,
      code: "invalid_metric_set",
      message: `${path} is invalid`,
    });
    return;
  }
  const keys: Array<keyof OperationMetricSet> = [
    "fieldExactness",
    "eventPrecision",
    "duplicatePrecision",
    "duplicateRecall",
    "correctionRate",
    "escalationRate",
  ];
  for (const key of keys) {
    const metric = metrics[key];
    if (typeof metric !== "number" || !Number.isFinite(metric) ||
        metric < 0 || metric > 1) {
      issues.push({
        path: `${path}.${key}`,
        code: "invalid_metric",
        message: `${path}.${key} must be between 0 and 1`,
      });
    }
  }
}

function checkEvidenceRefs(
  value: unknown,
  path: string,
  issues: ValidationIssue[]
): void {
  if (!Array.isArray(value)) {
    issues.push({
      path,
      code: "invalid_evidence_refs",
      message: `${path} must be an array`,
    });
    return;
  }
  value.forEach((entry, index) => {
    const evidence = recordValue(entry);
    const itemPath = `${path}[${index}]`;
    if (!evidence) {
      issues.push({
        path: itemPath,
        code: "invalid_evidence_ref",
        message: `${itemPath} is invalid`,
      });
      return;
    }
    checkString(
      evidence.artifactId,
      `${itemPath}.artifactId`,
      issues,
      ID_PATTERN
    );
    checkString(evidence.contentHash, `${itemPath}.contentHash`, issues,
      SHA256_PATTERN);
    checkIsoDateTime(evidence.observedAt, `${itemPath}.observedAt`, issues);
    checkOptionalString(evidence.locator, `${itemPath}.locator`, issues);
  });
}

function checkFailure(
  value: unknown,
  path: string,
  issues: ValidationIssue[]
): void {
  if (value === null) return;
  const failure = recordValue(value);
  if (!failure) {
    issues.push({
      path,
      code: "invalid_failure",
      message: `${path} is invalid`,
    });
    return;
  }
  checkString(failure.code, `${path}.code`, issues, CODE_PATTERN);
  checkString(failure.message, `${path}.message`, issues);
  checkBoolean(failure.retryable, `${path}.retryable`, issues);
}

function finish<T>(value: unknown, issues: ValidationIssue[]):
  ValidationResult<T> {
  if (issues.length) return {ok: false, issues};
  return {ok: true, value: value as T, issues: []};
}

function checkCanonicalSchema<T>(
  validator: ValidateFunction<T>,
  value: unknown,
  issues: ValidationIssue[]
): void {
  if (validator(value)) return;
  for (const error of validator.errors ?? []) {
    const missingProperty = typeof error.params?.missingProperty === "string" ?
      `/${error.params.missingProperty}` : "";
    issues.push({
      path: `${error.instancePath || "$"}${missingProperty}`,
      code: `schema_${error.keyword}`,
      message: error.message ?? "value failed canonical schema validation",
    });
  }
}

export function validateOperationRun(value: unknown):
  ValidationResult<OperationRun> {
  const issues: ValidationIssue[] = [];
  const run = recordValue(value);
  if (!run) {
    return {ok: false, issues: [{
      path: "$",
      code: "invalid_object",
      message: "run must be an object",
    }]};
  }
  required(run, [
    "schemaVersion", "runId", "workflowId", "revision", "mode", "status",
    "scope", "rulesetVersion", "policyVersion", "inputHash", "budgets",
    "counters", "checkpoint", "createdAt", "updatedAt", "startedAt",
    "finishedAt", "failure", "metadata",
  ], issues);
  if (run.schemaVersion !== 1) {
    issues.push({path: "schemaVersion", code: "schema_version",
      message: "schemaVersion must be 1"});
  }
  checkString(run.runId, "runId", issues, ID_PATTERN);
  checkString(run.workflowId, "workflowId", issues, WORKFLOW_PATTERN);
  checkInteger(run.revision, "revision", issues);
  checkEnum(run.mode, "mode", ["shadow", "assisted", "autonomous"], issues);
  checkEnum(run.status, "status", [
    "planned", "queued", "running", "paused", "completed", "failed",
    "cancelled",
  ], issues);
  checkString(run.rulesetVersion, "rulesetVersion", issues);
  checkString(run.policyVersion, "policyVersion", issues);
  checkString(run.inputHash, "inputHash", issues, SHA256_PATTERN);
  if (!recordValue(run.scope)) {
    issues.push({path: "scope", code: "invalid_scope",
      message: "scope must be an object"});
  }
  if (!recordValue(run.metadata)) {
    issues.push({path: "metadata", code: "invalid_metadata",
      message: "metadata must be an object"});
  }
  checkIsoDateTime(run.createdAt, "createdAt", issues);
  checkIsoDateTime(run.updatedAt, "updatedAt", issues);
  checkIsoDateTime(run.startedAt, "startedAt", issues, true);
  checkIsoDateTime(run.finishedAt, "finishedAt", issues, true);
  checkFailure(run.failure, "failure", issues);
  const budgets = recordValue(run.budgets);
  if (!budgets) {
    issues.push({path: "budgets", code: "invalid_budgets",
      message: "budgets must be an object"});
  } else {
    checkInteger(
      budgets.maxWorkItems,
      "budgets.maxWorkItems",
      issues,
      1,
      MAX_OPERATION_WORK_ITEMS_PER_RUN
    );
    checkInteger(budgets.maxModelCalls, "budgets.maxModelCalls", issues);
    checkInteger(budgets.maxModelTokens, "budgets.maxModelTokens", issues);
    checkInteger(budgets.maxCostMicros, "budgets.maxCostMicros", issues);
    checkIsoDateTime(budgets.deadlineAt, "budgets.deadlineAt", issues, true);
  }
  const counters = recordValue(run.counters);
  if (!counters) {
    issues.push({path: "counters", code: "invalid_counters",
      message: "counters must be an object"});
  } else {
    for (const key of ["discovered", "processed", "modelCalls", "modelTokens",
      "costMicros", "escalated", "published", "failed"]) {
      checkInteger(counters[key], `counters.${key}`, issues);
    }
    if (budgets && typeof counters.modelCalls === "number" &&
        typeof budgets.maxModelCalls === "number" &&
        counters.modelCalls > budgets.maxModelCalls) {
      issues.push({path: "counters.modelCalls", code: "run_budget_exceeded",
        message: "model call counter exceeds its frozen budget"});
    }
  }
  const checkpoint = recordValue(run.checkpoint);
  if (!checkpoint) {
    issues.push({path: "checkpoint", code: "invalid_checkpoint",
      message: "checkpoint must be an object"});
  } else {
    checkInteger(
      checkpoint.lastSequence,
      "checkpoint.lastSequence",
      issues
    );
    checkOptionalString(checkpoint.cursor, "checkpoint.cursor", issues);
  }
  const terminal = ["completed", "failed", "cancelled"].includes(
    String(run.status)
  );
  if (terminal && run.finishedAt === null) {
    issues.push({path: "finishedAt", code: "run_terminal_finished_at",
      message: "terminal runs require finishedAt"});
  }
  if (run.status === "running" && run.startedAt === null) {
    issues.push({path: "startedAt", code: "run_started_at",
      message: "running runs require startedAt"});
  }
  if (run.status === "failed" && run.failure === null) {
    issues.push({path: "failure", code: "run_failure_required",
      message: "failed runs require failure details"});
  }
  checkCanonicalSchema(validateOperationRunContract, value, issues);
  return finish<OperationRun>(value, issues);
}

export function validateOperationWorkItem(value: unknown):
  ValidationResult<OperationWorkItem> {
  const issues: ValidationIssue[] = [];
  const item = recordValue(value);
  if (!item) {
    return {ok: false, issues: [{path: "$", code: "invalid_object",
      message: "work item must be an object"}]};
  }
  required(item, [
    "schemaVersion", "workItemId", "workflowId", "runId", "entityKind",
    "externalKey", "revision", "candidateHash", "primaryStage",
    "lifecycleStatus", "outcome", "taskFlags", "blockerCodes",
    "warningCodes", "priority", "attemptCount", "evidenceRefs",
    "fieldProvenance", "normalizedPayload", "decisionId",
    "publicationPlanId", "createdAt", "updatedAt", "staleAt", "expiresAt",
  ], issues);
  if (item.schemaVersion !== 1) {
    issues.push({path: "schemaVersion", code: "schema_version",
      message: "schemaVersion must be 1"});
  }
  checkString(item.workItemId, "workItemId", issues, ID_PATTERN);
  checkString(item.workflowId, "workflowId", issues, WORKFLOW_PATTERN);
  checkString(item.runId, "runId", issues, ID_PATTERN);
  checkString(item.entityKind, "entityKind", issues, STAGE_PATTERN);
  checkOptionalString(item.externalKey, "externalKey", issues);
  checkInteger(item.revision, "revision", issues);
  checkString(item.candidateHash, "candidateHash", issues, SHA256_PATTERN);
  checkString(item.primaryStage, "primaryStage", issues, STAGE_PATTERN);
  checkEnum(item.lifecycleStatus, "lifecycleStatus", [
    "queued", "in_progress", "waiting", "ready", "published", "terminal",
  ], issues);
  if (item.outcome !== null) {
    checkString(item.outcome, "outcome", issues, CODE_PATTERN);
  }
  checkStringArray(
    item.taskFlags,
    "taskFlags",
    issues,
    {pattern: CODE_PATTERN}
  );
  checkStringArray(item.blockerCodes, "blockerCodes", issues,
    {pattern: CODE_PATTERN});
  checkStringArray(item.warningCodes, "warningCodes", issues,
    {pattern: CODE_PATTERN});
  checkInteger(item.priority, "priority", issues);
  checkInteger(item.attemptCount, "attemptCount", issues);
  checkEvidenceRefs(item.evidenceRefs, "evidenceRefs", issues);
  if (!Array.isArray(item.fieldProvenance)) {
    issues.push({path: "fieldProvenance", code: "invalid_field_provenance",
      message: "fieldProvenance must be an array"});
  }
  const normalizedPayload = recordValue(item.normalizedPayload);
  if (!normalizedPayload) {
    issues.push({path: "normalizedPayload", code: "invalid_payload",
      message: "normalizedPayload must be an object"});
  }
  const humanReviewSignalled = (
    Array.isArray(item.blockerCodes) &&
      item.blockerCodes.includes("human_review_required")
  ) || normalizedPayload?.owner === "human";
  if (humanReviewSignalled &&
      (!Array.isArray(item.taskFlags) ||
        !item.taskFlags.includes("human_review_required"))) {
    issues.push({
      path: "taskFlags",
      code: "human_review_task_flag_required",
      message: "human review signals require the canonical task flag",
    });
  }
  if (item.decisionId !== null) {
    checkString(item.decisionId, "decisionId", issues, ID_PATTERN);
  }
  if (item.publicationPlanId !== null) {
    checkString(
      item.publicationPlanId,
      "publicationPlanId",
      issues,
      ID_PATTERN
    );
  }
  checkIsoDateTime(item.createdAt, "createdAt", issues);
  checkIsoDateTime(item.updatedAt, "updatedAt", issues);
  checkIsoDateTime(item.staleAt, "staleAt", issues, true);
  checkIsoDateTime(item.expiresAt, "expiresAt", issues, true);
  if (item.lifecycleStatus === "terminal" && item.outcome === null) {
    issues.push({path: "outcome", code: "work_item_terminal_outcome",
      message: "terminal work items require an outcome"});
  }
  if (item.lifecycleStatus !== "terminal" &&
      item.lifecycleStatus !== "published" && item.outcome !== null) {
    issues.push({path: "outcome", code: "work_item_nonterminal_outcome",
      message: "nonterminal work items cannot have an outcome"});
  }
  if (item.lifecycleStatus === "published" && item.outcome !== "published") {
    issues.push({path: "outcome", code: "work_item_published_outcome",
      message: "published work items require the published outcome"});
  }
  checkCanonicalSchema(validateOperationWorkItemContract, value, issues);
  return finish<OperationWorkItem>(value, issues);
}

export function validateOperationActionReceipt(value: unknown):
  ValidationResult<OperationActionReceipt> {
  const issues: ValidationIssue[] = [];
  const receipt = recordValue(value);
  if (!receipt) {
    return {ok: false, issues: [{path: "$", code: "invalid_object",
      message: "action receipt must be an object"}]};
  }
  checkString(receipt.actionId, "actionId", issues, ID_PATTERN);
  checkString(receipt.runId, "runId", issues, ID_PATTERN);
  checkString(receipt.workItemId, "workItemId", issues, ID_PATTERN);
  checkInteger(receipt.sequence, "sequence", issues, 1);
  checkString(receipt.operation, "operation", issues, CODE_PATTERN);
  checkEnum(receipt.status, "status", [
    "started", "succeeded", "failed", "skipped",
  ], issues);
  const fromRevision = receipt.fromRevision;
  const toRevision = receipt.toRevision;
  const fromValid = checkInteger(fromRevision, "fromRevision", issues);
  const toValid = checkInteger(toRevision, "toRevision", issues);
  if (fromValid && toValid && toRevision < fromRevision) {
    issues.push({path: "toRevision", code: "action_revision_order",
      message: "toRevision cannot precede fromRevision"});
  }
  checkActor(receipt.actor, "actor", issues);
  checkString(receipt.idempotencyKey, "idempotencyKey", issues, ID_PATTERN);
  checkString(receipt.inputHash, "inputHash", issues, SHA256_PATTERN);
  if (receipt.outputHash !== null) {
    checkString(receipt.outputHash, "outputHash", issues, SHA256_PATTERN);
  }
  checkString(receipt.rulesetVersion, "rulesetVersion", issues);
  checkOptionalString(receipt.modelVersion, "modelVersion", issues);
  checkStringArray(receipt.reasonCodes, "reasonCodes", issues,
    {pattern: CODE_PATTERN});
  checkIsoDateTime(receipt.occurredAt, "occurredAt", issues);
  checkIsoDateTime(receipt.completedAt, "completedAt", issues, true);
  checkFailure(receipt.failure, "failure", issues);
  if (receipt.status === "failed" && receipt.failure === null) {
    issues.push({path: "failure", code: "action_failure_required",
      message: "failed actions require failure details"});
  }
  if (["succeeded", "failed", "skipped"].includes(String(receipt.status)) &&
      receipt.completedAt === null) {
    issues.push({path: "completedAt", code: "action_completion_required",
      message: "completed actions require completedAt"});
  }
  return finish<OperationActionReceipt>(value, issues);
}

export function validateOperationDecision(value: unknown):
  ValidationResult<OperationDecision> {
  const issues: ValidationIssue[] = [];
  const decision = recordValue(value);
  if (!decision) {
    return {ok: false, issues: [{path: "$", code: "invalid_object",
      message: "decision must be an object"}]};
  }
  checkString(decision.decisionId, "decisionId", issues, ID_PATTERN);
  checkString(decision.runId, "runId", issues, ID_PATTERN);
  checkString(decision.workItemId, "workItemId", issues, ID_PATTERN);
  checkInteger(decision.workItemRevision, "workItemRevision", issues);
  checkEnum(decision.decision, "decision", [
    "approve", "reject", "escalate", "hold",
  ], issues);
  checkEnum(decision.status, "status", [
    "proposed", "accepted", "superseded", "revoked",
  ], issues);
  checkActor(decision.actor, "actor", issues);
  checkStringArray(decision.reasonCodes, "reasonCodes", issues,
    {required: true, pattern: CODE_PATTERN});
  checkOptionalString(decision.rationale, "rationale", issues);
  checkEvidenceRefs(decision.evidenceRefs, "evidenceRefs", issues);
  checkString(decision.rulesetVersion, "rulesetVersion", issues);
  checkOptionalString(decision.modelVersion, "modelVersion", issues);
  if (decision.calibratedConfidence !== null &&
      (typeof decision.calibratedConfidence !== "number" ||
       decision.calibratedConfidence < 0 ||
       decision.calibratedConfidence > 1)) {
    issues.push({path: "calibratedConfidence", code: "invalid_confidence",
      message: "calibratedConfidence must be between 0 and 1 or null"});
  }
  checkBoolean(decision.auditRequired, "auditRequired", issues);
  checkIsoDateTime(decision.createdAt, "createdAt", issues);
  checkIsoDateTime(decision.effectiveAt, "effectiveAt", issues, true);
  if (decision.status === "accepted" && decision.effectiveAt === null) {
    issues.push({path: "effectiveAt", code: "decision_effective_at",
      message: "accepted decisions require effectiveAt"});
  }
  return finish<OperationDecision>(value, issues);
}

export function validateOperationLease(value: unknown):
  ValidationResult<OperationLease> {
  const issues: ValidationIssue[] = [];
  const lease = recordValue(value);
  if (!lease) {
    return {ok: false, issues: [{path: "$", code: "invalid_object",
      message: "lease must be an object"}]};
  }
  checkString(lease.leaseId, "leaseId", issues, ID_PATTERN);
  checkEnum(lease.resourceType, "resourceType", ["run", "work_item"], issues);
  checkString(lease.resourceId, "resourceId", issues, ID_PATTERN);
  checkString(lease.ownerId, "ownerId", issues, ID_PATTERN);
  checkInteger(lease.fencingToken, "fencingToken", issues, 1);
  checkEnum(lease.status, "status", ["active", "released", "expired"], issues);
  checkString(lease.idempotencyKey, "idempotencyKey", issues, ID_PATTERN);
  const acquiredValid = checkIsoDateTime(
    lease.acquiredAt, "acquiredAt", issues
  );
  const heartbeatValid = checkIsoDateTime(
    lease.heartbeatAt, "heartbeatAt", issues
  );
  const expiresValid = checkIsoDateTime(lease.expiresAt, "expiresAt", issues);
  checkIsoDateTime(lease.releasedAt, "releasedAt", issues, true);
  const acquiredAt = Date.parse(String(lease.acquiredAt));
  const heartbeatAt = Date.parse(String(lease.heartbeatAt));
  const expiresAt = Date.parse(String(lease.expiresAt));
  if (acquiredValid && heartbeatValid && heartbeatAt < acquiredAt) {
    issues.push({path: "heartbeatAt", code: "lease_heartbeat_order",
      message: "heartbeatAt cannot precede acquiredAt"});
  }
  if (heartbeatValid && expiresValid && expiresAt <= heartbeatAt) {
    issues.push({path: "expiresAt", code: "lease_expiry_order",
      message: "expiresAt must follow heartbeatAt"});
  }
  if (lease.status === "released" && lease.releasedAt === null) {
    issues.push({path: "releasedAt", code: "lease_release_time",
      message: "released leases require releasedAt"});
  }
  return finish<OperationLease>(value, issues);
}

export function validateOperationPublicationPlan(value: unknown):
  ValidationResult<OperationPublicationPlan> {
  const issues: ValidationIssue[] = [];
  const plan = recordValue(value);
  if (!plan) {
    return {ok: false, issues: [{path: "$", code: "invalid_object",
      message: "publication plan must be an object"}]};
  }
  checkString(plan.publicationPlanId, "publicationPlanId", issues, ID_PATTERN);
  checkString(plan.runId, "runId", issues, ID_PATTERN);
  checkInteger(plan.revision, "revision", issues);
  checkEnum(plan.environment, "environment", [
    "development", "production",
  ], issues);
  checkEnum(plan.mode, "mode", ["shadow", "dry_run", "apply"], issues);
  checkEnum(plan.status, "status", [
    "drafted", "preflight_passed", "applied", "rejected", "expired",
  ], issues);
  checkString(plan.contentHash, "contentHash", issues, SHA256_PATTERN);
  checkString(plan.rulesetVersion, "rulesetVersion", issues);
  checkString(plan.policyVersion, "policyVersion", issues);
  if (!Array.isArray(plan.workItemInputs) || plan.workItemInputs.length === 0) {
    issues.push({path: "workItemInputs", code: "publication_inputs_required",
      message: "publication plans require work item inputs"});
  }
  if (!Array.isArray(plan.mutations) || plan.mutations.length === 0) {
    issues.push({path: "mutations", code: "publication_mutations_required",
      message: "publication plans require mutations"});
  }
  checkActor(plan.createdBy, "createdBy", issues);
  checkIsoDateTime(plan.createdAt, "createdAt", issues);
  checkIsoDateTime(plan.validUntil, "validUntil", issues);
  checkIsoDateTime(plan.preflightAt, "preflightAt", issues, true);
  checkIsoDateTime(plan.appliedAt, "appliedAt", issues, true);
  const inputs = Array.isArray(plan.workItemInputs) ? plan.workItemInputs : [];
  const inputIds = inputs.map((entry) => recordValue(entry)?.workItemId);
  if (new Set(inputIds).size !== inputIds.length) {
    issues.push({path: "workItemInputs", code: "publication_duplicate_input",
      message: "work item inputs must be unique"});
  }
  const inputSet = new Set(inputIds.filter(
    (entry): entry is string => typeof entry === "string"
  ));
  const mutations = Array.isArray(plan.mutations) ? plan.mutations : [];
  mutations.forEach((entry, index) => {
    const mutation = recordValue(entry);
    if (!mutation || typeof mutation.workItemId !== "string" ||
        !inputSet.has(mutation.workItemId)) {
      issues.push({path: `mutations[${index}].workItemId`,
        code: "publication_unknown_work_item",
        message: "every mutation must reference a plan input"});
    }
  });
  if (["preflight_passed", "applied"].includes(String(plan.status)) &&
      plan.preflightAt === null) {
    issues.push({path: "preflightAt", code: "publication_preflight_required",
      message: "preflighted or applied plans require preflightAt"});
  }
  if (plan.status === "applied" &&
      (plan.mode !== "apply" || plan.appliedAt === null)) {
    issues.push({path: "appliedAt", code: "publication_apply_required",
      message: "applied plans require apply mode and appliedAt"});
  }
  if (plan.environment === "production" && plan.mode === "shadow") {
    issues.push({path: "mode", code: "publication_shadow_production",
      message: "shadow plans cannot target production"});
  }
  return finish<OperationPublicationPlan>(value, issues);
}

export function validateOperationRuleProposal(value: unknown):
  ValidationResult<OperationRuleProposal> {
  const issues: ValidationIssue[] = [];
  const proposal = recordValue(value);
  if (!proposal) {
    return {ok: false, issues: [{path: "$", code: "invalid_object",
      message: "rule proposal must be an object"}]};
  }
  checkString(proposal.ruleProposalId, "ruleProposalId", issues, ID_PATTERN);
  checkString(proposal.workflowId, "workflowId", issues, WORKFLOW_PATTERN);
  checkInteger(proposal.revision, "revision", issues);
  checkString(proposal.sourceProfileId, "sourceProfileId", issues, ID_PATTERN);
  checkString(proposal.templateFingerprint, "templateFingerprint", issues,
    SHA256_PATTERN);
  checkEnum(proposal.proposalKind, "proposalKind", [
    "declarative_rule", "source_extractor",
  ], issues);
  checkEnum(proposal.status, "status", [
    "observed", "proposed", "replay_ready", "shadow", "canary", "active",
    "rejected", "retired",
  ], issues);
  checkString(
    proposal.baselineRulesetVersion,
    "baselineRulesetVersion",
    issues
  );
  checkString(proposal.candidateRuleVersion, "candidateRuleVersion", issues);
  checkString(proposal.candidateArtifactId, "candidateArtifactId", issues,
    ID_PATTERN);
  checkString(proposal.candidateHash, "candidateHash", issues, SHA256_PATTERN);
  checkStringArray(proposal.failureCodes, "failureCodes", issues,
    {required: true, pattern: CODE_PATTERN});
  checkStringArray(proposal.evidenceWorkItemIds, "evidenceWorkItemIds", issues,
    {required: true, pattern: ID_PATTERN});
  checkInteger(proposal.minimumSampleSize, "minimumSampleSize", issues, 1);
  checkMetricSet(proposal.activationThresholds, "activationThresholds", issues);
  checkActor(proposal.proposedBy, "proposedBy", issues);
  if (proposal.requiresHumanApproval !== true) {
    issues.push({path: "requiresHumanApproval",
      code: "rule_human_approval_required",
      message: "learned rules always require human approval"});
  }
  checkIsoDateTime(proposal.createdAt, "createdAt", issues);
  checkIsoDateTime(proposal.updatedAt, "updatedAt", issues);
  return finish<OperationRuleProposal>(value, issues);
}

export function validateOperationRuleEvaluation(value: unknown):
  ValidationResult<OperationRuleEvaluation> {
  const issues: ValidationIssue[] = [];
  const evaluation = recordValue(value);
  if (!evaluation) {
    return {ok: false, issues: [{path: "$", code: "invalid_object",
      message: "rule evaluation must be an object"}]};
  }
  checkString(evaluation.ruleEvaluationId, "ruleEvaluationId", issues,
    ID_PATTERN);
  checkString(evaluation.ruleProposalId, "ruleProposalId", issues, ID_PATTERN);
  checkString(evaluation.candidateRuleVersion, "candidateRuleVersion", issues);
  checkEnum(evaluation.phase, "phase", [
    "replay", "holdout", "shadow", "canary", "production_watch",
  ], issues);
  checkString(evaluation.datasetHash, "datasetHash", issues, SHA256_PATTERN);
  checkInteger(evaluation.sampleSize, "sampleSize", issues, 1);
  checkMetricSet(evaluation.baselineMetrics, "baselineMetrics", issues);
  checkMetricSet(evaluation.candidateMetrics, "candidateMetrics", issues);
  checkMetricSet(evaluation.requiredThresholds, "requiredThresholds", issues);
  checkEnum(evaluation.result, "result", [
    "passed", "failed", "inconclusive",
  ], issues);
  checkEnum(evaluation.deploymentRecommendation, "deploymentRecommendation", [
    "do_not_promote", "advance_phase", "rollback", "retain",
  ], issues);
  checkStringArray(
    evaluation.disagreementWorkItemIds,
    "disagreementWorkItemIds",
    issues,
    {pattern: ID_PATTERN}
  );
  checkActor(evaluation.evaluatedBy, "evaluatedBy", issues);
  if (evaluation.independentEvaluator !== true) {
    issues.push({path: "independentEvaluator",
      code: "rule_independent_evaluator_required",
      message: "rule evaluations require an independent evaluator"});
  }
  checkIsoDateTime(evaluation.evaluatedAt, "evaluatedAt", issues);
  const metrics = recordValue(evaluation.candidateMetrics);
  const thresholds = recordValue(evaluation.requiredThresholds);
  if (evaluation.result === "passed" && metrics && thresholds &&
      !meetsThresholds(
        metrics as unknown as OperationMetricSet,
        thresholds as unknown as OperationMetricSet
      )) {
    issues.push({path: "result", code: "rule_thresholds_not_met",
      message: "a passed evaluation must meet every required threshold"});
  }
  return finish<OperationRuleEvaluation>(value, issues);
}

export function meetsThresholds(
  metrics: OperationMetricSet,
  thresholds: OperationMetricSet
): boolean {
  return metrics.fieldExactness >= thresholds.fieldExactness &&
    metrics.eventPrecision >= thresholds.eventPrecision &&
    metrics.duplicatePrecision >= thresholds.duplicatePrecision &&
    metrics.duplicateRecall >= thresholds.duplicateRecall &&
    metrics.correctionRate <= thresholds.correctionRate &&
    metrics.escalationRate <= thresholds.escalationRate;
}
