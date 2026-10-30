import {act, cleanup, renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {createQueryHarness} from "../../../shared/test/queryHarness";
import type {RoutingPolicy} from "./paymentRoutingForm";
import {usePaymentRoutingController} from "./usePaymentRoutingController";

const repository = vi.hoisted(() => ({
  loadAppPaymentRouting: vi.fn(),
  replaceAppPaymentRouting: vi.fn(),
}));
vi.mock("../api/paymentRoutingRepository", () => repository);

const oauth = (mode: "test" | "live") => ({route: "razorpayOAuth" as const, mode,
  currency: "INR", merchantCountry: "IN"});
const policy: RoutingPolicy = {policyId: "app", organizerId: null, revision: 2,
  formFee: oauth("live"), eventAdmission: oauth("live"), hostMembership: null,
  updatedAtMillis: 1};

function render(canManage = true) {
  const {wrapper} = createQueryHarness();
  const onError = vi.fn();
  const onNotice = vi.fn();
  const hook = renderHook(() => usePaymentRoutingController({canManage, onError,
    onNotice}), {wrapper});
  return {...hook, onError, onNotice};
}

describe("usePaymentRoutingController", () => {
  afterEach(cleanup);
  beforeEach(() => {
    Object.values(repository).forEach((mock) => mock.mockReset());
    repository.loadAppPaymentRouting.mockResolvedValue(policy);
  });

  it("puts host memberships in test mode and keeps the other purposes", async () => {
    repository.replaceAppPaymentRouting.mockResolvedValue({...policy,
      revision: 3, hostMembership: oauth("test")});
    const {result, onNotice} = render();
    await waitFor(() => expect(result.current.loadState).toBe("ready"));
    act(() => result.current.startEdit());
    act(() => result.current.setPurpose("hostMembership", {route: "razorpayOAuth"}));
    act(() => { result.current.review(); });
    expect(result.current.editor?.confirmations).toEqual([]);
    expect(result.current.confirmed).toBe(true);
    await act(async () => { await result.current.save(); });
    expect(repository.replaceAppPaymentRouting.mock.calls[0][0]).toEqual({
      action: "replace", organizerId: null, expectedRevision: 2,
      formFee: oauth("live"), eventAdmission: oauth("live"),
      hostMembership: oauth("test")});
    expect(onNotice.mock.calls[0][0]).toContain("revision 3");
    expect(result.current.policy?.hostMembership).toEqual(oauth("test"));
  });

  it("refuses to save a live switch until it is typed", async () => {
    const {result} = render();
    await waitFor(() => expect(result.current.loadState).toBe("ready"));
    act(() => result.current.startEdit());
    act(() => result.current.setPurpose("hostMembership", {route: "razorpayRoute",
      mode: "live"}));
    act(() => { result.current.review(); });
    expect(result.current.editor?.confirmations.map((entry) => entry.phrase))
      .toEqual(["host memberships live", "host memberships route"]);
    let done = true;
    await act(async () => { done = await result.current.save(); });
    expect(done).toBe(false);
    expect(repository.replaceAppPaymentRouting).not.toHaveBeenCalled();
    act(() => result.current.setTyped("hostMembership.live", "host memberships live"));
    expect(result.current.confirmed).toBe(false);
    act(() => result.current.setTyped("hostMembership.route", "host memberships route"));
    expect(result.current.confirmed).toBe(true);
  });

  it("rebases onto the latest policy after a conflict", async () => {
    repository.loadAppPaymentRouting.mockResolvedValueOnce(policy)
      .mockResolvedValue({...policy, revision: 5});
    repository.replaceAppPaymentRouting.mockRejectedValue(Object.assign(
      new Error("changed"), {code: "functions/aborted"}));
    const {result} = render();
    await waitFor(() => expect(result.current.loadState).toBe("ready"));
    act(() => result.current.startEdit());
    act(() => result.current.setPurpose("hostMembership", {route: "razorpayOAuth"}));
    act(() => { result.current.review(); });
    await act(async () => { await result.current.save(); });
    expect(result.current.editor?.base.revision).toBe(5);
    expect(result.current.editor?.preview).toBeNull();
    expect(result.current.editor?.draft.hostMembership.route).toBe("razorpayOAuth");
  });

  it("does not load for roles outside Finance and Admin Owner", () => {
    const {result} = render(false);
    expect(result.current.loadState).toBe("error");
    expect(repository.loadAppPaymentRouting).not.toHaveBeenCalled();
  });
});
