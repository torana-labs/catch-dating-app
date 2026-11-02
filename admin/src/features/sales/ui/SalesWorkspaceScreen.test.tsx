import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, onTestFinished, vi} from "vitest";
import {AdminFeedbackProvider} from "../../../shared/feedback/AdminFeedbackContext";
import {SalesWorkspaceScreen} from "./SalesWorkspaceScreen";

const controllerMock = vi.hoisted(() => ({use: vi.fn()}));
const childMocks = vi.hoisted(() => ({
  history: vi.fn(), privacy: vi.fn(), records: vi.fn(),
  settings: vi.fn(),
}));

vi.mock("../controllers/useSalesWorkspaceController", () => ({
  accountFormValues: (account: {
    researchStatus: string; assignedOwnerUid?: string | null;
    summary?: string | null; nextAction?: string | null;
  }) => ({
    researchStatus: account.researchStatus,
    assignedOwnerUid: account.assignedOwnerUid ?? "",
    summary: account.summary ?? "",
    nextAction: account.nextAction ?? "",
  }),
  researchStatusOptions: [
    {value: "needs_research", label: "Needs research"},
    {value: "ready_for_review", label: "Ready for review"},
  ],
  toLocalDateTimeInput: () => "2026-10-07T09:30",
  useSalesWorkspaceController: controllerMock.use,
}));
vi.mock("./SalesImportedHistoryPanel", () => ({
  renderSalesImportedHistory: childMocks.history,
}));
vi.mock("./SalesPrivacyWorkspace", () => ({
  renderSalesPrivacyWorkspace: childMocks.privacy,
}));
vi.mock("./SalesRecordsPanels", () => ({
  SalesRecordsWorkspace: childMocks.records,
}));
vi.mock("./SalesSettingsPanel", () => ({
  renderSalesSettingsWorkspace: childMocks.settings,
}));

function query<T>(data: T) {
  return {data, error: null, isError: false, isPending: false, isSuccess: true,
    refetch: vi.fn()};
}

function controller() {
  const account = {organizerId: "host-one", revision: 4,
    researchStatus: "ready_for_review", assignedOwnerUid: "staff-one",
    summary: "Existing summary", nextAction: "Existing action"};
  const detail = {account, organizerSummary: {name: "Assigned Host", city: "Mumbai",
    marketLabel: "India", appVisibility: "private", claimStatus: "unclaimed"},
  activities: [], opportunities: [], tasks: [], customValues: []};
  return {
    customFields: query({rows: []}), contacts: query({rows: [], nextCursor: null}),
    detail: query(detail),
    isSaving: false,
    saveAccount: vi.fn(async () => true),
    logActivity: vi.fn(async () => true), saveOpportunity: vi.fn(), saveTask: vi.fn(),
    saveCustomValue: vi.fn(),
  };
}

function renderWorkspace(next: Partial<Parameters<typeof SalesWorkspaceScreen>[0]> = {}) {
  const props = {
    area: "hosts" as const, currentUserUid: "staff-one", isAdminOwner: false,
    assignedStaffOnly: true, selectedOrganizerId: null,
    onGoToToday: vi.fn(), onBackToHosts: vi.fn(), onOpenOrganizer: vi.fn(), ...next,
  };
  return {props, ...render(
    <AdminFeedbackProvider onError={vi.fn()} onNotice={vi.fn()}>
      <SalesWorkspaceScreen {...props} />
    </AdminFeedbackProvider>
  )};
}

describe("SalesWorkspaceScreen assigned staff access", () => {
  let current: ReturnType<typeof controller>;

  beforeEach(() => {
    current = controller();
    controllerMock.use.mockReturnValue(current);
  });
  afterEach(cleanup);

  it("fails closed on a direct route to a global Sales area", () => {
    const onGoToToday = vi.fn();
    renderWorkspace({area: "settings", onGoToToday});

    expect(screen.getByRole("heading", {name: "Assigned Sales access"})).toBeTruthy();
    expect(childMocks.settings).not.toHaveBeenCalled();
    expect(childMocks.privacy).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", {name: "Go to Today"}));
    expect(onGoToToday).toHaveBeenCalled();
  });

  // "When" is a datetime-local wall clock read in the employee's browser zone.
  it.each([
    ["Asia/Kolkata", "2026-10-07T04:00:00.000Z"],
    ["UTC", "2026-10-07T09:30:00.000Z"],
  ])("limits assigned-host editing to summary fields and preserves manual activity (%s)",
    async (timezone, occurredAt) => {
    const originalTimezone = process.env.TZ;
    process.env.TZ = timezone;
    onTestFinished(() => {
      if (originalTimezone === undefined) delete process.env.TZ;
      else process.env.TZ = originalTimezone;
    });
    renderWorkspace({selectedOrganizerId: "host-one"});

    expect(screen.queryByRole("button", {name: "Open organizer record"})).toBeNull();
    expect(screen.queryByRole("button", {name: "Private demo"})).toBeNull();
    expect(screen.queryByRole("button", {name: "Pilot & terms"})).toBeNull();
    expect(screen.queryByLabelText("Research status")).toBeNull();
    expect(screen.queryByRole("button", {name: "Assign to me"})).toBeNull();

    fireEvent.change(screen.getByLabelText("Working summary"),
      {target: {value: "  Updated sourced summary  "}});
    fireEvent.change(screen.getByLabelText("Next action"),
      {target: {value: "  Ask owner to review  "}});
    fireEvent.click(screen.getByRole("button", {name: "Save summary"}));
    await waitFor(() => expect(current.saveAccount).toHaveBeenCalledWith({
      organizerId: "host-one", expectedRevision: 4,
      patch: {summary: "Updated sourced summary", nextAction: "Ask owner to review"},
    }));

    fireEvent.click(screen.getByRole("button", {name: "Activity"}));
    expect(childMocks.history).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("What happened?"),
      {target: {value: "outreach_sent_manual"}});
    fireEvent.change(screen.getByLabelText("What should the team know?"),
      {target: {value: "Sent outside Catch after human review"}});
    fireEvent.click(screen.getByRole("button", {name: "Record activity"}));
    await waitFor(() => expect(current.logActivity).toHaveBeenCalledWith({
      organizerId: "host-one", type: "outreach_sent_manual",
      occurredAt,
      note: "Sent outside Catch after human review", channel: "email",
      attestation: "sent_elsewhere_by_actor",
    }));
    expect(screen.getByText("You attest this was sent outside Catch. Delivery is unconfirmed."))
      .toBeTruthy();
  });

  it("clears unsaved activity and tabs on a cached assigned-host switch", () => {
    const {props, rerender} = renderWorkspace({selectedOrganizerId: "host-one"});
    fireEvent.click(screen.getByRole("button", {name: "Activity"}));
    fireEvent.change(screen.getByLabelText("What happened?"),
      {target: {value: "outreach_sent_manual"}});
    fireEvent.change(screen.getByLabelText("What should the team know?"),
      {target: {value: "Private host-one unsaved material"}});
    current.detail.data = {...current.detail.data,
      account: {...current.detail.data.account, organizerId: "host-two"},
      organizerSummary: {...current.detail.data.organizerSummary, name: "Other Assigned Host"}};
    rerender(<AdminFeedbackProvider onError={vi.fn()} onNotice={vi.fn()}>
      <SalesWorkspaceScreen {...props} selectedOrganizerId="host-two" />
    </AdminFeedbackProvider>);
    expect(screen.getByRole("heading", {name: "Other Assigned Host"})).toBeTruthy();
    expect(screen.queryByLabelText("What should the team know?")).toBeNull();
    fireEvent.click(screen.getByRole("button", {name: "Activity"}));
    expect(screen.getByLabelText("What should the team know?")).toHaveProperty("value", "");
    expect(screen.getByLabelText("What happened?")).toHaveProperty("value", "note");
    expect(current.logActivity).not.toHaveBeenCalled();
    expect(childMocks.history).not.toHaveBeenCalled();
  });
});
