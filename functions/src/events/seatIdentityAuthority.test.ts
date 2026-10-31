import assert from "node:assert/strict";
import test from "node:test";
import {createHash} from "crypto";
import {Timestamp} from "firebase-admin/firestore";
import {FirestoreSeatIdentityAuthority, seatIdentityAliasId,
  seatVerifiedPhoneProofId, SeatIdentityAuthorityError,
  linkVerifiedUidToGuestSeat, prepareCrmOriginSeatIdentity,
  prepareVerifiedUidAttendeeEnrollment} from
  "./seatIdentityAuthority";
import {eventAttendeeId} from "./eventAttendees";

type Row = Record<string, unknown>;
type Subject = Parameters<FirestoreSeatIdentityAuthority["resolve"]>[0][
  "subject"];
const eventId = "event1";
const organizerId = "org1";
const phone = "+919999999999";

function hash(kind: string, value: string) {
  return createHash("sha256").update([kind, value].join("\u001f"))
    .digest("hex");
}

class FakeStore {
  rows = new Map<string, Row>();
  reads: string[] = [];
  writes: string[] = [];
  collection(name: string) {
    const query = (filters: Array<[string, unknown]>) => ({
      collection: name, filters,
      where: (field: string, _op: string, value: unknown) =>
        query([...filters, [field, value]]),
      limit: (count: number) => ({collection: name, filters, count}),
    });
    return {doc: (id: string) => ({path: `${name}/${id}`}),
      where: (field: string, _op: string, value: unknown) =>
        query([[field, value]])};
  }
  tx() {
    return {get: async (ref: {path: string}) => {
      this.reads.push(ref.path);
      return {data: () => this.rows.get(ref.path)};
    }} as unknown as FirebaseFirestore.Transaction;
  }
  writeTx() {
    const pending: Array<() => void> = [];
    const tx = {
      get: async (ref: {path?: string; collection?: string;
        filters?: Array<[string, unknown]>; count?: number}) => {
        assert.equal(pending.length, 0, "all reads precede writes");
        if (ref.collection && ref.filters) {
          const docs = [...this.rows].filter(([path, row]) =>
            path.startsWith(`${ref.collection}/`) &&
            !path.slice(ref.collection!.length + 1).includes("/") &&
            ref.filters!.every(([field, value]) => row[field] === value))
            .slice(0, ref.count)
            .map(([path, row]) => ({id: path.split("/").at(-1),
              data: () => row}));
          return {docs};
        }
        assert.ok(ref.path);
        this.reads.push(ref.path);
        const value = this.rows.get(ref.path);
        return {exists: value !== undefined, data: () => value};
      },
      create: (ref: {path: string}, value: Row) => pending.push(() => {
        assert.equal(this.rows.has(ref.path), false);
        this.rows.set(ref.path, value);
        this.writes.push(ref.path);
      }),
      update: (ref: {path: string}, value: Row) => pending.push(() => {
        assert.equal(this.rows.has(ref.path), true);
        this.rows.set(ref.path, {...this.rows.get(ref.path), ...value});
        this.writes.push(ref.path);
      }),
    } as unknown as FirebaseFirestore.Transaction;
    return {tx, commit: () => pending.forEach((write) => write())};
  }
  db() {
    return this as unknown as FirebaseFirestore.Firestore;
  }
  alias(kind: "uid" | "phone" | "attendee" | "external" |
    "contactOrigin" | "contact", value: string, key = "person1",
  revision = 1, migrationRevision = 1) {
    this.rows.set(`eventSeatIdentityAliases/${seatIdentityAliasId(
      eventId, kind, value)}`, {
      eventId, organizerId, kind, valueHash: hash(kind, value),
      canonicalKey: key, identityRevision: revision, migrationRevision,
      state: "ready",
    });
  }
  ready() {
    this.rows.set(`eventSeatLedgers/${eventId}`, {
      eventId, state: "ready", migrationRevision: 1, revision: 3,
    });
  }
  proof(uid = "uid1") {
    this.rows.set(`eventSeatVerifiedPhones/${seatVerifiedPhoneProofId(
      eventId, uid)}`, {
      eventId, organizerId, uid, phoneE164: phone,
      migrationRevision: 1, state: "current",
    });
  }
  resolve(subject: Subject, scope = {eventId, organizerId}) {
    return new FirestoreSeatIdentityAuthority().resolve({db: this.db(),
      tx: this.tx(), ...scope, subject});
  }
}

function unavailable(error: unknown) {
  return error instanceof SeatIdentityAuthorityError &&
    error.code === "unavailable";
}

test("reviewed import and verified UID converge on one seat", async () => {
  const store = new FakeStore();
  store.ready();
  store.proof();
  store.rows.set("eventAttendees/att1", {eventId, organizerId,
    source: "hostImport", status: "registered", linkedUid: null,
    phoneE164: phone, externalReference: "ORDER-1"});
  for (const [kind, value] of [
    ["uid", "uid1"], ["phone", phone], ["attendee", "att1"],
    ["external", "order-1"],
  ] as const) store.alias(kind, value);
  const imported = await store.resolve({kind: "importAttendee",
    attendeeId: "att1"});
  const verified = await store.resolve({kind: "verifiedUid", uid: "uid1"});
  assert.deepEqual(imported, {key: "person1", revision: 1});
  assert.deepEqual(verified, imported);
  assert.ok(store.reads.every((path) => path.startsWith("eventSeat") ||
    path === "eventAttendees/att1"));
});

test("conflicting aliases and unreviewed phone cannot merge seats",
  async () => {
    const store = new FakeStore();
    store.ready();
    store.proof();
    store.alias("uid", "uid1", "person1");
    store.alias("phone", phone, "person2");
    await assert.rejects(store.resolve({kind: "verifiedUid", uid: "uid1"}),
      unavailable);
    store.rows.delete(`eventSeatIdentityAliases/${seatIdentityAliasId(
      eventId, "phone", phone)}`);
    await assert.rejects(store.resolve({kind: "verifiedUid", uid: "uid1"}),
      unavailable);
  });

test("CRM origin follows current survivor only after alias reconciliation",
  async () => {
    const store = new FakeStore();
    store.ready();
    store.rows.set("organizerContactOrigins/origin1", {
      organizerId, eventId: null, sourceKind: "hostForm",
      sourceEntityKind: "hostFormResponse", sourceEntityId: "response1",
      responseId: "response1", originContactId: "oldContact",
      currentContactId: "newContact",
    });
    store.rows.set("organizerContacts/newContact", {
      organizerId, deletedAt: null, hiddenAt: null,
      mergedIntoContactId: null, identityState: "unlinked",
      ambiguousCandidateContactIds: [], linkedUid: null,
    });
    store.alias("contactOrigin", "origin1", "oldSeat", 1);
    store.alias("contact", "newContact", "newSeat", 2);
    const subject = {kind: "crmOrigin" as const, originId: "origin1",
      responseId: "response1"};
    await assert.rejects(store.resolve(subject), unavailable);
    store.alias("contactOrigin", "origin1", "newSeat", 2);
    assert.deepEqual(await store.resolve(subject),
      {key: "newSeat", revision: 2});
    store.rows.get("organizerContacts/newContact")!
      .mergedIntoContactId = "thirdContact";
    await assert.rejects(store.resolve(subject), unavailable);
  });

function crmSource(store: FakeStore, originId = "origin1",
  contactId = "contact1") {
  store.rows.set(`organizerContactOrigins/${originId}`, {
    organizerId, eventId: null, sourceKind: "hostForm",
    sourceEntityKind: "hostFormResponse", sourceEntityId: "response1",
    responseId: "response1", originContactId: contactId,
    currentContactId: contactId,
  });
  store.rows.set(`organizerContacts/${contactId}`, {
    organizerId, deletedAt: null, hiddenAt: null,
    mergedIntoContactId: null, identityState: "unlinked",
    ambiguousCandidateContactIds: [], linkedUid: null,
    phoneE164: phone,
  });
}

test("new CRM origin enrolls one contact seat and quarantines unverified phone",
  async () => {
    const store = new FakeStore();
    store.ready();
    crmSource(store);
    const first = store.writeTx();
    const prepared = await prepareCrmOriginSeatIdentity({db: store.db(),
      tx: first.tx, eventId, organizerId,
      originId: "origin1", responseId: "response1"});
    assert.equal(store.writes.length, 0);
    prepared.apply();
    first.commit();
    const contactAliasId = seatIdentityAliasId(eventId,
      "contact", "contact1");
    const phoneAliasId = seatIdentityAliasId(eventId, "phone", phone);
    assert.equal(store.rows.get(`eventSeatIdentityAliases/${contactAliasId}`)
      ?.canonicalKey, prepared.identity.key);
    assert.equal(store.rows.get(`eventSeatIdentityAliases/${phoneAliasId}`)
      ?.state, "ambiguous");
    const second = store.writeTx();
    const replay = await prepareCrmOriginSeatIdentity({db: store.db(),
      tx: second.tx, eventId, organizerId,
      originId: "origin1", responseId: "response1"});
    replay.apply();
    second.commit();
    assert.deepEqual(replay.identity, prepared.identity);
    assert.equal(store.writes.length, 3);
  });

test("anonymous form contact enrolls without a phone or UID claim",
  async () => {
    const store = new FakeStore();
    store.ready();
    crmSource(store);
    store.rows.get("organizerContacts/contact1")!.phoneE164 = null;
    const tx = store.writeTx();
    const prepared = await prepareCrmOriginSeatIdentity({db: store.db(),
      tx: tx.tx, eventId, organizerId,
      originId: "origin1", responseId: "response1"});
    assert.equal(prepared.seatAlreadyOccupied, false);
    assert.equal(prepared.sourceAttendeeId, null);
    prepared.apply();
    tx.commit();
    assert.equal(store.writes.length, 2);
    assert.equal([...store.rows.values()].some((row) =>
      row?.kind === "phone" || row?.kind === "uid"), false);
  });

test("unverified CRM phone rejects stale or foreign ambiguous alias",
  async () => {
    for (const corruption of [
      {organizerId: "other"}, {migrationRevision: 2},
      {identityRevision: 2}, {valueHash: "wrong"},
    ]) {
      const store = new FakeStore();
      store.ready();
      crmSource(store);
      store.alias("contact", "contact1", "contactSeat");
      store.alias("contactOrigin", "origin1", "contactSeat");
      store.alias("phone", phone, "contactSeat");
      const aliasPath = `eventSeatIdentityAliases/${
        seatIdentityAliasId(eventId, "phone", phone)}`;
      store.rows.set(aliasPath, {...store.rows.get(aliasPath),
        state: "ambiguous", ...corruption});
      await assert.rejects(prepareCrmOriginSeatIdentity({
        db: store.db(), tx: store.writeTx().tx, eventId, organizerId,
        originId: "origin1", responseId: "response1",
      }), unavailable);
      assert.deepEqual(store.writes, []);
    }
  });

test("later verified response upgrades its contact seat without duplication",
  async () => {
    const store = new FakeStore();
    store.ready();
    crmSource(store);
    const first = store.writeTx();
    const initial = await prepareCrmOriginSeatIdentity({db: store.db(),
      tx: first.tx, eventId, organizerId,
      originId: "origin1", responseId: "response1"});
    initial.apply();
    first.commit();
    store.rows.set("organizerFormResponses/response1", {
      organizerId, status: "submitted", withdrawnAt: null,
      identityKind: "phoneVerified", respondentUid: "uid1",
      identity: {phoneE164: phone},
    });
    store.rows.get("organizerContacts/contact1")!.linkedUid = "uid1";
    store.rows.get("organizerContacts/contact1")!.identityState = "verified";
    const second = store.writeTx();
    const verified = await prepareCrmOriginSeatIdentity({db: store.db(),
      tx: second.tx, eventId, organizerId,
      originId: "origin1", responseId: "response1",
      verifiedRespondent: {uid: "uid1", currentAuthPhoneNumber: phone,
        now: Timestamp.now()}});
    assert.deepEqual(verified.identity, initial.identity);
    assert.equal(verified.sourceAttendeeId, null);
    verified.apply();
    second.commit();
    assert.equal(store.rows.get(`eventSeatIdentityAliases/${
      seatIdentityAliasId(eventId, "phone", phone)}`)?.state, "ready");
    assert.equal(store.rows.get(`eventSeatIdentityAliases/${
      seatIdentityAliasId(eventId, "uid", "uid1")}`)?.canonicalKey,
    initial.identity.key);
  });

test("same contact origin converges while moved origin and guest phone deny",
  async () => {
    const store = new FakeStore();
    store.ready();
    crmSource(store);
    store.alias("contact", "contact1", "contact_existing");
    const tx = store.writeTx();
    const prepared = await prepareCrmOriginSeatIdentity({db: store.db(),
      tx: tx.tx, eventId, organizerId,
      originId: "origin1", responseId: "response1"});
    assert.equal(prepared.identity.key, "contact_existing");
    prepared.apply();
    tx.commit();
    store.rows.set("organizerContacts/contact2", {
      organizerId, deletedAt: null, hiddenAt: null,
      mergedIntoContactId: null, identityState: "unlinked",
      ambiguousCandidateContactIds: [], linkedUid: null,
      phoneE164: phone,
    });
    store.rows.set("organizerContactOrigins/origin1", {
      ...store.rows.get("organizerContactOrigins/origin1"),
      currentContactId: "contact2",
    });
    await assert.rejects(() => prepareCrmOriginSeatIdentity({
      db: store.db(), tx: store.writeTx().tx, eventId, organizerId,
      originId: "origin1", responseId: "response1"}), unavailable);

    const other = new FakeStore();
    other.ready();
    crmSource(other);
    other.alias("phone", phone, "guest_existing");
    await assert.rejects(() => prepareCrmOriginSeatIdentity({
      db: other.db(), tx: other.writeTx().tx, eventId, organizerId,
      originId: "origin1", responseId: "response1"}), unavailable);
    assert.equal(other.writes.length, 0);
  });

test("verified form origin enrolls current UID without quarantining phone",
  async () => {
    const store = new FakeStore();
    store.ready();
    crmSource(store);
    store.rows.set("organizerFormResponses/response1", {
      organizerId, status: "submitted", withdrawnAt: null,
      identityKind: "phoneVerified", respondentUid: "uid1",
      identity: {phoneE164: phone},
    });
    const tx = store.writeTx();
    const prepared = await prepareCrmOriginSeatIdentity({db: store.db(),
      tx: tx.tx, eventId, organizerId,
      originId: "origin1", responseId: "response1",
      verifiedRespondent: {uid: "uid1",
        currentAuthPhoneNumber: phone, now: Timestamp.now()}});
    assert.equal(prepared.seatAlreadyOccupied, false);
    prepared.apply();
    tx.commit();
    assert.equal(store.rows.get(`eventSeatIdentityAliases/${
      seatIdentityAliasId(eventId, "phone", phone)}`)?.state, "ready");
    assert.equal(store.rows.get(`eventSeatIdentityAliases/${
      seatIdentityAliasId(eventId, "contactOrigin", "origin1")}`)
      ?.canonicalKey, prepared.identity.key);
    assert.equal(store.rows.get(`eventSeatVerifiedPhones/${
      seatVerifiedPhoneProofId(eventId, "uid1")}`)?.phoneE164, phone);
  });

test("verified form origin reuses imported guest seat without reserving again",
  async () => {
    const store = new FakeStore();
    store.ready();
    store.rows.set(`eventSeatLedgers/${eventId}`, {eventId,
      state: "ready", migrationRevision: 1, revision: 1});
    store.rows.set(`events/${eventId}`, {organizerId: organizerId,
      status: "active"});
    crmSource(store);
    store.rows.set("organizerFormResponses/response1", {
      organizerId, status: "submitted", withdrawnAt: null,
      identityKind: "phoneVerified", respondentUid: "uid1",
      identity: {phoneE164: phone},
    });
    store.rows.set("eventAttendees/guest1", {eventId, organizerId,
      source: "hostImport", status: "registered", phoneE164: phone,
      linkedUid: null, externalReference: null});
    store.alias("phone", phone, "guest_existing");
    store.alias("attendee", "guest1", "guest_existing");
    store.rows.set(`eventSeatReservations/${createHash("sha256")
      .update([eventId, "guest_existing"].join("\u001f"))
      .digest("hex")}`, {eventId, canonicalKey: "guest_existing",
      identityRevision: 1, revision: 1, active: true});
    const tx = store.writeTx();
    const prepared = await prepareCrmOriginSeatIdentity({db: store.db(),
      tx: tx.tx, eventId, organizerId,
      originId: "origin1", responseId: "response1",
      verifiedRespondent: {uid: "uid1",
        currentAuthPhoneNumber: phone, now: Timestamp.now()}});
    assert.equal(prepared.seatAlreadyOccupied, true);
    assert.equal(prepared.sourceAttendeeId, "guest1");
    assert.equal(prepared.resultingLedgerRevision, 2);
    assert.equal(prepared.identity.key, "guest_existing");
    prepared.apply();
    tx.commit();
    assert.equal(store.rows.get(`eventSeatLedgers/${eventId}`)?.revision, 2);
    assert.equal(store.rows.get("eventAttendees/guest1")?.linkedUid,
      "uid1");
    assert.equal(store.rows.get(`eventSeatReservations/${createHash("sha256")
      .update([eventId, "guest_existing"].join("\u001f"))
      .digest("hex")}`)?.active, true);
  });

test("foreign or stale records reject within current transaction", async () => {
  const store = new FakeStore();
  store.ready();
  store.proof();
  store.alias("uid", "uid1");
  store.alias("phone", phone);
  const subject = {kind: "verifiedUid" as const, uid: "uid1"};
  await assert.rejects(store.resolve(subject,
    {eventId, organizerId: "foreign"}), unavailable);
  store.rows.get(`eventSeatVerifiedPhones/${seatVerifiedPhoneProofId(
    eventId, "uid1")}`)!.organizerId = "foreign";
  await assert.rejects(store.resolve(subject), unavailable);
  store.rows.get(`eventSeatVerifiedPhones/${seatVerifiedPhoneProofId(
    eventId, "uid1")}`)!.organizerId = organizerId;
  store.rows.get(`eventSeatIdentityAliases/${seatIdentityAliasId(
    eventId, "uid", "uid1")}`)!.migrationRevision = 0;
  await assert.rejects(store.resolve(subject), unavailable);
});

test("missing or unreconciled migration fails closed", async () => {
  const store = new FakeStore();
  await assert.rejects(store.resolve({kind: "verifiedUid", uid: "uid1"}),
    unavailable);
  store.ready();
  store.rows.get(`eventSeatLedgers/${eventId}`)!.state = "unreconciled";
  await assert.rejects(store.resolve({kind: "verifiedUid", uid: "uid1"}),
    unavailable);
});

function guestSeatStore(options: {externalReference?: string} = {}) {
  const store = new FakeStore();
  const attendeeId = options.externalReference ? eventAttendeeId(eventId,
    `external:${options.externalReference.toLowerCase()}`) :
    eventAttendeeId(eventId, `phone:${phone}`);
  const key = "guestSeat";
  store.rows.set(`events/${eventId}`, {organizerId, status: "active"});
  store.rows.set(`eventSeatLedgers/${eventId}`, {eventId, state: "ready",
    migrationRevision: 1, revision: 3});
  store.rows.set(`eventAttendees/${attendeeId}`, {eventId, organizerId,
    source: "hostImport", status: "registered", linkedUid: null,
    phoneE164: phone,
    externalReference: options.externalReference ?? null});
  store.alias("attendee", attendeeId, key);
  store.alias("phone", phone, key);
  if (options.externalReference) {
    store.alias("external", options.externalReference.toLowerCase(), key);
  }
  store.rows.set(`eventSeatReservations/${hash(eventId, key)}`, {
    eventId, canonicalKey: key, active: true, identityRevision: 1,
    revision: 1});
  const link = async (uid = "uid1", tokenPhone = phone) => {
    const prepared = store.writeTx();
    const result = await linkVerifiedUidToGuestSeat({db: store.db(),
      tx: prepared.tx, eventId, organizerId, attendeeId, uid,
      authTokenPhoneNumber: tokenPhone, now: Timestamp.fromMillis(1000)});
    prepared.commit();
    return result;
  };
  return {store, attendeeId, key, link};
}

test("verified phone links an imported guest without reserving another seat",
  async () => {
    const h = guestSeatStore();
    assert.deepEqual(await h.link(), {canonicalKey: h.key,
      ledgerRevision: 4, replayed: false});
    assert.equal(h.store.rows.get(`eventAttendees/${h.attendeeId}`)
      ?.linkedUid, "uid1");
    assert.equal(h.store.rows.get(`eventSeatLedgers/${eventId}`)?.revision, 4);
    assert.equal(h.store.writes.filter((path) => path.startsWith(
      "eventSeatReservations/")).length, 0);
    assert.deepEqual(await h.link(), {canonicalKey: h.key,
      ledgerRevision: 4, replayed: true});
    assert.deepEqual(await h.store.resolve({kind: "verifiedUid",
      uid: "uid1"}), {key: h.key, revision: 1});
  });

test("verified UID enrolls invited guest without fabricating occupancy",
  async () => {
    const h = guestSeatStore();
    h.store.rows.get(`eventAttendees/${h.attendeeId}`)!.status = "invited";
    h.store.rows.delete(`eventSeatReservations/${hash(eventId, h.key)}`);
    const preparedTx = h.store.writeTx();
    const prepared = await prepareVerifiedUidAttendeeEnrollment({
      db: h.store.db(), tx: preparedTx.tx, eventId, organizerId,
      attendeeId: h.attendeeId, uid: "uid1", authTokenPhoneNumber: phone,
      now: Timestamp.fromMillis(1000),
    });
    assert.deepEqual(prepared.identity, {key: h.key, revision: 1});
    assert.equal(prepared.seatActive, false);
    assert.equal(h.store.writes.length, 0);
    prepared.apply();
    preparedTx.commit();
    assert.equal(h.store.rows.get(`eventSeatLedgers/${eventId}`)?.revision,
      3);
    assert.equal([...h.store.rows.keys()].some((path) =>
      path.startsWith("eventSeatReservations/")), false);
    const retry = h.store.writeTx();
    const replay = await prepareVerifiedUidAttendeeEnrollment({
      db: h.store.db(), tx: retry.tx, eventId, organizerId,
      attendeeId: h.attendeeId, uid: "uid1", authTokenPhoneNumber: phone,
      now: Timestamp.fromMillis(1001),
    });
    assert.equal(replay.replayed, true);
    assert.equal(replay.seatActive, false);
  });

test("pending guest enrollment denies another UID or mismatched phone",
  async () => {
    const h = guestSeatStore();
    h.store.rows.get(`eventAttendees/${h.attendeeId}`)!.status = "waitlisted";
    h.store.rows.delete(`eventSeatReservations/${hash(eventId, h.key)}`);
    h.store.alias("uid", "uid1", "anotherSeat");
    await assert.rejects(prepareVerifiedUidAttendeeEnrollment({
      db: h.store.db(), tx: h.store.writeTx().tx, eventId, organizerId,
      attendeeId: h.attendeeId, uid: "uid1", authTokenPhoneNumber: phone,
      now: Timestamp.fromMillis(1000),
    }), unavailable);
    assert.deepEqual(h.store.writes, []);
  });

test("different token phone, duplicate UID seat or missing alias denies",
  async () => {
    const wrongPhone = guestSeatStore();
    await assert.rejects(wrongPhone.link("uid1", "+919999999998"),
      unavailable);
    assert.deepEqual(wrongPhone.store.writes, []);
    const existingSeat = guestSeatStore();
    existingSeat.store.alias("uid", "uid1", "anotherSeat");
    await assert.rejects(existingSeat.link(), unavailable);
    assert.deepEqual(existingSeat.store.writes, []);
    const existingProof = guestSeatStore();
    existingProof.store.proof();
    await assert.rejects(existingProof.link(), unavailable);
    assert.deepEqual(existingProof.store.writes, []);
    const missingAlias = guestSeatStore();
    missingAlias.store.rows.delete(`eventSeatIdentityAliases/${
      seatIdentityAliasId(eventId, "phone", phone)}`);
    await assert.rejects(missingAlias.link(), unavailable);
    assert.deepEqual(missingAlias.store.writes, []);
  });

test("verified phone links external-reference import by its actual ID",
  async () => {
    const h = guestSeatStore({externalReference: "ORDER-42"});
    assert.deepEqual(await h.link(), {canonicalKey: h.key,
      ledgerRevision: 4, replayed: false});
    assert.equal(h.store.rows.get(`eventAttendees/${h.attendeeId}`)
      ?.linkedUid, "uid1");
    assert.equal(h.store.writes.filter((path) => path.startsWith(
      "eventSeatReservations/")).length, 0);
    const wrong = guestSeatStore({externalReference: "ORDER-42"});
    wrong.store.alias("external", "order-42", "otherSeat");
    await assert.rejects(wrong.link(), unavailable);
    assert.deepEqual(wrong.store.writes, []);
  });
