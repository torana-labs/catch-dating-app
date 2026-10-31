import {HttpsError} from "firebase-functions/v2/https";
import type {DocumentSnapshot} from "firebase-admin/firestore";
import {operationContentHash as hash} from "../operations/durableActions";
import {isOrganizerManager} from "../shared/organizerHosts";
import type {OrganizerDocument} from "../shared/generated/firestoreAdminTypes";
import type {GetEventAttendanceDispositionCallablePayload as Scope} from
  "../shared/generated/getEventAttendanceDispositionCallablePayload";
import {validateEventDocument} from
  "../shared/generated/validators/eventDocument";
import {validateEventAttendeeDocument} from
  "../shared/generated/validators/eventAttendeeDocument";
import {validateOrganizerDocument} from
  "../shared/generated/validators/organizerDocument";
import {validateEventSuccessPlanDocument} from
  "../shared/generated/validators/eventSuccessPlanDocument";
import {validateEventAttendanceDispositionDocument} from
  "../shared/generated/validators/eventAttendanceDispositionDocument";
import {guestIdentity, parseGuest, guestSourceFactsFromSnapshots} from
  "../eventSuccess/operations/guestRecords";
import {invalidSource} from "../eventSuccess/operations/groupProgressSource";
import {DispositionSource, dispositionIdentity} from
  "./attendanceDispositionPolicy";

export const dispositionCollections = {records: "eventAttendanceDispositions",
  receipts: "eventAttendanceDispositionReceipts"} as const;

/** Shared authority and source validation for individual and roster reviews. */
export function attendanceEventAuthority(actorUid: string,
  context: Scope["context"], eventSnap: DocumentSnapshot,
  organizerSnap: DocumentSnapshot, planSnap: DocumentSnapshot) {
  const event = eventSnap.data();
  const organizer = organizerSnap.data();
  const plan = planSnap.data() ?? null;
  if (!validateEventDocument(event) ||
      event.organizerId !== context.organizerId ||
      !validateOrganizerDocument(organizer) ||
      (plan !== null && (!validateEventSuccessPlanDocument(plan) ||
        plan.eventId !== context.eventId ||
        (plan.organizerId) !== context.organizerId))) {
    throw invalidSource();
  }
  if (!isOrganizerManager(organizer as unknown as OrganizerDocument,
    actorUid)) {
    throw new HttpsError("permission-denied",
      "Only an organizer manager can review attendance closeout.");
  }
  return {context, event, plan, eventSnap, planGeneration: planSnap.createTime};
}

export function attendanceDispositionStateFromSnapshots(
  authority: ReturnType<typeof attendanceEventAuthority>,
  attendeeSnap: DocumentSnapshot, guestSnap: DocumentSnapshot,
  recordSnap: DocumentSnapshot, now: number) {
  const {context, event, plan, eventSnap, planGeneration} = authority;
  const attendeeId = attendeeSnap.id;
  const attendee = attendeeSnap.data();
  const id = dispositionIdentity(context, attendeeId);
  if (!validateEventAttendeeDocument(attendee) ||
      attendee.eventId !== context.eventId ||
      attendee.organizerId !== context.organizerId ||
      !Number.isSafeInteger(now) || now < 0) throw invalidSource();
  const facts = guestSourceFactsFromSnapshots(context, attendeeId,
    eventSnap, attendeeSnap);
  const guest = guestSnap.exists ? parseGuest(guestSnap.data()) : null;
  if (guest && (guest.guestId !== guestIdentity(context, attendeeId) ||
      guest.updatedAt > now)) throw invalidSource();
  const record = recordSnap.data() ?? null;
  if (record !== null &&
      (!validateEventAttendanceDispositionDocument(record) ||
        record.dispositionId !== id || record.attendeeId !== attendeeId ||
        hash(record.context) !== hash(context) || record.recordedAt > now)) {
    throw invalidSource();
  }
  const source: DispositionSource = {context, attendeeId, event, attendee,
    plan, planGeneration, guest, facts, now};
  return {id, source, record};
}
