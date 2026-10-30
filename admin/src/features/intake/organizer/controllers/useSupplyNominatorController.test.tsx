import {act, cleanup, renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {createQueryHarness} from "../../../../shared/test/queryHarness";
import {useSupplyNominatorController} from "./useSupplyNominatorController";

const repository = vi.hoisted(() => ({
  listSupplyNominators: vi.fn(),
  setSupplyNominator: vi.fn(),
  currentStaffUid: vi.fn(),
}));
vi.mock("../api/supplyNominatorRepository", () => repository);

const nominator = {nominatorId: `whatsapp-${"a".repeat(64)}`, channel: "whatsapp", phoneLast4: "2345", instagramHandle: null,
  role: "associate", uid: "owner-1", displayName: "Suvrat", defaultMarket: "mumbai", active: true,
  updatedAt: "2026-10-30T08:00:00.000Z"};
const input = {phoneE164: "+919800012345", uid: "owner-1", role: "associate" as const, displayName: "Suvrat",
  defaultMarket: "mumbai", active: true};

describe("useSupplyNominatorController", () => {
  afterEach(cleanup);
  beforeEach(() => {
    Object.values(repository).forEach((mock) => mock.mockReset());
    repository.listSupplyNominators.mockResolvedValue([nominator]);
    repository.currentStaffUid.mockResolvedValue("owner-1");
  });

  it("lists nominators, knows who is signed in, and saves then reloads", async () => {
    const {wrapper} = createQueryHarness();
    const onNotice = vi.fn();
    repository.setSupplyNominator.mockResolvedValue({nominatorId: nominator.nominatorId, created: true,
      phoneLast4: "2345", instagramHandle: null, defaultMarket: "mumbai", active: true});
    const {result} = renderHook(() => useSupplyNominatorController({onError: vi.fn(), onNotice}), {wrapper});
    await waitFor(() => expect(result.current.nominators).toHaveLength(1));
    await waitFor(() => expect(result.current.myUid).toBe("owner-1"));
    let done = false;
    await act(async () => { done = await result.current.save(input); });
    expect(done).toBe(true);
    expect(repository.setSupplyNominator.mock.calls[0][0]).toEqual(input);
    expect(onNotice).toHaveBeenCalledWith("Links sent from the number ending 2345 now become nominations.");
    await waitFor(() => expect(repository.listSupplyNominators.mock.calls.length).toBeGreaterThan(1));
  });

  it("reports a refused change", async () => {
    const {wrapper} = createQueryHarness();
    const onError = vi.fn();
    repository.setSupplyNominator.mockRejectedValue(new Error("That account has no sales role."));
    const {result} = renderHook(() => useSupplyNominatorController({onError, onNotice: vi.fn()}), {wrapper});
    let done = true;
    await act(async () => { done = await result.current.save({...input, active: false}); });
    expect(done).toBe(false);
    expect(onError).toHaveBeenCalledWith("That account has no sales role.");
  });
});
