import {act, cleanup, renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {createQueryHarness} from "../../../shared/test/queryHarness";
import {useMyNominationsController} from "./useMyNominationsController";

const repository = vi.hoisted(() => ({listMyNominations: vi.fn(), getNomination: vi.fn()}));
vi.mock("../api/myNominationsRepository", () => repository);

describe("useMyNominationsController", () => {
  afterEach(cleanup);
  beforeEach(() => {
    Object.values(repository).forEach((mock) => mock.mockReset());
    repository.listMyNominations.mockImplementation(async ({filter}: {filter: string}) => ({generatedAt: "2026-10-31T12:00:00.000Z",
      filter, nominations: [{itemId: `supply-${filter}`}], nextCursor: null, totals: {all: 3, published: 1, waiting: 1, stuck: 1}}));
    repository.getNomination.mockResolvedValue({item: {itemId: "supply-all"}, journey: [], canWork: false, canDecideClaim: false});
  });

  it("filters by what happened, keeps real totals, and opens one nomination", async () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useMyNominationsController({selectedItemId: "supply-all"}), {wrapper});
    await waitFor(() => expect(result.current.rows.map((row) => row.itemId)).toEqual(["supply-all"]));
    expect(result.current.totals).toEqual({all: 3, published: 1, waiting: 1, stuck: 1});
    await waitFor(() => expect(result.current.detail?.item.itemId).toBe("supply-all"));
    act(() => result.current.setFilter("stuck"));
    await waitFor(() => expect(repository.listMyNominations).toHaveBeenLastCalledWith({filter: "stuck", limit: 25, cursor: null}));
  });
});
