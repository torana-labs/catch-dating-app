import assert from "node:assert/strict";
import test from "node:test";
import {guestInstallation} from "../shared/testing/pushInstallationFixture";
import {CallableRequest, HttpsError} from "firebase-functions/v2/https";
import {FcmParams} from "../shared/notifications";
import {
  buildOrganizerFollowerDelivery,
  dispatchOrganizerPostDelivery,
  organizerFollowerReceiptId,
  OrganizerPostDeliveryDeps,
  organizerPostId,
  organizerPostPayloadHash,
} from "./organizerPostDelivery";
import {createOrganizerPostHandler} from "./organizerPosts";
import {organizerCommunicationPreferenceId} from
  "../shared/organizerCommunicationPreferences";

type FakeData = Record<string, unknown>;
type Filter = {field: string; op: string; value: unknown};

class FakeTimestamp {
  constructor(readonly millis: number) {}
  toMillis() {
    return this.millis;
  }
}

class FakeIncrement {
  constructor(readonly value: number) {}
}

function cloneFake<T>(value: T): T {
  if (value instanceof FakeTimestamp) {
    return new FakeTimestamp(value.millis) as T;
  }
  if (value instanceof FakeIncrement) {
    return new FakeIncrement(value.value) as T;
  }
  if (Array.isArray(value)) return value.map(cloneFake) as T;
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) =>
      [key, cloneFake(item)])) as T;
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
    readonly limitCount?: number,
    readonly afterId?: string,
  ) {}
  where(field: string, op: string, value: unknown) {
    return new FakeQuery(
      this.firestore,
      this.path,
      [...this.filters, {field, op, value}],
      this.limitCount,
      this.afterId,
    );
  }
  orderBy(field: unknown) {
    void field;
    return this;
  }
  startAfter(id: string) {
    return new FakeQuery(
      this.firestore,
      this.path,
      this.filters,
      this.limitCount,
      id,
    );
  }
  limit(count: number) {
    return new FakeQuery(
      this.firestore,
      this.path,
      this.filters,
      count,
      this.afterId,
    );
  }
  async get() {
    let rows = this.firestore.query(this.path, this.filters)
      .sort((left, right) => left.path.localeCompare(right.path));
    if (this.afterId) {
      rows = rows.filter((row) => row.path.split("/").at(-1)! > this.afterId!);
    }
    if (this.limitCount !== undefined) rows = rows.slice(0, this.limitCount);
    return new FakeQuerySnapshot(rows.map(({path, data}) =>
      new FakeDocSnapshot(new FakeDocRef(this.firestore, path), data)));
  }
}

class FakeTransaction {
  private readonly writes: Array<() => void> = [];
  constructor(private readonly firestore: FakeFirestore) {}
  async get(ref: FakeDocRef | FakeQuery) {
    return ref.get();
  }
  create(ref: FakeDocRef, data: FakeData) {
    this.writes.push(() => this.firestore.create(ref.path, data));
  }
  update(ref: FakeDocRef, data: FakeData) {
    this.writes.push(() => this.firestore.update(ref.path, data));
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
  create(path: string, data: FakeData) {
    if (this.docs[path] !== undefined) throw new Error(`exists: ${path}`);
    this.docs[path] = cloneFake(data);
  }
  update(path: string, data: FakeData) {
    const current = this.docs[path];
    if (!current) throw new Error(`missing: ${path}`);
    const next = cloneFake(current);
    for (const [key, value] of Object.entries(data)) {
      // Dotted keys address nested fields, as Firestore updates do.
      const parts = key.split(".");
      let target = next;
      for (const part of parts.slice(0, -1)) {
        target = (target[part] ?? (target[part] = {})) as FakeData;
      }
      const leaf = parts.at(-1)!;
      target[leaf] = value instanceof FakeIncrement ?
        Number(target[leaf] ?? 0) + value.value : cloneFake(value);
    }
    this.docs[path] = next;
  }
  query(path: string, filters: Filter[]) {
    return Object.entries(this.docs)
      .filter(([docPath, data]) => data !== undefined &&
        docPath.split("/").slice(0, -1).join("/") === path)
      .map(([docPath, data]) => ({path: docPath, data: cloneFake(data!)}))
      .filter((row) => filters.every((filter) => {
        const value = row.data[filter.field];
        if (filter.op === "==") return value === filter.value;
        if (filter.op === "<=") {
          return value instanceof FakeTimestamp &&
            filter.value instanceof FakeTimestamp &&
            value.millis <= filter.value.millis;
        }
        if (filter.op === ">=") {
          return value instanceof FakeTimestamp &&
            filter.value instanceof FakeTimestamp &&
            value.millis >= filter.value.millis;
        }
        throw new Error(`unsupported filter ${filter.op}`);
      }));
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

function callableRequest(
  uid: string,
  data: Record<string, unknown>,
): CallableRequest<unknown> {
  return {
    auth: {uid, token: {}} as CallableRequest["auth"],
    data,
    rawRequest: {} as CallableRequest["rawRequest"],
  } as CallableRequest<unknown>;
}

const nowMillis = Date.parse("2026-08-18T12:00:00.000Z");

function operation(postId = "post-1"): FakeData {
  return {
    organizerId: "organizer-1",
    postId,
    authorUid: "host-1",
    requestId: "request-1",
    payloadHash: "a".repeat(64),
    status: "pending",
    remainingWeeklyQuota: 2,
    cursorFollowId: null,
    recipientCount: 0,
    excludedCount: 0,
    activityAvailableCount: 0,
    pushAttemptedCount: 0,
    pushAcceptedCount: 0,
    pushFailedCount: 0,
    pushUnknownCount: 0,
    errorCodes: [],
    attemptCount: 0,
    leaseOwner: null,
    leaseExpiresAt: null,
    createdAt: new FakeTimestamp(nowMillis),
    updatedAt: new FakeTimestamp(nowMillis),
    completedAt: null,
  };
}

function deliveryHarness(options: {
  activityResult?: "created" | "existing" | "recipient-deleted";
  blockedUids?: Set<string>;
  pageSize?: number;
} = {}) {
  const docs: Record<string, FakeData> = {
    "organizerPostDeliveryOperations/post-1": operation(),
    "organizers/organizer-1": {name: "Sunday Social"},
    "organizers/organizer-1/posts/post-1": {
      authorUid: "host-1",
      text: "Meet by the east gate.",
      eventId: null,
      audience: "followers",
      status: "active",
      createdAt: new FakeTimestamp(nowMillis),
    },
    "organizerFollows/organizer-1_host-1": {
      organizerId: "organizer-1",
      uid: "host-1",
      status: "active",
      pushNotificationsEnabled: true,
    },
    "organizerFollows/organizer-1_user-1": {
      organizerId: "organizer-1",
      uid: "user-1",
      status: "active",
      pushNotificationsEnabled: true,
    },
    "organizerFollows/organizer-1_user-2": {
      organizerId: "organizer-1",
      uid: "user-2",
      status: "active",
      pushNotificationsEnabled: true,
    },
    "users/user-1": {prefsOrganizerUpdates: true},
    "users/user-2": {prefsOrganizerUpdates: true},
    ...guestInstallation("user-1", "token-1"),
    ...guestInstallation("user-2", "token-2"),
  };
  const firestore = new FakeFirestore(docs);
  const activities: string[] = [];
  const pushes: FcmParams[] = [];
  let invocation = 0;
  const deps: OrganizerPostDeliveryDeps = {
    firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
    now: () => new FakeTimestamp(nowMillis) as unknown as
      FirebaseFirestore.Timestamp,
    invocationId: () => `invocation-${invocation++}`,
    documentIdField: () => "__name__" as unknown as
      FirebaseFirestore.FieldPath,
    timestampFromMillis: (millis) => new FakeTimestamp(millis) as unknown as
      FirebaseFirestore.Timestamp,
    serverTimestamp: () => new FakeTimestamp(nowMillis) as unknown as
      FirebaseFirestore.FieldValue,
    increment: (value) => new FakeIncrement(value) as unknown as
      FirebaseFirestore.FieldValue,
    createActivityNotification: async (_db, params) => {
      activities.push(params.uid);
      return options.activityResult ?? "created";
    },
    sendNotification: async (params) => {
      pushes.push(params);
    },
    hasBlockingRelationship: async (_db, _uid, peerIds) =>
      peerIds.some((uid) => options.blockedUids?.has(uid)),
    pageSize: options.pageSize ?? 100,
  };
  return {firestore, activities, pushes, deps};
}

const delivery = (overrides: Partial<Parameters<
  typeof buildOrganizerFollowerDelivery
>[0]> = {}) => buildOrganizerFollowerDelivery({
  uid: "follower-1",
  followPushNotificationsEnabled: true,
  user: {prefsOrganizerUpdates: true},
  pushToken: "token-1",
  organizerId: "organizer-1",
  authorUid: "host-1",
  organizerName: "Sunday Social",
  postId: "post-1",
  text: "Meet by the east gate.",
  eventId: "event-1",
  ...overrides,
});

test("follower updates build the durable Organizer Activity route", () => {
  const result = delivery({
    followPushNotificationsEnabled: false,
    user: {prefsOrganizerUpdates: false},
  });

  assert.deepEqual(result.activity, {
    id: "organizerUpdate_post-1",
    uid: "follower-1",
    type: "organizerUpdate",
    title: "New update from Sunday Social",
    body: "Meet by the east gate.",
    eventId: "event-1",
    organizerId: "organizer-1",
    postId: "post-1",
    actorUid: "host-1",
    actorName: "Sunday Social",
  });
  assert.equal(result.push, null);
});

test("follower push needs both follow-level and user-level permission", () => {
  assert.equal(delivery().push?.token, "token-1");
  assert.equal(delivery({followPushNotificationsEnabled: false}).push, null);
  assert.equal(
    delivery({user: {prefsOrganizerUpdates: false}}).push,
    null,
  );
  assert.equal(delivery({pushToken: null}).push, null);
});

test("post and receipt ids are deterministic and content-bound", () => {
  const identity = {
    organizerId: "organizer-1",
    authorUid: "host-1",
    requestId: "request-1",
  };
  assert.equal(organizerPostId(identity), organizerPostId(identity));
  assert.notEqual(
    organizerPostId(identity),
    organizerPostId({...identity, requestId: "request-2"}),
  );
  const payload = {...identity, text: "First version"};
  assert.notEqual(
    organizerPostPayloadHash(payload),
    organizerPostPayloadHash({...payload, text: "Changed version"}),
  );
  const receiptId = organizerFollowerReceiptId("post-1", "user-1");
  assert.equal(receiptId, organizerFollowerReceiptId("post-1", "user-1"));
  assert.equal(receiptId.includes("user-1"), false);
  assert.notEqual(
    receiptId,
    organizerFollowerReceiptId("post-2", "user-1"),
  );
});

test("delivery receipts make replay safe and exclude blocked recipients",
  async () => {
    const h = deliveryHarness({blockedUids: new Set(["user-2"])});
    const result = await dispatchOrganizerPostDelivery("post-1", h.deps);

    assert.equal(result?.deliveryStatus, "completed");
    assert.equal(result?.recipientCount, 3);
    assert.equal(result?.excludedCount, 2);
    assert.equal(result?.activityAvailableCount, 1);
    assert.equal(result?.pushAcceptedCount, 1);
    assert.deepEqual(h.activities, ["user-1"]);
    assert.deepEqual(h.pushes.map((push) => push.token), ["token-1"]);
    const receipt = h.firestore.get(
      `organizerPostDeliveryRecipients/${
        organizerFollowerReceiptId("post-1", "user-1")}`,
    )!;
    assert.equal("uid" in receipt, false);

    const replay = await dispatchOrganizerPostDelivery("post-1", h.deps);
    assert.equal(replay?.deliveryStatus, "completed");
    assert.equal(h.activities.length, 1);
    assert.equal(h.pushes.length, 1);
  });

test("linked private event suppresses every delayed follower receipt",
  async () => {
    const h = deliveryHarness();
    h.firestore.update("organizers/organizer-1/posts/post-1",
      {eventId: "event-1"});
    h.firestore.create("events/event-1", {
      organizerId: "organizer-1", publicationState: "private",
    });
    const result = await dispatchOrganizerPostDelivery("post-1", h.deps);
    assert.equal(result?.deliveryStatus, "partial");
    assert.equal(result?.recipientCount, 3);
    assert.equal(result?.excludedCount, 3);
    assert.equal(result?.activityAvailableCount, 0);
    assert.equal(result?.pushAttemptedCount, 0);
    assert.deepEqual(h.activities, []);
    assert.deepEqual(h.pushes, []);
    const receipt = h.firestore.get(`organizerPostDeliveryRecipients/${
      organizerFollowerReceiptId("post-1", "user-1")}`)!;
    assert.equal(receipt.errorCode, "linked-event-not-public");
    assert.deepEqual(h.firestore.get(
      "organizerPostDeliveryOperations/post-1")?.errorCodes,
    ["linked-event-not-public"]);
  });

test("a linked event becoming private between pages stays suppressed",
  async () => {
    const h = deliveryHarness({pageSize: 2});
    h.firestore.update("organizers/organizer-1/posts/post-1",
      {eventId: "event-1"});
    h.firestore.create("events/event-1", {
      organizerId: "organizer-1", publicationState: "published",
    });
    const first = await dispatchOrganizerPostDelivery("post-1", h.deps);
    assert.equal(first?.deliveryStatus, "pending");
    assert.deepEqual(h.activities, ["user-1"]);
    h.firestore.update("events/event-1", {publicationState: "private"});
    const second = await dispatchOrganizerPostDelivery("post-1", h.deps);
    assert.equal(second?.deliveryStatus, "partial");
    assert.equal(second?.recipientCount, 3);
    assert.equal(second?.excludedCount, 2);
    assert.deepEqual(h.activities, ["user-1"]);
    assert.deepEqual(h.pushes.map((push) => push.token), ["token-1"]);
    const replay = await dispatchOrganizerPostDelivery("post-1", h.deps);
    assert.equal(replay?.deliveryStatus, "partial");
    assert.equal(h.activities.length, 1);
  });

test("republishing after a suppressed page cannot resume delayed delivery",
  async () => {
    const h = deliveryHarness({pageSize: 1});
    h.firestore.update("organizers/organizer-1/posts/post-1",
      {eventId: "event-1"});
    h.firestore.create("events/event-1", {
      organizerId: "organizer-1", publicationState: "published",
    });
    await dispatchOrganizerPostDelivery("post-1", h.deps);
    h.firestore.update("events/event-1", {publicationState: "private"});
    await dispatchOrganizerPostDelivery("post-1", h.deps);
    h.firestore.update("events/event-1", {publicationState: "published"});
    const final = await dispatchOrganizerPostDelivery("post-1", h.deps);
    assert.equal(final?.deliveryStatus, "partial");
    assert.equal(final?.excludedCount, 3);
    assert.deepEqual(h.activities, []);
    assert.deepEqual(h.pushes, []);
  });

test("existing Activity records an unknown push outcome without resending",
  async () => {
    const h = deliveryHarness({
      activityResult: "existing",
      blockedUids: new Set(["user-2"]),
    });
    const result = await dispatchOrganizerPostDelivery("post-1", h.deps);

    assert.equal(result?.deliveryStatus, "partial");
    assert.equal(result?.activityAvailableCount, 1);
    assert.equal(result?.pushUnknownCount, 1);
    assert.equal(h.pushes.length, 0);
  });

test("follower pagination resumes from its cursor without duplicate counts",
  async () => {
    const h = deliveryHarness({pageSize: 1});
    const first = await dispatchOrganizerPostDelivery("post-1", h.deps);
    assert.equal(first?.deliveryStatus, "pending");
    assert.equal(first?.recipientCount, 1);

    const second = await dispatchOrganizerPostDelivery("post-1", h.deps);
    assert.equal(second?.deliveryStatus, "pending");
    assert.equal(second?.recipientCount, 2);

    const third = await dispatchOrganizerPostDelivery("post-1", h.deps);
    assert.equal(third?.deliveryStatus, "completed");
    assert.equal(third?.recipientCount, 3);
    assert.equal(h.activities.length, 2);
    assert.equal(h.pushes.length, 2);
  });

test("scheduled-sized dispatch drains multiple bounded pages", async () => {
  const h = deliveryHarness({pageSize: 1});
  const result = await dispatchOrganizerPostDelivery("post-1", h.deps, 3);

  assert.equal(result?.deliveryStatus, "completed");
  assert.equal(result?.recipientCount, 3);
  assert.equal(h.activities.length, 2);
  assert.equal(h.pushes.length, 2);
});

test("lost callable response replay returns one post and consumes quota once",
  async () => {
    const firestore = new FakeFirestore({
      "organizers/organizer-1": {
        name: "Sunday Social",
        hostUserId: "host-1",
        ownerUserId: "host-1",
        hostUserIds: ["host-1"],
        hostProfiles: [],
      },
    });
    const rateLimitCalls: string[] = [];
    type CreateDeps = NonNullable<
      Parameters<typeof createOrganizerPostHandler>[1]
    >;
    const deps: CreateDeps = {
      firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
      now: () => new Date(nowMillis),
      timestampFromMillis: (millis) => new FakeTimestamp(millis) as unknown as
        FirebaseFirestore.Timestamp,
      serverTimestamp: () => new FakeTimestamp(nowMillis) as unknown as
        FirebaseFirestore.FieldValue,
      checkRateLimit: async (_db, uid, action) => {
        rateLimitCalls.push(`${uid}:${action}`);
      },
      dispatchDelivery: async () => null,
    };
    const payload = {
      organizerId: "organizer-1",
      requestId: "request-1",
      text: "Meet by the east gate.",
    };
    const first = await createOrganizerPostHandler(
      callableRequest("host-1", payload),
      deps,
    );
    const replay = await createOrganizerPostHandler(
      callableRequest("host-1", payload),
      deps,
    );

    assert.equal(first.postId, replay.postId);
    assert.equal(first.idempotentReplay, false);
    assert.equal(replay.idempotentReplay, true);
    assert.equal(rateLimitCalls.length, 1);
    assert.equal(firestore.query(
      "organizers/organizer-1/posts",
      [],
    ).length, 1);

    await assert.rejects(
      createOrganizerPostHandler(
        callableRequest("host-1", {...payload, text: "Changed copy"}),
        deps,
      ),
      (error) => error instanceof HttpsError && error.code === "already-exists",
    );
    assert.equal(rateLimitCalls.length, 1);
  });

test("follower posts cannot link a private setup event", async () => {
  const firestore = new FakeFirestore({
    "organizers/organizer-1": {
      name: "Sunday Social", hostUserId: "host-1",
      ownerUserId: "host-1", hostUserIds: ["host-1"], hostProfiles: [],
    },
    "events/private-1": {organizerId: "organizer-1", status: "active",
      publicationState: "private", setupRevision: 1},
  });
  type CreateDeps = NonNullable<
    Parameters<typeof createOrganizerPostHandler>[1]
  >;
  const deps: CreateDeps = {
    firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
    now: () => new Date(nowMillis),
    timestampFromMillis: (millis) => new FakeTimestamp(millis) as unknown as
      FirebaseFirestore.Timestamp,
    serverTimestamp: () => new FakeTimestamp(nowMillis) as unknown as
      FirebaseFirestore.FieldValue,
    dispatchDelivery: async () => null,
  };
  await assert.rejects(createOrganizerPostHandler(callableRequest("host-1", {
    organizerId: "organizer-1", requestId: "request-private",
    text: "Join the event.", eventId: "private-1",
  }), deps), (error) => error instanceof HttpsError &&
    error.code === "failed-precondition");
  assert.equal(firestore.query("organizers/organizer-1/posts", []).length, 0);
  assert.equal(firestore.query("organizerPostDeliveryOperations", [])
    .length, 0);
});

test("follower updates reject moderated copy before writing or rate limiting",
  async () => {
    const firestore = new FakeFirestore({
      "organizers/organizer-1": {
        name: "Sunday Social",
        hostUserId: "host-1",
        ownerUserId: "host-1",
        hostUserIds: ["host-1"],
        hostProfiles: [],
      },
    });
    const rateLimitCalls: string[] = [];
    type CreateDeps = NonNullable<
      Parameters<typeof createOrganizerPostHandler>[1]
    >;
    const deps: CreateDeps = {
      firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
      now: () => new Date(nowMillis),
      timestampFromMillis: (millis) => new FakeTimestamp(millis) as unknown as
        FirebaseFirestore.Timestamp,
      serverTimestamp: () => new FakeTimestamp(nowMillis) as unknown as
        FirebaseFirestore.FieldValue,
      checkRateLimit: async (_db, uid, action) => {
        rateLimitCalls.push(`${uid}:${action}`);
      },
      dispatchDelivery: async () => null,
    };

    await assert.rejects(
      createOrganizerPostHandler(
        callableRequest("host-1", {
          organizerId: "organizer-1",
          requestId: "request-moderated",
          text: "kill yourself",
        }),
        deps,
      ),
      (error) => error instanceof HttpsError &&
        error.code === "invalid-argument" &&
        error.message.includes("cannot be delivered"),
    );
    assert.equal(rateLimitCalls.length, 0);
    assert.equal(firestore.query(
      "organizers/organizer-1/posts",
      [],
    ).length, 0);
  });

function followerWhatsappDocs(): Record<string, FakeData> {
  const unknown = {status: "unknown", evidenceStatus: "notApplicable",
    currentReceiptId: null, termsVersion: null, source: null,
    sourceEventId: null, updatedAt: null};
  return {
    "organizerSenderConnections/conn-1": {organizerId: "organizer-1",
      channel: "whatsapp", status: "active", phoneNumberId: "pn-1",
      secretVersionResource: "projects/p/secrets/s/versions/1"},
    "organizerMessageTemplates/tpl-1": {organizerId: "organizer-1",
      connectionId: "pn-1", name: "organizer_follower_update",
      status: "APPROVED", hasMediaHeader: false,
      variableNames: ["update_text"], parameterBindings: [{
        variableName: "update_text", component: "body", position: 0,
        buttonIndex: null}]},
    [`organizerCommunicationPreferences/${
      organizerCommunicationPreferenceId("organizer-1", "user-1")}`]: {
      organizerId: "organizer-1", uid: "user-1", whatsapp: unknown,
      sms: unknown, whatsappPurposes: {followerUpdates: {status: "optedIn",
        evidenceStatus: "complete", currentReceiptId: "ocpr_user1",
        endpointE164: "+919812345678", termsVersion: "follower-whatsapp-v1",
        source: "organizerFollowByPhone", sourceEventId: null,
        updatedAt: new FakeTimestamp(nowMillis - 1000)}},
      createdAt: new FakeTimestamp(nowMillis - 1000),
      updatedAt: new FakeTimestamp(nowMillis - 1000)},
  };
}

test("a WhatsApp follower update needs the approved follower template",
  async () => {
    const organizer = {name: "Sunday Social", hostUserId: "host-1",
      ownerUserId: "host-1", hostUserIds: ["host-1"], hostProfiles: []};
    const make = (docs: Record<string, FakeData>) => {
      const firestore = new FakeFirestore({"organizers/organizer-1": organizer,
        ...docs});
      return {firestore, deps: {
        firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
        now: () => new Date(nowMillis),
        timestampFromMillis: (millis: number) => new FakeTimestamp(millis) as
          unknown as FirebaseFirestore.Timestamp,
        serverTimestamp: () => new FakeTimestamp(nowMillis) as unknown as
          FirebaseFirestore.FieldValue,
        checkRateLimit: async () => undefined,
        dispatchDelivery: async () => null,
      }};
    };
    const payload = {organizerId: "organizer-1", requestId: "request-wa",
      text: "New Sunday run.", channels: ["app", "whatsapp"]};
    const missing = make({});
    await assert.rejects(createOrganizerPostHandler(
      callableRequest("host-1", payload), missing.deps),
    (error) => error instanceof HttpsError &&
      error.code === "failed-precondition");
    assert.equal(missing.firestore.query("organizers/organizer-1/posts", [])
      .length, 0);

    const ready = make(followerWhatsappDocs());
    const result = await createOrganizerPostHandler(
      callableRequest("host-1", payload), ready.deps);
    assert.deepEqual(result.channels, ["app", "whatsapp"]);
    assert.equal(result.whatsapp?.status, "collecting");
    assert.equal(result.remainingWeeklyQuota, 2);
    const campaign = ready.firestore.get(
      `organizerCampaigns/ofwa_${result.postId}`)!;
    assert.equal(campaign.status, "approved");
    assert.deepEqual(campaign.recipientSource, {kind: "organizerFollowers"});
    assert.deepEqual(campaign.templateVariables,
      {update_text: "New Sunday run."});
  });

test("follower pages freeze consented followers into the WhatsApp campaign",
  async () => {
    const h = deliveryHarness();
    for (const [path, value] of Object.entries(followerWhatsappDocs())) {
      h.firestore.create(path, value);
    }
    h.firestore.create("organizerCampaigns/ofwa_post-1", {
      organizerId: "organizer-1", status: "approved",
      recipientSource: {kind: "organizerFollowers"},
      templateVariables: {update_text: "Meet by the east gate."},
      audienceCounts: {total: 0, reachable: 0},
      deliveryCounts: {pending: 0}});
    h.firestore.update("organizerPostDeliveryOperations/post-1", {
      channels: ["app", "whatsapp"], whatsapp: {campaignId: "ofwa_post-1",
        status: "collecting", queuedCount: 0, skippedCount: 0, sentCount: 0,
        deliveredCount: 0, readCount: 0, failedCount: 0, suppressedCount: 0,
        syncedAt: null}});
    h.deps.whatsappPage = {
      verifiedPhones: async () => new Map([["user-1", "+919812345678"],
        ["user-2", "+919800000000"]]),
      hasBlockingRelationship: async () => false,
    };
    const result = await dispatchOrganizerPostDelivery("post-1", h.deps);
    assert.equal(result?.deliveryStatus, "completed");
    // user-2's verified phone is not the one they consented with; the
    // author is never a recipient.
    assert.deepEqual(result?.whatsapp, {status: "sending", queuedCount: 1,
      skippedCount: 2, sentCount: 0, deliveredCount: 0, failedCount: 0});
    const campaign = h.firestore.get("organizerCampaigns/ofwa_post-1")!;
    assert.equal(campaign.status, "scheduled");
    assert.equal((campaign.deliveryCounts as FakeData).pending, 1);
    const rows = h.firestore.query("organizerCampaignRecipients", []);
    assert.equal(rows.length, 1);
    assert.equal((rows[0].data.followerRecipient as FakeData).uid, "user-1");
    assert.equal(h.firestore.get(`organizerPostDeliveryRecipients/${
      organizerFollowerReceiptId("post-1", "user-2")}`)?.whatsappStatus,
    "skipped");
    // A replayed page neither re-freezes nor re-counts.
    const replay = await dispatchOrganizerPostDelivery("post-1", h.deps);
    assert.equal(replay?.whatsapp?.queuedCount, 1);
    assert.equal(h.firestore.query("organizerCampaignRecipients", []).length,
      1);
  });
