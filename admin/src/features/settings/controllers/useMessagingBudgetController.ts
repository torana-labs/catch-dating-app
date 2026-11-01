import {useMutation} from "@tanstack/react-query";
import {useCallback, useRef, useState} from "react";
import type {AdminApplyEventMessagingBudgetCallablePayload} from
  "../../../generated/contracts/adminApplyEventMessagingBudgetCallablePayload";
import type {AdminApplyEventMessagingBudgetCallableResponse} from
  "../../../generated/contracts/adminApplyEventMessagingBudgetCallableResponse";
import type {AdminDecideEventMessagingBudgetCallablePayload} from
  "../../../generated/contracts/adminDecideEventMessagingBudgetCallablePayload";
import type {AdminReviewEventMessagingBudgetCallablePayload} from
  "../../../generated/contracts/adminReviewEventMessagingBudgetCallablePayload";
import type {AdminReviewEventMessagingBudgetCallableResponse} from
  "../../../generated/contracts/adminReviewEventMessagingBudgetCallableResponse";
import {useAdminPendingOperationGuard} from
  "../../../shared/pendingOperation";
import {adminQueryKeys} from "../../../shared/query/queryKeys";
import {
  loadMessagingBudgetReview,
  recordMessagingBudgetDecision,
  stageApprovedMessagingBudget,
} from "../api/grantedPlansRepository";

export type MessagingBudgetDecisionKind = "approve" | "hold" | "reject";
export type MessagingBudgetRoute =
  AdminReviewEventMessagingBudgetCallablePayload["routeId"];
export type MessagingBudgetPurpose =
  AdminReviewEventMessagingBudgetCallablePayload["purpose"];

export interface MessagingBudgetController {
  scope: AdminReviewEventMessagingBudgetCallablePayload;
  reviewResult: AdminReviewEventMessagingBudgetCallableResponse | null;
  stagedResult: AdminApplyEventMessagingBudgetCallableResponse | null;
  decisionKind: MessagingBudgetDecisionKind;
  eventLimit: string;
  senderDayLimit: string;
  validUntil: string;
  decisionNote: string;
  stagingNote: string;
  isReviewing: boolean;
  isDeciding: boolean;
  isStaging: boolean;
  decisionDisabledReason: string | null;
  stageDisabledReason: string | null;
  setScope: <K extends keyof AdminReviewEventMessagingBudgetCallablePayload>(
    key: K,
    value: AdminReviewEventMessagingBudgetCallablePayload[K]
  ) => void;
  setDecisionKind: (value: MessagingBudgetDecisionKind) => void;
  setEventLimit: (value: string) => void;
  setSenderDayLimit: (value: string) => void;
  setValidUntil: (value: string) => void;
  setDecisionNote: (value: string) => void;
  setStagingNote: (value: string) => void;
  review: () => Promise<boolean>;
  decide: () => Promise<boolean>;
  stage: () => Promise<boolean>;
}

const defaultScope: AdminReviewEventMessagingBudgetCallablePayload = {
  organizerId: "",
  eventId: "",
  routeId: "catchEventSms",
  senderId: "",
  purpose: "joiningUpdate",
};

export function useMessagingBudgetController({
  onError,
  onNotice,
}: {
  onError: (message: string | null) => void;
  onNotice: (message: string | null) => void;
}): MessagingBudgetController {
  const {beginOperation, endOperation} = useAdminPendingOperationGuard();
  const reviewMutation = useMutation({
    mutationKey: adminQueryKeys.finance.messagingBudgetReview(),
    mutationFn: loadMessagingBudgetReview,
  });
  const decisionMutation = useMutation({
    mutationKey: adminQueryKeys.finance.messagingBudgetDecision(),
    mutationFn: recordMessagingBudgetDecision,
  });
  const stagingMutation = useMutation({
    mutationKey: adminQueryKeys.finance.messagingBudgetStage(),
    mutationFn: stageApprovedMessagingBudget,
  });
  const [scope, setScopeState] = useState(defaultScope);
  const [reviewResult, setReviewResult] =
    useState<AdminReviewEventMessagingBudgetCallableResponse | null>(null);
  const [stagedResult, setStagedResult] =
    useState<AdminApplyEventMessagingBudgetCallableResponse | null>(null);
  const [decisionKind, setDecisionKind] =
    useState<MessagingBudgetDecisionKind>("hold");
  const [eventLimit, setEventLimit] = useState("");
  const [senderDayLimit, setSenderDayLimit] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [decisionNote, setDecisionNote] = useState("");
  const [stagingNote, setStagingNote] = useState("");
  const decisionRetry = useRef<{
    signature: string;
    payload: AdminDecideEventMessagingBudgetCallablePayload;
  } | null>(null);
  const stagingRetry = useRef<{
    signature: string;
    payload: AdminApplyEventMessagingBudgetCallablePayload;
  } | null>(null);

  const setScope = useCallback(<
    K extends keyof AdminReviewEventMessagingBudgetCallablePayload,
  >(key: K, value: AdminReviewEventMessagingBudgetCallablePayload[K]) => {
    setScopeState((current) => ({...current, [key]: value}));
    setReviewResult(null);
    setStagedResult(null);
    decisionRetry.current = null;
    stagingRetry.current = null;
  }, []);

  const review = useCallback(async () => {
    if (!scope.organizerId.trim() || !scope.eventId.trim() ||
        !scope.senderId.trim()) {
      onError("Enter the organizer, event, and sender identifiers.");
      return false;
    }
    const payload = normalizedScope(scope);
    try {
      const response = await reviewMutation.mutateAsync(payload);
      setScopeState(payload);
      setReviewResult(response);
      setStagedResult(null);
      decisionRetry.current = null;
      stagingRetry.current = null;
      onError(null);
      onNotice("Current messaging setup loaded. No authority was granted.");
      return true;
    } catch (error) {
      onError(messageFromError(error, "Unable to review the messaging setup."));
      return false;
    }
  }, [onError, onNotice, reviewMutation, scope]);

  const decisionDisabledReason = decisionBlocker({
    reviewResult,
    decisionKind,
    decisionNote,
    eventLimit,
    senderDayLimit,
    validUntil,
  });

  const decide = useCallback(async () => {
    if (!reviewResult || decisionDisabledReason) {
      onError(decisionDisabledReason ?? "Review the current setup first.");
      return false;
    }
    const review = reviewResult.review;
    if (!review.sender || review.budgets.kind !== "reviewed") return false;
    const decision = decisionKind === "approve" ? {
      kind: "approve" as const,
      currency: review.budgets.currency,
      eventLimitMicros: parseMajorUnitsToMicros(eventLimit)!,
      senderDayLimitMicros: parseMajorUnitsToMicros(senderDayLimit)!,
      validUntil: Date.parse(validUntil),
    } : {kind: decisionKind};
    const withoutRequestId = {
      ...normalizedScope(scope),
      expectedRevision: reviewResult.decision?.revision ?? 0,
      expectedRuntimeSourceHash: review.runtime.sourceHash,
      expectedSenderReviewHash: review.sender.reviewHash,
      expectedBudgetSourceHash: review.budgets.sourceHash,
      decision,
      note: decisionNote.trim(),
    };
    const signature = JSON.stringify(withoutRequestId);
    const payload = decisionRetry.current?.signature === signature ?
      decisionRetry.current.payload : {
        requestId: createRequestId("message-budget-decision"),
        ...withoutRequestId,
      };
    decisionRetry.current = {signature, payload};
    const operation = beginOperation();
    if (!operation) return false;
    try {
      await decisionMutation.mutateAsync(payload);
      const refreshed = await reviewMutation.mutateAsync(normalizedScope(scope));
      setReviewResult(refreshed);
      setStagedResult(null);
      decisionRetry.current = null;
      stagingRetry.current = null;
      onError(null);
      onNotice("Finance decision recorded. It grants no spending authority.");
      return true;
    } catch (error) {
      onError(messageFromError(error, "Unable to record the finance decision."));
      return false;
    } finally {
      endOperation(operation);
    }
  }, [
    beginOperation,
    decisionDisabledReason,
    decisionKind,
    decisionMutation,
    decisionNote,
    endOperation,
    eventLimit,
    onError,
    onNotice,
    reviewMutation,
    reviewResult,
    scope,
    senderDayLimit,
    validUntil,
  ]);

  const stageDisabledReason = stagingBlocker(reviewResult, stagingNote);
  const stage = useCallback(async () => {
    const currentDecision = reviewResult?.decision;
    if (!currentDecision || stageDisabledReason) {
      onError(stageDisabledReason ?? "Record an approval first.");
      return false;
    }
    const withoutRequestId = {
      decisionId: currentDecision.decisionId,
      expectedDecisionRevision: currentDecision.revision,
      note: stagingNote.trim(),
    };
    const signature = JSON.stringify(withoutRequestId);
    const payload = stagingRetry.current?.signature === signature ?
      stagingRetry.current.payload : {
        requestId: createRequestId("message-budget-stage"),
        ...withoutRequestId,
      };
    stagingRetry.current = {signature, payload};
    const operation = beginOperation();
    if (!operation) return false;
    try {
      const response = await stagingMutation.mutateAsync(payload);
      setStagedResult(response);
      stagingRetry.current = null;
      onError(null);
      onNotice("Approved ceilings staged in paused status. No worker was activated.");
      return true;
    } catch (error) {
      onError(messageFromError(error, "Unable to stage the approved ceilings."));
      return false;
    } finally {
      endOperation(operation);
    }
  }, [
    beginOperation,
    endOperation,
    onError,
    onNotice,
    reviewResult,
    stageDisabledReason,
    stagingMutation,
    stagingNote,
  ]);

  return {
    scope,
    reviewResult,
    stagedResult,
    decisionKind,
    eventLimit,
    senderDayLimit,
    validUntil,
    decisionNote,
    stagingNote,
    isReviewing: reviewMutation.isPending,
    isDeciding: decisionMutation.isPending,
    isStaging: stagingMutation.isPending,
    decisionDisabledReason,
    stageDisabledReason,
    setScope,
    setDecisionKind,
    setEventLimit,
    setSenderDayLimit,
    setValidUntil,
    setDecisionNote,
    setStagingNote,
    review,
    decide,
    stage,
  };
}

export function parseMajorUnitsToMicros(value: string): number | null {
  const match = value.trim().match(/^(\d+)(?:\.(\d{1,6}))?$/u);
  if (!match) return null;
  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? "").padEnd(6, "0"));
  const micros = whole * 1_000_000 + fraction;
  return Number.isSafeInteger(micros) && micros > 0 ? micros : null;
}

function decisionBlocker({
  reviewResult,
  decisionKind,
  decisionNote,
  eventLimit,
  senderDayLimit,
  validUntil,
}: {
  reviewResult: AdminReviewEventMessagingBudgetCallableResponse | null;
  decisionKind: MessagingBudgetDecisionKind;
  decisionNote: string;
  eventLimit: string;
  senderDayLimit: string;
  validUntil: string;
}): string | null {
  if (!reviewResult) return "Review the current setup first.";
  const review = reviewResult.review;
  if (!review.sender || review.budgets.kind !== "reviewed") {
    return "The selected sender has no reviewable budget source.";
  }
  if (!decisionNote.trim()) return "Add a finance review note.";
  if (decisionKind !== "approve") return null;
  if (review.sender.availability !== "eligible") {
    return "Approval requires an eligible sender.";
  }
  if (review.runtime.appliesToPurpose &&
      (review.runtime.status !== "configured" || !review.runtime.selected)) {
    return "Approval requires this route to be selected in the current runtime.";
  }
  if (!parseMajorUnitsToMicros(eventLimit) ||
      !parseMajorUnitsToMicros(senderDayLimit)) {
    return "Enter positive event and sender-day ceilings with up to six decimals.";
  }
  const validUntilMs = Date.parse(validUntil);
  if (!Number.isSafeInteger(validUntilMs) ||
      validUntilMs <= review.completedAt ||
      validUntilMs > review.runtime.eventEnd + 24 * 60 * 60 * 1000) {
    return "Expiry must be after review and no later than 24 hours after the event.";
  }
  return null;
}

function stagingBlocker(
  reviewResult: AdminReviewEventMessagingBudgetCallableResponse | null,
  stagingNote: string
): string | null {
  if (reviewResult?.decision?.decisionStatus !== "approved") {
    return "A current approved decision is required.";
  }
  if (!stagingNote.trim()) return "Add a staging note.";
  return null;
}

function normalizedScope(
  scope: AdminReviewEventMessagingBudgetCallablePayload
): AdminReviewEventMessagingBudgetCallablePayload {
  return {
    ...scope,
    organizerId: scope.organizerId.trim(),
    eventId: scope.eventId.trim(),
    senderId: scope.senderId.trim(),
  };
}

function createRequestId(prefix: string): string {
  const entropy = globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  return `${prefix}-${entropy}`;
}

function messageFromError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as {message?: unknown}).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}
