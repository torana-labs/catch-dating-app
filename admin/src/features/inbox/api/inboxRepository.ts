import {httpsCallable} from "firebase/functions";
import type {AdminListInboxItemsCallablePayload} from
  "../../../generated/contracts/adminListInboxItemsCallablePayload";
import type {AdminListInboxItemsCallableResponse} from
  "../../../generated/contracts/adminListInboxItemsCallableResponse";
import type {AdminGetInboxItemCallableResponse} from
  "../../../generated/contracts/adminGetInboxItemCallableResponse";
import type {AdminUpdateInboxItemCallablePayload} from
  "../../../generated/contracts/adminUpdateInboxItemCallablePayload";
import type {AdminUpdateInboxItemCallableResponse} from
  "../../../generated/contracts/adminUpdateInboxItemCallableResponse";
import type {AdminRecommendOrganizerClaimCallablePayload} from
  "../../../generated/contracts/adminRecommendOrganizerClaimCallablePayload";
import type {AdminRecommendOrganizerClaimCallableResponse} from
  "../../../generated/contracts/adminRecommendOrganizerClaimCallableResponse";
import {decideAccessApplication, decideOrganizerClaim, listOrganizerDetails} from "../../../shared/api/adminApi";
import {dataMode} from "../../../shared/api/dataMode";
import {functions} from "../../../shared/api/firebaseFunctions";
import {sampleInboxItems as sampleItems, sampleInboxJourneys as sampleJourneys, sampleNow} from "./inboxSampleData";

export type InboxPage = AdminListInboxItemsCallableResponse;
export type InboxQuery = AdminListInboxItemsCallablePayload;
export type InboxScope = InboxQuery["scope"];
export type InboxType = NonNullable<InboxQuery["type"]>;
export type InboxItem = InboxPage["items"][number];
export type InboxItemDetail = AdminGetInboxItemCallableResponse;
export type JourneyStep = InboxItemDetail["journey"][number];
export type InboxUpdate = AdminUpdateInboxItemCallablePayload;
export type ClaimRecommendationInput = AdminRecommendOrganizerClaimCallablePayload;

// The validators load on first call, not in the inbox chunk.
async function call<Request extends object, Response>(name: string, payload: Request): Promise<Response> {
  const {validateAdminCallableRequest, validateAdminCallableResponse} =
    await import("../../../generated/validators/adminCallableValidators")
      .then((validators) => validators.loadAdminCallableValidators(name));
  validateAdminCallableRequest(name, payload);
  const result = await httpsCallable<Request, Response>(functions, name)(payload);
  validateAdminCallableResponse(name, result.data);
  return result.data;
}

const sampleState = new Map(sampleItems.map((item) => [item.itemId, item]));
const sampleUpdates = new Map<string, JourneyStep[]>();

function samplePage(query: InboxQuery): InboxPage {
  const items = [...sampleState.values()];
  const inScope = (item: InboxItem, scope: InboxScope) =>
    scope === "mine" ? item.status === "waiting" && item.assigneeUid === "sample-owner" : item.status === scope;
  const scoped = items.filter((item) => inScope(item, query.scope) && (!query.city || item.city === query.city))
    .sort((left, right) => left.waitingSince.localeCompare(right.waitingSince));
  const count = (type: InboxType) => scoped.filter((item) => item.type === type).length;
  const waiting = items.filter((item) => inScope(item, "waiting"));
  return {
    generatedAt: new Date(sampleNow).toISOString(),
    scope: query.scope, type: query.type, city: query.city,
    items: scoped.filter((item) => !query.type || item.type === query.type).slice(0, query.limit),
    nextCursor: null,
    totals: {
      scopes: {waiting: waiting.length, mine: items.filter((item) => inScope(item, "mine")).length,
        snoozed: items.filter((item) => item.status === "snoozed").length,
        working: items.filter((item) => item.status === "working").length},
      types: {all: scoped.length, listing: count("listing"), event: count("event"), claim: count("claim"),
        enquiry: count("enquiry"), access: count("access"), stuck: count("stuck")},
    },
    oldestWaitingSince: waiting.sort((left, right) => left.waitingSince.localeCompare(right.waitingSince))[0]?.waitingSince ?? null,
  };
}

/** One page of the inbox with real totals per scope and type. */
export async function listInboxItems(query: InboxQuery): Promise<InboxPage> {
  if (dataMode() !== "sample") return call("adminListInboxItems", query);
  return samplePage(query);
}

/** One item and every step it took. */
export async function getInboxItem(itemId: string): Promise<InboxItemDetail> {
  if (dataMode() !== "sample") return call("adminGetInboxItem", {itemId});
  const item = sampleState.get(itemId);
  if (!item) throw new Error("This inbox item was not found.");
  return {item, journey: [...(sampleJourneys[itemId] ?? []), ...(sampleUpdates.get(itemId) ?? [])],
    canWork: item.status !== "done", canDecideClaim: item.type === "claim"};
}

/** Assign, unassign, snooze or wake an item. */
export async function updateInboxItem(input: InboxUpdate): Promise<AdminUpdateInboxItemCallableResponse> {
  if (dataMode() !== "sample") return call("adminUpdateInboxItem", input);
  const before = sampleState.get(input.itemId);
  if (!before) throw new Error("This inbox item was not found.");
  const dismissed = input.action === "dismiss";
  const item: InboxItem = {...before,
    ...(dismissed ? {status: "done" as const, state: {code: "dismissed", label: "Dismissed", tone: "neutral" as const},
      doneAt: new Date().toISOString()} : {}),
    assigneeUid: input.action === "assign" ? input.assigneeUid : input.action === "unassign" ? null : before.assigneeUid,
    status: dismissed ? "done" : input.action === "snooze" ? "snoozed" : input.action === "wake" || input.action === "reopen" ? "waiting" : before.status,
    snoozedUntil: input.action === "snooze" ? input.snoozedUntil : input.action === "wake" ? null : before.snoozedUntil};
  sampleState.set(item.itemId, item);
  const titles = {assign: "Assigned", unassign: "Unassigned", snooze: "Snoozed", wake: "Back in the inbox",
    dismiss: "Dismissed", reopen: "Back in the inbox"};
  sampleUpdates.set(item.itemId, [...(sampleUpdates.get(item.itemId) ?? []), {stepId: `staff-${Date.now()}`,
    occurredAt: new Date().toISOString(), title: titles[input.action], detail: input.note, actorUid: "sample-owner", tone: "ink"}]);
  return {item};
}

/** Ops recommend a claim; the owner decides it. */
export async function recommendOrganizerClaim(
  input: ClaimRecommendationInput
): Promise<AdminRecommendOrganizerClaimCallableResponse> {
  if (dataMode() !== "sample") return call("adminRecommendOrganizerClaim", input);
  const recommendation = {decision: input.decision, byUid: "sample-owner", at: new Date().toISOString(), note: input.note};
  const item = [...sampleState.values()].find((entry) => entry.type === "claim" && entry.sourceId === input.requestId);
  if (item) {
    sampleState.set(item.itemId, {...item, recommendation, state: {code: "recommended",
      label: input.decision === "approve" ? "Recommended: approve" : "Recommended: reject",
      tone: input.decision === "approve" ? "success" : "warning"}});
  }
  return {requestId: input.requestId, status: "pending", recommendation};
}

/** The owner approves or rejects a claim; the inbox item closes when the claim does. */
export async function decideClaim(input: {requestId: string; decision: "approve" | "reject"; decisionReason: string | null}) {
  const result = await decideOrganizerClaim(input);
  if (dataMode() === "sample") closeSampleItem("organizerClaimRequest", input.requestId,
    input.decision === "approve" ? "Approved" : "Rejected");
  return result;
}

/** Ops approve or deny launch access. */
export async function decideAccess(input: {applicationUid: string; decision: "approve" | "deny"; note: string}) {
  const result = await decideAccessApplication({...input, cohortId: null});
  if (dataMode() === "sample") closeSampleItem("accessApplication", input.applicationUid,
    input.decision === "approve" ? "Approved" : "Not selected yet");
  return result;
}

function closeSampleItem(kind: InboxItem["sourceKind"], sourceId: string, label: string) {
  const item = [...sampleState.values()].find((entry) => entry.sourceKind === kind && entry.sourceId === sourceId);
  if (item) sampleState.set(item.itemId, {...item, status: "done", doneAt: new Date().toISOString(),
    state: {code: "decided", label, tone: "success"}});
}

/** Organizers Catch lists, by name, to link an enquiry to. */
export async function searchOrganizers(query: string): Promise<Array<{organizerId: string; name: string; city: string | null}>> {
  const response = await listOrganizerDetails({query, limit: 10});
  return response.rows.map((row) => ({organizerId: row.organizerId, name: row.name, city: row.cityName}));
}

/**
 * Links a website or partner enquiry to the organizer it is about, which
 * opens their Sales work. The enquiry's current revision is read first, so a
 * stale link is refused rather than applied.
 */
export async function linkEnquiry(input: {intentId: string; organizerId: string}): Promise<void> {
  if (dataMode() === "sample") {
    closeSampleItem("salesInboundIntent", input.intentId, "Linked to a host");
    return;
  }
  const page = await call<{status: string; limit: number}, {rows: Array<{intentId: string; revision: number}>}>(
    "adminListSalesInboundIntents", {status: "needs_identity_review", limit: 50});
  const intent = page.rows.find((row) => row.intentId === input.intentId);
  if (!intent) throw new Error("This enquiry is no longer waiting to be linked. Reload the inbox.");
  await call("adminLinkSalesInboundIntent", {intentId: input.intentId, organizerId: input.organizerId,
    requestId: crypto.randomUUID(), expectedRevision: intent.revision});
}
