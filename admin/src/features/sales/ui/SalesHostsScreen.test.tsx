import {cleanup, fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import {afterEach, beforeAll, expect, it, vi} from "vitest";
import type {SalesAccountDetail, SalesContact, SalesEvidence, SalesEvidenceProposal} from "../api/salesTypes";
import {SalesHostsScreen, type SalesHostsModel} from "./SalesHostsScreen";

afterEach(cleanup);

// jsdom has no modal dialog; these stand in for the browser's open state.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});

const proposal = (revision = 1): SalesEvidenceProposal => ({proposalId: "p1", organizerId: "harbor", revision, status: "pending",
  createdAt: "2026-10-30T09:00:00.000Z", clientId: "assistant", reviewReason: null,
  evidence: {organizerId: "harbor", claimKey: "identity", sourceType: "public_web", sourceRef: "https://example.test",
    observedAt: "2026-10-29T09:00:00.000Z", confidence: "medium", normalizedValue: "Runs quiz nights"}});

const noop = vi.fn();

const host = (revision: number, suppressionStatus: "clear" | "held" = "clear") =>
  ({account: {organizerId: "harbor", revision, researchStatus: "qualified", suppressionStatus},
    organizerSummary: {name: "Harbor"}, activities: [], opportunities: [], tasks: []}) as unknown as SalesAccountDetail;

const model = (overrides: Partial<SalesHostsModel> = {}): SalesHostsModel => ({query: "", setQuery: noop, validSearch: true, researchStatus: null, setResearchStatus: vi.fn(), mineOnly: false, setMineOnly: vi.fn(), rows: [], hasNextPage: false,
  hasPreviousPage: false, nextPage: noop, previousPage: noop, tab: "overview", setTab: noop, logActivity: vi.fn(), addNextStep: vi.fn(),
  completeNextStep: vi.fn(), saveDeal: vi.fn(), saveHost: vi.fn(), addPerson: vi.fn(), setHold: vi.fn().mockResolvedValue(true), uid: "dev", host: host(1),
  contacts: [], contactsFailed: false, retryContacts: vi.fn(), hasMoreContacts: false, moreContacts: vi.fn(),
  reviewContact: vi.fn().mockResolvedValue(true), evidence: [], evidenceFailed: false,
  retryEvidence: vi.fn(), hasMoreEvidence: false, moreEvidence: vi.fn(), addEvidence: vi.fn().mockResolvedValue(true), suggestions: [proposal()], suggestionsFailed: false, retrySuggestions: vi.fn(),
  privateFields: [], privateFieldsLoading: false, privateFieldsFailed: false, retryPrivateFields: vi.fn(), saveCustomValue: vi.fn().mockResolvedValue(true),
  hasMoreSuggestions: false, moreSuggestions: vi.fn(), reviewSuggestion: vi.fn().mockResolvedValue(true), canEditResearch: true, isAdminOwner: true, commercial: null, renderPartnerOffer: null, isSaving: false, ...overrides});

const screenFor = (current: SalesHostsModel) => <SalesHostsScreen model={current} selectedOrganizerId="harbor" onSelect={noop} onOpenFit={noop} onOpenFitQueue={noop} onOpenPrivacy={noop} onOpenDemo={noop} onAddHost={noop} onOpenOrganizer={noop} />;

it("reviews the version the person read, and a refreshed version clears the reason", async () => {
  const current = model();
  const {rerender} = render(screenFor(current));
  fireEvent.click(screen.getByText("Runs quiz nights"));
  const accept = () => screen.getByRole<HTMLButtonElement>("button", {name: "Accept"});
  expect(accept().disabled).toBe(true);
  fireEvent.change(screen.getByLabelText(/^Why/u), {target: {value: "Checked the page"}});
  rerender(screenFor({...current, suggestions: [proposal(2)]}));
  expect((screen.getByLabelText(/^Why/u) as HTMLTextAreaElement).value).toBe("");
  fireEvent.change(screen.getByLabelText(/^Why/u), {target: {value: "Checked again"}});
  fireEvent.click(accept());
  await waitFor(() => expect(current.reviewSuggestion).toHaveBeenCalledWith(
    expect.objectContaining({revision: 2}), "accept", "Checked again"));
});

it("a sales associate can't decide a suggestion", () => {
  render(screenFor(model({canEditResearch: false})));
  fireEvent.click(screen.getByText("Runs quiz nights"));
  expect(screen.getByText("Waiting for a reviewer.")).toBeTruthy();
  expect(screen.queryByRole("button", {name: "Accept"})).toBeNull();
});

it("a sales associate adds sourced evidence", async () => {
  const current = model({canEditResearch: false});
  render(screenFor(current));
  fireEvent.click(screen.getAllByRole("button", {name: "Add"})[0]!);
  const add = () => screen.getAllByRole<HTMLButtonElement>("button", {name: "Add evidence"}).at(-1)!;
  expect(add().disabled).toBe(true);
  fireEvent.change(screen.getByLabelText(/^Source/u), {target: {value: "A call with the founder"}});
  fireEvent.click(add());
  await waitFor(() => expect(current.addEvidence).toHaveBeenCalledWith(expect.objectContaining({
    claimKey: "identity", sourceRef: "A call with the founder", contactId: null})));
});

it("asks for what an operation claim shows before it can be saved", () => {
  render(screenFor(model()));
  fireEvent.click(screen.getAllByRole("button", {name: "Add"})[0]!);
  fireEvent.change(screen.getByLabelText(/^Source/u), {target: {value: "Their site"}});
  const add = () => screen.getAllByRole<HTMLButtonElement>("button", {name: "Add evidence"}).at(-1)!;
  expect(add().disabled).toBe(false);
  fireEvent.change(screen.getByLabelText(/^What this helps establish/u), {target: {value: "operation"}});
  expect(add().disabled).toBe(true);
  fireEvent.change(screen.getByLabelText(/^What they run/u), {target: {value: "Waitlists"}});
  expect(add().disabled).toBe(false);
});

it("says when evidence can't be loaded instead of saying there is none, and offers a retry", () => {
  const current = model({evidenceFailed: true, suggestions: []});
  render(screenFor(current));
  expect(screen.getByText("Evidence could not be loaded")).toBeTruthy();
  expect(screen.queryByText("No evidence yet")).toBeNull();
  fireEvent.click(screen.getByRole("button", {name: "Try again"}));
  expect(current.retryEvidence).toHaveBeenCalled();
});

it("keeps a hold bound to what the person opened until they've seen a newer decision", async () => {
  const current = model();
  const {rerender} = render(screenFor(current));
  fireEvent.click(screen.getByRole("button", {name: "Change"}));
  fireEvent.change(screen.getByLabelText(/^Why/u), {target: {value: "Asked us to pause"}});
  rerender(screenFor({...current, host: host(2, "held")}));
  expect(screen.getByRole("alert").textContent).toContain("on hold");
  expect(screen.queryByRole("button", {name: "Save"})).toBeNull();
  fireEvent.click(screen.getByRole("button", {name: "Use the latest"}));
  expect((screen.getByLabelText(/^Why/u) as HTMLTextAreaElement).value).toBe("");
  fireEvent.change(screen.getByLabelText(/^Why/u), {target: {value: "Still paused"}});
  fireEvent.click(screen.getByRole("button", {name: "Save"}));
  await waitFor(() => expect(current.setHold).toHaveBeenCalledWith(2, "held", "Still paused"));
});

it("a sales associate sees the hold but can't change it", () => {
  render(screenFor(model({canEditResearch: false})));
  expect(screen.getByText("Account hold")).toBeTruthy();
  expect(screen.queryByRole("button", {name: "Change"})).toBeNull();
});

const person = (revision = 1, contactabilityStatus: SalesContact["relationship"]["contactabilityStatus"] = "unknown"): SalesContact => ({
  contactId: "kavya", displayName: "Kavya", relationship: {revision, role: "Founder", decisionInfluence: "decision_maker", primary: true,
    contactabilityStatus, sendAuthority: false}});
const aboutKavya = {evidenceId: "e1", organizerId: "harbor", contactId: "kavya", claimKey: "identity", sourceType: "public_web",
  sourceRef: "https://example.test/about", observedAt: "2026-10-29T09:00:00.000Z", confidence: "high", normalizedValue: "Founder"} as SalesEvidence;
const peopleModel = (overrides: Partial<SalesHostsModel> = {}) => model({suggestions: [], contacts: [person()], evidence: [aboutKavya], ...overrides});
const peopleScreen = (current: SalesHostsModel, revision = 1) => <SalesHostsScreen model={{...current, host: host(revision)}} selectedOrganizerId="harbor" onSelect={noop} onOpenFit={noop} onOpenFitQueue={noop} onOpenPrivacy={noop} onOpenDemo={noop} onAddHost={noop} onOpenOrganizer={noop} />;
const save = () => screen.getByRole<HTMLButtonElement>("button", {name: "Save"});

it("a review for drafts needs evidence about that person and a reason", async () => {
  const current = peopleModel();
  render(peopleScreen(current));
  fireEvent.click(screen.getByRole("button", {name: "Review"}));
  fireEvent.change(screen.getByLabelText(/^Status/u), {target: {value: "draft_reviewed"}});
  fireEvent.change(screen.getByLabelText(/^Why/u), {target: {value: "Checked their site"}});
  expect(save().disabled).toBe(true);
  fireEvent.change(screen.getByLabelText(/^Evidence about them/u), {target: {value: "e1"}});
  fireEvent.click(save());
  await waitFor(() => expect(current.reviewContact).toHaveBeenCalledWith(expect.objectContaining({contactId: "kavya"}), 1,
    "draft_reviewed", "Checked their site", "e1"));
});

it("evidence about someone else doesn't count, and more can be loaded for the review", () => {
  const moreEvidence = vi.fn();
  render(peopleScreen(peopleModel({evidence: [{...aboutKavya, contactId: "someone-else"}], hasMoreEvidence: true, moreEvidence})));
  fireEvent.click(screen.getByRole("button", {name: "Review"}));
  fireEvent.change(screen.getByLabelText(/^Status/u), {target: {value: "draft_reviewed"}});
  expect(screen.queryByLabelText(/^Evidence about them/u)).toBeNull();
  fireEvent.click(within(document.querySelector("dialog") as HTMLElement).getByRole("button", {name: "Show more evidence"}));
  expect(moreEvidence).toHaveBeenCalled();
});

it("a change made while reviewing is seen first, and the latest clears the old decision", () => {
  const current = peopleModel();
  const {rerender} = render(peopleScreen(current));
  fireEvent.click(screen.getByRole("button", {name: "Review"}));
  fireEvent.change(screen.getByLabelText(/^Status/u), {target: {value: "held"}});
  fireEvent.change(screen.getByLabelText(/^Why/u), {target: {value: "Asked us to wait"}});
  rerender(peopleScreen({...current, contacts: [person(2, "suppressed")]}));
  expect(screen.getByRole("alert").textContent).toContain("don't contact");
  expect(screen.queryByRole("button", {name: "Save"})).toBeNull();
  fireEvent.click(screen.getByRole("button", {name: "Use the latest"}));
  expect((screen.getByLabelText(/^Status/u) as HTMLSelectElement).value).toBe("suppressed");
  expect((screen.getByLabelText(/^Why/u) as HTMLTextAreaElement).value).toBe("");
  expect(current.reviewContact).not.toHaveBeenCalled();
});

it("a sales associate can add someone and sees their status, but can't review them", () => {
  render(peopleScreen(peopleModel({canEditResearch: false, contacts: [person(1, "held")]})));
  expect(screen.getByText("On hold")).toBeTruthy();
  expect(screen.queryByRole("button", {name: "Review"})).toBeNull();
  expect(screen.queryByText("Fit and outreach")).toBeNull();
});

it("a follow-up names someone reviewed for drafts; other kinds of step don't need anyone", async () => {
  const current = peopleModel({addNextStep: vi.fn().mockResolvedValue(true)});
  const {rerender} = render(peopleScreen(current));
  fireEvent.click(screen.getAllByRole("button", {name: "Add"})[1]);
  fireEvent.change(screen.getByLabelText(/^What's next/u), {target: {value: "Send terms"}});
  const add = () => within(document.querySelector("dialog") as HTMLElement).getByRole<HTMLButtonElement>("button", {name: "Add"});
  expect(screen.getByRole("alert").textContent).toContain("Nobody here is reviewed");
  expect(add().disabled).toBe(true);
  rerender(peopleScreen({...current, contacts: [person(2, "draft_reviewed")]}));
  fireEvent.change(screen.getByLabelText(/^With/u), {target: {value: "kavya"}});
  fireEvent.click(add());
  await waitFor(() => expect(current.addNextStep).toHaveBeenCalledWith(expect.objectContaining({kind: "follow_up", contactId: "kavya"})));
  fireEvent.click(screen.getAllByRole("button", {name: "Add"})[1]);
  fireEvent.change(screen.getByLabelText(/^What's next/u), {target: {value: "Read their site"}});
  fireEvent.change(screen.getByLabelText(/^Kind/u), {target: {value: "research"}});
  fireEvent.click(add());
  await waitFor(() => expect(current.addNextStep).toHaveBeenLastCalledWith(expect.not.objectContaining({contactId: expect.anything()})));
});

it("filters the list by research and whose hosts, and says when a search can't run", () => {
  const current = model({suggestions: [], validSearch: false});
  render(<SalesHostsScreen model={{...current, host: null}} selectedOrganizerId={null} onSelect={noop} onOpenFit={noop} onOpenFitQueue={noop}
    onOpenPrivacy={noop} onOpenDemo={noop} onAddHost={noop} onOpenOrganizer={noop} />);
  fireEvent.click(screen.getByRole("button", {name: /^Needs research/u}));
  expect(current.setResearchStatus).toHaveBeenCalledWith("needs_research");
  fireEvent.click(screen.getByRole("button", {name: /^Mine/u}));
  expect(current.setMineOnly).toHaveBeenCalledWith(true);
  expect(screen.getByText(/search one word of 2 to 80/u)).toBeTruthy();
});

it("a sales associate has no Mine filter or reviewed fit queue", () => {
  const current = model({suggestions: [], canEditResearch: false});
  render(<SalesHostsScreen model={{...current, host: null}} selectedOrganizerId={null} onSelect={noop} onOpenFit={noop} onOpenFitQueue={null}
    onOpenPrivacy={noop} onOpenDemo={noop} onAddHost={noop} onOpenOrganizer={noop} />);
  expect(screen.queryByRole("button", {name: /^Mine/u})).toBeNull();
  expect(screen.queryByRole("button", {name: "Reviewed fit"})).toBeNull();
  expect(screen.getByRole("button", {name: "Add or nominate"})).toBeTruthy();
});

it("starts another deal when one exists, keeping its kind and owner choices", async () => {
  const saveDeal = vi.fn().mockResolvedValue(true);
  const withDeal = {...host(1), opportunities: [{opportunityId: "o1", organizerId: "harbor", motion: "expansion", stage: "contacted",
    ownerUid: "someone", nextStep: "Call", nextStepAt: "2026-11-05T13:30:00.000Z", revision: 2}]} as unknown as SalesAccountDetail;
  render(<SalesHostsScreen model={model({host: withDeal, tab: "deals", saveDeal})} selectedOrganizerId="harbor" onSelect={noop}
    onOpenOrganizer={noop} onOpenFit={noop} onOpenFitQueue={noop} onOpenPrivacy={noop} onOpenDemo={noop} onAddHost={noop} />);
  fireEvent.click(screen.getByRole("button", {name: "Move"}));
  fireEvent.click(screen.getByRole("button", {name: "Assign to me"}));
  fireEvent.click(screen.getByRole("button", {name: "Save"}));
  await waitFor(() => expect(saveDeal).toHaveBeenCalledWith(expect.objectContaining({opportunityId: "o1"}),
    expect.objectContaining({motion: "expansion", ownerUid: "dev"})));
  cleanup();
  render(<SalesHostsScreen model={model({host: withDeal, tab: "deals", saveDeal})} selectedOrganizerId="harbor" onSelect={noop}
    onOpenOrganizer={noop} onOpenFit={noop} onOpenFitQueue={noop} onOpenPrivacy={noop} onOpenDemo={noop} onAddHost={noop} />);
  expect(screen.getByRole("button", {name: "Start a deal"})).toBeTruthy();
});

it("shows Private details on the Overview for the team, and finished steps under History", () => {
  const field = {fieldId: "sales.who", label: "Who decides", type: "string" as const, recordType: "account" as const, revision: 1};
  const drawn = render(<SalesHostsScreen model={model({host: host(1), privateFields: [field]})} selectedOrganizerId="harbor" onSelect={noop}
    onOpenOrganizer={noop} onOpenFit={noop} onOpenFitQueue={noop} onOpenPrivacy={noop} onOpenDemo={noop} onAddHost={noop} />);
  expect(screen.getByText("Private details")).toBeTruthy();
  expect(screen.queryByText("All tools")).toBeNull();
  drawn.unmount();
  render(<SalesHostsScreen model={model({host: host(1), canEditResearch: false, privateFields: [field]})} selectedOrganizerId="harbor" onSelect={noop}
    onOpenOrganizer={noop} onOpenFit={noop} onOpenFitQueue={noop} onOpenPrivacy={noop} onOpenDemo={noop} onAddHost={noop} />);
  expect(screen.queryByText("Private details")).toBeNull();
  expect(screen.getByRole("tab", {name: /History/u})).toBeTruthy();
});
