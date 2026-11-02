import {describe, expect, it} from "vitest";
import {adminQueryKeys} from "./queryKeys";

describe("adminQueryKeys", () => {
  it("keeps finance and mutation domains under the shared admin root", () => {
    expect(adminQueryKeys.finance.paymentRouting()).toEqual([
      "admin",
      "finance",
      "payment-routing",
    ]);
    expect(adminQueryKeys.organizerIntake.policyDecision()).toEqual([
      "admin",
      "organizer-intake",
      "policy-decision",
    ]);
  });

  it("includes every input that changes an analytics result", () => {
    expect(adminQueryKeys.overview.analytics("30d:week", "live", "owner")).toEqual([
      "admin",
      "overview",
      "analytics",
      "live",
      "owner",
      "30d:week",
    ]);
  });

  it("keeps the agent activity feed under the shared admin root", () => {
    expect(adminQueryKeys.operations.executions()).toEqual([
      "admin",
      "operations",
      "executions",
    ]);
  });
});
