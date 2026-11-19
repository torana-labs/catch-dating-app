import {act, cleanup, renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {createQueryHarness} from "../../../../shared/test/queryHarness";
import {useListingProgramController} from "./useListingProgramController";

const repository = vi.hoisted(() => ({
  readListingProgram: vi.fn(),
  setListingProgramPause: vi.fn(),
  countOrganizersWithoutFormat: vi.fn(),
}));
vi.mock("../api/listingProgramRepository", () => repository);

const running = {revision: 2, paused: false, reason: "Owner reviewed the pilot week; running.", updatedAtMillis: 1,
  updatedByUid: "owner-1", defaultCohortId: "pilot-indore-1", formatReport: null};
const report = {generatedAtMillis: 1, live: 4, withFormat: 3, withoutFormat: 1, truncated: false,
  cities: [{citySlug: "indore", live: 4, withFormat: 3, withoutFormat: 1}]};

describe("useListingProgramController", () => {
  afterEach(cleanup);
  beforeEach(() => {
    Object.values(repository).forEach((mock) => mock.mockReset());
    repository.readListingProgram.mockResolvedValue(running);
  });

  it("pauses against the revision it read and shows the stored switch", async () => {
    const {wrapper} = createQueryHarness();
    const onNotice = vi.fn();
    repository.setListingProgramPause.mockResolvedValue({...running, revision: 3, paused: true, reason: "Legal notice received."});
    const {result} = renderHook(() => useListingProgramController({onError: vi.fn(), onNotice}), {wrapper});
    await waitFor(() => expect(result.current.program?.revision).toBe(2));
    await act(async () => {
      expect(await result.current.setPaused(true, "Legal notice received.")).toBe(true);
    });
    expect(repository.setListingProgramPause.mock.calls[0]?.[0]).toEqual({paused: true, reason: "Legal notice received.", expectedRevision: 2});
    await waitFor(() => expect(result.current.program?.paused).toBe(true));
    expect(onNotice).toHaveBeenCalledWith(expect.stringContaining("paused"));
  });

  it("reports a refused flip and counts organizers without a format", async () => {
    const {wrapper} = createQueryHarness();
    const onError = vi.fn();
    repository.setListingProgramPause.mockRejectedValue(new Error("Only the owner can resume programmatic listings."));
    repository.countOrganizersWithoutFormat.mockResolvedValue(report);
    const {result} = renderHook(() => useListingProgramController({onError, onNotice: vi.fn()}), {wrapper});
    await waitFor(() => expect(result.current.program).not.toBeNull());
    await act(async () => {
      expect(await result.current.setPaused(false, "Resuming after review.")).toBe(false);
    });
    expect(onError).toHaveBeenLastCalledWith("Only the owner can resume programmatic listings.");
    await act(async () => {
      await result.current.countWithoutFormat();
    });
    await waitFor(() => expect(result.current.report).toEqual(report));
  });
});
