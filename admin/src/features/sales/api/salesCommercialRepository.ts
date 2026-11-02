import {httpsCallable} from "firebase/functions";
import {functions} from "../../../shared/api/firebaseFunctions";
import {dataMode} from "../../../shared/api/dataMode";
import {getSalesAccount, listSalesEvidence, upsertSalesOpportunity} from "./salesRepository";
import type {SalesUpsertOpportunityInput} from "./salesTypes";
import type {CommercialDecisionInput, CommercialDetail, CommercialPilotInput,
  CommercialQuoteInput, CommercialReport, CommercialSettlementInput,
  CommercialCloseInput, CommercialEvidence, CommercialSettlementAttestation} from
  "./salesCommercialTypes";

async function call<Request, Response>(name: string,
  payload: Request): Promise<Response> {
  const {validateAdminCallableRequest, validateAdminCallableResponse} = await import(
    "../../../generated/validators/adminCallableValidators")
    .then((validators) => validators.loadAdminCallableValidators(name));
  validateAdminCallableRequest(name, payload);
  const result = await httpsCallable<Request, Response>(functions, name)(payload);
  validateAdminCallableResponse(name, result.data);
  return result.data;
}
// Sample mode keeps each deal's pilot, quote and collection here, so the host page works without a backend.
type SampleRecord = Pick<CommercialDetail, "pilotPlan" | "quote" | "quoteVersion" | "approvedDecision" | "acceptedDecision" |
  "settlementAttestation" | "history">;
const sampleRecords = new Map<string, SampleRecord>();
function sampleRecord(opportunityId: string): SampleRecord {
  const record = sampleRecords.get(opportunityId) ?? {pilotPlan: null, quote: null, quoteVersion: null, approvedDecision: null,
    acceptedDecision: null, settlementAttestation: null, history: []};
  sampleRecords.set(opportunityId, record);
  return record;
}
function expectSampleRevision(actual: number, expected: number) {
  if (actual !== expected) throw new Error("Record changed since review.");
}
async function sampleEvidenceRef(organizerId: string, evidenceId: string): Promise<CommercialEvidence> {
  const row = (await listSalesEvidence(organizerId)).rows.find((item) => item.evidenceId === evidenceId);
  if (!row) throw new Error("Recorded evidence was not found.");
  return {evidenceId, sourceRef: row.sourceRef, contentHash: "sample", observedAt: row.observedAt};
}

export async function getCommercialDetail(organizerId: string,
  opportunityId: string): Promise<CommercialDetail> {
  if (dataMode() !== "sample") return call("adminGetSalesCommercialDetail", {organizerId, opportunityId});
  const opportunity = (await getSalesAccount(organizerId)).opportunities.find((item) => item.opportunityId === opportunityId);
  if (!opportunity) throw new Error("Opportunity was not found.");
  const record = sampleRecord(opportunityId);
  return structuredClone({...record, historyTruncated: false, bookedHostRevenueMinor: null,
    paymentStatus: record.settlementAttestation ? "manual_attested" as const : "unknown" as const,
    opportunity: {opportunityId, organizerId, stage: opportunity.stage, revision: opportunity.revision, motion: opportunity.motion,
      ownerUid: opportunity.ownerUid, nextStep: opportunity.nextStep ?? null, nextStepAt: opportunity.nextStepAt ?? null}});
}
export async function listCommercialReport(organizerId: string,
  cursor?: string): Promise<CommercialReport> {
  if (dataMode() !== "sample") return call("adminListSalesCommercialReport", {organizerId, cursor, limit: 25});
  const {opportunities} = await getSalesAccount(organizerId);
  return {pageScope: true, nextCursor: null, rows: opportunities.map(({opportunityId, stage, ownerUid}) => {
    const {pilotPlan, quote, settlementAttestation} = sampleRecord(opportunityId);
    return {opportunityId, stage, ownerUid, pilotStatus: pilotPlan?.status ?? null, pilotRevision: pilotPlan?.revision ?? null,
      quoteStatus: quote?.status ?? null, quoteRevision: quote?.revision ?? null, termVersion: quote?.termVersion ?? null,
      paymentStatus: settlementAttestation ? "manual_attested" as const : "unknown" as const, bookedHostRevenueMinor: null,
      manuallyAttestedHostRevenue: settlementAttestation ? {amountMinor: settlementAttestation.amountMinor,
        currency: settlementAttestation.currency, providerConfirmed: false as const, purpose: "host_subscription" as const} : null};
  })};
}
export async function upsertCommercialPilot(input: CommercialPilotInput):
Promise<{pilotPlan: CommercialDetail["pilotPlan"]}> {
  if (dataMode() !== "sample") return call("adminUpsertSalesPilotPlan", input);
  const record = sampleRecord(input.opportunityId);
  expectSampleRevision(record.pilotPlan?.revision ?? 0, input.expectedRevision);
  const {reviewEvidence, outcomeEvidence, ...plan} = input.plan;
  record.pilotPlan = {...plan, organizerId: input.organizerId, opportunityId: input.opportunityId, revision: input.expectedRevision + 1,
    reviewEvidence: reviewEvidence ? await sampleEvidenceRef(input.organizerId, reviewEvidence.evidenceId) : null,
    outcomeEvidence: outcomeEvidence ? await sampleEvidenceRef(input.organizerId, outcomeEvidence.evidenceId) : null};
  return {pilotPlan: record.pilotPlan};
}
export async function reviseCommercialQuote(input: CommercialQuoteInput):
Promise<{quote: CommercialDetail["quote"]}> {
  if (dataMode() !== "sample") return call("adminReviseSalesQuote", input);
  const record = sampleRecord(input.opportunityId);
  expectSampleRevision(record.quote?.revision ?? 0, input.expectedRevision);
  const termVersion = (record.quote?.termVersion ?? 0) + 1;
  record.quote = {organizerId: input.organizerId, opportunityId: input.opportunityId, quoteId: `sample-quote-${input.opportunityId}`,
    revision: input.expectedRevision + 1, termVersion, status: "draft", approvedDecisionId: null, acceptedDecisionId: null};
  record.quoteVersion = {termVersion, terms: input.terms, termsHash: `sample-${termVersion}`};
  record.approvedDecision = null;
  return {quote: record.quote};
}
async function decideSampleQuote(input: CommercialDecisionInput, status: "approved" | "accepted_reviewed") {
  const record = sampleRecord(input.opportunityId);
  if (!record.quote) throw new Error("Quote was not found.");
  expectSampleRevision(record.quote.revision, input.expectedRevision);
  const decision = {decisionId: `sample-${status}-${input.expectedRevision}`, evidence: await sampleEvidenceRef(input.organizerId, input.evidence.evidenceId)};
  record.quote = {...record.quote, status, revision: input.expectedRevision + 1,
    ...(status === "approved" ? {approvedDecisionId: decision.decisionId} : {acceptedDecisionId: decision.decisionId})};
  if (status === "approved") record.approvedDecision = decision;
  else record.acceptedDecision = decision;
  return {quote: record.quote};
}
export async function approveCommercialQuote(input: CommercialDecisionInput):
Promise<{quote: CommercialDetail["quote"]}> {
  if (dataMode() !== "sample") return call("adminApproveSalesQuote", input);
  return decideSampleQuote(input, "approved");
}
export async function acceptCommercialQuote(input: CommercialDecisionInput):
Promise<{quote: CommercialDetail["quote"]}> {
  if (dataMode() !== "sample") return call("adminAcceptSalesQuote", input);
  return decideSampleQuote(input, "accepted_reviewed");
}
export async function attestHostSettlement(input: CommercialSettlementInput):
Promise<{attestation: CommercialSettlementAttestation}> {
  if (dataMode() !== "sample") return call("adminAttestSalesHostSettlement", input);
  const record = sampleRecord(input.opportunityId);
  if (!record.quote || !record.quoteVersion) throw new Error("Quote was not found.");
  expectSampleRevision(record.quote.revision, input.expectedQuoteRevision);
  const {requestId, expectedQuoteRevision: _expected, evidence, ...fields} = input;
  record.settlementAttestation = {...fields, attestationId: `sample-${requestId}`, quoteId: record.quote.quoteId,
    termsHash: record.quoteVersion.termsHash, settlementIdentityHash: "sample", evidence: await sampleEvidenceRef(input.organizerId, evidence.evidenceId),
    status: "manual_attested_collected", providerConfirmed: false, actorUid: "sample-owner", attestedAt: new Date().toISOString()};
  return {attestation: record.settlementAttestation};
}
export async function closeWonWithFinance(input: CommercialCloseInput):
Promise<{opportunity: CommercialDetail["opportunity"]}> {
  if (dataMode() !== "sample") return call("adminUpsertSalesOpportunity", input);
  const {opportunity} = await upsertSalesOpportunity(input as unknown as SalesUpsertOpportunityInput);
  sampleRecord(input.opportunityId).history.push({fromStage: null, toStage: "closed_won", reason: "Manual collection attested",
    changedAt: new Date().toISOString()});
  return {opportunity: opportunity as unknown as CommercialDetail["opportunity"]};
}
