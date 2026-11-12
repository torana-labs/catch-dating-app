import assert from "node:assert/strict";
import test from "node:test";
import {guestInstallation} from "../shared/testing/pushInstallationFixture";
import {CallableRequest, HttpsError} from "firebase-functions/v2/https";
import {
  eventBroadcastDeliveryKey,
  eventBroadcastId,
} from "../shared/eventBroadcasts";
import {blockDocId} from "../safety/blocking";
import {FcmParams} from "../shared/notifications";
import {sendEventBroadcastHandler} from "./sendEventBroadcast";

type FakeData = Record<string, unknown>;
type Filter = {field: string; op: string; value: unknown};
type HandlerDeps = NonNullable<
  Parameters<typeof sendEventBroadcastHandler>[1]
>;

class FakeTimestamp {
  constructor(readonly millis: number) {}
  toMillis() {
    return this.millis;
  }
}

function cloneFake<T>(value: T): T {
  if (value instanceof FakeTimestamp) {
    return new FakeTimestamp(value.millis) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => cloneFake(item)) as T;
  }
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneFake(item)])
    ) as T;
  }
  return value;
}

class FakeDocSnapshot {
  constructor(readonly ref: FakeDocRef, private readonly value?: FakeData) {}
  get id() {
    return this.ref.id;
  }
  get exists() {
    return this.value !== undefined;
  }
  data() {
    return this.value === undefined ? undefined : cloneFake(this.value);
  }
}

class FakeQuerySnapshot {
  constructor(readonly docs: FakeDocSnapshot[]) {}
  get size() {
    return this.docs.length;
  }
  get empty() {
    return this.docs.length === 0;
  }
}

class FakeDocRef {
  constructor(readonly firestore: FakeFirestore, readonly path: string) {}
  get id() {
    return this.path.split("/").at(-1) ?? "";
  }
  collection(name: string) {
    return new FakeCollection(this.firestore, `${this.path}/${name}`);
  }
  async get() {
    return new FakeDocSnapshot(this, this.firestore.get(this.path));
  }
  async set(data: FakeData, options?: {merge?: boolean}) {
    this.firestore.set(this.path, data, options);
  }
  async create(data: FakeData) {
    this.firestore.create(this.path, data);
  }
}

class FakeCollection {
  constructor(readonly firestore: FakeFirestore, readonly path: string) {}
  doc(id: string) {
    return new FakeDocRef(this.firestore, `${this.path}/${id}`);
  }
  where(field: string, op: string, value: unknown) {
    return new FakeQuery(this.firestore, this.path, [{field, op, value}]);
  }
  limit(count: number) {
    return new FakeQuery(this.firestore, this.path, [], count);
  }
}

class FakeQuery {
  constructor(
    readonly firestore: FakeFirestore,
    readonly path: string,
    readonly filters: Filter[],
    readonly limitCount?: number
  ) {}
  where(field: string, op: string, value: unknown) {
    return new FakeQuery(
      this.firestore,
      this.path,
      [...this.filters, {field, op, value}],
      this.limitCount
    );
  }
  limit(count: number) {
    return new FakeQuery(this.firestore, this.path, this.filters, count);
  }
  async get() {
    const rows = this.firestore.query(this.path, this.filters);
    const limited = this.limitCount === undefined ?
      rows : rows.slice(0, this.limitCount);
    return new FakeQuerySnapshot(limited.map(({path, data}) =>
      new FakeDocSnapshot(new FakeDocRef(this.firestore, path), data)
    ));
  }
}

class FakeTransaction {
  private readonly writes: Array<() => void> = [];
  constructor(private readonly firestore: FakeFirestore) {}
  async get(ref: FakeDocRef | FakeQuery) {
    return ref.get();
  }
  set(ref: FakeDocRef, data: FakeData, options?: {merge?: boolean}) {
    this.writes.push(() => this.firestore.set(ref.path, data, options));
  }
  create(ref: FakeDocRef, data: FakeData) {
    this.writes.push(() => this.firestore.create(ref.path, data));
  }
  update(ref: FakeDocRef, data: FakeData) {
    this.writes.push(() => this.firestore.update(ref.path, data));
  }
  delete(ref: FakeDocRef) {
    this.writes.push(() => this.firestore.delete(ref.path));
  }
  commit() {
    for (const write of this.writes) write();
  }
}

class FakeFirestore {
  private transactionTail: Promise<unknown> = Promise.resolve();
  constructor(private readonly docs: Record<string, FakeData | undefined>) {}
  collection(path: string) {
    return new FakeCollection(this, path);
  }
  get(path: string) {
    const value = this.docs[path];
    return value === undefined ? undefined : cloneFake(value);
  }
  set(path: string, data: FakeData, options?: {merge?: boolean}) {
    const current = options?.merge ? this.docs[path] : undefined;
    this.docs[path] = current === undefined ?
      cloneFake(data) :
      {...cloneFake(current), ...cloneFake(data)};
  }
  create(path: string, data: FakeData) {
    if (this.docs[path] !== undefined) {
      const error = new Error(`already exists: ${path}`) as Error & {
        code?: number;
      };
      error.code = 6;
      throw error;
    }
    this.docs[path] = cloneFake(data);
  }
  update(path: string, data: FakeData) {
    if (this.docs[path] === undefined) throw new Error(`missing: ${path}`);
    this.docs[path] = {...cloneFake(this.docs[path]!), ...cloneFake(data)};
  }
  delete(path: string) {
    delete this.docs[path];
  }
  query(path: string, filters: Filter[]) {
    return Object.entries(this.docs)
      .filter(([docPath, data]) =>
        data !== undefined && parentCollection(docPath) === path
      )
      .map(([docPath, data]) => ({
        path: docPath,
        data: cloneFake(data!),
      }))
      .filter((row) => filters.every((filter) =>
        matchesFilter(row.data, filter)
      ));
  }
  runTransaction<T>(callback: (tx: FakeTransaction) => Promise<T>): Promise<T> {
    const run = this.transactionTail.then(async () => {
      const tx = new FakeTransaction(this);
      const result = await callback(tx);
      tx.commit();
      return result;
    });
    this.transactionTail = run.catch(() => undefined);
    return run;
  }
}

function parentCollection(path: string): string {
  return path.split("/").slice(0, -1).join("/");
}

function matchesFilter(data: FakeData, filter: Filter): boolean {
  const value = data[filter.field];
  if (filter.op === "==") return value === filter.value;
  if (filter.op === "in") {
    return Array.isArray(filter.value) && filter.value.includes(value);
  }
  if (filter.op === "array-contains") {
    return Array.isArray(value) && value.includes(filter.value);
  }
  throw new Error(`unsupported fake query op: ${filter.op}`);
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

function payload(overrides: Record<string, unknown> = {}) {
  return {
    requestId: "request-1",
    eventId: "event-1",
    audience: "booked",
    body: "Doors open at 7:45. See you tonight.",
    ...overrides,
  };
}

function baseDocs(
  overrides: Record<string, FakeData | undefined> = {}
): Record<string, FakeData | undefined> {
  const now = Date.parse("2026-07-10T12:00:00.000Z");
  return {
    "events/event-1": {
      organizerId: "club-1",
      status: "active",
      endTime: new FakeTimestamp(now + 3 * 60 * 60 * 1000),
    },
    "organizers/club-1": {
      name: "Tuesday Trivia",
      hostUserId: "host-1",
      hostUserIds: ["host-1", "cohost-1"],
      hostProfiles: [],
    },
    "eventParticipations/event-1_user-1": {
      eventId: "event-1",
      uid: "user-1",
      status: "signedUp",
    },
    "eventParticipations/event-1_user-2": {
      eventId: "event-1",
      uid: "user-2",
      status: "attended",
    },
    "eventParticipations/event-1_user-3": {
      eventId: "event-1",
      uid: "user-3",
      status: "waitlisted",
      hostApprovalStatus: "pending",
    },
    ...guestInstallation("user-1", "token-1"),
    "users/user-1": {
      prefsRunStatusUpdates: true,
    },
    "users/user-2": {prefsRunStatusUpdates: true},
    ...guestInstallation("user-3", "token-3"),
    "users/user-3": {
      prefsRunStatusUpdates: true,
    },
    "organizerContacts/contact-1": {
      organizerId: "club-1",
      linkedUid: "user-1",
      identityState: "verified",
      deletedAt: null,
    },
    "organizerContacts/contact-2": {
      organizerId: "club-1",
      linkedUid: "user-2",
      identityState: "verified",
      deletedAt: null,
    },
    ...overrides,
  };
}

function harness(
  initialDocs = baseDocs(),
  options: {failTokens?: Set<string>} = {}
) {
  const firestore = new FakeFirestore(initialDocs);
  const activities: Array<{uid: string; id: string; body: string}> = [];
  const activityKeys = new Set<string>();
  const pushes: FcmParams[] = [];
  const rateLimitCalls: string[] = [];
  const now = new Date("2026-07-10T12:00:00.000Z");
  const deps: HandlerDeps = {
    firestore: () =>
      firestore as unknown as FirebaseFirestore.Firestore,
    now: () => now,
    invocationId: () => `invocation-${rateLimitCalls.length}`,
    timestampFromDate: (date) =>
      new FakeTimestamp(date.getTime()) as unknown as
        FirebaseFirestore.Timestamp,
    serverTimestamp: () =>
      new FakeTimestamp(now.getTime()) as unknown as
        FirebaseFirestore.FieldValue,
    checkRateLimit: async (_db, uid, action) => {
      rateLimitCalls.push(`${uid}:${action}`);
    },
    createActivityNotification: async (_db, params) => {
      const key = `${params.uid}:${params.id}`;
      if (activityKeys.has(key)) return "existing";
      activityKeys.add(key);
      activities.push({uid: params.uid, id: params.id, body: params.body});
      return "created";
    },
    sendNotification: async (params) => {
      if (options.failTokens?.has(params.token)) {
        const error = new Error("provider rejected") as Error & {code: string};
        error.code = "messaging/registration-token-not-registered";
        throw error;
      }
      pushes.push(params);
    },
  };
  return {firestore, activities, pushes, rateLimitCalls, deps};
}

function hasHttpsCode(error: unknown, code: string) {
  return error instanceof HttpsError && error.code === code;
}

test("sendEventBroadcast sends booked Activity and preference-gated push",
  async () => {
    const h = harness(baseDocs({
      "events/event-1": {
        ...baseDocs()["events/event-1"],
        publicationState: "private",
        setupRevision: 1,
      },
    }));
    const result = await sendEventBroadcastHandler(
      request("host-1", payload()),
      h.deps
    );

    assert.equal(result.status, "completed");
    assert.equal(result.recipientCount, 2);
    assert.equal(result.activityAvailableCount, 2);
    assert.equal(result.pushAttemptedCount, 1);
    assert.equal(result.pushAcceptedCount, 1);
    assert.equal(result.pushFailedCount, 0);
    assert.equal(result.idempotentReplay, false);
    assert.deepEqual(h.activities.map((item) => item.uid).sort(), [
      "user-1",
      "user-2",
    ]);
    assert.deepEqual(h.pushes.map((item) => item.token), ["token-1"]);
    assert.equal(h.activities[0].body, payload().body);
    const expectedId = eventBroadcastId({
      actorUid: "host-1",
      eventId: "event-1",
      requestId: "request-1",
    });
    assert.equal(result.broadcastId, expectedId);
    const receipt = h.firestore.get(`eventBroadcasts/${expectedId}`)!;
    assert.equal(receipt.status, "completed");
    assert.deepEqual(receipt.targetUids, ["user-1", "user-2"]);
    const deliveries = receipt.deliveries as Record<string, FakeData>;
    assert.equal(
      deliveries[eventBroadcastDeliveryKey("user-1")].pushStatus,
      "accepted"
    );
    const summary = h.firestore.get(
      `organizerBroadcastSummaries/${expectedId}`
    )!;
    assert.equal(summary.organizerId, "club-1");
    assert.equal(summary.eventId, "event-1");
    assert.equal(summary.audience, "booked");
    assert.equal(summary.recipientCount, 2);
    assert.equal(summary.partialFailure, false);
    assert.deepEqual(summary.recipientContactIds, ["contact-1", "contact-2"]);
    assert.deepEqual(summary.recipientDeliveryStates, {
      "contact-1": "available",
      "contact-2": "available",
    });
  });

test("prospective audience excludes blocks, deleted users, and missing users",
  async () => {
    const docs = baseDocs({
      "eventParticipations/event-1_user-4": {
        eventId: "event-1",
        uid: "user-4",
        status: "waitlisted",
      },
      "eventParticipations/event-1_user-5": {
        eventId: "event-1",
        uid: "user-5",
        status: "waitlisted",
      },
      "eventParticipations/event-1_user-6": {
        eventId: "event-1",
        uid: "user-6",
        status: "waitlisted",
      },
      "users/user-4": {},
      "users/user-5": {},
      ...guestInstallation("user-4", "token-4"),
      ...guestInstallation("user-5", "token-5"),
      "deletedUsers/user-4": {uid: "user-4"},
      [`blocks/${blockDocId("user-5", "cohost-1")}`]: {
        blockerUserId: "user-5",
        blockedUserId: "cohost-1",
      },
    });
    const h = harness(docs);
    const result = await sendEventBroadcastHandler(
      request("cohost-1", payload({audience: "prospective"})),
      h.deps
    );

    assert.equal(result.recipientCount, 1);
    assert.equal(result.excludedCount, 3);
    assert.deepEqual(h.activities.map((item) => item.uid), ["user-3"]);
  });

test("completed request replays without duplicate Activity or FCM",
  async () => {
    const h = harness();
    const first = await sendEventBroadcastHandler(
      request("host-1", payload()),
      h.deps
    );
    const second = await sendEventBroadcastHandler(
      request("host-1", payload()),
      h.deps
    );

    assert.equal(first.idempotentReplay, false);
    assert.equal(second.idempotentReplay, true);
    assert.equal(h.activities.length, 2);
    assert.equal(h.pushes.length, 1);
    assert.equal(h.rateLimitCalls.length, 1);
  });

test("same request id cannot be reused for different content", async () => {
  const h = harness();
  await sendEventBroadcastHandler(request("host-1", payload()), h.deps);
  await assert.rejects(
    sendEventBroadcastHandler(
      request("host-1", payload({body: "Different body"})),
      h.deps
    ),
    (error) => hasHttpsCode(error, "already-exists")
  );
});

test("concurrent duplicate is lease-rejected before a second fanout",
  async () => {
    const h = harness();
    let releaseActivity!: () => void;
    let activityStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      activityStarted = resolve;
    });
    const release = new Promise<void>((resolve) => {
      releaseActivity = resolve;
    });
    const originalCreate = h.deps.createActivityNotification;
    let firstActivity = true;
    h.deps.createActivityNotification = async (...args) => {
      if (firstActivity) {
        firstActivity = false;
        activityStarted();
        await release;
      }
      return originalCreate(...args);
    };

    const first = sendEventBroadcastHandler(
      request("host-1", payload()),
      h.deps
    );
    await started;
    await assert.rejects(
      sendEventBroadcastHandler(request("host-1", payload()), h.deps),
      (error) => hasHttpsCode(error, "aborted")
    );
    releaseActivity();
    await first;
    assert.equal(h.activities.length, 2);
  });

test("push rejection stays partial with sanitized evidence", async () => {
  const h = harness(baseDocs(), {failTokens: new Set(["token-1"])});
  const result = await sendEventBroadcastHandler(
    request("host-1", payload()),
    h.deps
  );

  assert.equal(result.status, "partial");
  assert.equal(result.activityAvailableCount, 2);
  assert.equal(result.pushFailedCount, 1);
  assert.equal(result.pushAcceptedCount, 0);
  const receipt = h.firestore.get(`eventBroadcasts/${result.broadcastId}`)!;
  assert.deepEqual(receipt.pushErrorCodes, [
    "messaging/registration-token-not-registered",
  ]);
  const replay = await sendEventBroadcastHandler(
    request("host-1", payload()),
    h.deps
  );
  assert.equal(replay.idempotentReplay, true);
  assert.equal(replay.status, "partial");
  assert.equal(h.rateLimitCalls.length, 1);
});

test("zero-recipient audience returns an explicit completed result",
  async () => {
    const h = harness(baseDocs({
      "eventParticipations/event-1_user-1": undefined,
      "eventParticipations/event-1_user-2": undefined,
    }));
    const result = await sendEventBroadcastHandler(
      request("host-1", payload()),
      h.deps
    );
    assert.equal(result.status, "completed");
    assert.equal(result.recipientCount, 0);
    assert.equal(result.activityAvailableCount, 0);
  });

test("authorization, moderation, and lifecycle failures write nothing",
  async () => {
    const unrelated = harness();
    await assert.rejects(
      sendEventBroadcastHandler(request("other", payload()), unrelated.deps),
      (error) => hasHttpsCode(error, "permission-denied")
    );
    assert.equal(unrelated.activities.length, 0);

    const flagged = harness();
    await assert.rejects(
      sendEventBroadcastHandler(
        request("host-1", payload({body: "This is a shit show"})),
        flagged.deps
      ),
      (error) => hasHttpsCode(error, "invalid-argument")
    );
    assert.equal(flagged.activities.length, 0);

    const past = harness(baseDocs({
      "events/event-1": {
        organizerId: "club-1",
        status: "active",
        endTime: new FakeTimestamp(
          Date.parse("2026-07-10T11:59:00.000Z")
        ),
      },
    }));
    await assert.rejects(
      sendEventBroadcastHandler(request("host-1", payload()), past.deps),
      (error) => hasHttpsCode(error, "failed-precondition")
    );
    assert.equal(past.activities.length, 0);

    const incomplete = harness(baseDocs({
      "events/event-1": {
        organizerId: "club-1",
        status: "active",
        publicationState: "private",
        setupRevision: 1,
      },
    }));
    await assert.rejects(
      sendEventBroadcastHandler(request("host-1", payload()),
        incomplete.deps),
      (error) => hasHttpsCode(error, "failed-precondition")
    );
    assert.equal(incomplete.activities.length, 0);
  });

test("raw audience cap rejects 501 before sender filtering or fanout",
  async () => {
    const docs = baseDocs({
      "eventParticipations/event-1_user-1": undefined,
      "eventParticipations/event-1_user-2": undefined,
      "eventParticipations/event-1_user-3": undefined,
    });
    for (let i = 0; i < 501; i += 1) {
      docs[`eventParticipations/event-1_cap-${i}`] = {
        eventId: "event-1",
        uid: i === 500 ? "host-1" : `cap-${i}`,
        status: "signedUp",
      };
    }
    const h = harness(docs);
    await assert.rejects(
      sendEventBroadcastHandler(request("host-1", payload()), h.deps),
      (error) => hasHttpsCode(error, "resource-exhausted")
    );
    assert.equal(h.activities.length, 0);
  });

test("raw audience cap accepts exactly 500 before deduplication", async () => {
  const docs = baseDocs({
    "eventParticipations/event-1_user-1": undefined,
    "eventParticipations/event-1_user-2": undefined,
    "eventParticipations/event-1_user-3": undefined,
  });
  for (let i = 0; i < 500; i += 1) {
    docs[`eventParticipations/event-1_cap-${i}`] = {
      eventId: "event-1",
      uid: "user-1",
      status: "signedUp",
    };
  }
  const h = harness(docs);
  const result = await sendEventBroadcastHandler(
    request("host-1", payload()),
    h.deps
  );
  assert.equal(result.recipientCount, 1);
  assert.equal(result.status, "completed");
  assert.equal(h.activities.length, 1);
});

test("rejects invalid event paths and partially deleted actors", async () => {
  const invalidPath = harness();
  await assert.rejects(
    sendEventBroadcastHandler(
      request("host-1", payload({eventId: "events/event-1"})),
      invalidPath.deps
    ),
    (error) => hasHttpsCode(error, "invalid-argument")
  );

  const deletedActor = harness(baseDocs({
    "users/host-1": {deleted: true},
  }));
  await assert.rejects(
    sendEventBroadcastHandler(
      request("host-1", payload()),
      deletedActor.deps
    ),
    (error) => hasHttpsCode(error, "failed-precondition")
  );
  assert.equal(deletedActor.activities.length, 0);
});

test("excludes a user deleted before recipient resolution", async () => {
  const h = harness(baseDocs({
    "users/user-1": {
      deleted: true,
      prefsRunStatusUpdates: true,
    },
  }));
  const result = await sendEventBroadcastHandler(
    request("host-1", payload()),
    h.deps
  );

  assert.equal(result.recipientCount, 1);
  assert.equal(result.excludedCount, 1);
  assert.deepEqual(h.activities.map((item) => item.uid), ["user-2"]);
});

test("excludes a recipient deleted during Activity creation", async () => {
  const h = harness();
  const originalCreate = h.deps.createActivityNotification;
  h.deps.createActivityNotification = async (db, params) =>
    params.uid === "user-1" ?
      "recipient-deleted" :
      originalCreate(db, params);

  const result = await sendEventBroadcastHandler(
    request("host-1", payload()),
    h.deps
  );

  assert.equal(result.status, "completed");
  assert.equal(result.recipientCount, 1);
  assert.equal(result.excludedCount, 1);
  assert.deepEqual(h.activities.map((item) => item.uid), ["user-2"]);
});

test("does not resurrect a receipt deleted before finalization", async () => {
  const h = harness();
  const broadcastId = eventBroadcastId({
    actorUid: "host-1",
    eventId: "event-1",
    requestId: "request-1",
  });
  const originalCreate = h.deps.createActivityNotification;
  let creationCount = 0;
  h.deps.createActivityNotification = async (db, params) => {
    const result = await originalCreate(db, params);
    creationCount += 1;
    if (creationCount === 2) {
      h.firestore.delete(`eventBroadcasts/${broadcastId}`);
    }
    return result;
  };

  await assert.rejects(
    sendEventBroadcastHandler(request("host-1", payload()), h.deps),
    (error) => hasHttpsCode(error, "failed-precondition")
  );
  assert.equal(h.firestore.get(`eventBroadcasts/${broadcastId}`), undefined);
});

test("stale invocation cannot finalize a newer lease", async () => {
  const h = harness();
  const broadcastId = eventBroadcastId({
    actorUid: "host-1",
    eventId: "event-1",
    requestId: "request-1",
  });
  const originalCreate = h.deps.createActivityNotification;
  let creationCount = 0;
  h.deps.createActivityNotification = async (db, params) => {
    const result = await originalCreate(db, params);
    creationCount += 1;
    if (creationCount === 2) {
      h.firestore.update(`eventBroadcasts/${broadcastId}`, {
        leaseOwner: "new-owner",
      });
    }
    return result;
  };

  await assert.rejects(
    sendEventBroadcastHandler(request("host-1", payload()), h.deps),
    (error) => hasHttpsCode(error, "aborted")
  );
  const receipt = h.firestore.get(`eventBroadcasts/${broadcastId}`)!;
  assert.equal(receipt.status, "processing");
  assert.equal(receipt.leaseOwner, "new-owner");
});

test(
  "failed Activity can be repaired without resending prior push",
  async () => {
    const h = harness();
    const originalCreate = h.deps.createActivityNotification;
    let failUserOne = true;
    h.deps.createActivityNotification = async (db, params) => {
      if (params.uid === "user-1" && failUserOne) {
        throw new Error("activity unavailable");
      }
      return originalCreate(db, params);
    };

    const first = await sendEventBroadcastHandler(
      request("host-1", payload()),
      h.deps
    );
    failUserOne = false;
    const repaired = await sendEventBroadcastHandler(
      request("host-1", payload()),
      h.deps
    );

    assert.equal(first.status, "partial");
    assert.equal(repaired.status, "completed");
    assert.equal(repaired.idempotentReplay, false);
    assert.equal(h.rateLimitCalls.length, 1);
    assert.deepEqual(h.activities.map((item) => item.uid).sort(), [
      "user-1",
      "user-2",
    ]);
    assert.deepEqual(h.pushes.map((push) => push.token), ["token-1"]);
  }
);

test("rate-limit rejection removes the newly claimed receipt", async () => {
  const h = harness();
  h.deps.checkRateLimit = async () => {
    throw new HttpsError("resource-exhausted", "Slow down.");
  };
  const broadcastId = eventBroadcastId({
    actorUid: "host-1",
    eventId: "event-1",
    requestId: "request-1",
  });

  await assert.rejects(
    sendEventBroadcastHandler(request("host-1", payload()), h.deps),
    (error) => hasHttpsCode(error, "resource-exhausted")
  );
  assert.equal(h.firestore.get(`eventBroadcasts/${broadcastId}`), undefined);
  assert.equal(h.activities.length, 0);
});
