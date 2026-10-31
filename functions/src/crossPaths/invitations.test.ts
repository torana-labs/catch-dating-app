import {deriveEventSeatPolicy} from "../events/seatAuthority/firestoreAdapter";
import {releaseCrossPathsPairHold} from "./pairHolds";
import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError} from "firebase-functions/v2/https";
import {
  cancelCrossPathsInvitationOrPlanHandler,
  crossPathsEventPlanId,
  crossPathsInvitationId,
  respondCrossPathsInvitationHandler,
  sendCrossPathsInvitationHandler,
} from "./invitations";
import {crossPathsProfileFingerprint} from "./showcaseEligibility";

type FakeData = Record<string, unknown>;
type Filter = {field: string; op: string; value: unknown};

class FakeSnapshot {
  constructor(
    readonly id: string,
    readonly ref: FakeDocRef,
    private readonly value: FakeData | undefined
  ) {}
  get exists(): boolean {
    return this.value !== undefined;
  }
  data(): FakeData | undefined {
    return this.value === undefined ? undefined : {...this.value};
  }
}

class FakeDocRef {
  constructor(
    private readonly firestore: FakeFirestore,
    readonly path: string
  ) {}
  get id(): string {
    return this.path.split("/").at(-1)!;
  }
  collection(path: string) {
    return new FakeCollection(this.firestore, `${this.path}/${path}`);
  }
  async get() {
    return new FakeSnapshot(this.id, this, this.firestore.read(this.path));
  }
}

class FakeQuery {
  constructor(
    private readonly firestore: FakeFirestore,
    protected readonly path: string,
    private readonly filters: Filter[] = [],
    private readonly rowLimit = Number.MAX_SAFE_INTEGER
  ) {}
  where(field: string, op: string, value: unknown) {
    return new FakeQuery(this.firestore, this.path, [
      ...this.filters,
      {field, op, value},
    ], this.rowLimit);
  }
  limit(value: number) {
    return new FakeQuery(this.firestore, this.path, this.filters, value);
  }
  async get() {
    const docs = this.firestore.collectionRows(this.path)
      .filter(({value}) => this.filters.every((filter) =>
        matches(value[filter.field], filter.op, filter.value)
      ))
      .slice(0, this.rowLimit)
      .map(({id, value}) => new FakeSnapshot(
        id,
        new FakeDocRef(this.firestore, `${this.path}/${id}`),
        value
      ));
    return {docs, empty: docs.length === 0};
  }
}

class FakeCollection extends FakeQuery {
  constructor(
    private readonly firestoreRef: FakeFirestore,
    readonly path: string
  ) {
    super(firestoreRef, path);
  }
  doc(id: string) {
    return new FakeDocRef(this.firestoreRef, `${this.path}/${id}`);
  }
}

class FakeTransaction {
  private readonly writes: Array<() => void> = [];
  constructor(private readonly firestore: FakeFirestore) {}
  async get(ref: FakeDocRef | FakeQuery) {
    assert.equal(this.writes.length, 0, "transaction read after first write");
    return ref.get();
  }
  create(ref: FakeDocRef, value: FakeData) {
    this.writes.push(() => {
      if (this.firestore.read(ref.path) !== undefined) {
        throw new Error("already exists");
      }
      this.firestore.write(ref.path, value);
    });
  }
  set(ref: FakeDocRef, value: FakeData, options?: {merge?: boolean}) {
    this.writes.push(() => this.firestore.write(
      ref.path,
      options?.merge ? {...this.firestore.read(ref.path), ...value} : value
    ));
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

class FakeFirestore {
  constructor(private readonly docs: Record<string, FakeData | undefined>) {}
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

const nowMillis = Date.UTC(2026, 7, 5, 12);
const eventStartMillis = nowMillis + 24 * 60 * 60 * 1000;

function harness(overrides: Record<string, FakeData | undefined> = {}) {
  const senderProfile = profile("sender", "man");
  const recipientProfile = profile("recipient", "woman");
  const firestore = new FakeFirestore({
    "users/sender": user("man", ["woman"]),
    "users/recipient": user("woman", ["man"]),
    "publicProfiles/sender": senderProfile,
    "publicProfiles/recipient": recipientProfile,
    "crossPathsShowcaseEligibility/sender": showcase(senderProfile),
    "crossPathsShowcaseEligibility/recipient": showcase(recipientProfile),
    "events/event-1": event(),
    "eventParticipations/event-1_sender": participation("sender"),
    "eventParticipations/event-1_recipient": participation("recipient"),
    "eventCrossPathsConsents/event-1_sender": consent("sender"),
    "eventCrossPathsConsents/event-1_recipient": consent("recipient"),
    ...overrides,
  });
  const rateLimitCalls: string[] = [];
  return {
    firestore,
    rateLimitCalls,
    deps: {
      firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
      now: () => timestamp(nowMillis),
      loadCurrentAuthPhone: async () => "+919999999999",
      checkRateLimit: async (
        _db: FirebaseFirestore.Firestore,
        uid: string,
        action: string
      ) => {
        rateLimitCalls.push(`${uid}:${action}`);
      },
      verifyToken: () => ({
        version: 1 as const,
        rankingVersion: 1 as const,
        viewerUid: "sender",
        candidateUid: "recipient",
        eventId: "event-1",
        sessionIdHash: "session-hash",
        issuedAtMillis: nowMillis,
        expiresAtMillis: eventStartMillis,
      }),
    },
  };
}

test("invitation and event-plan ids are deterministic and pair-stable", () => {
  assert.equal(
    crossPathsInvitationId("event-1", "sender"),
    crossPathsInvitationId("event-1", "sender")
  );
  assert.equal(
    crossPathsEventPlanId("event-1", "sender", "recipient"),
    crossPathsEventPlanId("event-1", "recipient", "sender")
  );
});

test("sends one durable invitation for two eligible attendees", async () => {
  const h = harness({
    "events/event-1": {...event(), publicationState: "published"},
  });
  const response = await sendCrossPathsInvitationHandler(
    request("sender", sendPayload()),
    h.deps
  );

  assert.equal(response.status, "pending");
  assert.equal(response.invitationId, crossPathsInvitationId(
    "event-1",
    "sender"
  ));
  assert.deepEqual(h.rateLimitCalls, ["sender:sendCrossPathsInvitation"]);
  assert.equal(
    h.firestore.read(`crossPathsInvitations/${response.invitationId}`)?.status,
    "pending"
  );
  assert.equal(
    h.firestore.collectionRows(
      "notifications/recipient/items"
    ).length,
    1
  );

  await assert.rejects(
    sendCrossPathsInvitationHandler(request("sender", sendPayload()), h.deps),
    hasCode("failed-precondition")
  );
});

test("a signed suggestion cannot invite to an unpublished event", async () => {
  const h = harness({
    "events/event-1": {...event(), publicationState: "private"},
  });
  await assert.rejects(
    sendCrossPathsInvitationHandler(request("sender", sendPayload()), h.deps),
    hasCode("failed-precondition")
  );
  assert.equal(h.firestore.collectionRows("crossPathsInvitations").length, 0);
  assert.equal(h.firestore.collectionRows("notifications/recipient/items")
    .length, 0);
});

test("unscheduled event cannot create a Cross Paths invitation", async () => {
  const h = harness({"events/event-1": {...event(), endTime: undefined}});
  await assert.rejects(sendCrossPathsInvitationHandler(
    request("sender", sendPayload()), h.deps
  ), hasCode("failed-precondition"));
  assert.equal(h.firestore.collectionRows("crossPathsInvitations").length, 0);
});

test(
  "sending fails closed when the selected-event pilot gate is off",
  async () => {
    const h = harness({
      "events/event-1": {...event(), crossPathsDiscoveryEnabled: false},
    });
    await assert.rejects(
      sendCrossPathsInvitationHandler(
        request("sender", sendPayload()),
        h.deps
      ),
      hasCode("failed-precondition")
    );
  }
);

test(
  "fails closed for missing consent, booking, review, and blocks",
  async () => {
    const cases: Record<string, FakeData | undefined>[] = [
      {"eventCrossPathsConsents/event-1_sender": undefined},
      {"eventParticipations/event-1_recipient": undefined},
      {"crossPathsShowcaseEligibility/recipient": undefined},
      {"blocks/sender__recipient": {
        blockerUserId: "sender",
        blockedUserId: "recipient",
      }},
    ];
    for (const overrides of cases) {
      const h = harness(overrides);
      await assert.rejects(
        sendCrossPathsInvitationHandler(
          request("sender", sendPayload()),
          h.deps
        ),
        hasCode("failed-precondition")
      );
    }
  }
);

test("caps a recipient at three pending invitations", async () => {
  const pending = Object.fromEntries(["a", "b", "c"].map((uid) => [
    `crossPathsInvitations/pending-${uid}`,
    {
      eventId: "event-1",
      senderUid: uid,
      recipientUid: "recipient",
      participantIds: [uid, "recipient"],
      status: "pending",
      expiresAt: timestamp(eventStartMillis),
    },
  ]));
  const h = harness(pending);
  await assert.rejects(
    sendCrossPathsInvitationHandler(request("sender", sendPayload()), h.deps),
    hasCode("failed-precondition")
  );
});

test("recipient acceptance creates one scoped plan and invalidates rivals",
  async () => {
    const h = harness({
      "crossPathsInvitations/rival": {
        eventId: "event-1",
        senderUid: "other",
        recipientUid: "recipient",
        participantIds: ["other", "recipient"],
        status: "pending",
        expiresAt: timestamp(eventStartMillis),
      },
    });
    const sent = await sendCrossPathsInvitationHandler(
      request("sender", sendPayload()),
      h.deps
    );
    const accepted = await respondCrossPathsInvitationHandler(
      request("recipient", {
        invitationId: sent.invitationId,
        decision: "accept",
      }),
      h.deps
    );

    assert.equal(accepted.status, "accepted");
    assert.equal(accepted.conversationId, crossPathsEventPlanId(
      "event-1",
      "sender",
      "recipient"
    ));
    assert.equal(
      h.firestore.read(`matches/${accepted.conversationId}`)
        ?.conversationType,
      "crossPathsEventPlan"
    );
    assert.equal(
      h.firestore.read("crossPathsInvitations/rival")?.status,
      "invalidated"
    );
  });

test("pending invitation cannot be accepted after unpublication", async () => {
  const h = harness({
    "events/event-1": {...event(), publicationState: "published"},
  });
  const sent = await sendCrossPathsInvitationHandler(
    request("sender", sendPayload()), h.deps
  );
  h.firestore.write("events/event-1", {
    ...event(), publicationState: "private",
  });

  await assert.rejects(
    respondCrossPathsInvitationHandler(request("recipient", {
      invitationId: sent.invitationId,
      decision: "accept",
    }), h.deps),
    hasCode("failed-precondition")
  );
  assert.equal(h.firestore.read(`crossPathsInvitations/${sent.invitationId}`)
    ?.status, "pending");
  assert.equal(h.firestore.collectionRows("crossPathsPairHolds").length, 0);
  assert.equal(h.firestore.collectionRows("matches").length, 0);
  assert.equal(h.firestore.collectionRows("notifications/recipient/items")
    .length, 1);
  assert.equal(h.firestore.collectionRows("notifications/sender/items")
    .length, 0);
});

test("accepting an unbooked request reserves a companion spot without booking",
  async () => {
    const h = harness({
      "eventParticipations/event-1_sender": undefined,
      "eventCrossPathsConsents/event-1_sender": undefined,
    });
    const sent = await sendCrossPathsInvitationHandler(
      request("sender", sendPayload()),
      h.deps
    );
    const accepted = await respondCrossPathsInvitationHandler(
      request("recipient", {
        invitationId: sent.invitationId,
        decision: "accept",
      }),
      h.deps
    );

    assert.equal(accepted.status, "accepted");
    assert.equal(accepted.conversationId, null);
    assert.ok(accepted.pairHoldId);
    assert.equal(
      h.firestore.read(`crossPathsPairHolds/${accepted.pairHoldId}`)?.status,
      "active"
    );
    assert.equal(
      h.firestore.read(`crossPathsPairHolds/${accepted.pairHoldId}`)
        ?.requesterBookingStatus,
      "held"
    );
    assert.equal(
      h.firestore.read("eventParticipations/event-1_sender"),
      undefined
    );
  });

test("token identity binding is enforced", async () => {
  const h = harness();
  await assert.rejects(
    sendCrossPathsInvitationHandler(request("intruder", sendPayload()), h.deps),
    hasCode("failed-precondition")
  );
});

test("recipient can decline and sender can cancel a pending invitation",
  async () => {
    const declinedHarness = harness();
    const declinedInvitation = await sendCrossPathsInvitationHandler(
      request("sender", sendPayload()),
      declinedHarness.deps
    );
    const declined = await respondCrossPathsInvitationHandler(
      request("recipient", {
        invitationId: declinedInvitation.invitationId,
        decision: "decline",
      }),
      declinedHarness.deps
    );
    assert.equal(declined.status, "declined");

    const cancelledHarness = harness();
    const cancelledInvitation = await sendCrossPathsInvitationHandler(
      request("sender", sendPayload()),
      cancelledHarness.deps
    );
    const cancelled = await cancelCrossPathsInvitationOrPlanHandler(
      request("sender", {invitationId: cancelledInvitation.invitationId}),
      cancelledHarness.deps
    );
    assert.equal(cancelled.status, "cancelled");
  });

test("an expired invitation cannot create a plan", async () => {
  const h = harness();
  const sent = await sendCrossPathsInvitationHandler(
    request("sender", sendPayload()),
    h.deps
  );
  h.firestore.write(`crossPathsInvitations/${sent.invitationId}`, {
    ...h.firestore.read(`crossPathsInvitations/${sent.invitationId}`),
    expiresAt: timestamp(nowMillis),
  });
  await assert.rejects(
    respondCrossPathsInvitationHandler(
      request("recipient", {
        invitationId: sent.invitationId,
        decision: "accept",
      }),
      h.deps
    ),
    hasCode("failed-precondition")
  );
  assert.equal(
    h.firestore.read(`crossPathsInvitations/${sent.invitationId}`)?.status,
    "expired"
  );
});

function matches(actual: unknown, op: string, expected: unknown): boolean {
  if (op === "==") return actual === expected;
  if (op === "array-contains") {
    return Array.isArray(actual) && actual.includes(expected);
  }
  throw new Error(`Unsupported fake query operator: ${op}`);
}

function event(): FakeData {
  return {
    status: "active",
    crossPathsDiscoveryEnabled: true,
    discoveryMarketId: "in-mh-mumbai",
    organizerId: "organizer-1",
    capacityLimit: 20,
    priceInPaise: 0,
    bookedCount: 1,
    waitlistedCount: 0,
    cohortCounts: {womenInterestedInMen: 1},
    waitlistedCohortCounts: {},
    crossPathsPairHeldCount: 0,
    crossPathsPairConfirmedCount: 0,
    crossPathsPairHeldCohortCounts: {},
    currency: "INR",
    eventPolicy: {
      version: 1,
      admission: {
        format: "open",
        capacityLimit: 20,
        waitlistPolicy: {mode: "rankedOffer", offerWindowMinutes: 20},
        inviteRequired: false,
        membershipRequired: false,
        manualApprovalRequired: false,
        privateAccessPolicy: {
          mode: "none",
          inviteCodeHint: null,
          privateLinkEnabled: false,
        },
        cohortCapacityLimits: {},
        balancedRatioPolicy: null,
        crossPathsPairInventory: {
          enabled: true,
          reservedPairCapacity: 2,
          holdDurationMinutes: 15,
        },
      },
      pricing: {
        basePriceInPaise: 0,
        cohortAdjustmentsInPaise: {},
        demandPricingRules: [],
      },
      cancellation: {policyId: "standard"},
      settlement: {hostPayoutTiming: "afterEventCompletion"},
    },
    startTime: timestamp(eventStartMillis),
    endTime: timestamp(eventStartMillis + 2 * 60 * 60 * 1000),
    eventFormat: {
      version: 1,
      activityKind: "socialRun",
      interactionModel: "pacePods",
    },
  };
}

function user(gender: string, interestedInGenders: string[]): FakeData {
  return {
    name: gender === "man" ? "Sam" : "Rhea",
    profileComplete: true,
    prefsShowInCrossPaths: true,
    deleted: false,
    gender,
    interestedInGenders,
    dateOfBirth: timestamp(Date.UTC(1996, 0, 1)),
    minAgePreference: 21,
    maxAgePreference: 40,
  };
}

function profile(uid: string, gender: string): FakeData {
  return {
    name: uid,
    age: 30,
    gender,
    relationshipGoal: "relationship",
    profilePhotos: [0, 1, 2].map((position) => ({
      id: `${uid}-${position}`,
      url: `https://example.com/${uid}-${position}.jpg`,
      thumbnailUrl: `https://example.com/${uid}-${position}-thumb.jpg`,
      storagePath: `profiles/${uid}/${position}.jpg`,
      thumbnailStoragePath: `profiles/${uid}/${position}-thumb.jpg`,
      position,
      moderation: {status: "approved"},
    })),
    profilePrompts: [0, 1, 2].map((index) => ({
      promptId: `prompt-${index}`,
      prompt: `Prompt ${index}`,
      answer: `Answer ${index}`,
    })),
  };
}

function showcase(publicProfile: FakeData): FakeData {
  return {
    status: "eligible",
    reasonCodes: [],
    ruleVersion: 1,
    reviewVersion: 1,
    profileFingerprint: crossPathsProfileFingerprint(publicProfile),
  };
}

function participation(uid: string): FakeData {
  return {eventId: "event-1", uid, status: "signedUp"};
}

function consent(uid: string): FakeData {
  return {eventId: "event-1", uid, enabled: true, termsVersion: 1};
}

function sendPayload(): Record<string, unknown> {
  return {
    eventId: "event-1",
    recipientUid: "recipient",
    suggestionToken: "valid-suggestion-token-value-with-forty-characters",
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

function timestamp(millis: number): FirebaseFirestore.Timestamp {
  return admin.firestore.Timestamp.fromMillis(millis);
}


function readyPairHarness() {
  const source = event();
  const policy = deriveEventSeatPolicy(source);
  return harness({
    "eventParticipations/event-1_sender": undefined,
    "eventCrossPathsConsents/event-1_sender": undefined,
    "eventSeatMigrationFences/event-1": {eventId: "event-1",
      migrationRevision: 1, state: "ready"},
    "eventSeatLedgers/event-1": {eventId: "event-1", capacity: policy.capacity,
      occupied: policy.capacity - 1, revision: 1, capacityRevision: 1,
      migrationRevision: 1, state: "ready", policyHash: policy.policyHash,
      policyVersion: policy.policyVersion},
  });
}

async function acceptPair(h: ReturnType<typeof harness>) {
  const sent = await sendCrossPathsInvitationHandler(
    request("sender", sendPayload()), h.deps);
  return respondCrossPathsInvitationHandler(request("recipient", {
    invitationId: sent.invitationId, decision: "accept"}), h.deps);
}

test("ready pair acceptance and repeated cancellation update one held seat",
  async () => {
    const h = readyPairHarness();
    const accepted = await acceptPair(h);
    const ledger = () => h.firestore.read("eventSeatLedgers/event-1")!;
    assert.equal(ledger().occupied, 19);
    assert.equal(ledger().temporaryHeld, 1);
    const reservations = h.firestore.collectionRows("eventSeatReservations");
    assert.equal(reservations.length, 1);
    assert.equal(reservations[0].value.active, false);
    assert.equal((reservations[0].value.temporaryHold as FakeData).ownerId,
      accepted.pairHoldId);
    const repeated = await respondCrossPathsInvitationHandler(
      request("recipient", {invitationId: accepted.invitationId,
        decision: "accept"}), h.deps);
    assert.deepEqual(repeated, accepted);
    assert.equal(ledger().revision, 2);
    for (let i = 0; i < 2; i++) {
      await cancelCrossPathsInvitationOrPlanHandler(request("sender", {
        invitationId: accepted.invitationId}), h.deps);
    }
    assert.equal(ledger().temporaryHeld, 0);
    assert.equal(ledger().occupied, 19);
    assert.equal(ledger().revision, 3);
  });

test("pair acceptance respects checkout inventory and locked migration",
  async () => {
    for (const locked of [false, true]) {
      const h = readyPairHarness();
      if (locked) {
        h.firestore.write("eventSeatMigrationFences/event-1",
          {eventId: "event-1", migrationRevision: 1, state: "locked"});
      } else {
        h.firestore.write("eventSeatLedgers/event-1", {
          ...h.firestore.read("eventSeatLedgers/event-1"), checkoutHeld: 1});
      }
      await assert.rejects(acceptPair(h), locked ? /locked/u : /full/u);
      assert.equal(h.firestore.collectionRows("crossPathsPairHolds").length, 0);
      assert.equal(h.firestore.collectionRows("eventSeatReservations").length,
        0);
    }
  });

test("pair expiry releases inventory and cannot undo confirmed bookings",
  async () => {
    for (const confirmed of [false, true]) {
      const h = readyPairHarness();
      const accepted = await acceptPair(h);
      const holdId = accepted.pairHoldId!;
      const path = `crossPathsPairHolds/${holdId}`;
      if (confirmed) {
        h.firestore.write(path, {...h.firestore.read(path),
          status: "confirmed", requesterBookingStatus: "confirmed"});
      }
      const before = h.firestore.read("eventSeatLedgers/event-1");
      await releaseCrossPathsPairHold({db: h.deps.firestore(), holdId,
        reason: "expired", now: timestamp(nowMillis + 16 * 60 * 1000)});
      if (confirmed) {
        assert.deepEqual(h.firestore.read("eventSeatLedgers/event-1"),
          before);
        assert.equal(h.firestore.read(path)?.status, "confirmed");
      } else {
        const ledger = h.firestore.read("eventSeatLedgers/event-1");
        assert.equal(ledger?.temporaryHeld, 0);
        assert.equal(h.firestore.read(
          `crossPathsInvitations/${accepted.invitationId}`)?.status,
        "invalidated");
        assert.equal(h.firestore.read(path)?.status, "expired");
      }
    }
  });

test("account deletion prevents a new pair hold while cleanup is running",
  async () => {
    for (const uid of ["sender", "recipient"]) {
      const h = readyPairHarness();
      h.firestore.write(`deletedUsers/${uid}`, {uid, status: "processing"});
      await assert.rejects(acceptPair(h), hasCode("failed-precondition"));
      assert.equal(h.firestore.collectionRows("crossPathsPairHolds").length, 0);
      assert.equal(h.firestore.read("eventSeatLedgers/event-1")?.revision, 1);
    }
  });
