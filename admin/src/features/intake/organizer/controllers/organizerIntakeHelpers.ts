import type {
  AdminCreateOrganizerDraftFromCandidatePayload,
  AdminRecordOrganizerCurationPayload,
  OrganizerCurationSurface,
  OrganizerIntakeDecision,
  OrganizerPolicyGapDecision,
} from "../../../../shared/types/adminTypes";
import type * as Intake from "../types/organizerIntakeTypes";

export type OrganizerOperationStage =
  "incoming" | "verify" | "resolve" | "ready";

export function organizerOperationStage(
  reviewStatus: string
): OrganizerOperationStage | null {
  if (reviewStatus === "incoming" || reviewStatus === "new") return "incoming";
  if (reviewStatus === "needs_review") return "verify";
  if (reviewStatus === "needs_attention") return "resolve";
  if (reviewStatus === "ready") return "ready";
  return null;
}

export function organizerIntakeDecisionFromString(
  decision: string
): OrganizerIntakeDecision | null {
  if (
    decision === "approve_public" ||
    decision === "hold" ||
    decision === "suppress"
  ) {
    return decision;
  }
  return null;
}

export function organizerPolicyGapDecisionFromString(
  decision: string
): OrganizerPolicyGapDecision | null {
  if (decision === "accept" || decision === "hold" || decision === "reject") {
    return decision;
  }
  return null;
}

export function surfaceForCandidateCuration(
  candidate: Intake.OrganizerSearchCandidate
): OrganizerCurationSurface {
  return {
    ...candidate.suggestedSurface,
    evidenceRefs: [
      ...candidate.suggestedSurface.evidenceRefs,
      {
        type: "manualNote",
        ref: "operationRuns + operationWorkItems",
        description:
          `Search candidate ${candidate.candidateId} observed ${candidate.observedAt}.`,
      },
    ],
    notes: appendSentence(
      candidate.suggestedSurface.notes,
      `Candidate title: ${candidate.title}`
    ),
  };
}

export function organizerDraftFormFromCandidate(
  candidate: Intake.OrganizerSearchCandidate
): Intake.OrganizerDraftFormState {
  return {
    publicSlug: organizerSlug(candidate.title),
    name: candidate.title.trim(),
    organizerType: "community",
    reviewNote:
      `Create an unclaimed draft from reviewed candidate ${candidate.candidateId}.`,
  };
}

export function organizerDraftPayloadForCandidate(
  candidate: Intake.OrganizerSearchCandidate,
  form: Intake.OrganizerDraftFormState
): {ok: true; value: AdminCreateOrganizerDraftFromCandidatePayload} |
  {ok: false; message: string} {
  const publicSlug = organizerSlug(form.publicSlug);
  const name = form.name.trim();
  const reviewNote = form.reviewNote.trim();
  if (publicSlug.length < 3 || publicSlug.length > 64) {
    return {
      ok: false,
      message: "Enter a 3–64 character lowercase organizer slug.",
    };
  }
  if (!name || name.length > 120) {
    return {ok: false, message: "Enter an organizer name under 120 characters."};
  }
  if (reviewNote.length < 10 || reviewNote.length > 500) {
    return {
      ok: false,
      message: "Add a review note between 10 and 500 characters.",
    };
  }
  return {
    ok: true,
    value: {
      workItemId: candidate.workItemId,
      candidateId: candidate.candidateId,
      publicSlug,
      name,
      organizerType: form.organizerType,
      reviewNote,
    },
  };
}

export function curationFormKey(
  item: Intake.OrganizerIntakeItem,
  form: Intake.OrganizerCurationFormState
) {
  return [
    item.entityId,
    form.operationType,
    form.targetEntityId,
    form.surfaceId,
    form.decision,
    form.newEntityId,
  ].filter(Boolean).join(":");
}

export function curationPayloadForItem(
  item: Intake.OrganizerIntakeItem,
  form: Intake.OrganizerCurationFormState
): {ok: true; value: AdminRecordOrganizerCurationPayload} |
  {ok: false; message: string} {
  const reason = form.reason.trim() || defaultCurationReason(item, form);
  if (form.operationType === "suppress_entity") {
    return {
      ok: true,
      value: {
        operationType: "suppress_entity",
        entityId: item.entityId,
        reason,
      },
    };
  }
  if (form.operationType === "merge_entity") {
    if (!form.targetEntityId) {
      return {ok: false, message: "Choose a target entity for merge."};
    }
    if (form.targetEntityId === item.entityId) {
      return {ok: false, message: "Choose a different merge target."};
    }
    return {
      ok: true,
      value: {
        operationType: "merge_entity",
        sourceEntityId: item.entityId,
        targetEntityId: form.targetEntityId,
        reason,
      },
    };
  }
  if (form.operationType === "surface_decision") {
    if (!form.surfaceId) {
      return {ok: false, message: "Choose a surface for this decision."};
    }
    return {
      ok: true,
      value: {
        operationType: "surface_decision",
        entityId: item.entityId,
        surfaceId: form.surfaceId,
        decision: form.decision,
        reason,
      },
    };
  }
  if (!form.surfaceId) {
    return {ok: false, message: "Choose a surface to split."};
  }
  if (!form.newEntityId.trim()) {
    return {ok: false, message: "Enter the new entity id for the split."};
  }
  return {
    ok: true,
    value: {
      operationType: "split_surface",
      entityId: item.entityId,
      surfaceId: form.surfaceId,
      newEntityId: form.newEntityId.trim(),
      reason,
    },
  };
}

export function intakeChecklistForDecision(
  item: Intake.OrganizerIntakeItem,
  decision: OrganizerIntakeDecision
) {
  const gatePassed = (id: string) =>
    item.gates.find((gate) => gate.id === id)?.passed === true;
  return {
    identityReviewed: gatePassed("identity_surface_present"),
    surfaceInventoryReviewed: gatePassed("surface_inventory_reviewable"),
    ownerSafeCopyReviewed: gatePassed("owner_safe_public_draft"),
    marketScopeReviewed: gatePassed("market_model_present"),
    mediaRightsReviewed: decision === "approve_public",
    crawlDisabledReviewed: gatePassed("crawl_disabled_by_default"),
  };
}

export function organizerVisibilityFormForItem(
  item: Intake.OrganizerIntakeItem
): Intake.OrganizerVisibilityFormState {
  return {
    publishStatus: item.publishStatus === "published" ?
      "published" :
      item.publishStatus === "suppressed" ? "suppressed" : "draft",
    indexStatus: item.indexStatus === "indexed" ? "indexed" : "noindex",
    appVisibility: item.appVisibility === "discoverable" ?
      "discoverable" :
      "hidden",
  };
}

export function emptyOrganizerSurfaceChecklist():
Intake.OrganizerSurfaceChecklistState {
  return {
    claimTargetReviewed: false,
    takedownPathReviewed: false,
    impersonationReviewed: false,
    operatingStatusReviewed: false,
    eventAccuracyReviewed: false,
    unclaimedAffordancesReviewed: false,
  };
}

export function organizerVisibilityForDecision(
  decision: OrganizerIntakeDecision,
  form: Intake.OrganizerVisibilityFormState
): Intake.OrganizerVisibilityFormState {
  if (decision === "suppress") {
    return {
      publishStatus: "suppressed",
      indexStatus: "noindex",
      appVisibility: "hidden",
    };
  }
  if (decision === "hold") {
    return {
      publishStatus: "draft",
      indexStatus: "noindex",
      appVisibility: "hidden",
    };
  }
  return form;
}

export function organizerSurfaceChecklistReady(
  form: Intake.OrganizerVisibilityFormState,
  checklist: Intake.OrganizerSurfaceChecklistState
): boolean {
  const anyVisible =
    form.publishStatus === "published" ||
    form.indexStatus === "indexed" ||
    form.appVisibility === "discoverable";
  if (form.indexStatus === "indexed" && form.publishStatus !== "published") {
    return false;
  }
  if (anyVisible && (
    !checklist.claimTargetReviewed ||
    !checklist.takedownPathReviewed ||
    !checklist.impersonationReviewed
  )) {
    return false;
  }
  if (form.appVisibility === "discoverable" && (
    !checklist.operatingStatusReviewed ||
    !checklist.eventAccuracyReviewed ||
    !checklist.unclaimedAffordancesReviewed
  )) {
    return false;
  }
  return true;
}

export function publicationPacketReady(
  packet?: Intake.OrganizerPublicationReviewPacket
) {
  if (!packet) return false;
  return packet.status === "ready_for_manual_publication_review" &&
    packet.dataBlockers.length === 0 &&
    packet.evidenceBlockers.length === 0 &&
    Object.values(packet.approvalChecklist).every(Boolean);
}

export function defaultIntakeDecisionNote(
  item: Intake.OrganizerIntakeItem,
  decision: OrganizerIntakeDecision
) {
  if (decision === "approve_public") {
    return `Manual QA approved ${item.displayName} as a reviewed organizer record.`;
  }
  if (decision === "hold") {
    return `Manual QA held ${item.displayName} for additional evidence.`;
  }
  return `Manual QA suppressed ${item.displayName} from public projection.`;
}

export function policyGapChecklistForDecision(
  decision: OrganizerPolicyGapDecision
) {
  if (decision === "accept") {
    return {
      requiredInputsReviewed: true,
      costAndSafetyReviewed: true,
      implementationOwnerReviewed: true,
      behaviorStillDisabledAcknowledged: true,
    };
  }
  return {
    requiredInputsReviewed: false,
    costAndSafetyReviewed: false,
    implementationOwnerReviewed: true,
    behaviorStillDisabledAcknowledged: true,
  };
}

export function defaultPolicyGapDecisionNote(
  gap: Intake.OrganizerPolicyGap,
  decision: OrganizerPolicyGapDecision
) {
  if (decision === "accept") {
    return `Product policy accepted for ${gap.gapId}; behavior remains disabled until encoded in the owning implementation or configuration.`;
  }
  if (decision === "hold") {
    return `Product policy held for ${gap.gapId}; required inputs remain unresolved.`;
  }
  return `Product policy rejected for ${gap.gapId}.`;
}

export function decisionLabel(decision: string) {
  if (decision === "approve_public") return "Approve public";
  return decision.charAt(0).toUpperCase() + decision.slice(1);
}

export function policyGapDecisionLabel(decision: string) {
  if (decision === "accept") return "Accepted policy";
  if (decision === "hold") return "Held policy";
  if (decision === "reject") return "Rejected policy";
  return decision.charAt(0).toUpperCase() + decision.slice(1);
}

function defaultCurationReason(
  item: Intake.OrganizerIntakeItem,
  form: Intake.OrganizerCurationFormState
) {
  if (form.operationType === "suppress_entity") {
    return `${item.displayName} is a false-positive organizer candidate.`;
  }
  if (form.operationType === "merge_entity") {
    return `${item.entityId} is the same organizer as ${form.targetEntityId}.`;
  }
  if (form.operationType === "surface_decision") {
    return `${form.surfaceId} is ${form.decision.replaceAll("_", " ")}.`;
  }
  return `${form.surfaceId} belongs to ${form.newEntityId}.`;
}

function appendSentence(value: string, sentence: string) {
  const base = value.trim();
  const next = sentence.trim();
  if (!base) return next;
  if (!next) return base;
  return `${base} ${next}`;
}

function organizerSlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/&/gu, " and ")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 64)
    .replace(/-+$/gu, "");
}
