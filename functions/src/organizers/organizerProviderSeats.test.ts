import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import test from "node:test";
import * as admin from "firebase-admin";
import {eventParticipationId} from "../shared/relationshipDocuments";
import {LumaProviderError} from "./organizerLumaProvider";
import {seatIdentityAliasId, seatIdentityValueHash} from
  "../events/seatIdentityAuthority";
import {deriveEventSeatPolicy} from
  "../events/seatAuthority/firestoreAdapter";
import {externalEventMappingId, lumaAttendeeDocument, providerSyncRunId,
  reconcileLumaGuests, syncOrganizerProviderEventHandler} from
  "./organizerProviderSetup";
import {prepareProviderSeatChanges, ProviderSeatWrite} from
  "./organizerProviderSeats";

const now = admin.firestore.Timestamp.fromMillis(1000);
const eventId = "event1";
const organizerId = "org1";
const attendeeId = "att1";
const uid = "runner1";
const operationId = "operation12345678";
const mappingId = externalEventMappingId(eventId);
const guest = {id: "guest1", displayName: "Asha", phone: null,
  email: null, approvalStatus: "approved" as const,
  registeredAt: null, checkedInAt: null, ticketType: null};
const digest = (parts: string[]) => createHash("sha256")
  .update(parts.join("\u001f")).digest("hex");
const key = `guest_${digest([eventId, attendeeId]).slice(0, 48)}`;
const reservationPath = `eventSeatReservations/${digest([eventId, key])}`;

function fixture(options: {active?: boolean; occupied?: number;
  linkedUid?: string | null} = {}) {
  const event = {organizerId,
    status: "active", capacityLimit: 2, constraints: {}};
  const policy = deriveEventSeatPolicy(event);
  const docs: Record<string, Record<string, unknown>> = {
    [`events/${eventId}`]: event,
    [`eventSeatLedgers/${eventId}`]: {eventId, capacity: 2,
      occupied: options.occupied ?? (options.active ? 1 : 0),
      revision: 1, capacityRevision: 1, migrationRevision: 1,
      state: "ready", policyHash: policy.policyHash,
      policyVersion: policy.policyVersion},
  };
  const old = options.active ? lumaAttendeeDocument({eventId,
    organizerId, connectionId: "connection1",
    guest, now}) : undefined;
  if (old) {
    old.linkedUid = options.linkedUid ?? null;
    docs[`eventAttendees/${attendeeId}`] = old as unknown as
      Record<string, unknown>;
    docs[reservationPath] = {eventId, canonicalKey: key,
      identityRevision: 1, active: true, revision: 1,
      reservedAtMillis: 100, releasedAtMillis: null};
    for (const [kind, value] of [["attendee", attendeeId],
      ["external", guest.id], ...(old.linkedUid ?
        [["uid", old.linkedUid]] : [])]) {
      docs[`eventSeatIdentityAliases/${seatIdentityAliasId(eventId,
        kind as "attendee" | "external" | "uid", value)}`] = {
        eventId, organizerId, kind,
        valueHash: seatIdentityValueHash(kind as
          "attendee" | "external" | "uid", value),
        canonicalKey: key, identityRevision: 1,
        migrationRevision: 1, state: "ready"};
    }
  }
  if (options.linkedUid) {
    docs[`eventParticipations/${eventParticipationId(eventId, uid)}`] = {
      eventId, uid, status: "signedUp"};
  }
  let writesStarted = false;
  const pending: Array<() => void> = [];
  const ref = (path: string) => ({id: path.split("/").pop(), path});
  const tx = {
    get: async (reference: {path: string}) => {
      assert.equal(writesStarted, false, "all reads precede writes");
      const value = docs[reference.path];
      return {exists: value !== undefined, data: () => value};
    },
    set: (reference: {path: string}, value: Record<string, unknown>) => {
      writesStarted = true;
      pending.push(() => {
        docs[reference.path] = value;
      });
    },
    create: (reference: {path: string}, value: Record<string, unknown>) => {
      writesStarted = true;
      pending.push(() => {
        assert.equal(docs[reference.path], undefined);
        docs[reference.path] = value;
      });
    },
  };
  const db = {collection: (name: string) => ({doc: (id: string) =>
    ref(`${name}/${id}`)})};
  return {docs, event, old, db: db as unknown as
    FirebaseFirestore.Firestore,
  tx: tx as unknown as FirebaseFirestore.Transaction,
  commit: () => pending.forEach((write) => write()),
  get pendingCount() {
    return pending.length;
  }};
}

function write(old: ReturnType<typeof fixture>["old"],
  approvalStatus: "approved" | "declined" = "approved"):
  ProviderSeatWrite {
  return {id: attendeeId, old,
    document: lumaAttendeeDocument({eventId, organizerId,
      connectionId: "connection1",
      guest: {...guest, approvalStatus}, old, now})};
}

test("ready provider guest reserves once and replay changes no seat",
  async () => {
    const h = fixture();
    const first = write(undefined);
    const result = await prepareProviderSeatChanges({db: h.db, tx: h.tx,
      event: h.event as never, eventId, organizerId, runId: "run1",
      nowMillis: 1000, writes: [first]});
    assert.deepEqual(result, {seatDelta: 1, occupiedAfter: 1});
    h.tx.set(h.db.collection("eventAttendees").doc(attendeeId),
      first.document);
    h.commit();
    assert.equal(h.docs[`eventSeatLedgers/${eventId}`].occupied, 1);
    assert.equal(h.docs[reservationPath].active, true);
    const again = fixture({active: true});
    const repeat = await prepareProviderSeatChanges({db: again.db,
      tx: again.tx, event: again.event as never, eventId, organizerId,
      runId: "run2", nowMillis: 1100, writes: [write(again.old)]});
    assert.deepEqual(repeat, {seatDelta: 0, occupiedAfter: 1});
    assert.equal(again.pendingCount, 0);
  });

test("declined provider registration releases once without a Catch seat",
  async () => {
    const h = fixture({active: true});
    const result = await prepareProviderSeatChanges({db: h.db, tx: h.tx,
      event: h.event as never, eventId, organizerId, runId: "run1",
      nowMillis: 1000, writes: [write(h.old, "declined")]});
    assert.deepEqual(result, {seatDelta: -1, occupiedAfter: 0});
    h.commit();
    assert.equal(h.docs[reservationPath].active, false);
    assert.equal(h.docs[`eventSeatLedgers/${eventId}`].occupied, 0);
  });

test("declined provider status retains an independently active Catch seat",
  async () => {
    const h = fixture({active: true, linkedUid: uid});
    const result = await prepareProviderSeatChanges({db: h.db, tx: h.tx,
      event: h.event as never, eventId, organizerId, runId: "run1",
      nowMillis: 1000, writes: [write(h.old, "declined")]});
    assert.deepEqual(result, {seatDelta: 0, occupiedAfter: 1});
    assert.equal(h.pendingCount, 0);
  });

test("full ready event rejects a new provider guest before staging writes",
  async () => {
    const h = fixture({occupied: 2});
    await assert.rejects(prepareProviderSeatChanges({db: h.db, tx: h.tx,
      event: h.event as never, eventId, organizerId, runId: "run1",
      nowMillis: 1000, writes: [write(undefined)]}));
    assert.equal(h.pendingCount, 0);
  });

test("ready provider roster cap fails before any transaction write",
  async () => {
    const h = fixture();
    await assert.rejects(prepareProviderSeatChanges({db: h.db, tx: h.tx,
      event: h.event as never, eventId, organizerId, runId: "run1",
      nowMillis: 1000, writes: Array.from({length: 51}, () =>
        write(undefined))}), /exceeds one atomic provider review/u);
    assert.equal(h.pendingCount, 0);
  });

function reconcileFixture(options: {locked?: boolean; ready?: boolean;
  changedMapping?: boolean; checkedInBeforeTx?: boolean;
  uncertainCommit?: boolean; withoutRun?: boolean} = {}) {
  const runId = providerSyncRunId(eventId, "host1", operationId);
  const event = {organizerId, status: "active",
    eventOrigin: {mode: "externalCompanion", provider: "luma"},
    capacityLimit: 2, constraints: {},
    bookedCount: 0, checkedInCount: 1};
  const old = lumaAttendeeDocument({eventId, organizerId,
    connectionId: "connection1", guest, now});
  const docs: Record<string, Record<string, unknown>> = {
    [`organizers/${organizerId}`]: {hostUserId: "host1",
      hostUserIds: [], hostProfiles: []},
    [`events/${eventId}`]: event,
    [`externalEventMappings/${mappingId}`]: {eventId, organizerId,
      status: "active", connectionId: "connection1", revision: 1,
      externalEventId: "lumaEvent1", lastSyncRunId: runId},
    "organizerProviderConnections/connection1": {organizerId,
      status: "active", revision: 1, secretVersionResource: "secret1"},
    ...(!options.withoutRun ? {[`providerSyncRuns/${runId}`]: {
      organizerId, eventId,
      connectionId: "connection1", mappingId,
      provider: "luma", clientOperationId: operationId,
      inputHash: "inputHash", status: "running", pageCount: 0,
      receivedCount: 0, createdCount: 0, updatedCount: 0,
      skippedCount: 0, truncated: false, errorCode: null,
      startedByUid: "host1", startedAt: now, completedAt: null,
      expiresAt: now}} : {}),
    ...(!options.ready ? {[`eventAttendees/${attendeeId}`]: old as unknown as
      Record<string, unknown>} : {}),
  };
  if (options.ready) {
    const policy = deriveEventSeatPolicy(event);
    docs[`eventSeatMigrationFences/${eventId}`] = {eventId,
      migrationRevision: 1, state: "ready"};
    docs[`eventSeatLedgers/${eventId}`] = {eventId, capacity: 2,
      occupied: 0, revision: 1, capacityRevision: 1, migrationRevision: 1,
      state: "ready", policyHash: policy.policyHash,
      policyVersion: policy.policyVersion};
  }
  if (options.locked) {
    docs[`eventSeatMigrationFences/${eventId}`] = {eventId,
      migrationRevision: 1, state: "locked"};
    docs[`eventSeatLedgers/${eventId}`] = {eventId,
      migrationRevision: 1, state: "ready"};
  }
  const query = (name: string, predicates: Array<[string, unknown]> = [],
    max = Infinity) => ({
    where: (field: string, op: string, value: unknown) => {
      assert.equal(op, "==");
      return query(name, [...predicates, [field, value]], max);
    },
    limit: (count: number) => query(name, predicates, count),
    get: async () => ({docs: Object.entries(docs)
      .filter(([path, value]) => path.startsWith(`${name}/`) &&
        path.slice(name.length + 1).indexOf("/") < 0 &&
        predicates.every(([field, expected]) => value[field] === expected))
      .slice(0, max).map(([path, value]) => ({id: path.split("/").pop(),
        ref: {path}, data: () => value}))}),
  });
  const db = {collection: (name: string) => ({
    doc: (id: string) => ({id, path: `${name}/${id}`,
      get: async () => {
        const value = docs[`${name}/${id}`];
        return {exists: value !== undefined, data: () =>
          value ? {...value} : undefined};
      }}),
    where: query(name).where,
  }),
  runTransaction: async <T>(callback: (
    tx: FirebaseFirestore.Transaction) => Promise<T>) => {
    if (options.changedMapping) {
      docs[`externalEventMappings/${mappingId}`].revision = 2;
    }
    if (options.checkedInBeforeTx) {
      docs[`eventAttendees/${attendeeId}`].status = "checkedIn";
    }
    const writes: Array<() => void> = [];
    const tx = {get: async (source: {path?: string;
      get?: () => Promise<unknown>}) => {
      assert.equal(writes.length, 0, "reads precede writes");
      if (source.get) return source.get();
      const value = docs[source.path!];
      return {exists: value !== undefined, data: () => value};
    },
    set: (ref: {path: string}, value: Record<string, unknown>) =>
      writes.push(() => {
        docs[ref.path] = value;
      }),
    update: (ref: {path: string}, value: Record<string, unknown>) =>
      writes.push(() => {
        docs[ref.path] = {...docs[ref.path], ...value};
      }),
    create: (ref: {path: string}, value: Record<string, unknown>) =>
      writes.push(() => {
        assert.equal(docs[ref.path], undefined);
        docs[ref.path] = value;
      }),
    } as unknown as FirebaseFirestore.Transaction;
    const result = await callback(tx);
    writes.forEach((write) => write());
    if (options.uncertainCommit && writes.some((write) =>
      Boolean(write)) && docs[`providerSyncRuns/${runId}`]?.status ===
      "completed") {
      options.uncertainCommit = false;
      throw new Error("commit acknowledgement lost");
    }
    return result;
  }};
  return {db: db as unknown as FirebaseFirestore.Firestore,
    docs, old, run: docs[`providerSyncRuns/${runId}`] as never};
}

async function reconcileFixtureRun(h: ReturnType<typeof reconcileFixture>) {
  return reconcileLumaGuests({db: h.db, actorUid: "host1",
    connectionId: "connection1", mappingId: mappingId,
    expectedMappingRevision: 1, expectedConnectionRevision: 1,
    expectedSecretVersionResource: "secret1",
    expectedExternalEventId: "lumaEvent1", guests: [guest],
    pageCount: 1, truncated: false, now, run: h.run});
}

test("legacy provider sync rereads a concurrent check-in in its writer TX",
  async () => {
    const h = reconcileFixture({checkedInBeforeTx: true});
    const receipt = await reconcileFixtureRun(h);
    assert.equal(receipt.status, "completed");
    assert.equal(h.docs[`eventAttendees/${attendeeId}`].status, "checkedIn");
    assert.equal(h.docs[`events/${eventId}`].checkedInCount, 1);
    assert.equal(h.docs[`providerSyncRuns/${providerSyncRunId(eventId,
      "host1", operationId)}`].status, "completed");
  });

test("migration lock or changed provider mapping rejects all roster writes",
  async () => {
    for (const option of [{locked: true}, {changedMapping: true}]) {
      const h = reconcileFixture(option);
      await assert.rejects(reconcileFixtureRun(h));
      assert.equal(h.docs[`eventAttendees/${attendeeId}`], h.old);
      assert.equal(h.docs[`providerSyncRuns/${providerSyncRunId(eventId,
        "host1", operationId)}`].status, "running");
    }
  });


test("ready provider sync commits attendee, seat, and run atomically",
  async () => {
    const h = reconcileFixture({ready: true});
    const receipt = await reconcileFixtureRun(h);
    assert.equal(receipt.status, "completed");
    assert.equal(h.docs[`eventSeatLedgers/${eventId}`].occupied, 1);
    assert.equal(h.docs[`eventAttendees/${eventId}`], undefined);
    assert.equal(Object.values(h.docs).filter((row) =>
      row.providerGuestId === guest.id).length, 1);
    assert.equal(h.docs[`providerSyncRuns/${providerSyncRunId(eventId,
      "host1", operationId)}`].status, "completed");
  });

test("ready provider sync rejects roster over fifty without partial writes",
  async () => {
    const h = reconcileFixture({ready: true});
    const before = Object.fromEntries(Object.entries(h.docs).map(
      ([path, value]) => [path, {...value}]));
    await assert.rejects(reconcileLumaGuests({db: h.db, actorUid: "host1",
      connectionId: "connection1", mappingId: mappingId,
      expectedMappingRevision: 1, expectedConnectionRevision: 1,
      expectedSecretVersionResource: "secret1",
      expectedExternalEventId: "lumaEvent1",
      guests: Array.from({length: 51}, (_, index) => ({...guest,
        id: `guest${index}`})), pageCount: 1, truncated: false, now,
      run: h.run}), /exceeds one atomic provider review/u);
    assert.deepEqual(h.docs, before);
  });


test("handler recovers a committed ready sync after lost acknowledgement",
  async () => {
    const h = reconcileFixture({ready: true, withoutRun: true,
      uncertainCommit: true});
    const response = await syncOrganizerProviderEventHandler({
      auth: {uid: "host1"}, data: {organizerId, eventId,
        clientOperationId: operationId},
    } as never, {firestore: () => h.db,
      checkRateLimit: async () => undefined,
      luma: () => ({listGuests: async () => ({entries: [guest],
        nextCursor: null, hasMore: false})}) as never,
      credentialStore: {access: async () => "test-key"} as never,
      now: () => now});
    assert.equal(response.status, "completed");
    assert.equal(response.replayed, true);
    assert.equal(response.createdCount, 1);
    assert.equal(h.docs[`eventSeatLedgers/${eventId}`].occupied, 1);
    assert.equal(Object.values(h.docs).filter((row) =>
      row.providerGuestId === guest.id).length, 1);
  });

test("oversize ready handler records failure without a partial roster",
  async () => {
    const h = reconcileFixture({ready: true, withoutRun: true});
    const providerGuests = Array.from({length: 51}, (_, index) => ({...guest,
      id: `guest${index}`}));
    await assert.rejects(syncOrganizerProviderEventHandler({
      auth: {uid: "host1"}, data: {organizerId, eventId,
        clientOperationId: operationId},
    } as never, {firestore: () => h.db,
      checkRateLimit: async () => undefined,
      luma: () => ({listGuests: async () => ({entries: providerGuests,
        nextCursor: null, hasMore: false})}) as never,
      credentialStore: {access: async () => "test-key"} as never,
      now: () => now}), /exceeds one atomic provider review/u);
    const run = h.docs[`providerSyncRuns/${providerSyncRunId(eventId,
      "host1", operationId)}`];
    assert.equal(run.status, "failed");
    assert.equal(run.createdCount, 0);
    assert.equal(h.docs[`eventSeatLedgers/${eventId}`].occupied, 0);
    assert.equal(Object.values(h.docs).filter((row) =>
      row.providerGuestId !== undefined).length, 0);
  });


test("ready provider rejects a matched attendee owned by another tenant",
  async () => {
    for (const field of ["organizerId", "organizerId"] as const) {
      const h = fixture({active: true});
      h.old![field] = "foreignOrg";
      await assert.rejects(prepareProviderSeatChanges({db: h.db, tx: h.tx,
        event: h.event as never, eventId, organizerId, runId: "run1",
        nowMillis: 1000, writes: [write(h.old)]}),
      /Provider attendee tenant changed/u);
      assert.equal(h.pendingCount, 0);
    }
  });

test("all-inactive ready sync rejects malformed ledger before attendee writes",
  async () => {
    for (const malformed of [{occupied: 3}, {revision: -1},
      {capacityRevision: 0}, {migrationRevision: 0}]) {
      const h = reconcileFixture({ready: true});
      Object.assign(h.docs[`eventSeatLedgers/${eventId}`], malformed);
      await assert.rejects(reconcileLumaGuests({db: h.db,
        actorUid: "host1", connectionId: "connection1", mappingId,
        expectedMappingRevision: 1, expectedConnectionRevision: 1,
        expectedSecretVersionResource: "secret1",
        expectedExternalEventId: "lumaEvent1",
        guests: [{...guest, approvalStatus: "declined"}],
        pageCount: 1, truncated: false, now, run: h.run}));
      assert.equal(h.docs[`providerSyncRuns/${providerSyncRunId(eventId,
        "host1", operationId)}`].status, "running");
      assert.equal(Object.values(h.docs).filter((row) =>
        row.providerGuestId !== undefined).length, 0);
    }
  });

test("provider failure cannot revoke a concurrently rotated credential",
  async () => {
    const h = reconcileFixture({ready: true, withoutRun: true});
    await assert.rejects(syncOrganizerProviderEventHandler({
      auth: {uid: "host1"}, data: {organizerId, eventId,
        clientOperationId: operationId},
    } as never, {firestore: () => h.db,
      checkRateLimit: async () => undefined,
      luma: () => ({listGuests: async () => {
        Object.assign(h.docs["organizerProviderConnections/connection1"],
          {revision: 2, secretVersionResource: "secret2"});
        throw new LumaProviderError("old credential rejected", 401,
          "unauthorized");
      }}) as never,
      credentialStore: {access: async () => "test-key"} as never,
      now: () => now}));
    const connection = h.docs["organizerProviderConnections/connection1"];
    assert.equal(connection.status, "active");
    assert.equal(connection.secretVersionResource, "secret2");
    assert.equal(connection.revision, 2);
    assert.equal(h.docs[`providerSyncRuns/${providerSyncRunId(eventId,
      "host1", operationId)}`].status, "failed");
  });


test("legacy provider sync refuses a foreign-owned matched attendee",
  async () => {
    for (const field of ["organizerId", "organizerId"] as const) {
      const h = reconcileFixture();
      h.docs[`eventAttendees/${attendeeId}`][field] = "foreignOrg";
      await assert.rejects(reconcileFixtureRun(h),
        /attendee from another tenant/u);
      assert.equal(h.docs[`providerSyncRuns/${providerSyncRunId(eventId,
        "host1", operationId)}`].status, "running");
      assert.equal(h.docs[`eventAttendees/${attendeeId}`][field],
        "foreignOrg");
    }
  });

test("inactive provider updates cannot replace a guest during checkout",
  async () => {
    const h = fixture({active: true});
    h.old!.status = "cancelled";
    h.docs[`eventSeatLedgers/${eventId}`].occupied = 0;
    h.docs[`eventSeatLedgers/${eventId}`].checkoutHeld = 1;
    h.docs[reservationPath] = {...h.docs[reservationPath], active: false,
      checkoutHold: {paymentId: "payment-one", expiresAtMillis: 900100}};
    await assert.rejects(prepareProviderSeatChanges({db: h.db, tx: h.tx,
      event: h.event as never, eventId, organizerId, runId: "held-update",
      nowMillis: 1000, writes: [write(h.old, "declined")]}), /checkout/u);
    assert.equal(h.pendingCount, 0);
  });
