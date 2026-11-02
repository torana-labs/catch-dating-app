import {act, cleanup, renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {createQueryHarness} from "../../../shared/test/queryHarness";
import {useSalesAddHostController} from "./useSalesAddHostController";

const repository = vi.hoisted(() => ({createSalesAccount: vi.fn(), nominateSalesOrganizer: vi.fn(), searchCanonicalOrganizers: vi.fn()}));
vi.mock("../api/salesRepository", () => repository);

const details = {name: "Bhag", market: "Mumbai", urls: [], notes: null, categories: []};

describe("useSalesAddHostController", () => {
  afterEach(cleanup);
  beforeEach(() => { Object.values(repository).forEach((mock) => mock.mockReset()); repository.searchCanonicalOrganizers.mockResolvedValue([]); });

  it("searches for the team, and not for a sales associate", async () => {
    const team = renderHook(() => useSalesAddHostController({canAddExisting: true, onError: vi.fn(), onNotice: vi.fn()}), {wrapper: createQueryHarness().wrapper});
    act(() => team.result.current.setSearch("Harbor"));
    await waitFor(() => expect(repository.searchCanonicalOrganizers).toHaveBeenCalledWith("Harbor"));
    team.unmount();
    repository.searchCanonicalOrganizers.mockClear();
    const associate = renderHook(() => useSalesAddHostController({canAddExisting: false, onError: vi.fn(), onNotice: vi.fn()}), {wrapper: createQueryHarness().wrapper});
    act(() => associate.result.current.setSearch("Harbor"));
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 300)));
    expect(repository.searchCanonicalOrganizers).not.toHaveBeenCalled();
  });

  it("retries a failed nomination under the same request id and reports it", async () => {
    repository.nominateSalesOrganizer.mockRejectedValueOnce(new Error("offline")).mockResolvedValue({});
    const onError = vi.fn();
    const onNotice = vi.fn();
    const {result} = renderHook(() => useSalesAddHostController({canAddExisting: false, onError, onNotice}), {wrapper: createQueryHarness().wrapper});
    await act(async () => { expect(await result.current.nominate(details)).toBe(false); });
    expect(onError).toHaveBeenLastCalledWith("offline");
    await act(async () => { expect(await result.current.nominate(details)).toBe(true); });
    const [first, second] = repository.nominateSalesOrganizer.mock.calls.map(([input]) => input);
    expect(second.requestId).toBe(first.requestId);
    expect(onNotice).toHaveBeenCalledWith(expect.stringContaining("Inbox"));
  });

  it("adds an existing organizer to Sales", async () => {
    repository.createSalesAccount.mockResolvedValue({});
    const {result} = renderHook(() => useSalesAddHostController({canAddExisting: true, onError: vi.fn(), onNotice: vi.fn()}), {wrapper: createQueryHarness().wrapper});
    await act(async () => { expect(await result.current.addExisting("harbor")).toBe(true); });
    expect(repository.createSalesAccount.mock.calls[0]?.[0]).toMatchObject({organizerId: "harbor"});
  });
});
