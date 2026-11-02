import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {afterEach, beforeAll, expect, it, vi} from "vitest";
import type {SalesAccountDetail, SalesEvidenceProposal} from "../api/salesTypes";
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

const model = (overrides: Partial<SalesHostsModel> = {}): SalesHostsModel => ({query: "", setQuery: noop, rows: [], hasNextPage: false,
  hasPreviousPage: false, nextPage: noop, previousPage: noop, tab: "overview", setTab: noop, logActivity: vi.fn(), addNextStep: vi.fn(),
  completeNextStep: vi.fn(), saveDeal: vi.fn(), saveHost: vi.fn(), addPerson: vi.fn(), setHold: vi.fn().mockResolvedValue(true), uid: "dev", host: host(1),
  contacts: [], evidence: [], evidenceFailed: false,
  retryEvidence: vi.fn(), hasMoreEvidence: false, moreEvidence: vi.fn(), addEvidence: vi.fn().mockResolvedValue(true), suggestions: [proposal()], suggestionsFailed: false, retrySuggestions: vi.fn(),
  hasMoreSuggestions: false, moreSuggestions: vi.fn(), reviewSuggestion: vi.fn().mockResolvedValue(true), canEditResearch: true, isSaving: false, ...overrides});

const screenFor = (current: SalesHostsModel) => <SalesHostsScreen model={current} selectedOrganizerId="harbor" onSelect={noop}
  onOpenHostTools={noop} onAddHost={noop} onOpenOrganizer={noop} />;

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
