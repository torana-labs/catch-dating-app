import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {act, renderHook, waitFor} from "@testing-library/react";
import type {PropsWithChildren} from "react";
import {beforeEach, describe, expect, it, vi} from "vitest";
const api = vi.hoisted(() => ({begin: vi.fn()}));
vi.mock("../../firebase", () => ({beginWebsiteAccountPhoneVerification: api.begin}));
import type {ReferralAccountUser, ReferralOwnedOrganizer} from "./referralAccountModel";
import {provideReferralAccountDeps, useReferralAccountController, type ReferralAccountDeps} from "./useReferralAccountController";

const asha: ReferralAccountUser = {uid: "uid-asha", phoneNumber: "+919876543210", isAnonymous: false};
const kestrel: ReferralOwnedOrganizer = {organizerId: "org-kestrel", name: "Kestrel Supper Club"};

/** Deps whose signed-in user the test sets, with the owned host pages it answers. */
function account({seen, owned = async () => [kestrel]}: {seen: boolean; owned?: () => Promise<ReferralOwnedOrganizer[]>}) {
  let listener: ((user: ReferralAccountUser | null) => void) | null = null;
  const deps: ReferralAccountDeps = {
    seenSignedIn: () => seen,
    watchUser: vi.fn((callback: (user: ReferralAccountUser | null) => void) => {listener = callback; return () => {listener = null;};}),
    ownedOrganizers: vi.fn(owned),
  };
  const client = new QueryClient();
  const wrapper = ({children}: PropsWithChildren) => (
    <QueryClientProvider client={client}>{provideReferralAccountDeps(deps, children)}</QueryClientProvider>
  );
  const view = renderHook(() => useReferralAccountController(), {wrapper});
  return {deps, ...view, emit: (user: ReferralAccountUser | null) => act(() => listener?.(user))};
}

beforeEach(() => {vi.clearAllMocks(); window.localStorage.clear();});

describe("useReferralAccountController", () => {
  it("is signed out on a device never seen signed in, without loading the account", () => {
    const h = account({seen: false});
    expect(h.result.current.account).toEqual({status: "signedOut"});
    expect(h.result.current.signInOpen).toBe(false);
    expect(h.deps.watchUser).not.toHaveBeenCalled();
    expect(h.deps.ownedOrganizers).not.toHaveBeenCalled();
  });

  it("is signed in as the owner's host page once the account and its live pages are read", async () => {
    const h = account({seen: true});
    expect(h.result.current.account).toEqual({status: "checking"});
    h.emit(asha);
    await waitFor(() => expect(h.result.current.account).toEqual({status: "owner", name: "Kestrel Supper Club"}));
    h.emit(null);
    expect(h.result.current.account).toEqual({status: "signedOut"});
  });

  it("is signed in without credit when the account owns no live page, and unknown when the pages cannot be read", async () => {
    const none = account({seen: true, owned: async () => []});
    none.emit(asha);
    await waitFor(() => expect(none.result.current.account).toEqual({status: "notOwner", name: "+919876543210"}));
    const failed = account({seen: true, owned: () => Promise.reject(new Error("permission-denied"))});
    failed.emit(asha);
    await waitFor(() => expect(failed.result.current.account).toEqual({status: "unknown", name: "+919876543210"}));
  });

  it("opens the one sign-in sheet, closes it with its draft cleared, and starts reading the account once signed in there", async () => {
    const h = account({seen: false});
    act(() => h.result.current.toggleSignIn());
    expect(h.result.current.signInOpen).toBe(true);
    act(() => h.result.current.sheet.setPhone("+91 98765 43210"));
    act(() => h.result.current.closeSignIn());
    expect(h.result.current.signInOpen).toBe(false);

    api.begin.mockResolvedValue({clear: vi.fn(), confirm: vi.fn().mockResolvedValue({uid: asha.uid})});
    act(() => h.result.current.toggleSignIn());
    act(() => h.result.current.sheet.setPhone("+91 98765 43210"));
    await act(async () => h.result.current.sheet.sendCode());
    expect(api.begin).toHaveBeenCalledWith("+919876543210", h.result.current.sheet.recaptchaId);
    act(() => h.result.current.sheet.setCode("123456"));
    await act(async () => h.result.current.sheet.verify());
    expect(h.result.current.signInOpen).toBe(false);
    expect(h.deps.watchUser).toHaveBeenCalledTimes(1);
    h.emit(asha);
    await waitFor(() => expect(h.result.current.account).toEqual({status: "owner", name: "Kestrel Supper Club"}));
  });
});
