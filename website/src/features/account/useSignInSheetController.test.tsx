import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {act, renderHook} from "@testing-library/react";
import type {PropsWithChildren} from "react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {signInCopy} from "../../content/account";
const api = vi.hoisted(() => ({begin: vi.fn(), google: vi.fn(), send: vi.fn(), complete: vi.fn()}));
vi.mock("../../firebase", () => ({beginWebsiteAccountPhoneVerification: api.begin, signInWebsiteAccountWithGoogle: api.google,
  sendWebsiteAccountEmailLink: api.send, completeWebsiteAccountEmailLink: api.complete}));
import {useSignInSheetController} from "./useSignInSheetController";
import {emailForSignInKey, signedInHintKey} from "./signInModel";

function harness() {
  const onSignedIn = vi.fn();
  const client = new QueryClient();
  const wrapper = ({children}: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return {onSignedIn, ...renderHook(() => useSignInSheetController({onSignedIn}), {wrapper})};
}
beforeEach(() => {vi.clearAllMocks(); window.localStorage.clear();});

describe("sign-in sheet", () => {
  it("signs in with a phone code and remembers the device has an account", async () => {
    const clear = vi.fn(); const confirm = vi.fn().mockResolvedValue({uid: "u"});
    api.begin.mockResolvedValue({clear, confirm});
    const h = harness();
    act(() => h.result.current.setPhone("+91 98765 43210"));
    await act(async () => h.result.current.sendCode());
    expect(api.begin).toHaveBeenCalledWith("+919876543210", h.result.current.recaptchaId);
    expect(h.result.current.stage).toBe("code");
    act(() => h.result.current.setCode("12a3456"));
    expect(h.result.current.code).toBe("123456");
    await act(async () => h.result.current.verify());
    expect(confirm).toHaveBeenCalledWith("123456");
    expect(h.onSignedIn).toHaveBeenCalled();
    expect(window.localStorage.getItem(signedInHintKey)).toBe("1");
    expect(h.result.current.stage).toBe("start");
  });
  it("refuses a malformed phone before loading Firebase", async () => {
    const h = harness();
    act(() => h.result.current.setPhone("98765"));
    await act(async () => h.result.current.sendCode());
    expect(api.begin).not.toHaveBeenCalled();
    expect(h.result.current.status).toEqual({message: signInCopy.invalidPhone, tone: "is-error"});
  });
  it("names a wrong code and keeps the code step", async () => {
    api.begin.mockResolvedValue({clear: vi.fn(), confirm: vi.fn().mockRejectedValue(Object.assign(new Error("x"), {code: "auth/invalid-verification-code"}))});
    const h = harness();
    act(() => h.result.current.setPhone("+919876543210"));
    await act(async () => h.result.current.sendCode());
    act(() => h.result.current.setCode("000000"));
    await act(async () => h.result.current.verify());
    expect(h.result.current.status.message).toBe(signInCopy.incorrectCode);
    expect(h.result.current.stage).toBe("code");
    expect(h.onSignedIn).not.toHaveBeenCalled();
  });
  it("signs in with Google", async () => {
    api.google.mockResolvedValue(undefined);
    const h = harness();
    await act(async () => h.result.current.google());
    expect(h.onSignedIn).toHaveBeenCalled();
  });
  it("sends an email link that returns here, marked, and saves the address on this device", async () => {
    api.send.mockResolvedValue(undefined);
    const h = harness();
    act(() => h.result.current.setEmail(" asha@example.com "));
    await act(async () => h.result.current.sendLink());
    expect(api.send).toHaveBeenCalledWith("asha@example.com", expect.stringContaining("catchSignIn=1"));
    expect(window.localStorage.getItem(emailForSignInKey)).toBe("asha@example.com");
    expect(h.result.current.stage).toBe("linkSent");
    expect(h.onSignedIn).not.toHaveBeenCalled();
  });
  it("finishes a returned link with a confirmed address and clears it", async () => {
    api.complete.mockResolvedValue({uid: "u"});
    window.localStorage.setItem(emailForSignInKey, "asha@example.com");
    const h = harness();
    act(() => {h.result.current.confirmEmail(); h.result.current.setEmail("asha@example.com");});
    expect(h.result.current.stage).toBe("confirmEmail");
    await act(async () => h.result.current.finishEmail());
    expect(api.complete).toHaveBeenCalledWith("asha@example.com", window.location.href);
    expect(window.localStorage.getItem(emailForSignInKey)).toBeNull();
    expect(h.onSignedIn).toHaveBeenCalled();
  });
});
