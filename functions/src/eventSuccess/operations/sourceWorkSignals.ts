import {operationContentHash} from "../../operations/durableActions";
import {guestIdentity} from "./guestRecords";
import {SourceWork, SourceWorkInput, EventSourceScope, isEventSourceScope,
  isCheckpointMemberScope} from
  "./sourceWorkRecords";
import {readinessScope, readinessFields, spendingReleased} from
  "./sourceReadinessSignals";
import type {AssistanceSourceWorkStore} from "./sourceWorkStore";
import type {AssistanceRosterWorkStore} from "./rosterWorkStore";
import type {RosterWorkInput} from "./rosterWorkRecords";

type Collection = SourceWork["source"]["collection"];
type Scope = SourceWork["scope"];
type Snapshot = {value: Record<string, unknown>; generation: unknown} | null;
export interface AssistanceSourceChange {
  source: SourceWorkInput["source"];
  before: Snapshot;
  after: Snapshot;
}

/** Trigger payloads request re-evaluation and supply no domain authority. */
export function sourceWakeScopes(change: AssistanceSourceChange): Scope[] {
  const before = projection(change.source.collection, change.before);
  const after = projection(change.source.collection, change.after);
  const ordinaryChanged = operationContentHash(before) !==
    operationContentHash(after) || spendingReleased(change.source.collection,
    change.before?.value, change.after?.value);
  const checkpointChanged = change.source.collection === "eventAttendees" &&
    operationContentHash(checkpointMemberProjection(change.before)) !==
      operationContentHash(checkpointMemberProjection(change.after));
  if (!ordinaryChanged && !checkpointChanged) return [];
  const scopes = new Map<string, Scope>();
  for (const snapshot of [change.before, change.after]) {
    if (!snapshot) continue;
    const scope = scopeFor(change.source.collection, change.source.documentId,
      snapshot.value);
    if (scope && ordinaryChanged) {
      scopes.set(operationContentHash(scope), scope);
    }
    if (scope && checkpointChanged && isEventSourceScope(scope) &&
        scope.attendeeId !== null) {
      const member = {...scope, kind: "checkpointMember" as const,
        attendeeId: scope.attendeeId};
      scopes.set(operationContentHash(member), member);
    }
  }
  return [...scopes.values()];
}

export async function enqueueAssistanceSourceChange(
  store: Pick<AssistanceSourceWorkStore, "hasTargets" | "enqueue">,
  change: AssistanceSourceChange,
  roster?: Pick<AssistanceRosterWorkStore, "enqueueCurrent">) {
  const queued: string[] = [];
  if (roster) {
    for (const input of rosterEnrollmentRequests(change)) {
      const work = await roster.enqueueCurrent(input);
      if (work.kind === "queued") queued.push(work.item.workItemId);
    }
  }
  for (const scope of sourceWakeScopes(change)) {
    // A newly enrolled work item evaluates current facts on its first run,
    // including facts changed after this no-target check.
    if (!await store.hasTargets(scope, change.source.occurredAt)) continue;
    const work = await store.enqueue({scope, source: change.source});
    queued.push(work.item.workItemId);
  }
  return queued;
}

/** Enrollment follows registration/episode identity, not each guest reply. */
export function rosterEnrollmentRequests(change: AssistanceSourceChange):
  Array<Omit<RosterWorkInput, "runtimeBinding">> {
  if (!change.after) return [];
  const collection = change.source.collection;
  let fields: string[];
  switch (collection) {
  case "eventAttendees": fields = ["eventId", "organizerId", "organizerId",
    "status", "createdAt"]; break;
  case "eventAssistanceGuests": fields = ["context", "attendeeId",
    "episodeId", "sourceGeneration", "attendeeGeneration"]; break;
  case "eventAssistanceRuntimeConfigs": fields = ["context", "workflowKind",
    "revision", "status", "sourceGeneration", "sourceHash"]; break;
  default: return [];
  }
  const selected = (snapshot: Snapshot) => snapshot === null ? null :
    JSON.parse(JSON.stringify([snapshot.generation,
      fields.map((key) => snapshot.value[key] ?? null)]));
  if (operationContentHash(selected(change.before)) ===
      operationContentHash(selected(change.after))) return [];
  return sourceWakeScopes(change).filter(isEventSourceScope)
    .filter((scope) => !isCheckpointMemberScope(scope))
    .map((scope) => ({scope,
      source: {...change.source, collection}}));
}

function scopeFor(collection: Collection, documentId: string,
  value: Record<string, unknown>): Scope | null {
  let context: unknown = value.context;
  let attendeeId: unknown = value.attendeeId ?? null;
  switch (collection) {
  case "eventAssistanceRcsBudgets":
  case "eventAssistanceSmsBudgets":
  case "eventAssistanceWhatsappBudgets": {
    const budgetScope = object(value.scope);
    if (budgetScope.kind === "senderDay") {
      return readinessScope(collection, documentId, value);
    }
    if (budgetScope.kind !== "event") return null;
    context = budgetScope.context;
    attendeeId = null;
    break;
  }
  case "eventAssistanceRcsSenders":
  case "eventAssistanceSmsSenders":
  case "organizerSenderConnections":
  case "eventAssistanceWhatsappPolicies":
  case "organizerMessageTemplates":
  case "organizerWhatsappEndpointStops":
  case "organizerContactChannelStates":
  case "eventAssistanceRcsSubscriptions":
    return readinessScope(collection, documentId, value);
  case "events":
    context = {mode: "live", eventId: documentId,
      organizerId: value.organizerId};
    attendeeId = null;
    break;
  case "eventAttendees":
  case "eventStaffGrants":
  case "eventSuccessPlans":
    context = {mode: "live", eventId: value.eventId ?? documentId,
      organizerId: value.organizerId};
    attendeeId = collection === "eventAttendees" ? documentId : null;
    break;
  case "eventAssistanceSettings":
  case "eventAssistanceRuntimeConfigs":
    if (value.workflowKind !== "lateJoin") return null;
    attendeeId = null;
    break;
  case "eventAssistanceGroupProgress": attendeeId = null; break;
  case "eventAssistanceGuests":
  case "eventAssistanceRcsPermissions":
  case "eventAssistanceSmsPermissions":
  case "eventAssistanceWhatsappPermissions":
  case "eventAssistanceMemberships": break;
  case "eventAssistanceMessages": {
    const intent = object(value.intent);
    if (object(intent.workflow).kind !== "lateJoin") return null;
    context = intent.context;
    attendeeId = intent.attendeeId;
    break;
  }
  default: return unhandled(collection);
  }
  const c = object(context);
  if (c.mode !== "live" || typeof c.eventId !== "string" ||
      typeof c.organizerId !== "string" ||
      (attendeeId !== null && typeof attendeeId !== "string")) return null;
  const scope: EventSourceScope = {context: {mode: "live", eventId: c.eventId,
    organizerId: c.organizerId}, attendeeId};
  // Malformed identity cannot become a query against an unrelated scope.
  guestIdentity(scope.context, scope.attendeeId ?? "scope");
  return scope;
}

function projection(collection: Collection, snapshot: Snapshot) {
  if (!snapshot) return null;
  const value = snapshot.value;
  if (collection === "eventAssistanceRcsSubscriptions" && !value.lastStop) {
    return null;
  }
  let fields: string[];
  switch (collection) {
  case "eventAssistanceRcsSenders":
  case "eventAssistanceSmsSenders":
  case "organizerSenderConnections":
  case "organizerMessageTemplates":
  case "organizerWhatsappEndpointStops":
  case "eventAssistanceWhatsappPolicies": fields = Object.keys(value); break;
  case "eventAssistanceRcsBudgets":
  case "eventAssistanceSmsBudgets":
  case "eventAssistanceWhatsappBudgets":
  case "eventAssistanceRcsSubscriptions":
  case "organizerContactChannelStates": fields = readinessFields(collection)!;
    break;
  case "events": fields = ["organizerId", "organizerId", "status",
    "eventFormat",
    "startTime", "endTime", "meetingLocation", "itinerary", "eventPolicy",
    "constraints", "capacityLimit", "priceInPaise", "currency",
    "publicRegistrationEnabled"]; break;
  case "eventAttendees": fields = ["eventId", "organizerId", "organizerId",
    "status", "attendanceRevision", "checkedInAt", "createdAt", "phoneE164",
    "linkedUid"];
    break;
  case "eventSuccessPlans": fields = ["eventId", "organizerId", "organizerId",
    "status"]; break;
  case "eventStaffGrants": fields = ["eventId", "organizerId", "uid",
    "status", "expiresAt", "groupDuties"]; break;
  case "eventAssistanceGuests":
  case "eventAssistanceRcsPermissions":
  case "eventAssistanceSmsPermissions":
  case "eventAssistanceWhatsappPermissions":
  case "eventAssistanceSettings":
  case "eventAssistanceGroupProgress":
  case "eventAssistanceMemberships":
  case "eventAssistanceMessages": fields = Object.keys(value); break;
  case "eventAssistanceRuntimeConfigs": fields = Object.keys(value); break;
  default: return unhandled(collection);
  }
  // SDK timestamps are data here, normalized for comparison only. The source
  // reader still uses precise canonical timestamps at the execution boundary.
  return JSON.parse(JSON.stringify([snapshot.generation,
    Object.fromEntries(fields.map((key) => [key, value[key] ?? null]))]));
}

function checkpointMemberProjection(snapshot: Snapshot) {
  if (!snapshot) return null;
  const fields = ["eventId", "organizerId", "organizerId", "status",
    "createdAt",
    "attendanceRevision", "checkedInAt", "accountabilityRevision",
    "accountabilityResolution", "accountabilityResolvedAt",
    "accountabilityResolvedBy", "accountabilityResolvedForCheckInAt"];
  return JSON.parse(JSON.stringify([snapshot.generation,
    fields.map((key) => snapshot.value[key] ?? null)]));
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ?
    value as Record<string, unknown> : {};
}
function unhandled(value: never): never {
  void value;
  throw new Error("Unhandled assistance source collection");
}
