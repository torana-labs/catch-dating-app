import {act, renderHook, waitFor} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {createQueryHarness} from "../../../shared/test/queryHarness";
import {resetSampleSafety} from "../../../shared/api/sampleSafety";
import {useSafetySettingsController} from "./useSafetySettingsController";

describe("useSafetySettingsController", () => {
  beforeEach(() => resetSampleSafety());

  it("reads the rules and refuses an edit from ops", async () => {
    const {wrapper} = createQueryHarness();
    const onError = vi.fn();
    const {result} = renderHook(() => useSafetySettingsController({
      canEdit: false, onError, onNotice: vi.fn()}), {wrapper});
    await waitFor(() => expect(result.current.loadState).toBe("ready"));
    expect(result.current.snapshot?.stepRoles.ban).toBe("owner");
    expect(result.current.snapshot?.retentionDaysAfterDeletion).toBe(180);
    await act(async () => {
      expect(await result.current.save({
        ...result.current.snapshot!.settings})).toBe(false);
    });
    expect(onError).toHaveBeenCalledWith(
      "Only the owner can change safety settings.");
  });

  it("lets the owner switch a rule off", async () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useSafetySettingsController({
      canEdit: true, onError: vi.fn(), onNotice: vi.fn()}), {wrapper});
    await waitFor(() => expect(result.current.loadState).toBe("ready"));
    const {reasons, organizerBlockLists, organizerReports} =
      result.current.snapshot!.settings;
    await act(async () => {
      expect(await result.current.save({reasons, organizerBlockLists,
        organizerReports, restrictOnSevereReport: false})).toBe(true);
    });
    await waitFor(() => expect(
      result.current.snapshot?.settings.restrictOnSevereReport).toBe(false));
  });
});
