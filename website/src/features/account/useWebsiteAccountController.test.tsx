import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {act, renderHook, waitFor} from "@testing-library/react";
import type {FormEvent, PropsWithChildren} from "react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import type {User} from "../../firebase";
const api = vi.hoisted(() => ({watch: vi.fn(), read: vi.fn(), begin: vi.fn()}));
vi.mock("../../firebase", () => ({watchWebsiteAccountAuthState: api.watch,
  manageWebsiteAccount: api.read, beginWebsiteAccountPhoneVerification: api.begin}));
import {useWebsiteAccountController} from "./useWebsiteAccountController";
const user = {uid: "one", phoneNumber: "+919876543210"} as User;
const incomplete = {uid: "one", accountReady: false, displayName: "", phoneNumber: user.phoneNumber,
  profileRevision: 0, dateOfBirth: null, following: false, eventAge: null};
const ready = {...incomplete, accountReady: true, displayName: "Ada", profileRevision: 1};
const submit = {preventDefault: vi.fn()} as unknown as FormEvent<HTMLFormElement>;
let auth: (user: User | null) => void;
function harness(initial: User | null = user, eventId?: string) {
  api.watch.mockImplementation((callback) => {auth = callback; callback(initial); return vi.fn();});
  const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
  const wrapper = ({children}: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return {...renderHook(() => useWebsiteAccountController({eventId}), {wrapper}), client};
}
beforeEach(() => {vi.clearAllMocks(); api.read.mockResolvedValue(incomplete);});
describe("website account", () => {
  it("completes a verified minimal account without age or social details", async () => {
    const h = harness(); await waitFor(() => expect(h.result.current.account).toEqual(incomplete));
    act(() => h.result.current.setDisplayName("Ada"));
    api.read.mockImplementation(async (data) => {
      if (data.action === "complete") {api.read.mockResolvedValue(ready); return ready;}
      return incomplete;
    });
    await act(async () => h.result.current.handleSubmit(submit));
    await waitFor(() => expect(h.result.current.ready).toBe(true));
    expect(api.read).toHaveBeenCalledWith({action: "complete", expectedUid: "one", displayName: "Ada", expectedProfileRevision: 0});
    expect(api.begin).not.toHaveBeenCalled(); h.unmount();
  });
  it("continues after OTP sign-in and preserves optional birth date", async () => {
    const h = harness(null); const clear = vi.fn();
    api.begin.mockResolvedValue({clear, confirm: async () => {auth(user); return user;}});
    act(() => {h.result.current.setDisplayName("Ada"); h.result.current.setPhoneNumber(user.phoneNumber!); h.result.current.setDateOfBirth("2010-01-01");});
    await act(async () => h.result.current.handleSubmit(submit));
    expect(h.result.current.stage).toBe("code");
    act(() => h.result.current.setCode("123456"));
    api.read.mockImplementation(async (data) => data.action === "complete" ? ready : incomplete);
    await act(async () => h.result.current.handleSubmit(submit));
    expect(api.read).toHaveBeenCalledWith(expect.objectContaining({action: "complete", dateOfBirth: "2010-01-01", expectedUid: "one"}));
    expect(clear).toHaveBeenCalled(); h.unmount();
  });
  it("keeps a signed-in Google-only account and links a phone to the same UID before completing it", async () => {
    // A website account made with Google before sign-in became phone only: still signed in, no phone yet.
    const googleOnly = {uid: "g", phoneNumber: null, providerData: [{providerId: "google.com"}]} as unknown as User;
    const linked = {...googleOnly, phoneNumber: "+919876543210"} as User;
    const noPhone = {...incomplete, uid: "g", phoneNumber: null};
    api.read.mockResolvedValue(noPhone);
    const h = harness(googleOnly);
    await waitFor(() => expect(h.result.current.account).toEqual(noPhone));
    expect(h.result.current.uid).toBe("g");
    expect(h.result.current.verified).toBe(false);
    expect(h.result.current.ready).toBe(false);
    api.begin.mockResolvedValue({clear: vi.fn(), confirm: async () => {auth(linked); return linked;}});
    act(() => {h.result.current.setDisplayName("Ada"); h.result.current.setPhoneNumber("+91 98765 43210");});
    await act(async () => h.result.current.handleSubmit(submit));
    // The phone code links to the signed-in UID (beginClaimPhoneLink), never a new account.
    expect(api.begin).toHaveBeenCalledWith("+919876543210", h.result.current.recaptchaId);
    expect(h.result.current.stage).toBe("code");
    act(() => h.result.current.setCode("123456"));
    api.read.mockImplementation(async (data) => data.action === "complete" ? {...ready, uid: "g"} : {...noPhone, phoneNumber: linked.phoneNumber});
    await act(async () => h.result.current.handleSubmit(submit));
    expect(api.read).toHaveBeenCalledWith(expect.objectContaining({action: "complete", expectedUid: "g"}));
    h.unmount();
  });
  it("asks for birth date only for an age-restricted event and blocks an ineligible age", async () => {
    api.read.mockResolvedValue({...ready, eventAge: {minimum: 18, maximum: 99, needsDateOfBirth: true, eligible: false}});
    const h = harness(user, "event");
    await waitFor(() => expect(h.result.current.ageRequired).toBe(true));
    expect(h.result.current.ready).toBe(false);
    api.read.mockResolvedValue({...ready, eventAge: {minimum: 18, maximum: 99, needsDateOfBirth: false, eligible: false}});
    await act(async () => {await h.result.current.refresh();});
    await waitFor(() => expect(h.result.current.ageIneligible).toBe(true)); h.unmount();
  });
  it("ignores stale reads and clears private data after an account switch", async () => {
    let resolve!: (value: typeof ready) => void;
    api.read.mockImplementationOnce(() => new Promise((done) => {resolve = done;}));
    const h = harness();
    await waitFor(() => expect(api.read).toHaveBeenCalled());
    api.read.mockResolvedValue({...incomplete, uid: "two"});
    act(() => auth({...user, uid: "two"}));
    await act(async () => resolve(ready));
    await waitFor(() => expect(h.result.current.account?.uid).toBe("two"));
    expect(h.result.current.ready).toBe(false);
    expect(h.result.current.displayName).toBe(""); h.unmount();
  });
  it("does not save when the account changes while reading the current revision", async () => {
    const h = harness(); await waitFor(() => expect(h.result.current.account).toBeDefined());
    act(() => h.result.current.setDisplayName("Ada"));
    let resolve!: (value: typeof incomplete) => void;
    api.read.mockImplementationOnce(() => new Promise((done) => {resolve = done;}));
    let completion!: Promise<void>;
    act(() => {completion = h.result.current.handleSubmit(submit);});
    await waitFor(() => expect(resolve).toBeTypeOf("function"));
    act(() => auth(null));
    await act(async () => {resolve(incomplete); await completion;});
    expect(api.read.mock.calls.some(([data]) => data.action === "complete")).toBe(false); h.unmount();
  });
  it("retains the OTP challenge after a wrong code", async () => {
    const h = harness(null);
    api.begin.mockResolvedValue({clear: vi.fn(), confirm: vi.fn().mockRejectedValue({code: "auth/invalid-verification-code"})});
    act(() => {h.result.current.setDisplayName("Ada"); h.result.current.setPhoneNumber(user.phoneNumber!);});
    await act(async () => h.result.current.handleSubmit(submit));
    act(() => h.result.current.setCode("000000"));
    await act(async () => h.result.current.handleSubmit(submit));
    expect(h.result.current.stage).toBe("code"); expect(h.result.current.status.tone).toBe("is-error"); h.unmount();
  });
  it("hides cached readiness when the authoritative refresh fails", async () => {
    api.read.mockResolvedValue(ready);
    const h = harness(); await waitFor(() => expect(h.result.current.ready).toBe(true));
    api.read.mockRejectedValue(new Error("unavailable"));
    await act(async () => {await h.result.current.refresh();});
    await waitFor(() => expect(h.result.current.ready).toBe(false));
    expect(h.result.current.account).toBeUndefined();
    expect(h.result.current.status.tone).toBe("is-error"); h.unmount();
  });
  it("restarts expired verification without losing entered identity", async () => {
    const h = harness(null); const clear = vi.fn();
    api.begin.mockResolvedValue({clear, confirm: vi.fn().mockRejectedValue({code: "auth/code-expired"})});
    act(() => {h.result.current.setDisplayName("Ada"); h.result.current.setPhoneNumber(user.phoneNumber!);});
    await act(async () => h.result.current.handleSubmit(submit));
    act(() => h.result.current.setCode("000000"));
    await act(async () => h.result.current.handleSubmit(submit));
    expect(h.result.current.stage).toBe("details"); expect(h.result.current.code).toBe("");
    expect(h.result.current.displayName).toBe("Ada"); expect(clear).toHaveBeenCalled(); h.unmount();
  });

});
