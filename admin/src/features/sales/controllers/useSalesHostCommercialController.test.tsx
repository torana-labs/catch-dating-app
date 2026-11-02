import {act, cleanup, renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {createQueryHarness} from "../../../shared/test/queryHarness";
import type {SalesOpportunity} from "../api/salesTypes";
import {useSalesHostCommercialController} from "./useSalesHostCommercialController";

const repository = vi.hoisted(() => ({
  getCommercialDetail: vi.fn(), listCommercialReport: vi.fn(), upsertCommercialPilot: vi.fn(), reviseCommercialQuote: vi.fn(),
  approveCommercialQuote: vi.fn(), acceptCommercialQuote: vi.fn(), attestHostSettlement: vi.fn(), closeWonWithFinance: vi.fn(),
}));
vi.mock("../api/salesCommercialRepository", () => repository);

const deals = [{opportunityId: "o1", stage: "pilot_agreed"}] as SalesOpportunity[];
const detail = (opportunityId: string) => ({opportunity: {opportunityId, stage: "pilot_agreed", revision: 1}, pilotPlan: null, quote: null, history: []});
const hook = (overrides: Partial<Parameters<typeof useSalesHostCommercialController>[0]> = {}) => {
  const {wrapper} = createQueryHarness();
  const onError = vi.fn();
  const onNotice = vi.fn();
  return {onError, onNotice, ...renderHook(() => useSalesHostCommercialController({organizerId: "harbor", opportunities: deals, enabled: true,
    onError, onNotice, ...overrides}), {wrapper})};
};
const close = {expectedRevision: 1, financeAttestationId: "a1", fields: {motion: "first_workflow_pilot", stage: "closed_won" as const, ownerUid: "dev", nextStep: null, nextStepAt: null}};

describe("useSalesHostCommercialController", () => {
  afterEach(cleanup);
  beforeEach(() => {
    Object.values(repository).forEach((mock) => mock.mockReset());
    repository.getCommercialDetail.mockImplementation(async (_organizerId: string, opportunityId: string) => detail(opportunityId));
    repository.listCommercialReport.mockImplementation(async (_organizerId: string, cursor?: string) => cursor ?
      {rows: [{opportunityId: "o3", stage: "contacted"}], nextCursor: null} : {rows: [{opportunityId: "o1", stage: "pilot_agreed"}, {opportunityId: "o2", stage: "contacted"}], nextCursor: "next"});
  });

  it("opens the first deal, pages every deal, and opens one the host page didn't list", async () => {
    const {result} = hook();
    await waitFor(() => expect(result.current.record?.opportunity.opportunityId).toBe("o1"));
    await waitFor(() => expect(result.current.hasMoreReport).toBe(true));
    act(() => result.current.moreReport());
    await waitFor(() => expect(result.current.reportRows.map((row) => row.opportunityId)).toEqual(["o1", "o2", "o3"]));
    act(() => result.current.selectDeal("o3"));
    await waitFor(() => expect(result.current.record?.opportunity.opportunityId).toBe("o3"));
  });

  it("reads nothing for a sales associate", async () => {
    const {result} = hook({enabled: false});
    await waitFor(() => expect(result.current.dealId).toBe("o1"));
    expect(repository.getCommercialDetail).not.toHaveBeenCalled();
    expect(repository.listCommercialReport).not.toHaveBeenCalled();
  });

  it("a retry of the same close keeps its request id, and names the host and deal", async () => {
    repository.closeWonWithFinance.mockRejectedValueOnce(new Error("offline")).mockResolvedValue({});
    const {result, onError, onNotice} = hook();
    await waitFor(() => expect(result.current.dealId).toBe("o1"));
    await act(async () => { expect(await result.current.closeWon(close)).toBe(false); });
    expect(onError).toHaveBeenLastCalledWith("offline");
    await act(async () => { expect(await result.current.closeWon(close)).toBe(true); });
    const [first, second] = repository.closeWonWithFinance.mock.calls.map(([input]) => input);
    expect(first).toMatchObject({...close, organizerId: "harbor", opportunityId: "o1"});
    expect(second.requestId).toBe(first.requestId);
    expect(onNotice).toHaveBeenCalledWith(expect.stringContaining("provider unconfirmed"));
  });

  it("a stale write says so and reloads the record", async () => {
    repository.upsertCommercialPilot.mockRejectedValue(new Error("Record changed since review."));
    const {result, onError} = hook();
    await waitFor(() => expect(result.current.record).not.toBeNull());
    const reads = repository.getCommercialDetail.mock.calls.length;
    await act(async () => { expect(await result.current.savePilot({expectedRevision: 0, plan: {status: "draft", workflowId: "w", objective: "o",
      successMeasures: ["m"], startsAt: null, endsAt: null, reviewEvidence: null, outcomeEvidence: null}})).toBe(false); });
    expect(onError).toHaveBeenLastCalledWith(expect.stringContaining("Someone updated this record"));
    await waitFor(() => expect(repository.getCommercialDetail.mock.calls.length).toBeGreaterThan(reads));
  });
});
