import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import test from "node:test";
import {seatIdentityAliasId, seatIdentityValueHash} from
  "../events/seatIdentityAuthority";
import {assertContactMergeReceiptBudget, MergeOrigin,
  prepareContactMergeSeats, prepareContactUnmergeSeats} from
  "./organizerContactMergeSeats";

type Row = Record<string, unknown>;
const org = "org1";
const eventId = "event1";
const source = "source1";
const survivor = "survivor1";
const originId = "origin1";
const hash = (...parts: string[]) => createHash("sha256")
  .update(parts.join("\u001f")).digest("hex");
const reservationId = (key: string) => hash(eventId, key);
const aliasId = (kind: "contact" | "contactOrigin", value: string) =>
  seatIdentityAliasId(eventId, kind, value);
const origin: MergeOrigin = {id: originId, organizerId: org,
  originContactId: source, currentContactId: source,
  sourceKind: "hostForm", sourceEntityKind: "hostFormResponse",
  responseId: "response1", eventId: null};

class Ref {
  constructor(readonly store: Store, readonly path: string) {}
  get id() {
    return this.path.split("/").at(-1)!;
  }
}
class Query {
  constructor(readonly store: Store, readonly path: string,
    readonly filters: Array<[string, string, unknown]> = [],
    readonly cap = Infinity) {}
  doc(id: string) {
    return new Ref(this.store, `${this.path}/${id}`);
  }
  where(field: string, op: string, value: unknown) {
    return new Query(this.store, this.path,
      [...this.filters, [field, op, value]], this.cap);
  }
  limit(cap: number) {
    return new Query(this.store, this.path, this.filters, cap);
  }
}
class Store {
  rows = new Map<string, Row>();
  writes: string[] = [];
  collection(path: string) {
    return new Query(this, path);
  }
  db() {
    return this as unknown as FirebaseFirestore.Firestore;
  }
  put(path: string, value: Row) {
    this.rows.set(path, value);
  }
  get(path: string) {
    return this.rows.get(path);
  }
  async run<T>(body: (tx: FirebaseFirestore.Transaction) => Promise<T>) {
    let wrote = false;
    const staged: Array<() => void> = [];
    const tx = {
      get: async (ref: Ref | Query) => {
        assert.equal(wrote, false, "Firestore forbids reads after writes");
        if (ref instanceof Ref) {
          const row = this.get(ref.path);
          return {id: ref.id, ref, exists: row !== undefined,
            data: () => row};
        }
        const docs = [...this.rows].filter(([path, row]) =>
          path.startsWith(`${ref.path}/`) &&
          path.split("/").length === ref.path.split("/").length + 1 &&
          ref.filters.every(([field, op, value]) => op === "in" ?
            (value as unknown[]).includes(row[field]) :
            row[field] === value)).slice(0, ref.cap)
          .map(([path, row]) => ({id: path.split("/").at(-1)!,
            ref: new Ref(this, path), exists: true, data: () => row}));
        return {docs, size: docs.length};
      },
      create: (ref: Ref, value: Row) => {
        wrote = true;
        staged.push(() => {
          assert.equal(this.get(ref.path), undefined);
          this.put(ref.path, value);
          this.writes.push(ref.path);
        });
      },
      update: (ref: Ref, value: Row) => {
        wrote = true;
        staged.push(() => {
          const row = this.get(ref.path);
          assert.ok(row);
          this.put(ref.path, {...row, ...value});
          this.writes.push(ref.path);
        });
      },
      delete: (ref: Ref) => {
        wrote = true;
        staged.push(() => {
          this.rows.delete(ref.path);
          this.writes.push(ref.path);
        });
      },
    } as unknown as FirebaseFirestore.Transaction;
    const result = await body(tx);
    staged.forEach((write) => write());
    return result;
  }
}
function seed(sourceKey: string, survivorKey: string | null,
  sourceActive = false, survivorActive = false) {
  const store = new Store();
  store.put(`organizerContactOrigins/${originId}`, {...origin});
  store.put(`eventSeatLedgers/${eventId}`, {eventId,
    state: "ready", revision: 2, migrationRevision: 1});
  const alias = (kind: "contact" | "contactOrigin", value: string,
    key: string) => store.put(`eventSeatIdentityAliases/${aliasId(
    kind, value)}`, {eventId, organizerId: org, kind,
    valueHash: seatIdentityValueHash(kind, value), canonicalKey: key,
    identityRevision: 1, migrationRevision: 1, state: "ready"});
  alias("contact", source, sourceKey);
  alias("contactOrigin", originId, sourceKey);
  if (survivorKey) alias("contact", survivor, survivorKey);
  for (const [key, active] of [[sourceKey, sourceActive],
    [survivorKey, survivorActive]] as Array<[string | null, boolean]>) {
    if (!key || !active || store.get(`eventSeatReservations/${
      reservationId(key)}`)) continue;
    store.put(`eventSeatReservations/${reservationId(key)}`, {
      eventId, canonicalKey: key, identityRevision: 1,
      revision: 1, active: true});
  }
  return store;
}
const prepare = (store: Store, tx: FirebaseFirestore.Transaction) =>
  prepareContactMergeSeats({db: store.db(), tx,
    organizerId: org, sourceContactId: source,
    survivorContactId: survivor,
    sourceLinkedUid: null, survivorLinkedUid: null,
    sourceOrigins: [origin], survivorOrigins: []});

test("same canonical seat merges and unmerges without changing occupancy",
  async () => {
    const store = seed("person1", "person1", true, true);
    const prepared = await store.run((tx) => prepare(store, tx));
    assert.equal(prepared.evidence.seatMoves.length, 0);
    assert.equal(store.writes.length, 0);
    store.get(`organizerContactOrigins/${originId}`)!
      .currentContactId = survivor;
    await store.run(async (tx) => {
      const restore = await prepareContactUnmergeSeats({db: store.db(), tx,
        organizerId: org, sourceContactId: source,
        survivorContactId: survivor, movedOriginIds: [originId],
        evidence: prepared.evidence});
      restore();
    });
    assert.equal(store.writes.length, 0);
  });

test("source occupied, survivor alias absent: reversible alias-only move",
  async () => {
    const store = seed("person1", null, true);
    const prepared = await store.run(async (tx) => {
      const plan = await prepare(store, tx);
      plan.apply();
      return plan;
    });
    assert.equal(prepared.evidence.seatMoves.length, 1);
    assert.equal(store.get(`eventSeatIdentityAliases/${aliasId(
      "contact", survivor)}`)?.canonicalKey, "person1");
    store.get(`organizerContactOrigins/${originId}`)!
      .currentContactId = survivor;
    await store.run(async (tx) => {
      const restore = await prepareContactUnmergeSeats({db: store.db(), tx,
        organizerId: org, sourceContactId: source,
        survivorContactId: survivor, movedOriginIds: [originId],
        evidence: prepared.evidence});
      restore();
    });
    assert.equal(store.get(`eventSeatIdentityAliases/${aliasId(
      "contact", survivor)}`), undefined);
    assert.equal(store.get(`eventSeatReservations/${reservationId(
      "person1")}`)?.active, true);
  });

test("two distinct active seats reject before any alias or roster write",
  async () => {
    const store = seed("person1", "person2", true, true);
    await assert.rejects(store.run((tx) => prepare(store, tx)));
    assert.equal(store.writes.length, 0);
  });

test("new admission or migration revision prevents stale unmerge",
  async () => {
    for (const changed of ["admission", "ledger"]) {
      const store = seed("person1", null, true);
      const prepared = await store.run(async (tx) => {
        const plan = await prepare(store, tx);
        plan.apply();
        return plan;
      });
      store.get(`organizerContactOrigins/${originId}`)!
        .currentContactId = survivor;
      if (changed === "admission") {
        store.put(`organizerFormAdmissions/${hash(org, eventId,
          "response1")}`, {organizerId: org, eventId,
          responseId: "response1", receiptId: "newReceipt"});
      } else {
        store.get(`eventSeatLedgers/${eventId}`)!.revision = 3;
      }
      const writes = store.writes.length;
      await assert.rejects(store.run((tx) =>
        prepareContactUnmergeSeats({db: store.db(), tx,
          organizerId: org, sourceContactId: source,
          survivorContactId: survivor, movedOriginIds: [originId],
          evidence: prepared.evidence})));
      assert.equal(store.writes.length, writes);
    }
  });

test("changed operational alias authority prevents stale unmerge",
  async () => {
    const store = seed("person1", null, true);
    const operationalId = seatIdentityAliasId(eventId, "uid", "uid1");
    store.put(`eventSeatIdentityAliases/${operationalId}`, {
      eventId, organizerId: org, kind: "uid",
      valueHash: seatIdentityValueHash("uid", "uid1"),
      canonicalKey: "person1", identityRevision: 1,
      migrationRevision: 1, state: "ready",
    });
    const prepared = await store.run(async (tx) => {
      const plan = await prepare(store, tx);
      plan.apply();
      return plan;
    });
    store.get(`organizerContactOrigins/${originId}`)!
      .currentContactId = survivor;
    store.get(`eventSeatIdentityAliases/${operationalId}`)!
      .state = "stale";
    const writes = store.writes.length;
    await assert.rejects(store.run((tx) =>
      prepareContactUnmergeSeats({db: store.db(), tx,
        organizerId: org, sourceContactId: source,
        survivorContactId: survivor, movedOriginIds: [originId],
        evidence: prepared.evidence})));
    assert.equal(store.writes.length, writes);
  });

test("receipt budget rejects oversized evidence and write batches", () => {
  assertContactMergeReceiptBudget({seatMoves: []}, 397, 0);
  assert.throws(() => assertContactMergeReceiptBudget(
    {seatMoves: []}, 398, 0));
  assert.throws(() => assertContactMergeReceiptBudget(
    {seatMoves: "x".repeat(800_001)}, 0, 0));
});

test("inactive source aliases can join survivor seat and restore exactly",
  async () => {
    const store = seed("person1", "person2", false, true);
    const prepared = await store.run(async (tx) => {
      const plan = await prepare(store, tx);
      plan.apply();
      return plan;
    });
    assert.equal(prepared.evidence.seatMoves.length, 2);
    assert.equal(store.get(`eventSeatIdentityAliases/${aliasId(
      "contact", source)}`)?.canonicalKey, "person2");
    assert.equal(store.get(`eventSeatIdentityAliases/${aliasId(
      "contactOrigin", originId)}`)?.canonicalKey, "person2");
    store.get(`organizerContactOrigins/${originId}`)!
      .currentContactId = survivor;
    await store.run(async (tx) => {
      const restore = await prepareContactUnmergeSeats({db: store.db(), tx,
        organizerId: org, sourceContactId: source,
        survivorContactId: survivor, movedOriginIds: [originId],
        evidence: prepared.evidence});
      restore();
    });
    assert.equal(store.get(`eventSeatIdentityAliases/${aliasId(
      "contact", source)}`)?.canonicalKey, "person1");
    assert.equal(store.get(`eventSeatIdentityAliases/${aliasId(
      "contactOrigin", originId)}`)?.canonicalKey, "person1");
    assert.equal(store.get(`eventSeatReservations/${reservationId(
      "person2")}`)?.active, true);
  });

test("non-CRM aliases on losing key require reconciliation", async () => {
  const store = seed("person1", "person2", false, true);
  store.put(`eventSeatIdentityAliases/${seatIdentityAliasId(
    eventId, "uid", "uid1")}`, {eventId, organizerId: org,
    kind: "uid", valueHash: seatIdentityValueHash("uid", "uid1"),
    canonicalKey: "person1", identityRevision: 1,
    migrationRevision: 1, state: "ready"});
  await assert.rejects(store.run((tx) => prepare(store, tx)));
  assert.equal(store.writes.length, 0);
});

test("inconsistent operational alias on target key blocks merge", async () => {
  const store = seed("person1", "person2", false, true);
  store.put(`eventSeatIdentityAliases/${seatIdentityAliasId(
    eventId, "uid", "uid1")}`, {eventId, organizerId: org,
    kind: "uid", valueHash: seatIdentityValueHash("uid", "uid1"),
    canonicalKey: "person2", identityRevision: 2,
    migrationRevision: 1, state: "ready"});
  await assert.rejects(store.run((tx) => prepare(store, tx)));
  assert.equal(store.writes.length, 0);
});

test("new contact alias in an unrecorded event blocks unmerge", async () => {
  const store = new Store();
  store.put(`organizerContactOrigins/${originId}`, {...origin});
  const prepared = await store.run((tx) => prepare(store, tx));
  assert.deepEqual(prepared.evidence.seatEventGuards, []);
  store.get(`organizerContactOrigins/${originId}`)!
    .currentContactId = survivor;
  store.put(`eventSeatIdentityAliases/${aliasId("contact", survivor)}`, {
    eventId, organizerId: org, kind: "contact",
    valueHash: seatIdentityValueHash("contact", survivor),
    canonicalKey: "person1", identityRevision: 1,
    migrationRevision: 1, state: "ready",
  });
  await assert.rejects(store.run((tx) =>
    prepareContactUnmergeSeats({db: store.db(), tx,
      organizerId: org, sourceContactId: source,
      survivorContactId: survivor, movedOriginIds: [originId],
      evidence: prepared.evidence})));
  assert.equal(store.writes.length, 0);
});

test("a payment hold prevents source or survivor identity merge", async () => {
  for (const heldKey of ["source-person", "survivor-person"]) {
    const store = seed("source-person", "survivor-person");
    store.put(`eventSeatReservations/${reservationId(heldKey)}`, {
      eventId, canonicalKey: heldKey, identityRevision: 1, revision: 1,
      active: false, checkoutHold: {paymentId: "payment-one",
        expiresAtMillis: 901000}});
    await assert.rejects(store.run((tx) => prepare(store, tx)),
      /checkout hold/u);
    assert.deepEqual(store.writes, []);
  }
});
