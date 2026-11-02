import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {act, renderHook, waitFor} from "@testing-library/react";
import type {ReactNode} from "react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {useSalesSettingsController} from "./useSalesSettingsController";

const repository = vi.hoisted(() => ({
  applySalesImport: vi.fn(), applySalesImportCompensation: vi.fn(), createSalesCustomField: vi.fn(),
  listSalesCustomFields: vi.fn(), listSalesImports: vi.fn(), searchCanonicalOrganizers: vi.fn(),
}));
vi.mock("../api/salesRepository", () => repository);

const wrapper = ({children}: {children: ReactNode}) => (
  <QueryClientProvider client={new QueryClient({defaultOptions: {queries: {retry: false}}})}>{children}</QueryClientProvider>
);
const packet = {sourceId: "file-a", contentHash: "a".repeat(64), mappingVersion: "csv-v1",
  rows: [{sourceRowId: "row-2", organizerId: null, name: "Host", researchStatus: "needs_research" as const}]};
const batch = {importId: "import-1", sourceId: "file-a", rowCount: 1, counts: {created: 1},
  appliedAt: "2026-10-28T10:00:00.000Z", appliedBy: "owner"};

describe("useSalesSettingsController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repository.listSalesCustomFields.mockResolvedValue({rows: []});
    repository.listSalesImports.mockResolvedValue({rows: [batch], nextCursor: null});
    repository.searchCanonicalOrganizers.mockResolvedValue([]);
  });

  it("groups the applied batches into imports", async () => {
    const {result} = renderHook(() => useSalesSettingsController({canCorrect: true, onError: vi.fn(), onNotice: vi.fn()}), {wrapper});
    await waitFor(() => expect(result.current.groups).toHaveLength(1));
    expect(result.current.groups[0]).toMatchObject({sourceId: "file-a", added: 1});
  });

  it("reports a refused batch and keeps the same request ID for the retry", async () => {
    const onError = vi.fn();
    const onNotice = vi.fn();
    repository.applySalesImport.mockRejectedValue(new Error("Import changed since the reviewed preview."));
    const {result} = renderHook(() => useSalesSettingsController({canCorrect: true, onError, onNotice}), {wrapper});
    let saved = true;
    await act(async () => { saved = await result.current.applyImport(packet, "reviewed"); });
    expect(saved).toBe(false);
    expect(onError).toHaveBeenCalledWith("Import changed since the reviewed preview.");
    expect(onNotice).not.toHaveBeenCalled();
    await act(async () => { await result.current.applyImport(packet, "reviewed"); });
    const ids = repository.applySalesImport.mock.calls.map((call) => (call[0] as {requestId: string}).requestId);
    expect(ids[0]).toBe(ids[1]);
  });

  it("only searches privacy cases for the owner, and only from two letters", async () => {
    const owner = renderHook(() => useSalesSettingsController({canCorrect: true, onError: vi.fn(), onNotice: vi.fn()}), {wrapper});
    act(() => owner.result.current.setPrivacyText("H"));
    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(repository.searchCanonicalOrganizers).not.toHaveBeenCalled();
    act(() => owner.result.current.setPrivacyText("Harbor"));
    await waitFor(() => expect(repository.searchCanonicalOrganizers).toHaveBeenCalledWith("Harbor"));
    vi.clearAllMocks();
    const admin = renderHook(() => useSalesSettingsController({canCorrect: false, onError: vi.fn(), onNotice: vi.fn()}), {wrapper});
    act(() => admin.result.current.setPrivacyText("Harbor"));
    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(repository.searchCanonicalOrganizers).not.toHaveBeenCalled();
  });
});
