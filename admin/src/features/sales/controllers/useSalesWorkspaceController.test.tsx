import {act, cleanup, renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {createQueryHarness} from "../../../shared/test/queryHarness";
import {salesErrorMessage, toLocalDateTimeInput,
  useSalesWorkspaceController} from
  "./useSalesWorkspaceController";

const repository = vi.hoisted(() => ({
  getSalesAccount: vi.fn(),
  createSalesAccount: vi.fn(),
  nominateSalesOrganizer: vi.fn(),
  listSalesAccounts: vi.fn(),
  listSalesTasks: vi.fn(),
  listSalesOpportunities: vi.fn(),
  listSalesInboundIntents: vi.fn(),
  linkSalesInboundIntent: vi.fn(),
  listSalesCustomFields: vi.fn(),
  createSalesCustomField: vi.fn(),
  setSalesCustomFieldValue: vi.fn(),
  searchCanonicalOrganizers: vi.fn(),
  recordSalesActivity: vi.fn(),
  updateSalesAccount: vi.fn(),
  upsertSalesTask: vi.fn(),
  upsertSalesOpportunity: vi.fn(),
  listSalesContacts: vi.fn(),
  listSalesEvidence: vi.fn(),
  listSalesEvidenceProposals: vi.fn(),
  reviewSalesEvidenceProposal: vi.fn(),
  upsertSalesContact: vi.fn(),
  addSalesEvidence: vi.fn(),
  setSalesAccountSuppression: vi.fn(),
  setSalesContactability: vi.fn(),
  previewSalesImport: vi.fn(),
  applySalesImport: vi.fn(),
  previewSalesImportCompensation: vi.fn(),
  applySalesImportCompensation: vi.fn(),
}));
vi.mock("../api/salesRepository", () => repository);

const firstPage = {
  rows: [{organizerId: "host-one", name: "Sample Host", city: "Mumbai",
    market: "India", eventTypes: ["social"], researchStatus: "needs_research",
    fitLabel: null, stage: null, assignedOwnerUid: null, nextAction: null}],
  nextCursor: "opaque-page-two",
};

describe("useSalesWorkspaceController", () => {
  afterEach(cleanup);

  beforeEach(() => {
    Object.values(repository).forEach((mock) => mock.mockReset());
    repository.listSalesAccounts.mockResolvedValue(firstPage);
    repository.listSalesTasks.mockResolvedValue({rows: [], nextCursor: null});
    repository.listSalesOpportunities.mockResolvedValue({rows: [], nextCursor: null});
    repository.listSalesInboundIntents.mockResolvedValue({rows: [], nextCursor: null});
    repository.listSalesCustomFields.mockResolvedValue({rows: []});
    repository.searchCanonicalOrganizers.mockResolvedValue([]);
    repository.listSalesContacts.mockResolvedValue({rows: [], nextCursor: null});
    repository.listSalesEvidence.mockResolvedValue({rows: [], nextCursor: null});
    repository.listSalesEvidenceProposals.mockResolvedValue({rows: [], nextCursor: null});
  });

  it("passes filters and the opaque cursor to the bounded server query", async () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useSalesWorkspaceController({
      area: "hosts", selectedOrganizerId: null,
      onError: vi.fn(), onNotice: vi.fn(),
    }), {wrapper});
    await waitFor(() => expect(result.current.accounts.data?.rows).toHaveLength(1));
    act(() => result.current.setAccountFilters({researchStatus: "needs_research"}));
    await waitFor(() => expect(repository.listSalesAccounts).toHaveBeenCalledWith({
      limit: 25, cursor: undefined, query: undefined, ownerUid: undefined,
      researchStatus: "needs_research",
    }));
    await waitFor(() => expect(result.current.accounts.data?.nextCursor)
      .toBe("opaque-page-two"));
    act(() => result.current.nextPage());
    await waitFor(() => expect(repository.listSalesAccounts).toHaveBeenCalledWith({
      limit: 25, cursor: "opaque-page-two", query: undefined,
      ownerUid: undefined, researchStatus: "needs_research",
    }));
  });

  it("does not start global identity, inbound, canonical, or field queries for assigned staff", async () => {
    const hostsHarness = createQueryHarness();
    const hosts = renderHook(() => useSalesWorkspaceController({
      area: "hosts", selectedOrganizerId: null, assignedStaffOnly: true,
      onError: vi.fn(), onNotice: vi.fn(),
    }), {wrapper: hostsHarness.wrapper});
    await waitFor(() => expect(hosts.result.current.accounts.data?.rows)
      .toHaveLength(1));
    act(() => hosts.result.current.setCanonicalSearch("Sample"));
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 300)));
    expect(repository.searchCanonicalOrganizers).not.toHaveBeenCalled();
    hosts.unmount();

    const researchHarness = createQueryHarness();
    const research = renderHook(() => useSalesWorkspaceController({
      area: "research", selectedOrganizerId: null, assignedStaffOnly: true,
      onError: vi.fn(), onNotice: vi.fn(),
    }), {wrapper: researchHarness.wrapper});
    act(() => research.result.current.setIdentitySearch("Sample"));
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 300)));
    expect(repository.listSalesInboundIntents).not.toHaveBeenCalled();
    expect(repository.listSalesAccounts).toHaveBeenCalledTimes(1);
    research.unmount();

    repository.getSalesAccount.mockResolvedValue({
      account: {organizerId: "host-one"}, organizerSummary: {},
      activities: [], opportunities: [], tasks: [],
    });
    const detailHarness = createQueryHarness();
    const detail = renderHook(() => useSalesWorkspaceController({
      area: "hosts", selectedOrganizerId: "host-one", assignedStaffOnly: true,
      onError: vi.fn(), onNotice: vi.fn(),
    }), {wrapper: detailHarness.wrapper});
    await waitFor(() => expect(detail.result.current.detail.isSuccess).toBe(true));
    expect(repository.listSalesCustomFields).not.toHaveBeenCalled();
  });

  it("reuses the request ID after an uncertain failure and reports no success", async () => {
    const {wrapper} = createQueryHarness();
    const onError = vi.fn();
    const onNotice = vi.fn();
    repository.updateSalesAccount.mockRejectedValueOnce(new Error("network unavailable"))
      .mockResolvedValueOnce({account: {}, receipt: {requestId: "saved", revision: 2}});
    const {result} = renderHook(() => useSalesWorkspaceController({
      area: "hosts", selectedOrganizerId: null, onError, onNotice,
    }), {wrapper});
    const input = {organizerId: "host-one", expectedRevision: 1,
      patch: {nextAction: "Follow up"}};
    let first = true;
    await act(async () => { first = await result.current.saveAccount(input); });
    expect(first).toBe(false);
    expect(onNotice).not.toHaveBeenCalledWith("Host research saved.");
    expect(onError).toHaveBeenCalledWith("network unavailable");
    let second = false;
    await act(async () => { second = await result.current.saveAccount(input); });
    expect(second).toBe(true);
    const firstRequest = repository.updateSalesAccount.mock.calls[0][0].requestId;
    const secondRequest = repository.updateSalesAccount.mock.calls[1][0].requestId;
    expect(secondRequest).toBe(firstRequest);
    expect(onNotice).toHaveBeenCalledWith("Host research saved.");
  });

  it("retries a nomination under the same request ID so the server replays it", async () => {
    const {wrapper} = createQueryHarness();
    const onNotice = vi.fn();
    repository.nominateSalesOrganizer.mockRejectedValueOnce(new Error("deadline-exceeded"))
      .mockResolvedValueOnce({requestId: `nom-${"a".repeat(40)}`, created: false,
        status: "queued"});
    const {result} = renderHook(() => useSalesWorkspaceController({
      area: "hosts", selectedOrganizerId: null, onError: vi.fn(), onNotice,
    }), {wrapper});
    const input = {name: "The Bhag", market: "Bengaluru",
      urls: ["https://lu.ma/thebhag"], notes: null, categories: []};
    await act(async () => { await result.current.nominateOrganizer(input); });
    await act(async () => { await result.current.nominateOrganizer(input); });
    const [first, second] = repository.nominateSalesOrganizer.mock.calls
      .map(([request]) => request.requestId);
    expect(second).toBe(first);
    expect(onNotice).toHaveBeenCalledWith(
      "Nomination queued. Its listing appears in Organizer Intake for review.");
  });

  it("explains revision conflicts without losing the operator's edit", () => {
    expect(salesErrorMessage(new Error("ABORTED: revision mismatch")))
      .toContain("Compare the latest details");
    expect(salesErrorMessage(new Error("failed-precondition: Suppressed host")))
      .toContain("Suppressed host");
  });

  it("formats activity time in the employee's local timezone", () => {
    const originalTimezone = process.env.TZ;
    try {
      process.env.TZ = "Asia/Kolkata";
      expect(toLocalDateTimeInput(new Date("2026-09-28T00:00:00.000Z")))
        .toBe("2026-09-28T05:30");
    } finally {
      process.env.TZ = originalTimezone;
    }
  });

  it("pages contacts and evidence by organizer without an all-record scan", async () => {
    const {wrapper} = createQueryHarness();
    repository.getSalesAccount.mockResolvedValue({account: {organizerId: "host-one"},
      organizerSummary: {}, activities: [], opportunities: [], tasks: []});
    repository.listSalesContacts.mockResolvedValueOnce({rows: [],
      nextCursor: "contact-page-two"}).mockResolvedValue({rows: [], nextCursor: null});
    repository.listSalesEvidence.mockResolvedValueOnce({rows: [],
      nextCursor: "evidence-page-two"}).mockResolvedValue({rows: [], nextCursor: null});
    const {result} = renderHook(() => useSalesWorkspaceController({
      area: "hosts", selectedOrganizerId: "host-one",
      onError: vi.fn(), onNotice: vi.fn(),
    }), {wrapper});
    await waitFor(() => expect(result.current.contacts.data?.nextCursor)
      .toBe("contact-page-two"));
    await waitFor(() => expect(result.current.evidence.data?.nextCursor)
      .toBe("evidence-page-two"));
    act(() => {result.current.nextContactPage(); result.current.nextEvidencePage();});
    await waitFor(() => expect(repository.listSalesContacts)
      .toHaveBeenCalledWith("host-one", "contact-page-two"));
    await waitFor(() => expect(repository.listSalesEvidence)
      .toHaveBeenCalledWith("host-one", "evidence-page-two"));
  });

  it("does not report an import apply success when the server rejects the reviewed hash", async () => {
    const {wrapper} = createQueryHarness();
    const onError = vi.fn();
    const onNotice = vi.fn();
    repository.applySalesImport.mockRejectedValue(new Error(
      "Import changed since the reviewed preview."));
    const {result} = renderHook(() => useSalesWorkspaceController({
      area: "settings", selectedOrganizerId: null, onError, onNotice,
    }), {wrapper});
    const packet = {sourceId: "file-a", contentHash: "a".repeat(64),
      mappingVersion: "csv-v1", rows: [{sourceRowId: "row-2", organizerId: null,
        name: "Host", researchStatus: "needs_research" as const}]};
    let saved = true;
    await act(async () => {saved = await result.current.applyImport(packet, "reviewed");});
    expect(saved).toBe(false);
    expect(onError).toHaveBeenCalledWith("Import changed since the reviewed preview.");
    expect(onNotice).not.toHaveBeenCalledWith("Reviewed import applied.");
  });
});
