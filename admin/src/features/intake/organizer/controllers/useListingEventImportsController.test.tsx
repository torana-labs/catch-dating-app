import {act, cleanup, renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {createQueryHarness} from "../../../../shared/test/queryHarness";
import {useListingEventImportsController} from "./useListingEventImportsController";

const repository = vi.hoisted(() => ({
  listListingEventImports: vi.fn(),
  publishListingEvents: vi.fn(),
  refreshOrganizerEvents: vi.fn(),
  withdrawImportedEvent: vi.fn(),
}));
vi.mock("../api/listingEventImportRepository", () => repository);

const policy = {mode: "auto_publish_approved_organizers", policyVersion: "supply-event-publication-v1"};
const row = (id: string) => ({intakeRequestId: `nom-${id}`, listingId: `listing-${id}`,
  approvedAt: "2026-10-24T09:00:00.000Z", events: [],
  organizer: {organizerId: id, name: id, canonicalPath: `/organizers/${id}/`, appVisibility: "hidden",
    pagePublished: true}});
const publishInput = {intakeRequestId: "nom-afterfly", eventWorkItemIds: ["event-1", "event-2"],
  reviewNote: "Checked both events on Luma.", blockerResolutions: [],
  checklist: {outboundLinksReviewed: true, noCatchBookingPaymentsWaitlist: true, ownerSafeCopyReviewed: true}};
const publishResult = (counts: Partial<Record<string, number>>, blockers: string[] = []) => ({
  intakeRequestId: "nom-afterfly", organizerId: "afterfly", executionMode: "apply",
  results: [{eventWorkItemId: "event-2", eventId: "ext-2", outcome: blockers.length ? "blocked" : "published",
    blockers, receiptPath: null, idempotent: false}],
  counts: {published: 0, wouldPublish: 0, alreadyPublished: 0, withdrawn: 0, blocked: 0, ...counts},
});

describe("useListingEventImportsController", () => {
  afterEach(cleanup);
  beforeEach(() => {
    Object.values(repository).forEach((mock) => mock.mockReset());
    repository.listListingEventImports.mockImplementation(async ({cursor}: {cursor: string | null}) =>
      cursor ? {policy, rows: [row("older")], nextCursor: null, unavailableCount: 0} :
        {policy, rows: [row("afterfly")], nextCursor: "page-2", unavailableCount: 1});
  });

  it("pages through approved listings and reports the policy", async () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useListingEventImportsController({onError: vi.fn(), onNotice: vi.fn()}),
      {wrapper});
    await waitFor(() => expect(result.current.rows.map((entry) => entry.intakeRequestId)).toEqual(["nom-afterfly"]));
    expect([result.current.policy?.mode, result.current.unavailableCount, result.current.hasNextPage])
      .toEqual(["auto_publish_approved_organizers", 1, true]);
    act(() => result.current.nextPage());
    await waitFor(() => expect(result.current.rows.map((entry) => entry.intakeRequestId)).toEqual(["nom-older"]));
    expect(repository.listListingEventImports).toHaveBeenLastCalledWith({limit: 5, cursor: "page-2"});
    act(() => result.current.previousPage());
    await waitFor(() => expect(result.current.hasPreviousPage).toBe(false));
  });

  it("retries a publish under the same key and says what is still blocked", async () => {
    const {wrapper} = createQueryHarness();
    const onError = vi.fn(), onNotice = vi.fn();
    repository.publishListingEvents.mockRejectedValueOnce(new Error("deadline-exceeded"))
      .mockResolvedValueOnce(publishResult({published: 1, blocked: 1}, ["event_already_ended"]));
    const {result} = renderHook(() => useListingEventImportsController({onError, onNotice}), {wrapper});
    let first = true, second = true;
    await act(async () => { first = await result.current.publish(publishInput); });
    await act(async () => { second = await result.current.publish(publishInput); });
    expect([first, second]).toEqual([false, false]);
    expect(onError).toHaveBeenCalledWith("deadline-exceeded");
    const [a, b] = repository.publishListingEvents.mock.calls.map(([request]) => request);
    expect([a.idempotencyKey, a.executionMode]).toEqual([b.idempotencyKey, "apply"]);
    expect(onNotice).toHaveBeenCalledWith("1 published. 1 still blocked: event_already_ended.");
  });

  it("withdraws a published event and refreshes the list", async () => {
    const {wrapper} = createQueryHarness();
    const onNotice = vi.fn();
    repository.withdrawImportedEvent.mockResolvedValue({});
    const {result} = renderHook(() => useListingEventImportsController({onError: vi.fn(), onNotice}), {wrapper});
    await waitFor(() => expect(result.current.rows.length).toBe(1));
    let done = false;
    await act(async () => { done = await result.current.withdraw({eventId: "ext-1", reviewNote: "Organizer asked."}); });
    expect(done).toBe(true);
    expect(repository.withdrawImportedEvent.mock.calls[0][0]).toEqual({eventId: "ext-1",
      reviewNote: "Organizer asked.", idempotencyKey: expect.stringMatching(/^admin:/)});
    expect(onNotice).toHaveBeenCalledWith("The event is off the website and the app. Its record stays.");
    await waitFor(() => expect(repository.listListingEventImports.mock.calls.length).toBeGreaterThan(1));
  });

  it("asks for new events for a listed organizer and says how many pages it will read", async () => {
    const {wrapper} = createQueryHarness();
    const onNotice = vi.fn();
    repository.refreshOrganizerEvents.mockResolvedValue({requestId: "refresh-1", created: true, status: "queued",
      urls: ["https://lu.ma/afterfly", "https://district.in/afterfly"]});
    const {result} = renderHook(() => useListingEventImportsController({onError: vi.fn(), onNotice}), {wrapper});
    let done = false;
    await act(async () => { done = await result.current.refresh("afterfly"); });
    expect(done).toBe(true);
    expect(repository.refreshOrganizerEvents.mock.calls[0][0]).toEqual({organizerId: "afterfly", urls: [],
      requestId: expect.stringMatching(/^refresh-/)});
    expect(onNotice).toHaveBeenCalledWith(
      "Reading 2 pages for new events. They appear here when the read finishes.");
  });
});
