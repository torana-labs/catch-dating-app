import {act, renderHook, waitFor} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import {createQueryHarness} from "../../../shared/test/queryHarness";
import {jobOf, rolesForJob} from "./teamJobs";
import {useTeamController} from "./useTeamController";

describe("team jobs", () => {
  it("reads every claim as one of three jobs", () => {
    expect(jobOf(["adminOwner", "support"])).toBe("owner");
    expect(jobOf(["safetyReviewer"])).toBe("ops");
    expect(jobOf(["admin"])).toBe("ops");
    expect(jobOf(["salesStaff"])).toBe("sales");
    expect(jobOf([])).toBe("none");
    expect(rolesForJob("ops")).toEqual(["support"]);
    expect(rolesForJob("none")).toEqual([]);
  });
});

describe("useTeamController", () => {
  it("lists the team and changes one person's job with a note",
    async () => {
      const {wrapper} = createQueryHarness();
      const onNotice = vi.fn();
      const {result} = renderHook(() => useTeamController({
        currentUserUid: "admin-owner", onError: vi.fn(), onNotice,
        selectedUid: "support-ops"}), {wrapper});
      await waitFor(() => expect(result.current.loadState).toBe("ready"));
      expect(result.current.members.length).toBeGreaterThan(0);
      await waitFor(() => expect(result.current.selected).not.toBeNull());
      expect(result.current.validationIssue).toBe("Choose a different job.");
      act(() => result.current.setJob("sales"));
      expect(result.current.validationIssue).toBe("Add a review note.");
      act(() => result.current.setNote("Moving to sales."));
      expect(result.current.validationIssue).toBeNull();
      await act(async () => {
        expect(await result.current.save()).toBe(true);
      });
      expect(onNotice).toHaveBeenCalledWith("Role change saved.");
    });

  it("refuses to take the owner's own owner role away", async () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useTeamController({
      currentUserUid: "admin-owner", onError: vi.fn(), onNotice: vi.fn(),
      selectedUid: "admin-owner"}), {wrapper});
    await waitFor(() => expect(result.current.selected).not.toBeNull());
    act(() => result.current.setJob("ops"));
    expect(result.current.validationIssue)
      .toBe("You can't remove your own owner role.");
  });
});
