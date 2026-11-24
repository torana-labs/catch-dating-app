import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import test from "node:test";
import * as admin from "firebase-admin";
import type {OrganizerContactDocument} from
  "../shared/generated/firestoreAdminTypes";
import {mergeConflicts, mergeEvidence,
  mergeOrganizerContactsHandler,
  unmergeOrganizerContactsHandler} from "./organizerContactMerges";
import {seatIdentityAliasId, seatIdentityValueHash} from
  "../events/seatIdentityAuthority";
import {validateOrganizerContactMergeReceiptDocument} from
  "../shared/generated/validators/organizerContactMergeReceiptDocument";

test("merge conflicts keep each contradictory identity route explicit", () => {
  const survivor = contact({
    linkedUid: "user-1",
    phoneE164: "+919876543210",
    email: "asha@example.com",
  });
  const source = contact({
    linkedUid: "user-2",
    phoneE164: "+919999999999",
    email: "other@example.com",
  });

  assert.deepEqual(mergeConflicts(survivor, source), [
    "linkedUid",
    "phoneE164",
    "email",
  ]);
});

test("verified identity evidence outranks an imported phone match", () => {
  const verified = mergeEvidence(
    contact({linkedUid: "user-1", phoneE164: "+919876543210"}),
    contact({linkedUid: "user-1", phoneE164: "+919876543210"})
  );
  assert.deepEqual(verified, [
    "managerConfirmed",
    "sameVerifiedUid",
    "sameVerifiedPhone",
  ]);

  const proposed = mergeEvidence(
    contact({linkedUid: null, phoneE164: "+919876543210"}),
    contact({linkedUid: null, phoneE164: "+919876543210"})
  );
  assert.deepEqual(proposed, ["managerConfirmed", "sameImportedPhone"]);
});

test("matching email never silently removes manager review", () => {
  assert.deepEqual(
    mergeEvidence(
      contact({email: "asha@example.com"}),
      contact({email: "asha@example.com"})
    ),
    ["managerConfirmed", "sameEmail"]
  );
});

function contact(
  overrides: Partial<OrganizerContactDocument> = {}
): OrganizerContactDocument {
  const timestamp = admin.firestore.Timestamp.fromMillis(1_000);
  return {
    organizerId: "organizer-1",
    displayName: "Asha",
    searchName: "asha",
    linkedUid: null,
    phoneE164: null,
    email: null,
    identityState: "unlinked",
    identityConfidence: "proposed",
    primarySource: "hostImport",
    ambiguousCandidateContactIds: [],
    firstSeenAt: timestamp,
    lastSeenAt: timestamp,
    sourceCount: 1,
    whatsappStatus: "unknown",
    smsStatus: "unknown",
    revision: 1,
    mergedIntoContactId: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
    ...overrides,
  };
}

class MergeRef {
  constructor(readonly store: MergeStore, readonly path: string) {}
  get id() {
    return this.path.split("/").at(-1)!;
  }
}
class MergeQuery {
  constructor(readonly store: MergeStore, readonly path: string,
    readonly filters: Array<[string, string, unknown]> = [],
    readonly cap = Infinity) {}
  doc(id: string) {
    return new MergeRef(this.store, `${this.path}/${id}`);
  }
  where(field: string, op: string, value: unknown) {
    return new MergeQuery(this.store, this.path,
      [...this.filters, [field, op, value]], this.cap);
  }
  limit(cap: number) {
    return new MergeQuery(this.store, this.path, this.filters, cap);
  }
}
class MergeStore {
  rows = new Map<string, Record<string, unknown>>();
  writes: string[] = [];
  beforeCommit: (() => void) | null = null;
  collection(path: string) {
    return new MergeQuery(this, path);
  }
  db() {
    return this as unknown as FirebaseFirestore.Firestore;
  }
  put(path: string, row: Record<string, unknown>) {
    this.rows.set(path, row);
  }
  get(path: string) {
    return this.rows.get(path);
  }
  async runTransaction<T>(body: (tx: FirebaseFirestore.Transaction) =>
    Promise<T>): Promise<T> {
    let written = false;
    const staged: Array<() => void> = [];
    const queries: Array<{query: MergeQuery; ids: string[]}> = [];
    const documents: Array<{path: string; value: string}> = [];
    const matches = (query: MergeQuery) => [...this.rows]
      .filter(([path, row]) => path.startsWith(`${query.path}/`) &&
        path.split("/").length === query.path.split("/").length + 1 &&
        query.filters.every(([field, op, value]) => op === "in" ?
          (value as unknown[]).includes(row[field]) : row[field] === value))
      .slice(0, query.cap).map(([path]) => path);
    const snap = (ref: MergeRef) => {
      const row = this.get(ref.path);
      return {ref, id: ref.id, exists: row !== undefined,
        data: () => row,
        updateTime: admin.firestore.Timestamp.fromMillis(1000)};
    };
    const tx = {
      get: async (target: MergeRef | MergeQuery) => {
        assert.equal(written, false, "no reads after writes");
        if (target instanceof MergeRef) {
          documents.push({path: target.path,
            value: JSON.stringify(this.get(target.path))});
          return snap(target);
        }
        const ids = matches(target);
        queries.push({query: target, ids});
        const docs = ids.map((id) => snap(new MergeRef(this, id)));
        return {docs, size: docs.length};
      },
      update: (ref: MergeRef, patch: Record<string, unknown>) => {
        written = true;
        staged.push(() => {
          const row = this.get(ref.path);
          assert.ok(row);
          this.put(ref.path, {...row, ...patch});
          this.writes.push(ref.path);
        });
      },
      create: (ref: MergeRef, row: Record<string, unknown>) => {
        written = true;
        staged.push(() => {
          assert.equal(this.get(ref.path), undefined);
          this.put(ref.path, row);
          this.writes.push(ref.path);
        });
      },
      delete: (ref: MergeRef) => {
        written = true;
        staged.push(() => {
          this.rows.delete(ref.path);
          this.writes.push(ref.path);
        });
      },
    } as unknown as FirebaseFirestore.Transaction;
    const result = await body(tx);
    this.beforeCommit?.();
    this.beforeCommit = null;
    for (const query of queries) {
      assert.deepEqual(matches(query.query), query.ids,
        "transaction query membership changed");
    }
    for (const document of documents) {
      assert.equal(JSON.stringify(this.get(document.path)), document.value,
        "transaction document changed");
    }
    staged.forEach((write) => write());
    return result;
  }
}

const manager = "manager1";
const organizerId = "organizer1";
const sourceId = "source1";
const survivorId = "survivor1";
const mergeEventId = "event1";
const mergeOriginId = "origin1";
const mergeKey = "person1";
function mergeFixture() {
  const store = new MergeStore();
  store.put(`organizers/${organizerId}`, {ownerUserId: manager,
    hostUserId: manager, hostUserIds: [], hostProfiles: []});
  store.put(`organizerContacts/${sourceId}`,
    contact({organizerId}) as unknown as Record<string, unknown>);
  store.put(`organizerContacts/${survivorId}`,
    contact({organizerId}) as unknown as Record<string, unknown>);
  store.put(`organizerContactOrigins/${mergeOriginId}`, {
    organizerId, currentContactId: sourceId,
    originContactId: sourceId, sourceKind: "hostForm",
    sourceEntityKind: "hostFormResponse", responseId: "response1",
    eventId: null});
  const addAlias = (kind: "contact" | "contactOrigin", value: string) => {
    store.put(`eventSeatIdentityAliases/${seatIdentityAliasId(
      mergeEventId, kind, value)}`, {eventId: mergeEventId,
      organizerId, kind, valueHash: seatIdentityValueHash(kind, value),
      canonicalKey: mergeKey, identityRevision: 1,
      migrationRevision: 1, state: "ready"});
  };
  addAlias("contact", sourceId);
  addAlias("contact", survivorId);
  addAlias("contactOrigin", mergeOriginId);
  store.put(`eventSeatLedgers/${mergeEventId}`, {eventId: mergeEventId,
    state: "ready", revision: 2, migrationRevision: 1});
  const request = (data: Record<string, unknown>) =>
    ({auth: {uid: manager}, data}) as unknown as
      import("firebase-functions/v2/https").CallableRequest<unknown>;
  const deps = {firestore: () => store.db(),
    timestamp: () => admin.firestore.Timestamp.fromMillis(2000),
    identitySecret: () => "x".repeat(32),
    checkRateLimit: async () => undefined,
    rebuildAfterMerge: async () => undefined};
  const command = {organizerId,
    sourceContactId: sourceId, survivorContactId: survivorId,
    sourceRevision: 1, survivorRevision: 1,
    confirmConflicts: true, idempotencyKey: "merge-request-1"};
  return {store, request, deps, command};
}

test("handler atomically merges and unmerges same-key ready origins",
  async () => {
    const {store, request, deps, command} = mergeFixture();
    const first = await mergeOrganizerContactsHandler(request(command), deps);
    assert.equal(first.replayed, false);
    assert.equal(store.get(`organizerContactOrigins/${mergeOriginId}`)
      ?.currentContactId, survivorId);
    assert.equal(validateOrganizerContactMergeReceiptDocument(
      store.get(`organizerContactMergeReceipts/${first.receiptId}`)), true);
    const count = store.writes.length;
    const replay = await mergeOrganizerContactsHandler(request(command), deps);
    assert.equal(replay.replayed, true);
    assert.equal(store.writes.length, count);
    const undone = await unmergeOrganizerContactsHandler(request({organizerId,
      mergeReceiptId: first.receiptId, idempotencyKey: "unmerge-request-1"}),
    deps);
    assert.equal(undone.replayed, false);
    assert.equal(store.get(`organizerContactOrigins/${mergeOriginId}`)
      ?.currentContactId, sourceId);
    assert.equal(validateOrganizerContactMergeReceiptDocument(
      store.get(`organizerContactMergeReceipts/${undone.receiptId}`)), true);
  });

test("transactional manager and origin membership changes prevent writes",
  async () => {
    const {store, request, deps, command} = mergeFixture();
    store.get(`organizers/${organizerId}`)!.ownerUserId = "other";
    store.get(`organizers/${organizerId}`)!.hostUserId = "other";
    await assert.rejects(mergeOrganizerContactsHandler(request(command),
      deps));
    assert.equal(store.writes.length, 0);
    store.get(`organizers/${organizerId}`)!.ownerUserId = manager;
    store.get(`organizers/${organizerId}`)!.hostUserId = manager;
    store.beforeCommit = () => store.put("organizerContactOrigins/neworigin", {
      organizerId, currentContactId: sourceId,
      originContactId: sourceId, sourceKind: "hostImport",
      sourceEntityKind: "eventAttendee", responseId: null,
      eventId: mergeEventId});
    await assert.rejects(mergeOrganizerContactsHandler(request(command),
      deps));
    assert.equal(store.writes.length, 0);
  });

test("handler supports alias-only move and reverses only the created alias",
  async () => {
    const {store, request, deps, command} = mergeFixture();
    const survivorAliasId = seatIdentityAliasId(mergeEventId,
      "contact", survivorId);
    store.rows.delete(`eventSeatIdentityAliases/${survivorAliasId}`);
    const first = await mergeOrganizerContactsHandler(request(command), deps);
    const created = store.get(`eventSeatIdentityAliases/${survivorAliasId}`);
    assert.equal(created?.canonicalKey, mergeKey);
    const receipt = store.get(`organizerContactMergeReceipts/${
      first.receiptId}`)!;
    assert.equal((receipt.seatMoves as unknown[]).length, 1);
    await unmergeOrganizerContactsHandler(request({organizerId,
      mergeReceiptId: first.receiptId,
      idempotencyKey: "unmerge-alias-1"}), deps);
    assert.equal(store.get(`eventSeatIdentityAliases/${survivorAliasId}`),
      undefined);
    assert.ok(store.get(`eventSeatIdentityAliases/${seatIdentityAliasId(
      mergeEventId, "contact", sourceId)}`));
  });

test("distinct occupied identities and conflicting verified UIDs fail closed",
  async () => {
    for (const kind of ["seats", "uids"]) {
      const {store, request, deps, command} = mergeFixture();
      if (kind === "seats") {
        const survivorAlias = store.get(`eventSeatIdentityAliases/${
          seatIdentityAliasId(mergeEventId, "contact", survivorId)}`)!;
        survivorAlias.canonicalKey = "person2";
        for (const key of [mergeKey, "person2"]) {
          const reservationId = createHash("sha256")
            .update(`${mergeEventId}\u001f${key}`).digest("hex");
          store.put(`eventSeatReservations/${reservationId}`,
            {eventId: mergeEventId, canonicalKey: key,
              identityRevision: 1, revision: 1, active: true});
        }
      } else {
        store.get(`organizerContacts/${sourceId}`)!.linkedUid = "uid1";
        store.get(`organizerContacts/${survivorId}`)!.linkedUid = "uid2";
      }
      await assert.rejects(mergeOrganizerContactsHandler(request(command),
        deps));
      assert.equal(store.writes.length, 0);
    }
  });

test("unmerge rejects later admission and old receipt without seat evidence",
  async () => {
    for (const kind of ["admission", "legacyReceipt"]) {
      const {store, request, deps, command} = mergeFixture();
      const first = await mergeOrganizerContactsHandler(request(command),
        deps);
      if (kind === "admission") {
        const id = createHash("sha256")
          .update(`${organizerId}\u001f${mergeEventId}\u001fresponse1`)
          .digest("hex");
        store.put(`organizerFormAdmissions/${id}`, {organizerId,
          eventId: mergeEventId, responseId: "response1",
          receiptId: "later"});
      } else {
        const receipt = store.get(`organizerContactMergeReceipts/${
          first.receiptId}`)!;
        for (const field of ["seatMoves", "seatEventGuards",
          "seatAdmissionGuards", "survivorOriginIdsBefore",
          "sourceOriginAliasIdsBefore"]) delete receipt[field];
      }
      const before = store.writes.length;
      await assert.rejects(unmergeOrganizerContactsHandler(request({
        organizerId, mergeReceiptId: first.receiptId,
        idempotencyKey: `unmerge-${kind}-1`}), deps));
      assert.equal(store.writes.length, before);
      assert.equal(store.get(`organizerContactOrigins/${mergeOriginId}`)
        ?.currentContactId, survivorId);
    }
  });

test("manager authority change during merge transaction aborts all writes",
  async () => {
    const {store, request, deps, command} = mergeFixture();
    store.beforeCommit = () => {
      store.get(`organizers/${organizerId}`)!.ownerUserId = "other";
      store.get(`organizers/${organizerId}`)!.hostUserId = "other";
    };
    await assert.rejects(mergeOrganizerContactsHandler(request(command),
      deps));
    assert.equal(store.writes.length, 0);
  });

test("unmerge refuses a moved fact whose organizer changed", async () => {
  const {store, request, deps, command} = mergeFixture();
  store.put("organizerContactEventEdges/edge1", {organizerId,
    contactId: sourceId, originContactId: sourceId,
    eventId: mergeEventId});
  const first = await mergeOrganizerContactsHandler(request(command), deps);
  store.get("organizerContactEventEdges/edge1")!.organizerId = "foreign";
  const writes = store.writes.length;
  await assert.rejects(unmergeOrganizerContactsHandler(request({organizerId,
    mergeReceiptId: first.receiptId,
    idempotencyKey: "unmerge-foreign-fact-1"}), deps));
  assert.equal(store.writes.length, writes);
});

test("unmerge detects a new contact seat after an alias-free merge",
  async () => {
    const {store, request, deps, command} = mergeFixture();
    for (const key of [...store.rows.keys()]) {
      if (key.startsWith("eventSeatIdentityAliases/")) {
        store.rows.delete(key);
      }
    }
    const first = await mergeOrganizerContactsHandler(request(command), deps);
    const newEventId = "laterEvent";
    store.put(`eventSeatIdentityAliases/${seatIdentityAliasId(
      newEventId, "contact", survivorId)}`, {eventId: newEventId,
      organizerId, kind: "contact",
      valueHash: seatIdentityValueHash("contact", survivorId),
      canonicalKey: "laterPerson", identityRevision: 1,
      migrationRevision: 1, state: "ready"});
    const writes = store.writes.length;
    await assert.rejects(unmergeOrganizerContactsHandler(request({
      organizerId, mergeReceiptId: first.receiptId,
      idempotencyKey: "unmerge-later-event-1"}), deps));
    assert.equal(store.writes.length, writes);
  });
