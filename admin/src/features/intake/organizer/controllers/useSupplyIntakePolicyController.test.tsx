import {act, cleanup, renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {createQueryHarness} from "../../../../shared/test/queryHarness";
import {useSupplyIntakePolicyController} from "./useSupplyIntakePolicyController";

const repository = vi.hoisted(() => ({
  listSupplyIntakePolicies: vi.fn(),
  decideSupplyIntakePolicy: vi.fn(),
}));
vi.mock("../api/supplyIntakePolicyRepository", () => repository);

const policy = {gapId: "on_demand_page_fetch_policy", label: "Read the pages a nomination names", enables: "",
  configPath: "", decisionId: "policy-on-demand-page-fetch-policy", decision: null, enabled: false,
  configCitesDecision: false, limits: []};
const decision = {gapId: "on_demand_page_fetch_policy", decision: "accept" as const,
  note: "Fetch nominated pages within the caps.", checklist: {requiredInputsReviewed: true,
    costAndSafetyReviewed: true, implementationOwnerReviewed: true, behaviorStillDisabledAcknowledged: true}};

describe("useSupplyIntakePolicyController", () => {
  afterEach(cleanup);
  beforeEach(() => {
    Object.values(repository).forEach((mock) => mock.mockReset());
    repository.listSupplyIntakePolicies.mockResolvedValue({policies: [policy]});
  });

  it("loads the policies and records a decision, then reloads them", async () => {
    const {wrapper} = createQueryHarness();
    const onNotice = vi.fn();
    repository.decideSupplyIntakePolicy.mockResolvedValue({});
    const {result} = renderHook(() => useSupplyIntakePolicyController({onError: vi.fn(), onNotice}), {wrapper});
    await waitFor(() => expect(result.current.policies.map((entry) => entry.gapId))
      .toEqual(["on_demand_page_fetch_policy"]));
    let done = false;
    await act(async () => { done = await result.current.decide(decision); });
    expect(done).toBe(true);
    expect(repository.decideSupplyIntakePolicy.mock.calls[0][0]).toEqual(decision);
    expect(onNotice).toHaveBeenCalledWith(
      "Decision recorded. It turns on once the policy file cites it in a reviewed change.");
    await waitFor(() => expect(repository.listSupplyIntakePolicies.mock.calls.length).toBeGreaterThan(1));
  });

  it("reports a refused decision", async () => {
    const {wrapper} = createQueryHarness();
    const onError = vi.fn();
    repository.decideSupplyIntakePolicy.mockRejectedValue(new Error("permission-denied"));
    const {result} = renderHook(() => useSupplyIntakePolicyController({onError, onNotice: vi.fn()}), {wrapper});
    let done = true;
    await act(async () => { done = await result.current.decide({...decision, decision: "hold"}); });
    expect(done).toBe(false);
    expect(onError).toHaveBeenCalledWith("permission-denied");
  });
});
