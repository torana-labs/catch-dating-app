import {isDeepStrictEqual} from "node:util";
import * as admin from "firebase-admin";
import {
  Change,
  DocumentSnapshot,
  FirestoreEvent,
  onDocumentWritten,
} from "firebase-functions/v2/firestore";
import {reconcileGroupProgressViews} from "./groupProgressViewStore";
import {reconcileDepartureView, rosterIdsForEvent} from "./departureViewStore";
import {reconcileCheckpointView} from "./checkpointViewStore";
import {
  checkpointViewFreezeMillis,
  checkpointViewsCollection,
} from "./movementViewSupport";

type SourceData = FirebaseFirestore.DocumentData | undefined;

export type MovementViewSource =
  | "events"
  | "eventSuccessPlans"
  | "eventAssistanceGroupProgress"
  | "eventAssistanceDepartureRosters"
  | "eventAssistanceCheckpoints"
  | "eventAttendees"
  | "eventAssistanceGuests"
  | "eventAssistanceMemberships"
  | "operationWorkItems"
  | "eventStaffGrants"
  | "organizers";

/** What one source write can change. */
export interface MovementTargets {
  /** Events whose group progress views, departures and checkpoints change. */
  events: string[];
  /** Rosters whose departure and checkpoint views change. */
  rosters: string[];
  /** Rosters whose checkpoint view alone changes. */
  checkpointRosters: string[];
}

/** Event fields the group source, the destinations and the hashes read. */
export const movementEventFields = ["status", "startTime", "endTime",
  "eventFormat", "organizerId", "meetingLocation", "itinerary"] as const;
/** Organizer fields the reporter choices read (managers and their names). */
export const movementOrganizerFields = ["hostUserId", "ownerUserId",
  "hostUserIds", "hostProfiles", "hostName", "hostAvatarUrl"] as const;
/** Attendee fields a checkpoint visit, name or accountability view reads. */
export const movementAttendeeFields = ["eventId", "organizerId", "status",
  "checkedInAt", "attendanceRevision", "displayName", "linkedUid",
  "createdAt", "accountabilityResolution", "accountabilityRevision",
  "accountabilityResolvedAt", "accountabilityResolvedBy",
  "accountabilityResolvedForCheckInAt"] as const;

const none = (): MovementTargets =>
  ({events: [], rosters: [], checkpointRosters: []});

function distinct(values: unknown[]): string[] {
  return [...new Set(values.filter((value): value is string =>
    typeof value === "string" && value.length > 0))];
}

/** An update that changed none of [fields]; creates and deletes never are. */
function unchanged(before: SourceData, after: SourceData,
  fields: readonly string[]): boolean {
  return before !== undefined && after !== undefined && fields.every((field) =>
    isDeepStrictEqual(before[field] ?? null, after[field] ?? null));
}

/**
 * The views a source write can change, from both the old and the new
 * version. Old data is only a routing hint: every evaluation rereads current
 * sources. Skips are optimisations for updates only.
 */
export async function resolveMovementTargets(
  db: FirebaseFirestore.Firestore,
  source: MovementViewSource,
  documentId: string,
  before: SourceData,
  after: SourceData,
  nowMillis: number = Date.now()
): Promise<MovementTargets> {
  const targets = none();
  switch (source) {
  case "events":
    if (!unchanged(before, after, movementEventFields)) {
      targets.events.push(documentId);
    }
    return targets;
  case "eventSuccessPlans":
    if (!unchanged(before, after, ["status", "eventId", "organizerId"])) {
      targets.events.push(documentId);
    }
    return targets;
  case "eventAssistanceGroupProgress":
    // A progress row changes its group's view; departures and checkpoints
    // read it only to validate, and arrive with their own roster write.
    targets.events.push(...distinct([before?.context?.eventId,
      after?.context?.eventId]));
    return targets;
  case "eventAssistanceDepartureRosters":
    targets.rosters.push(documentId);
    return targets;
  case "eventAssistanceCheckpoints":
    targets.rosters.push(...distinct([before?.rosterId, after?.rosterId]));
    return targets;
  case "eventAttendees":
    if (unchanged(before, after, movementAttendeeFields)) return targets;
    targets.checkpointRosters.push(...await openRostersOfAttendees(db,
      [documentId], nowMillis));
    return targets;
  case "eventAssistanceGuests":
  case "eventAssistanceMemberships":
    targets.checkpointRosters.push(...await openRostersOfAttendees(db,
      distinct([before?.attendeeId, after?.attendeeId]), nowMillis));
    return targets;
  case "operationWorkItems": {
    const rosterIds = [before, after].filter((data) =>
      data?.workflowId === "event-assistance" &&
      data?.normalizedPayload?.kind === "liveCheckpointReport")
      .map((data) => data!.normalizedPayload.rosterId);
    targets.checkpointRosters.push(...distinct(rosterIds));
    return targets;
  }
  case "eventStaffGrants":
    targets.checkpointRosters.push(...await openRostersWhere(db, "eventId",
      distinct([before?.eventId, after?.eventId]), nowMillis));
    return targets;
  case "organizers":
    if (unchanged(before, after, movementOrganizerFields)) return targets;
    targets.checkpointRosters.push(...await openRostersWhere(db,
      "organizerId", [documentId], nowMillis));
    return targets;
  }
}

/** Open checkpoint views whose roster lists one of [attendeeIds]. */
async function openRostersOfAttendees(db: FirebaseFirestore.Firestore,
  attendeeIds: string[], nowMillis: number): Promise<string[]> {
  const rosterIds: string[] = [];
  for (const attendeeId of attendeeIds) {
    rosterIds.push(...await openRostersWhere(db, "memberAttendeeIds",
      [attendeeId], nowMillis, "array-contains"));
  }
  return distinct(rosterIds);
}

const viewPageSize = 100;

/** Rosters of the checkpoint views matching a filter that are not frozen. */
async function openRostersWhere(db: FirebaseFirestore.Firestore,
  field: string, values: string[], nowMillis: number,
  operator: "==" | "array-contains" = "=="): Promise<string[]> {
  const rosterIds: string[] = [];
  for (const value of values) {
    let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
    do {
      let query = db.collection(checkpointViewsCollection)
        .where(field, operator, value)
        .orderBy(admin.firestore.FieldPath.documentId())
        .limit(viewPageSize);
      if (cursor) query = query.startAfter(cursor);
      const page = await query.get();
      for (const doc of page.docs) {
        const data = doc.data();
        if (typeof data.eventEndAtMillis === "number" &&
            nowMillis >= data.eventEndAtMillis + checkpointViewFreezeMillis) {
          continue;
        }
        rosterIds.push(data.rosterId);
      }
      cursor = page.size === viewPageSize ? page.docs.at(-1) : undefined;
    } while (cursor);
  }
  return distinct(rosterIds);
}

/** Re-evaluates every movement view the targets name, events first. */
export async function reconcileMovementTargets(
  db: FirebaseFirestore.Firestore, targets: MovementTargets
): Promise<void> {
  const rosters = new Set(targets.rosters);
  for (const eventId of targets.events) {
    await reconcileGroupProgressViews(db, eventId);
    for await (const rosterId of rosterIdsForEvent(db, eventId)) {
      rosters.add(rosterId);
    }
  }
  for (const rosterId of rosters) {
    await reconcileDepartureView(db, rosterId);
    await reconcileCheckpointView(db, rosterId);
  }
  for (const rosterId of new Set(targets.checkpointRosters)) {
    if (!rosters.has(rosterId)) await reconcileCheckpointView(db, rosterId);
  }
}

const options = {retry: true, memory: "512MiB" as const};

async function reconcileForWrite(source: MovementViewSource,
  event: FirestoreEvent<Change<DocumentSnapshot> | undefined,
    {documentId: string}>): Promise<void> {
  const db = admin.firestore();
  const targets = await resolveMovementTargets(db, source,
    event.params.documentId, event.data?.before.data(),
    event.data?.after.data());
  await reconcileMovementTargets(db, targets);
}

export const onHostMovementViewEventChanged = onDocumentWritten({
  ...options, document: "events/{documentId}",
}, (event) => reconcileForWrite("events", event));
export const onHostMovementViewPlanChanged = onDocumentWritten({
  ...options, document: "eventSuccessPlans/{documentId}",
}, (event) => reconcileForWrite("eventSuccessPlans", event));
export const onHostMovementViewProgressChanged = onDocumentWritten({
  ...options, document: "eventAssistanceGroupProgress/{documentId}",
}, (event) => reconcileForWrite("eventAssistanceGroupProgress", event));
export const onHostMovementViewRosterChanged = onDocumentWritten({
  ...options, document: "eventAssistanceDepartureRosters/{documentId}",
}, (event) => reconcileForWrite("eventAssistanceDepartureRosters", event));
export const onHostMovementViewCheckpointChanged = onDocumentWritten({
  ...options, document: "eventAssistanceCheckpoints/{documentId}",
}, (event) => reconcileForWrite("eventAssistanceCheckpoints", event));
export const onHostMovementViewAttendeeChanged = onDocumentWritten({
  ...options, document: "eventAttendees/{documentId}",
}, (event) => reconcileForWrite("eventAttendees", event));
export const onHostMovementViewGuestChanged = onDocumentWritten({
  ...options, document: "eventAssistanceGuests/{documentId}",
}, (event) => reconcileForWrite("eventAssistanceGuests", event));
export const onHostMovementViewMembershipChanged = onDocumentWritten({
  ...options, document: "eventAssistanceMemberships/{documentId}",
}, (event) => reconcileForWrite("eventAssistanceMemberships", event));
export const onHostMovementViewWorkItemChanged = onDocumentWritten({
  ...options, document: "operationWorkItems/{documentId}",
}, (event) => reconcileForWrite("operationWorkItems", event));
export const onHostMovementViewStaffGrantChanged = onDocumentWritten({
  ...options, document: "eventStaffGrants/{documentId}",
}, (event) => reconcileForWrite("eventStaffGrants", event));
export const onHostMovementViewOrganizerChanged = onDocumentWritten({
  ...options, document: "organizers/{documentId}",
}, (event) => reconcileForWrite("organizers", event));
