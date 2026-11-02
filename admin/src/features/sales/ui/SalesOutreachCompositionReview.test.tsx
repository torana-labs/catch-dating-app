import {act, cleanup, fireEvent, render, screen, waitFor} from
  "@testing-library/react";
import {afterEach, expect, it, vi} from "vitest";
import type {ApprovedClause, DraftSourceRequest} from
  "../api/salesIntelligenceTypes";
import type {SalesContact, SalesOpportunity} from "../api/salesTypes";
import {salesOutreachCompositionReview} from
  "./SalesOutreachCompositionReview";

const evaluatedAt = "2026-10-06T10:00:00.000Z";

function contact(contactId: string, displayName: string): SalesContact {
  return {contactId, displayName, relationship: {revision: 1,
    role: "Founder", decisionInfluence: "decision_maker", primary: true,
    contactabilityStatus: "draft_reviewed", sendAuthority: false}};
}

function opportunity(opportunityId: string, motion: string): SalesOpportunity {
  return {opportunityId, organizerId: "org-one", motion,
    stage: "ready_to_contact", ownerUid: "staff-one", nextStep: null,
    nextStepAt: null, revision: 1};
}

function clause(clauseId: string, kind: ApprovedClause["kind"],
  permission: ApprovedClause["permission"] = kind === "reference" ?
    "private_mention" : "not_required", validUntil = "2026-12-01T00:00:00.000Z"):
  ApprovedClause {
  return {clauseId, organizerId: "org-one", revision: 1, kind,
    text: `${kind} wording ${clauseId}`, state: "approved", evidenceIds: [],
    validUntil, permission, reviewedAt: evaluatedAt};
}

function baseProps() {
  return {organizerId: "org-one", evaluatedAt, eligible: true,
    blocked: false,
    contacts: [contact("contact-one", "First Contact"),
      contact("contact-two", "Second Contact")],
    opportunities: [opportunity("opportunity-one", "first_pilot"),
      opportunity("opportunity-two", "follow_up")],
    clauses: [clause("observation-one", "observation"),
      clause("capability-one", "capability"),
      clause("reference-one", "reference"), clause("cta-one", "cta")],
    nextContactCursor: null, hasPreviousContacts: false,
    onNextContacts: vi.fn(), onPreviousContacts: vi.fn(),
    onGenerate: vi.fn(async (_request: DraftSourceRequest) =>
      ({status: "completed"}))};
}

function chooseRequired({reference = false}: {reference?: boolean} = {}) {
  fireEvent.change(screen.getByLabelText("Reviewed contact"),
    {target: {value: "contact-one"}});
  fireEvent.change(screen.getByLabelText("Opportunity ready for contact"),
    {target: {value: "opportunity-one"}});
  fireEvent.change(screen.getByLabelText("Host observation"),
    {target: {value: "observation-one"}});
  fireEvent.change(screen.getByLabelText("Catch capability"),
    {target: {value: "capability-one"}});
  if (reference) fireEvent.change(screen.getByLabelText("Private reference (optional)"),
    {target: {value: "reference-one"}});
  fireEvent.change(screen.getByLabelText("Question or next step"),
    {target: {value: "cta-one"}});
}

afterEach(() => {cleanup(); vi.clearAllMocks();});

it("edits every composition selection and submits the exact existing request", async () => {
  const props = baseProps();
  render(salesOutreachCompositionReview(props));
  expect(screen.getByText(/not the final draft, cannot send a message/iu)).toBeTruthy();
  expect(screen.queryByRole("button", {name: /send/iu})).toBeNull();
  chooseRequired({reference: true});
  fireEvent.change(screen.getByLabelText("Reviewed contact"),
    {target: {value: "contact-two"}});
  fireEvent.change(screen.getByLabelText("Opportunity ready for contact"),
    {target: {value: "opportunity-two"}});
  fireEvent.change(screen.getByLabelText("Draft channel"),
    {target: {value: "message"}});
  expect(screen.getByText("Second Contact")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", {name: "Review plan and prepare private draft"}));
  await waitFor(() => expect(props.onGenerate).toHaveBeenCalledOnce());
  expect(vi.mocked(props.onGenerate).mock.calls[0][0]).toEqual({
    organizerId: "org-one", contactId: "contact-two",
    opportunityId: "opportunity-two", observationIds: ["observation-one"],
    capabilityIds: ["capability-one"], referenceIds: ["reference-one"],
    ctaIds: ["cta-one"], channel: "message", purpose: "first_message",
  });
  expect(await screen.findByText(/review the exact server draft below/iu)).toBeTruthy();
});

it("keeps an incomplete composition plan disabled", () => {
  const props = baseProps();
  render(salesOutreachCompositionReview(props));
  fireEvent.change(screen.getByLabelText("Reviewed contact"),
    {target: {value: "contact-one"}});
  expect(screen.getByRole("button", {name: "Review plan and prepare private draft"}))
    .toHaveProperty("disabled", true);
  fireEvent.click(screen.getByRole("button", {name: "Review plan and prepare private draft"}));
  expect(props.onGenerate).not.toHaveBeenCalled();
  expect(screen.getByText("Complete every required selection")).toBeTruthy();
});

it("blocks suppressed or otherwise ineligible Sales records", () => {
  const props = {...baseProps(), eligible: false};
  render(salesOutreachCompositionReview(props));
  chooseRequired();
  expect(screen.getByRole("alert").textContent).toContain("clear contact restrictions");
  expect(screen.getByRole("button", {name: "Review plan and prepare private draft"}))
    .toHaveProperty("disabled", true);
  expect(props.onGenerate).not.toHaveBeenCalled();
});

it("excludes expired wording and references without private-mention permission", () => {
  const props = baseProps();
  props.clauses.push(
    clause("expired-observation", "observation", "not_required",
      "2026-10-01T00:00:00.000Z"),
    clause("withheld-reference", "reference", "not_required"),
  );
  render(salesOutreachCompositionReview(props));
  expect(screen.queryByRole("option", {name: /expired-observation/u})).toBeNull();
  expect(screen.queryByRole("option", {name: /withheld-reference/u})).toBeNull();
  expect(screen.getByRole("option", {name: /reference-one/u})).toBeTruthy();
});

it("submits one frozen plan while a repeated action is pending", async () => {
  let resolve!: (value: {status: string}) => void;
  const props = {...baseProps(), onGenerate: vi.fn(() =>
    new Promise<{status: string}>((done) => {resolve = done;}))};
  render(salesOutreachCompositionReview(props));
  chooseRequired();
  const button = screen.getByRole("button", {name: "Review plan and prepare private draft"});
  fireEvent.click(button);
  fireEvent.click(button);
  expect(props.onGenerate).toHaveBeenCalledOnce();
  expect(screen.getByRole("button", {name: "Submitting composition plan"}))
    .toHaveProperty("disabled", true);
  await act(async () => {resolve({status: "completed"});});
  expect(screen.getByRole("button", {name: "Review plan and prepare private draft"}))
    .toHaveProperty("disabled", true);
});

it("does not surface a prior account completion after the composition unmounts", async () => {
  let resolve!: (value: {status: string}) => void;
  const first = {...baseProps(), onGenerate: vi.fn(() =>
    new Promise<{status: string}>((done) => {resolve = done;}))};
  const view = render(salesOutreachCompositionReview(first));
  chooseRequired();
  fireEvent.click(screen.getByRole("button", {name: "Review plan and prepare private draft"}));
  const second = {...baseProps(), organizerId: "org-two",
    contacts: [contact("contact-one", "New Account Contact")],
    opportunities: [{...opportunity("opportunity-one", "new_account"),
      organizerId: "org-two"}]};
  view.rerender(salesOutreachCompositionReview(second));
  await act(async () => {resolve({status: "completed"});});
  expect(screen.queryByText(/Composition plan submitted/iu)).toBeNull();
  expect(screen.getByLabelText("Reviewed contact")).toHaveProperty("value", "");
  expect(second.onGenerate).not.toHaveBeenCalled();
});

it("reports an unconfirmed result through the existing unchanged-request recovery", async () => {
  const props = {...baseProps(), onGenerate: vi.fn(async () => null)};
  render(salesOutreachCompositionReview(props));
  chooseRequired();
  fireEvent.click(screen.getByRole("button", {name: "Review plan and prepare private draft"}));
  expect((await screen.findByRole("alert")).textContent).toContain(
    "Retry the unchanged request above");
});
