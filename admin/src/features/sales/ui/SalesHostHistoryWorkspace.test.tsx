import {act, cleanup, fireEvent, render, screen, waitFor} from
  "@testing-library/react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {afterEach, expect, it, vi} from "vitest";
import {SalesHostHistoryWorkspace} from "./SalesHostHistoryWorkspace";

const {api, mode} = vi.hoisted(() => ({
  mode: {value: "live"},
  api: {listRecords: vi.fn(), listRows: vi.fn()},
}));
vi.mock("../../../shared/api/dataMode", () => ({dataMode: () => mode.value}));
vi.mock("../api/salesHistoryRepository", () => ({salesHistoryApi: api}));
afterEach(() => {
  cleanup(); api.listRecords.mockReset(); api.listRows.mockReset();
  mode.value = "live";
});

function mount(organizerId = "org-1", finished: Array<{taskId: string; title: string; subtitle: string}> = []) {
  const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
  const view = (id: string) => <QueryClientProvider client={client}>
    <SalesHostHistoryWorkspace actorUid="actor-1" canSeeImported finished={finished} organizerId={id} />
  </QueryClientProvider>;
  const rendered = render(view(organizerId));
  return {rerender: (id: string) => rendered.rerender(view(id))};
}
function record(organizerId: string) {
  return {schemaVersion: 1, classification: "sales_private",
    recordId: `record-${organizerId}`, organizerId,
    sourceId: "source-a", sourceRowId: "row-1", importId: "import-a",
    sourceContentHash: "a".repeat(64), promotionVersion: "history-v1",
    kind: "activity", sourceColumn: "First touch",
    sourceValue: `Historical ${organizerId}`,
    relativeChronology: "first_touch", dateCertainty: "unknown",
    occurredAt: null, dateSourceColumn: null, dateSourceValue: null,
    contentHash: "b".repeat(64), recordedAt: "2026-09-28T00:00:00Z",
    recordedBy: "reviewer", providerConfirmed: false,
    currentFitAuthority: false, contactAuthority: false,
    sendAuthority: false};
}
function row(organizerId: string, disposition = "promoted") {
  return {schemaVersion: 1, classification: "sales_private",
    rowId: `row-${organizerId}`, organizerId,
    sourceId: "source-a", sourceRowId: "row-1", importId: "import-a",
    sourceContentHash: "a".repeat(64), promotionVersion: "history-v1",
    disposition, reason: "Reviewed source", recordIds: [],
    reviewHash: "c".repeat(64), reviewedAt: "2026-09-28T00:00:00Z",
    reviewedBy: "reviewer"};
}

it("labels unknown historical dates and page-only dispositions", async () => {
  api.listRecords.mockResolvedValue({records: [record("org-1")],
    nextCursor: null});
  api.listRows.mockResolvedValue({rows: [row("org-1"),
    {...row("org-1", "review_needed"), rowId: "pending-1"}],
  nextCursor: null});
  mount();
  await screen.findByText(/Historical org-1/u);
  expect(screen.getByText(/Source date unknown/u)).toBeTruthy();
  expect(screen.getByText(/This page: 1 promoted, 0 skipped, 1 need review/u))
    .toBeTruthy();
  expect(screen.getByText(/These count this page, not the whole source/u))
    .toBeTruthy();
  expect(screen.getByText(/provider delivery unconfirmed/u)).toBeTruthy();
});

it("host change discards a late old-host page", async () => {
  let resolveOld!: (value: unknown) => void;
  api.listRecords.mockImplementation(({organizerId}: {organizerId: string}) =>
    organizerId === "org-1" ? new Promise((resolve) => {
      resolveOld = resolve;
    }) : Promise.resolve({records: [record("org-2")], nextCursor: null}));
  api.listRows.mockImplementation(({organizerId}: {organizerId: string}) =>
    Promise.resolve({rows: [row(organizerId)], nextCursor: null}));
  const view = mount();
  await waitFor(() => expect(api.listRecords).toHaveBeenCalled());
  view.rerender("org-2");
  await screen.findByText(/Historical org-2/u);
  await act(async () => resolveOld({records: [record("org-1")],
    nextCursor: null}));
  expect(screen.queryByText(/Historical org-1/u)).toBeNull();
});

it("paginates only the selected host and sample mode makes no read", async () => {
  api.listRecords.mockImplementation(({cursor}: {cursor?: string}) =>
    Promise.resolve({records: [record("org-1")],
      nextCursor: cursor ? null : "record-cursor"}));
  api.listRows.mockResolvedValue({rows: [row("org-1")], nextCursor: null});
  mount();
  await screen.findByText(/Historical org-1/u);
  fireEvent.click(screen.getByRole("button", {name: "Next records"}));
  await waitFor(() => expect(api.listRecords).toHaveBeenCalledWith({
    organizerId: "org-1", cursor: "record-cursor", limit: 25,
  }));
  cleanup();
  api.listRecords.mockClear(); api.listRows.mockClear();
  mode.value = "sample";
  mount();
  expect(screen.getByText(/Sample hosts have no imported history/u))
    .toBeTruthy();
  expect(api.listRecords).not.toHaveBeenCalled();
  expect(api.listRows).not.toHaveBeenCalled();
});

it("shows finished next steps, and no imported history to someone who can't see it", () => {
  render(<QueryClientProvider client={new QueryClient()}>
    <SalesHostHistoryWorkspace actorUid="actor-1" canSeeImported={false} organizerId="org-1"
      finished={[{taskId: "t1", title: "Call Kavya", subtitle: "Follow up · completed · 2 Nov"}]} />
  </QueryClientProvider>);
  expect(screen.getByText("Call Kavya")).toBeTruthy();
  expect(screen.queryByText("Imported source history")).toBeNull();
  expect(api.listRecords).not.toHaveBeenCalled();
});
