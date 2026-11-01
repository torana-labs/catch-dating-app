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
  searchOrganizers: vi.fn(),
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
      items: cursor ? [item("older")] : [item("afterfly"), item("bhag", "claim")],
      nextCursor: cursor ? null : "page-2", oldestWaitingSince: "2026-10-28T10:00:00.000Z"}));
    repository.getInboxItem.mockImplementation(async (itemId: string) => ({item: item(itemId), journey: [],
      canWork: true, canDecideClaim: false}));
    repository.updateInboxItem.mockResolvedValue({item: item("afterfly")});
    repository.recommendOrganizerClaim.mockResolvedValue({requestId: "bhag", status: "pending",
      recommendation: {decision: "approve", byUid: "dev", at: "2026-10-31T12:00:00.000Z", note: "Checked."}});
  });

  it("lists with real totals, pages by the server's cursor and resets paging on a filter change", async () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useInboxController({onError: vi.fn(), onNotice: vi.fn(),
      selectedItemId: null, onSelect: vi.fn()}), {wrapper});
    await waitFor(() => expect(result.current.items.map((entry) => entry.itemId)).toEqual(["afterfly", "bhag"]));
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
      selectedItemId: "afterfly", onSelect}), {wrapper});
    await waitFor(() => expect(result.current.detail.data?.item.itemId).toBe("afterfly"));
    expect(result.current.position).toEqual({index: 1, of: 3});
    expect(result.current.nextItem?.itemId).toBe("bhag");
    await act(async () => {
      expect(await result.current.recommendClaim({requestId: "bhag", decision: "approve", note: "Checked."})).toBe(true);
    });
    expect(onNotice).toHaveBeenCalledWith("Recommended for approval. The owner decides.");
    expect(onSelect).toHaveBeenCalledWith("bhag");
  });

  it("the owner's claim decision moves on to the next item", async () => {
    repository.decideClaim.mockResolvedValue({requestId: "bhag", organizerId: "bhag", decision: "approve", status: "approved"});
    const {wrapper} = createQueryHarness();
    const onSelect = vi.fn();
    const onNotice = vi.fn();
    const {result} = renderHook(() => useInboxController({onError: vi.fn(), onNotice,
      selectedItemId: "afterfly", onSelect}), {wrapper});
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    await act(async () => {
      expect(await result.current.decideClaim({requestId: "bhag", decision: "approve", decisionReason: null})).toBe(true);
    });
    expect(onNotice).toHaveBeenCalledWith("Claim approved. They run the page now.");
    expect(onSelect).toHaveBeenCalledWith("bhag");
  });

  it("searches organizers to link an enquiry, and links it", async () => {
    repository.searchOrganizers.mockResolvedValue([{organizerId: "harbor-social", name: "Harbor Social Club", city: "Mumbai"}]);
    repository.linkEnquiry.mockResolvedValue(undefined);
    const {wrapper} = createQueryHarness();
    const onNotice = vi.fn();
    const {result} = renderHook(() => useInboxController({onError: vi.fn(), onNotice,
      selectedItemId: "afterfly", onSelect: vi.fn()}), {wrapper});
    act(() => result.current.setHostQuery("H"));
    expect(result.current.hostMatches).toEqual([]);
    act(() => result.current.setHostQuery("Harbor"));
    await waitFor(() => expect(result.current.hostMatches.map((match) => match.name)).toEqual(["Harbor Social Club"]));
    await act(async () => {
      expect(await result.current.linkEnquiry({intentId: "intent-1", organizerId: "harbor-social"}, "Harbor Social Club")).toBe(true);
    });
    expect(repository.linkEnquiry.mock.calls[0]![0]).toEqual({intentId: "intent-1", organizerId: "harbor-social"});
    expect(onNotice).toHaveBeenCalledWith("Linked to Harbor Social Club. Their Sales work is open.");
  });

  it("reports a failed action and stays on the item", async () => {
    repository.updateInboxItem.mockRejectedValue(new Error("This item is already done."));
    const {wrapper} = createQueryHarness();
    const onError = vi.fn();
    const onSelect = vi.fn();
    const {result} = renderHook(() => useInboxController({onError, onNotice: vi.fn(),
      selectedItemId: "afterfly", onSelect}), {wrapper});
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    await act(async () => {
      expect(await result.current.updateItem({itemId: "afterfly", action: "snooze", assigneeUid: null,
        snoozedUntil: "2026-11-02T12:00:00.000Z", note: null}, "Snoozed.")).toBe(false);
    });
    expect(onError).toHaveBeenLastCalledWith("This item is already done.");
    expect(onSelect).not.toHaveBeenCalled();
  });
});
