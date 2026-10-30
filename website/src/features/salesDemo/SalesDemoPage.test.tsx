import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {BrowserRouter, Route, Routes} from "react-router";
import {afterEach, describe, expect, it, vi} from "vitest";
import type {SalesDemoAuth} from "./salesDemoAuth";
import type {SalesDemoApi, SalesDemoPreview, SalesDemoSession, SalesDemoSetup} from
  "./salesDemoModel";
import {salesDemoFormEditorUrl} from "./salesDemoModel";
import {SalesDemoPage} from "./SalesDemoPage";
import {brand} from "@catch/brand";

const grant = "A".repeat(43);
const preview: SalesDemoPreview = {schemaVersion: 1, synthetic: true,
  invitationId: "invite-1", interactiveAvailable: true,
  expiresAt: "2099-01-01T00:00:00.000Z",
  notice: "Sample workflow only. No real messages, charges or admission.",
  preview: {brandName: "Sample Host", headline: "A private sample",
    scenario: "Try a synthetic application", steps: ["Review", "Reply", "Admit"],
    retainedTools: ["Current booking tool"], limitations: ["No real sends"],
    cta: "Try sample"}};
const completed: SalesDemoSession = {schemaVersion: 1, synthetic: true,
  sessionId: "session-1", invitationId: "invite-1", blueprintId: "blueprint-1",
  blueprintRevision: 1, createdAt: "2026-09-28T00:00:00Z",
  expiresAt: "2099-01-01T00:00:00Z", status: "completed",
  allowedActions: [], revision: 4, actionCount: 3, step: "complete",
  application: {applicantName: "Sample Applicant", request: "Sample request",
    review: "approved"}, reply: {status: "prepared", template: "welcome"},
  guest: {status: "admitted", displayName: "Sample Applicant"},
  assistanceRequested: false};
const manualSetup: SalesDemoSetup = {schemaVersion: 1,
  setupHash: "a".repeat(64), plan: {mode: "manual",
    requirements: ["Meet the Catch team"]}, organizerId: "organizer-1",
  formId: null, editorPath: null, publicationAuthority: false,
  status: "manual_setup"};
const templateSetup: SalesDemoSetup = {...manualSetup, status: "ready",
  plan: {mode: "template", templateId: "basic", templateVersion: 1,
    templateHash: "b".repeat(64), materializerVersion: 1,
    title: "Real host form", requirements: ["Review your form"]}};
function renderCompleted(setup: SalesDemoSetup) {
  window.history.replaceState(null, "", `/demo/invite-1#grant=${grant}`);
  const api: SalesDemoApi = {preview: vi.fn().mockResolvedValue(preview),
    start: vi.fn().mockResolvedValue(completed), getSession: vi.fn(),
    advance: vi.fn(), getSetup: vi.fn().mockResolvedValue(setup),
    preserve: vi.fn().mockResolvedValue({continuationId: "c".repeat(64),
      expiresAt: "2099-01-01T00:00:00Z", publicationAuthority: false}),
    prepareSetup: vi.fn().mockResolvedValue({...setup, status: "prepared",
      formId: "demo_123", editorPath: "/host/audience/forms/demo_123"})};
  const auth: SalesDemoAuth = {watch: (callback) => {
    callback({uid: "user-one", email: "host@example.test", emailVerified: true,
      phoneNumber: null}); return () => undefined;},
  signInGoogle: vi.fn(), beginPhone: vi.fn()};
  const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
  render(<QueryClientProvider client={client}><BrowserRouter><Routes>
    <Route path="/demo/:invitationId" element={<SalesDemoPage api={api} auth={auth} />} />
  </Routes></BrowserRouter></QueryClientProvider>);
  return api;
}

describe("private demo landing", () => {
  afterEach(() => {cleanup(); vi.unstubAllEnvs();
    window.history.replaceState(null, "", "/");});

  it("requests only the generic shell while signed out and never opens a session automatically", async () => {
    window.history.replaceState(null, "", `/demo/invite-1#grant=${grant}`);
    const generic: SalesDemoPreview = {...preview, interactiveAvailable: false, expiresAt: null,
      preview: {...preview.preview, brandName: "Catch", headline: "Private workflow preview", scenario: "Verify the invited contact", steps: [], retainedTools: [], limitations: [], cta: "Verify contact"}};
    const api: SalesDemoApi = {preview: vi.fn().mockResolvedValue(generic), start: vi.fn(),
      getSession: vi.fn(), advance: vi.fn(), getSetup: vi.fn(), prepareSetup: vi.fn()};
    const auth: SalesDemoAuth = {watch: (callback) => {callback(null); return () => undefined;},
      signInGoogle: vi.fn(), beginPhone: vi.fn()};
    const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
    render(<QueryClientProvider client={client}><BrowserRouter><Routes>
      <Route path="/demo/:invitationId" element={<SalesDemoPage api={api} auth={auth} />} />
    </Routes></BrowserRouter></QueryClientProvider>);
    await screen.findByText("Verify the invited contact");
    expect(api.preview).toHaveBeenCalledExactlyOnceWith({invitationId: "invite-1"});
    expect(screen.queryByText("Sample Host")).toBeNull();
    expect(screen.queryByRole("button", {name: "Open interactive example"})).toBeNull();
    expect(api.start).not.toHaveBeenCalled(); expect(window.location.hash).toBe("");
  });

  it("removes the fragment and verifies the authenticated preview before explicit start", async () => {
    window.history.replaceState(null, "", `/demo/invite-1#grant=${grant}`);
    const api: SalesDemoApi = {preview: vi.fn().mockResolvedValue(preview),
      start: vi.fn().mockResolvedValue({} as SalesDemoSession),
      getSession: vi.fn(), advance: vi.fn(), getSetup: vi.fn(),
      prepareSetup: vi.fn()};
    const auth: SalesDemoAuth = {watch: (callback) => {
      callback({uid: "user-one", email: "host@example.test", emailVerified: true,
        phoneNumber: null}); return () => undefined;},
    signInGoogle: vi.fn(),
    beginPhone: vi.fn()};
    const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
    render(<QueryClientProvider client={client}><BrowserRouter><Routes>
      <Route path="/demo/:invitationId" element={<SalesDemoPage api={api} auth={auth} />} />
    </Routes></BrowserRouter></QueryClientProvider>);
    await waitFor(() => expect(screen.getByText("A private sample")).toBeTruthy());
    expect(window.location.hash).toBe("");
    expect(api.preview).toHaveBeenCalledWith({invitationId: "invite-1", grantToken: grant});
    expect(api.start).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", {name: "Open interactive example"}));
    await waitFor(() => expect(api.start).toHaveBeenCalledWith({
      invitationId: "invite-1", grantToken: grant, requestId: expect.any(String),
    }));
  });

  it("requires explicit sign-out before recovering another account without losing the grant", async () => {
    window.history.replaceState(null, "", `/demo/invite-1#grant=${grant}`);
    const api: SalesDemoApi = {preview: vi.fn().mockResolvedValue(preview),
      start: vi.fn().mockRejectedValue(new Error("permission-denied")),
      getSession: vi.fn(), advance: vi.fn(), getSetup: vi.fn(),
      prepareSetup: vi.fn()};
    let updateViewer: Parameters<SalesDemoAuth["watch"]>[0] = () => undefined;
    const auth: SalesDemoAuth = {watch: (callback) => {
      updateViewer = callback;
      callback({uid: "wrong-user", email: "wrong@example.test", emailVerified: true,
        phoneNumber: null}); return () => undefined;},
    signInGoogle: vi.fn(async () => updateViewer({uid: "invited-user",
      email: "invited@example.test", emailVerified: true, phoneNumber: null})),
    signOut: vi.fn(async () => updateViewer(null)),
    beginPhone: vi.fn()};
    const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
    render(<QueryClientProvider client={client}><BrowserRouter><Routes>
      <Route path="/demo/:invitationId" element={<SalesDemoPage api={api} auth={auth} />} />
    </Routes></BrowserRouter></QueryClientProvider>);
    fireEvent.click(await screen.findByRole("button", {name: "Open interactive example"}));
    await screen.findByText(/This account does not match/);
    expect(auth.signInGoogle).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", {name: "Sign out to recover a different account"}));
    await waitFor(() => expect(auth.signOut).toHaveBeenCalledOnce());
    fireEvent.click(await screen.findByRole("button", {name: "Continue with Google"}));
    await waitFor(() => expect(auth.signInGoogle).toHaveBeenCalledOnce());
    await screen.findByText(/invited@example.test/);
    fireEvent.click(screen.getByRole("button", {name: "Open interactive example"}));
    await waitFor(() => expect(api.start).toHaveBeenCalledTimes(2));
    const calls = vi.mocked(api.start).mock.calls;
    expect(calls[1][0].grantToken).toBe(grant);
    expect(calls[1][0].requestId).not.toBe(calls[0][0].requestId);
    expect(window.location.hash).toBe("");
    expect(screen.getByLabelText("Or verify phone (international format)")).toBeTruthy();
  });

  it("recovers an expired SMS challenge in place without sending automatically", async () => {
    window.history.replaceState(null, "", `/demo/invite-1#grant=${grant}`);
    const challenge = {confirm: vi.fn().mockRejectedValue(new Error("auth/code-expired")),
      clear: vi.fn()};
    const api: SalesDemoApi = {preview: vi.fn().mockResolvedValue(preview),
      start: vi.fn(), getSession: vi.fn(), advance: vi.fn(),
      getSetup: vi.fn(), prepareSetup: vi.fn()};
    const auth: SalesDemoAuth = {watch: (callback) => {
      callback(null); return () => undefined;}, signInGoogle: vi.fn(),
    beginPhone: vi.fn().mockResolvedValue(challenge)};
    const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
    render(<QueryClientProvider client={client}><BrowserRouter><Routes>
      <Route path="/demo/:invitationId" element={<SalesDemoPage api={api} auth={auth} />} />
    </Routes></BrowserRouter></QueryClientProvider>);
    fireEvent.change(await screen.findByLabelText("Or verify phone (international format)"),
      {target: {value: "+15555550123"}});
    fireEvent.click(screen.getByRole("button", {name: "Send verification code"}));
    fireEvent.change(await screen.findByLabelText("Verification code"),
      {target: {value: "123456"}});
    fireEvent.click(screen.getByRole("button", {name: "Verify phone"}));
    await screen.findByText(/That verification code could not be confirmed/);
    fireEvent.click(screen.getByRole("button", {name: "Change number or resend code"}));
    expect(challenge.clear).toHaveBeenCalledOnce();
    expect(auth.beginPhone).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", {name: "Send verification code"}));
    await waitFor(() => expect(auth.beginPhone).toHaveBeenCalledTimes(2));
    expect(api.start).not.toHaveBeenCalled();
    expect(window.location.hash).toBe("");
  });

  it("shows manual handoff only after explicit completed-session review", async () => {
    const api = renderCompleted(manualSetup);
    fireEvent.click(await screen.findByRole("button", {name: "Open interactive example"}));
    expect(await screen.findByText(/completed this synthetic workflow/u)).toBeTruthy();
    expect(api.getSetup).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", {name: "Review setup options"}));
    expect(await screen.findByText("Meet the Catch team")).toBeTruthy();
    expect(screen.queryByRole("button", {name: "Prepare template draft"})).toBeNull();
    expect(api.prepareSetup).not.toHaveBeenCalled();
  });

  it("preserves claim-required setup only explicitly before the protected claim entry", async () => {
    const api = renderCompleted({...templateSetup, status: "claim_required"});
    fireEvent.click(await screen.findByRole("button", {name: "Open interactive example"}));
    fireEvent.click(await screen.findByRole("button", {name: "Review setup options"}));
    expect(api.preserve).not.toHaveBeenCalled();
    expect(screen.queryByRole("link", {name: "Open organizer claim"})).toBeNull();
    fireEvent.click(await screen.findByRole("button", {name: "Preserve this setup for claim review"}));
    const link = await screen.findByRole("link", {name: "Open organizer claim"});
    expect(link.getAttribute("href")).toBe(`/claim/?continuation=${"c".repeat(64)}`);
    expect(api.preserve).toHaveBeenCalledExactlyOnceWith({sessionId: "session-1", grantToken: grant});
    expect(api.prepareSetup).not.toHaveBeenCalled();
  });

  it("confirms a reviewed template and links to the Host Forms origin", async () => {
    vi.stubEnv("VITE_CONSUMER_APP_URL", brand.web.appOrigin);
    const api = renderCompleted(templateSetup);
    fireEvent.click(await screen.findByRole("button", {name: "Open interactive example"}));
    fireEvent.click(await screen.findByRole("button", {name: "Review setup options"}));
    expect(await screen.findByText(/Real host form/u)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {name: "Prepare template draft"}));
    expect(api.prepareSetup).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", {
      name: "Prepare template draft; finish setup in Forms"}));
    const link = await screen.findByRole("link", {name: "Finish setup in Forms"});
    expect(link.getAttribute("href")).toBe(
      `${brand.web.appOrigin}/#/host/audience/forms/demo_123`);
    expect(api.prepareSetup).toHaveBeenCalledOnce();
  });
});

describe("Host Forms editor link", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("rejects arbitrary paths and unsafe origins", () => {
    vi.stubEnv("VITE_CONSUMER_APP_URL", brand.web.appOrigin);
    expect(salesDemoFormEditorUrl("https://example.com/x")).toBeNull();
    expect(salesDemoFormEditorUrl("/host/audience/forms/demo_123"))
      .toBe(`${brand.web.appOrigin}/#/host/audience/forms/demo_123`);
    vi.stubEnv("VITE_CONSUMER_APP_URL", "https://evil.test/path");
    expect(salesDemoFormEditorUrl("/host/audience/forms/demo_123")).toBeNull();
  });
});
