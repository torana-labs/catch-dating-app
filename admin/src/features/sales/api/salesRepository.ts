import {validateAdminCallableRequest, validateAdminCallableResponse} from
  "../../../generated/validators/adminCallableValidators";
import {httpsCallable} from "firebase/functions";
import {functions} from "../../../shared/api/firebaseFunctions";
import {dataMode} from "../../../shared/api/dataMode";
import {listClubDetails} from "../../../shared/api/adminApi";
import type {AdminClubListRow} from "../../../shared/types/adminTypes";
import type {
  SalesAccount, SalesAccountDetail, SalesAccountSummary, SalesActivity,
  SalesCreateAccountInput, SalesCreateCustomFieldInput, SalesCustomFieldDefinition,
  SalesCustomFieldValue, SalesInboundIntent, SalesLinkInboundIntentInput,
  SalesListAccountsInput,
  SalesListInboundIntentsInput, SalesListOpportunitiesInput, SalesListTasksInput,
  SalesNominateOrganizerInput, SalesNomination, SalesOpportunity, SalesPage,
  SalesRecordActivityInput, SalesSetCustomFieldValueInput,
  SalesTask, SalesUpdateAccountInput,
  SalesUpsertOpportunityInput, SalesUpsertTaskInput,
  SalesContact, SalesContactInput, SalesEvidence, SalesEvidenceInput,
  SalesImportPacket, SalesImportPreview, SalesSetAccountSuppressionInput,
  SalesImportCompensationInput, SalesImportCompensationPreview,
  SalesImportCompensationResult,
  SalesSetContactabilityInput, SalesEvidenceProposal, SalesReviewEvidenceProposalInput,
} from "./salesTypes";

type MutationReceipt = {requestId: string; revision: number};

function call<Request extends object, Response>(name: string, payload: Request): Promise<Response> {
  // Firebase encodes undefined object fields as null. Optional request fields
  // must remain absent; explicit null values still represent intentional clears.
  const request = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  ) as Request;
  validateAdminCallableRequest(name, request);
  return httpsCallable<Request, Response>(functions, name)(request).then(
    (result) => {
      validateAdminCallableResponse(name, result.data);
      return result.data;
    }
  );
}

const sampleNames = [
  ["Harbor Social Club", "Mumbai", "social"],
  ["Northside Walks", "Delhi", "walks"],
  ["The Sunday Table", "Bengaluru", "dinners"],
  ["Meetup Circle", "Pune", "community"],
  ["City Stories", "Hyderabad", "culture"],
  ["Mango Grove Events", "Jaipur", "music"],
  ["Blue Door Collective", "Chennai", "workshops"],
  ["Weekend Assembly", "Kolkata", "social"],
  ["Common Ground", "Ahmedabad", "community"],
  ["Seaside Sessions", "Goa", "music"],
] as const;

const sampleDetails = new Map<string, SalesAccountDetail>(sampleNames.map(
  ([name, city, eventType], index) => {
    const organizerId = `sample-sales-${index + 1}`;
    const researchStatus = index < 3 ? "qualified" :
      index < 6 ? "needs_research" : "ready_for_review";
    return [organizerId, {
      account: {
        organizerId, revision: 1, researchStatus,
        assignedOwnerUid: index % 2 ? "sample-colleague" : "sample-owner",
        summary: `${name} runs ${eventType} events in ${city}. This is sample research for workspace review.`,
        nextAction: index < 4 ? "Confirm the next event and workflow" :
          "Review the organizer's current process",
      },
      organizerSummary: {
        name, city, market: "India", eventTypes: [eventType],
        appVisibility: "hidden", claimStatus: "unclaimed",
      },
      activities: [],
      tasks: index < 5 ? [{
        taskId: `sample-task-${index + 1}`, organizerId, kind: "follow_up",
        title: "Review research and agree a next step",
        dueAt: new Date(Date.now() + (index - 2) * 86_400_000).toISOString(),
        ownerUid: index % 2 ? "sample-colleague" : "sample-owner",
        status: "open", revision: 1,
      }] : [],
      opportunities: index < 4 ? [{
        opportunityId: `sample-opportunity-${index + 1}`, organizerId,
        motion: "first_workflow_pilot", stage: "new_enquiry",
        ownerUid: index % 2 ? "sample-colleague" : "sample-owner",
        nextStep: "Confirm the next event", nextStepAt: new Date(
          Date.now() + 3 * 86_400_000
        ).toISOString(), revision: 1,
      }] : [],
      customValues: [],
    }];
  }
));

const sampleReceipts = new Map<string, unknown>();
const sampleCustomFields: SalesCustomFieldDefinition[] = [];
const sampleContacts = new Map<string, SalesContact[]>();
const sampleEvidence = new Map<string, SalesEvidence[]>();

function sampleDetail(organizerId: string): SalesAccountDetail {
  const detail = sampleDetails.get(organizerId);
  if (!detail) throw new Error("Host was not found in this sample workspace.");
  return detail;
}

function replayOrStore<T>(requestId: string, create: () => T): T {
  if (sampleReceipts.has(requestId)) return sampleReceipts.get(requestId) as T;
  const result = create();
  sampleReceipts.set(requestId, result);
  return result;
}

function pageRows<T>(rows: T[], cursor: string | undefined, limit: number): SalesPage<T> {
  const offset = cursor ? Number(cursor) : 0;
  if (!Number.isInteger(offset) || offset < 0) throw new Error("Invalid page cursor.");
  const page = rows.slice(offset, offset + limit);
  return {rows: page, nextCursor: offset + limit < rows.length ?
    String(offset + limit) : null};
}

export async function listSalesAccounts(
  input: SalesListAccountsInput
): Promise<SalesPage<SalesAccountSummary>> {
  if (dataMode() !== "sample") {
    return call("adminListSalesAccounts", input);
  }
  const query = input.query?.trim().toLocaleLowerCase() ?? "";
  const rows = [...sampleDetails.values()].map((detail): SalesAccountSummary => ({
    organizerId: detail.account.organizerId,
    name: detail.organizerSummary.name,
    city: detail.organizerSummary.city,
    market: detail.organizerSummary.market,
    marketLabel: detail.organizerSummary.marketLabel,
    eventTypes: detail.organizerSummary.eventTypes,
    researchStatus: detail.account.researchStatus,
    fitLabel: detail.account.researchStatus === "qualified" ? "Strong fit" : null,
    stage: detail.opportunities[0]?.stage ?? null,
    assignedOwnerUid: detail.account.assignedOwnerUid,
    nextAction: detail.account.nextAction,
  })).filter((row) =>
    (!query || [row.name, row.city, row.market, row.organizerId]
      .filter((value): value is string => Boolean(value))
      .flatMap((value) => value.toLocaleLowerCase().split(/[^a-z0-9]+/u))
      .includes(query)) &&
    (!input.ownerUid || row.assignedOwnerUid === input.ownerUid) &&
    (!input.researchStatus || row.researchStatus === input.researchStatus)
  ).sort((a, b) => a.organizerId.localeCompare(b.organizerId));
  return pageRows(rows, input.cursor, input.limit ?? 25);
}

export async function searchCanonicalOrganizers(query: string): Promise<AdminClubListRow[]> {
  const response = await listClubDetails({query, limit: 25});
  return response.rows;
}

export async function getSalesAccount(organizerId: string): Promise<SalesAccountDetail> {
  if (dataMode() !== "sample") {
    return call("adminGetSalesAccount", {organizerId});
  }
  return structuredClone(sampleDetail(organizerId));
}

export async function listSalesTasks(
  input: SalesListTasksInput
): Promise<SalesPage<SalesTask>> {
  if (dataMode() !== "sample") return call("adminListSalesTasks", input);
  const rows = [...sampleDetails.values()].flatMap((detail) => detail.tasks)
    .filter((task) => (!input.status || task.status === input.status) &&
      (!input.ownerUid || task.ownerUid === input.ownerUid))
    .sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? "") ||
      a.taskId.localeCompare(b.taskId));
  return pageRows(rows, input.cursor, input.limit ?? 25);
}

export async function listSalesOpportunities(
  input: SalesListOpportunitiesInput
): Promise<SalesPage<SalesOpportunity>> {
  if (dataMode() !== "sample") return call("adminListSalesOpportunities", input);
  const rows = [...sampleDetails.values()].flatMap((detail) => detail.opportunities)
    .filter((item) => (!input.stage || item.stage === input.stage) &&
      (!input.ownerUid || item.ownerUid === input.ownerUid))
    .sort((a, b) => (a.nextStepAt ?? "").localeCompare(b.nextStepAt ?? "") ||
      a.opportunityId.localeCompare(b.opportunityId));
  return pageRows(rows, input.cursor, input.limit ?? 25);
}

export async function listSalesInboundIntents(
  input: SalesListInboundIntentsInput
): Promise<SalesPage<SalesInboundIntent>> {
  if (dataMode() !== "sample") return call("adminListSalesInboundIntents", input);
  return {rows: [], nextCursor: null};
}

export async function linkSalesInboundIntent(
  input: SalesLinkInboundIntentInput
): Promise<{intent: SalesInboundIntent; task: SalesTask;
  activity: SalesActivity; receipt: MutationReceipt}> {
  if (dataMode() !== "sample") return call("adminLinkSalesInboundIntent", input);
  throw new Error("Sample mode has no website enquiries to link.");
}

export async function listSalesCustomFields(): Promise<{
  rows: SalesCustomFieldDefinition[];
}> {
  if (dataMode() !== "sample") return call("adminListSalesCustomFields", {});
  return {rows: structuredClone(sampleCustomFields)};
}

export async function createSalesCustomField(input: SalesCreateCustomFieldInput): Promise<{
  field: SalesCustomFieldDefinition; receipt: MutationReceipt;
}> {
  if (dataMode() !== "sample") return call("adminCreateSalesCustomField", input);
  return replayOrStore(input.requestId, () => {
    if (sampleCustomFields.some((field) => field.fieldId === input.field.fieldId)) {
      throw new Error("A field with this name already exists. Review existing fields first.");
    }
    const field: SalesCustomFieldDefinition = {...input.field, revision: 1};
    sampleCustomFields.push(field);
    return {field, receipt: {requestId: input.requestId, revision: 1}};
  });
}

export async function setSalesCustomFieldValue(
  input: SalesSetCustomFieldValueInput
): Promise<{organizerId: string; fieldId: string; value: unknown;
  revision: number; receipt: MutationReceipt}> {
  if (dataMode() !== "sample") return call("adminSetSalesCustomFieldValue", input);
  return replayOrStore(input.requestId, () => {
    const detail = sampleDetail(input.organizerId);
    const current = detail.customValues?.find((item) => item.fieldId === input.fieldId);
    if ((current?.revision ?? 0) !== input.expectedRevision) {
      throw new Error("Someone updated this field. Reload before saving.");
    }
    const value: SalesCustomFieldValue = {fieldId: input.fieldId,
      value: input.value, revision: input.expectedRevision + 1};
    detail.customValues = [...(detail.customValues ?? []).filter((item) =>
      item.fieldId !== input.fieldId), value];
    return {organizerId: input.organizerId, fieldId: input.fieldId,
      value: input.value, revision: value.revision,
      receipt: {requestId: input.requestId, revision: value.revision}};
  });
}

export async function updateSalesAccount(input: SalesUpdateAccountInput): Promise<{
  account: SalesAccount; receipt: MutationReceipt;
}> {
  if (dataMode() !== "sample") return call("adminUpdateSalesAccount", input);
  return replayOrStore(input.requestId, () => {
    const detail = sampleDetail(input.organizerId);
    if (detail.account.revision !== input.expectedRevision) {
      throw new Error("Someone updated this host. Reload and compare changes before saving.");
    }
    detail.account = {...detail.account, ...input.patch,
      revision: detail.account.revision + 1};
    return {account: structuredClone(detail.account), receipt: {
      requestId: input.requestId, revision: detail.account.revision,
    }};
  });
}

export async function createSalesAccount(input: SalesCreateAccountInput): Promise<{
  account: SalesAccount; receipt: MutationReceipt;
}> {
  if (dataMode() !== "sample") return call("adminCreateSalesAccount", input);
  return replayOrStore(input.requestId, () => {
    if (sampleDetails.has(input.organizerId)) {
      throw new Error("This organizer already has a Sales record.");
    }
    const account: SalesAccount = {organizerId: input.organizerId, revision: 1,
      researchStatus: "new", assignedOwnerUid: "sample-owner", summary: null,
      nextAction: null};
    sampleDetails.set(input.organizerId, {
      account, organizerSummary: {name: input.organizerId,
        city: null, market: null, eventTypes: [], appVisibility: "hidden",
        claimStatus: "unclaimed"},
      tasks: [], opportunities: [], activities: [], customValues: [],
    });
    return {account, receipt: {requestId: input.requestId, revision: 1}};
  });
}

/** Queues the organizer for Supply Intake; staff review the listing it builds. */
export async function nominateSalesOrganizer(
  input: SalesNominateOrganizerInput
): Promise<SalesNomination> {
  if (dataMode() !== "sample") return call("adminNominateOrganizer", input);
  return replayOrStore(input.requestId, () => ({
    requestId: `nom-${"0".repeat(40)}`, created: true, status: "queued" as const,
  }));
}

export async function upsertSalesTask(input: SalesUpsertTaskInput): Promise<{
  task: SalesTask; receipt: MutationReceipt;
}> {
  if (dataMode() !== "sample") return call("adminUpsertSalesTask", input);
  return replayOrStore(input.requestId, () => {
    const detail = sampleDetail(input.organizerId);
    const current = detail.tasks.find((task) => task.taskId === input.taskId);
    if (current && current.revision !== input.expectedRevision) {
      throw new Error("Someone updated this task. Reload before saving.");
    }
    const task: SalesTask = {
      taskId: current?.taskId ?? crypto.randomUUID(),
      organizerId: input.organizerId, ...input.task,
      revision: (current?.revision ?? 0) + 1,
    };
    detail.tasks = current ? detail.tasks.map((row) =>
      row.taskId === task.taskId ? task : row) : [...detail.tasks, task];
    return {task, receipt: {requestId: input.requestId, revision: task.revision}};
  });
}

export async function recordSalesActivity(input: SalesRecordActivityInput): Promise<{
  activity: SalesActivity; receipt: MutationReceipt;
}> {
  if (dataMode() !== "sample") return call("adminRecordSalesActivity", input);
  return replayOrStore(input.requestId, () => {
    const detail = sampleDetail(input.organizerId);
    const activity: SalesActivity = {
      activityId: crypto.randomUUID(), type: input.type,
      occurredAt: input.occurredAt, note: input.note,
      channel: input.channel ?? null,
      outcome: input.type === "outreach_sent_manual" ? "actor_attested_sent" : null,
      providerConfirmed: false,
    };
    detail.activities.unshift(activity);
    return {activity, receipt: {requestId: input.requestId, revision: 1}};
  });
}

export async function upsertSalesOpportunity(
  input: SalesUpsertOpportunityInput
): Promise<{opportunity: SalesOpportunity; receipt: MutationReceipt}> {
  if (dataMode() !== "sample") return call("adminUpsertSalesOpportunity", input);
  return replayOrStore(input.requestId, () => {
    const detail = sampleDetail(input.organizerId);
    const current = detail.opportunities.find((item) =>
      item.opportunityId === input.opportunityId);
    if (current && current.revision !== input.expectedRevision) {
      throw new Error("Someone updated this opportunity. Reload before saving.");
    }
    const opportunity: SalesOpportunity = {
      opportunityId: current?.opportunityId ?? crypto.randomUUID(),
      organizerId: input.organizerId, ...input.fields,
      revision: (current?.revision ?? 0) + 1,
    };
    detail.opportunities = current ? detail.opportunities.map((item) =>
      item.opportunityId === opportunity.opportunityId ? opportunity : item) :
      [...detail.opportunities, opportunity];
    return {opportunity, receipt: {requestId: input.requestId,
      revision: opportunity.revision}};
  });
}

export async function listSalesContacts(organizerId: string, cursor?: string):
Promise<SalesPage<SalesContact>> {
  if (dataMode() !== "sample") return call("adminListSalesContacts", {
    organizerId, limit: 25, cursor,
  });
  return pageRows(structuredClone(sampleContacts.get(organizerId) ?? []), cursor, 25);
}

export async function listSalesEvidence(organizerId: string, cursor?: string):
Promise<SalesPage<SalesEvidence>> {
  if (dataMode() !== "sample") return call("adminListSalesEvidence", {
    organizerId, limit: 25, cursor,
  });
  return pageRows(structuredClone(sampleEvidence.get(organizerId) ?? []), cursor, 25);
}

export async function upsertSalesContact(input: SalesContactInput): Promise<{
  contact: {contactId: string; displayName: string};
  relationship: SalesContact["relationship"]; receipt: MutationReceipt;
}> {
  if (dataMode() !== "sample") return call("adminUpsertSalesContact", input);
  return replayOrStore(input.requestId, () => {
    sampleDetail(input.organizerId);
    const rows = sampleContacts.get(input.organizerId) ?? [];
    const current = rows.find((item) => item.contactId === input.contactId);
    if ((current?.relationship.revision ?? 0) !== input.expectedRevision) {
      throw new Error("Contact relationship changed since review.");
    }
    const contactId = current?.contactId ?? crypto.randomUUID();
    const relationship: SalesContact["relationship"] = {
      ...input.relationship, revision: input.expectedRevision + 1,
      contactabilityStatus: current?.relationship.contactabilityStatus ?? "unknown",
      contactabilityReason: current?.relationship.contactabilityReason ?? null,
      draftReviewEvidenceId: current?.relationship.draftReviewEvidenceId ?? null,
      sendAuthority: false,
    };
    const row = {contactId, displayName: input.contact.displayName, relationship};
    sampleContacts.set(input.organizerId, [...rows.filter((item) =>
      item.contactId !== contactId), row]);
    return {contact: {contactId, displayName: row.displayName}, relationship,
      receipt: {requestId: input.requestId, revision: relationship.revision}};
  });
}

export async function addSalesEvidence(input: SalesEvidenceInput): Promise<{
  evidence: SalesEvidence; receipt: MutationReceipt;
}> {
  if (dataMode() !== "sample") return call("adminAddSalesEvidence", input);
  return replayOrStore(input.requestId, () => {
    sampleDetail(input.organizerId);
    if (input.contactId && !(sampleContacts.get(input.organizerId) ?? [])
      .some((row) => row.contactId === input.contactId)) {
      throw new Error("Contact evidence requires an existing relationship.");
    }
    const evidence: SalesEvidence = {
      evidenceId: crypto.randomUUID(), organizerId: input.organizerId,
      contactId: input.contactId ?? null, claimKey: input.claimKey,
      signalId: input.signalId ?? null, sourceType: input.sourceType,
      sourceRef: input.sourceRef, observedAt: input.observedAt,
      validThrough: input.validThrough ?? null, confidence: input.confidence,
      normalizedValue: input.normalizedValue ?? null, excerpt: input.excerpt ?? null,
    };
    sampleEvidence.set(input.organizerId, [evidence,
      ...(sampleEvidence.get(input.organizerId) ?? [])]);
    return {evidence, receipt: {requestId: input.requestId, revision: 1}};
  });
}

export async function setSalesAccountSuppression(
  input: SalesSetAccountSuppressionInput
): Promise<{account: SalesAccount; decision: unknown; receipt: MutationReceipt}> {
  if (dataMode() !== "sample") return call("adminSetSalesAccountSuppression", input);
  return replayOrStore(input.requestId, () => {
    const detail = sampleDetail(input.organizerId);
    if (detail.account.revision !== input.expectedRevision) {
      throw new Error("Account changed since review.");
    }
    detail.account = {...detail.account, suppressionStatus: input.status,
      revision: detail.account.revision + 1};
    return {account: structuredClone(detail.account), decision: {reason: input.reason},
      receipt: {requestId: input.requestId, revision: detail.account.revision}};
  });
}

export async function setSalesContactability(
  input: SalesSetContactabilityInput
): Promise<{relationship: SalesContact["relationship"];
  decision: unknown; receipt: MutationReceipt}> {
  if (dataMode() !== "sample") return call("adminSetSalesContactability", input);
  return replayOrStore(input.requestId, () => {
    const rows = sampleContacts.get(input.organizerId) ?? [];
    const current = rows.find((row) => row.contactId === input.contactId);
    if (!current) throw new Error("Contact was not found.");
    if (current.relationship.revision !== input.expectedRevision) {
      throw new Error("Contact relationship changed since review.");
    }
    if (input.status === "draft_reviewed" && !(sampleEvidence.get(input.organizerId) ?? [])
      .some((row) => row.evidenceId === input.evidenceId &&
        row.contactId === input.contactId)) {
      throw new Error("Reviewed contact evidence is required.");
    }
    const relationship: SalesContact["relationship"] = {
      ...current.relationship, revision: current.relationship.revision + 1,
      contactabilityStatus: input.status, contactabilityReason: input.reason,
      draftReviewEvidenceId: input.status === "draft_reviewed" ? input.evidenceId : null,
      sendAuthority: false,
    };
    sampleContacts.set(input.organizerId, rows.map((row) =>
      row.contactId === input.contactId ? {...row, relationship} : row));
    return {relationship, decision: {reason: input.reason},
      receipt: {requestId: input.requestId, revision: relationship.revision}};
  });
}

export async function previewSalesImport(packet: SalesImportPacket):
Promise<SalesImportPreview> {
  if (dataMode() !== "sample") return call("adminPreviewSalesImport", packet);
  throw new Error("Reviewed imports require a live employee workspace.");
}

export async function applySalesImport(input: SalesImportPacket & {
  requestId: string; previewHash: string;
}): Promise<{importId: string; rows: SalesImportPreview["rows"];
  counts: Record<string, number>; effectsApplied: true; receipt: MutationReceipt}> {
  if (dataMode() !== "sample") return call("adminApplySalesImport", input);
  throw new Error("Reviewed imports require a live employee workspace.");
}

export async function previewSalesImportCompensation(
  input: SalesImportCompensationInput
): Promise<SalesImportCompensationPreview> {
  if (dataMode() !== "sample") {
    return call("adminPreviewSalesImportCompensation", input);
  }
  throw new Error("Compensation requires a live Admin Owner workspace.");
}

export async function applySalesImportCompensation(
  input: SalesImportCompensationInput & {requestId: string;
    previewHash: string; reason: string}
): Promise<SalesImportCompensationResult> {
  if (dataMode() !== "sample") {
    return call("adminApplySalesImportCompensation", input);
  }
  throw new Error("Compensation requires a live Admin Owner workspace.");
}

export async function listSalesEvidenceProposals(organizerId: string, cursor?: string):
Promise<SalesPage<SalesEvidenceProposal>> {
  if (dataMode() === "sample") return {rows: [], nextCursor: null};
  return call("adminListSalesEvidenceProposals", {organizerId, limit: 25,
    ...(cursor ? {cursor} : {})});
}
export async function reviewSalesEvidenceProposal(input: SalesReviewEvidenceProposalInput):
Promise<{proposal: SalesEvidenceProposal; receipt: MutationReceipt}> {
  if (dataMode() === "sample") throw new Error("Evidence suggestions require live data.");
  return call("adminReviewSalesEvidenceProposal", input);
}
