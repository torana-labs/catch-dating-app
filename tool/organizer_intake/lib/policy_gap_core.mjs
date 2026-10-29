export function buildOrganizerPolicyGapRegister({
  eventCrawlPlan,
  externalEventCandidateQueue,
  externalEventLocationResolutionQueue,
  externalEventImportExecutionPlan,
  externalEventImportPlan,
  policyGapDecisionBatches = [],
  sourceMentionResolution,
} = {}) {
  const errors = [];
  const baseGaps = [
    sourceMentionResolutionPolicyGap(sourceMentionResolution),
    recurringCrawlPolicyGap(eventCrawlPlan),
    locationProviderPolicyGap(externalEventLocationResolutionQueue),
    eventImportWritePolicyGap(
      externalEventCandidateQueue,
      externalEventImportPlan,
      externalEventImportExecutionPlan
    ),
    eventDefaultsPolicyGap(externalEventImportPlan),
    namingMigrationPolicyGap(),
  ];
  const decisionByGapId = buildPolicyGapDecisionState(
    policyGapDecisionBatches,
    baseGaps,
    errors
  );
  const gaps = baseGaps.map((gap) =>
    applyPolicyGapDecision(gap, decisionByGapId.get(gap.gapId), errors)
  ).sort((a, b) =>
    severityRank(a.severity) - severityRank(b.severity) ||
    a.area.localeCompare(b.area) ||
    a.gapId.localeCompare(b.gapId)
  );

  return {
    schemaVersion: 1,
    generatedFrom: {
      eventCrawlPlan: "tool/organizer_intake/generated/event_crawl_plan.json",
      externalEventCandidateQueue:
        "tool/organizer_intake/generated/external_event_candidate_queue.json",
      externalEventLocationResolutionQueue:
        "tool/organizer_intake/generated/external_event_location_resolution_queue.json",
      externalEventImportPlan:
        "tool/organizer_intake/generated/external_event_import_plan.json",
      externalEventImportExecutionPlan:
        "tool/organizer_intake/generated/external_event_import_execution_plan.json",
      sourceMentionResolution:
        "tool/organizer_intake/generated/source_mention_resolution_clusters.json",
      policyGapDecisionBatches:
        "tool/organizer_intake/policy_gap_decisions/*.json",
    },
    summary: {
      gaps: gaps.length,
      decisionRequired: gaps.filter((gap) =>
        gap.status === "decision_required").length,
      ready: gaps.filter((gap) => gap.status === "ready").length,
      blockedByPolicy: gaps.filter((gap) =>
        gap.defaultPosition === "disabled_until_policy_approved").length,
      gapsByArea: countBy(gaps, "area"),
      gapsBySeverity: countBy(gaps, "severity"),
      gapsByStatus: countBy(gaps, "status"),
      reviewDecisions: gaps.filter((gap) =>
        gap.decisionStatus !== "not_reviewed").length,
      reviewAccepted: gaps.filter((gap) =>
        gap.decisionStatus === "accepted").length,
      reviewHeld: gaps.filter((gap) =>
        gap.decisionStatus === "held").length,
      reviewRejected: gaps.filter((gap) =>
        gap.decisionStatus === "rejected").length,
      reviewInvalid: gaps.filter((gap) =>
        gap.decisionStatus === "invalid").length,
      reviewNotReviewed: gaps.filter((gap) =>
        gap.decisionStatus === "not_reviewed").length,
      gapsByDecisionStatus: countBy(gaps, "decisionStatus"),
    },
    guardrails: [
      "Policy gaps are declarative; this artifact never enables crawls, provider lookups, or event writes.",
      "A gap is resolved only when the required input is encoded in repo-backed policy/config and passes checks.",
      "Admin review remains necessary even after a product policy is approved.",
    ],
    errors,
    gaps,
  };
}

function buildPolicyGapDecisionState(
  policyGapDecisionBatches,
  baseGaps,
  errors
) {
  const allowedDecisions = new Set(["accept", "hold", "reject"]);
  const gapIds = new Set(baseGaps.map((gap) => gap.gapId));
  const decisionByGapId = new Map();

  for (const batch of policyGapDecisionBatches ?? []) {
    const file = batch.file ? ` in ${batch.file}` : "";
    if (batch.schemaVersion !== 1) {
      errors.push(`Policy gap decision batch${file} must use schemaVersion 1.`);
    }
    if (!isNonEmptyString(batch.policyGapDecisionBatchId)) {
      errors.push(`Policy gap decision batch${file} is missing policyGapDecisionBatchId.`);
    }
    if (!isIsoDate(batch.decidedAt)) {
      errors.push(`Policy gap decision batch ${batch.policyGapDecisionBatchId ?? file} has invalid decidedAt.`);
    }
    if (!isNonEmptyString(batch.reviewer)) {
      errors.push(`Policy gap decision batch ${batch.policyGapDecisionBatchId ?? file} is missing reviewer.`);
    }

    for (const decision of batch.decisions ?? []) {
      const gapId = decision.gapId;
      if (!gapIds.has(gapId)) {
        errors.push(
          `Policy gap decision batch ${batch.policyGapDecisionBatchId ?? file} references unknown gapId ${gapId}.`
        );
        continue;
      }
      if (!allowedDecisions.has(decision.decision)) {
        errors.push(
          `Policy gap decision for ${gapId} must be accept, hold, or reject.`
        );
      }
      if (!Array.isArray(decision.requiredInputsReviewed)) {
        errors.push(
          `Policy gap decision for ${gapId} must include requiredInputsReviewed.`
        );
      }
      if (!isNonEmptyString(decision.note)) {
        errors.push(`Policy gap decision for ${gapId} must include note.`);
      }
      if (decisionByGapId.has(gapId)) {
        errors.push(`Policy gap ${gapId} has more than one review decision.`);
        continue;
      }
      decisionByGapId.set(gapId, {
        policyGapDecisionBatchId: batch.policyGapDecisionBatchId,
        decidedAt: batch.decidedAt,
        reviewer: batch.reviewer,
        gapId,
        decision: decision.decision,
        note: decision.note,
        requiredInputsReviewed: [
          ...new Set(decision.requiredInputsReviewed ?? []),
        ].sort(),
      });
    }
  }

  return decisionByGapId;
}

function applyPolicyGapDecision(gap, decision, errors) {
  if (!decision) {
    return {
      ...gap,
      decisionStatus: "not_reviewed",
      reviewDecision: null,
    };
  }

  const missingRequiredInputs = gap.requiredInputs.filter((input) =>
    !decision.requiredInputsReviewed.includes(input)
  );
  const unknownRequiredInputs = decision.requiredInputsReviewed.filter((input) =>
    !gap.requiredInputs.includes(input)
  );
  let decisionStatus = decisionStatusForDecision(decision.decision);

  if (unknownRequiredInputs.length > 0) {
    errors.push(
      `Policy gap ${gap.gapId} reviewed unknown required input(s): ${unknownRequiredInputs.join(", ")}.`
    );
    decisionStatus = "invalid";
  }
  if (decision.decision === "accept" && missingRequiredInputs.length > 0) {
    errors.push(
      `Policy gap ${gap.gapId} cannot be accepted until all required inputs are reviewed: ${missingRequiredInputs.join(", ")}.`
    );
    decisionStatus = "invalid";
  }

  return {
    ...gap,
    decisionStatus,
    reviewDecision: {
      policyGapDecisionBatchId: decision.policyGapDecisionBatchId,
      decidedAt: decision.decidedAt,
      reviewer: decision.reviewer,
      decision: decision.decision,
      note: decision.note,
      requiredInputsReviewed: decision.requiredInputsReviewed,
      missingRequiredInputs,
      unknownRequiredInputs,
    },
  };
}

function decisionStatusForDecision(decision) {
  return {
    accept: "accepted",
    hold: "held",
    reject: "rejected",
  }[decision] ?? "invalid";
}

function sourceMentionResolutionPolicyGap(
  sourceMentionResolution = emptySourceMentionResolution()
) {
  const policy = sourceMentionResolution.resolutionPolicy ??
    sourceMentionResolution.policy ??
    {};
  const clusters = sourceMentionResolution.resolutionClusters ?? {};
  const candidates = sourceMentionResolution.resolutionCandidates ?? {};
  const llmEnabled = policy.llm?.status === "enabled";
  const reviewQueued = clusters.summary?.llmReviewQueued ?? 0;
  const candidatePairs = clusters.summary?.candidatePairs ?? 0;
  const needsHumanReview = clusters.summary?.needsHumanReviewClusters ?? 0;
  return {
    gapId: "source_mention_resolution_policy",
    area: "source_resolution",
    severity: candidatePairs > 0 || needsHumanReview > 0 ? "high" : "medium",
    status: llmEnabled ? "ready" : "decision_required",
    defaultPosition: llmEnabled ?
      "enabled_by_policy" :
      "disabled_until_policy_approved",
    decisionOwner: "product_ops",
    currentState:
      `${candidates.summary?.candidates ?? 0} source mention candidate(s), ` +
      `${candidatePairs} candidate pair(s), ${needsHumanReview} human-review ` +
      `cluster(s); LLM adjudication ${llmEnabled ? "enabled" : "disabled"}.`,
    requiredInputs: [
      "blocking-key allowlist and known stable provider platforms",
      "thresholds for auto-attach, probable duplicate, and human review",
      "maximum cluster size and pair cap before LLM adjudication",
      "LLM model, JSON schema, prompt version, and cache invalidation policy",
      "monthly LLM spend cap and per-run request cap",
      "admin override workflow for same, split, suppress, and attach decisions",
    ],
    unblockCriteria: [
      "source mention resolution policy.llm.status is enabled only after cost caps are encoded",
      "prompt payload generation remains backend/tooling only and never runs from React",
      "source mention review packets are resolved before canonical organizer or event projection",
      "accepted policy is encoded in repo-backed resolver config and bridge checks pass",
    ],
    blockedArtifacts: [
      "tool/organizer_intake/generated/source_mention_resolution_policy.json",
      "tool/organizer_intake/generated/source_mention_resolution_clusters.json",
      "tool/organizer_intake/generated/source_mention_resolution_review_packets.json",
      "tool/organizer_intake/llm_source_resolution.mjs",
    ],
    evidence: {
      llmStatus: policy.llm?.status ?? "disabled",
      autoAttachThreshold: policy.thresholds?.autoAttach ?? null,
      probableDuplicateThreshold: policy.thresholds?.probableDuplicate ?? null,
      needsHumanReviewThreshold: policy.thresholds?.needsHumanReview ?? null,
      llmAdjudicationMinScore:
        policy.thresholds?.llmAdjudicationMinScore ?? null,
      maxClusterSizeForLlm: policy.thresholds?.maxClusterSizeForLlm ?? null,
      maxPairsPerBlockingKey: policy.thresholds?.maxPairsPerBlockingKey ?? null,
      blockingKeys: (policy.blockingKeys ?? []).map((key) => key.id).sort(),
      stableProviderEventPlatforms:
        policy.hardKeyPolicy?.stableProviderEventPlatforms ?? [],
      sourceMentions:
        sourceMentionResolution.extractedMentions?.summary?.mentions ?? 0,
      resolutionCandidates: candidates.summary?.candidates ?? 0,
      clusters: clusters.summary?.clusters ?? 0,
      candidatePairs,
      needsHumanReview,
      llmReviewQueued: reviewQueued,
      warnings: clusters.summary?.warnings ?? 0,
    },
    nextAction:
      "Review resolver thresholds, blocking keys, provider hard-key policy, and LLM cost caps before enabling model adjudication.",
  };
}

function recurringCrawlPolicyGap(eventCrawlPlan = emptyCrawlPlan()) {
  const schedulerEnabled = eventCrawlPlan.policy?.schedulerEnabled === true;
  const crawlCapableSurfaces =
    eventCrawlPlan.summary?.crawlCapableSurfaces ?? 0;
  return {
    gapId: "recurring_event_crawl_policy",
    area: "crawl",
    severity: "high",
    status: schedulerEnabled ? "ready" : "decision_required",
    defaultPosition: schedulerEnabled ?
      "enabled_by_policy" :
      "disabled_until_policy_approved",
    decisionOwner: "product_ops",
    currentState:
      `${crawlCapableSurfaces} crawl-capable surface(s); scheduler ` +
      `${schedulerEnabled ? "enabled" : "disabled"}.`,
    requiredInputs: [
      "platform allowlist and fallback order",
      "crawl frequency by platform and organizer tier",
      "monthly spend cap and per-run rate limits",
      "API-first vs scrape fallback policy",
      "owner-safety and takedown policy",
    ],
    unblockCriteria: [
      "event crawl plan policy.schedulerEnabled is true",
      "approved surfaces use crawl.policy apiPreferred",
      "remote ops manifest names budget and rate-limit guardrails",
    ],
    blockedArtifacts: [
      "tool/organizer_intake/generated/event_crawl_plan.json",
    ],
    evidence: {
      crawlCapableSurfaces,
      approvedSurfaces: eventCrawlPlan.summary?.approvedSurfaces ?? 0,
      schedulerEnabled,
      blockers: eventCrawlPlan.summary?.blockers ?? {},
    },
    nextAction:
      "Choose platform order, frequency, budget cap, and owner-safety rules before enabling scheduled crawls.",
  };
}

function locationProviderPolicyGap(
  externalEventLocationResolutionQueue = emptyLocationQueue()
) {
  const providerLookupEnabled =
    externalEventLocationResolutionQueue.policy?.providerLookupEnabled === true;
  const tasks = externalEventLocationResolutionQueue.summary?.tasks ?? 0;
  return {
    gapId: "external_event_location_provider_policy",
    area: "location_resolution",
    severity: tasks > 0 ? "high" : "medium",
    status: providerLookupEnabled ? "ready" : "decision_required",
    defaultPosition: providerLookupEnabled ?
      "enabled_by_policy" :
      "disabled_until_policy_approved",
    decisionOwner: "product_ops",
    currentState:
      `${tasks} unresolved location task(s); provider lookup ` +
      `${providerLookupEnabled ? "enabled" : "disabled"}.`,
    requiredInputs: [
      "provider selection and fallback order",
      "per-run lookup cap and monthly spend cap",
      "minimum confidence threshold for auto-resolution",
      "admin review threshold for provider-suggested coordinates",
      "raw provider response retention policy",
    ],
    unblockCriteria: [
      "location resolution policy.providerLookupEnabled is true",
      "cost caps and provider names are encoded in repo config",
      "provider results still write reviewed location resolution batches before import planning",
    ],
    blockedArtifacts: [
      "tool/organizer_intake/generated/external_event_location_resolution_queue.json",
    ],
    evidence: {
      tasks,
      missingExactCoordinates:
        externalEventLocationResolutionQueue.summary?.missingExactCoordinates ??
          0,
      provider:
        externalEventLocationResolutionQueue.policy?.provider ??
          "not_configured",
      providerLookupEnabled,
    },
    nextAction:
      "Keep manual resolution as the default until provider, confidence, retention, and spend caps are approved.",
  };
}

function eventImportWritePolicyGap(
  externalEventCandidateQueue = emptyCandidateQueue(),
  externalEventImportPlan = emptyImportPlan(),
  externalEventImportExecutionPlan = emptyExecutionPlan()
) {
  const writeEnabled =
    externalEventImportPlan.policy?.writeEnabled === true &&
    externalEventImportExecutionPlan.policy?.writeEnabled === true;
  const authorityReady =
    externalEventImportExecutionPlan.policy?.authorityModel ===
      "admin_import_service";
  const approvedCandidates =
    externalEventCandidateQueue.summary?.approvedForImport ?? 0;
  const proposedReadOnlyEvents =
    externalEventImportPlan.summary?.proposedReadOnlyEvents ??
      externalEventImportPlan.summary?.proposedCreates ??
      0;
  return {
    gapId: "external_event_import_write_policy",
    area: "event_import",
    severity:
      approvedCandidates > 0 || proposedReadOnlyEvents > 0 ?
        "critical" :
        "high",
    status: writeEnabled && authorityReady ? "ready" : "decision_required",
    defaultPosition: writeEnabled && authorityReady ?
      "enabled_by_policy" :
      "disabled_until_policy_approved",
    decisionOwner: "product_ops",
    currentState:
      `${approvedCandidates} approved candidate(s), ${proposedReadOnlyEvents} ` +
      `proposed read-only event(s); writes ` +
      `${writeEnabled ? "enabled" : "disabled"}.`,
    requiredInputs: [
      "write authority model and service identity",
      "final admin approval threshold before import",
      "duplicate event conflict policy",
      "host notification policy for imported events",
      "rollback, correction, and takedown workflow",
    ],
    unblockCriteria: [
      "import plan policy.writeEnabled is true",
      "execution preflight policy.writeEnabled is true",
      "execution authorityModel is admin_import_service",
      "all write-ready actions pass read-only external event projection validation",
    ],
    blockedArtifacts: [
      "tool/organizer_intake/generated/external_event_import_plan.json",
      "tool/organizer_intake/generated/external_event_import_execution_plan.json",
    ],
    evidence: {
      approvedCandidates,
      proposedReadOnlyEvents,
      proposedCreates: externalEventImportPlan.summary?.proposedCreates ?? 0,
      importPlanWriteReady:
        externalEventImportPlan.summary?.writeReady ?? 0,
      executionWouldPublishReadOnly:
        externalEventImportExecutionPlan.summary?.wouldPublishReadOnly ?? 0,
      executionWouldCreate: 0,
      writeEnabled,
      authorityModel:
        externalEventImportExecutionPlan.policy?.authorityModel ??
          "not_configured",
    },
    nextAction:
      "Encode import authority, host notification, duplicate handling, and rollback gates before writing read-only external events.",
  };
}

function eventDefaultsPolicyGap(externalEventImportPlan = emptyImportPlan()) {
  const blockers = blockersFromImportPlan(externalEventImportPlan);
  const hasDefaultsBlockers =
    blockers.has("requires_capacity_policy") ||
    blockers.has("requires_event_defaults_policy");
  return {
    gapId: "external_event_defaults_policy",
    area: "event_import",
    severity: hasDefaultsBlockers ? "high" : "medium",
    status: "decision_required",
    defaultPosition: "disabled_until_policy_approved",
    decisionOwner: "product_ops",
    currentState: hasDefaultsBlockers ?
      "Approved event candidates still need capacity and default event policies." :
      "No current action is blocked by defaults, but imported-event defaults are not yet approved.",
    requiredInputs: [
      "default capacity by activity and source platform",
      "admission mode for imported events",
      "pricing display and payment handling for externally ticketed events",
      "default cancellation and settlement behavior",
      "activity-specific required fields such as distance, pace, or venue",
    ],
    unblockCriteria: [
      "import actions no longer include requires_event_defaults_policy",
      "read-only event projection preflight validates for every would-publish action",
    ],
    blockedArtifacts: [
      "tool/organizer_intake/generated/external_event_import_plan.json",
    ],
    evidence: {
      proposedReadOnlyEvents:
        externalEventImportPlan.summary?.proposedReadOnlyEvents ??
          externalEventImportPlan.summary?.proposedCreates ??
          0,
      proposedCreates: externalEventImportPlan.summary?.proposedCreates ?? 0,
      blockers: Object.fromEntries([...blockers].sort().map((blocker) => [
        blocker,
        countBlocker(externalEventImportPlan, blocker),
      ])),
    },
    nextAction:
      "Choose default capacity, admission, pricing, and activity-field policy before enabling imports.",
  };
}

function namingMigrationPolicyGap() {
  return {
    gapId: "organizer_host_naming_migration_policy",
    area: "naming",
    severity: "medium",
    status: "decision_required",
    defaultPosition: "compatibility_projection_until_policy_approved",
    decisionOwner: "product",
    currentState:
      "Organizer is canonical in intake; Club remains the app/backend compatibility projection; Host remains the human/operator role.",
    requiredInputs: [
      "canonical public entity label",
      "operator/account role label",
      "legacy Club migration scope",
      "URL and SEO naming transition policy",
      "admin/app copy migration order",
    ],
    unblockCriteria: [
      "canonical entity and role terms are approved",
      "schema/backfill plan exists for legacy Club compatibility",
      "public website, admin, Flutter app, and backend copy migration is sequenced",
    ],
    blockedArtifacts: [
      "admin/src/App.tsx",
      "website/src/App.tsx",
      "lib/contexts/organizers/domain/club.dart",
    ],
    evidence: {
      intakeCanonicalEntity: "organizer",
      compatibilityProjection: "club",
      operatorRole: "host",
    },
    nextAction:
      "Confirm Organizer as the entity and Host as the operator role before broad UI/schema renames.",
  };
}

function blockersFromImportPlan(externalEventImportPlan) {
  const blockers = new Set();
  for (const action of externalEventImportPlan.actions ?? []) {
    for (const blocker of action.blockers ?? []) blockers.add(blocker);
  }
  return blockers;
}

function countBlocker(externalEventImportPlan, blocker) {
  return (externalEventImportPlan.actions ?? []).filter((action) =>
    (action.blockers ?? []).includes(blocker)
  ).length;
}

function countBy(items, field) {
  const counts = {};
  for (const item of items) {
    const key = item[field] ?? "unknown";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))
  );
}

function severityRank(severity) {
  return {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  }[severity] ?? 9;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function emptyCrawlPlan() {
  return {policy: {schedulerEnabled: false}, summary: {}};
}

function emptyLocationQueue() {
  return {policy: {providerLookupEnabled: false}, summary: {}};
}

function emptyCandidateQueue() {
  return {summary: {}};
}

function emptyImportPlan() {
  return {policy: {writeEnabled: false}, summary: {}, actions: []};
}

function emptyExecutionPlan() {
  return {
    policy: {authorityModel: "disabled", writeEnabled: false},
    summary: {},
  };
}

function emptySourceMentionResolution() {
  return {
    extractedMentions: {summary: {}},
    resolutionCandidates: {summary: {}},
    resolutionClusters: {summary: {}},
    resolutionPolicy: {
      blockingKeys: [],
      llm: {status: "disabled"},
      thresholds: {},
    },
  };
}
