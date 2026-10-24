import path from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import {hashValue} from "./canonical-json.mjs";
import {
  MAX_WORK_ITEMS_PER_RUN,
  safeId,
  uniqueSorted,
} from "./contracts.mjs";
import {OperationsError} from "./errors.mjs";
import {collectSchema} from "./schema-dependencies.mjs";

export function summarizeRun(run, items, actions = [], checkpoints = []) {
  const contract = workflowContract(run, items);
  const activeItems = items.filter((item) => isActive(item, contract));
  return {
    schemaVersion: 1,
    run: toCanonicalRunRecord(run, items, actions, checkpoints),
    summary: {
      totalItems: items.length,
      activeItems: activeItems.length,
      terminalItems: items.length - activeItems.length,
      stageCounts: counts(contract.primaryStages, activeItems,
        (item) => item.primaryStage),
      lifecycleCounts: counts(
        contract.lifecycleStatuses,
        items,
        (item) => item.lifecycleStatus
      ),
      entityCounts: counts(contract.entityKinds, items,
        (item) => item.entityKind),
      ownerCounts: dynamicCounts(activeItems, (item) => item.owner),
      blockerCounts: dynamicCounts(activeItems.flatMap((item) => item.blockers), (value) => value),
      taskFlagCounts: dynamicCounts(activeItems.flatMap((item) => item.taskFlags), (value) => value),
      actions: run.status === "completed" ?
        run.counters.actions : actions.length,
      checkpoints: checkpoints.length,
    },
  };
}

export function queueProjection(items, {
  limit = 100,
  includeTerminal = false,
  primaryStages,
  lifecycleSemantics,
} = {}) {
  const stages = primaryStages ?? uniqueSorted(items.map((item) =>
    item.primaryStage));
  const contract = projectionContract({
    primaryStages: stages,
    lifecycleSemantics,
  });
  return items
    .filter((item) => includeTerminal || isActive(item, contract))
    .sort((left, right) => compareQueueItems(left, right, contract))
    .slice(0, limit)
    .map((item) => toCanonicalWorkItemRecord(item, contract));
}

export function buildAdminProjection(run, items, actions = [], checkpoints = []) {
  const status = summarizeRun(run, items, actions, checkpoints);
  const contract = workflowContract(run, items);
  return {
    schemaVersion: 1,
    program: "catch-operations-admin-projection",
    workflowId: run.workflowId,
    workflowVersion: run.workflowVersion,
    generatedAt: run.updatedAt,
    run: status.run,
    summary: status.summary,
    stageOrder: [...contract.primaryStages],
    items: queueProjection(items, {
      limit: Number.MAX_SAFE_INTEGER,
      includeTerminal: true,
      primaryStages: contract.primaryStages,
      lifecycleSemantics: contract.lifecycleSemantics,
    }),
    guardrails: [
      "Run and item records conform to contracts/operations/run.schema.json and work_item.schema.json.",
      "This projection is read-only and contains no raw provider payloads.",
      "Primary stages are exclusive; task flags and blocker codes are overlapping concerns.",
      "Shadow decisions and ready items do not authorize publication.",
    ],
  };
}

export function toCanonicalRunRecord(run, items = [], actions = [], checkpoints = []) {
  const latestCheckpoint = checkpoints.find((checkpoint) => checkpoint.stepId === "deterministic-review") ??
    checkpoints.find((checkpoint) => checkpoint.stepId === "project-artifacts") ?? null;
  const consumed = run.budget?.consumed ?? {};
  const limits = run.budget?.limits ?? {};
  const contract = workflowContract(run, items);
  return {
    schemaVersion: 1,
    runId: run.runId,
    workflowId: run.workflowId,
    revision: run.revision ?? 0,
    mode: run.mode,
    status: run.status,
    scope: {
      market: run.plan?.market ?? null,
      intakeScope: run.plan?.intakeScope ?? "all",
      through: run.plan?.through ?? null,
      planId: run.planId,
    },
    rulesetVersion: `${run.workflowId}-v${run.workflowVersion}`,
    policyVersion: `${run.workflowId}-shadow-policy-v1`,
    inputHash: run.planHash,
    budgets: {
      maxWorkItems: limits.workItems ?? 1,
      maxModelCalls: limits.modelCalls ?? 0,
      maxModelTokens: (limits.modelInputTokens ?? 0) + (limits.modelOutputTokens ?? 0),
      maxCostMicros: limits.modelCostMicros ?? 0,
      deadlineAt: null,
    },
    counters: {
      discovered: items.length,
      processed: items.filter((item) =>
        item.primaryStage !== contract.primaryStages[0] ||
          !isActive(item, contract)).length,
      modelCalls: consumed.modelCalls ?? 0,
      modelTokens: (consumed.modelInputTokens ?? 0) + (consumed.modelOutputTokens ?? 0),
      costMicros: consumed.modelCostMicros ?? 0,
      escalated: items.filter((item) =>
        item.owner === "human" && isActive(item, contract)).length,
      published: items.filter((item) =>
        isPublished(item, contract)).length,
      failed: run.status === "failed" ? 1 : 0,
    },
    checkpoint: {
      lastSequence: run.status === "completed" ?
        run.counters.actions : actions.length,
      cursor: latestCheckpoint?.stepId ?? null,
    },
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
    startedAt: run.startedAt,
    finishedAt: run.completedAt,
    failure: run.failure ? {
      code: canonicalCode(run.failure.code ?? "run_failed"),
      message: String(run.failure.message ?? "Run failed."),
      retryable: false,
    } : null,
    metadata: {
      planHash: run.planHash,
      localCounters: run.counters,
      capabilities: run.capabilities,
      localBudget: run.budget,
      ...(run.plan?.organizerReviewPolicy ? {
        organizerReviewPolicy: run.plan.organizerReviewPolicy,
      } : {}),
    },
  };
}

export function toCanonicalWorkItemRecord(item, {
  primaryStages,
  lifecycleSemantics,
} = {}) {
  const contract = projectionContract({
    primaryStages,
    lifecycleSemantics,
  });
  const artifactId = safeId(`artifact-${item.evidence.artifactHash.slice(0, 32)}`);
  const evidenceRef = {
    artifactId,
    contentHash: item.evidence.artifactHash,
    observedAt: item.timestamps.observedAt ?? item.createdAt,
    locator: item.evidence.artifactRef ?? null,
  };
  const terminal = !isActive(item, contract);
  const confidence = boundedConfidence(item.confidence.overall);
  return {
    schemaVersion: 1,
    workItemId: item.workItemId,
    workflowId: item.workflowId,
    runId: item.runId,
    entityKind: item.entityKind,
    externalKey: item.sourceEntity.id ?? null,
    revision: item.revision ?? 0,
    candidateHash: hashValue({
      sourceEntity: item.sourceEntity,
      evidenceHash: item.evidence.artifactHash,
      decisionInputHash: item.decisionProvenance.inputHash,
    }),
    primaryStage: item.primaryStage,
    lifecycleStatus: canonicalLifecycleStatus(item, contract),
    outcome: terminal ? item.lifecycleStatus : null,
    taskFlags: uniqueSorted([
      ...item.taskFlags,
      ...(item.owner === "human" ? ["human_review_required"] : []),
    ]).map(canonicalCode),
    blockerCodes: uniqueSorted(item.blockers).map(canonicalCode),
    warningCodes: [],
    priority: priorityFor(item, contract.primaryStages),
    attemptCount: Math.max(1, (item.stageHistory?.length ?? 0) + 1),
    evidenceRefs: [evidenceRef],
    fieldProvenance: [
      fieldProvenance("sourceEntity.title", item, artifactId, confidence),
      fieldProvenance("source.url", item, artifactId, boundedConfidence(item.confidence.fieldConfidence?.source)),
      ...organizerCandidateFieldProvenance(
        item,
        artifactId,
        confidence
      ),
      ...orphanEventFieldProvenance(
        item,
        artifactId,
        confidence
      ),
      ...intakeListingFieldProvenance(item, artifactId, confidence),
    ],
    normalizedPayload: {
      title: item.sourceEntity.title,
      market: item.market ?? null,
      sourceEntity: {...item.sourceEntity},
      source: {...item.source},
      owner: item.owner,
      confidence: {...item.confidence, overall: confidence},
      decisionProvenance: {...item.decisionProvenance},
      citations: uniqueSorted(item.evidence.citations),
      provenanceStatus: item.evidence.provenanceStatus,
      ...(item.adminProjection ? {intake: item.adminProjection} : {}),
    },
    decisionId: null,
    publicationPlanId: null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    staleAt: item.timestamps.evidenceStaleAt ?? null,
    expiresAt: item.expiresAt,
  };
}

export async function validateCanonicalProjection({repoRoot, projection, requireContracts = false}) {
  const contractRoot = path.join(repoRoot, "contracts", "operations");
  const schemas = new Map();
  const runPath = path.join(contractRoot, "run.schema.json");
  const itemPath = path.join(contractRoot, "work_item.schema.json");
  try {
    await collectSchema(runPath, schemas);
    await collectSchema(itemPath, schemas);
  } catch (error) {
    if (error?.code === "ENOENT" && !requireContracts) {
      return {status: "contracts_missing", valid: null, contractRoot};
    }
    throw new OperationsError("OPERATIONS_CONTRACTS_MISSING", "Canonical operations contracts are required for projection validation.", {
      details: {contractRoot},
      cause: error,
    });
  }
  const ajv = new Ajv({allErrors: true, strict: false});
  addFormats(ajv);
  for (const schema of schemas.values()) ajv.addSchema(schema);
  const validateRun = ajv.getSchema(schemas.get(path.resolve(runPath)).$id);
  const validateItem = ajv.getSchema(schemas.get(path.resolve(itemPath)).$id);
  validateRun(projection.run);
  const runErrors = schemaErrors(validateRun.errors);
  const hasItemInventory = Array.isArray(projection.items);
  const projectionItems = hasItemInventory ?
    projection.items : [];
  const items = projectionItems.map((item) => {
    validateItem(item);
    return schemaErrors(validateItem.errors);
  });
  const errors = [
    ...(!hasItemInventory ? [{
      record: "projection",
      path: "/items",
      keyword: "type",
      message: "must be an array",
    }] : []),
    ...runErrors.map((error) => ({record: "run", ...error})),
    ...items.flatMap((itemErrors, index) =>
      itemErrors.map((error) => ({record: `items[${index}]`, ...error}))),
    ...projectionRelationshipErrors(projection.run, projectionItems),
  ];
  if (errors.length > 0) {
    throw new OperationsError("CANONICAL_PROJECTION_INVALID", "Admin projection does not satisfy canonical operations contracts.", {
      details: {contractRoot, errors: errors.slice(0, 100)},
    });
  }
  return {status: "validated", valid: true, contractRoot, runRecords: 1, workItemRecords: projectionItems.length};
}

function projectionRelationshipErrors(run, items) {
  const errors = [];
  if (!Array.isArray(items)) {
    return [{
      record: "projection",
      path: "/items",
      keyword: "type",
      message: "must be an array",
    }];
  }
  const ids = new Set();
  items.forEach((item, index) => {
    if (item?.runId !== run?.runId || item?.workflowId !== run?.workflowId) {
      errors.push({
        record: `items[${index}]`,
        path: "/runId",
        keyword: "projectionJoin",
        message: "must belong to the exported run and workflow",
      });
    }
    if (typeof item?.workItemId === "string") {
      if (ids.has(item.workItemId)) {
        errors.push({
          record: `items[${index}]`,
          path: "/workItemId",
          keyword: "uniqueProjectionItem",
          message: "must be unique within the exported inventory",
        });
      }
      ids.add(item.workItemId);
    }
  });
  const maxWorkItems = run?.budgets?.maxWorkItems;
  if (Number.isSafeInteger(maxWorkItems) &&
      (items.length > maxWorkItems ||
        items.length > MAX_WORK_ITEMS_PER_RUN)) {
    errors.push({
      record: "projection",
      path: "/items",
      keyword: "frozenBudget",
      message: "must not exceed the run or platform work-item capacity",
    });
  }
  if (Number.isSafeInteger(run?.counters?.discovered) &&
      run.counters.discovered !== items.length) {
    errors.push({
      record: "run",
      path: "/counters/discovered",
      keyword: "projectionCardinality",
      message: "must equal the exported work-item inventory",
    });
  }
  return errors;
}

function schemaErrors(errors) {
  return (errors ?? []).map((error) => ({
    path: error.instancePath || "/",
    keyword: error.keyword,
    message: error.message ?? "failed validation",
  }));
}

function fieldProvenance(
  field,
  item,
  artifactId,
  confidence,
  locator = item.evidence.artifactRef ?? null
) {
  return {
    field,
    artifactId,
    contentHash: item.evidence.artifactHash,
    locator,
    extractedBy: item.decisionProvenance.actorKind === "human" ? "human" : "deterministic",
    extractorVersion:
      item.decisionProvenance.actorId ??
      `${item.workflowId}-unknown`,
    confidence,
  };
}

function organizerCandidateFieldProvenance(item, artifactId, confidence) {
  const intake = item.adminProjection;
  const candidate = intake?.recordType === "organizer_search_candidate" ?
    intake.candidate :
    null;
  if (!candidate) return [];
  const base = item.evidence.artifactRef ?? "supply-intake-artifact";
  const fields = [
    ["intake.candidate.title", candidate.title],
    ["intake.candidate.canonicalUrl", candidate.canonicalUrl],
    ["intake.candidate.snippet", candidate.snippet],
    [
      "intake.candidate.queryIntent.marketSlug",
      candidate.queryIntent?.marketSlug,
    ],
    [
      "intake.candidate.reviewContext.formats",
      candidate.reviewContext?.formats,
    ],
    [
      "intake.candidate.reviewContext.reviewNotes",
      candidate.reviewContext?.reviewNotes,
    ],
    [
      "intake.candidate.reviewContext.verifiedAt",
      candidate.reviewContext?.verifiedAt,
    ],
  ].filter(([, value]) =>
    value !== null &&
    value !== undefined &&
    (!Array.isArray(value) || value.length > 0));
  return fields.map(([field]) => fieldProvenance(
    field,
    item,
    artifactId,
    confidence,
    `${base}#normalizedPayload.${field}`
  ));
}

function orphanEventFieldProvenance(item, artifactId, confidence) {
  const intake = item.adminProjection;
  const candidate = intake?.recordType === "orphan_event_candidate" ?
    intake.candidate :
    null;
  if (!candidate) return [];
  const base = item.evidence.artifactRef ?? "supply-intake-artifact";
  const fields = [
    ["intake.candidate.attribution.organizerEvidence.name",
      candidate.attribution?.organizerEvidence?.name],
    ["intake.candidate.attribution.organizerEvidence.url",
      candidate.attribution?.organizerEvidence?.url],
    ["intake.candidate.attribution.match.rationale",
      candidate.attribution?.match?.rationale],
    ["intake.candidate.attribution.match.matchingSignals",
      candidate.attribution?.match?.matchingSignals],
    ["intake.candidate.attribution.match.blockingKeys",
      candidate.attribution?.match?.blockingKeys],
    ["intake.candidate.publicationEligibility",
      candidate.publicationEligibility],
  ].filter(([, value]) =>
    value !== null &&
    value !== undefined &&
    (!Array.isArray(value) || value.length > 0));
  return fields.map(([field]) => fieldProvenance(
    field,
    item,
    artifactId,
    confidence,
    `${base}#normalizedPayload.${field}`
  ));
}

// Each listing field names the page it came from, so a reviewer can check the
// source and an agent-filled field is labelled as model output.
function intakeListingFieldProvenance(item, artifactId, confidence) {
  const intake = item.adminProjection;
  if (intake?.recordType !== "organizer_listing_draft") return [];
  return intake.listing.fieldEvidence.map((entry) => ({
    ...fieldProvenance(
      `intake.listing.organizer.${entry.field}`,
      item,
      artifactId,
      confidence,
      (entry.sourceUrl ?? `${item.evidence.artifactRef ?? "supply-intake-artifact"}#seed.${entry.field}`).slice(0, 1_000)
    ),
    extractedBy: entry.method === "agent" ? "model" : entry.method === "nominator" ? "human" : "deterministic",
    extractorVersion: entry.adapterId ?? item.decisionProvenance.actorId ?? `${item.workflowId}-unknown`,
  }));
}

function canonicalLifecycleStatus(item, contract) {
  if (isPublished(item, contract)) return "published";
  if (!isActive(item, contract)) return "terminal";
  const index = contract.primaryStages.indexOf(item.primaryStage);
  if (index < 0) {
    throw new OperationsError(
      "INVALID_WORKFLOW_PROJECTION",
      `Stage ${item.primaryStage} is absent from the frozen workflow contract.`
    );
  }
  if (index === contract.primaryStages.length - 1) return "ready";
  if (index === 0) return "queued";
  if (index === contract.primaryStages.length - 2) return "waiting";
  return "in_progress";
}

function priorityFor(item, primaryStages = []) {
  const stageIndex = Math.max(0, primaryStages.indexOf(item.primaryStage));
  const stageBase = stageIndex === primaryStages.length - 1 ?
    100_000 : 400_000 + stageIndex * 100_000;
  const expiration = Date.parse(item.expiresAt);
  if (Number.isNaN(expiration)) return stageBase;
  const days = Math.max(0, Math.min(30, Math.ceil((expiration - Date.parse(item.updatedAt)) / 86_400_000)));
  return Math.max(0, Math.min(1_000_000, stageBase + (30 - days) * 1_000));
}

function workflowContract(run, items) {
  const frozen = run?.plan?.workflowContract ?? {};
  const primaryStages = Array.isArray(frozen.primaryStages) ?
    frozen.primaryStages : uniqueSorted(items.map((item) => item.primaryStage));
  const lifecycleStatuses = Array.isArray(frozen.lifecycleStatuses) ?
    frozen.lifecycleStatuses :
    uniqueSorted(items.map((item) => item.lifecycleStatus));
  const entityKinds = Array.isArray(frozen.entityKinds) ?
    frozen.entityKinds : uniqueSorted(items.map((item) => item.entityKind));
  return {
    ...projectionContract({
      primaryStages,
      lifecycleSemantics: frozen.lifecycleSemantics,
    }),
    lifecycleStatuses,
    entityKinds,
  };
}

function projectionContract({primaryStages, lifecycleSemantics}) {
  const stages = Array.isArray(primaryStages) ? primaryStages : [];
  const activeStatuses = lifecycleSemantics?.activeStatuses;
  const publishedStatuses = lifecycleSemantics?.publishedStatuses;
  const expiredStatuses = lifecycleSemantics?.expiredStatuses;
  const valid = stages.length > 0 &&
    Array.isArray(activeStatuses) && activeStatuses.length > 0 &&
    Array.isArray(publishedStatuses) && Array.isArray(expiredStatuses);
  if (!valid) {
    throw new OperationsError(
      "INVALID_WORKFLOW_PROJECTION",
      "The frozen workflow contract requires ordered stages and lifecycle semantics."
    );
  }
  return {
    primaryStages: [...stages],
    lifecycleSemantics: {
      activeStatuses: [...activeStatuses],
      publishedStatuses: [...publishedStatuses],
      expiredStatuses: [...expiredStatuses],
    },
  };
}

function isActive(item, contract) {
  return contract.lifecycleSemantics.activeStatuses.includes(
    item.lifecycleStatus
  );
}

function isPublished(item, contract) {
  return contract.lifecycleSemantics.publishedStatuses.includes(
    item.lifecycleStatus
  );
}

function boundedConfidence(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(1, Math.round(value * 10_000) / 10_000));
}

function canonicalCode(value) {
  const code = String(value ?? "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9_.:-]+/g, "_")
    .replace(/^[^a-z]+/g, "")
    .slice(0, 120);
  return code || "unknown";
}

function compareQueueItems(left, right, contract) {
  const lifecycle = Number(!isActive(left, contract)) -
    Number(!isActive(right, contract));
  if (lifecycle !== 0) return lifecycle;
  const priority = priorityFor(right, contract.primaryStages) -
    priorityFor(left, contract.primaryStages);
  if (priority !== 0) return priority;
  return left.workItemId.localeCompare(right.workItemId);
}

function counts(keys, values, select) {
  const result = Object.fromEntries(keys.map((key) => [key, 0]));
  for (const value of values) {
    const key = select(value);
    if (Object.hasOwn(result, key)) result[key] += 1;
  }
  return result;
}

function dynamicCounts(values, select) {
  return Object.fromEntries([...values.reduce((map, value) => {
    const key = select(value);
    map.set(key, (map.get(key) ?? 0) + 1);
    return map;
  }, new Map()).entries()].sort(([left], [right]) => left.localeCompare(right)));
}
