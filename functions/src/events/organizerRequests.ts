import * as admin from "firebase-admin";
import {onCall, HttpsError, type CallableRequest} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {isOrganizerManager} from "../shared/organizerHosts";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {hasBlockingRelationship} from "../safety/blocking";
import type {
  EventDocument,
  EventParticipationDocument,
  OrganizerDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {ListOrganizerRequestsCallablePayload as Payload} from
  "../shared/generated/listOrganizerRequestsCallablePayload";
import type {ListOrganizerRequestsCallableResponse as Result} from
  "../shared/generated/listOrganizerRequestsCallableResponse";
import {validateListOrganizerRequestsCallablePayload} from
  "../shared/generated/validators/listOrganizerRequestsInput";
import {validateListOrganizerRequestsCallableResponse} from
  "../shared/generated/validators/listOrganizerRequestsOutput";
import {isEventPolicyTerms} from "./configuredEvent";
import {eventPolicyFromEvent} from "./eventPolicy";

type Row = Result["rows"][number];
type Db = FirebaseFirestore.Firestore;
type Participation = EventParticipationDocument;

export const maxRequestEvents = 50;
export const maxRequestRows = 100;
const maxWaitlistPerEvent = 20;

export interface OrganizerRequestDeps {
  db: () => Db;
  now: () => number;
  checkRateLimit: typeof checkRateLimit;
  isBlocked: (db: Db, uid: string, otherUid: string) => Promise<boolean>;
}

const defaultDeps: OrganizerRequestDeps = {
  db: () => admin.firestore(),
  now: Date.now,
  checkRateLimit,
  isBlocked: (db, uid, otherUid) =>
    hasBlockingRelationship(db, uid, [otherUid]),
};

const millisOf = (value: unknown): number | null =>
  (value as {toMillis?: () => number} | null)?.toMillis?.() ?? null;

/**
 * Whether a waitlisted person is the host's to offer a spot. An event that
 * approves by hand lists its approved guests here while they pay, and those
 * have already been let in.
 * @param {Participation} participation The waitlisted row.
 * @param {EventDocument} event Their event.
 * @return {boolean} Whether the row belongs on the waitlist view.
 */
export function isOfferableWaitlistRow(participation: Participation,
  event: EventDocument): boolean {
  return participation.status === "waitlisted" &&
    participation.hostApprovalStatus !== "pending" &&
    isEventPolicyTerms(event) &&
    eventPolicyFromEvent(event).admission.manualApprovalRequired !== true;
}

/**
 * Soonest event first, then oldest ask first.
 * @param {Row} left A row.
 * @param {Row} right Another row.
 * @return {number} Sort order.
 */
export function compareRequestRows(left: Row, right: Row): number {
  return left.eventStartMillis - right.eventStartMillis ||
    (left.askedAtMillis ?? 0) - (right.askedAtMillis ?? 0) ||
    left.uid.localeCompare(right.uid);
}

async function attendedEventCount(db: Db, organizerId: string, uid: string):
  Promise<number | null> {
  const contacts = await db.collection("organizerContacts")
    .where("organizerId", "==", organizerId)
    .where("linkedUid", "==", uid).limit(1).get();
  const contactId = contacts.docs[0]?.id;
  if (!contactId) return null;
  const summary = await db.collection("hostContactSummaries").doc(contactId)
    .get();
  const row = summary.data()?.row as {attendedEventCount?: unknown} | undefined;
  return typeof row?.attendedEventCount === "number" ?
    row.attendedEventCount : null;
}

/**
 * Everyone waiting across an organizer's coming events.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {OrganizerRequestDeps} deps Dependencies.
 * @return {Promise<Result>} Join requests and the waitlist.
 */
export async function listOrganizerRequestsHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerRequestDeps = defaultDeps): Promise<Result> {
  const uid = requireAuth(request);
  const {organizerId} = validateCallableWithAjv<Payload>(request,
    validateListOrganizerRequestsCallablePayload);
  const db = deps.db();
  await deps.checkRateLimit(db, uid, "listOrganizerRequests",
    {maxRequests: 60, windowMs: 60 * 1000});
  const organizer = (await db.collection("organizers").doc(organizerId).get())
    .data() as OrganizerDocument | undefined;
  if (!organizer || !isOrganizerManager(organizer, uid)) {
    throw new HttpsError("permission-denied",
      "Only this organizer's hosts can see who is waiting.");
  }
  const now = admin.firestore.Timestamp.fromMillis(deps.now());
  const eventsSnap = await db.collection("events")
    .where("organizerId", "==", organizerId)
    .where("status", "==", "active")
    .where("endTime", ">", now)
    .orderBy("endTime")
    .orderBy(admin.firestore.FieldPath.documentId())
    .limit(maxRequestEvents + 1).get();
  let complete = eventsSnap.docs.length <= maxRequestEvents;
  const events = new Map(eventsSnap.docs.slice(0, maxRequestEvents)
    .map((doc) => [doc.id, doc.data() as EventDocument]));

  const pendingSnap = await db.collection("eventParticipations")
    .where("organizerId", "==", organizerId)
    .where("hostApprovalStatus", "==", "pending")
    .limit(maxRequestRows + 1).get();
  if (pendingSnap.docs.length > maxRequestRows) complete = false;
  const waiting: {participation: Participation; position: number | null}[] =
    pendingSnap.docs.slice(0, maxRequestRows)
      .map((doc) => doc.data() as Participation)
      .filter((row) => row.status === "waitlisted" && events.has(row.eventId))
      .map((participation) => ({participation, position: null}));

  await Promise.all([...events].map(async ([eventId, event]) => {
    if (((event as {waitlistedCount?: number}).waitlistedCount ?? 0) === 0) {
      return;
    }
    const snap = await db.collection("eventParticipations")
      .where("eventId", "==", eventId)
      .where("status", "==", "waitlisted")
      .orderBy("waitlistedAt")
      .limit(maxWaitlistPerEvent + 1).get();
    if (snap.docs.length > maxWaitlistPerEvent) complete = false;
    let position = 0;
    for (const doc of snap.docs.slice(0, maxWaitlistPerEvent)) {
      const participation = doc.data() as Participation;
      if (!isOfferableWaitlistRow(participation, event)) continue;
      position += 1;
      waiting.push({participation, position});
    }
  }));

  const nowMillis = deps.now();
  const rows = await Promise.all(waiting.map(async ({participation, position}):
    Promise<Row | null> => {
    const person = participation.uid;
    if (await deps.isBlocked(db, uid, person)) return null;
    const [profile, attended] = await Promise.all([
      db.collection("publicProfiles").doc(person).get(),
      attendedEventCount(db, organizerId, person),
    ]);
    const event = events.get(participation.eventId)!;
    const expires = millisOf(participation.waitlistOfferExpiresAt);
    const liveOffer = participation.waitlistOfferStatus === "active" &&
      expires !== null && expires > nowMillis;
    return {
      uid: person,
      kind: position === null ? "request" : "waitlist",
      eventId: participation.eventId,
      eventName: event.name?.trim() || event.meetingPoint || "",
      eventStartMillis: millisOf(event.startTime) ?? 0,
      placesLeft: Math.max(0,
        (event.capacityLimit ?? 0) - (event.bookedCount ?? 0)),
      capacityLimit: event.capacityLimit ?? 0,
      name: (profile.data()?.name as string | undefined)?.trim() || null,
      askedAtMillis: millisOf(participation.waitlistedAt) ??
        millisOf(participation.createdAt),
      waitlistPosition: position,
      attendedEventCount: attended,
      offerExpiresAtMillis: liveOffer ? expires : null,
    };
  }));
  const visible = rows.filter((row) => row !== null).sort(compareRequestRows);
  if (visible.length > maxRequestRows) complete = false;
  const result: Result = {rows: visible.slice(0, maxRequestRows), complete};
  if (!validateListOrganizerRequestsCallableResponse(result)) {
    throw new HttpsError("internal", "Invalid requests.");
  }
  return result;
}

export const listOrganizerRequests = onCall(appCheckCallableOptions,
  (request) => listOrganizerRequestsHandler(request));
