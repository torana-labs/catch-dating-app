import {act, cleanup, renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import type {CommercialTerms} from "../../../generated/contracts/commercialTerms";
import {
  ownerDecisionCommercialTerms,
  ownerDecisionCommercialTermsReason,
} from "../../../shared/domain/commercialTermsDecision";
import {createQueryHarness} from "../../../shared/test/queryHarness";
import type {CommercialTermsListing} from "../api/commercialTermsRepository";
import {useCommercialTermsController} from "./useCommercialTermsController";

const repository = vi.hoisted(() => ({
  loadCommercialTerms: vi.fn(),
  replaceCommercialTerms: vi.fn(),
}));
vi.mock("../api/commercialTermsRepository", () => repository);

const owner = ownerDecisionCommercialTerms as CommercialTerms;
const empty: CommercialTermsListing = {termsId: "platform", organizerId: null,
  organizerName: null, platform: null, organizer: null, effectiveTerms: null,
  history: [], historyComplete: true, overrides: [], overridesComplete: true,
  organizerMatches: []};
const saved = (revision: number): CommercialTermsListing => ({...empty,
  platform: {revision, terms: owner, reason: "Owner decision",
    updatedByUid: "owner", updatedAtMillis: 1}, effectiveTerms: owner});
const response = (revision: number) => ({termsId: "platform", organizerId: null,
  revision, terms: owner, reason: "Owner decision", updatedAtMillis: 2,
  effectiveTerms: owner, platformRevision: revision});
const codeError = (code: string, message = code) =>
  Object.assign(new Error(message), {code: `functions/${code}`});

function render(organizerId: string | null = null, canManage = true) {
  const {wrapper} = createQueryHarness();
  const onError = vi.fn();
  const onNotice = vi.fn();
  const hook = renderHook(() => useCommercialTermsController({canManage,
    onError, onNotice, organizerId}), {wrapper});
  return {...hook, onError, onNotice};
}

describe("useCommercialTermsController", () => {
  afterEach(cleanup);
  beforeEach(() => {
    Object.values(repository).forEach((mock) => mock.mockReset());
    repository.loadCommercialTerms.mockResolvedValue(empty);
  });

  it("saves the owner's decision as the first platform revision", async () => {
    repository.replaceCommercialTerms.mockResolvedValue(response(1));
    const {result, onNotice} = render();
    await waitFor(() => expect(result.current.loadState).toBe("ready"));
    act(() => result.current.startFromOwnerDecision());
    expect(result.current.editor?.reason).toBe(ownerDecisionCommercialTermsReason);
    act(() => { result.current.review(); });
    expect(result.current.editor?.preview?.every((row) => row.changed)).toBe(true);
    let done = false;
    await act(async () => { done = await result.current.save(); });
    expect(done).toBe(true);
    expect(repository.replaceCommercialTerms.mock.calls[0][0]).toEqual({
      action: "replace", organizerId: null, expectedRevision: 0,
      terms: owner, reason: ownerDecisionCommercialTermsReason});
    expect(onNotice.mock.calls[0][0]).toContain("revision 1");
    expect(result.current.editor).toBeNull();
    await waitFor(() => expect(repository.loadCommercialTerms).toHaveBeenCalledTimes(2));
  });

  it("will not review without a reason or a change", async () => {
    repository.loadCommercialTerms.mockResolvedValue(saved(3));
    const {result} = render();
    await waitFor(() => expect(result.current.loadState).toBe("ready"));
    act(() => result.current.startEdit());
    act(() => { result.current.review(); });
    expect(result.current.editor?.errors).toEqual([
      "Give a reason of at least three characters for the audit trail."]);
    act(() => result.current.setReason("No-op"));
    act(() => { result.current.review(); });
    expect(result.current.editor?.errors).toEqual([
      "Nothing has changed from the current revision."]);
    act(() => result.current.setField("rate", "4"));
    act(() => { result.current.review(); });
    expect(result.current.editor?.preview?.filter((row) => row.changed))
      .toHaveLength(1);
    expect(result.current.editor?.baseRevision).toBe(3);
  });

  it("keeps the draft and asks for a fresh review after a conflict", async () => {
    repository.loadCommercialTerms.mockResolvedValueOnce(saved(1))
      .mockResolvedValue(saved(2));
    repository.replaceCommercialTerms.mockRejectedValue(codeError("aborted"));
    const {result, onError} = render();
    await waitFor(() => expect(result.current.loadState).toBe("ready"));
    act(() => result.current.startEdit());
    act(() => result.current.setField("trialDays", "45"));
    act(() => result.current.setReason("Longer trial"));
    act(() => { result.current.review(); });
    await act(async () => { await result.current.save(); });
    expect(onError.mock.calls.at(-1)?.[0]).toContain("Someone saved these terms");
    expect(result.current.editor).toMatchObject({baseRevision: 2, preview: null,
      unconfirmed: null});
    expect(result.current.editor?.draft.trialDays).toBe("45");
  });

  it("retries exactly the same save when the outcome is unknown", async () => {
    repository.loadCommercialTerms.mockResolvedValue(saved(1));
    repository.replaceCommercialTerms.mockRejectedValueOnce(codeError("unavailable"))
      .mockResolvedValue(response(2));
    const {result} = render();
    await waitFor(() => expect(result.current.loadState).toBe("ready"));
    act(() => result.current.startEdit());
    act(() => result.current.setField("cap", ""));
    act(() => result.current.setReason("Remove the cap"));
    act(() => { result.current.review(); });
    await act(async () => { await result.current.save(); });
    const first = repository.replaceCommercialTerms.mock.calls[0][0];
    expect(result.current.editor?.unconfirmed).toEqual(first);
    act(() => result.current.setField("cap", "5"));
    await act(async () => { await result.current.save(); });
    expect(repository.replaceCommercialTerms.mock.calls[1][0]).toEqual(first);
    expect(first.terms.commission.capMinor).toBeNull();
  });

  it("writes a sparse organizer override from ticked terms", async () => {
    repository.loadCommercialTerms.mockResolvedValue({...saved(1),
      termsId: `org_${"a".repeat(64)}`, organizerId: "club-1",
      organizerName: "Club"});
    repository.replaceCommercialTerms.mockResolvedValue({...response(1),
      organizerId: "club-1"});
    const {result} = render("club-1");
    await waitFor(() => expect(result.current.loadState).toBe("ready"));
    act(() => result.current.startEdit());
    expect(result.current.editor?.draft).toEqual({});
    act(() => result.current.setInherited("rate", false));
    expect(result.current.editor?.draft.rate).toBe("5");
    act(() => result.current.setField("rate", "3"));
    act(() => result.current.setReason("Founding host"));
    act(() => { result.current.review(); });
    await act(async () => { await result.current.save(); });
    expect(repository.replaceCommercialTerms.mock.calls[0][0]).toEqual({
      action: "replace", organizerId: "club-1", expectedRevision: 0,
      terms: {commission: {rateBasisPoints: 300}}, reason: "Founding host"});
  });

  it("does not load for roles outside Finance and Admin Owner", async () => {
    const {result} = render(null, false);
    expect(result.current.loadState).toBe("error");
    expect(result.current.loadError).toContain("Finance and Admin Owner");
    expect(repository.loadCommercialTerms).not.toHaveBeenCalled();
  });

  it("searches organizers only for two or more characters", async () => {
    repository.loadCommercialTerms.mockImplementation(async (payload) =>
      payload.organizerQuery ? {...empty, organizerMatches: [{organizerId: "o",
        organizerName: "Supper", cityName: null}]} : empty);
    const {result, onError} = render();
    await waitFor(() => expect(result.current.loadState).toBe("ready"));
    act(() => result.current.setSearchText("s"));
    act(() => result.current.search());
    expect(onError).toHaveBeenLastCalledWith(
      "Type at least two characters of the organizer's name.");
    act(() => result.current.setSearchText("supper"));
    act(() => result.current.search());
    await waitFor(() => expect(result.current.searchMatches).toHaveLength(1));
    expect(repository.loadCommercialTerms).toHaveBeenLastCalledWith({
      organizerId: null, organizerQuery: "supper"});
  });
});
