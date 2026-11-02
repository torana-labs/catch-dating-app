import {act, cleanup, render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type {User} from "firebase/auth";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {sampleManagePaymentIssues} from "../features/money/api/moneySamples";
import {App} from "./App";

const mocks = vi.hoisted(() => ({
  getIdTokenResult: vi.fn(), onIdTokenChanged: vi.fn(), signOutAdmin: vi.fn(),
  loadIssues: vi.fn(), loadBills: vi.fn(),
}));
vi.mock("firebase/auth", () => ({
  getIdTokenResult: mocks.getIdTokenResult, onIdTokenChanged: mocks.onIdTokenChanged,
}));
vi.mock("../shared/api/dataMode", () => ({dataMode: () => "live"}));
vi.mock("../shared/api/firebase", () => ({
  auth: {}, signOutAdmin: mocks.signOutAdmin, resetPhoneSignIn: vi.fn(),
  confirmPhoneSignInCode: vi.fn(), requestPhoneSignInCode: vi.fn(),
}));
vi.mock("../features/money/api/moneyRepository", () => ({
  loadIssues: mocks.loadIssues, loadBills: mocks.loadBills, loadOrganizerBills: vi.fn(),
  actOnBill: vi.fn(), actOnIssue: vi.fn(), moneyNowMillis: () => Date.now(),
}));
vi.mock("../features/now/ui/NowRouteScreen", () => ({
  NowRouteScreen: () => <p>Permitted overview</p>,
}));

const owner = {uid: "owner", email: "owner@example.invalid"} as User;
const support = {uid: "support", email: "support@example.invalid"} as User;
const issues = sampleManagePaymentIssues({action: "list", view: "open", issueId: null, note: null});
const issueTitle = issues.issues[0]!.title;
const billsMonth = {month: "2026-10", organizerId: null, bills: [], nextInvoiceNumber: "2026-27/001", gstRegistered: false,
  totals: {salesMinor: 0, billedMinor: 0, paidMinor: 0},
  counts: {all: 0, toSend: 0, sent: 0, overdue: 0, paid: 0, writtenOff: 0, free: 0}};
let tokenChanged: (user: User | null) => void;

afterEach(cleanup);
beforeEach(() => {
  window.history.replaceState({}, "", "/money");
  window.sessionStorage.clear();
  mocks.onIdTokenChanged.mockImplementation((_auth, callback) => {
    tokenChanged = callback;
    callback(owner);
    return vi.fn();
  });
  mocks.getIdTokenResult.mockResolvedValue({claims: {adminOwner: true}});
  mocks.loadIssues.mockResolvedValue(issues);
  mocks.loadBills.mockResolvedValue(billsMonth);
  mocks.signOutAdmin.mockImplementation(async () => { tokenChanged(null); });
});

describe("App with real Money controllers and session cache", () => {
  it("drops owner data before sign-out completes, then loads only the next identity's allowed sources", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findAllByText(issueTitle);
    const neverCompletes = new Promise<void>(() => undefined);
    mocks.signOutAdmin.mockReturnValue(neverCompletes);
    await user.click(screen.getByText(owner.email!));
    await user.click(screen.getByRole("button", {name: "Sign out"}));
    expect(screen.queryAllByText(issueTitle)).toHaveLength(0);
    expect(screen.getByRole("textbox", {name: "Phone number"})).not.toBeNull();

    // Money is the owner's alone, so a support identity lands on Needs you
    // and never loads Money again.
    mocks.getIdTokenResult.mockResolvedValue({claims: {support: true}});
    act(() => tokenChanged(support));
    await screen.findByText("Permitted overview");
    expect(mocks.loadIssues).toHaveBeenCalledOnce();
    expect(screen.queryAllByText(issueTitle)).toHaveLength(0);
  });

  it("removes cached owner data during same-UID claim resolution and after a failed new query", async () => {
    render(<App />);
    await screen.findAllByText(issueTitle);
    let resolveClaims!: (value: {claims: {adminOwner: boolean}}) => void;
    mocks.getIdTokenResult.mockReturnValue(new Promise((resolve) => { resolveClaims = resolve; }));
    mocks.loadIssues.mockRejectedValue(new Error("new session unavailable"));
    act(() => tokenChanged(owner));
    expect(screen.queryAllByText(issueTitle)).toHaveLength(0);
    expect(screen.getByRole("heading", {name: "Checking admin access"})).not.toBeNull();
    await act(async () => { resolveClaims({claims: {adminOwner: true}}); });
    await screen.findByText("new session unavailable", {}, {timeout: 2500});
    expect(screen.queryAllByText(issueTitle)).toHaveLength(0);
  });

  it("cannot restore data when an old non-abortable request finishes after revocation", async () => {
    let complete!: (value: typeof issues) => void;
    mocks.loadIssues.mockReturnValue(new Promise((resolve) => { complete = resolve; }));
    render(<App />);
    await waitFor(() => expect(mocks.loadIssues).toHaveBeenCalledOnce());
    mocks.getIdTokenResult.mockResolvedValue({claims: {support: true}});
    act(() => tokenChanged(owner));
    await screen.findByText("Permitted overview");
    await act(async () => { complete(issues); });
    expect(screen.queryAllByText(issueTitle)).toHaveLength(0);
    expect(mocks.loadIssues).toHaveBeenCalledOnce();
  });
});
