import {describe, expect, it, vi} from "vitest";
import type {ApplicationVerifier, Auth, User} from "firebase/auth";
import {beginClaimPhoneLink, signInOrLinkClaimGoogle} from "../../firebase";
import {signInOrLinkEmailLink, verifyEmailOnCurrentAccount} from "../../firebaseClaimAccountLinking";
import {claimAccountLinkingErrorMessage} from "./claimAccountLinking";
import {brand} from "@catch/brand";

function fixture(providers: string[] = [], phoneNumber: string | null = null) {
  const user = {uid: "same-owner", phoneNumber, getIdToken: vi.fn().mockResolvedValue("fresh-token"),
    providerData: providers.map((providerId) => ({providerId}))} as unknown as User;
  const state = {currentUser: user as User | null, authStateReady: vi.fn().mockResolvedValue(undefined)};
  const auth = state as unknown as Auth;
  const result = {user};
  const confirm = vi.fn().mockResolvedValue(result);
  const api = {sendEmailVerification: vi.fn(), verifyBeforeUpdateEmail: vi.fn(), isSignInWithEmailLink: vi.fn().mockReturnValue(true),
    EmailAuthProvider: {credentialWithLink: vi.fn().mockReturnValue({providerId: "password"})},
    signInWithEmailLink: vi.fn().mockImplementation(async () => {state.currentUser = user; return result;}),
    linkWithCredential: vi.fn().mockResolvedValue(result),
    GoogleAuthProvider: class {setCustomParameters() {}},
    PhoneAuthProvider: class {constructor(_auth: Auth) {} static credential(id: string, code: string) {return {id, code};}
      verifyPhoneNumber = vi.fn().mockResolvedValue("verification-id");},
    signInWithPopup: vi.fn().mockImplementation(async () => {state.currentUser = user; return result;}),
    linkWithPopup: vi.fn().mockResolvedValue(result),
    reauthenticateWithPopup: vi.fn().mockResolvedValue(result),
    signInWithPhoneNumber: vi.fn().mockResolvedValue({confirm}),
    linkWithPhoneNumber: vi.fn().mockResolvedValue({confirm}),
    reauthenticateWithCredential: vi.fn().mockResolvedValue(result)};
  return {user, auth, state, api, sdk: api as unknown as typeof import("firebase/auth"), confirm};
}
const verifier = {type: "recaptcha", verify: async () => "verified"} as ApplicationVerifier;
describe("claim account credential continuity", () => {
  it("shows owned fallback for SDK failures and retains explicit recovery guidance", () => {
    expect(claimAccountLinkingErrorMessage(new Error("auth/code-expired"), "Try again.")).toBe("Try again.");
    expect(claimAccountLinkingErrorMessage(Object.assign(new Error("SDK detail"), {code: "auth/network-request-failed"}), "Try again.")).toBe("Try again.");
    expect(claimAccountLinkingErrorMessage(new Error("Your account changed. Restart verification."), "Try again.")).toBe("Your account changed. Restart verification.");
  });
  it("links Google to an existing phone UID without switching sign-in", async () => {
    const f = fixture(["phone"], "+15555550100");
    await signInOrLinkClaimGoogle(f.auth, f.sdk);
    expect(f.api.linkWithPopup).toHaveBeenCalledWith(f.user, expect.anything());
    expect(f.api.signInWithPopup).not.toHaveBeenCalled();
    expect(f.auth.currentUser?.uid).toBe("same-owner");
  });
  it("reauthenticates an already linked Google account and signs in only when signed out", async () => {
    const f = fixture(["google.com"]); await signInOrLinkClaimGoogle(f.auth, f.sdk);
    expect(f.api.reauthenticateWithPopup).toHaveBeenCalled();
    expect(f.api.linkWithPopup).not.toHaveBeenCalled();
    f.state.currentUser = null; await signInOrLinkClaimGoogle(f.auth, f.sdk);
    expect(f.api.signInWithPopup).toHaveBeenCalled();
  });
  it("links phone to the current Google UID and rejects a changed identity before OTP confirmation", async () => {
    const f = fixture(["google.com"]);
    const challenge = await beginClaimPhoneLink(f.auth, "+15555550100", verifier, f.sdk);
    expect(f.api.linkWithPhoneNumber).toHaveBeenCalledWith(f.user, "+15555550100", verifier);
    expect(f.api.signInWithPhoneNumber).not.toHaveBeenCalled();
    await challenge.confirm("123456"); expect(f.confirm).toHaveBeenCalledOnce();
    f.state.currentUser = {uid: "another-user"} as User;
    await expect(challenge.confirm("123456")).rejects.toThrow("account changed");
    expect(f.confirm).toHaveBeenCalledOnce();
  });
  it("reauthenticates the existing phone and rejects an implicit phone replacement", async () => {
    const f = fixture(["phone"], "+15555550100");
    const challenge = await beginClaimPhoneLink(f.auth, "+15555550100", verifier, f.sdk);
    await challenge.confirm("123456"); expect(f.api.reauthenticateWithCredential).toHaveBeenCalled();
    await expect(beginClaimPhoneLink(f.auth, "+15555550200", verifier, f.sdk)).rejects.toThrow("phone already linked");
    expect(f.api.linkWithPhoneNumber).not.toHaveBeenCalled();
  });
  it("rejects a signed-out OTP after another account signs in", async () => {
    const f = fixture(); f.state.currentUser = null;
    const challenge = await beginClaimPhoneLink(f.auth, "+15555550100", verifier, f.sdk);
    f.state.currentUser = {uid: "another-user"} as User;
    await expect(challenge.confirm("123456")).rejects.toThrow("account changed");
    expect(f.confirm).not.toHaveBeenCalled();
    expect(f.auth.currentUser?.uid).toBe("another-user");
  });
  it("checks the signed-out phone result and maps credential collisions", async () => {
    const f = fixture(); f.state.currentUser = null;
    const challenge = await beginClaimPhoneLink(f.auth, "+15555550100", verifier, f.sdk);
    f.confirm.mockImplementationOnce(async () => {f.state.currentUser = f.user; return {user: f.user};});
    await challenge.confirm("123456");
    expect(f.user.getIdToken).toHaveBeenCalledWith(true);
    f.state.currentUser = null;
    f.confirm.mockRejectedValueOnce({code: "auth/credential-already-in-use"});
    await expect(challenge.confirm("123456")).rejects.toThrow("Accounts were not combined");
  });
  it("credential collisions offer recovery and do not fall back to switching accounts", async () => {
    const f = fixture(["phone"]);
    f.api.linkWithPopup.mockRejectedValue({code: "auth/credential-already-in-use"});
    await expect(signInOrLinkClaimGoogle(f.auth, f.sdk)).rejects.toThrow("Accounts were not combined");
    expect(f.api.signInWithPopup).not.toHaveBeenCalled();
    expect(f.auth.currentUser?.uid).toBe("same-owner");
  });
});


describe("guest email credential continuity", () => {
  const email = "guest@example.test";
  const link = "https://example.test/email-link";
  it("links verified email to the current phone UID without switching sign-in", async () => {
    const f = fixture(["phone"], "+15555550100");
    expect(await signInOrLinkEmailLink(f.auth, email, link, f.sdk)).toBe(f.user);
    expect(f.api.linkWithCredential).toHaveBeenCalledWith(f.user, expect.anything());
    expect(f.api.signInWithEmailLink).not.toHaveBeenCalled();
    expect(f.user.getIdToken).toHaveBeenCalledWith(true);
  });
  it("reauthenticates an existing email provider", async () => {
    const f = fixture(["password"]); Object.assign(f.user, {email});
    await signInOrLinkEmailLink(f.auth, email, link, f.sdk);
    expect(f.api.reauthenticateWithCredential).toHaveBeenCalledOnce();
    expect(f.api.linkWithCredential).not.toHaveBeenCalled();
  });
  it("signs in by email only when no account is already signed in", async () => {
    const f = fixture(); f.state.currentUser = null;
    await signInOrLinkEmailLink(f.auth, email, link, f.sdk);
    expect(f.api.signInWithEmailLink).toHaveBeenCalledWith(f.auth, email, link);
    expect(f.api.linkWithCredential).not.toHaveBeenCalled();
  });
  it("does not replace an existing account email implicitly", async () => {
    const f = fixture(["google.com"]); Object.assign(f.user, {email: "another@example.test"});
    await expect(signInOrLinkEmailLink(f.auth, email, link, f.sdk)).rejects.toThrow("email already linked");
    expect(f.api.linkWithCredential).not.toHaveBeenCalled();
    expect(f.api.signInWithEmailLink).not.toHaveBeenCalled();
  });
  it("retains the current UID on collision and never retries as sign-in", async () => {
    const f = fixture(["phone"]);
    f.api.linkWithCredential.mockRejectedValue({code: "auth/credential-already-in-use"});
    await expect(signInOrLinkEmailLink(f.auth, email, link, f.sdk)).rejects.toThrow("Accounts were not combined");
    expect(f.auth.currentUser?.uid).toBe(f.user.uid);
    expect(f.api.signInWithEmailLink).not.toHaveBeenCalled();
  });
  it("rejects invalid links before any auth mutation", async () => {
    const f = fixture(); f.api.isSignInWithEmailLink.mockReturnValue(false);
    await expect(signInOrLinkEmailLink(f.auth, email, link, f.sdk)).rejects.toThrow("invalid or expired");
    expect(f.api.linkWithCredential).not.toHaveBeenCalled();
    expect(f.api.signInWithEmailLink).not.toHaveBeenCalled();
  });
  it("fences a changed account while linking or refreshing claims", async () => {
    for (const stage of ["link", "refresh"]) {
      const f = fixture();
      const switchUser = async () => {f.state.currentUser = {uid: "other"} as User; return {user: f.user};};
      if (stage === "link") f.api.linkWithCredential.mockImplementation(switchUser);
      else vi.mocked(f.user.getIdToken).mockImplementation(async () => {await switchUser(); return "token";});
      await expect(signInOrLinkEmailLink(f.auth, email, link, f.sdk)).rejects.toThrow("account changed");
    }
  });
});


describe("optional guest email verification", () => {
  it("verifies a new email on the current phone account without changing sign-in", async () => {
    const f = fixture(["phone"], "+15555550100");
    await verifyEmailOnCurrentAccount(f.auth, f.user.uid, "guest@example.test", `${brand.web.origin}/events/event1/`, f.sdk);
    expect(f.api.verifyBeforeUpdateEmail).toHaveBeenCalledWith(f.user, "guest@example.test", {url: `${brand.web.origin}/events/event1/`});
    expect(f.api.signInWithEmailLink).not.toHaveBeenCalled();
  });
  it("verifies the existing email rather than replacing it", async () => {
    const f = fixture(["phone"], "+15555550100"); Object.assign(f.user, {email: "guest@example.test"});
    await verifyEmailOnCurrentAccount(f.auth, f.user.uid, "guest@example.test", `${brand.web.origin}/events/event1/`, f.sdk);
    expect(f.api.sendEmailVerification).toHaveBeenCalledOnce();
    expect(f.api.verifyBeforeUpdateEmail).not.toHaveBeenCalled();
    await expect(verifyEmailOnCurrentAccount(f.auth, f.user.uid, "another@example.test", `${brand.web.origin}/`, f.sdk)).rejects.toThrow("email already linked");
  });
  it("rejects an account change before verification", async () => {
    const f = fixture(["phone"], "+15555550100");
    await expect(verifyEmailOnCurrentAccount(f.auth, "other", "guest@example.test", `${brand.web.origin}/`, f.sdk)).rejects.toThrow("account changed");
    expect(f.api.verifyBeforeUpdateEmail).not.toHaveBeenCalled();
  });
  it("credential conflicts offer recovery without merging or signing in", async () => {
    const f = fixture(["phone"], "+15555550100");
    f.api.verifyBeforeUpdateEmail.mockRejectedValue({code: "auth/email-already-in-use"});
    await expect(verifyEmailOnCurrentAccount(f.auth, f.user.uid, "guest@example.test", `${brand.web.origin}/`, f.sdk)).rejects.toThrow("Accounts were not combined");
    expect(f.api.signInWithEmailLink).not.toHaveBeenCalled();
  });
});
