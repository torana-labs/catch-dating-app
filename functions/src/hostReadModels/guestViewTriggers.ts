import {isDeepStrictEqual} from "node:util";
import * as admin from "firebase-admin";
import {
  Change,
  DocumentSnapshot,
  FirestoreEvent,
  onDocumentWritten,
} from "firebase-functions/v2/firestore";
import {reconcileAccountabilityView} from "./accountabilityViewStore";
import {reconcileMembershipView} from "./membershipViewStore";
import {reconcileSettingViews} from "./settingViewStore";
import {reconcileRuntimeView} from "./runtimeViewStore";
import {
  defaultGuestViewDeps,
  GuestViewDeps,
  maxEventAttendees,
  membershipViewsCollection,
} from "./guestViewSupport";

type SourceData = FirebaseFirestore.DocumentData | undefined;

export type GuestViewSource =
  | "events"
  | "eventSuccessPlans"
  | "eventAttendees"
  | "eventAssistanceGuests"
  | "eventAssistanceMemberships"
  | "organizers"
  | "eventStaffGrants"
  | "eventAssistanceSettings"
  | "eventAssistanceRuntimeConfigs";

/** One attendee of one event. */
export type GuestKey = {eventId: string; attendeeId: string};

/** What one source write can change. */
export interface GuestViewTargets {
  /** Events whose every attendee's accountability and membership change. */
  attendeesOf: string[];
  /** Attendees whose accountability and membership views change. */
  guests: GuestKey[];
  /** Events whose open membership views change (receivers). */
  membershipsOf: string[];
  /** Organizers whose open membership and automation views change. */
  organizers: string[];
  /** Events whose setting views change. */
  settings: string[];
  /** Events whose automation view changes. */
  runtimes: string[];
}

/** Event fields the guest, membership, setting and automation views read. */
export const guestViewEventFields = ["status", "startTime", "endTime",
  "eventFormat", "organizerId", "meetingLocation", "itinerary", "eventPolicy",
  "constraints", "capacityLimit", "priceInPaise", "currency",
  "publicRegistrationEnabled"] as const;
/** Attendee fields the accountability and membership views read. */
export const guestViewAttendeeFields = ["eventId", "organizerId", "status",
  "checkedInAt", "attendanceRevision", "linkedUid", "createdAt",
  "accountabilityResolution", "accountabilityRevision",
  "accountabilityResolvedAt", "accountabilityResolvedBy",
  "accountabilityResolvedForCheckInAt"] as const;
/** Organizer fields the receivers and the automation authority read. */
export const guestViewOrganizerFields = ["hostUserId", "ownerUserId",
  "hostUserIds", "hostProfiles", "hostName", "hostAvatarUrl", "status",
  "archived"] as const;

const none = (): GuestViewTargets => ({attendeesOf: [], guests: [],
  membershipsOf: [], organizers: [], settings: [], runtimes: []});

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

function guestKeys(rows: SourceData[], eventOf: (row: FirebaseFirestore
  .DocumentData) => unknown, attendeeOf: (row: FirebaseFirestore
  .DocumentData) => unknown): GuestKey[] {
  const keys = new Map<string, GuestKey>();
  for (const row of rows) {
    if (!row) continue;
    const eventId = eventOf(row);
    const attendeeId = attendeeOf(row);
    if (typeof eventId === "string" && typeof attendeeId === "string") {
      keys.set(eventId + "/" + attendeeId, {eventId, attendeeId});
    }
  }
  return [...keys.values()];
}

/**
 * The views a source write can change, from both the old and the new
 * version. Old data is only a routing hint: every evaluation rereads current
 * sources. Skips are optimisations for updates only.
 */
export function resolveGuestViewTargets(source: GuestViewSource,
  documentId: string, before: SourceData, after: SourceData):
  GuestViewTargets {
  const targets = none();
  switch (source) {
  case "events":
    if (unchanged(before, after, guestViewEventFields)) return targets;
    targets.attendeesOf.push(documentId);
    targets.settings.push(documentId);
    targets.runtimes.push(documentId);
    return targets;
  case "eventSuccessPlans":
    if (unchanged(before, after, ["status", "eventId", "organizerId"])) {
      return targets;
    }
    targets.attendeesOf.push(documentId);
    targets.runtimes.push(documentId);
    return targets;
  case "eventAttendees":
    if (unchanged(before, after, guestViewAttendeeFields)) return targets;
    targets.guests.push(...guestKeys([before, after], (row) => row.eventId,
      () => documentId));
    return targets;
  case "eventAssistanceGuests":
  case "eventAssistanceMemberships":
    targets.guests.push(...guestKeys([before, after],
      (row) => row.context?.eventId, (row) => row.attendeeId));
    return targets;
  case "organizers":
    if (unchanged(before, after, guestViewOrganizerFields)) return targets;
    targets.organizers.push(documentId);
    return targets;
  case "eventStaffGrants":
    targets.membershipsOf.push(...distinct([before?.eventId,
      after?.eventId]));
    return targets;
  case "eventAssistanceSettings":
    // A group setting inherits its event:whole parent: re-evaluate the event.
    targets.settings.push(...distinct([before?.context?.eventId,
      after?.context?.eventId]));
    return targets;
  case "eventAssistanceRuntimeConfigs":
    targets.runtimes.push(...distinct([before?.context?.eventId,
      after?.context?.eventId]));
    return targets;
  }
}

const pageSize = 100;

/** Every attendee of an event, in pages, up to the guest views' bound. */
async function* attendeesOfEvent(db: FirebaseFirestore.Firestore,
  eventId: string): AsyncGenerator<string> {
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  let seen = 0;
  do {
    let query = db.collection("eventAttendees")
      .where("eventId", "==", eventId)
      .orderBy(admin.firestore.FieldPath.documentId()).limit(pageSize);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    for (const doc of page.docs) {
      if (seen++ >= maxEventAttendees) return;
      yield doc.id;
    }
    cursor = page.size === pageSize ? page.docs.at(-1) : undefined;
  } while (cursor);
}

/** The membership views matching a filter whose event has not ended. */
async function* openMembershipViews(db: FirebaseFirestore.Firestore,
  field: "eventId" | "organizerId", value: string, nowMillis: number):
  AsyncGenerator<GuestKey> {
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  do {
    let query = db.collection(membershipViewsCollection)
      .where(field, "==", value)
      .orderBy(admin.firestore.FieldPath.documentId()).limit(pageSize);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    for (const doc of page.docs) {
      const data = doc.data();
      if (typeof data.eventEndAtMillis === "number" &&
          data.eventEndAtMillis <= nowMillis) continue;
      yield {eventId: data.eventId, attendeeId: data.attendeeId};
    }
    cursor = page.size === pageSize ? page.docs.at(-1) : undefined;
  } while (cursor);
}

/** The organizer's events, in pages. */
async function* eventsOfOrganizer(db: FirebaseFirestore.Firestore,
  organizerId: string): AsyncGenerator<string> {
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  do {
    let query = db.collection("events")
      .where("organizerId", "==", organizerId)
      .orderBy(admin.firestore.FieldPath.documentId()).limit(pageSize);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    for (const doc of page.docs) yield doc.id;
    cursor = page.size === pageSize ? page.docs.at(-1) : undefined;
  } while (cursor);
}

/** Re-evaluates every view the targets name. */
export async function reconcileGuestViewTargets(
  db: FirebaseFirestore.Firestore, targets: GuestViewTargets,
  deps: GuestViewDeps = defaultGuestViewDeps
): Promise<void> {
  const now = deps.now().toMillis();
  const guests = new Map<string, GuestKey>();
  const memberships = new Map<string, GuestKey>();
  const add = (map: Map<string, GuestKey>, key: GuestKey) =>
    map.set(key.eventId + "/" + key.attendeeId, key);
  for (const key of targets.guests) add(guests, key);
  for (const eventId of targets.attendeesOf) {
    for await (const attendeeId of attendeesOfEvent(db, eventId)) {
      add(guests, {eventId, attendeeId});
    }
  }
  for (const eventId of targets.membershipsOf) {
    for await (const key of openMembershipViews(db, "eventId", eventId,
      now)) add(memberships, key);
  }
  const runtimes = new Set(targets.runtimes);
  for (const organizerId of targets.organizers) {
    for await (const key of openMembershipViews(db, "organizerId",
      organizerId, now)) add(memberships, key);
    for await (const eventId of eventsOfOrganizer(db, organizerId)) {
      runtimes.add(eventId);
    }
  }
  for (const [id, key] of guests) {
    await reconcileAccountabilityView(db, key.eventId, key.attendeeId, deps);
    await reconcileMembershipView(db, key.eventId, key.attendeeId, deps);
    memberships.delete(id);
  }
  for (const key of memberships.values()) {
    await reconcileMembershipView(db, key.eventId, key.attendeeId, deps);
  }
  for (const eventId of new Set(targets.settings)) {
    await reconcileSettingViews(db, eventId, deps);
  }
  for (const eventId of runtimes) {
    await reconcileRuntimeView(db, eventId, deps);
  }
}

const options = {retry: true, memory: "512MiB" as const};

async function reconcileForWrite(source: GuestViewSource,
  event: FirestoreEvent<Change<DocumentSnapshot> | undefined,
    {documentId: string}>): Promise<void> {
  const targets = resolveGuestViewTargets(source, event.params.documentId,
    event.data?.before.data(), event.data?.after.data());
  await reconcileGuestViewTargets(admin.firestore(), targets);
}

export const onHostGuestViewEventChanged = onDocumentWritten({
  ...options, document: "events/{documentId}",
}, (event) => reconcileForWrite("events", event));
export const onHostGuestViewPlanChanged = onDocumentWritten({
  ...options, document: "eventSuccessPlans/{documentId}",
}, (event) => reconcileForWrite("eventSuccessPlans", event));
export const onHostGuestViewAttendeeChanged = onDocumentWritten({
  ...options, document: "eventAttendees/{documentId}",
}, (event) => reconcileForWrite("eventAttendees", event));
export const onHostGuestViewGuestChanged = onDocumentWritten({
  ...options, document: "eventAssistanceGuests/{documentId}",
}, (event) => reconcileForWrite("eventAssistanceGuests", event));
export const onHostGuestViewMembershipChanged = onDocumentWritten({
  ...options, document: "eventAssistanceMemberships/{documentId}",
}, (event) => reconcileForWrite("eventAssistanceMemberships", event));
export const onHostGuestViewOrganizerChanged = onDocumentWritten({
  ...options, document: "organizers/{documentId}",
}, (event) => reconcileForWrite("organizers", event));
export const onHostGuestViewStaffGrantChanged = onDocumentWritten({
  ...options, document: "eventStaffGrants/{documentId}",
}, (event) => reconcileForWrite("eventStaffGrants", event));
export const onHostGuestViewSettingChanged = onDocumentWritten({
  ...options, document: "eventAssistanceSettings/{documentId}",
}, (event) => reconcileForWrite("eventAssistanceSettings", event));
export const onHostGuestViewRuntimeChanged = onDocumentWritten({
  ...options, document: "eventAssistanceRuntimeConfigs/{documentId}",
}, (event) => reconcileForWrite("eventAssistanceRuntimeConfigs", event));
