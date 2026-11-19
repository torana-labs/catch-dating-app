import {act, renderHook, waitFor} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {createQueryHarness} from "../../../shared/test/queryHarness";
import {resetSampleDiscovery} from "../../../shared/api/sampleDiscovery";
import {
  sameDiscoveryRules,
  useDiscoverySettingsController,
  validHomeOrganizersMinimum,
} from "./useDiscoverySettingsController";

describe("useDiscoverySettingsController", () => {
  beforeEach(() => resetSampleDiscovery());

  it("reads the defaults and refuses an edit from ops", async () => {
    const {wrapper} = createQueryHarness();
    const onError = vi.fn();
    const {result} = renderHook(() => useDiscoverySettingsController({
      canEdit: false, onError, onNotice: vi.fn()}), {wrapper});
    await waitFor(() => expect(result.current.loadState).toBe("ready"));
    const snapshot = result.current.snapshot!;
    expect(snapshot.settings.updatedAtMillis).toBeNull();
    expect(snapshot.settings.surfaces.plans).toEqual(
      {onCatch: true, notOnCatch: false});
    expect(sameDiscoveryRules(snapshot.settings, snapshot.defaults))
      .toBe(true);
    await act(async () => {
      expect(await result.current.save(snapshot.settings)).toBe(false);
    });
    expect(onError).toHaveBeenCalledWith(
      "Only the owner can change discovery settings.");
  });

  it("lets the owner show organisers not on Catch yet", async () => {
    const {wrapper} = createQueryHarness();
    const onNotice = vi.fn();
    const {result} = renderHook(() => useDiscoverySettingsController({
      canEdit: true, onError: vi.fn(), onNotice}), {wrapper});
    await waitFor(() => expect(result.current.loadState).toBe("ready"));
    const {surfaces} = result.current.snapshot!.settings;
    await act(async () => {
      expect(await result.current.save({
        surfaces: {...surfaces, plans: {onCatch: true, notOnCatch: true}},
        homeOrganizersMinimum: 4,
        homeClaimAction: true,
      })).toBe(true);
    });
    expect(onNotice).toHaveBeenCalledWith("Discovery settings saved.");
    await waitFor(() => expect(
      result.current.snapshot?.settings.surfaces.plans.notOnCatch).toBe(true));
    expect(result.current.snapshot?.settings.homeOrganizersMinimum).toBe(4);
    expect(result.current.snapshot?.settings.updatedByUid)
      .toBe("sample-owner");
  });

  it("refuses a band minimum outside 1 to 24", async () => {
    expect(validHomeOrganizersMinimum(0)).toBe(false);
    expect(validHomeOrganizersMinimum(25)).toBe(false);
    expect(validHomeOrganizersMinimum(2.5)).toBe(false);
    expect(validHomeOrganizersMinimum(Number.NaN)).toBe(false);
    expect(validHomeOrganizersMinimum(24)).toBe(true);
    const {wrapper} = createQueryHarness();
    const onError = vi.fn();
    const {result} = renderHook(() => useDiscoverySettingsController({
      canEdit: true, onError, onNotice: vi.fn()}), {wrapper});
    await waitFor(() => expect(result.current.loadState).toBe("ready"));
    await act(async () => {
      expect(await result.current.save({
        ...result.current.snapshot!.defaults,
        homeOrganizersMinimum: 30})).toBe(false);
    });
    expect(onError).toHaveBeenCalledWith(
      "Choose a number of organisers from 1 to 24.");
  });
});
