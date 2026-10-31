import {HttpsError} from "firebase-functions/v2/https";
import type {
  EventDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  EVENT_MAX_DURATION_MINUTES,
  EVENT_SCHEDULE_LOCK_SLOT_MINUTES,
} from "../shared/businessRules";

const MINUTE_MS = 60 * 1000;
const ORGANIZER_LOCK_COLLECTION = "organizerScheduleLocks";
const USER_LOCK_COLLECTION = "userEventScheduleLocks";
const USER_SCHEDULE_STATUSES = ["signedUp", "waitlisted", "attended"];

type LockOwner = "club" | "organizer" | "user";

interface ScheduleWindow {
  startTimeMillis: number;
  endTimeMillis: number;
}

interface ClaimOrganizerScheduleParams extends ScheduleWindow {
  organizerId: string;
  eventId: string;
}

interface ReplaceOrganizerScheduleParams extends ClaimOrganizerScheduleParams {
  previousStartTimeMillis: number;
  previousEndTimeMillis: number;
}

interface ClaimUserScheduleParams extends ClaimOrganizerScheduleParams {
  uid: string;
}

interface ReleaseUserScheduleParams extends ScheduleWindow {
  uid: string;
  eventId: string;
}

interface ScheduleLockDocument {
  ownerType: LockOwner;
  ownerId: string;
  slot: number;
  eventId: string;
  organizerId?: string;
  uid?: string;
  startTimeMillis: number;
  endTimeMillis: number;
}

/**
 * Validates the server-owned event duration invariant.
 * @param {number} startTimeMillis Event start in epoch milliseconds.
 * @param {number} endTimeMillis Event end in epoch milliseconds.
 */
export function assertValidEventTimeRange(
  startTimeMillis: number,
  endTimeMillis: number
) {
  if (endTimeMillis <= startTimeMillis) {
    throw new HttpsError(
      "invalid-argument",
      "Event end time must be after the start time."
    );
  }

  const durationMinutes = (endTimeMillis - startTimeMillis) / MINUTE_MS;
  if (durationMinutes > EVENT_MAX_DURATION_MINUTES) {
    throw new HttpsError(
      "invalid-argument",
      `Events cannot be longer than ${EVENT_MAX_DURATION_MINUTES} minutes.`
    );
  }
}

/**
 * Claims server-owned club schedule locks for a new active event.
 * @param {FirebaseFirestore.Transaction} tx Firestore transaction.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {ClaimOrganizerScheduleParams} params Event schedule params.
 */
export async function claimOrganizerScheduleInTransaction(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  params: ClaimOrganizerScheduleParams
) {
  assertValidEventTimeRange(params.startTimeMillis, params.endTimeMillis);
  await assertNoOrganizerConflictByEventsQuery(tx, db, params);
  await claimLocksInTransaction(
    tx,
    db,
    organizerLockRefs(db, params.organizerId, params),
    params.eventId,
    "This club already has an event during that time.",
    (slot) => ({
      ownerType: "organizer",
      ownerId: params.organizerId,
      slot,
      eventId: params.eventId,
      organizerId: params.organizerId,
      startTimeMillis: params.startTimeMillis,
      endTimeMillis: params.endTimeMillis,
    })
  );
}

/**
 * Replaces club schedule locks after a host schedule edit.
 * @param {FirebaseFirestore.Transaction} tx Firestore transaction.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {ReplaceOrganizerScheduleParams} params Event schedule params.
 */
export async function replaceOrganizerScheduleInTransaction(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  params: ReplaceOrganizerScheduleParams
) {
  assertValidEventTimeRange(params.startTimeMillis, params.endTimeMillis);
  await assertNoOrganizerConflictByEventsQuery(tx, db, params);

  const nextRefs = organizerLockRefs(
    db,
    params.organizerId,
    params
  );
  await claimLocksInTransaction(
    tx,
    db,
    nextRefs,
    params.eventId,
    "This club already has an event during that time.",
    (slot) => ({
      ownerType: "organizer",
      ownerId: params.organizerId,
      slot,
      eventId: params.eventId,
      organizerId: params.organizerId,
      startTimeMillis: params.startTimeMillis,
      endTimeMillis: params.endTimeMillis,
    })
  );

  const nextSlots = new Set(nextRefs.map(({slot}) => slot));
  for (const {ref, slot} of organizerLockRefs(db, params.organizerId, {
    startTimeMillis: params.previousStartTimeMillis,
    endTimeMillis: params.previousEndTimeMillis,
  })) {
    if (!nextSlots.has(slot)) {
      tx.delete(ref);
    }
  }
}

/**
 * Releases club locks when an event is cancelled or hard-deleted.
 * @param {FirebaseFirestore.Transaction} tx Firestore transaction.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {ClaimOrganizerScheduleParams} params Event schedule params.
 */
export function releaseOrganizerScheduleInTransaction(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  params: ClaimOrganizerScheduleParams
) {
  for (const {ref} of organizerLockRefs(
    db,
    params.organizerId,
    params
  )) {
    tx.delete(ref);
  }
}

/**
 * Claims a user's schedule for a signed-up or waitlisted event.
 * @param {FirebaseFirestore.Transaction} tx Firestore transaction.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {ClaimUserScheduleParams} params User schedule params.
 */
export async function claimUserEventScheduleInTransaction(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  params: ClaimUserScheduleParams
) {
  const prepared = await prepareUserEventScheduleClaimInTransaction(
    tx, db, params);
  prepared.apply();
}

/**
 * Separates schedule reads from writes so a booking can finish its other
 * transaction authority reads before staging the schedule lock.
 */
export async function prepareUserEventScheduleClaimInTransaction(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  params: ClaimUserScheduleParams
): Promise<{apply: () => void}> {
  const conflict = await readUserEventScheduleConflictInTransaction(tx, db,
    params);
  if (conflict !== false) {
    throw new HttpsError("failed-precondition",
      "You are already booked or waitlisted for another event at that time.");
  }
  const refs = userLockRefs(db, params.uid, params);
  let applied = false;
  return {apply: () => {
    if (applied) throw new Error("Schedule claim already applied.");
    applied = true;
    for (const {slot, ref} of refs) {
      tx.set(ref, {
        ownerType: "user",
        ownerId: params.uid,
        slot,
        eventId: params.eventId,
        organizerId: params.organizerId,
        uid: params.uid,
        startTimeMillis: params.startTimeMillis,
        endTimeMillis: params.endTimeMillis,
      });
    }
  }};
}

/**
 * Releases user locks when a signup or waitlist edge is cancelled.
 * @param {FirebaseFirestore.Transaction} tx Firestore transaction.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {ReleaseUserScheduleParams} params User schedule params.
 */
export function releaseUserEventScheduleInTransaction(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  params: ReleaseUserScheduleParams
) {
  for (const {ref} of userLockRefs(db, params.uid, params)) {
    tx.delete(ref);
  }
}

/**
 * Checks paid-order preflight before creating a Razorpay order. The atomic
 * guard still lives in signUpUserForEvent.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {ClaimUserScheduleParams} params User schedule params.
 */
export async function assertNoUserEventScheduleConflict(
  db: FirebaseFirestore.Firestore,
  params: ClaimUserScheduleParams
) {
  assertValidEventTimeRange(params.startTimeMillis, params.endTimeMillis);
  const refs = userLockRefs(db, params.uid, params);
  const lockSnaps = await Promise.all(refs.map(({ref}) => ref.get()));
  if (lockSnaps.some((snap) =>
    snap.exists &&
      (snap.data() as ScheduleLockDocument | undefined)?.eventId !==
        params.eventId
  )) {
    throw new HttpsError(
      "failed-precondition",
      "You are already booked or waitlisted for another event at that time."
    );
  }

  const participationSnap = await db
    .collection("eventParticipations")
    .where("uid", "==", params.uid)
    .where("status", "in", USER_SCHEDULE_STATUSES)
    .get();
  const eventSnaps = await Promise.all(
    participationSnap.docs
      .map((doc) => doc.data().eventId)
      .filter((eventId): eventId is string =>
        typeof eventId === "string" && eventId !== params.eventId
      )
      .map((eventId) => db.collection("events").doc(eventId).get())
  );
  if (eventSnaps.some((snap) =>
    snap.exists &&
    eventDocOverlaps(snap.data() as EventDocument, params.startTimeMillis,
      params.endTimeMillis)
  )) {
    throw new HttpsError(
      "failed-precondition",
      "You are already booked or waitlisted for another event at that time."
    );
  }
}

function scheduleSlots(params: ScheduleWindow): number[] {
  assertValidEventTimeRange(params.startTimeMillis, params.endTimeMillis);
  const slotMs = EVENT_SCHEDULE_LOCK_SLOT_MINUTES * MINUTE_MS;
  const firstSlot = Math.floor(params.startTimeMillis / slotMs);
  const lastSlot = Math.floor((params.endTimeMillis - 1) / slotMs);
  const slots: number[] = [];
  for (let slot = firstSlot; slot <= lastSlot; slot += 1) {
    slots.push(slot);
  }
  return slots;
}

function organizerLockRefs(
  db: FirebaseFirestore.Firestore,
  organizerId: string,
  params: ScheduleWindow
) {
  return scheduleSlots(params).map((slot) => ({
    slot,
    ref: db.collection(ORGANIZER_LOCK_COLLECTION)
      .doc(`${organizerId}_${slot}`),
  }));
}

function userLockRefs(
  db: FirebaseFirestore.Firestore,
  uid: string,
  params: ScheduleWindow
) {
  return scheduleSlots(params).map((slot) => ({
    slot,
    ref: db.collection(USER_LOCK_COLLECTION)
      .doc(`${uid}_${slot}`),
  }));
}

async function claimLocksInTransaction(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  refs: Array<{slot: number; ref: FirebaseFirestore.DocumentReference}>,
  eventId: string,
  conflictMessage: string,
  buildDoc: (slot: number) => ScheduleLockDocument
) {
  void db;
  const snaps = await Promise.all(refs.map(({ref}) => tx.get(ref)));
  for (const snap of snaps) {
    const existing = snap.exists ?
      snap.data() as ScheduleLockDocument :
      null;
    if (existing && existing.eventId !== eventId) {
      throw new HttpsError("failed-precondition", conflictMessage);
    }
  }
  for (const {slot, ref} of refs) {
    tx.set(ref, buildDoc(slot));
  }
}

async function assertNoOrganizerConflictByEventsQuery(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  params: ClaimOrganizerScheduleParams
) {
  const snap = await tx.get(db
    .collection("events")
    .where(
      params.organizerId ? "organizerId" : "organizerId",
      "==",
      params.organizerId
    )
    .where("status", "==", "active"));

  for (const doc of snap.docs) {
    if (doc.id === params.eventId) continue;
    const event = doc.data() as EventDocument;
    if (eventDocOverlaps(event, params.startTimeMillis, params.endTimeMillis)) {
      throw new HttpsError(
        "failed-precondition",
        "This organizer already has an event during that time."
      );
    }
  }
}

/** Read-only counterpart of the schedule claim. Null means the bounded source
 * is incomplete, never an assertion that a slot is free.
 */
export async function readUserEventScheduleConflictInTransaction(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  params: ClaimUserScheduleParams,
  options: {readLimit?: number} = {}
): Promise<boolean | null> {
  assertValidEventTimeRange(params.startTimeMillis, params.endTimeMillis);
  let query = db.collection("eventParticipations")
    .where("uid", "==", params.uid)
    .where("status", "in", USER_SCHEDULE_STATUSES);
  if (options.readLimit !== undefined) {
    query = query.limit(options.readLimit + 1);
  }
  const participationSnap = await tx.get(query);
  if (options.readLimit !== undefined &&
      participationSnap.docs.length > options.readLimit) return null;
  for (const participation of participationSnap.docs) {
    const eventId = participation.data().eventId;
    if (typeof eventId !== "string" || eventId === params.eventId) continue;
    const eventSnap = await tx.get(db.collection("events").doc(eventId));
    if (!eventSnap.exists) continue;
    const event = eventSnap.data() as EventDocument;
    if (eventDocOverlaps(event, params.startTimeMillis, params.endTimeMillis)) {
      return true;
    }
  }
  const refs = userLockRefs(db, params.uid, params);
  const snaps = await Promise.all(refs.map(({ref}) => tx.get(ref)));
  return snaps.some((snap) => snap.exists &&
    (snap.data() as ScheduleLockDocument).eventId !== params.eventId);
}

function eventDocOverlaps(
  event: EventDocument,
  startTimeMillis: number,
  endTimeMillis: number
): boolean {
  if (event.status === "cancelled") return false;
  const progressive = event as EventDocument & {
    publicationState?: unknown;
    setupRevision?: unknown;
  };
  // First-page private events have a start but no committed end or schedule
  // lock. They cannot reserve an interval until details are configured.
  if (event.endTime == null && progressive.publicationState === "private" &&
      Number.isSafeInteger(progressive.setupRevision) &&
      (progressive.setupRevision as number) >= 1) return false;
  if (typeof event.startTime?.toMillis !== "function" ||
      typeof event.endTime?.toMillis !== "function") {
    throw new HttpsError("failed-precondition",
      "An active event has an incomplete schedule.");
  }
  return intervalsOverlap(
    startTimeMillis,
    endTimeMillis,
    event.startTime.toMillis(),
    event.endTime.toMillis()
  );
}

function intervalsOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number
): boolean {
  return startA < endB && startB < endA;
}
