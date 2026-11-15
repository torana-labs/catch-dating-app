import {
  fieldAt,
  seedCatchBookingRows,
} from "../shared/testing/catchBookingRows";
import assert from "node:assert/strict";
import test from "node:test";
import {CallableRequest, HttpsError} from "firebase-functions/v2/https";
import {
  crossPathsConsentId,
  currentCrossPathsTermsVersion,
  setCrossPathsEventConsentHandler,
} from "./setCrossPathsEventConsent";

type FakeData = Record<string, unknown>;

class FakeDocRef {
  constructor(readonly path: string) {}
}

class FakeSnapshot {
  constructor(
    private readonly value: FakeData | undefined,
    readonly ref: FakeDocRef
  ) {}
  get exists(): boolean {
    return this.value !== undefined;
  }
  data(): FakeData | undefined {
    return this.value === undefined ? undefined : {...this.value};
  }
}

class FakeQuery {
  constructor(
    private readonly firestore: FakeFirestore,
    protected readonly path: string,
    private readonly field?: string,
    private readonly expected?: unknown
  ) {}
  where(field: string, _op: string, expected: unknown) {
    return new FakeQuery(this.firestore, this.path, field, expected);
  }
  limit(value: number) {
    void value;
    return this;
  }
  async get() {
    const field = this.field;
    const docs = this.firestore.collectionRows(this.path)
      .filter(({value}) => {
        if (field === undefined) return true;
        const actual = fieldAt(value, field);
        return Array.isArray(actual) && actual.includes(this.expected);
      })
      .map(({id, value}) => new FakeSnapshot(
        value,
        new FakeDocRef(`${this.path}/${id}`)
      ));
    return {docs};
  }
}

class FakeCollection extends FakeQuery {
  constructor(
    firestoreRef: FakeFirestore,
    readonly path: string
  ) {
    super(firestoreRef, path);
  }
  doc(id: string) {
    return new FakeDocRef(`${this.path}/${id}`);
  }
}

class FakeFirestore {
  constructor(private readonly docs: Record<string, FakeData | undefined>) {
    seedCatchBookingRows(docs);
  }
  collection(path: string) {
    return new FakeCollection(this, path);
  }
  async runTransaction<T>(callback: (tx: FakeTransaction) => Promise<T>) {
    const tx = new FakeTransaction(this);
    const result = await callback(tx);
    tx.commit();
    return result;
  }
  read(path: string): FakeData | undefined {
    const value = this.docs[path];
    return value === undefined ? undefined : {...value};
  }
  write(path: string, value: FakeData) {
    this.docs[path] = {...value};
  }
  collectionRows(path: string): Array<{id: string; value: FakeData}> {
    const prefix = `${path}/`;
    return Object.entries(this.docs).flatMap(([key, value]) => {
      if (!key.startsWith(prefix) || value === undefined) return [];
      const suffix = key.slice(prefix.length);
      if (suffix.includes("/")) return [];
      return [{id: suffix, value}];
    });
  }
}

class FakeTransaction {
  private readonly writes: Array<() => void> = [];
  constructor(private readonly firestore: FakeFirestore) {}
  async get(ref: FakeDocRef | FakeQuery) {
    if (ref instanceof FakeQuery) return ref.get();
    return new FakeSnapshot(this.firestore.read(ref.path), ref);
  }
  set(ref: FakeDocRef, value: FakeData) {
    this.writes.push(() => this.firestore.write(ref.path, value));
  }
  update(ref: FakeDocRef, value: FakeData) {
    this.writes.push(() => this.firestore.write(ref.path, {
      ...this.firestore.read(ref.path),
      ...value,
    }));
  }
  commit() {
    for (const write of this.writes) write();
  }
}

function harness(overrides: Record<string, FakeData | undefined> = {}) {
  const firestore = new FakeFirestore({
    "users/runner-1": {prefsShowInCrossPaths: true},
    "events/event-1": {
      startTime: timestamp(1_888_888_888_000),
      status: "active",
      crossPathsDiscoveryEnabled: true,
      discoveryMarketId: "in-mh-mumbai",
    },
    "eventParticipations/event-1_runner-1": {
      eventId: "event-1",
      uid: "runner-1",
      status: "signedUp",
    },
    ...overrides,
  });
  const rateLimitCalls: string[] = [];
  return {
    firestore,
    rateLimitCalls,
    deps: {
      firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
      now: () => timestamp(1_777_777_777_000),
      checkRateLimit: async (
        _db: FirebaseFirestore.Firestore,
        uid: string,
        action: string
      ) => {
        rateLimitCalls.push(`${uid}:${action}`);
      },
    },
  };
}

test(
  "stores enabled consent only for a confirmed opted-in attendee",
  async () => {
    const h = harness();
    const response = await setCrossPathsEventConsentHandler(
      request("runner-1", {
        eventId: " event-1 ",
        enabled: true,
        termsVersion: currentCrossPathsTermsVersion,
        source: "event_detail",
      }),
      h.deps
    );

    assert.deepEqual(response, {
      eventId: "event-1",
      enabled: true,
      termsVersion: currentCrossPathsTermsVersion,
    });
    assert.deepEqual(h.rateLimitCalls, [
      "runner-1:setCrossPathsEventConsent",
    ]);
    assert.deepEqual(
      h.firestore.read("eventCrossPathsConsents/event-1_runner-1"),
      {
        eventId: "event-1",
        uid: "runner-1",
        enabled: true,
        termsVersion: currentCrossPathsTermsVersion,
        consentedAt: timestamp(1_777_777_777_000),
        updatedAt: timestamp(1_777_777_777_000),
        revokedAt: null,
        source: "event_detail",
      }
    );
  }
);

test("fails closed when global consent is missing or booking is not confirmed",
  async () => {
    const missingGlobal = harness({
      "users/runner-1": {},
    });
    await assert.rejects(
      setCrossPathsEventConsentHandler(
        request("runner-1", enabledPayload(true)),
        missingGlobal.deps
      ),
      hasCode("failed-precondition")
    );

    const waitlisted = harness({
      "eventParticipations/event-1_runner-1": {
        eventId: "event-1",
        uid: "runner-1",
        status: "waitlisted",
      },
    });
    await assert.rejects(
      setCrossPathsEventConsentHandler(
        request("runner-1", enabledPayload(true)),
        waitlisted.deps
      ),
      hasCode("failed-precondition")
    );
  });

test(
  "enabling consent fails closed outside a selected Mumbai event",
  async () => {
    for (const event of [
      {
        startTime: timestamp(1_888_888_888_000),
        status: "active",
        crossPathsDiscoveryEnabled: false,
        discoveryMarketId: "in-mh-mumbai",
      },
      {
        startTime: timestamp(1_888_888_888_000),
        status: "active",
        crossPathsDiscoveryEnabled: true,
        discoveryMarketId: "in-dl-delhi-ncr",
      },
    ]) {
      const h = harness({"events/event-1": event});
      await assert.rejects(
        setCrossPathsEventConsentHandler(
          request("runner-1", enabledPayload(true)),
          h.deps
        ),
        hasCode("failed-precondition")
      );
    }
  }
);

test("fails closed for missing, cancelled, or past events", async () => {
  for (const event of [
    undefined,
    {
      startTime: timestamp(1_888_888_888_000),
      status: "cancelled",
      crossPathsDiscoveryEnabled: true,
      discoveryMarketId: "in-mh-mumbai",
    },
    {
      startTime: timestamp(1_700_000_000_000),
      status: "active",
      crossPathsDiscoveryEnabled: true,
      discoveryMarketId: "in-mh-mumbai",
    },
  ]) {
    const h = harness({"events/event-1": event});
    await assert.rejects(
      setCrossPathsEventConsentHandler(
        request("runner-1", enabledPayload(true)),
        h.deps
      ),
      (error: unknown) =>
        error instanceof HttpsError &&
        (error.code === "not-found" || error.code === "failed-precondition")
    );
  }
});

test(
  "revocation works after booking or global consent disappears",
  async () => {
    const original = timestamp(1_700_000_000_000);
    const h = harness({
      "users/runner-1": {},
      "eventParticipations/event-1_runner-1": undefined,
      "eventCrossPathsConsents/event-1_runner-1": {
        eventId: "event-1",
        uid: "runner-1",
        enabled: true,
        termsVersion: 1,
        consentedAt: original,
        updatedAt: original,
        revokedAt: null,
        source: "booking_success",
      },
      "crossPathsInvitations/pending-1": {
        eventId: "event-1",
        senderUid: "runner-1",
        recipientUid: "peer-1",
        participantIds: ["runner-1", "peer-1"],
        status: "pending",
      },
      "crossPathsInvitations/accepted-1": {
        eventId: "event-1",
        senderUid: "peer-2",
        recipientUid: "runner-1",
        participantIds: ["peer-2", "runner-1"],
        status: "accepted",
        conversationId: "plan-1",
      },
      "matches/plan-1": {
        status: "active",
        unreadCounts: {"runner-1": 2, "peer-2": 1},
      },
    });

    await setCrossPathsEventConsentHandler(
      request("runner-1", enabledPayload(false)),
      h.deps
    );

    assert.deepEqual(
      h.firestore.read("eventCrossPathsConsents/event-1_runner-1"),
      {
        eventId: "event-1",
        uid: "runner-1",
        enabled: false,
        termsVersion: 1,
        consentedAt: original,
        updatedAt: timestamp(1_777_777_777_000),
        revokedAt: timestamp(1_777_777_777_000),
        source: "event_detail",
      }
    );
    assert.equal(
      h.firestore.read("crossPathsInvitations/pending-1")?.status,
      "invalidated"
    );
    assert.equal(
      h.firestore.read("crossPathsInvitations/accepted-1")?.status,
      "accepted"
    );
    assert.equal(h.firestore.read("matches/plan-1")?.status, "active");
  }
);

test("rejects stale terms versions", async () => {
  const h = harness();
  await assert.rejects(
    setCrossPathsEventConsentHandler(
      request("runner-1", {...enabledPayload(true), termsVersion: 2}),
      h.deps
    ),
    hasCode("failed-precondition")
  );
  assert.deepEqual(h.rateLimitCalls, []);
});

test("consent ids are deterministic", () => {
  assert.equal(
    crossPathsConsentId("event-1", "runner-1"),
    "event-1_runner-1"
  );
});

function enabledPayload(enabled: boolean): Record<string, unknown> {
  return {
    eventId: "event-1",
    enabled,
    termsVersion: currentCrossPathsTermsVersion,
    source: "event_detail",
  };
}

function request(
  uid: string | null,
  data: Record<string, unknown>
): CallableRequest<unknown> {
  return {
    auth: uid ? {uid, token: {}} as CallableRequest["auth"] : undefined,
    data,
    rawRequest: {} as CallableRequest["rawRequest"],
  } as CallableRequest<unknown>;
}

function hasCode(code: string) {
  return (error: unknown) =>
    error instanceof HttpsError && error.code === code;
}

class FakeTimestamp {
  readonly kind = "timestamp";
  constructor(readonly millis: number) {}
  toMillis(): number {
    return this.millis;
  }
}

function timestamp(millis: number): FirebaseFirestore.Timestamp {
  return new FakeTimestamp(millis) as unknown as
    FirebaseFirestore.Timestamp;
}
