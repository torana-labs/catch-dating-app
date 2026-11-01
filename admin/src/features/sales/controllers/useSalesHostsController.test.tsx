import {act, cleanup, renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {createQueryHarness} from "../../../shared/test/queryHarness";
import {useSalesHostsController} from "./useSalesHostsController";

const repository = vi.hoisted(() => ({listSalesAccounts: vi.fn(), getSalesAccount: vi.fn()}));
vi.mock("../api/salesRepository", () => repository);

describe("useSalesHostsController", () => {
  afterEach(cleanup);
  beforeEach(() => {
    Object.values(repository).forEach((mock) => mock.mockReset());
    repository.listSalesAccounts.mockImplementation(async ({cursor}: {cursor?: string}) => ({
      rows: [{organizerId: cursor ? "older" : "harbor", name: cursor ? "Older" : "Harbor", researchStatus: "qualified"}],
      nextCursor: cursor ? null : "page-2"}));
    repository.getSalesAccount.mockResolvedValue({account: {organizerId: "harbor", revision: 1, researchStatus: "qualified"},
      organizerSummary: {name: "Harbor"}, activities: [], opportunities: [], tasks: []});
  });

  it("lists a person's hosts, searches and pages, and opens one host", async () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useSalesHostsController({ownerUid: "riya", selectedOrganizerId: "harbor"}), {wrapper});
    await waitFor(() => expect(result.current.rows.map((row) => row.organizerId)).toEqual(["harbor"]));
    expect(repository.listSalesAccounts).toHaveBeenCalledWith({limit: 25, ownerUid: "riya"});
    await waitFor(() => expect(result.current.host?.organizerSummary.name).toBe("Harbor"));
    act(() => result.current.nextPage());
    await waitFor(() => expect(result.current.rows.map((row) => row.organizerId)).toEqual(["older"]));
    act(() => result.current.setQuery(" bandra "));
    await waitFor(() => expect(repository.listSalesAccounts).toHaveBeenLastCalledWith({limit: 25, ownerUid: "riya", query: "bandra"}));
    expect(result.current.hasPreviousPage).toBe(false);
    act(() => result.current.setTab("deals"));
    expect(result.current.tab).toBe("deals");
  });
});
