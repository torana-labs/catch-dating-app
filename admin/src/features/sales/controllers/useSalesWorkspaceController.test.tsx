import {act, cleanup, renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {createQueryHarness} from "../../../shared/test/queryHarness";
import {salesErrorMessage} from "./salesLabels";
import {toLocalDateTimeInput,
  useSalesWorkspaceController} from
  "./useSalesWorkspaceController";

const repository = vi.hoisted(() => ({
  getSalesAccount: vi.fn(),
  createSalesAccount: vi.fn(),
  nominateSalesOrganizer: vi.fn(),
  linkSalesInboundIntent: vi.fn(),
  listSalesCustomFields: vi.fn(),
  createSalesCustomField: vi.fn(),
  setSalesCustomFieldValue: vi.fn(),
  recordSalesActivity: vi.fn(),
  updateSalesAccount: vi.fn(),
  upsertSalesTask: vi.fn(),
  upsertSalesOpportunity: vi.fn(),
  listSalesContacts: vi.fn(),
  reviewSalesEvidenceProposal: vi.fn(),
  addSalesEvidence: vi.fn(),
  setSalesAccountSuppression: vi.fn(),
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
    repository.listSalesCustomFields.mockResolvedValue({rows: []});
    repository.listSalesContacts.mockResolvedValue({rows: [], nextCursor: null});
  });

  it("doesn't read custom fields for a sales associate", async () => {
    const {wrapper} = createQueryHarness();
    renderHook(() => useSalesWorkspaceController({
      area: "hosts", selectedOrganizerId: "host-one", assignedStaffOnly: true,
      onError: vi.fn(), onNotice: vi.fn(),
    }), {wrapper});
    await waitFor(() => expect(repository.getSalesAccount).toHaveBeenCalledWith("host-one"));
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
      if (originalTimezone === undefined) delete process.env.TZ;
      else process.env.TZ = originalTimezone;
    }
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
