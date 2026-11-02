import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {afterEach, beforeAll, beforeEach, expect, it, vi} from "vitest";
import {AdminPendingOperationProvider} from "../../../shared/pendingOperation";
import {SalesSettingsRouteScreen} from "./SalesSettingsRouteScreen";

const repository = vi.hoisted(() => ({
  applySalesImport: vi.fn(), applySalesImportCompensation: vi.fn(), createSalesCustomField: vi.fn(),
  listSalesCustomFields: vi.fn(), listSalesImports: vi.fn(), listSalesImportHosts: vi.fn(),
  previewSalesImport: vi.fn(), previewSalesImportCompensation: vi.fn(), searchCanonicalOrganizers: vi.fn(),
}));
vi.mock("../api/salesRepository", () => repository);

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() { this.open = true; };
  HTMLDialogElement.prototype.close = function close() { this.open = false; };
});
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  repository.listSalesCustomFields.mockResolvedValue({rows: [{fieldId: "sales.ticket_platform_today", label: "Ticket platform today", type: "enum",
    recordType: "account", helpText: "Where they sell", enumOptions: ["Luma", "UPI"], revision: 1}]});
  repository.listSalesImports.mockResolvedValue({nextCursor: null, rows: [{importId: "import-1", sourceId: "october-list", rowCount: 25,
    counts: {created: 20, matched: 2, duplicate: 1, unresolved: 2, rejected: 0}, appliedAt: "2026-10-28T10:00:00.000Z", appliedBy: "owner"}]});
  repository.createSalesCustomField.mockResolvedValue({});
});

const draw = (canCorrect = true, onOpenPrivacy = vi.fn()) => render(
  <QueryClientProvider client={new QueryClient({defaultOptions: {queries: {retry: false}}})}>
    <AdminPendingOperationProvider>
      <SalesSettingsRouteScreen canCorrect={canCorrect} currentUserUid="owner" onError={vi.fn()} onNotice={vi.fn()}
        onOpenPrivacy={onOpenPrivacy} />
    </AdminPendingOperationProvider>
  </QueryClientProvider>,
);

it("lists the fields and imports, with no way to edit a field", async () => {
  draw();
  expect(await screen.findByText("A choice: Luma, UPI · Where they sell")).toBeTruthy();
  expect(await screen.findByText(/^20 hosts added, 2 updated, 3 skipped · 1 batch · applied by you on /u)).toBeTruthy();
  expect(screen.queryByRole("button", {name: /edit/iu})).toBeNull();
});

it("lets only the owner correct an import or find a privacy case", async () => {
  draw(false);
  await screen.findByText("October list");
  expect(screen.queryByRole("button", {name: "Correct"})).toBeNull();
  expect(screen.queryByText("Find a host privacy case")).toBeNull();
  expect(screen.getByRole("button", {name: "Import a CSV"})).toBeTruthy();
});

it("opens a host's privacy page from the search, including a host no longer in Sales", async () => {
  repository.searchCanonicalOrganizers.mockResolvedValue([{organizerId: "org-a", name: "Harbor", cityName: "Goa"}]);
  const onOpenPrivacy = vi.fn();
  draw(true, onOpenPrivacy);
  fireEvent.change(screen.getByLabelText("Host name"), {target: {value: "Harbor"}});
  fireEvent.click(await screen.findByRole("button", {name: /Harbor/u}));
  expect(onOpenPrivacy).toHaveBeenCalledWith("org-a");
});

it("adds a field from the sheet, warning about similar names and refusing a duplicate", async () => {
  draw();
  await screen.findByText("Ticket platform today");
  fireEvent.click(screen.getByRole("button", {name: "Add a field"}));
  fireEvent.change(screen.getByLabelText("Field label"), {target: {value: "Ticket platform today"}});
  expect(screen.getByText(/Similar fields: Ticket platform today/u)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", {name: "Add field"}));
  expect(screen.getByRole("alert").textContent).toMatch(/already exists/u);
  expect(repository.createSalesCustomField).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Field label"), {target: {value: "Who decides"}});
  fireEvent.click(screen.getByRole("button", {name: "Add field"}));
  await waitFor(() => expect(repository.createSalesCustomField).toHaveBeenCalledOnce());
  expect(repository.createSalesCustomField.mock.calls[0]?.[0]).toMatchObject({field: {fieldId: "sales.who_decides",
    label: "Who decides", type: "string", recordType: "account"}});
  await waitFor(() => expect(screen.queryByRole("button", {name: "Add field"})).toBeNull());
});

it("shows skipped rows from the preview and keeps every row reachable", async () => {
  repository.previewSalesImport.mockResolvedValue({previewHash: "a", effectsApplied: false,
    counts: {created: 1, matched: 0, duplicate: 0, unresolved: 1, rejected: 0},
    rows: [{sourceRowId: "row-2", organizerId: "org-1", disposition: "created", reason: "new_private_companion", accountRevision: null},
      {sourceRowId: "row-3", organizerId: null, disposition: "unresolved", reason: "identity_unresolved", accountRevision: null}]});
  draw();
  fireEvent.click(await screen.findByRole("button", {name: "Import a CSV"}));
  const csv = "id,name\norg-1,First\n,Second\n";
  const file = new File([csv], "hosts.csv", {type: "text/csv"});
  Object.defineProperties(file, {text: {value: async () => csv}, arrayBuffer: {value: async () => new TextEncoder().encode(csv).buffer}});
  fireEvent.change(screen.getByLabelText("Choose CSV"), {target: {files: [file]}});
  expect(await screen.findByText("Row 3: no Catch host ID, so it waits for identity review")).toBeTruthy();
  const apply = screen.getByRole("button", {name: "Apply batch 1: add 1, update 0"}) as HTMLButtonElement;
  expect(apply.disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", {name: "See all 2 rows in this batch"}));
  expect(screen.getByText("Row 2: First")).toBeTruthy();
  fireEvent.click(screen.getByRole("checkbox", {name: "I reviewed every row in this batch"}));
  expect(apply.disabled).toBe(false);
});

it("corrects one host from the import, not typed IDs", async () => {
  repository.listSalesImportHosts.mockResolvedValue({rows: [{importId: "import-1", organizerId: "org-1", name: "Harbor"}]});
  repository.previewSalesImportCompensation.mockResolvedValue({importId: "import-1", organizerId: "org-1", mode: "blocked",
    blockers: ["sibling_import_membership"], accountRevision: 1, cohortIdsRemoved: [], previewHash: "a", alreadyCompensated: false});
  draw();
  fireEvent.click(await screen.findByRole("button", {name: "Correct"}));
  expect(screen.queryByLabelText("Applied import ID")).toBeNull();
  const host = await screen.findByLabelText("Host");
  fireEvent.change(host, {target: {value: "import-1|org-1"}});
  expect(await screen.findByText("Another import also touched this host")).toBeTruthy();
  expect(screen.queryByLabelText("Reason for correction")).toBeNull();
  expect((screen.getByRole("button", {name: "Apply correction"}) as HTMLButtonElement).disabled).toBe(true);
});
