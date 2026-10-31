import type {Firestore, Transaction} from "firebase-admin/firestore";
import {operationContentHash} from "../../operations/durableActions";
import type {EventPlanChangeDocument} from
  "../../shared/generated/eventPlanChangeDocument";
import {validateEventAttendeeDocument} from
  "../../shared/generated/validators/eventAttendeeDocument";
import {validateEventDocument} from
  "../../shared/generated/validators/eventDocument";
import {validateEventPlanChangeDocument} from
  "../../shared/generated/validators/eventPlanChangeDocument";
import {validateEventSuccessPlanDocument} from
  "../../shared/generated/validators/eventSuccessPlanDocument";
import {EVENT_PLAN_CHANGES} from "../../events/planChangeRecords";
import type {OperationalNoticeSource,
  OperationalNoticeSourceReader, OperationalNoticeSourceRequest} from
  "./operationalNoticePublication";

type LiveContext = Extract<OperationalNoticeSourceRequest<"planChange">[
  "context"], {mode: "live"}>;

/** Current immutable plan change, scoped to guests present when it occurred. */
export class EventPlanChangeSourceReader implements
  OperationalNoticeSourceReader<"planChange"> {
  readonly kind = "planChange" as const;

  async read(db: Firestore, tx: Transaction,
    request: OperationalNoticeSourceRequest<"planChange">,
    now: number): Promise<OperationalNoticeSource<"planChange"> | null> {
    const [changeSnap, eventSnap, attendeeSnap] = await tx.getAll(
      db.collection(EVENT_PLAN_CHANGES).doc(request.source.sourceId),
      db.collection("events").doc(request.context.eventId),
      db.collection("eventAttendees").doc(request.attendeeId),
    );
    if (!changeSnap.exists) return null;
    const change = changeSnap.data();
    const event = eventSnap.data();
    const attendee = attendeeSnap.data();
    if (!validateEventPlanChangeDocument(change) ||
        !validateEventDocument(event) ||
        !validateEventAttendeeDocument(attendee)) {
      throw new Error("Invalid event plan change source");
    }
    const occurredAt = timestampMillis(change.occurredAt);
    const validUntil = timestampMillis(change.validUntil);
    const attendeeCreatedAt = timestampMillis(attendee.createdAt);
    if (changeSnap.id !== change.sourceId ||
        change.sourceId !== request.source.sourceId ||
        change.eventId !== request.context.eventId ||
        change.organizerId !== request.context.organizerId ||
        (event.organizerId) !== request.context.organizerId ||
        event.planChangeRevision !== change.revision ||
        attendee.eventId !== request.context.eventId ||
        attendee.organizerId !== request.context.organizerId ||
        !["registered", "checkedIn"].includes(attendee.status) ||
        attendeeCreatedAt > occurredAt || occurredAt > now ||
        validUntil <= occurredAt) return null;
    const copy = planChangeCopy(change);
    return {
      kind: "planChange",
      context: request.context,
      eventId: request.context.eventId,
      attendeeId: request.attendeeId,
      groupId: "event:whole",
      sourceId: change.sourceId,
      revision: change.revision,
      occurredAt,
      validUntil,
      title: copy.title,
      body: copy.body,
      choices: [
        {choiceId: "acknowledge", label: "Got it",
          value: {kind: "acknowledge"}},
        {choiceId: "request-help", label: "I need help",
          value: {kind: "requestHelp", category: "eventLogistics"}},
      ],
    };
  }
}

/** Stable source id for the terminal Event Success plan revision. */
export function postEventFollowUpSourceId(
  context: LiveContext,
  revision: number
) {
  return "post-event-follow-up:" + operationContentHash([context, revision]);
}

/** Terminal Event Success completion, limited to guests who attended. */
export class PostEventFollowUpSourceReader implements
  OperationalNoticeSourceReader<"followUp"> {
  readonly kind = "followUp" as const;

  async read(db: Firestore, tx: Transaction,
    request: OperationalNoticeSourceRequest<"followUp">,
    now: number): Promise<OperationalNoticeSource<"followUp"> | null> {
    const [eventSnap, planSnap, attendeeSnap] = await tx.getAll(
      db.collection("events").doc(request.context.eventId),
      db.collection("eventSuccessPlans").doc(request.context.eventId),
      db.collection("eventAttendees").doc(request.attendeeId),
    );
    const event = eventSnap.data();
    const plan = planSnap.data();
    const attendee = attendeeSnap.data();
    if (!validateEventDocument(event) ||
        !validateEventSuccessPlanDocument(plan) ||
        !validateEventAttendeeDocument(attendee)) {
      return null;
    }
    const revision = plan.liveControlRevision ?? 0;
    const sourceId = postEventFollowUpSourceId(request.context, revision);
    const eventEnd = timestampMillis(event.endTime);
    const completedAt = plan.completedAt == null ? null :
      timestampMillis(plan.completedAt);
    const occurredAt = completedAt == null ? null :
      Math.max(completedAt, eventEnd);
    if (planSnap.id !== request.context.eventId ||
        plan.eventId !== request.context.eventId ||
        (plan.organizerId) !== request.context.organizerId ||
        (event.organizerId) !== request.context.organizerId ||
        attendee.eventId !== request.context.eventId ||
        attendee.organizerId !== request.context.organizerId ||
        attendee.status !== "checkedIn" ||
        plan.status !== "complete" || revision < 1 || occurredAt == null ||
        occurredAt > now || request.source.sourceId !== sourceId) return null;
    const eventTitle = event.name?.trim() || "your event";
    return {
      kind: "followUp",
      context: request.context,
      eventId: request.context.eventId,
      attendeeId: request.attendeeId,
      groupId: "event:whole",
      sourceId,
      revision,
      occurredAt,
      validUntil: eventEnd + 86_400_000,
      title: "Thanks for joining",
      body: `Thanks for joining ${eventTitle}. ` +
        "Let us know if you need help with anything from the event.",
      choices: [
        {choiceId: "all-good", label: "All good",
          value: {kind: "acknowledge"}},
        {choiceId: "request-help", label: "I need help",
          value: {kind: "requestHelp", category: "other"}},
      ],
    };
  }
}

function planChangeCopy(change: EventPlanChangeDocument) {
  const fields = new Set(change.changedFields);
  const details: string[] = [];
  if (fields.has("schedule")) details.push("The event time changed.");
  if (fields.has("meetingLocation")) {
    details.push(`Meet at ${change.meetingPoint}.`);
  }
  if (fields.has("itinerary")) details.push("The itinerary changed.");
  if (fields.has("format") || fields.has("name")) {
    details.push("Other event details changed.");
  }
  const title = change.changedFields.length === 1 &&
    fields.has("meetingLocation") ? "Meeting point updated" :
    change.changedFields.length === 1 && fields.has("schedule") ?
      "Event time updated" :
      change.changedFields.length === 1 && fields.has("itinerary") ?
        "Itinerary updated" : "Event details updated";
  return {title, body: `${change.eventTitle}: ${details.join(" ")} ` +
    "Check the event page for the latest details."};
}

export function timestampMillis(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid operational notice timestamp");
  }
  const stamp = value as {toMillis?: () => number; seconds?: number;
    nanoseconds?: number; _seconds?: number; _nanoseconds?: number};
  if (typeof stamp.toMillis === "function") return stamp.toMillis();
  const seconds = stamp.seconds ?? stamp._seconds;
  const nanoseconds = stamp.nanoseconds ?? stamp._nanoseconds;
  if (!Number.isSafeInteger(seconds) || !Number.isInteger(nanoseconds) ||
      nanoseconds! < 0 || nanoseconds! >= 1_000_000_000) {
    throw new Error("Invalid operational notice timestamp");
  }
  return seconds! * 1000 + nanoseconds! / 1_000_000;
}
