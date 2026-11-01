import {act, cleanup, render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type {User} from "firebase/auth";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {App} from "./App";

const mocks = vi.hoisted(() => ({
  getIdTokenResult: vi.fn(), onIdTokenChanged: vi.fn(),
  save: vi.fn(), load: vi.fn(), list: vi.fn(), signOut: vi.fn(),
}));
vi.mock("firebase/auth", () => ({
  getIdTokenResult: mocks.getIdTokenResult, onIdTokenChanged: mocks.onIdTokenChanged,
}));
vi.mock("../shared/api/dataMode", () => ({dataMode: () => "live"}));
vi.mock("../shared/api/firebase", () => ({
  auth: {}, signOutAdmin: mocks.signOut, resetPhoneSignIn: vi.fn(),
  confirmPhoneSignInCode: vi.fn(), requestPhoneSignInCode: vi.fn(),
}));
vi.mock("../features/admin-roles/api/adminRoleRepository", () => ({
  loadAdminRoleAssignments: mocks.list, loadAdminUserRoles: mocks.load,
  saveAdminUserRoles: mocks.save,
}));
vi.mock("../features/now/ui/NowRouteScreen", () => ({
  NowRouteScreen: () => <p>Permitted support overview</p>,
}));
const owner = {uid: "owner", email: "owner@example.invalid"} as User;
const support = {uid: "support", email: "support@example.invalid"} as User;
const target = {
  targetUid: "private-target-uid", email: "target@example.invalid",
  displayName: "Target", disabled: false, roles: ["support"],
  assignmentPath: "adminRoleAssignments/private-target-uid",
};
let tokenChanged: (user: User | null) => void;

afterEach(cleanup);
beforeEach(async () => {
  window.history.replaceState({}, "", "/admin-roles/private-target-uid");
  mocks.onIdTokenChanged.mockImplementation((_auth, callback) => {
    tokenChanged = callback;
    callback(owner);
    return vi.fn();
  });
  mocks.getIdTokenResult.mockResolvedValue({claims: {adminOwner: true}});
  mocks.list.mockResolvedValue({generatedAt: "2026-10-02T01:00:00.000Z", rows: [], source: "adminRoleAssignments"});
  mocks.load.mockResolvedValue({user: target});
  await import("../features/admin-roles/ui/AdminRoleManagementScreen");
});

describe("App mutation session isolation", () => {
  it.each(["success", "failure"])("withholds an old role-save %s and releases the new identity's controls", async (outcome) => {
    let complete!: (value: unknown) => void;
    let fail!: (error: Error) => void;
    mocks.save.mockReturnValue(new Promise((resolve, reject) => { complete = resolve; fail = reject; }));
    const user = userEvent.setup();
    await act(async () => { render(<App />); });
    await act(async () => { await vi.dynamicImportSettled(); });
    await screen.findByRole("button", {name: "Save role change"});
    await user.click(screen.getByRole("checkbox", {name: /^Support/iu}));
    await user.type(screen.getByLabelText("Review note"), "Synthetic approved review.");
    await user.click(screen.getByRole("button", {name: "Save role change"}));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
    mocks.getIdTokenResult.mockResolvedValue({claims: {support: true}});
    act(() => tokenChanged(support));
    await screen.findByText("Permitted support overview");
    expect(screen.getByRole("link", {name: "Needs you"}).getAttribute("aria-disabled")).toBeNull();
    await act(async () => {
      if (outcome === "success") {
        complete({user: {...target, roles: []}, beforeRoles: ["support"], afterRoles: []});
      } else {
        fail(new Error("Private role failure for private-target-uid"));
      }
    });
    expect(screen.queryByText(/private-target-uid/u)).toBeNull();
    expect(screen.queryByText(/Unable to save admin role changes/u)).toBeNull();
  });

  it("keeps private content hidden and exposes sign-out failure recovery", async () => {
    mocks.signOut.mockRejectedValue(new Error("Synthetic signout storage failure"));
    const user = userEvent.setup();
    await act(async () => { render(<App />); });
    await act(async () => { await vi.dynamicImportSettled(); });
    await screen.findByRole("button", {name: "Save role change"});
    await user.click(screen.getByText(owner.email!));
    await user.click(screen.getByRole("button", {name: "Sign out"}));
    await screen.findByText("Synthetic signout storage failure");
    expect(screen.queryByRole("button", {name: "Save role change"})).toBeNull();
    act(() => tokenChanged(owner));
    await screen.findByRole("button", {name: "Save role change"});
  });
});
