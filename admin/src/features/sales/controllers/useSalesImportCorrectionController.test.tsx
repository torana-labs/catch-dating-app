import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {act, renderHook, waitFor} from "@testing-library/react";
import type {ReactNode} from "react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import type {SalesImportCompensationPreview} from "../api/salesTypes";
import {salesImportGroups} from "./salesImports";
import {useSalesImportCorrectionController} from "./useSalesImportCorrectionController";

const repository = vi.hoisted(() => ({listSalesImportHosts: vi.fn(), previewSalesImportCompensation: vi.fn()}));
vi.mock("../api/salesRepository", () => repository);

const wrapper = ({children}: {children: ReactNode}) => (
  <QueryClientProvider client={new QueryClient({defaultOptions: {queries: {retry: false}}})}>{children}</QueryClientProvider>
);
const batch = (importId: string) => ({importId, sourceId: "file-a", rowCount: 1, counts: {created: 1},
  appliedAt: "2026-10-28T10:00:00.000Z", appliedBy: "owner"});
const [group] = salesImportGroups([batch("import-1"), batch("import-2")]);
const plan: SalesImportCompensationPreview = {importId: "import-2", organizerId: "org-2", mode: "remove_cohorts", blockers: [],
  accountRevision: 3, cohortIdsRemoved: ["cohort-1"], previewHash: "a".repeat(64), alreadyCompensated: false};

function setup(applyCorrection = vi.fn(async () => true)) {
  const hook = renderHook(() => useSalesImportCorrectionController({group: group!, applyCorrection}), {wrapper});
  return {...hook, applyCorrection};
}
async function choose(hook: ReturnType<typeof setup>) {
  await waitFor(() => expect(hook.result.current.hosts).toHaveLength(2));
  act(() => hook.result.current.setSelected("import-2|org-2"));
  await waitFor(() => expect(hook.result.current.plan.data).toBeDefined());
}

describe("useSalesImportCorrectionController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repository.listSalesImportHosts.mockImplementation(async (importId: string) => ({rows: [
      {importId, organizerId: importId === "import-1" ? "org-1" : "org-2", name: importId}]}));
    repository.previewSalesImportCompensation.mockResolvedValue(plan);
  });

  it("offers the hosts of every batch and plans for the one chosen", async () => {
    const hook = setup();
    await choose(hook);
    expect(repository.previewSalesImportCompensation).toHaveBeenCalledWith({importId: "import-2", organizerId: "org-2"});
    expect(hook.result.current.canApply).toBe(true);
  });

  it("needs the plan reviewed and a reason, and a changed reason needs reviewing again", async () => {
    const hook = setup();
    await choose(hook);
    await act(async () => { await hook.result.current.apply(); });
    expect(hook.applyCorrection).not.toHaveBeenCalled();
    act(() => hook.result.current.setReason("Wrong list"));
    act(() => hook.result.current.setReviewed(true));
    act(() => hook.result.current.setReason("Wrong list, reviewed"));
    expect(hook.result.current.reviewed).toBe(false);
    act(() => hook.result.current.setReviewed(true));
    await act(async () => { await hook.result.current.apply(); });
    expect(hook.applyCorrection).toHaveBeenCalledWith({importId: "import-2", organizerId: "org-2",
      previewHash: plan.previewHash, reason: "Wrong list, reviewed"});
  });

  it.each([
    ["blocked", {mode: "blocked" as const, blockers: ["sibling_import_membership"]}],
    ["already corrected", {alreadyCompensated: true}],
  ])("offers nothing to apply when %s", async (_label, change) => {
    repository.previewSalesImportCompensation.mockResolvedValue({...plan, ...change});
    const hook = setup();
    await choose(hook);
    expect(hook.result.current.canApply).toBe(false);
    act(() => { hook.result.current.setReason("Reason"); hook.result.current.setReviewed(true); });
    await act(async () => { await hook.result.current.apply(); });
    expect(hook.applyCorrection).not.toHaveBeenCalled();
  });

  it("plans again after a failed apply, which may have committed", async () => {
    const hook = setup(vi.fn(async () => false));
    await choose(hook);
    act(() => hook.result.current.setReason("Reason"));
    act(() => hook.result.current.setReviewed(true));
    await act(async () => { await hook.result.current.apply(); });
    await waitFor(() => expect(repository.previewSalesImportCompensation).toHaveBeenCalledTimes(2));
    expect(hook.result.current.reviewed).toBe(false);
  });
});
