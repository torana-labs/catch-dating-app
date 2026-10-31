import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {act, renderHook, waitFor} from "@testing-library/react";
import type {PropsWithChildren} from "react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {sampleOverview} from "../../../shared/api/sampleData";
import {useSafetyTriageController} from "./useSafetyTriageController";

const repository = vi.hoisted(() => ({
  assignSafetyTriageItemOwner: vi.fn(),
  decideSafetyTriageItemStatus: vi.fn(),
  loadSafetyTriageItem: vi.fn(),
  loadSafetyTriageSnapshot: vi.fn(),
}));

vi.mock("../api/safetyTriageRepository", () => repository);

function createWrapper() {
  const queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}});
  return function Wrapper({children}: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useSafetyTriageController", () => {
  beforeEach(() => {
    Object.values(repository).forEach((mock) => mock.mockReset());
    repository.loadSafetyTriageSnapshot.mockResolvedValue(sampleOverview);
    repository.loadSafetyTriageItem.mockResolvedValue({item: null});
  });

  it("loads, scopes, filters, and selects safety rows without heuristic metadata", async () => {
    const onError = vi.fn();
    const onNotice = vi.fn();
    const {result} = renderHook(
      () => useSafetyTriageController({onError, onNotice}),
      {wrapper: createWrapper()}
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.rows).toHaveLength(5);
    expect(result.current.metrics).toEqual({
      reports: 4,
      moderation: 7,
      eventReports: 2,
    });
    expect(result.current.rows[0]).not.toHaveProperty("priority");
    expect(result.current.rows[0]).not.toHaveProperty("routeOwner");

    act(() => result.current.setQueueFilter("event"));
    expect(result.current.filteredRows.map((row) => row.queueKind)).toEqual(["event"]);

    act(() => result.current.select(result.current.filteredRows[0]!));
    expect(result.current.selected?.queueKind).toBe("event");
    expect(result.current.decisionValidationIssue).toBe(
      "Add a review note before deciding this item."
    );
  });

  it("validates and records a successful decision", async () => {
    const onError = vi.fn();
    const onNotice = vi.fn();
    repository.decideSafetyTriageItemStatus.mockImplementation(async (payload) => ({
      targetPath: payload.targetPath,
      decision: payload.decision,
      status: "reviewed",
    }));
    const {result} = renderHook(
      () => useSafetyTriageController({onError, onNotice}),
      {wrapper: createWrapper()}
    );

    await waitFor(() => expect(result.current.rows.length).toBeGreaterThan(0));
    const selected = result.current.rows[0]!;
    const beforeMetric = result.current.metrics[metricKeyFor(selected.queueKind)];
    const beforeRows = result.current.rows.length;
    act(() => {
      result.current.select(selected);
      result.current.setDecisionForm({note: "  reviewed evidence  "});
    });
    await act(async () => {
      await expect(result.current.decide("review")).resolves.toBe(true);
    });

    expect(repository.decideSafetyTriageItemStatus.mock.calls[0]?.[0]).toEqual({
      targetPath: selected.targetPath,
      decision: "review",
      note: "reviewed evidence",
    });
    await waitFor(() => {
      expect(result.current.rows).toHaveLength(beforeRows - 1);
      expect(result.current.metrics[metricKeyFor(selected.queueKind)])
        .toBe(beforeMetric - 1);
    });
    expect(onNotice).toHaveBeenLastCalledWith(`Reviewed ${selected.title}.`);
  });

  it("loads a direct detail route even when the case is outside the capped preview", async () => {
    const targetPath = "reports/outside-preview";
    repository.loadSafetyTriageItem.mockResolvedValue({
      item: safetyDetailFixture(targetPath),
    });
    const {result} = renderHook(
      () => useSafetyTriageController({
        onError: vi.fn(),
        onNotice: vi.fn(),
        selectedTargetPath: targetPath,
      }),
      {wrapper: createWrapper()}
    );

    await waitFor(() => expect(result.current.selected?.targetPath).toBe(targetPath));
    expect(repository.loadSafetyTriageSnapshot).not.toHaveBeenCalled();
    expect(repository.loadSafetyTriageItem).toHaveBeenCalledWith(targetPath);
    expect(result.current.selectedDetail?.assignment.severity).toBe("high");
  });

  it("hands selection to URL-owned route state", async () => {
    const onSelectedTargetPathChange = vi.fn();
    const {result} = renderHook(
      () => useSafetyTriageController({
        onError: vi.fn(),
        onNotice: vi.fn(),
        onSelectedTargetPathChange,
        selectedTargetPath: null,
      }),
      {wrapper: createWrapper()}
    );

    await waitFor(() => expect(result.current.rows.length).toBeGreaterThan(0));
    const row = result.current.rows[0]!;
    act(() => result.current.select(row));

    expect(onSelectedTargetPathChange).toHaveBeenCalledWith(row.targetPath);
    expect(result.current.selected).toBeNull();
  });
});

function safetyDetailFixture(targetPath: string) {
  return {
    targetPath,
    kind: "report" as const,
    title: "Direct report",
    summary: "Evidence-backed report detail",
    status: "open",
    createdAt: "2026-07-13T08:00:00.000Z",
    updatedAt: null,
    primaryUserId: "user-primary",
    secondaryUserId: "user-secondary",
    eventId: null,
    organizerId: null,
    source: "chat",
    contextId: "chat-1",
    assignment: {
      ownerTeam: "Trust and safety",
      assigneeUid: null,
      queue: "reports",
      severity: "high" as const,
    },
    sla: {
      dueAt: "2026-07-14T08:00:00.000Z",
      state: "due_soon" as const,
      policy: "High-severity report review",
    },
    evidence: [],
    fields: [],
    priorHistory: [],
    outcomeGuidance: [],
    nextActions: [],
  };
}

function metricKeyFor(queueKind: "reports" | "moderation" | "event"):
  "reports" | "moderation" | "eventReports" {
  if (queueKind === "event") return "eventReports";
  return queueKind;
}
