import {act, cleanup, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {PartnerRouteApp} from "./PartnerRouteApp";
const mocks = vi.hoisted(() => ({
  session: {user: null as {uid: string} | null, resolved: true, error: null,
    epoch: 1, isCurrent: () => true},
  request: vi.fn(), confirm: vi.fn(), reset: vi.fn(), google: vi.fn(), signOut: vi.fn(),
}));
vi.mock("./useAdminSession", () => ({useAdminSession: () => mocks.session}));
vi.mock("../shared/api/firebase", () => ({
  requestPhoneSignInCode: mocks.request, confirmPhoneSignInCode: mocks.confirm,
  resetPhoneSignIn: mocks.reset, signInWithGoogleAdmin: mocks.google, signOutAdmin: mocks.signOut,
}));
vi.mock("../features/partners/ui/PartnerWorkspaceScreen", () => ({
  PartnerWorkspaceScreen: ({actorUid}: {actorUid: string}) => <p>Partner workspace: {actorUid}</p>,
}));
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks(); mocks.session.user = null; mocks.session.resolved = true;
  mocks.request.mockResolvedValue(undefined); mocks.confirm.mockResolvedValue(undefined);
  mocks.google.mockResolvedValue(undefined);
});
describe("Partner phone sign-in", () => {
  it("normalizes the phone, verifies OTP and waits for Firebase identity before showing private data", async () => {
    const user = userEvent.setup(); const view = render(<PartnerRouteApp />);
    await user.type(screen.getByRole("textbox", {name: "Phone number"}), "+91 90000 00000");
    await user.click(screen.getByRole("button", {name: "Send verification code"}));
    expect(mocks.request).toHaveBeenCalledWith("+919000000000");
    expect(document.getElementById("admin-phone-recaptcha")).not.toBeNull();
    await user.type(screen.getByRole("textbox", {name: "Verification code"}), "123456");
    await user.click(screen.getByRole("button", {name: "Verify and sign in"}));
    expect(mocks.confirm).toHaveBeenCalledWith("123456");
    expect(screen.queryByText(/Partner workspace:/)).toBeNull();
    mocks.session.user = {uid: "phone-partner"}; view.rerender(<PartnerRouteApp />);
    expect(await screen.findByText("Partner workspace: phone-partner")).toBeTruthy();
    expect(mocks.reset).toHaveBeenCalled();
  });
  it("rejects invalid input before SMS or verification calls", async () => {
    const user = userEvent.setup(); render(<PartnerRouteApp />);
    await user.type(screen.getByRole("textbox", {name: "Phone number"}), "90000");
    await user.click(screen.getByRole("button", {name: "Send verification code"}));
    expect(mocks.request).not.toHaveBeenCalled();
    await user.clear(screen.getByRole("textbox", {name: "Phone number"}));
    await user.type(screen.getByRole("textbox", {name: "Phone number"}), "+919000000000");
    await user.click(screen.getByRole("button", {name: "Send verification code"}));
    await user.type(screen.getByRole("textbox", {name: "Verification code"}), "123");
    await user.click(screen.getByRole("button", {name: "Verify and sign in"}));
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(screen.getByText("Enter the six-digit phone verification code.")).toBeTruthy();
  });
  it("retains recovery controls after an incorrect code and clears the old challenge when changing phone", async () => {
    mocks.confirm.mockRejectedValueOnce(new Error("Incorrect verification code"));
    const user = userEvent.setup(); render(<PartnerRouteApp />);
    await user.type(screen.getByRole("textbox", {name: "Phone number"}), "+919000000000");
    await user.click(screen.getByRole("button", {name: "Send verification code"}));
    await user.type(screen.getByRole("textbox", {name: "Verification code"}), "111111");
    await user.click(screen.getByRole("button", {name: "Verify and sign in"}));
    expect(screen.getByText("Incorrect verification code")).toBeTruthy();
    await user.click(screen.getByRole("button", {name: "Use another phone"}));
    expect(mocks.reset).toHaveBeenCalledOnce();
    expect(screen.queryByRole("textbox", {name: "Verification code"})).toBeNull();
    expect(screen.queryByText("Incorrect verification code")).toBeNull();
  });
  it("blocks duplicate requests and discards late completion after leaving the route", async () => {
    let resolve!: () => void;
    mocks.request.mockReturnValue(new Promise<void>((done) => {resolve = done;}));
    const user = userEvent.setup(); const view = render(<PartnerRouteApp />);
    await user.type(screen.getByRole("textbox", {name: "Phone number"}), "+919000000000");
    await user.dblClick(screen.getByRole("button", {name: "Send verification code"}));
    expect(mocks.request).toHaveBeenCalledOnce();
    expect((screen.getByRole("button", {name: "Sending code"}) as HTMLButtonElement).disabled).toBe(true);
    view.unmount(); expect(mocks.reset).toHaveBeenCalled();
    await act(async () => resolve());
    expect(screen.queryByRole("textbox", {name: "Verification code"})).toBeNull();
  });
  it("keeps phone entry retryable after an SMS error and retains Google sign-in", async () => {
    mocks.request.mockRejectedValueOnce(new Error("SMS unavailable"));
    const user = userEvent.setup(); render(<PartnerRouteApp />);
    await user.type(screen.getByRole("textbox", {name: "Phone number"}), "+919000000000");
    await user.click(screen.getByRole("button", {name: "Send verification code"}));
    expect(screen.getByText("SMS unavailable")).toBeTruthy();
    expect(screen.getByRole("textbox", {name: "Phone number"})).toBeTruthy();
    await user.click(screen.getByRole("button", {name: "Sign in with Google"}));
    expect(mocks.google).toHaveBeenCalledOnce();
  });
});
