import {act, cleanup, render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {App} from "./App";

const mocks = vi.hoisted(() => ({
  dataMode: vi.fn(),
  getIdTokenResult: vi.fn(),
  onIdTokenChanged: vi.fn(),
  confirmPhoneSignInCode: vi.fn(),
  requestPhoneSignInCode: vi.fn(),
  resetPhoneSignIn: vi.fn(),
  signOutAdmin: vi.fn(),
  signInWithGoogleAdmin: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  getIdTokenResult: mocks.getIdTokenResult,
  onIdTokenChanged: mocks.onIdTokenChanged,
}));

vi.mock("../shared/api/dataMode", () => ({
  dataMode: mocks.dataMode,
}));

vi.mock("../shared/api/firebase", () => ({
  auth: {},
  confirmPhoneSignInCode: mocks.confirmPhoneSignInCode,
  requestPhoneSignInCode: mocks.requestPhoneSignInCode,
  resetPhoneSignIn: mocks.resetPhoneSignIn,
  signOutAdmin: mocks.signOutAdmin,
  signInWithGoogleAdmin: mocks.signInWithGoogleAdmin,
}));

vi.mock("../features/marketing/ui/MarketingOpsScreen", async () => {
  const {useState} = await import("react");
  const {AdminButton} = await import("../shared/ui/AdminPrimitives");
  const {CatchField} = await import("@catch/web-ui");
  return {
    MarketingOpsScreen: ({
      onTabChange,
      onUnsavedChangesChange,
    }: {
      onTabChange: (tab: "posts") => void;
      onUnsavedChangesChange: (dirty: boolean) => void;
    }) => {
      const [caption, setCaption] = useState("Original caption");
      return (
        <section aria-label="Marketing fixture">
          <CatchField
            recipe="input"
            title="Draft caption"
            value={caption}
            onChanged={(value) => {
              setCaption(value);
              onUnsavedChangesChange(true);
            }}
          />
          <AdminButton onClick={() => onTabChange("posts")}>Posts within Marketing</AdminButton>
        </section>
      );
    },
  };
});

vi.mock("../features/now/ui/NowRouteScreen", () => ({
  NowRouteScreen: () => <p>Needs you fixture</p>,
}));

vi.mock("../features/sales/ui/SalesWorkspaceScreen", () => ({
  SalesWorkspaceScreen: ({assignedStaffOnly, currentUserUid}: {
    assignedStaffOnly: boolean; currentUserUid: string;
  }) => <p>Sales fixture: {currentUserUid} · {assignedStaffOnly ? "assigned" : "admin"}</p>,
}));

describe("App live deep-link ownership", () => {
  afterEach(cleanup);

  beforeEach(() => {
    mocks.dataMode.mockReturnValue("live");
    mocks.getIdTokenResult.mockReset();
    mocks.onIdTokenChanged.mockReset();
    mocks.confirmPhoneSignInCode.mockReset();
    mocks.requestPhoneSignInCode.mockReset();
    mocks.resetPhoneSignIn.mockReset();
    mocks.signOutAdmin.mockReset();
    window.history.replaceState({}, "", "/now");
  });

  it("preserves phone OTP beside the existing Google account sign-in", async () => {
    const user = userEvent.setup();
    mocks.onIdTokenChanged.mockImplementation(() => () => undefined);
    mocks.requestPhoneSignInCode.mockResolvedValue(undefined);
    mocks.confirmPhoneSignInCode.mockResolvedValue(undefined);

    render(<App />);

    expect(screen.getByRole("button", {name: "Sign in with Google"})).toBeTruthy();
    await user.type(
      screen.getByRole("textbox", {name: "Phone number"}),
      "+91 90000 00000"
    );
    await user.click(screen.getByRole("button", {
      name: "Send verification code",
    }));

    expect(mocks.requestPhoneSignInCode).toHaveBeenCalledWith("+919000000000");
    await user.type(
      await screen.findByRole("textbox", {name: "Verification code"}),
      "123456"
    );
    await user.click(screen.getByRole("button", {name: "Verify and sign in"}));

    expect(mocks.confirmPhoneSignInCode).toHaveBeenCalledWith("123456");
    expect(await screen.findByRole("textbox", {name: "Phone number"}))
      .not.toBeNull();
  });

  it("preserves a requested route while Firebase authentication resolves", async () => {
    mocks.onIdTokenChanged.mockImplementation(() => () => undefined);
    window.history.replaceState({}, "", "/safety/reports%2Freport-1");

    render(<App />);

    expect(await screen.findByRole("button", {name: "Send verification code"}))
      .not.toBeNull();
    expect(screen.getByRole("button", {name: "Sign in with Google"})).toBeTruthy();
    expect(window.location.pathname).toBe("/safety/reports%2Freport-1");
  });

  it("offers Google sign-in through the existing guarded Admin shell", async () => {
    mocks.onIdTokenChanged.mockImplementation(() => () => undefined);
    mocks.signInWithGoogleAdmin.mockResolvedValue(undefined);
    render(<App />);
    await userEvent.setup().click(screen.getByRole("button", {name: "Sign in with Google"}));
    expect(mocks.signInWithGoogleAdmin).toHaveBeenCalledOnce();
    expect(screen.queryByText("Needs you fixture")).toBeNull();
  });

  it("preserves a requested route while admin claims resolve", async () => {
    const user = {email: "admin@catch.local", uid: "admin-uid"};
    let resolveClaims: ((value: {claims: Record<string, unknown>}) => void) |
      null = null;
    mocks.onIdTokenChanged.mockImplementation((
      _auth: unknown,
      callback: (nextUser: typeof user) => void
    ) => {
      callback(user);
      return () => undefined;
    });
    mocks.getIdTokenResult.mockReturnValue(new Promise((resolve) => {
      resolveClaims = resolve;
    }));
    window.history.replaceState({}, "", "/organizers/afterfly");

    render(<App />);

    expect(await screen.findByRole("heading", {name: "Checking admin access"}))
      .not.toBeNull();
    expect(window.location.pathname).toBe("/organizers/afterfly");

    await act(async () => {
      resolveClaims?.({claims: {}});
    });
    expect(await screen.findByRole("heading", {name: "Admin claim required"}))
      .not.toBeNull();
    expect(window.location.pathname).toBe("/organizers/afterfly");
  });

  it("limits Sales staff navigation and resets authority after account switch", async () => {
    type User = {email: string; uid: string};
    let authChanged: ((user: User | null) => void) | undefined;
    mocks.onIdTokenChanged.mockImplementation((_auth: unknown, callback: typeof authChanged) => {
      authChanged = callback;
      callback?.({email: "staff@catch.local", uid: "staff-1"});
      return () => undefined;
    });
    mocks.getIdTokenResult.mockImplementation(async (user: User) => ({
      claims: user.uid === "staff-1" ? {salesStaff: true} : {adminOwner: true},
    }));
    window.history.replaceState({}, "", "/organizers/other");
    render(<App />);
    expect(await screen.findByText("Sales fixture: staff-1 · assigned")).toBeTruthy();
    expect(window.location.pathname.startsWith("/sales")).toBe(true);
    for (const name of ["Needs you", "Organizers", "Marketing", "Admin roles", "Money"]) {
      expect(screen.queryByRole("link", {name})).toBeNull();
    }
    await act(async () => authChanged?.({email: "owner@catch.local", uid: "owner-1"}));
    expect(await screen.findByText("Sales fixture: owner-1 · admin")).toBeTruthy();
    expect(screen.getByRole("link", {name: "Needs you"})).toBeTruthy();
    await act(async () => authChanged?.(null));
    expect(await screen.findByRole("button", {name: "Sign in with Google"})).toBeTruthy();
    expect(screen.queryByText("Sales fixture: owner-1 · admin")).toBeNull();
  });
});

describe("Marketing unsaved route transitions", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    mocks.dataMode.mockReturnValue("sample");
    window.history.replaceState({}, "", "/marketing/drafts/sample-draft/source");
  });

  it("keeps edited input after cancellation, then leaves after discard confirmation", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    render(<App />);
    const caption = await screen.findByRole("textbox", {name: "Draft caption"});
    await user.type(caption, " updated");

    await user.click(screen.getByRole("link", {name: "Needs you"}));
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(window.location.pathname).toBe("/marketing/drafts/sample-draft/source");
    expect((caption as HTMLInputElement).value).toBe("Original caption updated");

    await user.click(screen.getByRole("button", {name: "Posts within Marketing"}));
    expect(window.location.pathname).toBe("/marketing/posts");
    expect(confirm).toHaveBeenCalledTimes(1);
    expect((caption as HTMLInputElement).value).toBe("Original caption updated");

    await user.click(screen.getByRole("link", {name: "Needs you"}));
    await waitFor(() => expect(screen.getByText("Needs you fixture")).not.toBeNull());
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(window.location.pathname).toBe("/now");
  });

  it("guards browser Back and preserves the draft when cancelled", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    // Marketing is parked out of the navigation; reach it by address after Needs you.
    // The router's back guard reads its own entry index from history state.
    window.history.replaceState({usr: null, key: "now", idx: 0}, "", "/now");
    window.history.pushState({usr: null, key: "marketing", idx: 1}, "", "/marketing");
    render(<App />);
    const caption = await screen.findByRole("textbox", {name: "Draft caption"});
    await user.type(caption, " updated");

    act(() => window.history.back());
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(window.location.pathname).toBe("/marketing"));
    expect((caption as HTMLInputElement).value).toBe("Original caption updated");

    act(() => window.history.back());
    await waitFor(() => expect(screen.getByText("Needs you fixture")).not.toBeNull());
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(window.location.pathname).toBe("/now");
  });

  it("guards browser Forward after returning to Marketing with a clean draft", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    window.history.replaceState({}, "", "/marketing");
    render(<App />);
    await screen.findByRole("textbox", {name: "Draft caption"});
    await user.click(screen.getByRole("link", {name: "Needs you"}));
    await waitFor(() => expect(window.location.pathname).toBe("/now"));
    expect(confirm).not.toHaveBeenCalled();

    act(() => window.history.back());
    const caption = await screen.findByRole("textbox", {name: "Draft caption"});
    await user.type(caption, " updated");
    act(() => window.history.forward());
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(window.location.pathname).toBe("/marketing"));
    expect((caption as HTMLInputElement).value).toBe("Original caption updated");
  });
});
