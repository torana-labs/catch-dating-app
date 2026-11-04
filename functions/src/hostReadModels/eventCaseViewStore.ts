import {isDeepStrictEqual} from "node:util";
import * as admin from "firebase-admin";
import {logger} from "firebase-functions";
import type {
  HostEventCaseViewDocument,
  OrganizerDocument,
} from "../shared/generated/firestoreAdminTypes";
import {validateOrganizerDocument} from
  "../shared/generated/validators/organizerDocument";
import {validateEventDocument} from
  "../shared/generated/validators/eventDocument";
import {validateEventAttendeeDocument} from
  "../shared/generated/validators/eventAttendeeDocument";
import {guestCollections} from "../eventSuccess/operations/guestRecords";
import {parseHostCase, projectHostCase} from
  "../eventSuccess/operations/hostCaseRecords";
import {
  isAssistanceId,
  pagedIds,
  positiveInteger,
  stage,
  ViewSourceInvalidError,
} from "./liveViewFanout";

export const eventCaseViewsCollection = "hostEventCaseViews";

export type EventCaseViewOutcome =
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

export interface EventCaseViewStoreDeps {
  now: () => FirebaseFirestore.Timestamp;
}

const defaultDeps: EventCaseViewStoreDeps = {
  now: () => admin.firestore.Timestamp.now(),
};

type Data = FirebaseFirestore.DocumentData;

/**
 * Re-evaluates hostEventCaseViews/{caseId} from current sources in one
 * transaction: the case, its organizer, its event and its attendee row. Only
 * a live case owned by the event lead has a view; any other case, a case
 * whose organizer or event is gone, or one without usable ids has none.
 * Writes only when the projection changed. A source that fails validation
 * records sourceCoverage invalidSource and keeps the previous view, so a
 * trigger never retries forever on it; any other error throws, so the
 * trigger retries.
 */
export async function reconcileEventCaseView(
  db: FirebaseFirestore.Firestore,
  caseId: string,
  deps: EventCaseViewStoreDeps = defaultDeps
): Promise<EventCaseViewOutcome> {
  const outcome = await db.runTransaction(async (tx):
    Promise<EventCaseViewOutcome> => {
    const viewRef = db.collection(eventCaseViewsCollection).doc(caseId);
    const [caseSnap, viewSnap] = await tx.getAll(
      db.collection(guestCollections.cases).doc(caseId), viewRef);
    const raw = caseSnap.data();
    const context = raw?.context;
    const remove = (): EventCaseViewOutcome => {
      if (viewSnap.exists) tx.delete(viewRef);
      return {kind: "removed", existed: viewSnap.exists};
    };
    if (!raw || raw.owner !== "eventLead" || context?.mode !== "live" ||
        !isAssistanceId(context.organizerId) ||
        !isAssistanceId(context.eventId)) {
      // Safety-owned and rehearsal cases never reach the practical queue,
      // and without usable ids no manager could be authorized.
      return remove();
    }
    const organizerId: string = context.organizerId;
    const eventId: string = context.eventId;
    const attendeeId = isAssistanceId(raw.attendeeId) ? raw.attendeeId : null;
    const [organizerSnap, eventSnap, attendeeSnap] = await tx.getAll(
      db.collection("organizers").doc(organizerId),
      db.collection("events").doc(eventId),
      ...(attendeeId === null ? [] :
        [db.collection("eventAttendees").doc(attendeeId)]));
    if (!organizerSnap.exists || !eventSnap.exists) return remove();
    const now = deps.now();
    const previous = viewSnap.exists ?
      viewSnap.data() as HostEventCaseViewDocument : null;
    let view: HostEventCaseViewDocument["view"];
    let status: HostEventCaseViewDocument["status"];
    let receivedAt: number;
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
      if (attendeeSnap === undefined) {
        throw new ViewSourceInvalidError("eventAssistanceCases",
          "The case names no usable attendee.");
      }
      const request = stage("eventAssistanceCases", () =>
        parseHostCase(raw, caseId, context, now.toMillis()));
      view = stage(attendeeSource(attendeeSnap.data(), organizerId, eventId),
        () => projectHostCase(request, eventSnap, attendeeSnap, organizer));
      status = request.status;
      receivedAt = request.receivedAt;
    } catch (error) {
      if (!(error instanceof ViewSourceInvalidError)) throw error;
      invalid = error;
      view = previous?.view ?? null;
      status = previous?.status ??
        (raw.status === "resolved" ? "resolved" : "open");
      receivedAt = previous?.receivedAt ?? (Number.isSafeInteger(
        raw.receivedAt) && raw.receivedAt >= 0 ? raw.receivedAt : 0);
    }
    const next = {
      eventId,
      organizerId,
      status,
      receivedAt,
      sourceCoverage: invalid === null ? "complete" as const :
        "invalidSource" as const,
      incompleteSource: invalid?.source ?? null,
      view,
    };
    const previousRevision = positiveInteger(previous?.revision) ?? 0;
    const unchanged = previous !== null && isDeepStrictEqual({
      eventId: previous.eventId,
      organizerId: previous.organizerId,
      status: previous.status,
      receivedAt: previous.receivedAt,
      sourceCoverage: previous.sourceCoverage,
      incompleteSource: previous.incompleteSource,
      view: previous.view,
    }, next);
    const revision = unchanged ? previousRevision : previousRevision + 1;
    if (!unchanged) {
      const document: HostEventCaseViewDocument = {
        schemaVersion: 1,
        caseId,
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
    logger.error("Host event case view read an invalid source.", {
      caseId,
      incompleteSource: outcome.incompleteSource,
      detail: outcome.detail,
    });
  }
  return outcome;
}

/**
 * projectHostCase validates the attendee row only when it belongs to the
 * case's event; a failure past that point comes from the event's facts.
 */
function attendeeSource(row: Data | undefined, organizerId: string,
  eventId: string): string {
  return row && row.eventId === eventId && row.organizerId === organizerId &&
    !validateEventAttendeeDocument(row) ? "eventAttendees" : "events";
}

export interface EventCaseViewBackfillReport {
  cases: number;
  outcomes: Record<EventCaseViewOutcome["kind"], number>;
}

/**
 * Explicit organizer scope: every live case of the organizer owned by the
 * event lead. Without apply it only counts them.
 */
export async function backfillEventCaseViews(
  db: FirebaseFirestore.Firestore,
  organizerId: string,
  apply: boolean,
  reconcile: (caseId: string) => Promise<EventCaseViewOutcome> =
  (caseId) => reconcileEventCaseView(db, caseId)
): Promise<EventCaseViewBackfillReport> {
  const outcomes: EventCaseViewBackfillReport["outcomes"] = {
    removed: 0, unchanged: 0, complete: 0, invalidSource: 0,
  };
  let cases = 0;
  for await (const caseId of pagedIds(db.collection(guestCollections.cases)
    .where("context.mode", "==", "live")
    .where("context.organizerId", "==", organizerId)
    .where("owner", "==", "eventLead"))) {
    cases++;
    if (apply) outcomes[(await reconcile(caseId)).kind]++;
  }
  return {cases, outcomes};
}
