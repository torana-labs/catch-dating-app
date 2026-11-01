import {act, renderHook, waitFor} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {createQueryHarness} from "../../../shared/test/queryHarness";
import type {AdminActionExecutionRecord} from "../../../shared/types/adminTypes";
import {activityRow, filterActivity, useSystemController} from "./useSystemController";

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
    expect(agent).toMatchObject({who: {title: "Agent"}, automatic: true, problem: true, result: {text: "permission-denied", tone: "danger"}});
  });

  it("filters by who acted and by problems, and searches", () => {
    const rows = [activityRow(record({})), activityRow(record({executionId: "e2", cliVersion: "1.2.0", status: "failed"}))];
    expect(filterActivity(rows, "people", "")).toHaveLength(1);
    expect(filterActivity(rows, "automatic", "")).toHaveLength(1);
    expect(filterActivity(rows, "problems", "")[0]?.key).toBe("e2");
    expect(filterActivity(rows, "everyone", "agent")).toHaveLength(1);
  });

  it("loads sample activity and health, and narrows to problems", async () => {
    vi.stubEnv("VITE_ADMIN_DATA_MODE", "sample");
    const {result} = renderHook(() => useSystemController({isSessionReady: true, mode: "sample"}), {wrapper: createQueryHarness().wrapper});
    await waitFor(() => {
      expect(result.current.rows.length).toBeGreaterThan(0);
      expect(result.current.health.length).toBeGreaterThan(0);
    });
    act(() => result.current.setFilter("problems"));
    expect(result.current.rows.every((row) => row.problem)).toBe(true);
  });
});
