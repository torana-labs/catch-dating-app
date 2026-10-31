/* eslint-disable max-len */
import {marketForIdOrAlias} from "../../locations/marketConfig";

/**
 * The Admin inbox: one list of everything waiting on a person. Each source
 * document (a Supply Intake request, an organizer claim, a website or partner
 * enquiry, a launch access application, an imported event) projects to one
 * item, and every step it took projects to a journey step. These functions
 * are pure: the store reads and writes, the triggers call the store.
 */

export const INBOX_ITEMS_COLLECTION = "adminInboxItems";
export const INBOX_JOURNEY_COLLECTION = "adminInboxJourney";

export const INBOX_ITEM_TYPES = ["listing", "event", "claim", "enquiry", "access", "stuck"] as const;
export type InboxItemType = typeof INBOX_ITEM_TYPES[number];

export const INBOX_SOURCE_KINDS = ["supplyIntakeRequest", "organizerClaimRequest", "salesInboundIntent", "accessApplication", "externalEvent"] as const;
export type InboxSourceKind = typeof INBOX_SOURCE_KINDS[number];

/** working: nobody needs to act yet. waiting/snoozed: a person does. done: decided or gone. */
export type InboxStatus = "working" | "waiting" | "snoozed" | "done";
export type InboxTone = "neutral" | "info" | "success" | "warning" | "danger";
export type JourneyTone = "ink" | "success" | "warning" | "danger" | "muted";

export interface InboxState {
  code: string;
  label: string;
  tone: InboxTone;
}

export interface InboxRecommendation {
  decision: "approve" | "reject";
  byUid: string;
  at: string;
  note: string;
}

export interface InboxItemDocument {
  schemaVersion: 1;
  itemId: string;
  type: InboxItemType;
  sourceKind: InboxSourceKind;
  sourceId: string;
  sourcePath: string;
  title: string;
  subtitle: string | null;
  cameFrom: string;
  nominatorUid: string | null;
  city: string | null;
  state: InboxState;
  status: InboxStatus;
  waitingSince: string;
  updatedAt: string;
  doneAt: string | null;
  assigneeUid: string | null;
  snoozedUntil: string | null;
  recommendation: InboxRecommendation | null;
}

export interface JourneyStep {
  stepId: string;
  occurredAt: string;
  title: string;
  detail: string | null;
  actorUid: string | null;
  tone: JourneyTone;
}

export interface InboxJourneyStepDocument extends JourneyStep {
  schemaVersion: 1;
  itemId: string;
}

export type InboxLifecycle = "working" | "open" | "closed";

/** What a source document says about its item; the store adds who holds it. */
export interface InboxProjection {
  itemId: string;
  type: InboxItemType;
  sourceKind: InboxSourceKind;
  sourceId: string;
  sourcePath: string;
  title: string;
  subtitle: string | null;
  cameFrom: string;
  nominatorUid: string | null;
  city: string | null;
  state: InboxState;
  lifecycle: InboxLifecycle;
  waitingSince: string;
  closedAt: string | null;
  recommendation: InboxRecommendation | null;
  journey: JourneyStep[];
}

/** Names and places a projection needs from other documents. */
export interface InboxContext {
  organizerName?: string | null;
  organizerCity?: string | null;
  personName?: string | null;
}

export const sourceCollections: Record<InboxSourceKind, string> = {
  supplyIntakeRequest: "supplyIntakeRequests",
  organizerClaimRequest: "organizerClaimRequests",
  salesInboundIntent: "salesInboundIntents",
  accessApplication: "accessApplications",
  externalEvent: "externalEvents",
};

const itemPrefixes: Record<InboxSourceKind, string> = {
  supplyIntakeRequest: "supply",
  organizerClaimRequest: "claim",
  salesInboundIntent: "enquiry",
  accessApplication: "access",
  externalEvent: "event",
};

export function inboxItemId(kind: InboxSourceKind, sourceId: string): string {
  return `${itemPrefixes[kind]}-${sourceId}`;
}

export function journeyStepDocId(itemId: string, stepId: string): string {
  return `${itemId}~${stepId}`;
}

type Data = Record<string, unknown>;

/**
 * Projects one source document. Null when the document never belongs in the
 * inbox (an event refresh, an unreadable document).
 */
export function projectInboxSource(kind: InboxSourceKind, sourceId: string, data: Data,
  context: InboxContext = {}): InboxProjection | null {
  switch (kind) {
  case "supplyIntakeRequest": return projectSupplyIntakeRequest(sourceId, data);
  case "organizerClaimRequest": return projectClaim(sourceId, data, context);
  case "salesInboundIntent": return projectEnquiry(sourceId, data);
  case "accessApplication": return projectAccess(sourceId, data, context);
  case "externalEvent": return projectExternalEvent(sourceId, data, context);
  }
}

const submitterLabels: Record<string, string> = {
  associate: "Sales associate", partner: "Partner", organizer: "The organizer", system: "Discovery",
};

function projectSupplyIntakeRequest(sourceId: string, data: Data): InboxProjection | null {
  const request = record(data.request);
  if (!request || request.kind === "event_refresh") return null;
  const seed = record(request.seed);
  const submittedBy = record(request.submittedBy);
  const origin = record(request.origin);
  const result = record(data.result);
  const failure = record(data.failure);
  const approval = record(data.approval);
  const urls = strings(seed?.urls);
  const submittedAt = iso(request.submittedAt) ?? iso(data.createdAt) ?? epoch;
  const updatedAt = iso(data.updatedAt) ?? submittedAt;
  const who = submitterLabels[String(submittedBy?.role)] ?? "Someone";
  const channel = String(origin?.kind ?? "");
  const cameFrom = channel === "message_nomination" ? `${who} on WhatsApp` :
    channel === "admin_nomination" ? `${who} in Admin` :
      channel === "sales_inbound_intent" ? "Host website" :
        channel === "discovery_run" ? "Discovery" : who;
  const market = marketForIdOrAlias(text(request.market));
  const city = market?.slug ?? text(request.market);
  const journey: JourneyStep[] = [{
    stepId: "submitted",
    occurredAt: submittedAt,
    title: channel === "message_nomination" ? `${who} sent a link on WhatsApp` :
      channel === "sales_inbound_intent" ? "Came in from the host website" :
        channel === "discovery_run" ? "Found by discovery" :
          request.kind === "self_submission" ? "The organizer sent their own details" : `${who} nominated it`,
    detail: urls[0] ?? text(seed?.name),
    actorUid: text(submittedBy?.uid),
    tone: "ink",
  }];
  const receipts = Array.isArray(result?.captureReceipts) ? result.captureReceipts.map(record) : [];
  receipts.forEach((receipt, index) => {
    if (!receipt) return;
    const url = text(receipt.finalUrl) ?? text(receipt.requestedUrl);
    const read = receipt.outcome === "fetched";
    journey.push({
      stepId: `page-${index + 1}`,
      occurredAt: iso(receipt.capturedAt) ?? updatedAt,
      title: read ? `Read ${hostOf(url) ?? "a page"}` : `Could not read ${hostOf(url) ?? "a page"}`,
      detail: read ? url : humanize(text(receipt.outcome)),
      actorUid: null,
      tone: read ? "ink" : "danger",
    });
  });
  const gaps = strings(result?.gaps);
  if (data.status === "completed" && result) {
    const events = nonNegative(result.eventCount);
    journey.push({
      stepId: "listing-built",
      occurredAt: updatedAt,
      title: "Built a listing",
      detail: [`${events} upcoming ${events === 1 ? "event" : "events"}`, gaps.length ? `${gaps.length} to check` : null]
        .filter(Boolean).join(" · "),
      actorUid: null,
      tone: "ink",
    });
  }
  if (failure) {
    journey.push({
      stepId: `failed-${nonNegative(failure.attempts) || 1}`,
      occurredAt: iso(failure.at) ?? updatedAt,
      title: "Could not finish",
      detail: text(failure.message),
      actorUid: null,
      tone: "danger",
    });
  }
  if (approval) {
    const approvedAt = iso(approval.approvedAt) ?? updatedAt;
    journey.push({stepId: "approved", occurredAt: approvedAt, title: "Approved", detail: null,
      actorUid: text(approval.approvedByUid), tone: "success"});
    journey.push({stepId: "published", occurredAt: approvedAt, title: "Published unclaimed, hidden from search",
      detail: "The organizer can claim it", actorUid: null, tone: "success"});
  }

  let type: InboxItemType = "listing";
  let lifecycle: InboxLifecycle;
  let state: InboxState;
  let closedAt: string | null = null;
  if (data.status === "failed") {
    type = "stuck";
    lifecycle = "open";
    state = {code: "needs_person", label: "Needs a person", tone: "danger"};
  } else if (data.status === "completed" && approval) {
    lifecycle = "closed";
    closedAt = iso(approval.approvedAt) ?? updatedAt;
    state = {code: "approved", label: "Approved and published", tone: "success"};
  } else if (data.status === "completed") {
    lifecycle = "open";
    state = market && !market.hostCreatable ?
      {code: "outside_launch_cities", label: "Outside launch cities", tone: "warning"} :
      result?.researchNeeded === true ? {code: "needs_research", label: "Needs research", tone: "warning"} :
        gaps.length ? {code: "gaps", label: `${gaps.length} ${gaps.length === 1 ? "check" : "checks"} left`, tone: "warning"} :
          {code: "ready", label: "Ready to decide", tone: "success"};
  } else {
    lifecycle = "working";
    state = data.status === "running" ?
      {code: "reading", label: "Reading pages", tone: "neutral"} :
      {code: "queued", label: "Queued", tone: "neutral"};
  }
  return {
    itemId: inboxItemId("supplyIntakeRequest", sourceId),
    type,
    sourceKind: "supplyIntakeRequest",
    sourceId,
    sourcePath: `${sourceCollections.supplyIntakeRequest}/${sourceId}`,
    title: text(seed?.name) ?? hostOf(urls[0] ?? null) ?? "Unnamed organizer",
    subtitle: type === "stuck" ? text(failure?.message) : urls[0] ?? null,
    cameFrom,
    nominatorUid: text(submittedBy?.uid),
    city,
    state,
    lifecycle,
    waitingSince: submittedAt,
    closedAt,
    recommendation: null,
    journey,
  };
}

const requesterRoles: Record<string, string> = {
  owner: "owner", founder: "founder", manager: "manager", marketer: "marketer", venueManager: "venue manager", other: "team member",
};

function projectClaim(sourceId: string, data: Data, context: InboxContext): InboxProjection | null {
  const organizerId = text(data.organizerId);
  if (!organizerId) return null;
  const createdAt = iso(data.createdAt) ?? epoch;
  const requester = text(data.requesterName) ?? "Someone";
  const role = requesterRoles[String(data.requesterRole)] ?? "team member";
  const proofs = strings(data.proofUrls).length;
  const recommendation = recommendationOf(data.recommendation);
  const organizerName = context.organizerName ?? "Organizer page";
  const journey: JourneyStep[] = [{
    stepId: "asked", occurredAt: createdAt, title: `Asked to claim ${organizerName}`,
    detail: `${requester}, ${role} · ${proofs} proof ${proofs === 1 ? "link" : "links"}`,
    actorUid: text(data.requesterUid), tone: "ink",
  }];
  if (recommendation) {
    journey.push({stepId: "recommended", occurredAt: recommendation.at,
      title: recommendation.decision === "approve" ? "Recommended approval" : "Recommended rejection",
      detail: recommendation.note, actorUid: recommendation.byUid, tone: "ink"});
  }
  const status = String(data.status);
  const decidedAt = iso(data.decidedAt);
  if (status === "approved" || status === "rejected") {
    journey.push({stepId: "decided", occurredAt: decidedAt ?? iso(data.updatedAt) ?? createdAt,
      title: status === "approved" ? `${requester} runs the page` : "Claim rejected",
      detail: text(data.decisionReason), actorUid: text(data.decidedByUid),
      tone: status === "approved" ? "success" : "warning"});
  } else if (status === "withdrawn" || status === "superseded") {
    journey.push({stepId: "closed", occurredAt: iso(data.updatedAt) ?? createdAt,
      title: status === "withdrawn" ? "Withdrawn by the requester" : "Another claim was verified first",
      detail: null, actorUid: null, tone: "muted"});
  }
  const open = status === "pending";
  const closedLabels: Record<string, InboxState> = {
    approved: {code: "approved", label: "Approved", tone: "success"},
    rejected: {code: "rejected", label: "Rejected", tone: "neutral"},
    withdrawn: {code: "withdrawn", label: "Withdrawn", tone: "neutral"},
    superseded: {code: "superseded", label: "Superseded", tone: "neutral"},
  };
  const state: InboxState = !open ? closedLabels[status] ?? {code: status, label: humanize(status) ?? status, tone: "neutral"} :
    recommendation ? {code: "recommended",
      label: recommendation.decision === "approve" ? "Recommended: approve" : "Recommended: reject",
      tone: recommendation.decision === "approve" ? "success" : "warning"} :
      proofs ? {code: "proof", label: `${proofs} proof ${proofs === 1 ? "link" : "links"}`, tone: "warning"} :
        {code: "no_proof", label: "No proof yet", tone: "danger"};
  return {
    itemId: inboxItemId("organizerClaimRequest", sourceId),
    type: "claim",
    sourceKind: "organizerClaimRequest",
    sourceId,
    sourcePath: `${sourceCollections.organizerClaimRequest}/${sourceId}`,
    title: organizerName,
    subtitle: `Claim by ${requester}, ${role}`,
    cameFrom: "Host app",
    nominatorUid: null,
    city: cityOf(context.organizerCity),
    state,
    lifecycle: open ? "open" : "closed",
    waitingSince: createdAt,
    closedAt: open ? null : decidedAt ?? iso(data.updatedAt) ?? createdAt,
    recommendation,
    journey,
  };
}

function projectEnquiry(sourceId: string, data: Data): InboxProjection | null {
  const createdAt = iso(data.createdAt) ?? epoch;
  const partner = data.source === "partner";
  const status = String(data.status);
  const journey: JourneyStep[] = [{
    stepId: "received", occurredAt: createdAt,
    title: partner ? "A partner nominated an organizer" : "Enquiry from the host website",
    detail: text(data.fullName), actorUid: text(data.partnerUid), tone: "ink",
  }];
  if (status === "linked") {
    journey.push({stepId: "linked", occurredAt: iso(data.linkedAt) ?? iso(data.updatedAt) ?? createdAt,
      title: "Linked to an organizer", detail: text(data.organizerId), actorUid: text(data.linkedBy), tone: "success"});
  } else if (status === "dismissed") {
    journey.push({stepId: "dismissed", occurredAt: iso(data.updatedAt) ?? createdAt, title: "Dismissed",
      detail: null, actorUid: null, tone: "muted"});
  }
  const open = status === "needs_identity_review";
  return {
    itemId: inboxItemId("salesInboundIntent", sourceId),
    type: "enquiry",
    sourceKind: "salesInboundIntent",
    sourceId,
    sourcePath: `${sourceCollections.salesInboundIntent}/${sourceId}`,
    title: text(data.fullName) ?? "Host enquiry",
    subtitle: partner ? "Partner nomination" : "Wants to run events on Catch",
    cameFrom: partner ? "Partner" : "Host website",
    nominatorUid: text(data.partnerUid),
    city: cityOf(text(data.city)),
    state: open ? {code: "new", label: "New", tone: "neutral"} :
      status === "linked" ? {code: "linked", label: "Linked to a host", tone: "success"} :
        {code: "dismissed", label: "Dismissed", tone: "neutral"},
    lifecycle: open ? "open" : "closed",
    waitingSince: createdAt,
    closedAt: open ? null : iso(data.linkedAt) ?? iso(data.updatedAt) ?? createdAt,
    recommendation: null,
    journey,
  };
}

const accessStates: Record<string, InboxState> = {
  waitlisted: {code: "waitlisted", label: "Waitlisted", tone: "neutral"},
  invited: {code: "invited", label: "Invited", tone: "success"},
  approvedForProfile: {code: "approved", label: "Approved", tone: "success"},
  activeMember: {code: "active", label: "Active member", tone: "success"},
  paused: {code: "paused", label: "Paused", tone: "neutral"},
  notSelectedYet: {code: "not_selected", label: "Not selected yet", tone: "neutral"},
};

function projectAccess(sourceId: string, data: Data, context: InboxContext): InboxProjection | null {
  const submittedAt = iso(data.submittedAt) ?? iso(data.createdAt) ?? epoch;
  const status = String(data.status);
  const open = status === "pending";
  const submissions = nonNegative(data.submissionCount) || 1;
  const journey: JourneyStep[] = [{
    stepId: `submitted-${submissions}`, occurredAt: submittedAt,
    title: submissions > 1 ? "Asked for launch access again" : "Asked for launch access",
    detail: text(data.whyCatch), actorUid: sourceId, tone: "ink",
  }];
  const reviewedAt = iso(data.reviewedAt);
  if (!open && reviewedAt) {
    journey.push({stepId: `reviewed-${submissions}`, occurredAt: reviewedAt,
      title: `Decision: ${(accessStates[status]?.label ?? humanize(status) ?? status).toLowerCase()}`,
      detail: text(data.reviewNote), actorUid: text(data.reviewerUid), tone: "success"});
  }
  const wants = data.role === "host" ? "Wants to host" : data.role === "both" ? "Wants to join and host" : "Wants to join";
  return {
    itemId: inboxItemId("accessApplication", sourceId),
    type: "access",
    sourceKind: "accessApplication",
    sourceId,
    sourcePath: `${sourceCollections.accessApplication}/${sourceId}`,
    title: context.personName ?? "Launch access request",
    subtitle: wants,
    cameFrom: text(data.inviteCode) ? "Invite code" : text(data.referralSource) ? `Heard from ${text(data.referralSource)}` : "App sign-up",
    nominatorUid: null,
    city: cityOf(text(data.city)),
    state: open ? {code: "new", label: "New", tone: "neutral"} :
      accessStates[status] ?? {code: status, label: humanize(status) ?? status, tone: "neutral"},
    lifecycle: open ? "open" : "closed",
    waitingSince: submittedAt,
    closedAt: open ? null : reviewedAt ?? iso(data.updatedAt) ?? submittedAt,
    recommendation: null,
    journey,
  };
}

const platformLabels: Record<string, string> = {
  bookMyShow: "BookMyShow", district: "District", luma: "Luma", partiful: "Partiful", sortMyScene: "SortMyScene",
};

function projectExternalEvent(sourceId: string, data: Data, context: InboxContext): InboxProjection | null {
  const external = record(data.externalSource);
  const discovery = record(data.discovery);
  const review = record(data.review);
  const createdAt = iso(data.createdAt) ?? epoch;
  const platform = platformLabels[String(external?.platform)] ?? "an event site";
  const publication = String(data.publicationStatus);
  const open = publication === "draft" && data.status === "active";
  const decidedAt = iso(review?.decidedAt);
  const journey: JourneyStep[] = [{
    stepId: "found", occurredAt: createdAt, title: `Found on ${platform}`,
    detail: text(external?.eventUrl) ?? text(external?.sourceUrl), actorUid: null, tone: "ink",
  }];
  if (!open) {
    journey.push({stepId: `closed-${publication}`, occurredAt: decidedAt ?? iso(data.updatedAt) ?? createdAt,
      title: publication === "public" ? "Published" : data.status === "cancelled" ? "Cancelled" : publication === "removed" ? "Taken down" : "Archived",
      detail: text(review?.note), actorUid: null, tone: publication === "public" ? "success" : "muted"});
  }
  const startsAt = iso(data.startTime);
  return {
    itemId: inboxItemId("externalEvent", sourceId),
    type: "event",
    sourceKind: "externalEvent",
    sourceId,
    sourcePath: `${sourceCollections.externalEvent}/${sourceId}`,
    title: text(data.title) ?? "Imported event",
    subtitle: [context.organizerName ?? null, startsAt ? eventDateLabel(startsAt) : null].filter(Boolean).join(" · ") || null,
    cameFrom: platform === "an event site" ? "Event import" : platform,
    nominatorUid: null,
    city: cityOf(text(discovery?.citySlug)),
    state: open ? (discovery?.manualApprovalRequired === true ?
      {code: "needs_review", label: "Needs a review", tone: "warning"} :
      {code: "ready", label: "Ready to publish", tone: "success"}) :
      publication === "public" ? {code: "published", label: "Published", tone: "success"} :
        {code: publication, label: humanize(publication) ?? publication, tone: "neutral"},
    lifecycle: open ? "open" : "closed",
    waitingSince: createdAt,
    closedAt: open ? null : decidedAt ?? iso(data.updatedAt) ?? createdAt,
    recommendation: null,
    journey,
  };
}

/**
 * The item a projection becomes, keeping who holds it. A snooze holds until it
 * ends; a decided item keeps the moment it was first done.
 */
export function nextInboxItem(projection: InboxProjection, existing: InboxItemDocument | null,
  now: Date): InboxItemDocument {
  const nowIso = now.toISOString();
  const snoozed = existing?.status === "snoozed" && existing.snoozedUntil !== null &&
    existing.snoozedUntil > nowIso;
  const status: InboxStatus = projection.lifecycle === "closed" ? "done" :
    projection.lifecycle === "working" ? "working" : snoozed ? "snoozed" : "waiting";
  return {
    schemaVersion: 1,
    itemId: projection.itemId,
    type: projection.type,
    sourceKind: projection.sourceKind,
    sourceId: projection.sourceId,
    sourcePath: projection.sourcePath,
    title: projection.title.slice(0, 200),
    subtitle: projection.subtitle?.slice(0, 300) ?? null,
    cameFrom: projection.cameFrom.slice(0, 120),
    nominatorUid: projection.nominatorUid,
    city: projection.city,
    state: projection.state,
    status,
    waitingSince: projection.waitingSince,
    updatedAt: nowIso,
    doneAt: status === "done" ? existing?.doneAt ?? projection.closedAt ?? nowIso : null,
    assigneeUid: status === "done" ? null : existing?.assigneeUid ?? null,
    snoozedUntil: status === "snoozed" ? existing?.snoozedUntil ?? null : null,
    recommendation: projection.recommendation,
  };
}

/** The item a source leaves behind when it is deleted. */
export function removedInboxItem(existing: InboxItemDocument, now: Date): InboxItemDocument {
  const nowIso = now.toISOString();
  return {...existing, status: "done", updatedAt: nowIso, doneAt: existing.doneAt ?? nowIso,
    assigneeUid: null, snoozedUntil: null, state: {code: "removed", label: "Removed", tone: "neutral"}};
}

/** Whether a write would change anything a person sees. */
export function sameInboxItem(left: InboxItemDocument, right: InboxItemDocument): boolean {
  return JSON.stringify({...left, updatedAt: ""}) === JSON.stringify({...right, updatedAt: ""});
}

function recommendationOf(value: unknown): InboxRecommendation | null {
  const entry = record(value);
  if (!entry || (entry.decision !== "approve" && entry.decision !== "reject")) return null;
  const byUid = text(entry.byUid);
  const at = iso(entry.at);
  if (!byUid || !at) return null;
  return {decision: entry.decision, byUid, at, note: text(entry.note) ?? ""};
}

const epoch = "1970-01-01T00:00:00.000Z";

/** ISO time from an ISO string, a Firestore Timestamp or its plain-object form. */
export function iso(value: unknown): string | null {
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
  }
  if (!value || typeof value !== "object") return null;
  const stamp = value as {toDate?: () => Date; _seconds?: unknown; seconds?: unknown; _nanoseconds?: unknown; nanoseconds?: unknown};
  if (typeof stamp.toDate === "function") return stamp.toDate().toISOString();
  const seconds = stamp._seconds ?? stamp.seconds;
  const nanos = stamp._nanoseconds ?? stamp.nanoseconds ?? 0;
  return typeof seconds === "number" && typeof nanos === "number" ?
    new Date(seconds * 1000 + Math.floor(nanos / 1e6)).toISOString() : null;
}

function cityOf(value: string | null | undefined): string | null {
  if (!value) return null;
  return marketForIdOrAlias(value)?.slug ?? value.slice(0, 80);
}

function eventDateLabel(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
    timeZone: "Asia/Kolkata"}).format(new Date(value));
}

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./u, "");
  } catch {
    return null;
  }
}

function humanize(value: string | null): string | null {
  if (!value) return null;
  const words = value.replace(/([a-z0-9])([A-Z])/gu, "$1 $2").replace(/[_-]+/gu, " ").trim().toLowerCase();
  return words ? words[0].toUpperCase() + words.slice(1) : null;
}

function record(value: unknown): Data | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Data : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function nonNegative(value: unknown): number {
  return Number.isSafeInteger(value) && (value as number) >= 0 ? value as number : 0;
}
