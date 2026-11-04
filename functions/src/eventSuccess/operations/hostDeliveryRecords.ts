import type {DocumentSnapshot} from "firebase-admin/firestore";
import {operationContentHash} from "../../operations/durableActions";
import type {OrganizerDocument} from
  "../../shared/generated/firestoreAdminTypes";
import type {EventAssistanceDeliveryCallableResponse as Response} from
  "../../shared/generated/eventAssistanceDeliveryCallableResponse";
import {validateEventAttendeeDocument} from
  "../../shared/generated/validators/eventAttendeeDocument";
import {isOrganizerManager} from "../../shared/organizerHosts";
import {guestIdentity, guestSourceFactsFromSnapshots, parseGuest,
  messageWindowOpen, guestCanReceiveMessage} from "./guestRecords";
import type {GuestSourceFacts} from "./guestRecords";
import {invalidSource} from "./groupProgressSource";
import {sameMessageContext} from "./messagingPolicy";
import {MessageRecord, parseMessageRecord} from "./messageOutbox";
import {assertDeliveryMessage, readDeliveryWorkRecords} from
  "./deliveryWorkRecords";
import {hostDeliveryStatus, manualDeliveryActions} from
  "./deliveryReviewPolicy";

export {hostDeliveryStatus} from "./deliveryReviewPolicy";

export type HostDeliveryView = Response["view"];
export type DeliveryCoordination = ReturnType<typeof readDeliveryWorkRecords>;

export function parseHostDelivery(value: unknown, id: string,
  context: Response["context"], now: number): MessageRecord {
  const record = parseMessageRecord(value);
  if (record.messageId !== id || record.intent.context.mode !== "live" ||
      !sameMessageContext(record.intent.context, context) ||
      record.intent.eventId !== context.eventId || record.updatedAt > now) {
    throw invalidSource();
  }
  return record;
}

/** A host review never exposes routes, recipient endpoints or bearer links. */
export function projectHostDelivery(message: MessageRecord,
  event: DocumentSnapshot, attendee: DocumentSnapshot,
  guestSnapshot: DocumentSnapshot, organizer: OrganizerDocument,
  work: DeliveryCoordination | null, now: number): HostDeliveryView {
  const intent = message.intent;
  if (intent.context.mode !== "live") throw invalidSource();
  if (work) assertDeliveryMessage(work.payload, message);
  const row = attendee.data();
  const source = row && row.eventId === intent.eventId &&
    row.organizerId === intent.context.organizerId ? (() => {
      if (!validateEventAttendeeDocument(row)) throw invalidSource();
      return guestSourceFactsFromSnapshots(intent.context, intent.attendeeId,
        event, attendee);
    })() : null;
  const rawGuest = guestSnapshot.data();
  const guest = rawGuest === undefined ? null : parseGuest(rawGuest);
  if (guest && (guest.guestId !== guestSnapshot.id ||
      guest.guestId !== guestIdentity(intent.context, intent.attendeeId) ||
      guest.updatedAt > now)) throw invalidSource();
  const current = !!source && !!guest &&
    guest.episodeId === intent.episodeId &&
    guest.attendeeGeneration === source.attendeeGeneration &&
    guest.sourceGeneration === source.sourceGeneration;
  const ownerCurrent = !!message.handoff &&
    isOrganizerManager(organizer, message.handoff.actorUid);
  const handling: HostDeliveryView["handling"] = message.handoff ?
    {kind: "manual", actorUid: message.handoff.actorUid,
      at: message.handoff.at, authority: ownerCurrent ? "current" : "revoked"} :
    {kind: "automatic"};
  const c = work?.payload.checkpoint;
  const coordination: HostDeliveryView["coordination"] = c ?
    {kind: "tracked", phase: c.phase, reason: c.reason, dueAt: c.dueAt} :
    {kind: "untracked"};
  const deliveryStatus = hostDeliveryStatus(message);
  const displayName = current && typeof row?.displayName === "string" ?
    row.displayName : null;
  const common = {messageId: message.messageId, revision: message.revision,
    reviewHash: operationContentHash([message, source, guest, work,
      ownerCurrent, displayName]), displayName, createdAt: message.createdAt,
    expiresAt: intent.expiresAt, lifecycle: message.lifecycle, deliveryStatus,
    purpose: intent.kind === "joiningUpdate" ?
      "joiningUpdate" as const : intent.noticeKind,
    attempts: message.attempts.map((a) => {
      if (a.mode !== "live") throw invalidSource();
      return {channel: a.binding.transport, state: a.state.kind,
        at: a.state.at};
    }), coordination, handling};
  if (!current) {
    return {...common, availability: "sourceChanged",
      attendeeId: null, displayName: null, actions: []};
  }
  const relevant = message.lifecycle === "active" &&
    now < intent.expiresAt && messageWindowOpen(intent, source, now) &&
    guestCanReceiveMessage(guest, source, intent) &&
    (intent.kind !== "joiningUpdate" ||
      (source.attendeeStatus !== "checkedIn" &&
        guest.intention.kind !== "notComing"));
  return {...common, availability: "current", attendeeId: intent.attendeeId,
    actions: manualDeliveryActions(message, relevant, ownerCurrent)};
}

/**
 * The instant from which a current message's manual handoff no longer applies
 * without any source write: its expiry, or the earlier of its expiry and the
 * event's end when messageWindowOpen closes at that end. The window of an
 * eventCancelled notice does not depend on time, and the windows of
 * eventFinished and followUp notices open at the event's end, which their
 * producers have already passed when they create them.
 */
export function deliveryActionsUntil(intent: MessageRecord["intent"],
  source: GuestSourceFacts): number {
  return windowClosesAtEventEnd(intent) ?
    Math.min(intent.expiresAt, source.eventEnd) : intent.expiresAt;
}

function windowClosesAtEventEnd(intent: MessageRecord["intent"]): boolean {
  if (intent.kind === "joiningUpdate") return true;
  switch (intent.noticeKind) {
  case "joiningInstructions":
  case "planChanged":
  case "guestRequirement":
  case "assignmentChanged":
  case "participationCheck":
    return true;
  case "eventCancelled":
  case "eventFinished":
  case "followUp":
    return false;
  default: {
    const unhandled: never = intent.noticeKind;
    throw new Error("Unhandled event notice purpose: " + unhandled);
  }
  }
}
