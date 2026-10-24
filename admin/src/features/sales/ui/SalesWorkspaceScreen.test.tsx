import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {AdminFeedbackProvider} from "../../../shared/feedback/AdminFeedbackContext";
import {SalesWorkspaceScreen} from "./SalesWorkspaceScreen";

const controllerMock = vi.hoisted(() => ({use: vi.fn()}));
const childMocks = vi.hoisted(() => ({
  commercial: vi.fn(), demo: vi.fn(), fitQueue: vi.fn(), funnel: vi.fn(),
  history: vi.fn(), intelligence: vi.fn(), privacy: vi.fn(), records: vi.fn(),
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
vi.mock("./SalesCommercialWorkspace", () => ({
  renderSalesCommercialWorkspace: childMocks.commercial,
}));
vi.mock("./SalesDemoPanel", () => ({SalesDemoWorkspace: childMocks.demo}));
vi.mock("./SalesFitQueueWorkspace", () => ({
  renderSalesFitQueueWorkspace: childMocks.fitQueue,
}));
vi.mock("./SalesFunnelWorkspace", () => ({
  renderSalesFunnelWorkspace: childMocks.funnel,
}));
vi.mock("./SalesImportedHistoryPanel", () => ({
  renderSalesImportedHistory: childMocks.history,
}));
vi.mock("./SalesIntelligenceWorkspace", () => ({
  SalesIntelligenceWorkspace: childMocks.intelligence,
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
    accounts: query({rows: [{...account, name: "Assigned Host", city: "Mumbai",
      marketLabel: "India", eventTypes: ["social"], fitLabel: null, stage: null}],
    nextCursor: null}),
    tasks: query({rows: [], nextCursor: null}),
    opportunities: query({rows: [], nextCursor: null}),
    inboundIntents: query({rows: [], nextCursor: null}),
    identityMatches: query({rows: [], nextCursor: null}),
    canonicalMatches: query([]),
    customFields: query({rows: []}), contacts: query({rows: [], nextCursor: null}),
    evidence: query({rows: [], nextCursor: null}),
    evidenceProposals: query({rows: [], nextCursor: null}), detail: query(detail),
    canonicalSearch: "", identitySearch: "", query: "", researchStatus: "all",
    ownerUid: "", opportunityStage: "", validAccountQuery: true,
    isSaving: false,
    hasPreviousPage: false, hasPreviousTaskPage: false,
    hasPreviousOpportunityPage: false, hasPreviousInboundPage: false,
    hasPreviousContactPage: false, hasPreviousEvidencePage: false,
    hasPreviousProposalPage: false,
    setCanonicalSearch: vi.fn(), setIdentitySearch: vi.fn(),
    setAccountFilters: vi.fn(), setStageFilter: vi.fn(),
    previousPage: vi.fn(), nextPage: vi.fn(), previousTaskPage: vi.fn(),
    nextTaskPage: vi.fn(), previousOpportunityPage: vi.fn(),
    nextOpportunityPage: vi.fn(), previousInboundPage: vi.fn(),
    nextInboundPage: vi.fn(), previousContactPage: vi.fn(), nextContactPage: vi.fn(),
    previousEvidencePage: vi.fn(), nextEvidencePage: vi.fn(),
    previousProposalPage: vi.fn(), nextProposalPage: vi.fn(),
    addAccount: vi.fn(), nominateOrganizer: vi.fn(async () => true),
    saveAccount: vi.fn(async () => true),
    logActivity: vi.fn(async () => true), saveOpportunity: vi.fn(), saveTask: vi.fn(),
    saveCustomValue: vi.fn(),
  };
}

function renderWorkspace(next: Partial<Parameters<typeof SalesWorkspaceScreen>[0]> = {}) {
  const props = {
    area: "hosts" as const, currentUserUid: "staff-one", isAdminOwner: false,
    assignedStaffOnly: true, selectedOrganizerId: null,
    onAreaChange: vi.fn(), onOpenHost: vi.fn(), onBackToHosts: vi.fn(),
    onOpenIntake: vi.fn(), onOpenOrganizer: vi.fn(), ...next,
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

  it("shows only assigned work areas and removes global host acquisition controls", () => {
    renderWorkspace();

    expect(screen.getByRole("heading", {name: "Assigned hosts"})).toBeTruthy();
    expect(screen.getAllByRole("option").map((option) => option.textContent))
      .toEqual(["Today", "Hosts", "Pipeline", "All research statuses",
        "Needs research", "Ready for review"]);
    expect(screen.queryByRole("button", {name: "Add host"})).toBeNull();
    expect(screen.queryByLabelText("Owner")).toBeNull();
    expect(childMocks.fitQueue).not.toHaveBeenCalled();
    expect(controllerMock.use).toHaveBeenCalledWith(expect.objectContaining({
      area: "hosts", assignedStaffOnly: true,
    }));
  });

  it("lets assigned staff nominate an organizer Catch does not list yet", async () => {
    renderWorkspace();

    fireEvent.click(screen.getByRole("button", {name: "Nominate organizer"}));
    const nominate = screen.getByRole("button", {name: "Nominate"});
    expect(nominate).toHaveProperty("disabled", true);
    fireEvent.change(screen.getByLabelText("City"), {target: {value: " Bengaluru "}});
    fireEvent.change(screen.getByLabelText("Links, one per line"), {target: {value:
      "https://lu.ma/thebhag\n\n lu.ma/thebhag \nhttps://lu.ma/thebhag"}});
    expect(screen.getByRole("status").textContent).toContain('Check "lu.ma/thebhag"');
    fireEvent.change(screen.getByLabelText("Links, one per line"), {target: {value:
      "https://lu.ma/thebhag\n https://thebhag.in \nhttps://lu.ma/thebhag"}});
    fireEvent.change(screen.getByLabelText("What should the reviewer know?"),
      {target: {value: "  Sunday long runs  "}});
    fireEvent.click(nominate);
    await waitFor(() => expect(current.nominateOrganizer).toHaveBeenCalledWith({
      name: null, market: "Bengaluru",
      urls: ["https://lu.ma/thebhag", "https://thebhag.in"],
      notes: "Sunday long runs", categories: [],
    }));
    await waitFor(() => expect(screen.queryByRole("button", {name: "Nominate"})).toBeNull());
  });

  it("keeps the assigned pipeline but does not render the global funnel", () => {
    renderWorkspace({area: "pipeline"});

    expect(screen.getByRole("heading", {name: "Opportunities"})).toBeTruthy();
    expect(childMocks.funnel).not.toHaveBeenCalled();
  });

  it("fails closed on a direct route to a global Sales area", () => {
    const onAreaChange = vi.fn();
    renderWorkspace({area: "settings", onAreaChange});

    expect(screen.getByRole("heading", {name: "Assigned Sales access"})).toBeTruthy();
    expect(childMocks.settings).not.toHaveBeenCalled();
    expect(childMocks.privacy).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", {name: "Go to Today"}));
    expect(onAreaChange).toHaveBeenCalledWith("today");
  });

  it("limits assigned-host editing to summary fields and preserves manual activity", async () => {
    renderWorkspace({selectedOrganizerId: "host-one"});

    expect(screen.queryByRole("button", {name: "Open organizer record"})).toBeNull();
    expect(screen.queryByRole("button", {name: "Private demo"})).toBeNull();
    expect(screen.queryByRole("button", {name: "Pilot & terms"})).toBeNull();
    expect(screen.queryByLabelText("Research status")).toBeNull();
    expect(screen.queryByRole("button", {name: "Assign to me"})).toBeNull();
    expect(childMocks.records.mock.calls.some(([props]) =>
      props.section === "suppression")).toBe(false);

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
      occurredAt: "2026-10-07T09:30:00.000Z",
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
