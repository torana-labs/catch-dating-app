import {act, renderHook, waitFor} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {
  adminRoleClaimKeys,
  type AdminRoleAssignmentRow,
  type AdminUserRoleRecord,
} from "../../../shared/types/adminTypes";
import {createQueryHarness} from "../../../shared/test/queryHarness";
import {adminRolePolicies} from "./adminRolePolicies";
import {useAdminRoleManagementController} from "./useAdminRoleManagementController";

const mocks = vi.hoisted(() => ({
  loadAdminRoleAssignments: vi.fn(),
  loadAdminUserRoles: vi.fn(),
  saveAdminUserRoles: vi.fn(),
}));

vi.mock("../api/adminRoleRepository", () => mocks);

function user(targetUid: string, roles: AdminUserRoleRecord["roles"]): AdminUserRoleRecord {
  return {
    targetUid,
    email: `${targetUid}@catch.local`,
    displayName: targetUid,
    disabled: false,
    roles,
    assignmentPath: `adminRoleAssignments/${targetUid}`,
  };
}

describe("useAdminRoleManagementController", () => {
  beforeEach(() => {
    const rows: AdminRoleAssignmentRow[] = Array.from({length: 50}, (_, index) => ({
      ...user(`register-${index}`, ["support"]),
      status: "active",
      updatedAt: `2026-07-13T${String(index % 24).padStart(2, "0")}:00:00.000Z`,
      updatedByUid: "owner",
    }));
    mocks.loadAdminRoleAssignments.mockReset().mockResolvedValue({
      generatedAt: "2026-07-13T12:00:00.000Z",
      rows,
      source: "adminRoleAssignments",
    });
    mocks.loadAdminUserRoles.mockReset().mockImplementation(({targetUid}: {targetUid: string}) =>
      Promise.resolve({user: user(targetUid, ["support"])}));
    mocks.saveAdminUserRoles.mockReset();
  });

  it("loads a direct uid outside the capped register and locally filters returned rows", async () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useAdminRoleManagementController({
      currentUserUid: "owner",
      onError: vi.fn(),
      onNotice: vi.fn(),
      selectedTargetUid: "direct-target",
    }), {wrapper});

    await waitFor(() => expect(result.current.selectedUser?.targetUid).toBe("direct-target"));
    expect(result.current.assignmentCapped).toBe(true);
    expect(result.current.assignmentRows.some((row) => row.targetUid === "direct-target")).toBe(false);
    act(() => result.current.setAssignmentQuery("register-12"));
    expect(result.current.assignmentVisibleRows.map((row) => row.targetUid)).toEqual(["register-12"]);
    expect(mocks.loadAdminUserRoles).toHaveBeenCalledTimes(1);
  });

  it("masks the prior user while a new route uid loads", async () => {
    let resolveSecond: ((value: {user: AdminUserRoleRecord}) => void) | null = null;
    mocks.loadAdminUserRoles.mockImplementation(({targetUid}: {targetUid: string}) => {
      if (targetUid === "second") {
        return new Promise((resolve) => {
          resolveSecond = resolve;
        });
      }
      return Promise.resolve({user: user(targetUid, ["support"])});
    });
    const {wrapper} = createQueryHarness();
    const {result, rerender} = renderHook(
      ({targetUid}) => useAdminRoleManagementController({
        currentUserUid: "owner",
        onError: vi.fn(),
        onNotice: vi.fn(),
        selectedTargetUid: targetUid,
      }),
      {initialProps: {targetUid: "first"}, wrapper}
    );
    await waitFor(() => expect(result.current.selectedUser?.targetUid).toBe("first"));
    rerender({targetUid: "second"});
    expect(result.current.selectedUser).toBeNull();
    act(() => resolveSecond?.({user: user("second", ["salesStaff"])}));
    await waitFor(() => expect(result.current.selectedUser?.targetUid).toBe("second"));
  });

  it("requires confirmation for high-risk changes and records the callable receipt", async () => {
    const response = {
      user: user("target", ["support", "adminOwner"]),
      beforeRoles: ["support"] as const,
      afterRoles: ["support", "adminOwner"] as const,
    };
    mocks.saveAdminUserRoles.mockResolvedValue(response);
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useAdminRoleManagementController({
      currentUserUid: "owner",
      onError: vi.fn(),
      onNotice: vi.fn(),
      selectedTargetUid: "target",
    }), {wrapper});
    await waitFor(() => expect(result.current.selectedUser?.targetUid).toBe("target"));

    act(() => {
      result.current.toggleRole("adminOwner", true);
      result.current.setNote("Approved by the operations owner.");
    });
    expect(result.current.roleDiff.added).toEqual(["adminOwner"]);
    expect(result.current.validationIssue).toBe("Confirm the high-risk role change before saving.");
    act(() => result.current.setHighRiskConfirmed(true));
    expect(result.current.validationIssue).toBeNull();

    await act(async () => {
      await expect(result.current.save()).resolves.toBe(true);
    });
    expect(result.current.saveReceipt).toEqual({
      targetUid: "target",
      assignmentPath: "adminRoleAssignments/target",
      beforeRoles: ["support"],
      afterRoles: ["support", "adminOwner"],
    });
  });

  it("prevents self-owner removal in controller state", async () => {
    mocks.loadAdminUserRoles.mockResolvedValue({user: user("owner", ["adminOwner"])});
    const onError = vi.fn();
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useAdminRoleManagementController({
      currentUserUid: "owner",
      onError,
      onNotice: vi.fn(),
      selectedTargetUid: "owner",
    }), {wrapper});
    await waitFor(() => expect(result.current.selectedRoles).toEqual(["adminOwner"]));
    act(() => result.current.toggleRole("adminOwner", false));
    expect(result.current.selectedRoles).toEqual(["adminOwner"]);
    expect(onError).toHaveBeenLastCalledWith("You cannot remove your own adminOwner claim.");
  });
});

describe("adminRolePolicies", () => {
  it("has exactly one policy for every governed role claim", () => {
    expect(Object.keys(adminRolePolicies).sort()).toEqual([...adminRoleClaimKeys].sort());
    expect(adminRoleClaimKeys).not.toContain("finance");
    expect(adminRoleClaimKeys).not.toContain("analyticsViewer");
  });
});
