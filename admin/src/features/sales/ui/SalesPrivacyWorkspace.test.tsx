import {act, cleanup, fireEvent, render, screen, waitFor} from
  "@testing-library/react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {afterEach, expect, it, vi} from "vitest";
import {AdminPendingOperationProvider} from
  "../../../shared/pendingOperation";
import type {PrivacyApi, PrivacyCase} from "../api/salesPrivacyTypes";
import {renderSalesPrivacyWorkspace} from "./SalesPrivacyWorkspace";

const mocks = vi.hoisted(() => ({mode: "live" as "live" | "sample",
  search: vi.fn()}));
vi.mock("../../../shared/api/dataMode", () => ({dataMode: () => mocks.mode}));
vi.mock("../api/salesRepository", () => ({
  searchCanonicalOrganizers: mocks.search,
}));
afterEach(() => {cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals();
  mocks.mode = "live";});

function fixture(organizerId?: string, initialCase?: PrivacyCase) {
  const api: PrivacyApi = {
    getCase: vi.fn().mockResolvedValue(initialCase ?? {organizerId: "org-a",
      restricted: false, plan: null, policy: null, completeDeletion: false}),
    reviewPolicy: vi.fn().mockResolvedValue({}),
    restrict: vi.fn().mockResolvedValue({}),
    preview: vi.fn(), reviewPlan: vi.fn(), applyBatch: vi.fn(),
  };
  const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
  render(<QueryClientProvider client={client}>
    <AdminPendingOperationProvider>
      {renderSalesPrivacyWorkspace({actorUid: "owner-a",
        isAdminOwner: true, organizerId,
        organizerName: organizerId ? "Sample Harbor" : undefined, api})}
    </AdminPendingOperationProvider>
  </QueryClientProvider>);
  return api;
}

function restrictedCase(revision = 1): PrivacyCase {
  return {organizerId: "org-a", restricted: true,
    restriction: {status: "restricted", revision: 1,
      restrictedAt: "2026-09-28T10:00:00.000Z", reason: "Owner review"},
    plan: null, completeDeletion: false,
    policy: {revision, policyHash: "a".repeat(64),
      sourceReference: "Earlier policy",
      reviewedAt: "2026-09-28T10:00:00.000Z",
      financeDisposition: "retain_pending_finance_review",
      auditDisposition: "retain_pending_audit_review",
      financeReason: "Reconciliation", auditReason: "Audit"}};
}
function fakeCrypto() {
  let next = 0;
  vi.stubGlobal("crypto", {randomUUID: () => `privacy-request-${++next}`,
    subtle: {digest: vi.fn(async (_algorithm: string, bytes: ArrayBuffer) =>
      new Uint8Array(32).fill(new Uint8Array(bytes)[0]).buffer)}});
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {resolve = done;});
  return {promise, resolve};
}
function fillPolicy() {
  fireEvent.change(screen.getByLabelText("Why finance records remain held for review"),
    {target: {value: "Finance review remains open"}});
  fireEvent.change(screen.getByLabelText("Why audit records remain held for review"),
    {target: {value: "Audit review remains open"}});
}

it("keeps sample privacy mutations unavailable", () => {
  mocks.mode = "sample";
  const api = fixture("org-a");
  expect(screen.getByText(/Sample hosts cannot be restricted/u)).toBeTruthy();
  expect(api.getCase).not.toHaveBeenCalled();
});

it("finds a canonical organizer after its Sales account is absent", async () => {
  mocks.search.mockResolvedValue([{organizerId: "org-a", name: "Sample Harbor",
    cityName: "Example City"}]);
  const api = fixture();
  fireEvent.change(screen.getByLabelText("Host name"),
    {target: {value: "Sample"}});
  fireEvent.click(screen.getByRole("button", {name: "Search hosts"}));
  await waitFor(() => expect(screen.getByRole("button",
    {name: /Sample Harbor/u})).toBeTruthy());
  fireEvent.click(screen.getByRole("button", {name: /Sample Harbor/u}));
  await waitFor(() => expect(api.getCase).toHaveBeenCalledWith("org-a"));
  expect(screen.getByText(/does not delete product organizers/u)).toBeTruthy();
});

it("requires exact host-name confirmation before restriction", async () => {
  const api = fixture("org-a");
  await waitFor(() => expect(screen.getByLabelText("Reason for restriction"))
    .toBeTruthy());
  fireEvent.change(screen.getByLabelText("Reason for restriction"),
    {target: {value: "Approved internal hold"}});
  const submit = screen.getByRole("button",
    {name: "Restrict private Sales processing"});
  expect((submit as HTMLButtonElement).disabled).toBe(true);
  fireEvent.change(screen.getByLabelText(/Type “Sample Harbor”/u),
    {target: {value: "Sample Harbor"}});
  expect((submit as HTMLButtonElement).disabled).toBe(false);
  fireEvent.click(submit);
  await waitFor(() => expect(api.restrict).toHaveBeenCalledWith(
    expect.objectContaining({organizerId: "org-a",
      reason: "Approved internal hold"})));
});

it("uses the latest selected policy file when reads finish out of order", async () => {
  fakeCrypto();
  const api = fixture("org-a", restrictedCase());
  await waitFor(() => expect(screen.getByLabelText(
    "Choose reviewed policy file")).toBeTruthy());
  const first = new File(["first"], "first.txt");
  const second = new File(["second"], "second.txt");
  const firstRead = deferred<ArrayBuffer>();
  const secondRead = deferred<ArrayBuffer>();
  Object.defineProperty(first, "arrayBuffer", {value: () => firstRead.promise});
  Object.defineProperty(second, "arrayBuffer", {value: () => secondRead.promise});
  const picker = screen.getByLabelText("Choose reviewed policy file");
  fireEvent.change(picker, {target: {files: [first]}});
  fireEvent.change(picker, {target: {files: [second]}});
  await act(async () => {secondRead.resolve(Uint8Array.of(2).buffer);
    await secondRead.promise;});
  await waitFor(() => expect(screen.getByText(/second.txt · SHA-256/u))
    .toBeTruthy());
  await act(async () => {firstRead.resolve(Uint8Array.of(1).buffer);
    await firstRead.promise;});
  expect(screen.queryByText(/first.txt · SHA-256/u)).toBeNull();
  expect((screen.getByLabelText("Reviewed policy reference") as
    HTMLInputElement).value).toBe("second.txt");
  fillPolicy();
  fireEvent.click(screen.getByRole("button",
    {name: "Save reviewed retention decision"}));
  await waitFor(() => expect(api.reviewPolicy).toHaveBeenCalledWith(
    expect.objectContaining({sourceReference: "second.txt",
      sourceHash: "02".repeat(32)})));
});

it("clears a confirmed policy save after an uncertain retry", async () => {
  fakeCrypto();
  const api = fixture("org-a", restrictedCase());
  vi.mocked(api.reviewPolicy).mockRejectedValueOnce(new Error("network lost"));
  await waitFor(() => expect(screen.getByLabelText(
    "Choose reviewed policy file")).toBeTruthy());
  const file = new File(["new"], "reviewed.txt");
  Object.defineProperty(file, "arrayBuffer", {value: async () =>
    Uint8Array.of(4).buffer});
  fireEvent.change(screen.getByLabelText("Choose reviewed policy file"),
    {target: {files: [file]}});
  await waitFor(() => expect(screen.getByText(/reviewed.txt · SHA-256/u))
    .toBeTruthy());
  fillPolicy();
  fireEvent.click(screen.getByRole("button",
    {name: "Save reviewed retention decision"}));
  await waitFor(() => expect(screen.getByRole("button",
    {name: "Retry the same request"})).toBeTruthy());
  fireEvent.click(screen.getByRole("button", {name: "Retry the same request"}));
  await waitFor(() => expect((screen.getByLabelText(
    "Reviewed policy reference") as HTMLInputElement).value).toBe(""));
  expect(screen.queryByText(/reviewed.txt · SHA-256/u)).toBeNull();
  const calls = vi.mocked(api.reviewPolicy).mock.calls;
  expect(calls).toHaveLength(2);
  expect(calls[1][0]).toEqual(calls[0][0]);
});

it("keeps a conflicted draft until the owner explicitly reviews the new revision", async () => {
  fakeCrypto();
  const api = fixture("org-a", restrictedCase(1));
  vi.mocked(api.reviewPolicy).mockRejectedValueOnce(Object.assign(
    new Error("Policy changed"), {code: "functions/aborted"}));
  await waitFor(() => expect(screen.getByLabelText(
    "Choose reviewed policy file")).toBeTruthy());
  const file = new File(["new"], "reviewed.txt");
  Object.defineProperty(file, "arrayBuffer", {value: async () =>
    Uint8Array.of(5).buffer});
  fireEvent.change(screen.getByLabelText("Choose reviewed policy file"),
    {target: {files: [file]}});
  await waitFor(() => expect(screen.getByText(/reviewed.txt · SHA-256/u))
    .toBeTruthy());
  fillPolicy();
  vi.mocked(api.getCase).mockResolvedValue(restrictedCase(2));
  fireEvent.click(screen.getByRole("button",
    {name: "Save reviewed retention decision"}));
  await waitFor(() => expect(screen.getByText(/Your draft is still here/u))
    .toBeTruthy());
  expect((screen.getByLabelText("Reviewed policy reference") as
    HTMLInputElement).value).toBe("reviewed.txt");
  const saveButton = screen.getByRole("button",
    {name: "Save reviewed retention decision"}) as HTMLButtonElement;
  expect(saveButton.disabled).toBe(true);
  await waitFor(() => expect((screen.getByRole("button",
    {name: "Discard draft and review current policy"}) as HTMLButtonElement)
    .disabled).toBe(false));
  fireEvent.click(screen.getByRole("button",
    {name: "Discard draft and review current policy"}));
  await waitFor(() => expect((screen.getByLabelText(
    "Reviewed policy reference") as HTMLInputElement).value).toBe(""));
  fireEvent.change(screen.getByLabelText("Reviewed policy reference"),
    {target: {value: "New reviewed policy"}});
  fireEvent.change(screen.getByLabelText("Choose reviewed policy file"),
    {target: {files: [file]}});
  await waitFor(() => expect(screen.getByText(/reviewed.txt · SHA-256/u))
    .toBeTruthy());
  fillPolicy();
  fireEvent.click(screen.getByRole("button",
    {name: "Save reviewed retention decision"}));
  await waitFor(() => expect(api.reviewPolicy).toHaveBeenLastCalledWith(
    expect.objectContaining({expectedRevision: 2,
      sourceReference: "New reviewed policy"})));
});
