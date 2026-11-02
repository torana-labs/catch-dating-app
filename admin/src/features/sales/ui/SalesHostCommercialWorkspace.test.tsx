import {cleanup, fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import {afterEach, beforeAll, expect, it, vi} from "vitest";
import type {CommercialDetail} from "../api/salesCommercialTypes";
import type {SalesEvidence, SalesOpportunity} from "../api/salesTypes";
import {SalesHostCommercialWorkspace, type SalesHostCommercialModel} from "./SalesHostCommercialWorkspace";

afterEach(cleanup);
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) { this.removeAttribute("open"); };
});

const ref = (evidenceId: string) => ({evidenceId, sourceRef: `source ${evidenceId}`, contentHash: "h", observedAt: "2026-10-01T00:00:00.000Z"});
const terms = {currency: "INR", amountMinor: 500_000, billingCadence: "monthly" as const, scope: "Booking pages", validUntil: "2026-12-01T00:00:00.000Z", sourceFactRefs: ["e1"]};
const quote = (status: "draft" | "approved" | "accepted_reviewed", revision = 3) => ({organizerId: "harbor", opportunityId: "o1", quoteId: "q1", revision, termVersion: 2, status,
  approvedDecisionId: null, acceptedDecisionId: null});
const record = (overrides: Partial<CommercialDetail> = {}): CommercialDetail => ({
  opportunity: {opportunityId: "o1", organizerId: "harbor", stage: "pilot_agreed", revision: 7, motion: "first_workflow_pilot", ownerUid: "dev", nextStep: null, nextStepAt: null},
  pilotPlan: null, quote: null, quoteVersion: null, approvedDecision: null, acceptedDecision: null, settlementAttestation: null, history: [], historyTruncated: false,
  paymentStatus: "unknown", bookedHostRevenueMinor: null, ...overrides});
const withQuote = (status: "draft" | "approved" | "accepted_reviewed", revision = 3) => ({quote: quote(status, revision), quoteVersion: {termVersion: 2, terms, termsHash: "t"}});
const evidence = [
  {evidenceId: "e1", organizerId: "harbor", contactId: null, claimKey: "identity", sourceType: "first_party", sourceRef: "source e1", observedAt: "2026-10-01T00:00:00.000Z", confidence: "high"},
  {evidenceId: "e2", organizerId: "harbor", contactId: null, claimKey: "operation", sourceType: "human_note", sourceRef: "source e2", observedAt: "2026-10-01T00:00:00.000Z", confidence: "high"},
] as SalesEvidence[];
const model = (current: CommercialDetail, overrides: Partial<SalesHostCommercialModel> = {}): SalesHostCommercialModel => ({dealId: "o1", selectDeal: vi.fn(), record: current,
  recordFailed: false, retryRecord: vi.fn(), reportRows: [], reportFailed: false, retryReport: vi.fn(), hasMoreReport: false, moreReport: vi.fn(),
  savePilot: vi.fn().mockResolvedValue(true), reviseQuote: vi.fn().mockResolvedValue(true), approveQuote: vi.fn().mockResolvedValue(true), acceptQuote: vi.fn().mockResolvedValue(true),
  attestCollection: vi.fn().mockResolvedValue(true), closeWon: vi.fn().mockResolvedValue(true), isSaving: false, ...overrides});
const deals = [{opportunityId: "o1", stage: "pilot_agreed"}] as SalesOpportunity[];
const view = (current: SalesHostCommercialModel, isAdminOwner = true) => <SalesHostCommercialWorkspace model={current} deals={deals} evidence={evidence} hasMoreEvidence={false}
  moreEvidence={vi.fn()} isAdminOwner={isAdminOwner} />;
const sheet = () => within(document.querySelector("dialog") as HTMLElement);
const change = (label: RegExp, value: string) => fireEvent.change(sheet().getByLabelText(label), {target: {value}});

it("saves a pilot with its evidence against the revision that was opened", async () => {
  const current = model(record());
  render(view(current));
  fireEvent.click(screen.getByRole("button", {name: "Plan a pilot"}));
  const save = () => sheet().getByRole<HTMLButtonElement>("button", {name: "Save"});
  change(/^Status/u, "reviewed");
  change(/^Workflow key/u, "has spaces");
  change(/^What it should show/u, "Fill two nights");
  change(/^How we'll know/u, "Forty guests\n\n");
  expect(save().disabled).toBe(true);
  change(/^Workflow key/u, "guest-applications");
  change(/^Evidence the plan was reviewed/u, "e1");
  fireEvent.click(save());
  await waitFor(() => expect(current.savePilot).toHaveBeenCalledWith({expectedRevision: 0, plan: {status: "reviewed", workflowId: "guest-applications",
    objective: "Fill two nights", successMeasures: ["Forty guests"], startsAt: null, endsAt: null, reviewEvidence: {evidenceId: "e1"}, outcomeEvidence: null}}));
});

it("a pilot changed meanwhile is seen first, and the latest replaces the edits", () => {
  const plan = {organizerId: "harbor", opportunityId: "o1", revision: 1, status: "draft" as const, workflowId: "w", objective: "First", successMeasures: ["m"], startsAt: null, endsAt: null,
    reviewEvidence: null, outcomeEvidence: null};
  const current = model(record({pilotPlan: plan}));
  const {rerender} = render(view(current));
  fireEvent.click(screen.getByRole("button", {name: "Edit"}));
  change(/^What it should show/u, "My edit");
  rerender(view({...current, record: record({pilotPlan: {...plan, revision: 2, objective: "Theirs"}})}));
  expect(sheet().getByRole("alert")).toBeTruthy();
  expect(sheet().queryByRole("button", {name: "Save"})).toBeNull();
  fireEvent.click(sheet().getByRole("button", {name: "Use the latest"}));
  expect((sheet().getByLabelText(/^What it should show/u) as HTMLTextAreaElement).value).toBe("Theirs");
  expect(current.savePilot).not.toHaveBeenCalled();
});

it("a quote version needs an amount, scope, date and something it's based on", async () => {
  const current = model(record());
  render(view(current));
  fireEvent.click(screen.getByRole("button", {name: "Write a quote"}));
  const save = () => sheet().getByRole<HTMLButtonElement>("button", {name: "Save version"});
  change(/^Amount/u, "5000.50");
  change(/^Exactly what's included/u, "Booking pages");
  change(/^Valid until/u, "2026-12-01T10:00");
  expect(save().disabled).toBe(true);
  fireEvent.click(sheet().getByLabelText(/source e1/u));
  fireEvent.click(save());
  await waitFor(() => expect(current.reviseQuote).toHaveBeenCalledWith(expect.objectContaining({expectedRevision: 0,
    terms: expect.objectContaining({amountMinor: 500_050, currency: "INR", billingCadence: "one_time", sourceFactRefs: ["e1"]})})));
});

it("acceptance can't reuse the approval's evidence", async () => {
  const current = model(record({...withQuote("approved"), approvedDecision: {decisionId: "d1", evidence: ref("e1")}}));
  render(view(current));
  fireEvent.click(screen.getByRole("button", {name: "Record acceptance"}));
  const options = [...(sheet().getByLabelText(/^Evidence for this version/u) as HTMLSelectElement).options].map((option) => option.value);
  expect(options).not.toContain("e1");
  change(/^Evidence for this version/u, "e2");
  fireEvent.click(sheet().getByRole("button", {name: "Record acceptance"}));
  await waitFor(() => expect(current.acceptQuote).toHaveBeenCalledWith({expectedRevision: 3, termVersion: 2, evidence: {evidenceId: "e2"}}));
  expect(current.approveQuote).not.toHaveBeenCalled();
});

it("only the owner records a payment, for the exact amount, with proof that isn't a staff note", async () => {
  const accepted = record(withQuote("accepted_reviewed"));
  const {unmount} = render(view(model(accepted), false));
  expect(screen.queryByRole("button", {name: "Record what the host paid"})).toBeNull();
  unmount();
  const current = model(accepted);
  render(view(current));
  fireEvent.click(screen.getByRole("button", {name: "Record what the host paid"}));
  const options = [...(sheet().getByLabelText(/^Proof of payment/u) as HTMLSelectElement).options].map((option) => option.value);
  expect(options).toContain("e1");
  expect(options).not.toContain("e2");
  const save = () => sheet().getByRole<HTMLButtonElement>("button", {name: "Record payment"});
  change(/^Received on/u, "2026-11-01T10:00");
  change(/^Payment reference/u, "UTR-123456");
  change(/^Account it reached/u, "HDFC current");
  change(/^Proof of payment/u, "e1");
  expect(save().disabled).toBe(true);
  change(/^Period starts/u, "2026-11-01T00:00");
  change(/^Period ends/u, "2026-12-01T00:00");
  fireEvent.click(save());
  await waitFor(() => expect(current.attestCollection).toHaveBeenCalledWith(expect.objectContaining({expectedQuoteRevision: 3, termVersion: 2, amountMinor: 500_000,
    currency: "INR", settlementReference: "UTR-123456", evidence: {evidenceId: "e1"}, servicePeriod: expect.objectContaining({startsAt: expect.any(String)})})));
});

it("closing as won uses the recorded payment, and only after one exists", async () => {
  const attestation = {attestationId: "a1", organizerId: "harbor", opportunityId: "o1", quoteId: "q1", termVersion: 2, termsHash: "t", amountMinor: 500_000, currency: "INR",
    purpose: "host_subscription" as const, receivedAt: "2026-11-01T00:00:00.000Z", settlementMethod: "bank_transfer" as const, settlementReference: "UTR-123456",
    recipientAccountScope: "HDFC current", settlementIdentityHash: "s", servicePeriod: null, evidence: ref("e1"), status: "manual_attested_collected" as const,
    providerConfirmed: false as const, actorUid: "dev", attestedAt: "2026-11-01T00:00:00.000Z"};
  const {unmount} = render(view(model(record(withQuote("accepted_reviewed")))));
  expect(screen.queryByRole("button", {name: "Close as won"})).toBeNull();
  unmount();
  const current = model(record({...withQuote("accepted_reviewed"), settlementAttestation: attestation}));
  render(view(current));
  expect(screen.getByText("Not confirmed")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", {name: "Close as won"}));
  fireEvent.click(sheet().getByRole("button", {name: "Close as won"}));
  await waitFor(() => expect(current.closeWon).toHaveBeenCalledWith({expectedRevision: 7, financeAttestationId: "a1",
    fields: {motion: "first_workflow_pilot", stage: "closed_won", ownerUid: "dev", nextStep: null, nextStepAt: null}}));
});
