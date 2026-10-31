import {act, cleanup, renderHook, waitFor} from "@testing-library/react";
import type {User} from "firebase/auth";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {useAdminSession} from "./useAdminSession";

const mocks = vi.hoisted(() => ({getIdTokenResult: vi.fn(), onIdTokenChanged: vi.fn()}));
vi.mock("firebase/auth", () => mocks);
vi.mock("../shared/api/firebase", () => ({auth: {}}));

const owner = {uid: "owner"} as User;
const support = {uid: "support"} as User;
let tokenChanged: (user: User | null) => void;
let listenerFailed: () => void;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return {promise, resolve, reject};
}

afterEach(cleanup);
beforeEach(() => {
  mocks.onIdTokenChanged.mockImplementation((_auth, callback, onError) => {
    tokenChanged = callback;
    listenerFailed = onError;
    return vi.fn();
  });
  mocks.getIdTokenResult.mockResolvedValue({claims: {adminOwner: true}});
});

describe("Admin session authorization epochs", () => {
  it("withholds roles immediately on a same-object token refresh and fails closed", async () => {
    const {result} = renderHook(() => useAdminSession("live"));
    act(() => tokenChanged(owner));
    await waitFor(() => expect(result.current.roles).toEqual(["adminOwner"]));
    const previousEpoch = result.current.epoch;
    const claims = deferred<{claims: Record<string, boolean>}>();
    mocks.getIdTokenResult.mockReturnValue(claims.promise);
    act(() => tokenChanged(owner));
    expect(result.current).toMatchObject({user: owner, resolved: false, roles: []});
    expect(result.current.epoch).toBeGreaterThan(previousEpoch);
    await act(async () => claims.reject(new Error("claim read failed")));
    expect(result.current).toMatchObject({resolved: true, roles: []});
    expect(result.current.error).toMatch(/Unable to read admin claims/u);
  });

  it.each(["success", "failure"])("ignores a stale claim %s after another identity resolves", async (outcome) => {
    const claims = deferred<{claims: Record<string, boolean>}>();
    mocks.getIdTokenResult.mockReturnValueOnce(claims.promise)
      .mockResolvedValueOnce({claims: {support: true}});
    const {result} = renderHook(() => useAdminSession("live"));
    act(() => tokenChanged(owner));
    act(() => tokenChanged(null));
    act(() => tokenChanged(support));
    await waitFor(() => expect(result.current.roles).toEqual(["support"]));
    const current = result.current.epoch;
    await act(async () => {
      if (outcome === "success") claims.resolve({claims: {adminOwner: true}});
      else claims.reject(new Error("old failure"));
    });
    expect(result.current).toMatchObject({user: support, roles: ["support"], epoch: current, error: null});
  });

  it("fences a forced claim refresh when sign-out starts before it completes", async () => {
    const {result} = renderHook(() => useAdminSession("live"));
    act(() => tokenChanged(owner));
    await waitFor(() => expect(result.current.roles).toEqual(["adminOwner"]));
    const claims = deferred<{claims: Record<string, boolean>}>();
    mocks.getIdTokenResult.mockReturnValueOnce(claims.promise);
    let refresh!: Promise<void>;
    act(() => { refresh = result.current.refreshClaims(); });
    expect(mocks.getIdTokenResult).toHaveBeenLastCalledWith(owner, true);
    expect(result.current).toMatchObject({roles: [], resolved: false});
    act(() => { void result.current.clearSession(); });
    await act(async () => { claims.resolve({claims: {adminOwner: true}}); await refresh; });
    expect(result.current).toMatchObject({user: null, roles: []});
  });

  it("uses a newer token event during forced refresh and clears on listener failure", async () => {
    const {result} = renderHook(() => useAdminSession("live"));
    act(() => tokenChanged(owner));
    await waitFor(() => expect(result.current.roles).toEqual(["adminOwner"]));
    const claims = deferred<{claims: Record<string, boolean>}>();
    mocks.getIdTokenResult.mockReturnValueOnce(claims.promise)
      .mockResolvedValueOnce({claims: {support: true}});
    act(() => { void result.current.refreshClaims(); });
    act(() => tokenChanged(owner));
    await waitFor(() => expect(result.current.roles).toEqual(["support"]));
    await act(async () => claims.resolve({claims: {adminOwner: true}}));
    expect(result.current.roles).toEqual(["support"]);
    act(() => listenerFailed());
    expect(result.current).toMatchObject({user: null, roles: []});
  });
});
