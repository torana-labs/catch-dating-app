import {act, cleanup, renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {createQueryHarness} from "../../../shared/test/queryHarness";
import {useSalesDealsController} from "./useSalesDealsController";

const repository = vi.hoisted(() => ({listSalesOpportunities: vi.fn(), listSalesAccounts: vi.fn()}));
vi.mock("../api/salesRepository", () => repository);

const deal = (id: string, stage: string, ownerUid = "riya") => ({opportunityId: id, organizerId: `org-${id}`, motion: "first_workflow_pilot",
  stage, ownerUid, nextStep: null, nextStepAt: null, revision: 1});

describe("useSalesDealsController", () => {
  afterEach(cleanup);
  beforeEach(() => {
    Object.values(repository).forEach((mock) => mock.mockReset());
    repository.listSalesOpportunities.mockImplementation(async ({cursor}: {cursor?: string}) => cursor ?
      {rows: [deal("c", "pilot_running", "karan"), deal("d", "closed_lost")], nextCursor: null} :
      {rows: [deal("a", "new_enquiry"), deal("b", "demo_arranged")], nextCursor: "page-2"});
    repository.listSalesAccounts.mockResolvedValue({rows: [{organizerId: "org-a", name: "Harbor Social Club", researchStatus: "new"}], nextCursor: null});
  });

  it("puts every deal in its stage column, named by its host, team or mine", async () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useSalesDealsController({uid: "riya"}), {wrapper});
    await waitFor(() => expect(result.current.counts.team).toBe(3));
    const cards = Object.fromEntries(result.current.columns.map((column) => [column.value, column.cards.map((card) => card.name)]));
    expect(cards).toEqual({new: ["Harbor Social Club"], talking: [], demo: ["org-b"], pilot: ["org-c"], paying: []});
    expect(result.current.counts.mine).toBe(2);
    act(() => result.current.setScope("mine"));
    expect(result.current.columns.find((column) => column.value === "pilot")?.cards).toEqual([]);
    act(() => result.current.setSearch("harbor"));
    expect(result.current.columns.flatMap((column) => column.cards).map((card) => card.name)).toEqual(["Harbor Social Club"]);
  });
});
