import assert from "node:assert/strict";
import test from "node:test";
import {createHash} from "node:crypto";
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError} from "firebase-functions/v2/https";
import {eventAttendeeId, importEventAttendeesHandler} from
  "../events/eventAttendees";
import {deriveEventSeatPolicy} from
  "../events/seatAuthority/firestoreAdapter";
import {seatIdentityAliasId, seatIdentityValueHash,
  seatVerifiedPhoneProofId} from "../events/seatIdentityAuthority";
import {eventVenueSessionRedemptionId} from "../events/venueSessions";
import {organizerCommunicationPreferenceId} from
  "../shared/organizerCommunicationPreferences";
import {loadEventSuccessRoster} from "./eventSuccessRoster";
import {requiredDataRequestId} from
  "./operations/runtimeRequiredDataStore";
import {
  approveEventRuntimeClaimHandler,
  checkInEventRuntimeHandler,
  claimEventRuntimeAccessHandler,
  completedRuntimeFieldIds,
  eventRuntimeParticipantId,
  getEventRuntimeBootstrapHandler,
  optionalRuntimeFieldIds,
  requiredRuntimeFieldIds,
  submitEventRuntimeProfileHandler,
} from "./eventRuntime";

type FakeData = Record<string, unknown>;

const venueSessionId = "session_123456789012345678901234";
const venueSessionToken =
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

class FakeDocRef {
  constructor(readonly firestore: FakeFirestore, readonly path: string) {}
  get id(): string {
    return this.path.split("/").at(-1) ?? "";
  }
  async get(): Promise<FakeSnapshot> {
    return new FakeSnapshot(this.firestore, this.path);
  }
  async update(data: FakeData): Promise<void> {
    const current = this.firestore.get(this.path);
    if (!current) throw new Error(`Document missing: ${this.path}`);
    this.firestore.set(this.path, {...current, ...data});
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
    return this.firestore.get(this.path);
  }
}

class FakeCollectionRef {
  constructor(
    private readonly firestore: FakeFirestore,
    private readonly path: string,
    private readonly filters: Array<{
      field: string;
      value: unknown;
    }> = [],
    private readonly limitCount?: number
  ) {}
  doc(id: string): FakeDocRef {
    return new FakeDocRef(this.firestore, `${this.path}/${id}`);
  }
  where(field: string, operator: string, value: unknown): FakeCollectionRef {
    assert.equal(operator, "==");
    return new FakeCollectionRef(
      this.firestore,
      this.path,
      [...this.filters, {field, value}],
      this.limitCount
    );
  }
  limit(count: number): FakeCollectionRef {
    return new FakeCollectionRef(
      this.firestore,
      this.path,
      this.filters,
      count
    );
  }
  async get() {
    const docs = this.firestore.query(this.path, this.filters)
      .slice(0, this.limitCount);
    return {docs, empty: docs.length === 0, size: docs.length};
  }
}

class FakeTransaction {
  private readonly writes: Array<() => void> = [];
  constructor(private readonly firestore: FakeFirestore) {}
  async get(ref: FakeDocRef | FakeCollectionRef): Promise<FakeSnapshot | {
    docs: FakeSnapshot[]; empty: boolean; size: number}> {
    if (ref instanceof FakeCollectionRef) return ref.get();
    return new FakeSnapshot(this.firestore, ref.path);
  }
  create(ref: FakeDocRef, data: FakeData): void {
    this.writes.push(() => {
      if (this.firestore.get(ref.path) !== undefined) {
        throw new Error(`Document exists: ${ref.path}`);
      }
      this.firestore.set(ref.path, data);
    });
  }
  set(ref: FakeDocRef, data: FakeData, options?: {merge: boolean}): void {
    this.writes.push(() => {
      if (options?.merge) {
        this.firestore.set(ref.path, {
          ...(this.firestore.get(ref.path) ?? {}),
          ...data,
        });
      } else {
        this.firestore.set(ref.path, data);
      }
    });
  }
  update(ref: FakeDocRef, data: FakeData): void {
    this.writes.push(() => {
      const current = this.firestore.get(ref.path);
      if (!current) throw new Error(`Document missing: ${ref.path}`);
      this.firestore.set(ref.path, {...current, ...data});
    });
  }
  commit(): void {
    for (const write of this.writes) write();
  }
}

class FakeFirestore {
  constructor(private readonly docs: Record<string, FakeData | undefined>) {}
  collection(path: string): FakeCollectionRef {
    return new FakeCollectionRef(this, path);
  }
  batch(): FakeTransaction {
    return new FakeTransaction(this);
  }
  async getAll(...refs: FakeDocRef[]): Promise<FakeSnapshot[]> {
    return refs.map((ref) => new FakeSnapshot(this, ref.path));
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
    return data ? {...data} : undefined;
  }
  set(path: string, data: FakeData): void {
    this.docs[path] = {...data};
  }
  query(
    collection: string,
    filters: Array<{field: string; value: unknown}>
  ): FakeSnapshot[] {
    const prefix = `${collection}/`;
    return Object.entries(this.docs)
      .filter(([path, data]) =>
        data !== undefined &&
        path.startsWith(prefix) &&
        !path.slice(prefix.length).includes("/"))
      .filter(([, data]) => filters.every(({field, value}) =>
        nestedValue(data!, field) === value))
      .map(([path]) => new FakeSnapshot(this, path));
  }
}

function nestedValue(data: FakeData, path: string): unknown {
  return path.split(".").reduce<unknown>((value, segment) =>
    typeof value === "object" && value !== null ?
      (value as FakeData)[segment] : undefined, data);
}

function timestamp(iso = "2026-08-11T10:00:00.000Z") {
  return admin.firestore.Timestamp.fromDate(new Date(iso));
}

function event(overrides: FakeData = {}): FakeData {
  return {
    organizerId: "organizer-1",
    startTime: timestamp("2026-08-11T12:00:00.000Z"),
    endTime: timestamp("2026-08-11T15:00:00.000Z"),
    meetingPoint: "The Courtyard",
    meetingLocation: {
      name: "The Courtyard",
      latitude: 19.1,
      longitude: 72.8,
    },
    capacityLimit: 20,
    priceInPaise: 0,
    eventFormat: {
      version: 1,
      activityKind: "singlesMixer",
      interactionModel: "freeFormMixer",
      customActivityLabel: "Wednesday Social",
    },
    status: "active",
    runtimeAccess: {
      enabled: true,
      publicRuntimeId: "runtime_123456789012345678901234",
      walkInPolicy: "deny",
      termsVersion: "event-runtime-v1",
    },
    ...overrides,
  };
}

function organizer(): FakeData {
  return {
    hostUserId: "host-1",
    ownerUserId: "host-1",
    hostUserIds: ["host-1"],
    hostProfiles: [],
  };
}

function attendee(overrides: FakeData = {}): FakeData {
  return {
    eventId: "event-1",
    organizerId: "organizer-1",
    displayName: "Asha Shah",
    searchName: "asha shah",
    source: "hostImport",
    status: "registered",
    linkedUid: null,
    phoneE164: "+919876543210",
    email: null,
    externalReference: null,
    ticketType: null,
    importId: null,
    sourceRowId: null,
    createdAt: timestamp(),
    updatedAt: timestamp(),
    registeredAt: timestamp(),
    waitlistedAt: null,
    checkedInAt: null,
    cancelledAt: null,
    checkedInBy: null,
    linkedAt: null,
    ...overrides,
  };
}

function participant(overrides: FakeData = {}): FakeData {
  return {
    eventId: "event-1",
    organizerId: "organizer-1",
    uid: "runner-1",
    eventAttendeeId: "attendee-1",
    identityVersion: 1,
    claimMethod: "verifiedPhone",
    accessStatus: "ready",
    requiredFieldIds: ["displayName", "questionnaireAnswerIds"],
    completedFieldIds: ["displayName", "questionnaireAnswerIds"],
    runtimeProfile: {
      displayName: "Asha Shah",
      gender: null,
      interestedInGenders: [],
      relationshipGoal: null,
      dateOfBirth: null,
      paceBand: null,
      skillBand: null,
      dietaryAndSeatingNotes: null,
      questionnaireAnswerIds: ["event_energy_easy_conversation"],
      teamName: null,
    },
    consents: {
      runtimeTermsVersion: "event-runtime-v1",
      sensitiveDataTermsVersion: null,
      saveAsCatchPrefill: false,
    },
    claimedAt: timestamp(),
    readyAt: timestamp(),
    revokedAt: null,
    createdAt: timestamp(),
    updatedAt: timestamp(),
    ...overrides,
  };
}

function dataRequest(fieldIds: string[], overrides: FakeData = {}): FakeData {
  const context = {mode: "live" as const, eventId: "event-1",
    organizerId: "organizer-1"};
  const requestId = requiredDataRequestId(context, "attendee-1");
  return {schemaVersion: 1, requestId, eventId: "event-1",
    organizerId: "organizer-1", attendeeId: "attendee-1", uid: "runner-1",
    revision: 1, profileRevision: 0, sourceHash: "a".repeat(64),
    operationId: "request-one", fieldIds, completedFieldIds: [],
    status: "pending", requestedBy: "systemWithinPolicy",
    requestedAt: timestamp("2026-08-11T09:55:00.000Z"),
    expiresAt: timestamp("2026-08-11T13:00:00.000Z"), completedAt: null,
    updatedAt: timestamp("2026-08-11T09:55:00.000Z"), ...overrides};
}

function request(
  uid: string | null,
  data: FakeData,
  phone = "+919876543210"
): CallableRequest<unknown> {
  return {
    auth: uid ? {
      uid,
      token: {phone_number: phone},
    } as CallableRequest["auth"] : undefined,
    data,
    rawRequest: {} as CallableRequest["rawRequest"],
  } as CallableRequest<unknown>;
}

function harness(initial: Record<string, FakeData | undefined>) {
  const firestore = new FakeFirestore(initial);
  const limits: string[] = [];
  return {
    firestore,
    limits,
    deps: {
      firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
      timestamp,
      timestampFromMillis: (millis: number) =>
        admin.firestore.Timestamp.fromMillis(millis),
      checkRateLimit: async (
        _db: FirebaseFirestore.Firestore,
        uid: string,
        action: string
      ) => {
        limits.push(`${uid}:${action}`);
      },
      verifyVenueSessionToken: (params: {
        token: string;
        eventId: string;
        nowMillis: number;
      }) => ({
        version: 1 as const,
        eventId: params.eventId,
        organizerId: "organizer-1",
        sessionId: venueSessionId,
        issuedAtMillis: timestamp("2026-08-11T09:59:00.000Z").toMillis(),
        expiresAtMillis: timestamp("2026-08-11T10:01:00.000Z").toMillis(),
      }),
    },
  };
}

function code(error: unknown, expected: string): boolean {
  return error instanceof HttpsError && error.code === expected;
}

test("runtime entry requires one variable-bound pre-event payload", () => {
  const formats = [
    ["pacePods", "paceBand"],
    ["pairedRotations", "skillBand"],
    ["seatedTable", "dietaryAndSeatingNotes"],
    ["freeFormMixer", "questionnaireAnswerIds"],
    ["teamRotations", "teamName"],
    ["openFormat", null],
  ] as const;
  for (const [interactionModel, expectedField] of formats) {
    const required = requiredRuntimeFieldIds(event({eventFormat: {
      version: 1,
      activityKind: "openActivity",
      interactionModel,
    }}) as never, null);
    assert.deepEqual(required, expectedField ?
      ["displayName", expectedField] : ["displayName"]);
  }
  assert.deepEqual(optionalRuntimeFieldIds(
    event() as never,
    {selectedModuleIds: ["first_hello_check_in"]} as never
  ), ["gender", "interestedInGenders"]);
  assert.deepEqual(optionalRuntimeFieldIds(
    event({eventFormat: {
      version: 1,
      activityKind: "pubQuiz",
      interactionModel: "teamRotations",
    }}) as never,
    {selectedModuleIds: ["first_hello_check_in"]} as never
  ), []);
  assert.deepEqual(completedRuntimeFieldIds({
    displayName: "Asha",
    gender: "woman",
    interestedInGenders: ["man"],
    relationshipGoal: null,
    dateOfBirth: null,
    paceBand: "moderate",
    skillBand: "intermediate",
    dietaryAndSeatingNotes: "Vegetarian",
    questionnaireAnswerIds: ["event_energy_easy_conversation"],
    teamName: "Late Entries",
  }), [
    "displayName",
    "gender",
    "interestedInGenders",
    "paceBand",
    "skillBand",
    "dietaryAndSeatingNotes",
    "questionnaireAnswerIds",
    "teamName",
  ]);
});

test("bootstrap returns bounded event and own state", async () => {
  const requestId = requiredDataRequestId({mode: "live", eventId: "event-1",
    organizerId: "organizer-1"}, "attendee-1");
  const h = harness({
    "events/event-1": event({checkedInCount: 18}),
    "eventRuntimeParticipants/event-1_runner-1": participant(),
    "eventAttendees/attendee-1": attendee({
      linkedUid: "runner-1",
      status: "checkedIn",
    }),
    [`eventRuntimeDataRequests/${requestId}`]: dataRequest(["gender"]),
  });
  const result = await getEventRuntimeBootstrapHandler(request(
    "runner-1",
    {publicRuntimeId: "runtime_123456789012345678901234"}
  ), h.deps);
  assert.deepEqual(result.event, {
    eventId: "event-1",
    publicRuntimeId: "runtime_123456789012345678901234",
    title: "Wednesday Social",
    startTimeMillis: Date.parse("2026-08-11T12:00:00.000Z"),
    endTimeMillis: Date.parse("2026-08-11T15:00:00.000Z"),
    serverTimeMillis: timestamp().toMillis(),
    locationName: "The Courtyard",
    checkedInCount: 18,
    runtimeTermsVersion: "event-runtime-v1",
    moduleIds: [],
    interactionModel: "freeFormMixer",
    itinerary: [],
    routePlan: null,
    livePositions: [],
    layout: null,
    requiredFieldIds: ["displayName", "questionnaireAnswerIds"],
    optionalFieldIds: [],
    questionnaireConfig: null,
  });
  assert.equal(result.participant?.eventAttendeeId, "attendee-1");
  assert.equal(result.participant?.attendanceStatus, "checkedIn");
  assert.equal(result.participant?.eventId, "event-1");
  assert.equal(result.participant?.organizerId, "organizer-1");
  assert.equal(result.participant?.organizerId, "organizer-1");
  assert.deepEqual(result.participant?.requiredDataRequest, {
    revision: 1,
    fieldIds: ["gender"],
    completedFieldIds: [],
    status: "pending",
    requestedAtMillis: Date.parse("2026-08-11T09:55:00.000Z"),
    expiresAtMillis: Date.parse("2026-08-11T13:00:00.000Z"),
    completedAtMillis: null,
  });
  assert.equal((result.event as FakeData).organizerId, undefined);
});

test("incomplete setup cannot open the runtime bootstrap", async () => {
  const h = harness({"events/event-1": event({
    meetingLocation: undefined,
  })});
  await assert.rejects(getEventRuntimeBootstrapHandler(request(
    "runner-1", {publicRuntimeId: "runtime_123456789012345678901234"}
  ), h.deps), (error) => error instanceof HttpsError &&
    error.code === "failed-precondition");
});

test("authored movement and fresh positions reach bootstrap", async () => {
  const routePlan = {
    version: 2,
    movementMode: "run",
    routeShape: "loop",
    groupStrategy: "paceGroups",
    stopCadence: "hostedStops",
    stopKinds: ["water"],
    roleKinds: ["routeLead", "sweep"],
    path: [
      {latitude: 19.1, longitude: 72.8},
      {latitude: 19.2, longitude: 72.9},
    ],
    paceGroups: [{
      id: "social",
      label: "Social",
      targetPaceSecondsPerKm: 450,
      sortOrder: 0,
    }],
    liveTrackingPolicy: {
      mode: "authorizedOperators",
      staleAfterSeconds: 300,
      retentionMinutes: 60,
    },
  };
  const h = harness({
    "events/event-1": event({
      name: "Monsoon Miles",
      itinerary: [{
        id: "gather",
        kind: "gather",
        offsetMinutes: 0,
        title: "Meet the pacers",
      }],
      eventFormat: {
        version: 1,
        activityKind: "socialRun",
        interactionModel: "pacePods",
        activityDetails: {routePlan},
      },
    }),
    "eventRuntimeParticipants/event-1_runner-1": participant({
      requiredFieldIds: ["displayName", "paceBand"],
      completedFieldIds: ["displayName", "paceBand"],
      runtimeProfile: {
        ...(participant().runtimeProfile as FakeData),
        paceBand: "moderate",
      },
    }),
    "eventAttendees/attendee-1": attendee({
      linkedUid: "runner-1",
      status: "checkedIn",
    }),
    "eventLivePositions/event-1__host-1": {
      eventId: "event-1",
      role: "host",
      latitude: 19.15,
      longitude: 72.85,
      accuracyMeters: 8,
      headingDegrees: 92,
      recordedAt: timestamp("2026-08-11T09:59:00.000Z"),
      expiresAt: timestamp("2026-08-11T11:00:00.000Z"),
    },
    "eventLivePositions/event-1__stale": {
      eventId: "event-1",
      role: "operator",
      latitude: 19.16,
      longitude: 72.86,
      accuracyMeters: null,
      headingDegrees: null,
      recordedAt: timestamp("2026-08-11T09:50:00.000Z"),
      expiresAt: timestamp("2026-08-11T11:00:00.000Z"),
    },
  });

  const result = await getEventRuntimeBootstrapHandler(request(
    "runner-1",
    {publicRuntimeId: "runtime_123456789012345678901234"}
  ), h.deps);

  assert.equal(result.event.title, "Monsoon Miles");
  assert.deepEqual(result.event.itinerary, [{
    id: "gather",
    kind: "gather",
    offsetMinutes: 0,
    title: "Meet the pacers",
  }]);
  assert.deepEqual(result.event.routePlan, routePlan);
  assert.deepEqual(result.event.livePositions, [{
    role: "host",
    latitude: 19.15,
    longitude: 72.85,
    accuracyMeters: 8,
    headingDegrees: 92,
    recordedAtMillis: timestamp("2026-08-11T09:59:00.000Z").toMillis(),
    staleAtMillis: timestamp("2026-08-11T10:04:00.000Z").toMillis(),
  }]);

  const publicResult = await getEventRuntimeBootstrapHandler(request(
    null,
    {publicRuntimeId: "runtime_123456789012345678901234"}
  ), h.deps);
  assert.deepEqual(publicResult.event.livePositions, []);
});

test("verified phone claims the matching imported attendee", async () => {
  const attendeeId = eventAttendeeId(
    "event-1",
    "phone:+919876543210"
  );
  const h = harness({
    "events/event-1": event(),
    [`eventAttendees/${attendeeId}`]: attendee(),
    "eventSuccessPlans/event-1": {
      selectedModuleIds: ["first_hello_check_in"],
    },
  });
  const result = await claimEventRuntimeAccessHandler(request("runner-1", {
    publicRuntimeId: "runtime_123456789012345678901234",
    displayName: "  Asha   Shah ",
    runtimeTermsVersion: "event-runtime-v1",
  }), h.deps);
  assert.equal(result.status, "needsInput");
  assert.equal(result.attendeeId, attendeeId);
  assert.deepEqual(result.requiredFieldIds, [
    "displayName",
    "questionnaireAnswerIds",
  ]);
  assert.equal(h.firestore.get(`eventAttendees/${attendeeId}`)?.linkedUid,
    "runner-1");
  assert.equal(h.firestore.get("users/runner-1"), undefined);
  assert.equal(h.firestore.get("eventParticipations/event-1_runner-1"),
    undefined);
});

test("ready auto-create claims exactly one seat and replays without another",
  async () => {
    const currentEvent = event({capacityLimit: 1,
      runtimeAccess: {enabled: true,
        publicRuntimeId: "runtime_123456789012345678901234",
        walkInPolicy: "autoCreate", termsVersion: "event-runtime-v1"}});
    const policy = deriveEventSeatPolicy(currentEvent);
    const h = harness({
      "events/event-1": currentEvent,
      "eventSeatMigrationFences/event-1": {eventId: "event-1",
        migrationRevision: 1, state: "ready"},
      "eventSeatLedgers/event-1": {eventId: "event-1", capacity: 1,
        occupied: 0, revision: 1, capacityRevision: 1,
        migrationRevision: 1, policyVersion: policy.policyVersion,
        policyHash: policy.policyHash, state: "ready"},
    });
    const claim = request("runner-1", {
      publicRuntimeId: "runtime_123456789012345678901234",
      displayName: "Walk-in", runtimeTermsVersion: "event-runtime-v1",
    });
    const first = await claimEventRuntimeAccessHandler(claim, h.deps);
    assert.equal(first.attendeeId, eventAttendeeId("event-1",
      "phone:+919876543210"));
    assert.equal(h.firestore.get("eventSeatLedgers/event-1")?.occupied, 1);
    assert.equal(h.firestore.get("events/event-1")?.bookedCount, 1);
    assert.equal(h.firestore.get(`eventAttendees/${first.attendeeId}`)
      ?.status, "registered");
    await claimEventRuntimeAccessHandler(claim, h.deps);
    assert.equal(h.firestore.get("eventSeatLedgers/event-1")?.occupied, 1);
    assert.equal(h.firestore.get("events/event-1")?.bookedCount, 1);
    const ledger = h.firestore.get("eventSeatLedgers/event-1")!;
    h.firestore.set("eventSeatLedgers/event-1", {...ledger,
      policyHash: "f".repeat(64)});
    await assert.rejects(claimEventRuntimeAccessHandler(claim, h.deps),
      (error) => code(error, "failed-precondition"));
    h.firestore.set("eventSeatLedgers/event-1", ledger);
    await assert.rejects(claimEventRuntimeAccessHandler(request("runner-2",
      {publicRuntimeId: "runtime_123456789012345678901234",
        displayName: "Another", runtimeTermsVersion: "event-runtime-v1"},
      "+919876543211"), h.deps));
    assert.equal(h.firestore.get("eventSeatLedgers/event-1")?.occupied, 1);
  });

test("ready Host approval converts an invited claim into one reserved seat",
  async () => {
    const currentEvent = event({capacityLimit: 1,
      runtimeAccess: {enabled: true,
        publicRuntimeId: "runtime_123456789012345678901234",
        walkInPolicy: "hostApproval", termsVersion: "event-runtime-v1"}});
    const policy = deriveEventSeatPolicy(currentEvent);
    const h = harness({
      "events/event-1": currentEvent,
      "organizers/organizer-1": organizer(),
      "eventSeatMigrationFences/event-1": {eventId: "event-1",
        migrationRevision: 1, state: "ready"},
      "eventSeatLedgers/event-1": {eventId: "event-1", capacity: 1,
        occupied: 0, revision: 1, capacityRevision: 1,
        migrationRevision: 1, policyVersion: policy.policyVersion,
        policyHash: policy.policyHash, state: "ready"},
    });
    const claim = await claimEventRuntimeAccessHandler(request("runner-1", {
      publicRuntimeId: "runtime_123456789012345678901234",
      displayName: "Walk-in", runtimeTermsVersion: "event-runtime-v1",
    }), h.deps);
    assert.equal(claim.status, "pendingApproval");
    assert.equal(h.firestore.get("eventSeatLedgers/event-1")?.occupied, 0);
    assert.equal(h.firestore.get(`eventAttendees/${claim.attendeeId}`)
      ?.status, "invited");
    const ledger = h.firestore.get("eventSeatLedgers/event-1")!;
    h.firestore.set("eventSeatLedgers/event-1", {...ledger,
      policyHash: "f".repeat(64)});
    await assert.rejects(approveEventRuntimeClaimHandler(request("host-1", {
      eventId: "event-1", uid: "runner-1", decision: "approve",
      attendeeId: claim.attendeeId,
    }), h.deps), (error) => code(error, "failed-precondition"));
    assert.equal(h.firestore.get("eventSeatLedgers/event-1")?.occupied, 0);
    h.firestore.set("eventSeatLedgers/event-1", ledger);
    const approved = await approveEventRuntimeClaimHandler(request("host-1", {
      eventId: "event-1", uid: "runner-1", decision: "approve",
      attendeeId: claim.attendeeId,
    }), h.deps);
    assert.equal(approved.status, "approved");
    assert.equal(h.firestore.get("eventSeatLedgers/event-1")?.occupied, 1);
    assert.equal(h.firestore.get("events/event-1")?.bookedCount, 1);
    assert.equal(h.firestore.get(`eventAttendees/${claim.attendeeId}`)
      ?.status, "registered");
  });

test("ready Catch reservation can claim runtime before display projection",
  async () => {
    const currentEvent = event();
    const policy = deriveEventSeatPolicy(currentEvent);
    const phone = "+919876543210";
    const uid = "runner-1";
    const key = "uid_existing";
    const reservationId = createHash("sha256")
      .update(`event-1\u001f${key}`).digest("hex");
    const docs: Record<string, FakeData> = {
      "events/event-1": currentEvent,
      "eventParticipations/event-1_runner-1": {eventId: "event-1",
        organizerId: "organizer-1", uid, status: "signedUp"},
      "eventSeatMigrationFences/event-1": {eventId: "event-1",
        migrationRevision: 1, state: "ready"},
      "eventSeatLedgers/event-1": {eventId: "event-1", capacity: 20,
        occupied: 1, revision: 1, capacityRevision: 1,
        migrationRevision: 1, policyVersion: policy.policyVersion,
        policyHash: policy.policyHash, state: "ready"},
      [`eventSeatReservations/${reservationId}`]: {eventId: "event-1",
        canonicalKey: key, identityRevision: 1, active: true,
        revision: 1, reservedAtMillis: 100, releasedAtMillis: null},
      [`eventSeatVerifiedPhones/${seatVerifiedPhoneProofId(
        "event-1", uid)}`]: {eventId: "event-1",
        organizerId: "organizer-1", uid, phoneE164: phone,
        migrationRevision: 1, state: "current"},
    };
    for (const [kind, value] of [["uid", uid],
      ["phone", phone]] as const) {
      docs[`eventSeatIdentityAliases/${seatIdentityAliasId("event-1",
        kind, value)}`] = {eventId: "event-1", organizerId: "organizer-1",
        kind, valueHash: seatIdentityValueHash(kind, value),
        canonicalKey: key, identityRevision: 1, migrationRevision: 1,
        state: "ready"};
    }
    const h = harness(docs);
    const result = await claimEventRuntimeAccessHandler(request(uid, {
      publicRuntimeId: "runtime_123456789012345678901234",
      displayName: "Catch Guest", runtimeTermsVersion: "event-runtime-v1",
    }), h.deps);
    assert.equal(result.attendeeId, eventAttendeeId("event-1",
      `phone:${phone}`));
    assert.equal(h.firestore.get("eventSeatLedgers/event-1")?.occupied, 1);
    assert.equal(h.firestore.get(`eventAttendees/${result.attendeeId}`)
      ?.source, "catchBooking");
    assert.equal(h.firestore.get(`eventAttendees/${result.attendeeId}`)
      ?.phoneE164, null);
  });

test("canonical import feeds verified claim, readiness and checked-in roster",
  async () => {
    const h = harness({
      "events/event-1": event({checkedInCount: 0,
        startTime: timestamp("2026-08-11T10:05:00.000Z")}),
      "organizers/organizer-1": organizer(),
      "eventSuccessPlans/event-1": {
        selectedModuleIds: ["first_hello_check_in"],
      },
      [`eventVenueSessions/${venueSessionId}`]: {
        eventId: "event-1", organizerId: "organizer-1",
        createdBy: "host-1",
        issuedAt: timestamp("2026-08-11T09:59:00.000Z"),
        expiresAt: timestamp("2026-08-11T10:01:00.000Z"),
      },
    });
    const csv = {eventId: "event-1", importKey: "synthetic-urbanot-1",
      fileName: "synthetic-urbanot.csv", format: "csv", rows: [
        {rowId: "2", displayName: " Asha Shah ",
          phone: "98765 43210", email: "asha@example.test",
          ticketType: "General",
          revenueAmountMinor: 100000, revenueCurrency: "INR",
          revenueSource: "hostImport", status: "registered"},
        {rowId: "3", displayName: "Waitlisted guest",
          phone: "+919876543211", status: "waitlisted"},
        {rowId: "4", displayName: "Duplicate Asha",
          phone: "+919876543210", status: "registered"},
        {rowId: "5", displayName: "No stable identity",
          status: "registered"},
      ]};
    const importRequest = request("host-1", csv);
    const imported = await importEventAttendeesHandler(importRequest, h.deps);
    assert.equal(imported.createdCount, 2);
    assert.equal(imported.skippedCount, 2);
    assert.deepEqual(imported.errors.map((error) => error.code),
      ["duplicate-row", "missing-stable-identity"]);
    assert.equal((await importEventAttendeesHandler(importRequest,
      h.deps)).replayed, true);
    await assert.rejects(() => importEventAttendeesHandler(request("host-1",
      {...csv, rows: csv.rows.slice(0, 1)}), h.deps),
    (error) => code(error, "failed-precondition"));

    const attendeeId = eventAttendeeId("event-1",
      "phone:+919876543210");
    const importedAttendee = h.firestore.get(`eventAttendees/${attendeeId}`);
    assert.equal(importedAttendee?.displayName, "Asha Shah");
    assert.equal(importedAttendee?.revenueSource, "hostImport");
    assert.equal(importedAttendee?.linkedUid, null);
    assert.equal(h.firestore.get("users/runner-1"), undefined);
    assert.deepEqual(await loadEventSuccessRoster(
      h.firestore as unknown as FirebaseFirestore.Firestore, "event-1"), []);
    const claim = {publicRuntimeId: "runtime_123456789012345678901234",
      displayName: "Asha Shah", runtimeTermsVersion: "event-runtime-v1"};
    await assert.rejects(() => claimEventRuntimeAccessHandler(
      request("wrong-runner", claim, "+919876543299"), h.deps),
    (error) => code(error, "permission-denied"));
    assert.equal(h.firestore.get(`eventAttendees/${attendeeId}`)?.linkedUid,
      null);
    const claimed = await claimEventRuntimeAccessHandler(
      request("runner-1", claim), h.deps);
    assert.equal(claimed.attendeeId, attendeeId);
    assert.equal(claimed.status, "needsInput");
    assert.deepEqual(await loadEventSuccessRoster(
      h.firestore as unknown as FirebaseFirestore.Firestore, "event-1"), []);
    const profile = {publicRuntimeId: claim.publicRuntimeId,
      runtimeTermsVersion: claim.runtimeTermsVersion, fields: {
        questionnaireAnswerIds: ["event_energy_easy_conversation"],
      }, saveAsCatchPrefill: false};
    await assert.rejects(() => submitEventRuntimeProfileHandler(
      request("runner-1", profile), h.deps),
    (error) => code(error, "failed-precondition"));
    const completed = await submitEventRuntimeProfileHandler(
      request("runner-1", {...profile,
        sensitiveDataTermsVersion: "sensitive-runtime-v1"}), h.deps);
    assert.equal(completed.status, "ready");
    const beforeCheckIn = await loadEventSuccessRoster(
      h.firestore as unknown as FirebaseFirestore.Firestore, "event-1");
    assert.deepEqual(beforeCheckIn.map((row) => [row.uid, row.status,
      row.source]), [["runner-1", "signedUp", "externalRuntime"]]);
    await assert.rejects(() => claimEventRuntimeAccessHandler(
      request("runner-2", claim), h.deps),
    (error) => code(error, "permission-denied"));
    const waitlistedClaim = await claimEventRuntimeAccessHandler(
      request("runner-2", claim, "+919876543211"), h.deps);
    assert.equal(waitlistedClaim.status, "needsInput");
    await submitEventRuntimeProfileHandler(request("runner-2", {...profile,
      sensitiveDataTermsVersion: "sensitive-runtime-v1"},
    "+919876543211"), h.deps);
    assert.deepEqual((await loadEventSuccessRoster(
      h.firestore as unknown as FirebaseFirestore.Firestore, "event-1"))
      .map((row) => row.uid), ["runner-1"]);
    await assert.rejects(() => checkInEventRuntimeHandler(
      request("runner-2", {publicRuntimeId: claim.publicRuntimeId,
        venueSessionToken}, "+919876543211"), h.deps),
    (error) => code(error, "failed-precondition"));
    const checkedIn = await checkInEventRuntimeHandler(
      request("runner-1", {publicRuntimeId: claim.publicRuntimeId,
        venueSessionToken}), h.deps);
    assert.equal(checkedIn.status, "checkedIn");
    const readyPool = await loadEventSuccessRoster(
      h.firestore as unknown as FirebaseFirestore.Firestore, "event-1");
    assert.deepEqual(readyPool.map((row) => [row.uid, row.status,
      row.source]), [["runner-1", "attended", "externalRuntime"]]);
    assert.equal(h.firestore.get("eventParticipations/event-1_runner-1"),
      undefined);
    assert.equal(h.firestore.get("organizerCommunicationPreferences/" +
      organizerCommunicationPreferenceId("organizer-1", "runner-1")),
    undefined);
    for (const collection of ["organizerCommunicationPreferences",
      "organizerCommunicationPermissionReceipts",
      "catchCommunicationPreferences",
      "catchCommunicationPermissionReceipts"]) {
      assert.equal(h.firestore.query(collection, []).length, 0,
        `${collection} must not be inferred from the imported ticket`);
    }
  });

test("unmatched numbers obey deny and Host approval policies", async () => {
  const denied = harness({"events/event-1": event()});
  await assert.rejects(
    () => claimEventRuntimeAccessHandler(request("runner-1", {
      publicRuntimeId: "runtime_123456789012345678901234",
      displayName: "Asha",
      runtimeTermsVersion: "event-runtime-v1",
    }), denied.deps),
    (error) => code(error, "permission-denied")
  );

  const pending = harness({
    "events/event-1": event({runtimeAccess: {
      enabled: true,
      publicRuntimeId: "runtime_123456789012345678901234",
      walkInPolicy: "hostApproval",
      termsVersion: "event-runtime-v1",
    }}),
  });
  const result = await claimEventRuntimeAccessHandler(request("runner-1", {
    publicRuntimeId: "runtime_123456789012345678901234",
    displayName: "Asha",
    runtimeTermsVersion: "event-runtime-v1",
  }), pending.deps);
  assert.equal(result.status, "pendingApproval");
  const claim = pending.firestore.get(
    "eventRuntimeClaimRequests/event-1_runner-1"
  );
  assert.equal(claim?.phoneLastFour, "3210");
  assert.equal(claim?.status, "pending");
});

test("profile submission requires sensitive consent and seeds only a draft",
  async () => {
    const requestId = requiredDataRequestId({mode: "live",
      eventId: "event-1", organizerId: "organizer-1"}, "attendee-1");
    const runtimeParticipant = participant({
      accessStatus: "needsInput",
      requiredFieldIds: ["displayName", "gender", "interestedInGenders"],
      completedFieldIds: ["displayName"],
      runtimeProfile: {
        ...(participant().runtimeProfile as FakeData),
        questionnaireAnswerIds: [],
      },
      readyAt: null,
    });
    const initial = {
      "events/event-1": event(),
      "eventRuntimeParticipants/event-1_runner-1": runtimeParticipant,
      "eventSuccessPlans/event-1": {
        selectedModuleIds: ["first_hello_check_in"],
      },
      [`eventRuntimeDataRequests/${requestId}`]: dataRequest([
        "gender", "interestedInGenders",
      ]),
    };
    const h = harness(initial);
    const payload = {
      publicRuntimeId: "runtime_123456789012345678901234",
      runtimeTermsVersion: "event-runtime-v1",
      saveAsCatchPrefill: true,
      fields: {
        gender: "woman",
        interestedInGenders: ["man"],
        questionnaireAnswerIds: ["event_energy_easy_conversation"],
      },
    };
    await assert.rejects(
      () => submitEventRuntimeProfileHandler(
        request("runner-1", payload), h.deps
      ),
      (error) => code(error, "failed-precondition")
    );
    const result = await submitEventRuntimeProfileHandler(
      request("runner-1", {
        ...payload,
        sensitiveDataTermsVersion: "sensitive-runtime-v1",
      }),
      h.deps
    );
    assert.equal(result.status, "ready");
    const draft = h.firestore.get("onboarding_drafts/runner-1");
    assert.equal(draft?.firstName, "Asha Shah");
    assert.equal(draft?.phoneNumber, "9876543210");
    assert.equal(draft?.gender, "woman");
    assert.equal(h.firestore.get("users/runner-1"), undefined);
    assert.deepEqual(h.firestore.get(
      "eventSuccessCompatibilityResponses/event-1_runner-1"
    )?.answerIds, ["event_energy_easy_conversation"]);
    const savedParticipant = h.firestore.get(
      "eventRuntimeParticipants/event-1_runner-1");
    assert.equal(savedParticipant?.profileRevision, 1);
    const completedRequest = h.firestore.get(
      `eventRuntimeDataRequests/${requestId}`);
    assert.equal(completedRequest?.status, "completed");
    assert.deepEqual(completedRequest?.completedFieldIds,
      ["gender", "interestedInGenders"]);
    assert.ok(completedRequest?.completedAt);
  });

test("profile submission rejects a neighboring format payload", async () => {
  const h = harness({
    "events/event-1": event(),
    "eventRuntimeParticipants/event-1_runner-1": participant(),
  });
  await assert.rejects(
    () => submitEventRuntimeProfileHandler(request("runner-1", {
      publicRuntimeId: "runtime_123456789012345678901234",
      runtimeTermsVersion: "event-runtime-v1",
      sensitiveDataTermsVersion: "sensitive-runtime-v1",
      saveAsCatchPrefill: false,
      fields: {paceBand: "moderate"},
    }), h.deps),
    (error) => code(error, "invalid-argument")
  );
});

test("quiz team name becomes the existing arrival group", async () => {
  const h = harness({
    "events/event-1": event({eventFormat: {
      version: 1,
      activityKind: "pubQuiz",
      interactionModel: "teamRotations",
    }}),
    "eventRuntimeParticipants/event-1_runner-1": participant({
      accessStatus: "needsInput",
      requiredFieldIds: ["displayName", "teamName"],
      completedFieldIds: ["displayName"],
      readyAt: null,
    }),
    "eventAttendees/attendee-1": attendee({linkedUid: "runner-1"}),
  });
  const result = await submitEventRuntimeProfileHandler(request("runner-1", {
    publicRuntimeId: "runtime_123456789012345678901234",
    runtimeTermsVersion: "event-runtime-v1",
    sensitiveDataTermsVersion: "sensitive-runtime-v1",
    saveAsCatchPrefill: false,
    fields: {teamName: "  Late   Entries  "},
  }), h.deps);
  assert.equal(result.status, "ready");
  assert.equal(
    h.firestore.get("eventAttendees/attendee-1")?.arrivalGroup,
    "Late Entries"
  );
});

test("bootstrap upgrades legacy demographic-gated participants", async () => {
  const h = harness({
    "events/event-1": event(),
    "eventSuccessPlans/event-1": {
      selectedModuleIds: ["first_hello_check_in"],
    },
    "eventRuntimeParticipants/event-1_runner-1": participant({
      accessStatus: "needsInput",
      requiredFieldIds: ["displayName", "gender", "interestedInGenders"],
      completedFieldIds: ["displayName"],
      runtimeProfile: {
        ...(participant().runtimeProfile as FakeData),
        questionnaireAnswerIds: ["event_energy_easy_conversation"],
      },
      readyAt: null,
    }),
    "eventAttendees/attendee-1": attendee({linkedUid: "runner-1"}),
  });
  const result = await getEventRuntimeBootstrapHandler(request(
    "runner-1",
    {publicRuntimeId: "runtime_123456789012345678901234"}
  ), h.deps);
  assert.equal(result.participant?.accessStatus, "ready");
  assert.deepEqual(result.participant?.requiredFieldIds, [
    "displayName",
    "questionnaireAnswerIds",
  ]);
  assert.deepEqual(result.event.optionalFieldIds, [
    "gender",
    "interestedInGenders",
  ]);
  assert.equal(h.firestore.get(
    "eventRuntimeParticipants/event-1_runner-1"
  )?.accessStatus, "ready");
});

test("ready runtime attendance checks in without a Consumer booking edge",
  async () => {
    const h = harness({
      "events/event-1": event({
        checkedInCount: 2,
        startTime: timestamp("2026-08-11T10:05:00.000Z"),
      }),
      "eventRuntimeParticipants/event-1_runner-1": participant(),
      "eventAttendees/attendee-1": attendee({
        linkedUid: "runner-1",
        status: "registered",
      }),
      [`eventVenueSessions/${venueSessionId}`]: {
        eventId: "event-1",
        organizerId: "organizer-1",
        createdBy: "host-1",
        issuedAt: timestamp("2026-08-11T09:59:00.000Z"),
        expiresAt: timestamp("2026-08-11T10:01:00.000Z"),
      },
    });

    const result = await checkInEventRuntimeHandler(request("runner-1", {
      publicRuntimeId: "runtime_123456789012345678901234",
      venueSessionToken,
    }), h.deps);

    assert.deepEqual(result, {
      status: "checkedIn",
      alreadyCheckedIn: false,
    });
    assert.equal(
      h.firestore.get("eventAttendees/attendee-1")?.status,
      "checkedIn"
    );
    assert.equal(
      h.firestore.get("eventParticipations/event-1_runner-1"),
      undefined
    );
  });

test("static runtime link cannot write attendance", async () => {
  const h = harness({
    "events/event-1": event({
      startTime: timestamp("2026-08-11T10:05:00.000Z"),
    }),
    "eventRuntimeParticipants/event-1_runner-1": participant(),
    "eventAttendees/attendee-1": attendee({
      linkedUid: "runner-1",
      status: "registered",
    }),
  });

  await assert.rejects(
    () => checkInEventRuntimeHandler(request("runner-1", {
      publicRuntimeId: "runtime_123456789012345678901234",
    }), h.deps),
    (error) => code(error, "invalid-argument")
  );
  assert.equal(h.firestore.get("eventAttendees/attendee-1")?.status,
    "registered");
});

test("venue session replay is rejected without a second attendance write",
  async () => {
    const redemptionId = eventVenueSessionRedemptionId({
      eventId: "event-1",
      sessionId: venueSessionId,
      uid: "runner-1",
    });
    const h = harness({
      "events/event-1": event({
        checkedInCount: 3,
        startTime: timestamp("2026-08-11T10:05:00.000Z"),
      }),
      "eventRuntimeParticipants/event-1_runner-1": participant(),
      "eventAttendees/attendee-1": attendee({
        linkedUid: "runner-1",
        status: "checkedIn",
      }),
      [`eventVenueSessions/${venueSessionId}`]: {
        eventId: "event-1",
        organizerId: "organizer-1",
        createdBy: "host-1",
        issuedAt: timestamp("2026-08-11T09:59:00.000Z"),
        expiresAt: timestamp("2026-08-11T10:01:00.000Z"),
      },
      [`eventVenueSessionRedemptions/${redemptionId}`]: {
        eventId: "event-1",
        sessionId: venueSessionId,
        uid: "runner-1",
        purpose: "attendance",
      },
    });

    await assert.rejects(
      () => checkInEventRuntimeHandler(request("runner-1", {
        publicRuntimeId: "runtime_123456789012345678901234",
        venueSessionToken,
      }), h.deps),
      (error) => code(error, "already-exists")
    );
    assert.equal(h.firestore.get("events/event-1")?.checkedInCount, 3);
  });

test("Host approval binds only a candidate from the same event", async () => {
  const attendeeId = eventAttendeeId(
    "event-1",
    "phone:+919876543210"
  );
  const h = harness({
    "events/event-1": event(),
    "organizers/organizer-1": organizer(),
    [`eventAttendees/${attendeeId}`]: attendee({status: "invited"}),
    "eventRuntimeParticipants/event-1_runner-1": participant({
      eventAttendeeId: attendeeId,
      accessStatus: "pendingApproval",
      readyAt: null,
    }),
    "eventRuntimeClaimRequests/event-1_runner-1": {
      eventId: "event-1",
      organizerId: "organizer-1",
      uid: "runner-1",
      displayName: "Asha Shah",
      phoneLastFour: "3210",
      candidateAttendeeIds: [attendeeId],
      status: "pending",
      reviewedBy: null,
      reviewReason: null,
      createdAt: timestamp(),
      updatedAt: timestamp(),
      reviewedAt: null,
    },
  });
  await assert.rejects(
    () => approveEventRuntimeClaimHandler(request("host-1", {
      eventId: "event-1",
      uid: "runner-1",
      decision: "approve",
      attendeeId: "attendee-from-another-event",
    }), h.deps),
    (error) => code(error, "invalid-argument")
  );
  const result = await approveEventRuntimeClaimHandler(request("host-1", {
    eventId: "event-1",
    uid: "runner-1",
    decision: "approve",
    attendeeId,
  }), h.deps);
  assert.deepEqual(result, {status: "approved"});
  assert.equal(h.firestore.get(`eventAttendees/${attendeeId}`)?.linkedUid,
    "runner-1");
  assert.equal(h.firestore.get(
    "eventRuntimeClaimRequests/event-1_runner-1"
  )?.status, "approved");
});

test("runtime participant ids are deterministic and event scoped", () => {
  assert.equal(eventRuntimeParticipantId("event-1", "runner-1"),
    "event-1_runner-1");
});
