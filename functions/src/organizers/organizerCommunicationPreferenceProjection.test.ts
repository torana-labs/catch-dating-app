import assert from "node:assert/strict";
import test from "node:test";
import {applyOrganizerCommunicationStatuses} from
  "./organizerAudienceProjection";

type FakeData = Record<string, unknown>;
type FakeTime = {seconds: number; nanoseconds: number};

/** Firestore fake with per-write update times and serialized transactions. */
class FakeFirestore {
  readonly docs = new Map<string, FakeData>();
  readonly updateTimes = new Map<string, FakeTime>();
  private clock = 0;

  write(path: string, data: FakeData) {
    // Shallow copies: the injected timestamp carries a toMillis function.
    this.docs.set(path, {...data});
    this.clock += 1;
    this.updateTimes.set(path,
      {seconds: 1_800_000_000, nanoseconds: this.clock});
  }

  read(path: string): FakeData | undefined {
    const data = this.docs.get(path);
    return data === undefined ? undefined : {...data};
  }

  collection(name: string) {
    return query(this, name, []);
  }

  async runTransaction<T>(body: (tx: FakeTransaction) => Promise<T>) {
    const tx = new FakeTransaction(this);
    const result = await body(tx);
    tx.commit();
    return result;
  }
}

class FakeDocRef {
  constructor(readonly db: FakeFirestore, readonly path: string) {}

  get id() {
    return this.path.split("/").at(-1)!;
  }

  collection(name: string) {
    return query(this.db, `${this.path}/${name}`, []);
  }
}

class FakeTransaction {
  private readonly writes: Array<() => void> = [];

  constructor(private readonly db: FakeFirestore) {}

  async get(ref: FakeDocRef) {
    assert.equal(this.writes.length, 0, "Firestore reads must precede writes");
    const data = this.db.read(ref.path);
    return {ref, exists: data !== undefined, data: () => data,
      updateTime: data === undefined ? undefined :
        this.db.updateTimes.get(ref.path)};
  }

  update(ref: FakeDocRef, patch: FakeData) {
    this.writes.push(() => {
      const current = this.db.read(ref.path);
      assert.ok(current, "document does not exist");
      this.db.write(ref.path, {...current, ...patch});
    });
  }

  commit() {
    for (const write of this.writes) write();
  }
}

function query(db: FakeFirestore, name: string,
  filters: Array<[string, unknown]>) {
  return {
    doc: (id: string) => new FakeDocRef(db, `${name}/${id}`),
    where: (field: string, operator: string, value: unknown) => {
      assert.equal(operator, "==");
      return query(db, name, [...filters, [field, value]]);
    },
    get: async () => ({
      docs: [...db.docs.entries()]
        .filter(([path]) => path.startsWith(`${name}/`))
        .filter(([, data]) => filters.every(([field, value]) =>
          data[field] === value))
        .map(([path, data]) => ({
          id: path.split("/").at(-1)!,
          ref: new FakeDocRef(db, path),
          data: () => ({...data}),
        })),
    }),
  };
}

const preferencePath = "users/guest-1/contactPermissions/organizer_org-1";
const phone = "+919812345678";

function grant(status: "optedIn" | "optedOut", receiptId: string) {
  return {status, endpointE164: status === "optedIn" ? phone : null,
    receiptId, termsVersion: status === "optedIn" ?
      "organizer-updates-v1" : null,
    source: status === "optedIn" ? "publicEventRegistration" : "inboundStop",
    updatedAt: {toMillis: () => 1}};
}

function optedIn(): FakeData {
  return {senderKind: "organizer", senderId: "org-1",
    grants: {"whatsapp:marketing": grant("optedIn", "receipt-1"),
      "sms:marketing": grant("optedIn", "receipt-2")},
    granted: ["sms:marketing", "whatsapp:marketing"],
    updatedAt: {toMillis: () => 1}};
}

function optedOut(): FakeData {
  return {senderKind: "organizer", senderId: "org-1",
    grants: {"whatsapp:marketing": grant("optedOut", "stop-1"),
      "sms:marketing": grant("optedOut", "stop-1")},
    granted: [], updatedAt: {toMillis: () => 2}};
}

function harness() {
  const db = new FakeFirestore();
  db.write("organizerContacts/contact-1", {organizerId: "org-1",
    linkedUid: "guest-1", phoneE164: phone, whatsappStatus: "unknown",
    smsStatus: "unknown", revision: 1});
  db.write("organizerContacts/contact-2", {organizerId: "org-1",
    linkedUid: "other-guest", whatsappStatus: "unknown", smsStatus: "unknown",
    revision: 1});
  let millis = 1_800_000_000_000;
  const deps = {
    firestore: () => db as never,
    timestamp: () => {
      millis += 1;
      const at = millis;
      return {toMillis: () => at} as never;
    },
    identitySecret: () => "unused",
  };
  const apply = (eventVersion: unknown) =>
    applyOrganizerCommunicationStatuses({
      organizerId: "org-1", uid: "guest-1",
      eventVersion: eventVersion as never}, deps);
  return {db, apply};
}

test("an opt-out stays an opt-out when the older opt-in event arrives last",
  async () => {
    const {db, apply} = harness();
    db.write(preferencePath, optedIn());
    const optInVersion = db.updateTimes.get(preferencePath);
    db.write(preferencePath, optedOut());
    const optOutVersion = db.updateTimes.get(preferencePath);

    // The opt-out event is delivered first, then the older opt-in event.
    assert.deepEqual(await apply(optOutVersion), ["contact-1"]);
    assert.deepEqual(await apply(optInVersion), []);

    const contact = db.read("organizerContacts/contact-1");
    assert.equal(contact?.whatsappStatus, "optedOut");
    assert.equal(contact?.smsStatus, "optedOut");
    assert.equal(db.read("organizerContacts/contact-2")?.whatsappStatus,
      "unknown");
  });

test("a late opt-in event processed before the opt-out event writes the " +
  "current opt-out, never its payload", async () => {
  const {db, apply} = harness();
  db.write(preferencePath, optedIn());
  db.write(preferencePath, optedOut());

  // With no version to compare (a repair call), the status still comes
  // from the re-read preference.
  assert.deepEqual(await apply(undefined), ["contact-1"]);
  assert.equal(db.read("organizerContacts/contact-1")?.whatsappStatus,
    "optedOut");
});

test("an opt-in applies when it is the current preference", async () => {
  const {db, apply} = harness();
  db.write(preferencePath, optedIn());
  assert.deepEqual(await apply(db.updateTimes.get(preferencePath)),
    ["contact-1"]);
  assert.equal(db.read("organizerContacts/contact-1")?.whatsappStatus,
    "optedIn");
});

test("an opt-in for another number leaves the contact unknown", async () => {
  const {db, apply} = harness();
  db.write("organizerContacts/contact-1", {...db.read(
    "organizerContacts/contact-1"), phoneE164: "+919800000002"});
  db.write(preferencePath, optedIn());
  assert.deepEqual(await apply(db.updateTimes.get(preferencePath)),
    ["contact-1"]);
  assert.equal(db.read("organizerContacts/contact-1")?.whatsappStatus,
    "unknown");
});

test("a deleted preference reads as unknown, and a stale delete event is " +
  "ignored after a re-create", async () => {
  const {db, apply} = harness();
  db.write(preferencePath, optedOut());
  // The preference exists again, so the delete event (null) is stale.
  assert.deepEqual(await apply(null), []);
  db.docs.delete(preferencePath);
  assert.deepEqual(await apply(null), ["contact-1"]);
  assert.equal(db.read("organizerContacts/contact-1")?.whatsappStatus,
    "unknown");
});
