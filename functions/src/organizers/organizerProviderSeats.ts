import {createHash} from "crypto";
import {HttpsError} from "firebase-functions/v2/https";
import type {EventAttendeeDocument, EventDocument} from
  "../shared/generated/firestoreAdminTypes";
import {eventParticipationId} from "../shared/relationshipDocuments";
import {assertReadySeatState} from
  "../events/seatAuthority/seatAuthority";
import {FirestoreSeatIdentityAuthority, SeatIdentityAlias,
  seatIdentityAliasId, seatIdentityValueHash} from
  "../events/seatIdentityAuthority";
import {applyFirestoreSeatBatch, assertCurrentReadySeatSnapshot,
  deriveEventSeatPolicy, FirestoreSeatTransaction,
  prepareFirestoreSeatBatch} from
  "../events/seatAuthority/firestoreAdapter";

const ACTIVE = new Set(["registered", "checkedIn"]);
const MAX_READY_GUESTS = 50;
function fail(message: string): never {
  throw new HttpsError("failed-precondition", message);
}
const hash = (parts: string[]): string => createHash("sha256")
  .update(parts.join("\u001f")).digest("hex");
const guestKey = (eventId: string, attendeeId: string): string =>
  `guest_${hash([eventId, attendeeId]).slice(0, 48)}`;

export interface ProviderSeatWrite {
  id: string;
  old: EventAttendeeDocument | undefined;
  document: EventAttendeeDocument;
}

/**
 * Plans all ready-seat transitions from one current provider roster snapshot.
 * The caller stages the returned attendee and run writes in this same tx.
 */
export async function prepareProviderSeatChanges(params: {
  db: FirebaseFirestore.Firestore;
  tx: FirebaseFirestore.Transaction;
  event: EventDocument;
  eventId: string;
  organizerId: string;
  runId: string;
  nowMillis: number;
  writes: ProviderSeatWrite[];
}): Promise<{seatDelta: number; occupiedAfter: number}> {
  const {db, tx, event, eventId, organizerId, writes} = params;
  if (writes.length > MAX_READY_GUESTS ||
      !Number.isSafeInteger(params.nowMillis) || params.nowMillis < 0) {
    throw new HttpsError("resource-exhausted",
      "This ready roster exceeds one atomic provider review.");
  }
  const seatTx = new FirestoreSeatTransaction(db, tx);
  const ledger = await seatTx.ledger(eventId);
  const policy = deriveEventSeatPolicy(event);
  if (!ledger) fail("Provider roster seat ledger is unavailable.");
  // Validate the ledger even when every provider row is inactive and no seat
  // operation would otherwise invoke the shared seat planner.
  assertReadySeatState(eventId,
    {key: "providerLedgerValidation", revision: 1}, ledger, null);
  if (ledger.state !== "ready" || policy.organizerId !== organizerId ||
      ledger.capacity !== policy.capacity ||
      ledger.policyHash !== policy.policyHash ||
      ledger.policyVersion !== policy.policyVersion) {
    fail("Provider roster seat policy needs reconciliation.");
  }
  const identities = new Map<string, {key: string; revision: number}>();
  const aliasCreates: Array<{id: string; value: SeatIdentityAlias}> = [];
  const operations: Array<{subject: string; operation: "reserve" | "release";
    requestId: string; expectedReservationRevision: number}> = [];
  let seatDelta = 0;
  for (const write of writes) {
    const {id, old, document} = write;
    const oldActive = old !== undefined && ACTIVE.has(old.status);
    if (old && (old.eventId !== eventId ||
        old.organizerId !== organizerId ||
        old.organizerId !== event.organizerId) ||
        document.eventId !== eventId ||
        document.organizerId !== organizerId ||
        document.organizerId !== event.organizerId) {
      fail("Provider attendee tenant changed.");
    }
    if (old && old.source !== "providerSync" &&
        (!oldActive || !ACTIVE.has(document.status))) {
      // A provider status cannot create or revoke independent Catch/Host
      // admission. Its check-in can enrich an already-active source only.
      document.status = old.status;
      document.cancelledAt = old.cancelledAt;
      document.registeredAt = old.registeredAt;
      document.checkedInAt = old.checkedInAt;
      document.checkedInBy = old.checkedInBy;
    }
    const nextActive = ACTIVE.has(document.status);
    if (!oldActive && !nextActive) {
      // Inactive rows can still own a paid checkout. Never replace their
      // phone/reference/status while its payment is being reconciled.
      const keys: Array<["attendee" | "phone" | "external", string]> =
        [["attendee", id]];
      for (const row of [old, document]) {
        if (row?.phoneE164) keys.push(["phone", row.phoneE164]);
        if (row?.externalReference) {
          keys.push(["external", row.externalReference.trim().toLowerCase()]);
        }
      }
      for (const [kind, value] of keys) {
        const alias = (await tx.get(db.collection("eventSeatIdentityAliases")
          .doc(seatIdentityAliasId(eventId, kind, value)))).data();
        if (alias?.canonicalKey) {
          const reservation = await seatTx.reservation(eventId,
            alias.canonicalKey);
          if (reservation?.checkoutHold || reservation?.temporaryHold) {
            fail("Finish checkout before replacing this provider guest.");
          }
        }
      }
      continue;
    }
    const aliases: Array<{kind: "attendee" | "phone" | "external";
      value: string}> = [{kind: "attendee", value: id}];
    if (document.phoneE164) {
      aliases.push({kind: "phone",
        value: document.phoneE164});
    }
    if (document.externalReference) {
      aliases.push({kind: "external",
        value: document.externalReference.trim().toLowerCase()});
    }
    const reads = await Promise.all(aliases.map(async (alias) => {
      const ref = db.collection("eventSeatIdentityAliases")
        .doc(seatIdentityAliasId(eventId, alias.kind, alias.value));
      return {alias, ref, value: (await tx.get(ref)).data() as
        SeatIdentityAlias | undefined};
    }));
    const attendeeAlias = reads[0].value;
    const key = attendeeAlias?.canonicalKey ?? guestKey(eventId, id);
    const revision = attendeeAlias?.identityRevision ?? 1;
    for (const read of reads) {
      if (read.value) {
        if (read.value.eventId !== eventId ||
            read.value.organizerId !== organizerId ||
            read.value.kind !== read.alias.kind ||
            read.value.valueHash !== seatIdentityValueHash(read.alias.kind,
              read.alias.value) || read.value.canonicalKey !== key ||
            read.value.identityRevision !== revision ||
            read.value.migrationRevision !== ledger.migrationRevision ||
            read.value.state !== "ready") {
          fail("Provider identity aliases need reconciliation.");
        }
      } else if (oldActive || attendeeAlias) {
        // A changed phone or provider reference cannot silently alter the
        // canonical identity of an already confirmed attendee.
        fail("Confirmed provider identity aliases changed.");
      } else {
        aliasCreates.push({id: read.ref.id, value: {eventId, organizerId,
          kind: read.alias.kind,
          valueHash: seatIdentityValueHash(read.alias.kind,
            read.alias.value), canonicalKey: key,
          identityRevision: revision,
          migrationRevision: ledger.migrationRevision, state: "ready"}});
      }
    }
    const identity = {key, revision};
    identities.set(id, identity);
    if (oldActive) {
      const actual = await new FirestoreSeatIdentityAuthority().resolve({
        db, tx, eventId, organizerId,
        subject: {kind: "importAttendee", attendeeId: id}});
      if (!actual || actual.key !== key || actual.revision !== revision) {
        fail("Current provider attendee identity changed.");
      }
    }
    const reservation = await seatTx.reservation(eventId, key);
    if (oldActive) {
      assertCurrentReadySeatSnapshot({event, eventId, organizerId,
        identity, ledger, reservation, expectedActive: true});
    }
    let catchActive = false;
    if (document.linkedUid) {
      const participation = (await tx.get(db.collection("eventParticipations")
        .doc(eventParticipationId(eventId, document.linkedUid)))).data();
      catchActive = participation?.uid === document.linkedUid &&
        participation.eventId === eventId &&
        ["signedUp", "attended"].includes(participation.status);
    }
    if (oldActive && !nextActive && !catchActive ||
        !oldActive && nextActive && !reservation?.active) {
      const operation = oldActive ? "release" : "reserve";
      operations.push({subject: id, operation,
        requestId: `provider_${hash([params.runId, id, operation])
          .slice(0, 48)}`,
        expectedReservationRevision: reservation?.revision ?? 0});
      seatDelta += oldActive ? -1 : 1;
    } else if (nextActive && reservation?.active) {
      assertCurrentReadySeatSnapshot({event, eventId, organizerId,
        identity, ledger, reservation, expectedActive: true});
      if (!oldActive && !catchActive) {
        fail("An existing seat has no current provider or Catch source.");
      }
    }
  }
  if (operations.length > 0) {
    const prepared = await prepareFirestoreSeatBatch({db, tx,
      identityAuthority: {resolve: async ({subject}: {subject: string}) =>
        identities.get(subject) ?? null},
      command: {eventId, batchId: params.runId,
        expectedLedgerRevision: ledger.revision,
        expectedCapacityRevision: ledger.capacityRevision,
        expectedMigrationRevision: ledger.migrationRevision,
        nowMillis: params.nowMillis, operations}});
    applyFirestoreSeatBatch(prepared);
  }
  const seen = new Set<string>();
  for (const alias of aliasCreates) {
    if (seen.has(alias.id)) fail("Provider roster repeats one identity.");
    seen.add(alias.id);
    tx.create(db.collection("eventSeatIdentityAliases").doc(alias.id),
      alias.value);
  }
  return {seatDelta, occupiedAfter: ledger.occupied + seatDelta};
}
