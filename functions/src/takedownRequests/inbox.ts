/* eslint-disable max-len */
import {iso, type InboxProjection, type InboxState, type JourneyStep} from "../admin/inbox/model";
import {
  TAKEDOWN_REQUESTS_COLLECTION, isOpenStatus, requestTypeLabels, type RequestType, type RequestStatus,
} from "./model";

// A listing request is a staff task in the Admin Inbox (type "takedown"):
// acknowledge within 24 hours, verify, then action it with a fixed outcome or
// decline it with a fixed reason. An appeal reopens it. The kind is
// registered in functions/src/admin/inbox/model.ts like walkthroughBooking.

export const TAKEDOWN_INBOX_SOURCE_KIND = "takedownRequest";

export function takedownInboxItemId(requestId: string): string {
  return `takedown-${requestId}`;
}

const dueLabel = (value: string) => new Intl.DateTimeFormat("en-IN", {day: "numeric", month: "short",
  hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata"}).format(new Date(value));

const historyTitles: Record<string, string> = {
  received: "Request received", acknowledged: "Acknowledged", infoRequested: "Asked for more",
  actioned: "Actioned", declined: "Declined", appealRecorded: "Appeal recorded", appealDecided: "Appeal decided",
  closed: "Closed", organizerSuspended: "Organiser page suspended",
};

const historyTones: Record<string, JourneyStep["tone"]> = {
  received: "ink", acknowledged: "ink", infoRequested: "warning", actioned: "success", declined: "danger",
  appealRecorded: "warning", appealDecided: "ink", closed: "muted", organizerSuspended: "warning",
};

const targetLabels = {organizer: "Organiser page", event: "Event page", url: "Page"} as const;

/** What a person must do next, and by when. */
function nextStep(status: RequestStatus, data: Record<string, unknown>): {state: InboxState; due: string | null} {
  const ackDueAt = iso(data.ackDueAt);
  const actionDueAt = iso(data.actionDueAt);
  const resolveDueAt = iso(data.resolveDueAt);
  const appeal = data.appeal as {dueAt?: unknown} | null;
  switch (status) {
  case "received":
    return {state: {code: "acknowledge", label: "Acknowledge", tone: "warning"}, due: ackDueAt};
  case "acknowledged":
  case "verifying":
    return {state: status === "verifying" ?
      {code: "verifying", label: "Waiting on their proof", tone: "info"} :
      {code: "verify", label: "Verify and decide", tone: "warning"}, due: actionDueAt ?? resolveDueAt};
  case "appealed":
    return {state: {code: "appeal", label: "Decide the appeal", tone: "warning"}, due: iso(appeal?.dueAt)};
  case "actioned":
    return {state: {code: "actioned", label: "Actioned", tone: "success"}, due: null};
  case "declined":
    return {state: {code: "declined", label: "Declined", tone: "neutral"}, due: null};
  case "closed":
    return {state: {code: "closed", label: "Closed", tone: "neutral"}, due: null};
  }
}

/** One request as its Admin Inbox item; null for a document that is not a request. */
export function projectTakedownRequest(requestId: string, data: Record<string, unknown>): InboxProjection | null {
  if (data.schemaVersion !== 1 || data.requestId !== requestId) return null;
  const type = data.requestType as RequestType;
  const status = data.status as RequestStatus;
  if (!(type in requestTypeLabels)) return null;
  const createdAt = iso(data.createdAt);
  if (!createdAt) return null;
  const target = (data.target ?? {}) as {kind?: keyof typeof targetLabels};
  const history = Array.isArray(data.history) ? data.history as Record<string, unknown>[] : [];
  const journey: JourneyStep[] = history.flatMap((entry, index) => {
    const at = iso(entry.at);
    const action = typeof entry.action === "string" ? entry.action : "";
    return at ? [{stepId: `${action}-${index + 1}`, occurredAt: at, title: historyTitles[action] ?? action,
      detail: typeof entry.detail === "string" ? entry.detail : null,
      actorUid: typeof entry.byUid === "string" ? entry.byUid : null, tone: historyTones[action] ?? "ink"}] : [];
  });
  const {state, due} = nextStep(status, data);
  const open = isOpenStatus(status);
  const appeal = data.appeal as {recordedAt?: unknown} | null;
  const lastHistoryAt = journey.at(-1)?.occurredAt ?? createdAt;
  return {
    itemId: takedownInboxItemId(requestId),
    type: "takedown",
    sourceKind: TAKEDOWN_INBOX_SOURCE_KIND,
    sourceId: requestId,
    sourcePath: `${TAKEDOWN_REQUESTS_COLLECTION}/${requestId}`,
    title: `${requestTypeLabels[type]} · ${typeof data.reference === "string" ? data.reference : requestId}`,
    subtitle: [targetLabels[target.kind ?? "url"] ?? "Page", due ? `due ${dueLabel(due)}` : null].filter(Boolean).join(" · "),
    cameFrom: "Listing request form",
    nominatorUid: null,
    city: null,
    state,
    lifecycle: open ? "open" : "closed",
    // An appeal waits from when it was recorded; everything else from receipt.
    waitingSince: status === "appealed" ? iso(appeal?.recordedAt) ?? createdAt : createdAt,
    closedAt: open ? null : iso(data.closedAt) ?? iso(data.decidedAt) ?? lastHistoryAt,
    recommendation: null,
    journey,
  };
}
