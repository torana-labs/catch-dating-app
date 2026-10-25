import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import type {SupplyIntakePolicyController} from "../controllers/useSupplyIntakePolicyController";
import {renderSupplyIntakePolicies} from "./supplyIntakePolicyPanels";

afterEach(cleanup);

const policy = (overrides: Record<string, unknown> = {}) => ({
  gapId: "on_demand_page_fetch_policy", label: "Read the pages a nomination names",
  enables: "Catch fetches the public pages a nomination gives.",
  configPath: "operations/src/workflows/supply-intake/config/acquisition_policy.json (pageFetch)",
  decisionId: "policy-on-demand-page-fetch-policy", decision: null, enabled: false, configCitesDecision: false,
  limits: [{label: "Pages per month", value: 0}], ...overrides,
});

function controller(overrides: Partial<SupplyIntakePolicyController> = {}) {
  return {page: {isPending: false, error: null}, policies: [policy()],
    decide: vi.fn(async () => true), isDeciding: false, ...overrides} as unknown as SupplyIntakePolicyController;
}

describe("Supply Intake policies", () => {
  it("shows what each capability does and where it stands", () => {
    render(<>{renderSupplyIntakePolicies(controller({policies: [policy(), policy({gapId: "agent_research_policy",
      label: "Research gaps with the agent", limits: [], decision: {decision: "accept", decisionStatus: "accepted",
        note: "Yes.", reviewedAt: null}}), policy({gapId: "x", label: "Live one", limits: [], enabled: true,
      configCitesDecision: true})] as never}))}</>);
    expect(screen.getByText("Off, waiting for a decision")).toBeTruthy();
    expect(screen.getByText("Accepted, not switched on yet")).toBeTruthy();
    expect(screen.getByText("On")).toBeTruthy();
    expect(screen.getByText(/Pages per month 0/)).toBeTruthy();
  });

  it("accepts only with the full checklist and a note", async () => {
    const current = controller();
    render(<>{renderSupplyIntakePolicies(current)}</>);
    fireEvent.click(screen.getByRole("button", {name: "Decide"}));
    const accept = screen.getByRole("button", {name: "Accept"});
    fireEvent.change(screen.getByLabelText("Decision note"), {target: {value: "Fetch nominated pages within caps."}});
    expect(accept).toHaveProperty("disabled", true);
    for (const checkbox of screen.getAllByRole("checkbox")) fireEvent.click(checkbox);
    fireEvent.click(accept);
    await waitFor(() => expect(current.decide).toHaveBeenCalledWith(expect.objectContaining({
      gapId: "on_demand_page_fetch_policy", decision: "accept", note: "Fetch nominated pages within caps."})));
  });

  it("holds or rejects with a note alone, without the acceptance checklist", async () => {
    const current = controller();
    render(<>{renderSupplyIntakePolicies(current)}</>);
    fireEvent.click(screen.getByRole("button", {name: "Decide"}));
    fireEvent.change(screen.getByLabelText("Decision note"), {target: {value: "Not until the caps are agreed."}});
    fireEvent.click(screen.getByRole("button", {name: "Hold"}));
    await waitFor(() => expect(current.decide).toHaveBeenCalledWith(expect.objectContaining({decision: "hold"})));
  });
});
