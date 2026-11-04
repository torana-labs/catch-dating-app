import {isDeepStrictEqual} from "node:util";
import * as admin from "firebase-admin";
import {logger} from "firebase-functions";
import type {
  HostEventDeliveryViewDocument,
  OrganizerDocument,
} from "../shared/generated/firestoreAdminTypes";
import {validateOrganizerDocument} from
  "../shared/generated/validators/organizerDocument";
import {validateEventDocument} from
  "../shared/generated/validators/eventDocument";
import {validateEventAttendeeDocument} from
  "../shared/generated/validators/eventAttendeeDocument";
import {operationCollections} from "../operations/collections";
import {EVENT_ASSISTANCE_MESSAGES} from
  "../eventSuccess/operations/firestoreMessageOutbox";
import {
  guestCollections,
  guestIdentity,
  guestSourceFactsFromSnapshots,
} from "../eventSuccess/operations/guestRecords";
import {
  deliveryWorkIds,
  hasAutomaticDelivery,
  readDeliveryWorkRecords,
} from "../eventSuccess/operations/deliveryWorkRecords";
import {
  deliveryActionsUntil,
  parseHostDelivery,
  projectHostDelivery,
} from "../eventSuccess/operations/hostDeliveryRecords";
import {
  isAssistanceId,
  isSourceInvalid,
  pagedIds,
  positiveInteger,
  stage,
  ViewSourceInvalidError,
} from "./liveViewFanout";

export const eventDeliveryViewsCollection = "hostEventDeliveryViews";

export type EventDeliveryViewOutcome =
  | {kind: "removed"; existed: boolean}
  | {kind: "unchanged"; revision: number}
  | {kind: "complete"; revision: number}
  | {
    kind: "invalidSource";
    incompleteSource: string;
    detail: string;
    revision: number;
    written: boolean;
  };

export interface EventDeliveryViewStoreDeps {
  now: () => FirebaseFirestore.Timestamp;
}

const defaultDeps: EventDeliveryViewStoreDeps = {
  now: () => admin.firestore.Timestamp.now(),
};

const lifecycles = new Set(["active", "cancelled", "superseded", "responded"]);
type Lifecycle = HostEventDeliveryViewDocument["lifecycle"];

/**
 * Re-evaluates hostEventDeliveryViews/{messageId} from current sources in one
 * transaction: the message, its organizer, its event, the attendee row, the
 * guest record and, for automatic delivery, its run and work item. Only a
 * live intent has a view; a rehearsal message, one whose organizer or event
 * is gone, or one without usable ids has none. The projection is evaluated at
 * the transaction's time; relevantUntilMillis tells the phone when its
 * manual-handoff action lapses with no further write. Writes only when the
 * document changed. A source that fails validation records invalidSource and
 * keeps the previous view; any other error throws, so the trigger retries.
 */
export async function reconcileEventDeliveryView(
  db: FirebaseFirestore.Firestore,
  messageId: string,
  deps: EventDeliveryViewStoreDeps = defaultDeps
): Promise<EventDeliveryViewOutcome> {
  const outcome = await db.runTransaction(async (tx):
    Promise<EventDeliveryViewOutcome> => {
    const viewRef = db.collection(eventDeliveryViewsCollection).doc(messageId);
    const [messageSnap, viewSnap] = await tx.getAll(
      db.collection(EVENT_ASSISTANCE_MESSAGES).doc(messageId), viewRef);
    const raw = messageSnap.data();
    const intent = raw?.intent;
    const remove = (): EventDeliveryViewOutcome => {
      if (viewSnap.exists) tx.delete(viewRef);
      return {kind: "removed", existed: viewSnap.exists};
    };
    if (!raw || intent?.context?.mode !== "live" ||
        !isAssistanceId(intent.context.organizerId) ||
        !isAssistanceId(intent.eventId) ||
        intent.context.eventId !== intent.eventId) {
      return remove();
    }
    const context = intent.context;
    const organizerId: string = context.organizerId;
    const eventId: string = intent.eventId;
    const attendeeId = isAssistanceId(intent.attendeeId) ?
      intent.attendeeId as string : null;
    const guestId = attendeeId === null ? null : (() => {
      try {
        return guestIdentity(context, attendeeId);
      } catch {
        return null;
      }
    })();
    // Automatic delivery is tracked by a run and work item keyed by the
    // message id. A malformed id is an invalid work source: it is staged here
    // and raised in the evaluation below, so the previous view is kept.
    let workIds: ReturnType<typeof deliveryWorkIds> | null = null;
    let workIdsInvalid: ViewSourceInvalidError | null = null;
    if (hasAutomaticDelivery(raw as never)) {
      try {
        workIds = stage(operationCollections.workItems,
          () => deliveryWorkIds(messageId));
      } catch (error) {
        if (!(error instanceof ViewSourceInvalidError)) throw error;
        workIdsInvalid = error;
      }
    }
    const [organizerSnap, eventSnap, attendeeSnap, guestSnap, runSnap,
      itemSnap] = await tx.getAll(
      db.collection("organizers").doc(organizerId),
      db.collection("events").doc(eventId),
      ...(attendeeId === null || guestId === null ? [] : [
        db.collection("eventAttendees").doc(attendeeId),
        db.collection(guestCollections.guests).doc(guestId),
      ]),
      ...(workIds === null ? [] : [
        db.collection(operationCollections.runs).doc(workIds.runId),
        db.collection(operationCollections.workItems)
          .doc(workIds.workItemId),
      ]));
    if (!organizerSnap.exists || !eventSnap.exists) return remove();
    const now = deps.now();
    const nowMillis = now.toMillis();
    const previous = viewSnap.exists ?
      viewSnap.data() as HostEventDeliveryViewDocument : null;
    let view: HostEventDeliveryViewDocument["view"];
    let relevantUntilMillis: number | null;
    let createdAt: number;
    let lifecycle: Lifecycle;
    let invalid: ViewSourceInvalidError | null = null;
    try {
      const organizer = stage("organizers", () => {
        const data = organizerSnap.data();
        if (!validateOrganizerDocument(data)) {
          throw new ViewSourceInvalidError("organizers",
            "The organizer does not match its contract.");
        }
        return data as unknown as OrganizerDocument;
      });
      stage("events", () => {
        const data = eventSnap.data();
        if (!validateEventDocument(data) || data.organizerId !== organizerId) {
          throw new ViewSourceInvalidError("events",
            "The event does not match its contract or organizer.");
        }
      });
      const message = stage(EVENT_ASSISTANCE_MESSAGES, () =>
        parseLiveDelivery(raw, messageId, context, nowMillis));
      if (attendeeSnap === undefined || guestSnap === undefined) {
        throw new ViewSourceInvalidError(EVENT_ASSISTANCE_MESSAGES,
          "The message names no usable attendee.");
      }
      if (workIdsInvalid !== null) throw workIdsInvalid;
      const ids = workIds;
      const work = ids === null ? null :
        stage(operationCollections.workItems, () => readDeliveryWorkRecords(
          runSnap!.data(), itemSnap!.data(), ids.workItemId, nowMillis));
      const row = attendeeSnap.data();
      const attendeeMatches = !!row && row.eventId === eventId &&
        row.organizerId === organizerId;
      view = stage(attendeeMatches && !validateEventAttendeeDocument(row) ?
        "eventAttendees" : guestSnap.exists ? guestCollections.guests :
          "events", () => projectHostDelivery(message, eventSnap, attendeeSnap,
        guestSnap, organizer, work, nowMillis));
      relevantUntilMillis = view.actions.length === 0 ? null :
        deliveryActionsUntil(message.intent, guestSourceFactsFromSnapshots(
          context, message.intent.attendeeId, eventSnap, attendeeSnap));
      createdAt = message.createdAt;
      lifecycle = message.lifecycle;
    } catch (error) {
      if (!(error instanceof ViewSourceInvalidError)) throw error;
      invalid = error;
      view = previous?.view ?? null;
      relevantUntilMillis = previous?.relevantUntilMillis ?? null;
      createdAt = previous?.createdAt ?? (Number.isSafeInteger(raw.createdAt) &&
        raw.createdAt >= 0 ? raw.createdAt : 0);
      lifecycle = previous?.lifecycle ?? (lifecycles.has(raw.lifecycle) ?
        raw.lifecycle as Lifecycle : "active");
    }
    const next = {
      eventId,
      organizerId,
      createdAt,
      lifecycle,
      sourceCoverage: invalid === null ? "complete" as const :
        "invalidSource" as const,
      incompleteSource: invalid?.source ?? null,
      relevantUntilMillis,
      view,
    };
    const previousRevision = positiveInteger(previous?.revision) ?? 0;
    const unchanged = previous !== null && isDeepStrictEqual({
      eventId: previous.eventId,
      organizerId: previous.organizerId,
      createdAt: previous.createdAt,
      lifecycle: previous.lifecycle,
      sourceCoverage: previous.sourceCoverage,
      incompleteSource: previous.incompleteSource,
      relevantUntilMillis: previous.relevantUntilMillis,
      view: previous.view,
    }, next);
    const revision = unchanged ? previousRevision : previousRevision + 1;
    if (!unchanged) {
      const document: HostEventDeliveryViewDocument = {
        schemaVersion: 1,
        messageId,
        ...next,
        revision,
        evaluatedAt: now,
      };
      tx.set(viewRef, document);
    }
    if (invalid !== null) {
      return {kind: "invalidSource", incompleteSource: invalid.source,
        detail: invalid.detail, revision, written: !unchanged};
    }
    return unchanged ? {kind: "unchanged", revision} :
      {kind: "complete", revision};
  });
  // Logged once per committed evaluation, not once per transaction attempt.
  if (outcome.kind === "invalidSource") {
    logger.error("Host event delivery view read an invalid source.", {
      messageId,
      incompleteSource: outcome.incompleteSource,
      detail: outcome.detail,
    });
  }
  return outcome;
}

/**
 * The message parser is pure over the record already read, so whatever it
 * rejects is the record itself: its plain validation errors name the messages
 * collection instead of retrying the trigger.
 */
function parseLiveDelivery(
  ...args: Parameters<typeof parseHostDelivery>
): ReturnType<typeof parseHostDelivery> {
  try {
    return parseHostDelivery(...args);
  } catch (error) {
    if (!(error instanceof Error) || isSourceInvalid(error)) throw error;
    throw new ViewSourceInvalidError(EVENT_ASSISTANCE_MESSAGES, error.message);
  }
}

export interface EventDeliveryViewBackfillReport {
  messages: number;
  outcomes: Record<EventDeliveryViewOutcome["kind"], number>;
}

/**
 * Explicit organizer scope: every live message of the organizer. Without
 * apply it only counts them.
 */
export async function backfillEventDeliveryViews(
  db: FirebaseFirestore.Firestore,
  organizerId: string,
  apply: boolean,
  reconcile: (messageId: string) => Promise<EventDeliveryViewOutcome> =
  (messageId) => reconcileEventDeliveryView(db, messageId)
): Promise<EventDeliveryViewBackfillReport> {
  const outcomes: EventDeliveryViewBackfillReport["outcomes"] = {
    removed: 0, unchanged: 0, complete: 0, invalidSource: 0,
  };
  let messages = 0;
  for await (const messageId of pagedIds(db.collection(
    EVENT_ASSISTANCE_MESSAGES)
    .where("intent.context.mode", "==", "live")
    .where("intent.context.organizerId", "==", organizerId))) {
    messages++;
    if (apply) outcomes[(await reconcile(messageId)).kind]++;
  }
  return {messages, outcomes};
}
