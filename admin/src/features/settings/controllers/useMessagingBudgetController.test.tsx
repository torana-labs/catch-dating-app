import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {act, renderHook, waitFor} from "@testing-library/react";
import type {PropsWithChildren} from "react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import type {AdminReviewEventMessagingBudgetCallableResponse} from
  "../../../generated/contracts/adminReviewEventMessagingBudgetCallableResponse";
import {
  parseMajorUnitsToMicros,
  useMessagingBudgetController,
} from "./useMessagingBudgetController";

const mocks = vi.hoisted(() => ({
  loadMessagingBudgetReview: vi.fn(),
  recordMessagingBudgetDecision: vi.fn(),
  stageApprovedMessagingBudget: vi.fn(),
}));

vi.mock("../api/grantedPlansRepository", () => mocks);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {mutations: {retry: false}},
  });
  return function Wrapper({children}: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

const baseReview: AdminReviewEventMessagingBudgetCallableResponse = {
  schemaVersion: 1,
  review: {
    schemaVersion: 1,
    kind: "recordedSetupReview",
    context: {mode: "live", organizerId: "organizer-1", eventId: "event-1"},
    routeId: "catchEventSms",
    senderId: "sender-1",
    purpose: "joiningUpdate",
    observedAt: 1_800_000_000_000,
    completedAt: 1_800_000_000_000,
    grantsDispatchAuthority: false,
    runtime: {
      appliesToPurpose: true,
      status: "configured",
      revision: 2,
      selected: true,
      sourceHash: "a".repeat(64),
      eventEnd: 1_800_086_400_000,
    },
    sender: {
      routeId: "catchEventSms",
      senderId: "sender-1",
      displayName: "Catch",
      displayAddress: "CATCH",
      availability: "eligible",
      reviewHash: "b".repeat(64),
    },
    budgets: {
      kind: "reviewed",
      currency: "INR",
      sourceHash: "c".repeat(64),
      event: {
        budgetId: "event-budget",
        scope: {
          kind: "event",
          context: {mode: "live", organizerId: "organizer-1", eventId: "event-1"},
        },
        kind: "unavailable",
        reason: "missing",
      },
      senderDay: {
        budgetId: "sender-day-budget",
        scope: {kind: "senderDay", day: "2027-01-15"},
        kind: "unavailable",
        reason: "missing",
      },
    },
  },
  decision: null,
  grantsSpendingAuthority: false,
  grantsDispatchAuthority: false,
};

describe("useMessagingBudgetController", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.loadMessagingBudgetReview.mockResolvedValue(baseReview);
  });

  it("reviews exact scope and reuses the request id after a failed decision", async () => {
    mocks.recordMessagingBudgetDecision
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce({
        schemaVersion: 1,
        applied: true,
        replayed: false,
        decisionId: "decision-1",
        revision: 1,
        decisionStatus: "held",
        decisionPath: "eventMessagingBudgetDecisions/decision-1",
        effect: "decision_only_no_spending_authority",
        grantsSpendingAuthority: false,
      });
    mocks.loadMessagingBudgetReview
      .mockResolvedValueOnce(baseReview)
      .mockResolvedValueOnce({
        ...baseReview,
        decision: {
          decisionId: "decision-1",
          revision: 1,
          decisionStatus: "held",
          decisionKind: "hold",
          reviewedByUid: "finance-1",
          note: "Wait for quote confirmation",
          effect: "decision_only_no_spending_authority",
          grantsSpendingAuthority: false,
        },
      });
    const {result} = renderHook(() => useMessagingBudgetController({
      onError: vi.fn(),
      onNotice: vi.fn(),
    }), {wrapper: createWrapper()});

    act(() => {
      result.current.setScope("organizerId", " organizer-1 ");
      result.current.setScope("eventId", "event-1");
      result.current.setScope("senderId", "sender-1");
    });
    await act(async () => expect(await result.current.review()).toBe(true));
    expect(mocks.loadMessagingBudgetReview.mock.calls[0][0]).toEqual({
      organizerId: "organizer-1",
      eventId: "event-1",
      routeId: "catchEventSms",
      senderId: "sender-1",
      purpose: "joiningUpdate",
    });

    act(() => result.current.setDecisionNote("Wait for quote confirmation"));
    await act(async () => expect(await result.current.decide()).toBe(false));
    await act(async () => expect(await result.current.decide()).toBe(true));

    const firstPayload = mocks.recordMessagingBudgetDecision.mock.calls[0][0];
    const retryPayload = mocks.recordMessagingBudgetDecision.mock.calls[1][0];
    expect(retryPayload.requestId).toBe(firstPayload.requestId);
    expect(retryPayload).toMatchObject({
      expectedRevision: 0,
      expectedRuntimeSourceHash: "a".repeat(64),
      expectedSenderReviewHash: "b".repeat(64),
      expectedBudgetSourceHash: "c".repeat(64),
      decision: {kind: "hold"},
    });
    await waitFor(() => expect(result.current.reviewResult?.decision?.revision).toBe(1));
  });

  it("stages only the current approval and preserves the no-authority receipt", async () => {
    mocks.loadMessagingBudgetReview.mockResolvedValue({
      ...baseReview,
      decision: {
        decisionId: "decision-approved",
        revision: 4,
        decisionStatus: "approved",
        decisionKind: "approve",
        reviewedByUid: "finance-1",
        note: "Approved for this event",
        effect: "decision_only_no_spending_authority",
        grantsSpendingAuthority: false,
      },
    });
    mocks.stageApprovedMessagingBudget.mockResolvedValue({
      schemaVersion: 1,
      applied: true,
      replayed: false,
      decisionId: "decision-approved",
      decisionRevision: 4,
      receiptId: "receipt-1",
      receiptPath: "eventMessagingBudgetApplications/receipt-1",
      routeId: "catchEventSms",
      eventBudget: {
        budgetId: "event-budget",
        revision: 1,
        path: "eventMessagingBudgets/event-budget",
        status: "paused",
      },
      senderDayBudget: {
        budgetId: "sender-day-budget",
        revision: 1,
        path: "senderDayMessagingBudgets/sender-day-budget",
        status: "paused",
      },
      effect: "budgets_staged_paused_no_spending_or_dispatch_authority",
      stagesSpendingCeilings: true,
      grantsSpendingAuthority: false,
      grantsDispatchAuthority: false,
      providerContacted: false,
      workerActivated: false,
    });
    const {result} = renderHook(() => useMessagingBudgetController({
      onError: vi.fn(),
      onNotice: vi.fn(),
    }), {wrapper: createWrapper()});
    act(() => {
      result.current.setScope("organizerId", "organizer-1");
      result.current.setScope("eventId", "event-1");
      result.current.setScope("senderId", "sender-1");
    });
    await act(async () => void await result.current.review());
    act(() => result.current.setStagingNote("Stage for activation review"));
    await act(async () => expect(await result.current.stage()).toBe(true));

    expect(mocks.stageApprovedMessagingBudget.mock.calls[0][0]).toEqual(expect.objectContaining({
      decisionId: "decision-approved",
      expectedDecisionRevision: 4,
      note: "Stage for activation review",
    }));
    expect(result.current.stagedResult).toMatchObject({
      grantsSpendingAuthority: false,
      grantsDispatchAuthority: false,
      providerContacted: false,
      workerActivated: false,
    });
  });
});

describe("parseMajorUnitsToMicros", () => {
  it("parses decimal limits exactly and rejects invalid precision", () => {
    expect(parseMajorUnitsToMicros("12.345678")).toBe(12_345_678);
    expect(parseMajorUnitsToMicros("0.000001")).toBe(1);
    expect(parseMajorUnitsToMicros("12.3456789")).toBeNull();
    expect(parseMajorUnitsToMicros("0")).toBeNull();
  });
});
