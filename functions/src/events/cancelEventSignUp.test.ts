import assert from "node:assert/strict";
import test from "node:test";
import {CallableRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {createHash} from "crypto";
import {cancelEventSignUpHandler} from "./cancelEventSignUp";
import type {PaymentDocument} from
  "../shared/generated/firestoreAdminTypes";
import type {LegacyRazorpayRefundAuthorization} from
  "../payments/legacyRefunds/intent";
import {processLegacyCancellationRefund} from
  "../payments/legacyRefunds/processor";
import {razorpayOwnershipNotes, resolveRazorpayOrderOwnership} from
  "../payments/razorpayOrderOwnership";
import {eventAttendeeId} from "./eventAttendees";
import {deriveEventSeatPolicy} from "./seatAuthority/firestoreAdapter";
import {seatIdentityAliasId, seatIdentityValueHash,
  seatVerifiedPhoneProofId} from "./seatIdentityAuthority";

type FakeData = Record<string, unknown>;

class FakeDocRef {
  constructor(readonly firestore: FakeFirestore, readonly path: string) {}

  get id(): string {
    return this.path.split("/").at(-1) ?? "";
  }

  collection(collectionPath: string) {
    return new FakeCollectionRef(
      this.firestore,
      `${this.path}/${collectionPath}`
    );
  }

  async update(patch: FakeData) {
    this.firestore.merge(this.path, patch);
  }

  async get() {
    return new FakeSnapshot(this.firestore, this.path);
  }
}

class FakeSnapshot {
  constructor(
    private readonly firestore: FakeFirestore,
    readonly path: string
  ) {}

  get id(): string {
    return this.path.split("/").at(-1) ?? "";
  }

  get ref(): FakeDocRef {
    return new FakeDocRef(this.firestore, this.path);
  }

  get exists(): boolean {
    return this.firestore.get(this.path) !== undefined;
  }

  data(): FakeData | undefined {
    const value = this.firestore.get(this.path);
    return value === undefined ? undefined : {...value};
  }
}

class FakeFirestore {
  retryAfterFirstAttempt: (() => void) | null = null;
  constructor(private readonly docs: Record<string, FakeData | undefined>) {}

  collection(collectionPath: string) {
    return new FakeCollectionRef(this, collectionPath);
  }

  async runTransaction<T>(
    callback: (tx: FakeTransaction) => Promise<T>
  ): Promise<T> {
    const tx = new FakeTransaction(this);
    const first = await callback(tx);
    if (this.retryAfterFirstAttempt) {
      const onRetry = this.retryAfterFirstAttempt;
      this.retryAfterFirstAttempt = null;
      onRetry();
      const retryTx = new FakeTransaction(this);
      const result = await callback(retryTx);
      retryTx.commit();
      return result;
    }
    tx.commit();
    return first;
  }

  get(path: string): FakeData | undefined {
    const data = this.docs[path];
    return data === undefined ? undefined : {...data};
  }

  set(path: string, data: FakeData | undefined) {
    this.docs[path] = data;
  }

  merge(path: string, patch: FakeData) {
    this.docs[path] = {...(this.docs[path] ?? {}), ...patch};
  }

  query(
    collectionPath: string,
    filters: Array<{field: string; operator: string; value: unknown}>,
    order?: {field: string; direction: "asc" | "desc"},
    limitCount?: number
  ): FakeSnapshot[] {
    const prefix = `${collectionPath}/`;
    const snapshots = Object.entries(this.docs)
      .filter(([path, value]) =>
        path.startsWith(prefix) &&
        value !== undefined &&
        !path.slice(prefix.length).includes("/")
      )
      .map(([path]) => new FakeSnapshot(this, path))
      .filter((snap) => {
        const data = snap.data() ?? {};
        return filters.every((filter) => {
          if (filter.operator === "==") {
            return data[filter.field] === filter.value;
          }
          if (filter.operator === "in" && Array.isArray(filter.value)) {
            return filter.value.includes(data[filter.field]);
          }
          throw new Error(`Unsupported fake query operator ${filter.operator}`);
        });
      });
    if (order) {
      snapshots.sort((a, b) => {
        const left = sortableValue(a.data()?.[order.field]);
        const right = sortableValue(b.data()?.[order.field]);
        return order.direction === "asc" ? left - right : right - left;
      });
    }
    return limitCount === undefined ?
      snapshots :
      snapshots.slice(0, limitCount);
  }
}

class FakeCollectionRef {
  constructor(
    private readonly firestore: FakeFirestore,
    private readonly path: string,
    private readonly filters: Array<{
      field: string;
      operator: string;
      value: unknown;
    }> = [],
    private readonly order?: {field: string; direction: "asc" | "desc"},
    private readonly limitCount?: number
  ) {}

  doc(docId: string) {
    return new FakeDocRef(this.firestore, `${this.path}/${docId}`);
  }

  where(field: string, operator: string, value: unknown) {
    return new FakeCollectionRef(
      this.firestore,
      this.path,
      [...this.filters, {field, operator, value}],
      this.order,
      this.limitCount
    );
  }

  orderBy(field: string, direction: "asc" | "desc") {
    return new FakeCollectionRef(
      this.firestore,
      this.path,
      this.filters,
      {field, direction},
      this.limitCount
    );
  }

  limit(count: number) {
    return new FakeCollectionRef(
      this.firestore,
      this.path,
      this.filters,
      this.order,
      count
    );
  }

  async get() {
    const docs = this.firestore.query(
      this.path,
      this.filters,
      this.order,
      this.limitCount
    );
    return {docs, empty: docs.length === 0};
  }
}

class FakeTransaction {
  private readonly writes: Array<() => void> = [];

  constructor(private readonly firestore: FakeFirestore) {}

  async get(
    ref: FakeDocRef | FakeCollectionRef
  ): Promise<FakeSnapshot | {docs: FakeSnapshot[]; empty: boolean}> {
    if (this.writes.length > 0) {
      throw new Error("Firestore transaction read after first write.");
    }
    if (ref instanceof FakeCollectionRef) return ref.get();
    return new FakeSnapshot(this.firestore, ref.path);
  }

  update(ref: FakeDocRef, patch: FakeData) {
    this.writes.push(() => this.firestore.merge(ref.path, patch));
  }

  set(ref: FakeDocRef, data: FakeData, _options?: {merge: boolean}) {
    void _options;
    this.writes.push(() => this.firestore.merge(ref.path, data));
  }

  create(ref: FakeDocRef, data: FakeData) {
    this.writes.push(() => {
      if (this.firestore.get(ref.path) !== undefined) {
        throw new Error(`Already exists: ${ref.path}`);
      }
      this.firestore.set(ref.path, data);
    });
  }

  delete(ref: FakeDocRef) {
    this.writes.push(() => this.firestore.set(ref.path, undefined));
  }

  commit() {
    for (const write of this.writes) write();
  }
}

function seatReservationPath(key: string): string {
  return "eventSeatReservations/" + createHash("sha256")
    .update(`event-1\u001f${key}`).digest("hex");
}

function readySeatDocs(sourceEvent: FakeData,
  uids: readonly string[]): Record<string, FakeData> {
  const policy = deriveEventSeatPolicy(sourceEvent);
  const rows: Record<string, FakeData> = {
    "eventSeatMigrationFences/event-1": {eventId: "event-1",
      migrationRevision: 1, state: "ready"},
    "eventSeatLedgers/event-1": {eventId: "event-1",
      capacity: policy.capacity, occupied: 1, revision: 1,
      capacityRevision: 1, policyVersion: policy.policyVersion,
      policyHash: policy.policyHash, migrationRevision: 1, state: "ready"},
  };
  for (const uid of uids) {
    const proofId = seatVerifiedPhoneProofId("event-1", uid);
    rows[`eventSeatVerifiedPhones/${proofId}`] = {
      eventId: "event-1", organizerId: "club-1", uid, phoneE164: null,
      migrationRevision: 1, state: "current",
    };
    const aliasId = seatIdentityAliasId("event-1", "uid", uid);
    rows[`eventSeatIdentityAliases/${aliasId}`] = {
      eventId: "event-1", organizerId: "club-1", kind: "uid",
      valueHash: seatIdentityValueHash("uid", uid),
      canonicalKey: `uid_${uid}`, identityRevision: 1,
      migrationRevision: 1, state: "ready",
    };
  }
  rows[seatReservationPath("uid_runner-1")] = {eventId: "event-1",
    canonicalKey: "uid_runner-1", identityRevision: 1,
    active: true, revision: 1, reservedAtMillis: 1,
    releasedAtMillis: null};
  return rows;
}

test(
  "cancelEventSignUpHandler keeps paid waitlist users pending payment",
  async () => {
    const h = harness({
      "events/event-1": event({
        priceInPaise: 25000,
        bookedCount: 1,
        waitlistedCount: 1,
      }),
      "users/runner-1": user(),
      "users/runner-2": user({gender: "woman", interestedInGenders: ["man"]}),
      "eventParticipations/event-1_runner-1": participation(
        "runner-1",
        "signedUp"
      ),
      "eventParticipations/event-1_runner-2":
        participation("runner-2", "waitlisted"),
      "payments/pay-1": payment(),
    });

    await cancelEventSignUpHandler(request("runner-1"), h.deps);

    assert.equal(
      h.firestore.get("eventParticipations/event-1_runner-1")?.status,
      "cancelled"
    );
    assert.equal(
      h.firestore.get("eventParticipations/event-1_runner-2")?.status,
      "waitlisted"
    );
    assert.equal(h.firestore.get("events/event-1")?.bookedCount, 0);
    assert.equal(h.firestore.get("events/event-1")?.waitlistedCount, 1);
    assert.deepEqual(h.refunds, [{
      paymentId: "pay_123",
      amountInPaise: 25000,
    }]);
    assert.equal(h.firestore.get("payments/pay-1")?.status, "refunded");
    assert.deepEqual(h.notifications, []);
  }
);

test("cancelEventSignUpHandler promotes free waitlist users", async () => {
  const h = harness({
    "events/event-1": event({bookedCount: 1, waitlistedCount: 1}),
    "users/runner-1": user(),
    "users/runner-2": user({
      fcmToken: "token-2",
      gender: "woman",
      interestedInGenders: ["man"],
    }),
    "eventParticipations/event-1_runner-1": participation(
      "runner-1",
      "signedUp"
    ),
    "eventParticipations/event-1_runner-2": participation(
      "runner-2",
      "waitlisted"
    ),
  });

  await cancelEventSignUpHandler(request("runner-1"), h.deps);

  assert.equal(
    h.firestore.get("eventParticipations/event-1_runner-2")?.status,
    "signedUp"
  );
  assert.equal(h.firestore.get("events/event-1")?.bookedCount, 1);
  assert.equal(h.firestore.get("events/event-1")?.waitlistedCount, 0);
  assert.equal(
    h.firestore.get("notifications/runner-2/items/waitlistPromotion_event-1")
      ?.type,
    "waitlistPromotion"
  );
  assert.deepEqual(h.notifications, [{
    token: "token-2",
    title: "You're in",
    body: "A spot opened for your 5 km event from Carter Road.",
    eventId: "event-1",
    organizerId: "club-1",
  }]);
});

test("ready seat ledger transfers the final seat on cancellation",
  async () => {
    const sourceEvent = event({capacityLimit: 1, bookedCount: 1,
      waitlistedCount: 1});
    const h = harness({"events/event-1": sourceEvent,
      "users/runner-1": user(),
      "users/runner-2": user({gender: "woman",
        interestedInGenders: ["man"]}),
      "eventParticipations/event-1_runner-1":
        participation("runner-1", "signedUp"),
      "eventParticipations/event-1_runner-2":
        participation("runner-2", "waitlisted"),
      ...readySeatDocs(sourceEvent, ["runner-1", "runner-2"])});
    await cancelEventSignUpHandler(request("runner-1"), h.deps);
    await cancelEventSignUpHandler(request("runner-1"), h.deps);
    assert.equal(h.firestore.get("eventSeatLedgers/event-1")?.occupied, 1);
    assert.equal(h.firestore.get(seatReservationPath("uid_runner-1"))
      ?.active, false);
    assert.equal(h.firestore.get(seatReservationPath("uid_runner-2"))
      ?.active, true);
    assert.equal(h.firestore.get("eventParticipations/event-1_runner-2")
      ?.status, "signedUp");
  });

test("promotion enrolls a newly verified waitlisted UID in the same batch",
  async () => {
    const sourceEvent = event({capacityLimit: 1, bookedCount: 1,
      waitlistedCount: 1});
    const h = harness({"events/event-1": sourceEvent,
      "users/runner-1": user(),
      "users/runner-2": user({gender: "woman",
        interestedInGenders: ["man"]}),
      "eventParticipations/event-1_runner-1":
        participation("runner-1", "signedUp"),
      "eventParticipations/event-1_runner-2":
        participation("runner-2", "waitlisted"),
      ...readySeatDocs(sourceEvent, ["runner-1"])});
    h.deps.loadCurrentAuthPhone = async (uid) => uid === "runner-2" ?
      "+919999999999" : null;
    await cancelEventSignUpHandler(request("runner-1"), h.deps);
    assert.equal(h.firestore.get("eventSeatLedgers/event-1")?.occupied, 1);
    assert.equal(h.firestore.get(`eventSeatIdentityAliases/${
      seatIdentityAliasId("event-1", "phone", "+919999999999")}`)
      ?.state, "ready");
    assert.equal(h.firestore.get("eventParticipations/event-1_runner-2")
      ?.status, "signedUp");
  });

test("locked migration denies cancellation and promotion atomically",
  async () => {
    const sourceEvent = event({bookedCount: 1, waitlistedCount: 1});
    const rows = readySeatDocs(sourceEvent, ["runner-1", "runner-2"]);
    rows["eventSeatMigrationFences/event-1"].state = "locked";
    const h = harness({"events/event-1": sourceEvent,
      "users/runner-1": user(),
      "users/runner-2": user({gender: "woman",
        interestedInGenders: ["man"]}),
      "eventParticipations/event-1_runner-1":
        participation("runner-1", "signedUp"),
      "eventParticipations/event-1_runner-2":
        participation("runner-2", "waitlisted"), ...rows});
    await assert.rejects(() =>
      cancelEventSignUpHandler(request("runner-1"), h.deps));
    assert.equal(h.firestore.get("eventParticipations/event-1_runner-1")
      ?.status, "signedUp");
    assert.equal(h.firestore.get("eventParticipations/event-1_runner-2")
      ?.status, "waitlisted");
    assert.equal(h.firestore.get("eventSeatLedgers/event-1")?.occupied, 1);
  });

test("unresolved promoted seat rejects cancellation without partial writes",
  async () => {
    const sourceEvent = event({capacityLimit: 1, bookedCount: 1,
      waitlistedCount: 1});
    const h = harness({"events/event-1": sourceEvent,
      "users/runner-1": user(),
      "users/runner-2": user({gender: "woman",
        interestedInGenders: ["man"]}),
      "eventParticipations/event-1_runner-1":
        participation("runner-1", "signedUp"),
      "eventParticipations/event-1_runner-2":
        participation("runner-2", "waitlisted"),
      ...readySeatDocs(sourceEvent, ["runner-1"])});
    await assert.rejects(() =>
      cancelEventSignUpHandler(request("runner-1"), h.deps));
    assert.equal(h.firestore.get("eventParticipations/event-1_runner-1")
      ?.status, "signedUp");
    assert.equal(h.firestore.get("eventParticipations/event-1_runner-2")
      ?.status, "waitlisted");
    assert.equal(h.firestore.get("eventSeatLedgers/event-1")?.occupied, 1);
  });

test("Catch cancellation retains a separately valid imported guest seat",
  async () => {
    const sourceEvent = event({capacityLimit: 1, bookedCount: 1,
      waitlistedCount: 1});
    const rows = readySeatDocs(sourceEvent, ["runner-1", "runner-2"]);
    const phone = "+919999999999";
    const key = "guest_existing";
    rows[`eventSeatVerifiedPhones/${seatVerifiedPhoneProofId(
      "event-1", "runner-1")}`].phoneE164 = phone;
    rows[`eventSeatIdentityAliases/${seatIdentityAliasId(
      "event-1", "uid", "runner-1")}`].canonicalKey = key;
    rows[`eventSeatIdentityAliases/${seatIdentityAliasId(
      "event-1", "phone", phone)}`] = {eventId: "event-1",
      organizerId: "club-1", kind: "phone",
      valueHash: seatIdentityValueHash("phone", phone),
      canonicalKey: key, identityRevision: 1,
      migrationRevision: 1, state: "ready"};
    rows[`eventSeatIdentityAliases/${seatIdentityAliasId(
      "event-1", "attendee", "guest-1")}`] = {eventId: "event-1",
      organizerId: "club-1", kind: "attendee",
      valueHash: seatIdentityValueHash("attendee", "guest-1"),
      canonicalKey: key, identityRevision: 1,
      migrationRevision: 1, state: "ready"};
    rows["eventAttendees/guest-1"] = {eventId: "event-1",
      organizerId: "club-1", source: "hostImport", status: "registered",
      phoneE164: phone, linkedUid: "runner-1", externalReference: null};
    delete rows[seatReservationPath("uid_runner-1")];
    rows[seatReservationPath(key)] = {eventId: "event-1",
      canonicalKey: key, identityRevision: 1, active: true,
      revision: 1, reservedAtMillis: 1, releasedAtMillis: null};
    const h = harness({"events/event-1": sourceEvent,
      "users/runner-1": user(),
      "users/runner-2": user({gender: "woman",
        interestedInGenders: ["man"]}),
      "eventParticipations/event-1_runner-1":
        participation("runner-1", "signedUp"),
      "eventParticipations/event-1_runner-2":
        participation("runner-2", "waitlisted"), ...rows});
    h.deps.loadCurrentAuthPhone = async () => phone;
    await cancelEventSignUpHandler(request("runner-1"), h.deps);
    assert.equal(h.firestore.get("eventSeatLedgers/event-1")?.occupied, 1);
    assert.equal(h.firestore.get(seatReservationPath(key))?.active, true);
    assert.equal(h.firestore.get("eventParticipations/event-1_runner-1")
      ?.status, "cancelled");
    assert.equal(h.firestore.get("eventParticipations/event-1_runner-2")
      ?.status, "waitlisted");
  });

test("migrated UID seat retains linked Host attendee at full capacity",
  async () => {
    const sourceEvent = event({capacityLimit: 1, bookedCount: 1,
      waitlistedCount: 1});
    const rows = readySeatDocs(sourceEvent, ["runner-1", "runner-2"]);
    const attendeeId = eventAttendeeId("event-1", "external:roster-1");
    rows[`eventSeatIdentityAliases/${seatIdentityAliasId(
      "event-1", "attendee", attendeeId)}`] = {
      eventId: "event-1", organizerId: "club-1", kind: "attendee",
      valueHash: seatIdentityValueHash("attendee", attendeeId),
      canonicalKey: "uid_runner-1", identityRevision: 1,
      migrationRevision: 1, state: "ready",
    };
    rows[`eventSeatIdentityAliases/${seatIdentityAliasId(
      "event-1", "external", "roster-1")}`] = {
      eventId: "event-1", organizerId: "club-1", kind: "external",
      valueHash: seatIdentityValueHash("external", "roster-1"),
      canonicalKey: "uid_runner-1", identityRevision: 1,
      migrationRevision: 1, state: "ready",
    };
    rows[`eventAttendees/${attendeeId}`] = {
      eventId: "event-1", organizerId: "club-1", source: "hostImport",
      status: "registered", linkedUid: "runner-1", phoneE164: null,
      externalReference: "roster-1",
    };
    const h = harness({"events/event-1": sourceEvent,
      "users/runner-1": user(),
      "users/runner-2": user({gender: "woman",
        interestedInGenders: ["man"]}),
      "eventParticipations/event-1_runner-1":
        participation("runner-1", "signedUp"),
      "eventParticipations/event-1_runner-2":
        participation("runner-2", "waitlisted"), ...rows});
    await cancelEventSignUpHandler(request("runner-1"), h.deps);
    assert.equal(h.firestore.get("eventSeatLedgers/event-1")?.occupied, 1);
    assert.equal(h.firestore.get(seatReservationPath("uid_runner-1"))?.active,
      true);
    assert.equal(h.firestore.get("events/event-1")?.bookedCount, 1);
    assert.equal(h.firestore.get("eventParticipations/event-1_runner-1")
      ?.status, "cancelled");
    assert.equal(h.firestore.get("eventParticipations/event-1_runner-2")
      ?.status, "waitlisted");
  });

test("retried cancellation with committed no-op sends no stale push or refund",
  async () => {
    const sourceEvent = event({bookedCount: 1, waitlistedCount: 1});
    const h = harness({"events/event-1": sourceEvent,
      "users/runner-1": user(),
      "users/runner-2": user({fcmToken: "push-2", gender: "woman",
        interestedInGenders: ["man"]}),
      "eventParticipations/event-1_runner-1":
        participation("runner-1", "signedUp"),
      "eventParticipations/event-1_runner-2":
        participation("runner-2", "waitlisted"),
      "payments/pay-1": payment()});
    h.firestore.retryAfterFirstAttempt = () => {
      h.firestore.merge("eventParticipations/event-1_runner-1",
        {status: "cancelled"});
    };
    const result = await cancelEventSignUpHandler(request("runner-1"),
      h.deps);
    assert.deepEqual(result, {cancelled: false});
    assert.deepEqual(h.notifications, []);
    assert.deepEqual(h.refunds, []);
    assert.equal(h.firestore.get("payments/pay-1")?.status, "completed");
    assert.equal(h.firestore.get("eventParticipations/event-1_runner-2")
      ?.status, "waitlisted");
  });

test("private event cancellation does not auto-promote waitlist", async () => {
  const h = harness({
    "events/event-1": event({
      bookedCount: 1, waitlistedCount: 1,
      publicationState: "private", setupRevision: 1,
    }),
    "users/runner-1": user(),
    "users/runner-2": user({gender: "woman"}),
    "eventParticipations/event-1_runner-1": participation(
      "runner-1", "signedUp"
    ),
    "eventParticipations/event-1_runner-2": participation(
      "runner-2", "waitlisted"
    ),
  });

  await cancelEventSignUpHandler(request("runner-1"), h.deps);

  assert.equal(h.firestore.get("eventParticipations/event-1_runner-1")
    ?.status, "cancelled");
  assert.equal(h.firestore.get("eventParticipations/event-1_runner-2")
    ?.status, "waitlisted");
  assert.equal(h.firestore.get("events/event-1")?.bookedCount, 0);
  assert.equal(h.firestore.get("events/event-1")?.waitlistedCount, 1);
  assert.deepEqual(h.notifications, []);
});

test(
  "cancelEventSignUpHandler still refunds when promotion push fails",
  async () => {
    const h = harness({
      "events/event-1": event({bookedCount: 1, waitlistedCount: 1}),
      "users/runner-1": user(),
      "users/runner-2": user({
        fcmToken: "token-2",
        gender: "woman",
        interestedInGenders: ["man"],
      }),
      "eventParticipations/event-1_runner-1": participation(
        "runner-1",
        "signedUp"
      ),
      "eventParticipations/event-1_runner-2": participation(
        "runner-2",
        "waitlisted"
      ),
      "payments/pay-1": payment(),
    }, {
      sendNotificationError: new Error("FCM unavailable"),
    });

    await cancelEventSignUpHandler(request("runner-1"), h.deps);

    assert.equal(h.notifications.length, 1);
    assert.deepEqual(h.refunds, [{
      paymentId: "pay_123",
      amountInPaise: 25000,
    }]);
    assert.equal(h.firestore.get("payments/pay-1")?.status, "refunded");
  }
);

test(
  "cancelEventSignUpHandler honors the no-refund cancellation window",
  async () => {
    const h = harness({
      "events/event-1": event({
        priceInPaise: 25000,
        bookedCount: 1,
        eventPolicy: eventPolicy({
          cancellation: {policyId: "strict"},
        }),
      }),
      "users/runner-1": user(),
      "eventParticipations/event-1_runner-1": participation(
        "runner-1",
        "signedUp"
      ),
      "payments/pay-1": payment(),
    }, {
      nowMillis: Date.parse("2026-05-02T00:30:00.000Z"),
    });

    await cancelEventSignUpHandler(request("runner-1"), h.deps);

    assert.deepEqual(h.refunds, []);
    assert.equal(h.firestore.get("payments/pay-1")?.status, "completed");
  }
);

function harness(
  initialDocs: Record<string, FakeData | undefined>,
  options: {nowMillis?: number; sendNotificationError?: Error;
    refundError?: Error; authorizationError?: Error;
    afterAuthorization?: () => void;
    authorizeRazorpayRefund?: (payment: PaymentDocument) =>
      Promise<LegacyRazorpayRefundAuthorization>} = {}
) {
  const firestore = new FakeFirestore(initialDocs);
  const refunds: Array<{paymentId: string; amountInPaise: number}> = [];
  const notifications: Array<{
    token: string;
    title: string;
    body: string;
    eventId: string;
    organizerId: string;
  }> = [];
  return {
    firestore,
    refunds,
    notifications,
    deps: {
      firestore: () =>
        firestore as unknown as FirebaseFirestore.Firestore,
      checkRateLimit: async () => undefined,
      nowMillis: () =>
        options.nowMillis ?? Date.parse("2026-05-01T00:00:00.000Z"),
      loadCurrentAuthPhone: async (uid: string): Promise<string | null> => {
        void uid;
        return null;
      },
      authorizeRazorpayRefund: async (payment: PaymentDocument) => {
        if (options.authorizationError) throw options.authorizationError;
        const supplied = options.authorizeRazorpayRefund ?
          await options.authorizeRazorpayRefund(payment) :
          ownedRazorpayAuthorization(payment);
        options.afterAuthorization?.();
        return supplied;
      },
      processRefund: async (db: FirebaseFirestore.Firestore,
        paymentId: string) => processLegacyCancellationRefund({db, paymentId,
        clock: () => options.nowMillis ??
          Date.parse("2026-05-01T00:00:00.000Z"),
        provider: {
          verifyPayment: async () => undefined,
          createRefund: async (intent, attempt) => {
            if (options.refundError) throw options.refundError;
            refunds.push({paymentId: intent.providerPaymentId,
              amountInPaise: attempt.amountMinor});
            return {id: "rfnd_test", paymentId: intent.providerPaymentId,
              amountMinor: attempt.amountMinor, currency: intent.currency,
              state: "processed"};
          },
          fetchRefund: async () => {
            throw new Error("No pending provider result in this fixture.");
          },
        }}),
      sendNotification: async (push: {
        token: string;
        title: string;
        body: string;
        eventId: string;
        organizerId: string;
      }) => {
        notifications.push(push);
        if (options.sendNotificationError) {
          throw options.sendNotificationError;
        }
      },
    },
  };
}

function request(uid: string): CallableRequest<unknown> {
  return {
    auth: {uid, token: {}} as CallableRequest["auth"],
    data: {eventId: "event-1"},
    rawRequest: {} as CallableRequest["rawRequest"],
    acceptsStreaming: false,
  };
}

function event(overrides: FakeData = {}): FakeData {
  return {
    organizerId: "club-1",
    startTime: admin.firestore.Timestamp.fromMillis(
      Date.parse("2026-05-02T01:30:00.000Z")
    ),
    endTime: admin.firestore.Timestamp.fromMillis(
      Date.parse("2026-05-02T02:30:00.000Z")
    ),
    meetingPoint: "Carter Road",
    meetingLocation: {
      name: "Carter Road",
      latitude: 19.0608,
      longitude: 72.8365,
    },
    startingPointLat: 19.0608,
    startingPointLng: 72.8365,
    distanceKm: 5,
    pace: "easy",
    capacityLimit: 20,
    description: "Easy seaside event.",
    priceInPaise: 0,
    bookedCount: 0,
    checkedInCount: 0,
    waitlistedCount: 0,
    status: "active",
    cancelledAt: null,
    cancellationReason: null,
    discoveryCityName: "mumbai",
    discoveryMarketId: "in-mh-mumbai",
    constraints: {minAge: 0, maxAge: 99, maxMen: null, maxWomen: null},
    genderCounts: {man: 1},
    cohortCounts: {menInterestedInWomen: 1},
    ...overrides,
  };
}

function user(overrides: FakeData = {}): FakeData {
  return {
    name: "Runner",
    phoneNumber: "+919876543210",
    gender: "man",
    interestedInGenders: ["woman"],
    ...overrides,
  };
}

function participation(uid: string, status: string): FakeData {
  return {
    eventId: "event-1",
    organizerId: "club-1",
    uid,
    status,
    genderAtSignup: uid === "runner-2" ? "woman" : "man",
    cohortAtSignup: uid === "runner-2" ?
      "womenInterestedInMen" :
      "menInterestedInWomen",
    waitlistedAt: uid === "runner-2" ? 1 : null,
  };
}

function payment(): FakeData {
  return {
    userId: "runner-1",
    orderId: "order_123",
    paymentId: "pay_123",
    eventId: "event-1",
    amount: 25000,
    currency: "INR",
    provider: "razorpay",
    razorpayOwnership: {projectId: "catchdates-dev", schema: "1"},
    status: "completed",
    signUpFailed: false,
    createdAt: admin.firestore.Timestamp.fromMillis(1),
  };
}

function ownedRazorpayAuthorization(payment: PaymentDocument):
  LegacyRazorpayRefundAuthorization {
  const runtimeProjectId = "catchdates-dev";
  const ownership = resolveRazorpayOrderOwnership({runtimeProjectId,
    order: {id: payment.orderId,
      notes: razorpayOwnershipNotes(runtimeProjectId)},
    frozenContexts: [payment.razorpayOwnership,
      payment.cancellationRefund?.razorpayOwnership]});
  if (ownership.kind !== "owned") throw new Error("Expected owned order.");
  return {evidence: ownership.evidence, runtimeProjectId};
}

function eventPolicy(overrides: FakeData = {}): FakeData {
  return {
    version: 1,
    admission: {
      format: "open",
      capacityLimit: 20,
      waitlistPolicy: {mode: "rankedOffer", offerWindowMinutes: 20},
      inviteRequired: false,
      membershipRequired: false,
      manualApprovalRequired: false,
      cohortCapacityLimits: {},
      balancedRatioPolicy: null,
    },
    pricing: {
      basePriceInPaise: 25000,
      cohortAdjustmentsInPaise: {},
      demandPricingRules: [],
    },
    cancellation: {policyId: "standard"},
    settlement: {hostPayoutTiming: "afterEventCompletion"},
    ...overrides,
  };
}

function sortableValue(value: unknown): number {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "toMillis" in value &&
      typeof value.toMillis === "function") {
    return value.toMillis();
  }
  return 0;
}


test("guest cancellation saves its refund before provider failure and replays",
  async () => {
    const options: {nowMillis: number; refundError?: Error} = {
      nowMillis: Date.parse("2026-05-01T00:00:00.000Z"),
      refundError: new Error("Provider unavailable")};
    const h = harness({"events/event-1": event(),
      "users/runner-1": user(),
      "eventParticipations/event-1_runner-1":
        participation("runner-1", "signedUp"),
      "payments/pay-1": payment()}, options);
    await cancelEventSignUpHandler(request("runner-1"), h.deps);
    const saved = h.firestore.get("payments/pay-1")?.cancellationRefund as
      {state: string; targetAmountMinor: number};
    assert.equal(saved.state, "pending");
    assert.equal(saved.targetAmountMinor, 25000);
    assert.equal(h.firestore.get("payments/pay-1")?.status, "completed");
    delete options.refundError;
    // Replay after the event/policy deadline must use the saved quote.
    options.nowMillis += 3 * 86400_000;
    await cancelEventSignUpHandler(request("runner-1"), h.deps);
    assert.equal(h.firestore.get("payments/pay-1")?.status, "refunded");
    assert.equal(h.refunds.length, 1);
  });

test("foreign Razorpay guest cancellation has zero booking or refund effects",
  async () => {
    const h = harness({"events/event-1": event({bookedCount: 1}),
      "users/runner-1": user(),
      "eventParticipations/event-1_runner-1":
        participation("runner-1", "signedUp"),
      "payments/pay-1": payment()}, {
      authorizeRazorpayRefund: async (current) => {
        const ownership = resolveRazorpayOrderOwnership({
          runtimeProjectId: "catchdates-dev",
          order: {id: current.orderId,
            notes: razorpayOwnershipNotes("catch-dating-app-64e51")},
          frozenContexts: [current.razorpayOwnership],
        });
        assert.equal(ownership.kind, "foreign");
        throw new Error("Foreign Razorpay order.");
      },
    });
    const before = cancellationEffectSnapshot(h.firestore);
    await assert.rejects(() =>
      cancelEventSignUpHandler(request("runner-1"), h.deps), /Foreign/);
    assert.equal(cancellationEffectSnapshot(h.firestore), before);
    assert.deepEqual(h.refunds, []);
    assert.deepEqual(h.notifications, []);
  });

test("Razorpay ownership read failure is retryable without partial effects",
  async () => {
    const options: {authorizationError?: Error} = {
      authorizationError: new Error("Provider unavailable"),
    };
    const h = harness({"events/event-1": event({bookedCount: 1}),
      "users/runner-1": user(),
      "eventParticipations/event-1_runner-1":
        participation("runner-1", "signedUp"),
      "payments/pay-1": payment()}, options);
    const before = cancellationEffectSnapshot(h.firestore);
    await assert.rejects(() =>
      cancelEventSignUpHandler(request("runner-1"), h.deps), /unavailable/);
    assert.equal(cancellationEffectSnapshot(h.firestore), before);
    delete options.authorizationError;
    assert.deepEqual(await cancelEventSignUpHandler(request("runner-1"),
      h.deps), {cancelled: true});
    assert.equal(h.firestore.get("eventParticipations/event-1_runner-1")
      ?.status, "cancelled");
    assert.equal(h.firestore.get("payments/pay-1")?.status, "refunded");
  });

test("guest cancellation rebinds ownership to the transaction payment read",
  async () => {
    const options: {afterAuthorization?: () => void} = {};
    const h = harness({"events/event-1": event({bookedCount: 1}),
      "users/runner-1": user(),
      "eventParticipations/event-1_runner-1":
        participation("runner-1", "signedUp"),
      "payments/pay-1": payment()}, options);
    options.afterAuthorization = () => {
      options.afterAuthorization = undefined;
      h.firestore.merge("payments/pay-1", {amount: 26000});
    };
    await assert.rejects(() =>
      cancelEventSignUpHandler(request("runner-1"), h.deps),
    /ownership reconciliation/);
    assert.equal(h.firestore.get("eventParticipations/event-1_runner-1")
      ?.status, "signedUp");
    assert.equal(h.firestore.get("events/event-1")?.bookedCount, 1);
    assert.equal(h.firestore.get("payments/pay-1")?.cancellationRefund,
      undefined);
    assert.deepEqual(h.refunds, []);
  });

test("Stripe guest cancellation does not require Razorpay authorization",
  async () => {
    let authorizationCalls = 0;
    const stripePayment: FakeData = {...payment(), provider: "stripe",
      providerPaymentId: "pi_123", stripeAccountId: "acct_123"};
    delete stripePayment.razorpayOwnership;
    const h = harness({"events/event-1": event({bookedCount: 1}),
      "users/runner-1": user(),
      "eventParticipations/event-1_runner-1":
        participation("runner-1", "signedUp"),
      "payments/pay-1": stripePayment}, {
      authorizeRazorpayRefund: async (current) => {
        authorizationCalls++;
        return ownedRazorpayAuthorization(current);
      },
    });
    await cancelEventSignUpHandler(request("runner-1"), h.deps);
    assert.equal(authorizationCalls, 0);
    assert.equal(h.firestore.get("payments/pay-1")?.status, "refunded");
    assert.equal(h.firestore.get("eventParticipations/event-1_runner-1")
      ?.status, "cancelled");
  });

test("completed no-refund Razorpay cancellation replays without provider I/O",
  async () => {
    const options: {nowMillis: number; authorizationError?: Error} = {
      nowMillis: Date.parse("2026-05-02T00:30:00.000Z"),
    };
    const h = harness({"events/event-1": event({bookedCount: 1,
      eventPolicy: eventPolicy({cancellation: {policyId: "strict"}})}),
    "users/runner-1": user(),
    "eventParticipations/event-1_runner-1":
      participation("runner-1", "signedUp"),
    "payments/pay-1": payment()}, options);
    assert.deepEqual(await cancelEventSignUpHandler(request("runner-1"),
      h.deps), {cancelled: true});
    options.authorizationError = new Error("Provider unavailable");
    assert.deepEqual(await cancelEventSignUpHandler(request("runner-1"),
      h.deps), {cancelled: false});
    assert.equal(h.firestore.get("payments/pay-1")?.cancellationRefund &&
      (h.firestore.get("payments/pay-1")?.cancellationRefund as FakeData)
        .state, "complete");
    assert.deepEqual(h.refunds, []);
  });

function cancellationEffectSnapshot(firestore: FakeFirestore): string {
  return JSON.stringify([
    firestore.get("events/event-1"),
    firestore.get("eventParticipations/event-1_runner-1"),
    firestore.get("eventSeatLedgers/event-1"),
    firestore.get("payments/pay-1"),
  ]);
}


test("minimal accounts cancel and receive unrestricted seats",
  async () => {
    const minimal = {name: "Ada", phoneNumber: "+919876543210"};
    const edge = (uid: string, status: string) => ({
      ...participation(uid, status),
      genderAtSignup: null,
      cohortAtSignup: "unspecified",
    });
    const h = harness({
      "events/event-1": event({
        bookedCount: 1,
        waitlistedCount: 1,
        genderCounts: {},
        cohortCounts: {unspecified: 1},
      }),
      "users/runner-1": minimal,
      "users/runner-2": minimal,
      "eventParticipations/event-1_runner-1": edge("runner-1", "signedUp"),
      "eventParticipations/event-1_runner-2": edge("runner-2", "waitlisted"),
    });
    await cancelEventSignUpHandler(request("runner-1"), h.deps);
    assert.equal(
      h.firestore.get("eventParticipations/event-1_runner-1")?.status,
      "cancelled",
    );
    assert.equal(
      h.firestore.get("eventParticipations/event-1_runner-2")?.status,
      "signedUp",
    );
    assert.deepEqual(h.firestore.get("events/event-1")?.genderCounts, {});
    assert.equal(
      h.firestore.get("eventParticipations/event-1_runner-2")
        ?.genderAtSignup,
      null,
    );
  });

for (const blocked of [
  {},
  {
    dateOfBirth: admin.firestore.Timestamp.fromDate(
      new Date("2015-01-01"),
    ),
  },
  {
    phoneNumber: "",
    dateOfBirth: admin.firestore.Timestamp.fromDate(
      new Date("1995-01-01"),
    ),
  },
]) {
  test(`promotion skips ineligible details ${JSON.stringify(blocked)}`,
    async () => {
      const h = harness({
        "events/event-1": event({
          bookedCount: 1,
          waitlistedCount: 2,
          constraints: {minAge: 18, maxAge: 99},
        }),
        "users/runner-1": user(),
        "users/runner-2": user(blocked),
        "users/runner-3": user({
          dateOfBirth: admin.firestore.Timestamp.fromDate(
            new Date("1995-01-01"),
          ),
        }),
        "eventParticipations/event-1_runner-1": participation(
          "runner-1",
          "signedUp",
        ),
        "eventParticipations/event-1_runner-2": participation(
          "runner-2",
          "waitlisted",
        ),
        "eventParticipations/event-1_runner-3": {
          ...participation("runner-3", "waitlisted"),
          waitlistedAt: 2,
        },
      });
      await cancelEventSignUpHandler(request("runner-1"), h.deps);
      assert.equal(
        h.firestore.get("eventParticipations/event-1_runner-2")?.status,
        "waitlisted",
      );
      assert.equal(
        h.firestore.get("eventParticipations/event-1_runner-3")?.status,
        "signedUp",
      );
      assert.equal(h.firestore.get("events/event-1")?.waitlistedCount, 1);
    });
}

test("an organizer-routed paid booking is not cancelled natively",
  async () => {
    const h = harness({
      "events/event-1": event({priceInPaise: 25000, bookedCount: 1}),
      "users/runner-1": user(),
      "eventParticipations/event-1_runner-1": {
        ...participation("runner-1", "signedUp"),
        paymentId: "pp_0123456789abcdef0123456789abcdef",
      },
    });
    await assert.rejects(
      cancelEventSignUpHandler(request("runner-1"), h.deps),
      /Cancel this paid booking from its payment details/u,
    );
    assert.equal(
      h.firestore.get("eventParticipations/event-1_runner-1")?.status,
      "signedUp",
    );
    assert.equal(h.firestore.get("events/event-1")?.bookedCount, 1);
    assert.deepEqual(h.refunds, []);
  });
