import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {act, renderHook, waitFor} from "@testing-library/react";
import type {ReactNode} from "react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import type {SalesImportPreview} from "../api/salesTypes";
import {useSalesImportSheetController} from "./useSalesImportSheetController";

const repository = vi.hoisted(() => ({previewSalesImport: vi.fn()}));
vi.mock("../api/salesRepository", () => repository);

const wrapper = ({children}: {children: ReactNode}) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);
const csvFile = (csv: string, name = "november-hosts.csv", size?: number) => {
  const file = new File([csv], name, {type: "text/csv"});
  Object.defineProperties(file, {text: {value: async () => csv},
    arrayBuffer: {value: async () => new TextEncoder().encode(csv).buffer},
    ...(size ? {size: {value: size}} : {})});
  return file;
};
const preview = (hash: string): SalesImportPreview => ({previewHash: hash, rows: [], effectsApplied: false,
  counts: {created: 1, matched: 0, duplicate: 0, unresolved: 0, rejected: 0}});
const manyRows = `name,status\n${Array.from({length: 30}, (_, index) => `Host ${index},Needs research`).join("\n")}\n`;

function setup(applyImport = vi.fn(async () => true)) {
  const hook = renderHook(() => useSalesImportSheetController({applyImport}), {wrapper});
  return {...hook, applyImport};
}
const load = async (hook: ReturnType<typeof setup>, csv = manyRows) => {
  await act(async () => { await hook.result.current.chooseFile(csvFile(csv)); });
};

describe("useSalesImportSheetController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repository.previewSalesImport.mockResolvedValue(preview("a"));
  });

  it("reads a file, names the import after it and previews the first batch", async () => {
    const hook = setup();
    await load(hook);
    expect(hook.result.current).toMatchObject({fileName: "november-hosts.csv", name: "November hosts", rowCount: 30, batchCount: 2});
    await waitFor(() => expect(repository.previewSalesImport).toHaveBeenCalledOnce());
    const packet = repository.previewSalesImport.mock.calls[0]?.[0] as {sourceId: string; rows: unknown[]};
    expect(packet.sourceId).toBe("november-hosts");
    expect(packet.rows).toHaveLength(25);
  });

  it("refuses a file over 1 MB", async () => {
    const hook = setup();
    await act(async () => { await hook.result.current.chooseFile(csvFile("name\nA\n", "big.csv", 1024 * 1024 + 1)); });
    expect(hook.result.current.fileError).toMatch(/at most 1 MB/u);
    expect(repository.previewSalesImport).not.toHaveBeenCalled();
  });

  it("drops a late preview when the choices change, and asks for the review again", async () => {
    const hook = setup();
    await load(hook);
    await waitFor(() => expect(hook.result.current.preview.data?.previewHash).toBe("a"));
    act(() => hook.result.current.setReviewed(true));
    let finish!: (value: SalesImportPreview) => void;
    repository.previewSalesImport.mockReturnValueOnce(new Promise((done) => { finish = done; }));
    repository.previewSalesImport.mockResolvedValueOnce(preview("c"));
    act(() => hook.result.current.setName("Changed"));
    await waitFor(() => expect(hook.result.current.preview.data).toBeUndefined());
    expect(hook.result.current.reviewed).toBe(false);
    act(() => hook.result.current.setName("Changed again"));
    await waitFor(() => expect(hook.result.current.preview.data?.previewHash).toBe("c"));
    await act(async () => { finish(preview("b")); await Promise.resolve(); });
    expect(hook.result.current.preview.data?.previewHash).toBe("c");
  });

  it("only applies a reviewed batch, then moves to the next", async () => {
    const hook = setup();
    await load(hook);
    await waitFor(() => expect(hook.result.current.preview.data).toBeDefined());
    await act(async () => { await hook.result.current.apply(); });
    expect(hook.applyImport).not.toHaveBeenCalled();
    act(() => hook.result.current.setReviewed(true));
    await act(async () => { await hook.result.current.apply(); });
    expect(hook.applyImport).toHaveBeenCalledOnce();
    expect(hook.result.current).toMatchObject({batch: 1, applied: [0], hasApplied: true, reviewed: false});
    act(() => hook.result.current.setBatch(0));
    expect(hook.result.current.batchApplied).toBe(true);
    expect(hook.result.current.packet).toBeNull();
  });

  it("reads the batch again after a failed apply, which may have committed", async () => {
    const hook = setup(vi.fn(async () => false));
    await load(hook);
    await waitFor(() => expect(hook.result.current.preview.data).toBeDefined());
    act(() => hook.result.current.setReviewed(true));
    await act(async () => { await hook.result.current.apply(); });
    expect(hook.result.current).toMatchObject({applied: [], reviewed: false});
    await waitFor(() => expect(repository.previewSalesImport).toHaveBeenCalledTimes(2));
  });

  it("stops at a blank host name and at a name with nothing to store", async () => {
    const hook = setup();
    await load(hook, "name,notes\n,No name here\n");
    expect(hook.result.current.packetError).toMatch(/host name is blank/u);
    expect(repository.previewSalesImport).not.toHaveBeenCalled();
    await load(hook);
    act(() => hook.result.current.setName("!!!"));
    expect(hook.result.current.packetError).toBe("Give this import a name.");
  });
});
