import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import type {SalesDemoAuth} from "../../shared/auth/salesDemoAuth";
import type {SalesDemoContinuation, SalesDemoContinuationApi} from "../../shared/domain/salesDemoHandoff";
import {DemoContinuationWorkspace} from "./DemoContinuationWorkspace";

const continuationId = "c".repeat(64);
const view: SalesDemoContinuation = {continuationId, expiresAt: "2099-01-01T00:00:00.000Z",
  organizer: {organizerId: "hidden-organizer", name: "Private organizer", claimState: "claimPending"},
  setup: {schemaVersion: 1, setupHash: "a".repeat(64), organizerId: "hidden-organizer",
    publicationAuthority: false, status: "claim_required", formId: null, editorPath: null,
    plan: {mode: "manual", requirements: ["Review consent"]}}};
function fixture(initialView: SalesDemoContinuation = view) {
  const api: SalesDemoContinuationApi = {get: vi.fn().mockResolvedValue(initialView), prepare: vi.fn()};
  const auth: SalesDemoAuth = {watch: (callback) => {
    callback({uid: "same-owner", email: "owner@example.invalid", emailVerified: true, phoneNumber: null});
    return () => undefined;
  }, signInGoogle: vi.fn(), beginPhone: vi.fn(), signOut: vi.fn()};
  const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
  const rendered = render(<QueryClientProvider client={client}>
    <DemoContinuationWorkspace continuationId={continuationId} api={api} auth={auth} />
  </QueryClientProvider>);
  return {...rendered, api, auth};
}
describe("private canonical organizer handoff", () => {
  it("resets private verification state when navigating to another continuation on the same account", async () => {
    const f = fixture({...view, organizer: {...view.organizer, claimState: "unclaimed"}});
    await screen.findByText("Private organizer");
    fireEvent.change(screen.getByLabelText("Your name"), {target: {value: "First owner"}});
    fireEvent.change(screen.getByLabelText("Public proof links"), {target: {value: "https://first.example.test/ownership"}});
    const challenge = {confirm: vi.fn(), clear: vi.fn()};
    vi.mocked(f.auth.beginPhone).mockResolvedValue(challenge);
    fireEvent.change(screen.getByLabelText("Verify invited phone (international format)"), {target: {value: "+919876543210"}});
    fireEvent.click(screen.getByRole("button", {name: "Send verification code"}));
    await screen.findByLabelText("Verification code");
    const nextId = "d".repeat(64);
    vi.mocked(f.api.get).mockResolvedValue({...view, continuationId: nextId,
      organizer: {...view.organizer, organizerId: "second-organizer", name: "Second private organizer", claimState: "unclaimed"}});
    const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
    f.rerender(<QueryClientProvider client={client}>
      <DemoContinuationWorkspace continuationId={nextId} api={f.api} auth={f.auth} />
    </QueryClientProvider>);
    await screen.findByText("Second private organizer");
    expect(screen.queryByLabelText("Verification code")).toBeNull();
    expect((screen.getByLabelText("Verify invited phone (international format)") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Your name") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Public proof links") as HTMLTextAreaElement).value).toBe("");
    expect(challenge.clear).toHaveBeenCalledOnce();
    expect(f.api.prepare).not.toHaveBeenCalled(); f.unmount();
  });
  it("renders the server's pending review after a reload without offering another claim", async () => {
    const f = fixture();
    await screen.findByText(/Organizer ownership is already under review/);
    expect(screen.queryByRole("button", {name: "Submit claim for review"})).toBeNull();
    expect(screen.queryByLabelText("Your name")).toBeNull();
    expect(f.api.prepare).not.toHaveBeenCalled();
    expect(f.auth.beginPhone).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Verify invited phone (international format)")).toBeTruthy();
    f.unmount();
  });
  it("hides the private target after access is denied on refresh", async () => {
    const f = fixture(); await screen.findByText("Private organizer");
    vi.mocked(f.api.get).mockRejectedValue(new Error("permission-denied"));
    fireEvent.click(screen.getByRole("button", {name: "Check claim and setup status"}));
    await waitFor(() => expect(screen.queryByText("Private organizer")).toBeNull());
    await screen.findByText(/This setup has expired or current access changed/);
    expect(screen.queryByRole("button", {name: "Submit claim for review"})).toBeNull();
    expect(f.api.prepare).not.toHaveBeenCalled(); f.unmount();
  });
});
