import type {Firestore} from "firebase-admin/firestore";
import {validateEventDocument} from
  "../../shared/generated/validators/eventDocument";
import {validateEventPlanChangeDocument} from
  "../../shared/generated/validators/eventPlanChangeDocument";
import {validateEventSuccessPlanDocument} from
  "../../shared/generated/validators/eventSuccessPlanDocument";
import {postEventFollowUpSourceId, timestampMillis} from
  "./operationalNoticeSourceReaders";
import {OperationalNoticeFanoutStore} from
  "./operationalNoticeFanoutStore";

type Store = Pick<OperationalNoticeFanoutStore, "enqueueCurrent">;

/** Project one immutable plan-change record into its bounded attendee job. */
export async function enqueuePlanChangeNoticeFanout(db: Firestore,
  documentId: string, value: unknown,
  store: Store = new OperationalNoticeFanoutStore(db)) {
  if (!validateEventPlanChangeDocument(value) ||
      value.sourceId !== documentId) return null;
  return store.enqueueCurrent({context: {mode: "live",
    organizerId: value.organizerId, eventId: value.eventId},
  source: {kind: "planChange", sourceId: value.sourceId,
    revision: value.revision, occurredAt: timestampMillis(value.occurredAt),
    validUntil: timestampMillis(value.validUntil)}});
}

/** Project a terminal Event Success revision into a due-at-event-end job. */
export async function enqueuePostEventFollowUpFanout(db: Firestore,
  documentId: string, value: unknown,
  store: Store = new OperationalNoticeFanoutStore(db)) {
  if (!validateEventSuccessPlanDocument(value) ||
      value.status !== "complete" || value.eventId !== documentId ||
      value.completedAt == null || (value.liveControlRevision ?? 0) < 1) {
    return null;
  }
  const event = (await db.collection("events").doc(documentId).get()).data();
  const organizerId = validateEventDocument(event) ?
    event.organizerId : null;
  if (!validateEventDocument(event) ||
      organizerId == null || organizerId !==
        (value.organizerId)) return null;
  const context = {mode: "live" as const, eventId: documentId,
    organizerId};
  const revision = value.liveControlRevision!;
  const eventEnd = timestampMillis(event.endTime);
  const occurredAt = Math.max(timestampMillis(value.completedAt), eventEnd);
  const validUntil = eventEnd + 86_400_000;
  if (occurredAt >= validUntil) return null;
  return store.enqueueCurrent({context, source: {kind: "followUp",
    sourceId: postEventFollowUpSourceId(context, revision), revision,
    occurredAt, validUntil}});
}
