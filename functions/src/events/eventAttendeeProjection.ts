import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import type {
  EventAttendeeDocument,
  EventParticipationDocument,
  PublicProfileDocument,
} from "../shared/generated/firestoreAdminTypes";
import {eventAttendeeId, normalizeRosterPhone} from "./eventAttendees";
import {eventParticipationId} from "../shared/relationshipDocuments";
import {readSeatMigrationWriterFence} from "./seatMigrationPaged";
import {FirestoreSeatIdentityAuthority,
  seatVerifiedPhoneProofId} from "./seatIdentityAuthority";
import {assertCurrentReadySeatSnapshot, FirestoreSeatTransaction} from
  "./seatAuthority/firestoreAdapter";

interface ProjectionDeps {
  firestore: () => FirebaseFirestore.Firestore;
  auth: () => admin.auth.Auth;
  timestamp: () => FirebaseFirestore.Timestamp;
}

const defaultDeps: ProjectionDeps = {
  firestore: () => admin.firestore(),
  auth: () => admin.auth(),
  timestamp: () => admin.firestore.Timestamp.now(),
};

/**
 * Projects a UID-backed Consumer participation into the Host operational
 * roster. A verified Auth phone may converge with a prior Host-supplied row,
 * but a Catch booking never discloses private-profile contact fields to the
 * organizer.
 */
export async function projectEventParticipationToAttendee(
  before: EventParticipationDocument | undefined,
  after: EventParticipationDocument | undefined,
  deps: ProjectionDeps = defaultDeps
): Promise<void> {
  const participation = after ?? before;
  if (!participation) return;
  const db = deps.firestore();
  const [verifiedPhone, profileSnap] = await Promise.all([
    verifiedPhoneForUid(participation.uid, deps.auth()),
    db.collection("publicProfiles").doc(participation.uid).get(),
  ]);
  const profile = profileSnap.data() as PublicProfileDocument | undefined;
  await db.runTransaction(async (tx) => {
    const currentSnap = await tx.get(db.collection("eventParticipations")
      .doc(eventParticipationId(participation.eventId, participation.uid)));
    const mode = await readSeatMigrationWriterFence({db, tx,
      eventId: participation.eventId});
    // The trigger payload may be older than the current source. Ready mode
    // never projects from that stale payload or creates occupancy.
    if (mode === "ready" && !currentSnap.exists) return;
    const source = (currentSnap.data() as EventParticipationDocument |
      undefined) ?? participation;
    if (source.eventId !== participation.eventId ||
        source.uid !== participation.uid) return;
    const organizerId = source.organizerId;
    const stableKey = verifiedPhone ?
      `phone:${verifiedPhone}` : `uid:${source.uid}`;
    const fallbackRef = db.collection("eventAttendees")
      .doc(eventAttendeeId(source.eventId, stableKey));
    const linkedRows = mode === "ready" ? await tx.get(db
      .collection("eventAttendees").where("eventId", "==", source.eventId)
      .where("linkedUid", "==", source.uid).limit(2)) : null;
    if (linkedRows && linkedRows.size > 1) {
      logger.warn("Ambiguous ready roster projection", {eventId:
        source.eventId, uid: source.uid});
      return;
    }
    const attendeeRef = linkedRows?.docs[0]?.ref ?? fallbackRef;
    const existingSnap = await tx.get(attendeeRef);
    const existing = existingSnap.data() as EventAttendeeDocument | undefined;
    if (mode === "ready") {
      const event = (await tx.get(db.collection("events")
        .doc(source.eventId))).data();
      if (source.organizerId !== organizerId ||
          source.organizerId !== undefined &&
            source.organizerId !== organizerId) return;
      const identity = await new FirestoreSeatIdentityAuthority().resolve({
        db, tx, eventId: source.eventId, organizerId,
        subject: {kind: "verifiedUid", uid: source.uid},
      });
      if (!identity) return;
      const proof = (await tx.get(db.collection("eventSeatVerifiedPhones")
        .doc(seatVerifiedPhoneProofId(source.eventId, source.uid)))).data();
      if (!proof || proof.phoneE164 !== verifiedPhone) return;
      const seats = new FirestoreSeatTransaction(db, tx);
      const [ledger, reservation] = await Promise.all([
        seats.ledger(source.eventId),
        seats.reservation(source.eventId, identity.key),
      ]);
      // The payment owner will project the final admission or cancellation.
      if (reservation?.checkoutHold || reservation?.temporaryHold) return;
      const active = source.status === "signedUp" ||
        source.status === "attended";
      try {
        assertCurrentReadySeatSnapshot({event, eventId: source.eventId,
          organizerId, identity, ledger, reservation,
          expectedActive: active});
      } catch {
        return;
      }
      if (existing && (existing.eventId !== source.eventId ||
          existing.organizerId !== organizerId ||
          existing.linkedUid !== source.uid)) return;
      if (existing && existing.source !== "catchBooking") return;
      if (!active && !existing && source.status !== "waitlisted") return;
    }
    const now = deps.timestamp();
    const sourceStatus = currentSnap.exists ? source.status : "deleted";
    const status = projectedParticipationStatus(
      participationStatus(sourceStatus), existing?.status);
    const displayName = profile?.name?.trim() || existing?.displayName ||
      source.uid;
    const document: EventAttendeeDocument = {
      eventId: source.eventId,
      organizerId,
      displayName,
      searchName: displayName.toLocaleLowerCase("en"),
      source: existing?.source ?? "catchBooking",
      status,
      linkedUid: source.uid,
      phoneE164: existing?.phoneE164 ?? null,
      email: existing?.email ?? null,
      externalReference: existing?.externalReference ?? null,
      arrivalGroup: existing?.arrivalGroup ?? null,
      ticketType: existing?.ticketType ?? null,
      importId: existing?.importId ?? null,
      sourceRowId: existing?.sourceRowId ?? null,
      createdAt: existing?.createdAt ?? source.createdAt,
      updatedAt: now,
      registeredAt: source.signedUpAt ?? existing?.registeredAt ?? null,
      waitlistedAt: source.waitlistedAt ?? existing?.waitlistedAt ?? null,
      checkedInAt: status === "checkedIn" ?
        source.attendedAt ?? existing?.checkedInAt ?? now : null,
      cancelledAt: status === "cancelled" ?
        source.cancelledAt ?? source.deletedAt ?? now : null,
      checkedInBy: existing?.checkedInBy ?? null,
      linkedAt: existing?.linkedAt ?? source.createdAt,
      inviteLinkId: existing?.inviteLinkId ?? source.inviteLinkId ?? null,
      inviteCapturedAt: existing?.inviteCapturedAt ??
        source.inviteCapturedAt ?? null,
      attendanceRevision: existing?.attendanceRevision ?? 0,
      preCheckInStatus: status === "checkedIn" ?
        existing?.preCheckInStatus ?? "registered" : null,
    };
    tx.set(attendeeRef, document);
  });
}

async function verifiedPhoneForUid(
  uid: string,
  auth: admin.auth.Auth
): Promise<string | null> {
  try {
    const user = await auth.getUser(uid);
    return normalizeRosterPhone(user.phoneNumber).value;
  } catch (error) {
    logger.warn("Could not resolve verified phone for attendee projection", {
      uid,
      error,
    });
    return null;
  }
}

export function projectedParticipationStatus(
  participation: EventAttendeeDocument["status"],
  existing: EventAttendeeDocument["status"] | undefined
): EventAttendeeDocument["status"] {
  if (participation !== "cancelled" && existing === "checkedIn") {
    return "checkedIn";
  }
  return participation;
}

export function participationStatus(
  status: EventParticipationDocument["status"] | undefined
): EventAttendeeDocument["status"] {
  switch (status) {
  case "signedUp": return "registered";
  case "waitlisted": return "waitlisted";
  case "attended": return "checkedIn";
  case "cancelled":
  case "deleted":
  case undefined:
    return "cancelled";
  }
}

export const onEventParticipationRosterProjected = onDocumentWritten(
  "eventParticipations/{participationId}",
  async (event) => {
    const before = event.data?.before.data() as
      EventParticipationDocument | undefined;
    const after = event.data?.after.data() as
      EventParticipationDocument | undefined;
    await projectEventParticipationToAttendee(before, after);
  }
);
