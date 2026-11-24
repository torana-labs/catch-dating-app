import {act, cleanup, renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {createQueryHarness} from "../../../shared/test/queryHarness";
import {useInboxController} from "./useInboxController";

const repository = vi.hoisted(() => ({
  listInboxItems: vi.fn(),
  getInboxItem: vi.fn(),
  updateInboxItem: vi.fn(),
  recommendOrganizerClaim: vi.fn(),
  decideClaim: vi.fn(),
  decideAccess: vi.fn(),
  linkEnquiry: vi.fn(),
  getListingReview: vi.fn(),
  approveListing: vi.fn(),
  searchOrganizers: vi.fn(),
  getClaimEvidence: vi.fn(),
  getListingEventReview: vi.fn(),
  publishListingEvent: vi.fn(),
  nominateOrganizer: vi.fn(),
  sendLeadFollowUp: vi.fn(),
}));
vi.mock("../api/inboxRepository", () => repository);

const item = (itemId: string, type = "listing") => ({itemId, type, sourceKind: "supplyIntakeRequest", sourceId: itemId,
  sourcePath: `supplyIntakeRequests/${itemId}`, title: itemId, subtitle: null, cameFrom: "Website form",
  nominatorUid: null, city: "mumbai", state: {code: "ready", label: "Ready to decide", tone: "success"},
  status: "waiting", waitingSince: "2026-10-30T10:00:00.000Z", doneAt: null, assigneeUid: null,
  snoozedUntil: null, recommendation: null, listingEvent: null});
const totals = {scopes: {waiting: 3, mine: 0, snoozed: 0, working: 0},
  types: {all: 3, listing: 2, event: 0, claim: 1, enquiry: 0, access: 0, stuck: 0}};

describe("useInboxController", () => {
  afterEach(cleanup);
  beforeEach(() => {
    Object.values(repository).forEach((mock) => mock.mockReset());
    repository.listInboxItems.mockImplementation(async ({cursor}: {cursor: string | null}) => ({
      generatedAt: "2026-10-31T12:00:00.000Z", scope: "waiting", type: null, city: null, totals,
      items: cursor ? [item("older")] : [item("moonmoth"), item("brindle", "claim")],
      nextCursor: cursor ? null : "page-2", oldestWaitingSince: "2026-10-28T10:00:00.000Z"}));
    repository.getInboxItem.mockImplementation(async (itemId: string) => ({item: item(itemId), journey: [],
      canWork: true, canDecideClaim: false}));
    repository.updateInboxItem.mockResolvedValue({item: item("moonmoth")});
    repository.recommendOrganizerClaim.mockResolvedValue({requestId: "brindle", status: "pending",
      recommendation: {decision: "approve", byUid: "dev", at: "2026-10-31T12:00:00.000Z", note: "Checked."}});
  });

  it("lists with real totals, pages by the server's cursor and resets paging on a filter change", async () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useInboxController({onError: vi.fn(), onNotice: vi.fn(),
      selectedItemId: null, onSelect: vi.fn()}), {wrapper});
    await waitFor(() => expect(result.current.items.map((entry) => entry.itemId)).toEqual(["moonmoth", "brindle"]));
    expect(result.current.totals?.types.claim).toBe(1);
    act(() => result.current.nextPage());
    await waitFor(() => expect(result.current.items.map((entry) => entry.itemId)).toEqual(["older"]));
    expect(repository.listInboxItems).toHaveBeenLastCalledWith({scope: "waiting", type: null, city: null, limit: 25, cursor: "page-2"});
    act(() => result.current.setType("claim"));
    await waitFor(() => expect(repository.listInboxItems).toHaveBeenLastCalledWith({scope: "waiting", type: "claim",
      city: null, limit: 25, cursor: null}));
    expect(result.current.hasPreviousPage).toBe(false);
  });

  it("opens the selected item, knows its position, and moves on after a recommendation", async () => {
    const {wrapper} = createQueryHarness();
    const onSelect = vi.fn();
    const onNotice = vi.fn();
    const {result} = renderHook(() => useInboxController({onError: vi.fn(), onNotice,
      selectedItemId: "moonmoth", onSelect}), {wrapper});
    await waitFor(() => expect(result.current.detail.data?.item.itemId).toBe("moonmoth"));
    expect(result.current.position).toEqual({index: 1, of: 3});
    expect(result.current.nextItem?.itemId).toBe("brindle");
    await act(async () => {
      expect(await result.current.recommendClaim({requestId: "brindle", decision: "approve", note: "Checked."})).toBe(true);
    });
    expect(onNotice).toHaveBeenCalledWith("Recommended for approval. The owner decides.");
    expect(onSelect).toHaveBeenCalledWith("brindle");
  });

  it("the owner's claim decision moves on to the next item", async () => {
    repository.decideClaim.mockResolvedValue({requestId: "brindle", organizerId: "brindle", decision: "approve", status: "approved"});
    const {wrapper} = createQueryHarness();
    const onSelect = vi.fn();
    const onNotice = vi.fn();
    const {result} = renderHook(() => useInboxController({onError: vi.fn(), onNotice,
      selectedItemId: "moonmoth", onSelect}), {wrapper});
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    await act(async () => {
      expect(await result.current.decideClaim({requestId: "brindle", decision: "approve", decisionReason: null})).toBe(true);
    });
    expect(onNotice).toHaveBeenCalledWith("Claim approved. They run the page now.");
    expect(onSelect).toHaveBeenCalledWith("brindle");
  });

  it("searches organizers to link an enquiry, and links it", async () => {
    repository.searchOrganizers.mockResolvedValue([{organizerId: "quayside-supper", name: "Quayside Supper Club", city: "Mumbai"}]);
    repository.linkEnquiry.mockResolvedValue(undefined);
    const {wrapper} = createQueryHarness();
    const onNotice = vi.fn();
    const {result} = renderHook(() => useInboxController({onError: vi.fn(), onNotice,
      selectedItemId: "moonmoth", onSelect: vi.fn()}), {wrapper});
    act(() => result.current.setHostQuery("H"));
    expect(result.current.hostMatches).toEqual([]);
    act(() => result.current.setHostQuery("Harbor"));
    await waitFor(() => expect(result.current.hostMatches.map((match) => match.name)).toEqual(["Quayside Supper Club"]));
    await act(async () => {
      expect(await result.current.linkEnquiry({intentId: "intent-1", organizerId: "quayside-supper"}, "Quayside Supper Club")).toBe(true);
    });
    expect(repository.linkEnquiry.mock.calls[0]![0]).toEqual({intentId: "intent-1", organizerId: "quayside-supper"});
    expect(onNotice).toHaveBeenCalledWith("Linked to Quayside Supper Club. Their Sales work is open.");
  });

  it("sends a lead's follow-up once, reusing its request id only after a lost answer", async () => {
    repository.sendLeadFollowUp.mockRejectedValueOnce(Object.assign(new Error("deadline"), {code: "functions/deadline-exceeded"}));
    repository.sendLeadFollowUp.mockResolvedValueOnce({replayed: false});
    repository.sendLeadFollowUp.mockRejectedValueOnce(Object.assign(new Error("A follow-up went to this number on 20 Nov."),
      {code: "functions/failed-precondition"}));
    repository.sendLeadFollowUp.mockResolvedValueOnce({replayed: false});
    const {wrapper} = createQueryHarness();
    const onNotice = vi.fn();
    const onError = vi.fn();
    const {result} = renderHook(() => useInboxController({onError, onNotice,
      selectedItemId: "moonmoth", onSelect: vi.fn()}), {wrapper});
    await act(async () => {
      expect(await result.current.sendFollowUp("intent-1")).toBe(false);
      expect(await result.current.sendFollowUp("intent-1")).toBe(true);
      expect(await result.current.sendFollowUp("intent-1")).toBe(false);
      expect(await result.current.sendFollowUp("intent-1")).toBe(true);
    });
    const ids = repository.sendLeadFollowUp.mock.calls.map(([input]) => (input as {clientRequestId: string}).clientRequestId);
    expect(ids[1]).toBe(ids[0]);
    expect(ids[2]).not.toBe(ids[1]);
    expect(ids[3]).not.toBe(ids[2]);
    expect(onError).toHaveBeenCalledWith("A follow-up went to this number on 20 Nov.");
    expect(onNotice).toHaveBeenCalledWith("Follow-up sent on WhatsApp. It's in their Support thread.");
  });

  it("opens a listing's review and approves it once, replaying the same request id on a retry", async () => {
    repository.getListingReview.mockResolvedValue({canApprove: true, review: {requestId: "req-1", listingWorkItemId: "wi-1"}});
    repository.approveListing.mockRejectedValueOnce(new Error("network"));
    repository.approveListing.mockResolvedValue({created: true});
    const {wrapper} = createQueryHarness();
    const onSelect = vi.fn();
    const onError = vi.fn();
    const {result} = renderHook(() => useInboxController({onError, onNotice: vi.fn(), selectedItemId: "moonmoth", onSelect}), {wrapper});
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    act(() => result.current.openListingReview("req-1"));
    await waitFor(() => expect(result.current.listingReview?.review.requestId).toBe("req-1"));
    const input = {listingWorkItemId: "wi-1", contentHash: "a".repeat(64), name: "Moonmoth", publicSlug: "moonmoth",
      marketId: "in-mh-mumbai", organizerType: "community", checklist: {}, note: "Checked the Luma calendar."} as never;
    await act(async () => { expect(await result.current.approveListing(input, "req-1")).toBe(false); });
    expect(onError).toHaveBeenLastCalledWith("network");
    expect(result.current.listingReview).not.toBeNull();
    await act(async () => { expect(await result.current.approveListing(input, "req-1")).toBe(true); });
    const [first, second] = repository.approveListing.mock.calls.map((call) => (call[0] as {requestId: string}).requestId);
    expect(second).toBe(first);
    expect(onSelect).toHaveBeenCalledWith("brindle");
    expect(result.current.listingReview).toBeNull();
  });

  it("opens an event's review and publishes it, keeping its key across a retry and moving on", async () => {
    const {wrapper} = createQueryHarness();
    const onSelect = vi.fn();
    const onError = vi.fn();
    const onNotice = vi.fn();
    const review = {policy: {mode: "staff_review", policyVersion: "v1"}, organizer: {organizerId: "moonmoth"}, event: {eventWorkItemId: "work-1"}};
    repository.getListingEventReview.mockResolvedValue(review);
    const outcome = (entry: Record<string, unknown>) => ({results: [{eventWorkItemId: "work-1", blockers: [], ...entry}]});
    repository.publishListingEvent
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(outcome({outcome: "blocked", blockers: ["missing_end_time"]}))
      .mockResolvedValueOnce(outcome({outcome: "published"}));
    const {result} = renderHook(() => useInboxController({onError, onNotice, selectedItemId: "moonmoth", onSelect}), {wrapper});
    await waitFor(() => expect(result.current.nextItem?.itemId).toBe("brindle"));
    act(() => result.current.openEventReview({intakeRequestId: "req", eventWorkItemId: "work-1"}));
    await waitFor(() => expect(result.current.eventReview).toEqual(review));

    const request = {intakeRequestId: "req", eventWorkItemIds: ["work-1"], reviewNote: "Checked it on Luma."} as never;
    await act(async () => { expect(await result.current.publishEvent(request, "Mixer")).toBe(false); });
    await act(async () => { expect(await result.current.publishEvent(request, "Mixer")).toBe(false); });
    expect(onError).toHaveBeenLastCalledWith("Mixer is still blocked: no end time.");
    expect(onSelect).not.toHaveBeenCalled();
    await act(async () => { expect(await result.current.publishEvent(request, "Mixer")).toBe(true); });
    const keys = repository.publishListingEvent.mock.calls.map(([input]) => input.idempotencyKey);
    expect(new Set(keys).size).toBe(1);
    expect(repository.publishListingEvent.mock.calls[0][0].executionMode).toBe("apply");
    expect(onNotice).toHaveBeenLastCalledWith("Mixer is published on the organizer's page.");
    expect(onSelect).toHaveBeenLastCalledWith("brindle");
    await waitFor(() => expect(result.current.eventReview).toBeNull());
  });

  it("loads a claim's evidence only for a claim", async () => {
    const {wrapper} = createQueryHarness();
    const evidence = {requestId: "brindle", proofUrls: []};
    repository.getClaimEvidence.mockResolvedValue(evidence);
    repository.getInboxItem.mockImplementation(async (itemId: string) => ({item: item(itemId, itemId === "brindle" ? "claim" : "listing"), journey: [],
      canWork: true, canDecideClaim: true}));
    const {result, rerender} = renderHook(({selected}) => useInboxController({onError: vi.fn(), onNotice: vi.fn(), selectedItemId: selected, onSelect: vi.fn()}),
      {wrapper, initialProps: {selected: "moonmoth"}});
    await waitFor(() => expect(result.current.detail.data?.item.itemId).toBe("moonmoth"));
    expect(repository.getClaimEvidence).not.toHaveBeenCalled();
    expect(result.current.claimEvidence).toBeNull();
    rerender({selected: "brindle"});
    await waitFor(() => expect(result.current.claimEvidence).toEqual(evidence));
    expect(repository.getClaimEvidence).toHaveBeenCalledWith("brindle");
  });

  it("fills in a stuck nomination, and a retry after a failed close keeps the same request", async () => {
    repository.nominateOrganizer.mockResolvedValue(undefined);
    repository.updateInboxItem.mockRejectedValueOnce(new Error("offline")).mockResolvedValue({});
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useInboxController({onError: vi.fn(), onNotice: vi.fn(),
      selectedItemId: "moonmoth", onSelect: vi.fn()}), {wrapper});
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    const details = {name: "Saffron Table", market: "Mumbai", urls: [], notes: null, categories: [], formats: ["supper" as const]};
    await act(async () => {
      expect(await result.current.fillInByHand(details, "moonmoth")).toBe(false);
    });
    await act(async () => {
      expect(await result.current.fillInByHand(details, "moonmoth")).toBe(true);
    });
    const [first, second] = repository.nominateOrganizer.mock.calls.map(([input]) => input);
    expect(first).toMatchObject(details);
    expect(second.requestId).toBe(first.requestId);
    expect(repository.updateInboxItem).toHaveBeenLastCalledWith(expect.objectContaining({itemId: "moonmoth", action: "dismiss"}), expect.anything());
  });

  it("reports a failed action and stays on the item", async () => {
    repository.updateInboxItem.mockRejectedValue(new Error("This item is already done."));
    const {wrapper} = createQueryHarness();
    const onError = vi.fn();
    const onSelect = vi.fn();
    const {result} = renderHook(() => useInboxController({onError, onNotice: vi.fn(),
      selectedItemId: "moonmoth", onSelect}), {wrapper});
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    await act(async () => {
      expect(await result.current.updateItem({itemId: "moonmoth", action: "snooze", assigneeUid: null,
        snoozedUntil: "2026-11-02T12:00:00.000Z", note: null}, "Snoozed.")).toBe(false);
    });
    expect(onError).toHaveBeenLastCalledWith("This item is already done.");
    expect(onSelect).not.toHaveBeenCalled();
  });
});
