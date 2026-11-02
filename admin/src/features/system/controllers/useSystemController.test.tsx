import {act, renderHook, waitFor} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {createQueryHarness} from "../../../shared/test/queryHarness";
import type {AdminActionExecutionRecord} from "../../../shared/types/adminTypes";
import {activityRecords, activityRow, filterActivity, receiptFacts, useSystemController} from "./useSystemController";

function record(overrides: Partial<AdminActionExecutionRecord>): AdminActionExecutionRecord {
  return {
    schemaVersion: 1, executionId: "e1", actionId: "overview.get", callable: "adminGetOverview",
    actorUid: "owner-1", actorRoles: ["adminOwner"], status: "succeeded", requestHash: "h",
    responseHash: null, target: null, errorCode: null, errorMessage: null, cliVersion: null,
    startedAt: "2026-11-01T08:00:00.000Z", finishedAt: null, updatedAt: "2026-11-01T08:00:00.000Z",
    ...overrides,
  };
}

describe("useSystemController", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("words people's and agents' actions with their result", () => {
    const person = activityRow(record({}));
    expect(person).toMatchObject({who: {title: "Owner", subtitle: "owner-1"}, automatic: false, result: {text: "Done"}});
    expect(person.what).toContain("overview");
    const agent = activityRow(record({executionId: "e2", cliVersion: "1.2.0", status: "failed", errorCode: "permission-denied"}));
    expect(agent).toMatchObject({who: {title: "Agent"}, automatic: true, problem: true, result: {text: "Failed", tone: "danger"}});
  });

  it("treats an action whose result was lost as a problem, never as done", () => {
    const unclear = activityRow(record({status: "indeterminate", errorCode: "ADMIN_CALLABLE_TIMEOUT"}));
    expect(unclear).toMatchObject({problem: true, result: {text: "Unclear", tone: "warning"}});
    expect(filterActivity([unclear], "problems", "")).toHaveLength(1);
    expect(activityRow(record({status: "started"}))).toMatchObject({problem: false, result: {text: "Running"}});
  });

  it("filters by who acted and by problems, and searches", () => {
    const rows = [activityRow(record({})), activityRow(record({executionId: "e2", cliVersion: "1.2.0", status: "failed", errorCode: "permission-denied"}))];
    expect(filterActivity(rows, "people", "")).toHaveLength(1);
    expect(filterActivity(rows, "automatic", "")).toHaveLength(1);
    expect(filterActivity(rows, "problems", "")[0]?.key).toBe("e2");
    expect(filterActivity(rows, "everyone", "agent")).toHaveLength(1);
    expect(filterActivity(rows, "everyone", "permission-denied")[0]?.key).toBe("e2");
  });

  it("searches everything on the receipt", () => {
    const row = activityRow(record({
      executionId: "exec-77", target: "mumbai-mixer-1", errorMessage: "Lost the result", status: "failed",
    }));
    for (const needle of ["exec-77", "MUMBAI-MIXER", "lost the", "overview.get", "adminGetOverview", "owner-1"]) {
      expect(filterActivity([row], "everyone", needle)).toHaveLength(1);
    }
    expect(filterActivity([row], "everyone", "not on it")).toHaveLength(0);
  });

  it("shows every fact on a receipt and leaves out what it doesn't hold", () => {
    const labels = (facts: ReturnType<typeof receiptFacts>) => facts.map((fact) => fact.label);
    const done = receiptFacts(record({finishedAt: "2026-11-01T08:00:01.500Z"}));
    expect(done.find((fact) => fact.label === "Took")?.value).toBe("1.5 s");
    expect(labels(done)).not.toContain("Error");
    expect(labels(done)).not.toContain("Response hash");
    const failed = receiptFacts(record({
      status: "failed", errorCode: "failed-precondition", errorMessage: "State changed", responseHash: "r",
      target: "sample-applicant", cliVersion: "1.0.0",
    }));
    expect(failed.find((fact) => fact.label === "Error")?.value).toBe("State changed");
    expect(failed.find((fact) => fact.label === "Acted on")?.value).toBe("sample-applicant");
    expect(failed.find((fact) => fact.label === "Took")?.value).toBe("Still running");
    expect(labels(failed)).toContain("Response hash");
  });

  it("joins loaded pages, keeping the latest copy of a receipt that appears twice", () => {
    const page = (rows: AdminActionExecutionRecord[], nextCursor: string | null) => ({
      schemaVersion: 1 as const, generatedAt: "2026-11-01T08:00:00.000Z", rows, nextCursor,
    });
    const merged = activityRecords([
      page([record({executionId: "e1", status: "started"}), record({executionId: "e2"})], "c1"),
      page([record({executionId: "e1", status: "succeeded"}), record({executionId: "e3"})], null),
    ]);
    expect(merged.map((row) => row.executionId)).toEqual(["e1", "e2", "e3"]);
    expect(merged[0]?.status).toBe("succeeded");
  });

  it("loads sample activity and health, and narrows to problems", async () => {
    vi.stubEnv("VITE_ADMIN_DATA_MODE", "sample");
    const {result} = renderHook(
      () => useSystemController({canReadHostAnalytics: true, isSessionReady: true, mode: "sample"}),
      {wrapper: createQueryHarness().wrapper}
    );
    await waitFor(() => {
      expect(result.current.rows.length).toBeGreaterThan(0);
      expect(result.current.signals.length).toBeGreaterThan(0);
    });
    act(() => result.current.setFilter("problems"));
    expect(result.current.rows.every((row) => row.problem)).toBe(true);
  });
});
