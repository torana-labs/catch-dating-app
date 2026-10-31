import type {Firestore, Transaction} from "firebase-admin/firestore";
import {operationContentHash} from "../../operations/durableActions";
import type {EventDocument} from "../../shared/generated/eventDocument";
import {validateEventDocument} from
  "../../shared/generated/validators/eventDocument";
import {validateEventPlanChangeDocument} from
  "../../shared/generated/validators/eventPlanChangeDocument";
import {validateEventSuccessPlanDocument} from
  "../../shared/generated/validators/eventSuccessPlanDocument";
import {EVENT_PLAN_CHANGES} from "../../events/planChangeRecords";
import {postEventFollowUpSourceId, timestampMillis} from
  "./operationalNoticeSourceReaders";
import type {Fanout, OperationalNoticeFanoutInput} from
  "./operationalNoticeFanoutRecords";
import {readSettingState, resolveSetting} from "./policySettingsReader";

type Binding = Fanout["policyBinding"];
export type FanoutAuthority = {kind: "ready"; binding: Binding} |
  {kind: "held"; reason: "policyUnavailable" | "policyChanged" |
    "sourceChanged"};

/** Rechecks source and exact manager policy revision for every fanout page. */
export async function readOperationalNoticeFanoutAuthority(db: Firestore,
  tx: Transaction, input: Pick<OperationalNoticeFanoutInput,
    "context" | "source">, expected: Binding | null,
  now: number): Promise<FanoutAuthority> {
  const eventRef = db.collection("events").doc(input.context.eventId);
  const sourceRef = input.source.kind === "planChange" ?
    db.collection(EVENT_PLAN_CHANGES).doc(input.source.sourceId) :
    db.collection("eventSuccessPlans").doc(input.context.eventId);
  const [eventSnap, sourceSnap] = await tx.getAll(eventRef, sourceRef);
  const event = eventSnap.data();
  if (!validateEventDocument(event) ||
      (event.organizerId) !== input.context.organizerId ||
      event.status !== "active") {
    return {kind: "held", reason: "sourceChanged"};
  }
  if (!sourceMatches(input, event, sourceSnap.id, sourceSnap.data())) {
    return {kind: "held", reason: "sourceChanged"};
  }
  const workflowKind = input.source.kind === "planChange" ?
    "planChangeCommunication" as const : "postEventFollowUp" as const;
  const templateIntent = input.source.kind === "planChange" ?
    "planChange" as const : "followUp" as const;
  const state = await readSettingState(db, tx, {context: input.context,
    groupId: "event:whole", workflowKind}, eventSnap, () => now);
  const resolved = resolveSetting(state);
  const template = resolved.template;
  if (resolved.status !== "configured" || !resolved.selected || !template ||
      template.kind !== workflowKind ||
      template.config.templateIntent !== templateIntent ||
      template.setting.kind !== "enabled" ||
      template.setting.authority !== "executeWithinPolicy") {
    return {kind: "held", reason: "policyUnavailable"};
  }
  const binding: Binding = {groupId: "event:whole", workflowKind,
    settingId: resolved.selected.settingId,
    settingRevision: resolved.selected.revision};
  if (expected && operationContentHash(expected) !==
      operationContentHash(binding)) {
    return {kind: "held", reason: "policyChanged"};
  }
  return {kind: "ready", binding};
}

function sourceMatches(input: Pick<OperationalNoticeFanoutInput,
  "context" | "source">, event: EventDocument, sourceId: string,
value: unknown) {
  if (input.source.kind === "planChange") {
    if (!validateEventPlanChangeDocument(value)) return false;
    return sourceId === input.source.sourceId &&
      value.sourceId === input.source.sourceId &&
      value.eventId === input.context.eventId &&
      value.organizerId === input.context.organizerId &&
      value.revision === input.source.revision &&
      event.planChangeRevision === input.source.revision &&
      timestampMillis(value.occurredAt) === input.source.occurredAt &&
      timestampMillis(value.validUntil) === input.source.validUntil;
  }
  if (!validateEventSuccessPlanDocument(value)) return false;
  const revision = value.liveControlRevision ?? 0;
  const completedAt = value.completedAt == null ? null :
    timestampMillis(value.completedAt);
  const eventEnd = timestampMillis(event.endTime);
  const occurredAt = completedAt == null ? null :
    Math.max(completedAt, eventEnd);
  return sourceId === input.context.eventId &&
    value.eventId === input.context.eventId &&
    (value.organizerId) === input.context.organizerId &&
    value.status === "complete" && revision === input.source.revision &&
    postEventFollowUpSourceId(input.context, revision) ===
      input.source.sourceId && occurredAt === input.source.occurredAt &&
    eventEnd + 86_400_000 === input.source.validUntil;
}
