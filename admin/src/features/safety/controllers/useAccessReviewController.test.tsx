import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {act, renderHook, waitFor} from "@testing-library/react";
import type {PropsWithChildren} from "react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {sampleOverview} from "../../../shared/api/sampleData";
import {
  applicationUidFromTargetPath,
  useAccessReviewController,
} from "./useAccessReviewController";

const repository = vi.hoisted(() => ({
  decideAccessReview: vi.fn(),
  listAccessApplications: vi.fn(),
  loadAccessApplicationDetails: vi.fn(),
}));

vi.mock("../api/accessReviewRepository", () => repository);

function createWrapper() {
  const queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}});
  return function Wrapper({children}: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useAccessReviewController", () => {
  beforeEach(() => {
    Object.values(repository).forEach((mock) => mock.mockReset());
    repository.listAccessApplications.mockResolvedValue({
      generatedAt: sampleOverview.generatedAt,
      pendingTotal: sampleOverview.metrics.find(
        (metric) => metric.id === "pendingApplications"
      )?.value ?? sampleOverview.queues.accessApplications.length,
      rows: sampleOverview.queues.accessApplications,
    });
    repository.loadAccessApplicationDetails.mockResolvedValue({application: {}});
  });

  it("loads, filters, and validates access applications", async () => {
    const onError = vi.fn();
    const {result} = renderHook(
      () => useAccessReviewController({onError, onNotice: vi.fn()}),
      {wrapper: createWrapper()}
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.rows).toHaveLength(2);
    act(() => result.current.setQuery("mumbai host"));
    expect(result.current.filteredRows.map((row) => row.title)).toEqual(["Rohan Mehta"]);
    act(() => result.current.select(result.current.filteredRows[0]!));
    expect(result.current.validationIssue).toBe(
      "Add a review note before approving or denying access."
    );
  });

  it("trims the review payload and records approval", async () => {
    const onNotice = vi.fn();
    repository.decideAccessReview.mockImplementation(async (payload) => ({
      applicationUid: payload.applicationUid,
      decision: payload.decision,
      status: "approvedForProfile",
    }));
    const {result} = renderHook(
      () => useAccessReviewController({onError: vi.fn(), onNotice}),
      {wrapper: createWrapper()}
    );

    await waitFor(() => expect(result.current.rows.length).toBe(2));
    const selected = result.current.rows[0]!;
    act(() => {
      result.current.select(selected);
      result.current.setForm({note: "  verified host  ", cohortId: "  july  "});
    });
    await act(async () => {
      await expect(result.current.decide("approve")).resolves.toBe(true);
    });

    expect(repository.decideAccessReview.mock.calls[0]?.[0]).toEqual({
      applicationUid: applicationUidFromTargetPath(selected.targetPath),
      decision: "approve",
      note: "verified host",
      cohortId: "july",
    });
    expect(result.current.selectedApplicationUid).toBeNull();
    expect(onNotice).toHaveBeenLastCalledWith(
      `Approved ${selected.title} for profile creation.`
    );
  });

  it("keeps a direct-link detail failure visible after the bounded list loads", async () => {
    const onError = vi.fn();
    repository.loadAccessApplicationDetails.mockRejectedValue(
      new Error("Application not found.")
    );
    const {result} = renderHook(
      () => useAccessReviewController({
        onError,
        onNotice: vi.fn(),
        selectedApplicationUid: "outside-preview",
      }),
      {wrapper: createWrapper()}
    );

    await waitFor(() => expect(result.current.selectedUnavailable).toBe(true));
    expect(result.current.isDetailLoading).toBe(false);
    expect(result.current.detailError).toContain("Application not found.");
    expect(onError).toHaveBeenLastCalledWith("Application not found.");
  });
});
