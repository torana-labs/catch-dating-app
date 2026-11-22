import type {Firestore, Transaction} from "firebase-admin/firestore";
import {operationContentHash} from "../../operations/durableActions";
import {validateEventAttendeeDocument} from
  "../../shared/generated/validators/eventAttendeeDocument";
import {runAssistanceTransaction as transact} from
  "../../platform/transactionCallback";
import {currentGuest, Guest, guestCollections, guestIdentity,
  guestSourceFactsFromSnapshots, parseGuest} from "./guestRecords";
import {invalidWork} from "./liveWorkRecords";

type Held = {kind: "held"; reason: "attendeeUnavailable" |
  "participationUnavailable"};
type Prepared = {kind: "ready"; guest: Guest; created: boolean;
  commit: () => void};

/**
 * Prepare the stable participation episode shared by every live guest workflow.
 * It can create a new registration episode, but never revives a stopped one.
 */
export async function prepareCurrentGuestEnrollment(db: Firestore,
  tx: Transaction, context: Guest["context"], attendeeId: string,
  now: number): Promise<Held | Prepared> {
  const guestId = guestIdentity(context, attendeeId);
  const guestRef = db.collection(guestCollections.guests).doc(guestId);
  const [eventSnap, attendeeSnap, guestSnap] = await tx.getAll(
    db.collection("events").doc(context.eventId),
    db.collection("eventAttendees").doc(attendeeId), guestRef);
  if (!attendeeSnap.exists) {
    return {kind: "held", reason: "attendeeUnavailable"};
  }
  const attendee = attendeeSnap.data();
  if (!validateEventAttendeeDocument(attendee)) throw invalidWork();
  const source = guestSourceFactsFromSnapshots(context, attendeeId,
    eventSnap, attendeeSnap);
  if (source.attendeeStatus !== "registered" &&
      source.attendeeStatus !== "checkedIn") {
    return {kind: "held", reason: "attendeeUnavailable"};
  }
  const existing = guestSnap.exists ? parseGuest(guestSnap.data()) : null;
  if (existing && (existing.guestId !== guestId || existing.updatedAt > now)) {
    throw invalidWork();
  }
  const sameRegistration = existing !== null &&
    existing.sourceGeneration === source.sourceGeneration &&
    existing.attendeeGeneration === source.attendeeGeneration;
  if (sameRegistration) {
    return currentGuest(existing!, source) ?
      {kind: "ready", guest: existing!, created: false,
        commit: () => undefined} :
      {kind: "held", reason: "participationUnavailable"};
  }
  const guest = parseGuest({schemaVersion: 1, guestId, context, attendeeId,
    attendeeGeneration: source.attendeeGeneration,
    sourceGeneration: source.sourceGeneration,
    episodeId: "episode:" + operationContentHash([
      "roster-enrollment/v1", guestId, source.sourceGeneration,
      source.attendeeGeneration]),
    participation: {state: "active", resumeAtUnit: null},
    revision: existing ? existing.revision + 1 : 0, lifecycle: "active",
    intention: {kind: "unknown"}, createdAt: existing?.createdAt ?? now,
    updatedAt: now});
  return {kind: "ready", guest, created: true,
    commit: () => tx.set(guestRef, guest)};
}

/** Idempotent enrollment for workflows that do not need late-join work. */
export function ensureCurrentGuestEnrollment(db: Firestore,
  context: Guest["context"], attendeeId: string,
  clock: () => number = Date.now) {
  return transact(db, async (tx) => {
    const now = clock();
    if (!Number.isSafeInteger(now) || now < 0) throw invalidWork();
    const prepared = await prepareCurrentGuestEnrollment(db, tx, context,
      attendeeId, now);
    if (prepared.kind === "held") return prepared;
    const committedAt = clock();
    if (!Number.isSafeInteger(committedAt) || committedAt < now) {
      throw invalidWork();
    }
    prepared.commit();
    return {kind: prepared.created ? "enrolled" as const : "current" as const,
      guest: prepared.guest};
  });
}
