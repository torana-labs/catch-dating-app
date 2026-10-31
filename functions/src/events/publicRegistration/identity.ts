import {eventParticipationId} from "../../shared/relationshipDocuments";
import {Timestamp} from "firebase-admin/firestore";
import type {EventAttendeeDocument} from
  "../../shared/generated/firestoreAdminTypes";
import {validateEventAttendeeDocument} from
  "../../shared/generated/validators/eventAttendeeDocument";
import {eventAttendeeId} from "../eventAttendees";
import {
  FirestoreSeatIdentityAuthority,
  prepareCatchUidSeatIdentity,
  prepareVerifiedUidAttendeeEnrollment,
  seatIdentityAliasId,
  seatIdentityValueHash,
} from "../seatIdentityAuthority";
import {registrationUnavailable} from "./policy";

/** Resolve the existing phone row before inventing an attendee ID. Import
 * provenance survives registration; ambiguity blocks collection of money.
 */
export async function preparePublicGuestIdentity(input: {
  db: FirebaseFirestore.Firestore;
  tx: FirebaseFirestore.Transaction;
  eventId: string;
  organizerId: string;
  uid: string;
  phoneE164: string;
  nowMillis: number;
}) {
  const {db, tx, eventId, organizerId, uid, phoneE164, nowMillis} = input;
  const matches = await tx.get(
    db
      .collection("eventAttendees")
      .where("eventId", "==", eventId)
      .where("phoneE164", "==", phoneE164)
      .limit(2),
  );
  if (matches.docs.length > 1) {
    registrationUnavailable("Your guest records need to be reconciled.");
  }
  const attendeeId =
    matches.docs[0]?.id ?? eventAttendeeId(eventId, `phone:${phoneE164}`);
  const attendeeRef = db.collection("eventAttendees").doc(attendeeId);
  const snap = await tx.get(attendeeRef);
  const existing = snap.exists ?
    (snap.data() as EventAttendeeDocument) :
    null;
  if (
    existing &&
    (!validateEventAttendeeDocument(existing) ||
      existing.eventId !== eventId ||
      existing.organizerId !== organizerId ||
      existing.phoneE164 !== phoneE164 ||
      (existing.linkedUid !== null && existing.linkedUid !== uid))
  ) {
    registrationUnavailable("Your guest identity needs to be reconciled.");
  }
  const nativeBooking = existing?.source === "catchBooking";
  const prepared =
    existing && !nativeBooking ?
      await prepareVerifiedUidAttendeeEnrollment({
        db,
        tx,
        eventId,
        organizerId,
        attendeeId,
        uid,
        authTokenPhoneNumber: phoneE164,
        now: Timestamp.fromMillis(nowMillis),
      }) :
      await prepareCatchUidSeatIdentity({
        db,
        tx,
        eventId,
        organizerId,
        uid,
        currentAuthPhoneNumber: phoneE164,
      });
  if (nativeBooking) {
    const participation = (
      await tx.get(
        db
          .collection("eventParticipations")
          .doc(eventParticipationId(eventId, uid)),
      )
    ).data();
    const resolved = await new FirestoreSeatIdentityAuthority().resolve({
      db,
      tx,
      eventId,
      organizerId,
      subject: {kind: "importAttendee", attendeeId},
    });
    if (
      existing.linkedUid !== uid ||
      !["registered", "checkedIn"].includes(existing.status) ||
      participation?.eventId !== eventId ||
      participation?.uid !== uid ||
      (participation?.organizerId) !==
        organizerId ||
      !["signedUp", "attended"].includes(participation?.status) ||
      resolved?.key !== prepared.identity.key ||
      resolved?.revision !== prepared.identity.revision
    ) {
      registrationUnavailable(
        "Existing Catch booking needs reconciliation.",
      );
    }
  }
  const aliasRef = db
    .collection("eventSeatIdentityAliases")
    .doc(seatIdentityAliasId(eventId, "attendee", attendeeId));
  if (!existing && (await tx.get(aliasRef)).exists) {
    registrationUnavailable();
  }
  return {
    attendeeId,
    attendeeRef,
    existing,
    identity: prepared.identity,
    apply: prepared.apply,
    createAttendeeAlias: (migrationRevision: number) => {
      if (existing) return;
      tx.create(aliasRef, {
        eventId,
        organizerId,
        kind: "attendee",
        valueHash: seatIdentityValueHash("attendee", attendeeId),
        canonicalKey: prepared.identity.key,
        identityRevision: prepared.identity.revision,
        migrationRevision,
        state: "ready",
      });
    },
  };
}
