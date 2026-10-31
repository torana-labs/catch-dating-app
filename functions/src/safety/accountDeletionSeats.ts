import {createHash} from "crypto";
import * as admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v2/https";
import type {EventParticipationDocument} from
  "../shared/generated/firestoreAdminTypes";
import {readSeatMigrationWriterFence} from
  "../events/seatMigrationPaged";
import {FirestoreSeatIdentityAuthority, seatIdentityAliasId,
  seatIdentityValueHash,
  seatVerifiedPhoneProofId} from
  "../events/seatIdentityAuthority";
import {applyFirestoreSeat, assertCurrentReadySeatSnapshot,
  deriveEventSeatPolicy, FirestoreSeatTransaction,
  prepareFirestoreSeat} from "../events/seatAuthority/firestoreAdapter";

const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/u;

function unavailable(message: string): never {
  throw new HttpsError("failed-precondition", message);
}

function decrement(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1) {
    unavailable(`${label} needs reconciliation before account deletion.`);
  }
  return Number(value) - 1;
}

function legacyEventPatch(participation: EventParticipationDocument):
  Record<string, unknown> {
  switch (participation.status) {
  case "signedUp": {
    const patch: Record<string, unknown> = {
      bookedCount: admin.firestore.FieldValue.increment(-1),
    };
    if (participation.genderAtSignup) {
      patch[`genderCounts.${participation.genderAtSignup}`] =
        admin.firestore.FieldValue.increment(-1);
    }
    return patch;
  }
  case "waitlisted":
    return {waitlistedCount: admin.firestore.FieldValue.increment(-1)};
  case "attended":
    return {checkedInCount: admin.firestore.FieldValue.increment(-1)};
  default:
    return {};
  }
}

/**
 * Each participation is removed under the same migration fence as booking.
 * The caller must finish this before unlinking retained Host attendees.
 */
export async function deleteAccountEventParticipations(params: {
  db: FirebaseFirestore.Firestore;
  uid: string;
  now: FirebaseFirestore.FieldValue;
  nowMillis: number;
}): Promise<void> {
  const {db, uid, now, nowMillis} = params;
  if (!ID.test(uid) || !Number.isSafeInteger(nowMillis) || nowMillis < 0) {
    unavailable("Account deletion seat scope is invalid.");
  }
  const participations = await db.collection("eventParticipations")
    .where("uid", "==", uid).get();
  const linkedAttendees = await db.collection("eventAttendees")
    .where("linkedUid", "==", uid).get();
  const byEvent = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
  for (const found of participations.docs) {
    const eventId = found.data().eventId;
    if (!ID.test(eventId) || byEvent.has(eventId)) {
      unavailable("Account participation sources need reconciliation.");
    }
    byEvent.set(eventId, found);
  }
  const eventIds = new Set(byEvent.keys());
  // A checkout can establish a UID identity before admission creates a roster
  // row. Discover those events too; the outer deletion tombstone prevents
  // checkout authority from adding new holds while cleanup is running.
  const uidAliases = await db.collection("eventSeatIdentityAliases")
    .where("valueHash", "==", seatIdentityValueHash("uid", uid)).get();
  for (const alias of uidAliases.docs) {
    const value = alias.data();
    if (value.kind !== "uid" || !ID.test(value.eventId)) {
      unavailable("Account checkout identity needs reconciliation.");
    }
    eventIds.add(value.eventId);
  }
  for (const attendee of linkedAttendees.docs) {
    const eventId = attendee.data().eventId;
    if (!ID.test(eventId)) {
      unavailable("Linked attendee event identity is malformed.");
    }
    eventIds.add(eventId);
  }
  for (const eventId of eventIds) {
    const found = byEvent.get(eventId);
    await db.runTransaction(async (tx) => {
      const currentSnap = found ? await tx.get(found.ref) : null;
      const current = currentSnap?.data() as EventParticipationDocument |
        undefined;
      if (current && (current.uid !== uid || current.eventId !== eventId)) {
        unavailable("Current participation identity is malformed.");
      }
      const eventRef = db.collection("events").doc(eventId);
      const eventSnap = await tx.get(eventRef);
      const event = eventSnap.data();
      const seatMode = await readSeatMigrationWriterFence({db, tx, eventId});
      const linked = await tx.get(db.collection("eventAttendees")
        .where("eventId", "==", eventId)
        .where("linkedUid", "==", uid).limit(3));
      if (linked.docs.length > 2) {
        unavailable("Linked attendee sources need reconciliation.");
      }
      if (seatMode === "ready") {
        const alias = (await tx.get(db.collection("eventSeatIdentityAliases")
          .doc(seatIdentityAliasId(eventId, "uid", uid)))).data();
        if (alias?.state === "ready" && alias.canonicalKey) {
          const held = await new FirestoreSeatTransaction(db, tx)
            .reservation(eventId, alias.canonicalKey);
          if (held?.checkoutHold || held?.temporaryHold) {
            unavailable("Finish payment reconciliation before deleting " +
              "account.");
          }
        }
      }
      const status = current?.status;
      if (status !== undefined && !["signedUp", "attended", "waitlisted",
        "cancelled", "deleted"]
        .includes(status)) {
        unavailable("Participation status is malformed.");
      }
      if ((!current || status === "deleted") && linked.docs.length === 0) {
        if (seatMode === "ready") {
          const aliasRef = db.collection("eventSeatIdentityAliases")
            .doc(seatIdentityAliasId(eventId, "uid", uid));
          const proofRef = db.collection("eventSeatVerifiedPhones")
            .doc(seatVerifiedPhoneProofId(eventId, uid));
          const [aliasSnap, proofSnap] = await Promise.all([
            tx.get(aliasRef), tx.get(proofRef),
          ]);
          const alias = aliasSnap.data();
          const proof = proofSnap.data();
          if (alias) {
            if (alias.eventId !== eventId || alias.kind !== "uid" ||
                alias.valueHash !== seatIdentityValueHash("uid", uid) ||
                !ID.test(alias.canonicalKey)) {
              unavailable("Deleted account seat identity is malformed.");
            }
            const reservation = await new FirestoreSeatTransaction(db, tx)
              .reservation(eventId, alias.canonicalKey);
            if (alias.state === "ready" &&
                (reservation?.active || reservation?.checkoutHold ||
                  reservation?.temporaryHold)) {
              unavailable("Deleted account still owns an active seat " +
                "or checkout.");
            }
          }
          if (proof && (proof.eventId !== eventId || proof.uid !== uid)) {
            unavailable("Deleted account phone proof is malformed.");
          }
          if (alias && alias.state !== "retired") {
            tx.update(aliasRef, {state: "retired"});
          }
          if (proof && (proof.state !== "revoked" ||
              proof.phoneE164 !== null)) {
            tx.update(proofRef, {state: "revoked", phoneE164: null});
          }
        }
        return;
      }
      if (seatMode === "legacy") {
        const patch = current && status !== "deleted" ?
          legacyEventPatch(current) : {};
        if (Object.keys(patch).length > 0) {
          if (!event) unavailable("Event aggregate is unavailable.");
          tx.update(eventRef, patch);
        }
        for (const row of linked.docs) {
          tx.update(row.ref, {linkedUid: null, linkedAt: null,
            updatedAt: now});
        }
        if (current && status !== "deleted") {
          tx.set(found!.ref, {status: "deleted", updatedAt: now,
            deletedAt: now}, {merge: true});
        }
        return;
      }
      if (!event || !ID.test(event.organizerId) ||
          event.organizerId !== undefined &&
          event.organizerId !== event.organizerId ||
          current && (current.organizerId !== event.organizerId ||
            current.organizerId !== undefined &&
            current.organizerId !== event.organizerId)) {
        unavailable("Ready event or participation tenant is malformed.");
      }
      const ledgerTx = new FirestoreSeatTransaction(db, tx);
      const ledger = await ledgerTx.ledger(eventId);
      if (!ledger || ledger.state !== "ready" ||
          !Number.isSafeInteger(ledger.occupied) ||
          ledger.occupied < 0) {
        unavailable("Ready seat ledger is unavailable.");
      }
      const policy = deriveEventSeatPolicy(event);
      if (policy.organizerId !== event.organizerId ||
          policy.capacity !== ledger.capacity ||
          policy.policyHash !== ledger.policyHash ||
          policy.policyVersion !== ledger.policyVersion) {
        unavailable("Event seat policy needs reconciliation.");
      }
      const active = status === "signedUp" || status === "attended";
      let retainHostSeat = false;
      const catchRows: FirebaseFirestore.QueryDocumentSnapshot[] = [];
      const identity = await new FirestoreSeatIdentityAuthority().resolve({
        db, tx, eventId, organizerId: event.organizerId,
        subject: {kind: "verifiedUid", uid},
      });
      if (!identity) unavailable("Current Catch seat is unresolved.");
      const proofRef = db.collection("eventSeatVerifiedPhones")
        .doc(seatVerifiedPhoneProofId(eventId, uid));
      const proof = (await tx.get(proofRef)).data();
      const uidAliasRef = db.collection("eventSeatIdentityAliases")
        .doc(seatIdentityAliasId(eventId, "uid", uid));
      if (!proof || proof.state !== "current" ||
          !(proof.phoneE164 === null ||
            typeof proof.phoneE164 === "string")) {
        unavailable("Current verified phone proof is unavailable.");
      }
      let seatPreparation: Awaited<ReturnType<
        typeof prepareFirestoreSeat>> | null = null;
      const independent = linked.docs.filter((guest) => {
        const row = guest.data();
        if (!["registered", "checkedIn"].includes(row.status)) {
          return false;
        }
        if (!["catchBooking", "hostImport", "hostManual", "webOtp",
          "providerSync"].includes(row.source)) {
          unavailable("Linked attendee source needs reconciliation.");
        }
        if (row.source === "catchBooking") {
          catchRows.push(guest);
          return false;
        }
        return true;
      });
      if (independent.length > 1 || catchRows.length > 1) {
        unavailable("Linked Host seats need reconciliation.");
      }
      for (const guest of [...independent, ...catchRows]) {
        const hostIdentity = await new FirestoreSeatIdentityAuthority()
          .resolve({db, tx, eventId, organizerId: event.organizerId,
            subject: {kind: "importAttendee",
              attendeeId: guest.id}});
        if (!hostIdentity || hostIdentity.key !== identity.key ||
            hostIdentity.revision !== identity.revision) {
          unavailable("Linked attendee seat needs reconciliation.");
        }
      }
      retainHostSeat = independent.length === 1;
      const reservation = await ledgerTx.reservation(eventId, identity.key);
      assertCurrentReadySeatSnapshot({event, eventId,
        organizerId: event.organizerId, identity, ledger, reservation});
      if (reservation?.checkoutHold || reservation?.temporaryHold) {
        unavailable("Finish payment reconciliation before deleting account.");
      }
      if (active || retainHostSeat) {
        if (!reservation?.active ||
            reservation.identityRevision !== identity.revision) {
          unavailable("Current occupied reservation is unavailable.");
        }
      } else if (reservation?.active) {
        unavailable("Unaccounted active reservation needs reconciliation.");
      }
      if (!active && catchRows.length > 0) {
        unavailable("Catch attendee has no active participation.");
      }
      if (active) {
        if (!retainHostSeat) {
          const requestId = "delete_" + createHash("sha256")
            .update(`${eventId}\u001f${uid}\u001f${reservation!.revision}`)
            .digest("hex").slice(0, 48);
          seatPreparation = await prepareFirestoreSeat({db, tx,
            identityAuthority: {resolve: async () => identity},
            command: {eventId, subject: {kind: "verifiedUid" as const, uid},
              operation: "release", requestId,
              expectedLedgerRevision: ledger.revision,
              expectedCapacityRevision: ledger.capacityRevision,
              expectedMigrationRevision: ledger.migrationRevision,
              expectedReservationRevision: reservation!.revision,
              nowMillis}});
        }
      }
      const patch: Record<string, unknown> = {};
      if (active) {
        const expected = ledger.occupied - (retainHostSeat ? 0 : 1);
        if (expected < 0) unavailable("Seat count needs reconciliation.");
        patch.bookedCount = expected;
        if (current?.genderAtSignup) {
          const genders = event.genderCounts;
          if (!genders || typeof genders !== "object" ||
              Array.isArray(genders)) {
            unavailable("Event gender counts need reconciliation.");
          }
          patch[`genderCounts.${current.genderAtSignup}`] = decrement(
            genders[current.genderAtSignup], "Event gender count");
        }
      }
      if (status === "attended" &&
          !independent.some((row) => row.data().status === "checkedIn")) {
        patch.checkedInCount = decrement(event.checkedInCount,
          "Event check-in count");
      } else if (status === "waitlisted") {
        patch.waitlistedCount = decrement(event.waitlistedCount,
          "Event waitlist count");
      }
      // Every authority read, including imported-seat proof, precedes writes.
      if (seatPreparation) applyFirestoreSeat(seatPreparation);
      tx.update(uidAliasRef, {state: "retired"});
      tx.update(proofRef, {phoneE164: null, state: "revoked"});
      if (active && !retainHostSeat && proof.phoneE164 !== null) {
        tx.update(db.collection("eventSeatIdentityAliases")
          .doc(seatIdentityAliasId(eventId, "phone", proof.phoneE164)),
        {state: "retired"});
      }
      for (const row of linked.docs) {
        tx.update(row.ref, {linkedUid: null, linkedAt: null,
          ...(catchRows.some((guest) => guest.id === row.id) ?
            {status: "cancelled"} : {}), updatedAt: now});
      }
      if (Object.keys(patch).length > 0) tx.update(eventRef, patch);
      if (current && status !== "deleted") {
        tx.set(found!.ref, {status: "deleted", updatedAt: now,
          deletedAt: now}, {merge: true});
      }
    });
  }
}
