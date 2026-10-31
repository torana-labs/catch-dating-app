import {HttpsError} from "firebase-functions/v2/https";
import type {Transaction, Firestore, DocumentSnapshot} from
  "firebase-admin/firestore";
import type {EventAssistanceGuestDocument as Guest} from
  "../../shared/generated/eventAssistanceGuestDocument";
import type {EventAssistanceThreadDocument as Thread} from
  "../../shared/generated/eventAssistanceThreadDocument";
import type {EventAssistanceGuestGrantDocument as Grant} from
  "../../shared/generated/eventAssistanceGuestGrantDocument";
import {validateEventAssistanceGuestDocument} from
  "../../shared/generated/validators/eventAssistanceGuestDocument";
import {validateEventAssistanceThreadDocument} from
  "../../shared/generated/validators/eventAssistanceThreadDocument";
import {validateEventAssistanceGuestGrantDocument} from
  "../../shared/generated/validators/eventAssistanceGuestGrantDocument";
import {operationContentHash} from "../../operations/durableActions";
import type {MessageRecord} from "./messageOutbox";

export type {Guest, Thread, Grant};
export const guestCollections = {
  guests: "eventAssistanceGuests", threads: "eventAssistanceThreads",
  grants: "eventAssistanceGuestGrants", cases: "eventAssistanceCases",
} as const;

export function requireDocumentId(id: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(id)) {
    throw new Error("Invalid assistance document id");
  }
  return id;
}

export function guestIdentity(context: Guest["context"], attendeeId: string) {
  if (context.mode !== "live") throw unavailable();
  requireDocumentId(context.eventId);
  requireDocumentId(context.organizerId);
  requireDocumentId(attendeeId);
  return "guest:" + operationContentHash([context, attendeeId]);
}

export function threadIdentity(intent: MessageRecord["intent"]): string {
  return "thread:" + operationContentHash([
    intent.context, intent.attendeeId, intent.episodeId, intent.workflow,
  ]);
}

export function parseGuest(value: unknown): Guest {
  if (!validateEventAssistanceGuestDocument(value) ||
      value.guestId !== guestIdentity(value.context, value.attendeeId) ||
      value.updatedAt < value.createdAt) throw unavailable();
  return value;
}

export function parseThread(value: unknown): Thread {
  if (!validateEventAssistanceThreadDocument(value) ||
      value.guestId !== guestIdentity(value.context, value.attendeeId) ||
      value.threadId !== "thread:" + operationContentHash([
        value.context, value.attendeeId, value.episodeId, value.workflow,
      ]) || value.updatedAt < value.createdAt) throw unavailable();
  return value;
}

export function parseGrant(value: unknown): Grant {
  if (!validateEventAssistanceGuestGrantDocument(value) ||
      value.guestId !== guestIdentity(value.context, value.attendeeId) ||
      value.expiresAt <= value.issuedAt ||
      value.expiresAt - value.issuedAt > 86_400_000 ||
      (value.revokedAt !== null && value.revokedAt < value.issuedAt)) {
    throw unavailable();
  }
  return value;
}

export interface GuestSourceFacts {
  eventTitle: string;
  eventStatus: "active" | "cancelled";
  eventEnd: number;
  attendeeStatus: "invited" | "registered" | "waitlisted" |
    "checkedIn" | "cancelled";
  attendeeGeneration: string;
  sourceGeneration: string;
}

/** Exact roster generation; a deleted/recreated row cannot inherit a grant. */
function timestampParts(value: unknown): [number, number] {
  if (!value || typeof value !== "object") throw unavailable();
  const stamp = value as {seconds?: number; nanoseconds?: number;
    _seconds?: number; _nanoseconds?: number};
  const seconds = stamp.seconds ?? stamp._seconds;
  const nanos = stamp.nanoseconds ?? stamp._nanoseconds;
  if (!Number.isSafeInteger(seconds) || !Number.isInteger(nanos) ||
      nanos! < 0 || nanos! >= 1_000_000_000) throw unavailable();
  return [seconds!, nanos!];
}

export async function readGuestSourceFacts(
  db: Firestore, transaction: Transaction,
  context: Guest["context"], attendeeId: string
): Promise<GuestSourceFacts> {
  guestIdentity(context, attendeeId);
  const [eventSnapshot, attendeeSnapshot] = await transaction.getAll(
    db.collection("events").doc(context.eventId),
    db.collection("eventAttendees").doc(attendeeId),
  );
  return guestSourceFactsFromSnapshots(context, attendeeId, eventSnapshot,
    attendeeSnapshot);
}

export function guestSourceFactsFromSnapshots(context: Guest["context"],
  attendeeId: string, eventSnapshot: DocumentSnapshot,
  attendeeSnapshot: DocumentSnapshot): GuestSourceFacts {
  guestIdentity(context, attendeeId);
  const event = eventSnapshot.data();
  const attendee = attendeeSnapshot.data();
  if (!event || !attendee ||
      (event.organizerId) !== context.organizerId ||
      attendee.eventId !== context.eventId ||
      (attendee.organizerId) !== context.organizerId ||
      !["active", "cancelled"].includes(event.status) ||
      !["invited", "registered", "waitlisted", "checkedIn", "cancelled"]
        .includes(attendee.status)) throw unavailable();
  const [seconds, nanos] = timestampParts(event.endTime);
  return {
    eventTitle: typeof event.name === "string" && event.name.trim() ?
      event.name.trim().slice(0, 160) : "Your event",
    eventStatus: event.status, eventEnd: seconds * 1000 + nanos / 1_000_000,
    attendeeStatus: attendee.status,
    sourceGeneration: operationContentHash([
      timestampParts(eventSnapshot.createTime),
      timestampParts(attendeeSnapshot.createTime)]),
    attendeeGeneration: operationContentHash(
      timestampParts(attendee.createdAt)),
  };
}

export function messageWindowOpen(
  intent: MessageRecord["intent"], source: GuestSourceFacts, now: number
): boolean {
  if (intent.kind === "joiningUpdate") {
    return source.eventStatus === "active" && now < source.eventEnd;
  }
  switch (intent.noticeKind) {
  case "eventCancelled": return source.eventStatus === "cancelled";
  case "eventFinished":
  case "followUp":
    return source.eventStatus === "active" && now >= source.eventEnd;
  case "joiningInstructions":
  case "planChanged":
  case "guestRequirement":
  case "assignmentChanged":
  case "participationCheck":
    return source.eventStatus === "active" && now < source.eventEnd;
  default: {
    const unhandled: never = intent.noticeKind;
    throw new Error("Unhandled event notice purpose: " + unhandled);
  }
  }
}

export function currentGuest(guest: Guest, source: GuestSourceFacts): boolean {
  return guest.lifecycle === "active" &&
    guest.attendeeGeneration === source.attendeeGeneration &&
    guest.sourceGeneration === source.sourceGeneration &&
    (source.attendeeStatus === "registered" ||
      source.attendeeStatus === "checkedIn");
}

/** Participation stops activity prompts while preserving essential updates. */
export function messageRequiresActiveParticipation(
  intent: MessageRecord["intent"]
): boolean {
  if (intent.kind === "joiningUpdate") return true;
  switch (intent.noticeKind) {
  case "joiningInstructions":
  case "guestRequirement":
  case "assignmentChanged":
  case "participationCheck": return true;
  case "eventCancelled":
  case "eventFinished":
  case "followUp":
  case "planChanged": return false;
  default: {
    const unhandled: never = intent.noticeKind;
    throw new Error("Unhandled participation message purpose: " + unhandled);
  }
  }
}

export function guestCanReceiveMessage(
  guest: Guest, source: GuestSourceFacts, intent: MessageRecord["intent"]
): boolean {
  if (messageRequiresActiveParticipation(intent) &&
      guest.participation.state !== "active") return false;
  if (currentGuest(guest, source)) return true;
  return guest.lifecycle === "active" &&
    guest.attendeeGeneration === source.attendeeGeneration &&
    guest.sourceGeneration === source.sourceGeneration &&
    source.attendeeStatus === "cancelled" &&
    intent.kind === "operationalNotice" &&
    intent.noticeKind === "eventCancelled";
}

export function unavailable(): HttpsError {
  return new HttpsError("not-found", "This event update is unavailable.");
}
