import {describe, expect, it} from "vitest";
import {
  AdminCallableValidationError,
  loadAdminCallableValidators,
} from
  "../../generated/validators/adminCallableValidators";
import {sampleIntakeOperations} from "./sampleIntakeOperations";
import {
  isSupplyIntakePrimaryStage,
  operationItemsForStage,
  operationNeedsHumanReview,
  operationStageCounts,
  operationWorkItemTitle,
} from "./operationSelectors";

const {validateAdminCallableResponse} =
  await loadAdminCallableValidators("adminListIntakeOperations");

describe("operationSelectors", () => {
  it("keeps the four persisted primary stages exclusive", () => {
    const items = sampleIntakeOperations().workItems;
    expect(operationStageCounts(items)).toEqual({
      incoming: 1,
      verify: 1,
      resolve: 1,
      ready: 1,
    });
    const projectedIds = ["incoming", "verify", "resolve", "ready"]
      .flatMap((stage) => operationItemsForStage(
        items,
        stage as "incoming" | "verify" | "resolve" | "ready"
      ))
      .map((item) => item.workItemId);
    expect(new Set(projectedIds).size).toBe(items.length);
  });

  it("selects explicit human-review exceptions", () => {
    const items = sampleIntakeOperations().workItems;
    expect(items.filter(operationNeedsHumanReview).map((item) =>
      operationWorkItemTitle(item)
    )).toEqual(["Rooftop Singles Mixer"]);
  });

  it("reads canonical worker projections without flattening their payload", () => {
    const item = sampleIntakeOperations().workItems[0];
    const projected = {
      ...item,
      taskFlags: [],
      blockerCodes: [],
      normalizedPayload: {
        owner: "human",
        sourceEntity: {title: "Nested source title"},
      },
    };
    expect(operationWorkItemTitle(projected)).toBe("Nested source title");
    expect(operationNeedsHumanReview(projected)).toBe(true);
  });

  it("rejects lifecycle outcomes as review stages", () => {
    expect(isSupplyIntakePrimaryStage("ready")).toBe(true);
    expect(isSupplyIntakePrimaryStage("published")).toBe(false);
    expect(isSupplyIntakePrimaryStage("expired")).toBe(false);
  });

  it("keeps terminal history out of active stage totals and queues", () => {
    const items = sampleIntakeOperations().workItems;
    const terminal = {
      ...items[1],
      workItemId: "historical-expired-event",
      lifecycleStatus: "terminal" as const,
      outcome: "expired" as const,
    };
    const inventory = [...items, terminal];
    expect(operationStageCounts(inventory)).toEqual({
      incoming: 1,
      verify: 1,
      resolve: 1,
      ready: 1,
    });
    expect(operationItemsForStage(inventory, "verify").map((item) =>
      item.workItemId)).not.toContain(terminal.workItemId);
  });

  it("keeps the sample projection on the strict callable response contract", () => {
    expect(() => validateAdminCallableResponse(
      "adminListIntakeOperations",
      sampleIntakeOperations()
    )).not.toThrow();
  });

  it("rejects workflow-owned stages outside the Supply Intake boundary", () => {
    const response = sampleIntakeOperations();
    const invalidResponse = {
      ...response,
      workItems: response.workItems.map((item, index) =>
        index === 0 ? {...item, primaryStage: "approve"} : item),
    };

    expect(() => validateAdminCallableResponse(
      "adminListIntakeOperations",
      invalidResponse
    )).toThrow(AdminCallableValidationError);
  });
});
