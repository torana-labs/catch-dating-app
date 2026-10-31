import {communityMembershipRows} from
  "../memberships/communityMembershipFixture";
import {releaseCrossPathsPairHold} from "../crossPaths/pairHolds";
import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import {createHash} from "crypto";
import {signUpUserForEvent} from "./signUpUserForEvent";
import {catchNativeEventOrigin} from "../shared/testUtils";
import {deriveEventSeatPolicy} from "./seatAuthority/firestoreAdapter";
import {seatIdentityAliasId, seatIdentityValueHash,
  seatVerifiedPhoneProofId} from "./seatIdentityAuthority";

type FakeData = Record<string, unknown>;

class FakeDocRef {
  constructor(readonly firestore: FakeFirestore, readonly path: string) {}

  get id(): string {
    return this.path.split("/").at(-1)!;
  }

  collection(collectionPath: string) {
    return {
      doc: (docId: string) => new FakeDocRef(
        this.firestore,
        `${this.path}/${collectionPath}/${docId}`
      ),
    };
  }
}

class FakeQuery {
  private readonly filters: Array<[string, string, unknown]> = [];
  private limitCount: number | null = null;

  constructor(
    private readonly firestore: FakeFirestore,
    private readonly collectionPath: string
  ) {}

  where(field: string, op: string, value: unknown): FakeQuery {
    this.filters.push([field, op, value]);
    return this;
  }

  limit(count: number): FakeQuery {
    this.limitCount = count;
    return this;
  }

  async get() {
    return {
      docs: this.firestore
        .collectionDocs(this.collectionPath)
        .filter((doc) => this.matches(doc.data))
        .slice(0, this.limitCount ?? undefined)
        .map((doc) => ({
          id: doc.path.split("/").at(-1)!,
          ref: new FakeDocRef(this.firestore, doc.path),
          data: () => ({...doc.data}),
        })),
    };
  }

  private matches(data: FakeData): boolean {
    return this.filters.every(([field, op, value]) => {
      if (op === "==") return data[field] === value;
      if (op === "in" && Array.isArray(value)) {
        return value.includes(data[field]);
      }
      throw new Error(`Unsupported query op ${op}`);
    });
  }
}

class FakeSnapshot {
  constructor(
    readonly id: string,
    private readonly value: FakeData | undefined
  ) {}

  get exists(): boolean {
    return this.value !== undefined;
  }

  data(): FakeData | undefined {
    return this.value === undefined ? undefined : {...this.value};
  }
}

class FakeFirestore {
  constructor(private readonly docs: Record<string, FakeData | undefined>) {}

  collection(collectionPath: string) {
    return {
      doc: (docId: string) => new FakeDocRef(
        this,
        `${collectionPath}/${docId}`
      ),
      where: (field: string, op: string, value: unknown) =>
        new FakeQuery(this, collectionPath).where(field, op, value),
    };
  }

  async runTransaction<T>(
    callback: (tx: FakeTransaction) => Promise<T>
  ): Promise<T> {
    const tx = new FakeTransaction(this);
    const result = await callback(tx);
    tx.commit();
    return result;
  }

  get(path: string): FakeData | undefined {
    const data = this.docs[path];
    return data === undefined ? undefined : {...data};
  }

  set(path: string, data: FakeData) {
    this.docs[path] = data;
  }

  collectionDocs(
    collectionPath: string
  ): Array<{path: string; data: FakeData}> {
    return Object.entries(this.docs)
      .filter(([path, data]) =>
        data !== undefined &&
        path.startsWith(`${collectionPath}/`) &&
        !path.slice(collectionPath.length + 1).includes("/"))
      .map(([path, data]) => ({path, data: data as FakeData}));
  }
}

class FakeTransaction {
  private readonly writes: Array<() => void> = [];

  constructor(private readonly firestore: FakeFirestore) {}

  async get(ref: FakeDocRef | FakeQuery): Promise<FakeSnapshot | {
    docs: Array<{id: string; ref: FakeDocRef; data: () => FakeData}>;
  }> {
    if (this.writes.length > 0) {
      throw new Error("Firestore transaction read after first write.");
    }
    if (ref instanceof FakeQuery) return ref.get();
    return new FakeSnapshot(ref.id, this.firestore.get(ref.path));
  }

  update(ref: FakeDocRef, patch: FakeData) {
    this.writes.push(() => {
      const current = this.firestore.get(ref.path);
      if (current === undefined) {
        throw new Error(`Missing doc for update: ${ref.path}`);
      }
      this.firestore.set(ref.path, {...current, ...patch});
    });
  }

  create(ref: FakeDocRef, data: FakeData) {
    this.writes.push(() => {
      if (this.firestore.get(ref.path) !== undefined) {
        throw new Error(`Doc already exists: ${ref.path}`);
      }
      this.firestore.set(ref.path, data);
    });
  }

  set(ref: FakeDocRef, data: FakeData, options?: {merge: boolean}) {
    this.writes.push(() => {
      const current = this.firestore.get(ref.path) ?? {};
      this.firestore.set(ref.path, options?.merge ?
        {...current, ...data} : {...data});
    });
  }

  commit() {
    for (const write of this.writes) write();
  }
}

function firestore(initialDocs: Record<string, FakeData | undefined>) {
  return new FakeFirestore(initialDocs) as unknown as
    FirebaseFirestore.Firestore;
}

function readySeatDocs(sourceEvent: FakeData, uid: string,
  occupied = 0): Record<string, FakeData> {
  const eventId = "event-1";
  const key = `uid_${uid}`;
  const policy = deriveEventSeatPolicy(sourceEvent);
  const rows: Record<string, FakeData> = {
    [`eventSeatMigrationFences/${eventId}`]: {eventId,
      migrationRevision: 1, state: "ready"},
    [`eventSeatLedgers/${eventId}`]: {eventId,
      capacity: policy.capacity, occupied, revision: 1,
      capacityRevision: 1, policyVersion: policy.policyVersion,
      policyHash: policy.policyHash, migrationRevision: 1, state: "ready"},
    [`eventSeatVerifiedPhones/${seatVerifiedPhoneProofId(eventId, uid)}`]: {
      eventId, organizerId: "club-1", uid, phoneE164: null,
      migrationRevision: 1, state: "current",
    },
    [`eventSeatIdentityAliases/${seatIdentityAliasId(eventId, "uid", uid)}`]: {
      eventId, organizerId: "club-1", kind: "uid",
      valueHash: seatIdentityValueHash("uid", uid), canonicalKey: key,
      identityRevision: 1, migrationRevision: 1, state: "ready",
    },
  };
  return rows;
}

function reservationPath(key: string): string {
  return "eventSeatReservations/" + createHash("sha256")
    .update(`event-1\u001f${key}`).digest("hex");
}

function event(overrides: FakeData = {}): FakeData {
  return {
    organizerId: "club-1",
    eventOrigin: catchNativeEventOrigin(),
    startTime: admin.firestore.Timestamp.fromMillis(
      Date.parse("2026-05-02T01:30:00.000Z")
    ),
    endTime: admin.firestore.Timestamp.fromMillis(
      Date.parse("2026-05-02T02:30:00.000Z")
    ),
    eventFormat: {
      version: 1,
      activityKind: "socialRun",
      interactionModel: "pacePods",
    },
    meetingPoint: "Carter Road",
    meetingLocation: {
      name: "Carter Road",
      latitude: 19.0608,
      longitude: 72.8365,
    },
    startingPointLat: 19.0608,
    startingPointLng: 72.8365,
    locationDetails: null,
    distanceKm: 5,
    pace: "easy",
    capacityLimit: 20,
    description: "Easy seaside event.",
    priceInPaise: 0,
    status: "active",
    cancelledAt: null,
    cancellationReason: null,
    discoveryCityName: "mumbai",
    discoveryMarketId: "in-mh-mumbai",
    bookedCount: 0,
    checkedInCount: 0,
    waitlistedCount: 0,
    constraints: {minAge: 0, maxAge: 99, maxMen: null, maxWomen: null},
    genderCounts: {},
    ...overrides,
  };
}

function user(overrides: FakeData = {}): FakeData {
  return {
    name: "Runner One",
    firstName: "Runner",
    displayName: "Runner",
    dateOfBirth: admin.firestore.Timestamp.fromMillis(
      Date.parse("1996-01-01T00:00:00.000Z")
    ),
    gender: "man",
    phoneNumber: "+919900000001",
    countryCode: "+91",
    profileComplete: false,
    interestedInGenders: ["woman"],
    activityPreferences: runningPreferences({version: 1}),
    ...overrides,
  };
}

function runningPreferences(overrides: FakeData = {}): FakeData {
  return {
    running: {
      paceMinSecsPerKm: 300,
      paceMaxSecsPerKm: 420,
      preferredDistances: [],
      runningReasons: [],
      preferredRunTimes: [],
      ...overrides,
    },
  };
}

function pairInventoryPolicy(capacityLimit = 20): FakeData {
  return {
    version: 1,
    admission: {
      format: "open",
      capacityLimit,
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
  };
}

test("signUpUserForEvent writes a signup activity notification", async () => {
  const db = firestore({
    "events/event-1": event(),
    "users/runner-1": user(),
  });

  await signUpUserForEvent(db, "event-1", "runner-1");

  const fake = db as unknown as FakeFirestore;
  const notification = fake.get(
    "notifications/runner-1/items/eventSignup_event-1"
  );
  const participation = fake.get("eventParticipations/event-1_runner-1");

  assert.equal(notification?.uid, "runner-1");
  assert.equal(notification?.type, "eventSignup");
  assert.equal(notification?.title, "You're booked");
  assert.equal(
    notification?.body,
    "Your 5 km event from Carter Road is confirmed."
  );
  assert.equal(notification?.eventId, "event-1");
  assert.equal(notification?.organizerId, "club-1");
  assert.equal(notification?.readAt, null);
  assert.equal(participation?.status, "signedUp");
  assert.equal(
    fake.get(`userEventScheduleLocks/runner-1_${scheduleSlot(
      "2026-05-02T01:30:00.000Z"
    )}`)?.eventId,
    "event-1"
  );
});

test("ready seat ledger admits the last Catch seat once", async () => {
  const sourceEvent = event({capacityLimit: 1, bookedCount: 0});
  const db = firestore({"events/event-1": sourceEvent,
    "users/runner-1": user(),
    ...readySeatDocs(sourceEvent, "runner-1")});
  await signUpUserForEvent(db, "event-1", "runner-1", undefined,
    {loadCurrentAuthPhone: async () => null});
  await signUpUserForEvent(db, "event-1", "runner-1", undefined,
    {loadCurrentAuthPhone: async () => null});
  const fake = db as unknown as FakeFirestore;
  assert.equal(fake.get("eventSeatLedgers/event-1")?.occupied, 1);
  assert.equal(fake.get(reservationPath("uid_runner-1"))?.active, true);
  assert.equal(fake.get("eventParticipations/event-1_runner-1")?.status,
    "signedUp");
});

test("new verified Catch UID enrolls aliases and reserves atomically",
  async () => {
    const sourceEvent = event({capacityLimit: 1, bookedCount: 0});
    const rows = readySeatDocs(sourceEvent, "runner-1");
    delete rows[`eventSeatVerifiedPhones/${seatVerifiedPhoneProofId(
      "event-1", "runner-1")}`];
    delete rows[`eventSeatIdentityAliases/${seatIdentityAliasId(
      "event-1", "uid", "runner-1")}`];
    const db = firestore({"events/event-1": sourceEvent,
      "users/runner-1": user(), ...rows});
    await signUpUserForEvent(db, "event-1", "runner-1", undefined,
      {loadCurrentAuthPhone: async () => "+919999999999"});
    const fake = db as unknown as FakeFirestore;
    assert.equal(fake.get("eventSeatLedgers/event-1")?.occupied, 1);
    assert.equal(fake.get(`eventSeatIdentityAliases/${seatIdentityAliasId(
      "event-1", "phone", "+919999999999")}`)?.state, "ready");
    assert.equal(fake.get(`eventSeatVerifiedPhones/${seatVerifiedPhoneProofId(
      "event-1", "runner-1")}`)?.phoneE164, "+919999999999");
  });

test("new Catch UID cannot take a second seat from an imported phone alias",
  async () => {
    const sourceEvent = event({capacityLimit: 2, bookedCount: 1});
    const rows = readySeatDocs(sourceEvent, "runner-1", 1);
    delete rows[`eventSeatVerifiedPhones/${seatVerifiedPhoneProofId(
      "event-1", "runner-1")}`];
    delete rows[`eventSeatIdentityAliases/${seatIdentityAliasId(
      "event-1", "uid", "runner-1")}`];
    rows[`eventSeatIdentityAliases/${seatIdentityAliasId(
      "event-1", "phone", "+919999999999")}`] = {eventId: "event-1",
      organizerId: "club-1", kind: "phone",
      valueHash: seatIdentityValueHash("phone", "+919999999999"),
      canonicalKey: "guest_existing", identityRevision: 1,
      migrationRevision: 1, state: "ready"};
    const db = firestore({"events/event-1": sourceEvent,
      "users/runner-1": user(), ...rows});
    await assert.rejects(() => signUpUserForEvent(db, "event-1",
      "runner-1", undefined,
      {loadCurrentAuthPhone: async () => "+919999999999"}));
    const fake = db as unknown as FakeFirestore;
    assert.equal(fake.get("eventParticipations/event-1_runner-1"),
      undefined);
    assert.equal(fake.get("eventSeatLedgers/event-1")?.occupied, 1);
  });

test("verified imported guest becomes a Catch signup without a second seat",
  async () => {
    const sourceEvent = event({capacityLimit: 1, bookedCount: 0});
    const rows = readySeatDocs(sourceEvent, "runner-1", 1);
    delete rows[`eventSeatVerifiedPhones/${seatVerifiedPhoneProofId(
      "event-1", "runner-1")}`];
    delete rows[`eventSeatIdentityAliases/${seatIdentityAliasId(
      "event-1", "uid", "runner-1")}`];
    const phone = "+919999999999";
    const key = "guest_existing";
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
      phoneE164: phone, linkedUid: null, externalReference: null};
    rows[reservationPath(key)] = {eventId: "event-1", canonicalKey: key,
      identityRevision: 1, active: true, revision: 1,
      reservedAtMillis: 1, releasedAtMillis: null};
    const db = firestore({"events/event-1": sourceEvent,
      "users/runner-1": user(), ...rows});
    await signUpUserForEvent(db, "event-1", "runner-1", undefined,
      {loadCurrentAuthPhone: async () => phone});
    const fake = db as unknown as FakeFirestore;
    assert.equal(fake.get("eventSeatLedgers/event-1")?.occupied, 1);
    assert.equal(fake.get("events/event-1")?.bookedCount, 1);
    assert.equal(fake.get("eventAttendees/guest-1")?.linkedUid, "runner-1");
    assert.equal(fake.get("eventParticipations/event-1_runner-1")?.status,
      "signedUp");
  });

test("locked seat migration denies Catch signup without source writes",
  async () => {
    const sourceEvent = event();
    const rows = readySeatDocs(sourceEvent, "runner-1");
    rows["eventSeatMigrationFences/event-1"].state = "locked";
    const db = firestore({"events/event-1": sourceEvent,
      "users/runner-1": user(), ...rows});
    await assert.rejects(() =>
      signUpUserForEvent(db, "event-1", "runner-1"));
    const fake = db as unknown as FakeFirestore;
    assert.equal(fake.get("eventParticipations/event-1_runner-1"),
      undefined);
    assert.equal(fake.get("events/event-1")?.bookedCount, 0);
  });

test("signUpUserForEvent updates event discovery availability", async () => {
  const db = firestore({
    "events/event-1": event({
      capacityLimit: 1,
      discoveryCityName: "mumbai",
      discoveryMarketId: "in-mh-mumbai",
      discoveryAvailability: "open",
      discoveryHasOpenSpots: true,
    }),
    "users/runner-1": user(),
  });

  await signUpUserForEvent(db, "event-1", "runner-1");

  const fake = db as unknown as FakeFirestore;
  const updatedEvent = fake.get("events/event-1");
  assert.equal(updatedEvent?.discoveryCityName, "mumbai");
  assert.equal(updatedEvent?.discoveryMarketId, "in-mh-mumbai");
  assert.equal(updatedEvent?.discoveryHasOpenSpots, false);
  assert.equal(updatedEvent?.discoveryAvailability, "waitlist");
  assert.deepEqual(updatedEvent?.discoveryOpenCohorts, []);
  assert.deepEqual(updatedEvent?.discoveryWaitlistCohorts, [
    "menInterestedInWomen",
    "womenInterestedInMen",
    "queerOrOpen",
    "nonBinaryOrOther",
  ]);
});

for (const mode of ["legacy", "ready-free", "ready-paid",
  "ready-wrong-owner", "ready-expired", "ready-locked"] as const) {
  test(`signup converts a ${mode} pair hold into one booking and plan`,
    async () => {
      const start = Date.parse("2027-05-02T01:30:00.000Z");
      const sourceEvent = event({
        startTime: admin.firestore.Timestamp.fromMillis(start),
        endTime: admin.firestore.Timestamp.fromMillis(start + 3600000),
        bookedCount: 1,
        cohortCounts: {womenInterestedInMen: 1},
        crossPathsPairHeldCount: 1,
        crossPathsPairConfirmedCount: 0,
        crossPathsPairHeldCohortCounts: {menInterestedInWomen: 1},
        capacityLimit: 2,
        eventPolicy: pairInventoryPolicy(2),
      });
      const heldAt = Date.now() - (mode === "ready-expired" ?
        16 * 60 * 1000 : 0);
      const expiresAt = heldAt + 15 * 60 * 1000;
      const readyRows = mode === "legacy" ? {} :
        readySeatDocs(sourceEvent, "runner-1", 1);
      if (mode !== "legacy") {
        readyRows["eventSeatLedgers/event-1"].temporaryHeld = 1;
        readyRows[reservationPath("uid_runner-1")] = {eventId: "event-1",
          canonicalKey: "uid_runner-1", identityRevision: 1, active: false,
          revision: 1, reservedAtMillis: heldAt, releasedAtMillis: null,
          temporaryHold: {ownerKind: "crossPathsPair",
            ownerId: mode === "ready-wrong-owner" ?
              "other-hold" : "hold-1",
            expiresAtMillis: expiresAt}};
      }
      if (mode === "ready-locked") {
        readyRows["eventSeatMigrationFences/event-1"].state = "locked";
      }
      const db = firestore({
        ...readyRows,
        "events/event-1": sourceEvent,
        "users/runner-1": user(),
        "eventParticipations/event-1_attendee-1": {
          eventId: "event-1",
          organizerId: "club-1",
          uid: "attendee-1",
          status: "signedUp",
        },
        "crossPathsInvitations/invitation-1": {
          eventId: "event-1",
          senderUid: "runner-1",
          recipientUid: "attendee-1",
          participantIds: ["runner-1", "attendee-1"],
          status: "accepted",
          pairHoldId: "hold-1",
        },
        "crossPathsPairHolds/hold-1": {
          eventId: "event-1",
          invitationId: "invitation-1",
          organizerId: "club-1",
          requesterUid: "runner-1",
          attendeeUid: "attendee-1",
          participantIds: ["runner-1", "attendee-1"],
          status: "active",
          requesterBookingStatus: "held",
          attendeeBookingStatus: "confirmed",
          requesterCohortId: "menInterestedInWomen",
          attendeeCohortId: "womenInterestedInMen",
          requesterPriceInPaise: mode === "ready-paid" ? 500 : 0,
          attendeePriceInPaise: 0,
          currency: "INR",
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
          expiresAt: admin.firestore.Timestamp.fromMillis(expiresAt),
          confirmedAt: null,
          releasedAt: null,
          releaseReason: null,
          paymentId: null,
          conversationId: null,
        },
      });

      if (["ready-wrong-owner", "ready-expired", "ready-locked"]
        .includes(mode)) {
        await assert.rejects(signUpUserForEvent(db, "event-1", "runner-1",
          undefined, {crossPathsPairHoldId: "hold-1",
            loadCurrentAuthPhone: async () => null}),
        /does not own|no longer available|locked/u);
        const failed = db as unknown as FakeFirestore;
        assert.equal(failed.get("eventSeatLedgers/event-1")?.occupied, 1);
        assert.equal(failed.get("eventSeatLedgers/event-1")?.temporaryHeld, 1);
        assert.equal(failed.get("eventParticipations/event-1_runner-1"),
          undefined);
        return;
      }
      for (let i = 0; i < 2; i++) {
        await signUpUserForEvent(db, "event-1", "runner-1",
          mode === "ready-paid" ? "verified-payment" : undefined, {
            crossPathsPairHoldId: "hold-1",
            loadCurrentAuthPhone: async () => null,
          });
      }

      const fake = db as unknown as FakeFirestore;
      if (mode !== "legacy") {
        assert.equal(fake.get("eventSeatLedgers/event-1")?.occupied, 2);
        assert.equal(fake.get("eventSeatLedgers/event-1")?.temporaryHeld, 0);
        assert.equal(fake.get("eventSeatLedgers/event-1")?.revision, 2);
        assert.equal(fake.get(reservationPath("uid_runner-1"))?.temporaryHold,
          undefined);
      }
      assert.equal(fake.get("crossPathsPairHolds/hold-1")?.status, "confirmed");
      assert.equal(
        fake.get("eventParticipations/event-1_runner-1")?.status,
        "signedUp"
      );
      assert.equal(
        fake.collectionDocs("matches")[0]?.data.conversationType,
        "crossPathsEventPlan"
      );
      const beforeRelease = fake.get("eventSeatLedgers/event-1");
      await releaseCrossPathsPairHold({db, holdId: "hold-1",
        reason: "cancelled"});
      assert.deepEqual(fake.get("eventSeatLedgers/event-1"), beforeRelease);
      assert.equal(fake.get("eventParticipations/event-1_runner-1")?.status,
        "signedUp");
    });
}

test("signUpUserForEvent writes a waitlist promotion notification", async (
) => {
  const db = firestore({
    "events/event-1": event({
      waitlistedCount: 1,
    }),
    "users/runner-1": user(),
    "eventParticipations/event-1_runner-1": {
      eventId: "event-1",
      organizerId: "club-1",
      uid: "runner-1",
      status: "waitlisted",
    },
  });

  await signUpUserForEvent(db, "event-1", "runner-1");

  const fake = db as unknown as FakeFirestore;
  const notification = fake.get(
    "notifications/runner-1/items/waitlistPromotion_event-1"
  );

  assert.equal(notification?.uid, "runner-1");
  assert.equal(notification?.type, "waitlistPromotion");
  assert.equal(notification?.title, "You're in");
  assert.equal(
    notification?.body,
    "A spot opened for your 5 km event from Carter Road."
  );
  assert.equal(notification?.eventId, "event-1");
  assert.equal(notification?.organizerId, "club-1");
  assert.equal(notification?.readAt, null);
});

test("signUpUserForEvent rejects cancelled events", async () => {
  const db = firestore({
    "events/event-1": event({status: "cancelled"}),
    "users/runner-1": user(),
  });

  await assert.rejects(
    () => signUpUserForEvent(db, "event-1", "runner-1"),
    (error) =>
      error instanceof Error &&
      "code" in error &&
      error.code === "failed-precondition"
  );
});

test("signUpUserForEvent never books a private event", async () => {
  const db = firestore({
    "events/event-1": event({
      publicationState: "private", setupRevision: 1,
    }),
    "users/runner-1": user(),
  });
  await assert.rejects(
    () => signUpUserForEvent(db, "event-1", "runner-1"),
    (error) => error instanceof Error && "code" in error &&
      error.code === "failed-precondition"
  );
  assert.equal((db as unknown as FakeFirestore)
    .get("eventParticipations/event-1_runner-1"), undefined);
});

test("signUpUserForEvent rejects missing account identity", async () => {
  const db = firestore({
    "events/event-1": event(),
    "users/runner-1": user({phoneNumber: ""}),
  });

  await assert.rejects(
    () => signUpUserForEvent(db, "event-1", "runner-1"),
    (error) =>
      error instanceof Error &&
      "code" in error &&
      error.code === "failed-precondition"
  );
});

test("signUpUserForEvent requires run preferences for run events", async () => {
  const db = firestore({
    "events/event-1": event(),
    "users/runner-1": user({
      activityPreferences: runningPreferences({version: 0}),
    }),
  });

  await assert.rejects(
    () => signUpUserForEvent(db, "event-1", "runner-1"),
    (error) =>
      error instanceof Error &&
      "code" in error &&
      error.code === "failed-precondition"
  );
});

test("signUpUserForEvent does not require run preferences for dinner events",
  async () => {
    const db = firestore({
      "events/event-1": event({
        eventFormat: {
          version: 1,
          activityKind: "dinner",
          interactionModel: "seatedTable",
        },
      }),
      "users/runner-1": user({
        activityPreferences: runningPreferences({version: 0}),
      }),
    });

    await signUpUserForEvent(db, "event-1", "runner-1");

    const fake = db as unknown as FakeFirestore;
    assert.equal(
      fake.get("eventParticipations/event-1_runner-1")?.status,
      "signedUp"
    );
  }
);

test("signUpUserForEvent rejects overlapping user bookings", async () => {
  const db = firestore({
    "events/event-1": event(),
    "events/event-2": event({
      organizerId: "club-2",
      startTime: admin.firestore.Timestamp.fromMillis(
        Date.parse("2026-05-02T02:00:00.000Z")
      ),
      endTime: admin.firestore.Timestamp.fromMillis(
        Date.parse("2026-05-02T03:00:00.000Z")
      ),
    }),
    "users/runner-1": user(),
    "eventParticipations/event-2_runner-1": {
      eventId: "event-2",
      organizerId: "club-2",
      uid: "runner-1",
      status: "signedUp",
    },
  });

  await assert.rejects(
    () => signUpUserForEvent(db, "event-1", "runner-1"),
    (error) =>
      error instanceof Error &&
      "code" in error &&
      error.code === "failed-precondition"
  );
});

test("signUpUserForEvent allows adjacent user bookings", async () => {
  const db = firestore({
    "events/event-1": event(),
    "events/event-2": event({
      organizerId: "club-2",
      startTime: admin.firestore.Timestamp.fromMillis(
        Date.parse("2026-05-02T02:30:00.000Z")
      ),
      endTime: admin.firestore.Timestamp.fromMillis(
        Date.parse("2026-05-02T03:30:00.000Z")
      ),
    }),
    "users/runner-1": user(),
    "eventParticipations/event-2_runner-1": {
      eventId: "event-2",
      organizerId: "club-2",
      uid: "runner-1",
      status: "signedUp",
    },
  });

  await signUpUserForEvent(db, "event-1", "runner-1");

  const fake = db as unknown as FakeFirestore;
  assert.equal(
    fake.get("eventParticipations/event-1_runner-1")?.status,
    "signedUp"
  );
});

function scheduleSlot(iso: string): number {
  return Math.floor(Date.parse(iso) / 60000);
}


test("Catch signup respects another checkout hold with zero confirmed bookings",
  async () => {
    const sourceEvent = event({capacityLimit: 1, bookedCount: 0});
    const rows = readySeatDocs(sourceEvent, "runner-1");
    rows["eventSeatLedgers/event-1"].checkoutHeld = 1;
    const db = firestore({"events/event-1": sourceEvent,
      "users/runner-1": user(), ...rows});
    await assert.rejects(signUpUserForEvent(db, "event-1", "runner-1",
      undefined, {loadCurrentAuthPhone: async () => null}));
    const fake = db as unknown as FakeFirestore;
    assert.equal(fake.get("eventSeatLedgers/event-1")?.occupied, 0);
    assert.equal(fake.get("eventSeatLedgers/event-1")?.checkoutHeld, 1);
    assert.equal(fake.get("eventParticipations/event-1_runner-1"), undefined);
  });

const paidBooking = {userId: "runner-1", eventId: "event-1",
  orderId: "order_one", paymentId: "pay_one", amount: 1000,
  amountMinor: 1000, currency: "INR", provider: "razorpay" as const};

test("native paid signup commits atomically and rejects re-entry",
  async () => {
    const db = firestore({"events/event-1": event(),
      "users/runner-1": user()});
    await signUpUserForEvent(db, "event-1", "runner-1", "pay_one",
      {paidBooking});
    const fake = db as unknown as FakeFirestore;
    assert.equal(fake.get("payments/pay_one")?.status, "completed");
    assert.equal(fake.get("eventParticipations/event-1_runner-1")?.paymentId,
      "pay_one");
    await assert.rejects(signUpUserForEvent(db, "event-1", "runner-1",
      "pay_one", {paidBooking}), /already finalized/);
  });

test("another paid booking cannot claim an existing seat", async () => {
  const db = firestore({"events/event-1": event(),
    "users/runner-1": user(),
    "eventParticipations/event-1_runner-1": {eventId: "event-1",
      uid: "runner-1", status: "signedUp", paymentId: "pay_other"}});
  await assert.rejects(signUpUserForEvent(db, "event-1", "runner-1",
    "pay_one", {paidBooking}), /Another booking/);
  assert.equal((db as unknown as FakeFirestore).get("payments/pay_one"),
    undefined);
});


test("following does not grant a members-only seat", async () => {
  const sourceEvent = event({
    eventPolicy: {
      ...pairInventoryPolicy(),
      admission: {
        format: "membersOnly",
        membershipRequired: true,
        capacityLimit: 20,
      },
    },
  });
  const db = firestore({
    "events/event-1": sourceEvent,
    "users/runner-1": user(),
    "organizerFollows/club-1_runner-1": {
      organizerId: "club-1",
      uid: "runner-1",
      status: "active",
    },
  });
  await assert.rejects(
    signUpUserForEvent(db, "event-1", "runner-1"),
    /Approved community membership/
  );
  const state = db as unknown as FakeFirestore;
  assert.equal(state.get("eventParticipations/event-1_runner-1"), undefined);
  assert.equal(state.get("events/event-1")?.bookedCount, 0);
});

test("revocation preserves a booking and blocks new admission", async () => {
  const sourceEvent = event({
    eventPolicy: {
      ...pairInventoryPolicy(),
      admission: {
        format: "membersOnly",
        membershipRequired: true,
        capacityLimit: 20,
      },
    },
  });
  const db = firestore({
    "events/event-1": sourceEvent,
    "users/runner-1": user(),
    "users/runner-2": user(),
    ...communityMembershipRows("club-1", "runner-1"),
    ...communityMembershipRows("club-1", "runner-2", "revoked"),
  });
  await signUpUserForEvent(db, "event-1", "runner-1");
  const state = db as unknown as FakeFirestore;
  const booked = state.get("eventParticipations/event-1_runner-1");
  assert.equal((booked?.communityMembershipAtSignup as FakeData).revision, 1);
  for (const [path, value] of Object.entries(
    communityMembershipRows("club-1", "runner-1", "revoked")
  )) {
    state.set(path, value);
  }
  await signUpUserForEvent(db, "event-1", "runner-1");
  assert.deepEqual(state.get("eventParticipations/event-1_runner-1"), booked);
  await assert.rejects(
    signUpUserForEvent(db, "event-1", "runner-2"),
    /Approved community membership/
  );
  assert.equal(state.get("eventParticipations/event-1_runner-2"), undefined);
});

test("a stale approved preflight cannot admit a declined request", async () => {
  const manual = pairInventoryPolicy();
  (manual.admission as FakeData).manualApprovalRequired = true;
  const records = {"events/event-1": event({eventPolicy: manual}),
    "users/runner-1": user(), "eventParticipations/event-1_runner-1": {
      eventId: "event-1", organizerId: "club-1", uid: "runner-1",
      status: "cancelled", hostApprovalStatus: "declined"}};
  const db = firestore(records);
  await assert.rejects(signUpUserForEvent(db, "event-1", "runner-1",
    undefined, {hasHostApproval: true}), /Request to join/);
  assert.equal(records["events/event-1"].bookedCount, 0);
  assert.equal(records["eventParticipations/event-1_runner-1"].status,
    "cancelled");
});

test("current persisted approval supplies the transactional review check",
  async () => {
    const manual = pairInventoryPolicy();
    (manual.admission as FakeData).manualApprovalRequired = true;
    const records = {"events/event-1": event({eventPolicy: manual}),
      "users/runner-1": user(), "eventParticipations/event-1_runner-1": {
        eventId: "event-1", organizerId: "club-1", uid: "runner-1",
        status: "waitlisted", hostApprovalStatus: "approved"}};
    const db = firestore(records);
    await signUpUserForEvent(db, "event-1", "runner-1");
    assert.equal(records["eventParticipations/event-1_runner-1"].status,
      "signedUp");
  });

test("unrestricted signup accepts minimal identity without inventing gender",
  async () => {
    const minimal = user({
      interestedInGenders: [],
      profilePhotos: [],
      profileComplete: false,
    });
    delete minimal.dateOfBirth;
    delete minimal.gender;
    const db = firestore({
      "events/event-1": event(),
      "users/runner-1": minimal,
    });
    await signUpUserForEvent(db, "event-1", "runner-1");
    const fake = db as unknown as FakeFirestore;
    assert.equal(
      fake.get("eventParticipations/event-1_runner-1")?.status,
      "signedUp",
    );
    assert.deepEqual(fake.get("events/event-1")?.genderCounts, {});
  });

for (const constraints of [
  {minAge: 18, maxAge: 99, maxMen: null, maxWomen: null},
  {minAge: 0, maxAge: 99, maxMen: 10, maxWomen: null},
]) {
  test(`restricted signup needs details ${JSON.stringify(constraints)}`,
    async () => {
      const minimal = user({interestedInGenders: []});
      delete minimal.dateOfBirth;
      delete minimal.gender;
      const db = firestore({
        "events/event-1": event({constraints}),
        "users/runner-1": minimal,
      });
      await assert.rejects(
        signUpUserForEvent(db, "event-1", "runner-1"),
        /details this event requires/,
      );
      assert.equal(
        (db as unknown as FakeFirestore).get(
          "eventParticipations/event-1_runner-1",
        ),
        undefined,
      );
    });
}
