import assert from "node:assert/strict";
import test from "node:test";
import {CallableRequest, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {
  cancelEventHandler,
  createEventHandler,
  deleteEventHandler,
  updateEventHandler,
} from "./mutateEvent";
import {deriveEventSeatPolicy} from "./seatAuthority/firestoreAdapter";
import type {FcmParams} from "../shared/notifications";
import {EVENT_PLAN_CHANGES, eventPlanChangeSourceId} from
  "./planChangeRecords";

import {requireCatchBookingAuthority} from "./eventOrigin";
import type {EventDocument} from "../shared/generated/firestoreAdminTypes";

type FakeData = Record<string, unknown>;

class FakeDocRef {
  constructor(readonly firestore: FakeFirestore, readonly path: string) {}

  get id(): string {
    return this.path.split("/").at(-1) ?? "";
  }

  async get(): Promise<FakeSnapshot> {
    return new FakeSnapshot(this.firestore, this.path);
  }

  async set(data: FakeData, _options?: {merge: boolean}) {
    void _options;
    this.firestore.merge(this.path, data);
  }

  collection(collectionPath: string) {
    return new FakeCollectionRef(
      this.firestore,
      `${this.path}/${collectionPath}`
    );
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
  autoId = 0;

  constructor(private readonly docs: Record<string, FakeData | undefined>) {}

  collection(collectionPath: string) {
    return new FakeCollectionRef(this, collectionPath);
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

  merge(path: string, data: FakeData) {
    this.docs[path] = {...(this.docs[path] ?? {}), ...data};
  }

  query(
    collectionPath: string,
    filters: Array<{field: string; operator: string; value: unknown}>
  ): FakeSnapshot[] {
    const prefix = `${collectionPath}/`;
    return Object.entries(this.docs)
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
          throw new Error(
            `Unsupported fake query operator: ${filter.operator}`
          );
        });
      });
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
    private readonly limitCount?: number
  ) {}

  doc(docId?: string) {
    const id = docId ?? `auto-${++this.firestore.autoId}`;
    return new FakeDocRef(this.firestore, `${this.path}/${id}`);
  }

  where(field: string, operator: string, value: unknown) {
    if (operator !== "==" && operator !== "in") {
      throw new Error(`Unsupported fake query operator: ${operator}`);
    }
    return new FakeCollectionRef(this.firestore, this.path, [
      ...this.filters,
      {field, operator, value},
    ], this.limitCount);
  }

  limit(count: number) {
    return new FakeCollectionRef(
      this.firestore,
      this.path,
      this.filters,
      count
    );
  }

  async get() {
    const docs = this.firestore.query(this.path, this.filters);
    const limitedDocs =
      this.limitCount === undefined ? docs : docs.slice(0, this.limitCount);
    return {
      docs: limitedDocs,
      empty: limitedDocs.length === 0,
    };
  }
}

class FakeTransaction {
  private readonly writes: Array<() => void> = [];

  constructor(private readonly firestore: FakeFirestore) {}

  async get(
    ref: FakeDocRef | FakeCollectionRef
  ): Promise<FakeSnapshot | {docs: FakeSnapshot[]; empty: boolean}> {
    assert.equal(this.writes.length, 0, "Transaction read after write");
    if (ref instanceof FakeCollectionRef) {
      return ref.get();
    }
    return new FakeSnapshot(this.firestore, ref.path);
  }

  create(ref: FakeDocRef, data: FakeData) {
    this.writes.push(() => {
      if (this.firestore.get(ref.path) !== undefined) {
        throw new Error(`Doc already exists: ${ref.path}`);
      }
      this.firestore.set(ref.path, data);
    });
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

  set(ref: FakeDocRef, data: FakeData, _options?: {merge: boolean}) {
    void _options;
    this.writes.push(() => {
      this.firestore.set(ref.path, data);
    });
  }

  delete(ref: FakeDocRef) {
    this.writes.push(() => {
      this.firestore.set(ref.path, undefined as unknown as FakeData);
    });
  }

  commit() {
    for (const write of this.writes) write();
  }
}

function harness(initialDocs: Record<string, FakeData | undefined>) {
  const firestore = new FakeFirestore(initialDocs);
  const rateLimitCalls: string[] = [];
  const notifications: FcmParams[] = [];
  const deletedStoragePaths: string[] = [];
  return {
    firestore,
    rateLimitCalls,
    notifications,
    deletedStoragePaths,
    deps: {
      firestore: () =>
        firestore as unknown as FirebaseFirestore.Firestore,
      timestampFromMillis: (millis: number) =>
        admin.firestore.Timestamp.fromMillis(millis),
      nowTimestamp: () => ts("2026-05-01T00:00:00.000Z"),
      checkRateLimit: async (
        _db: FirebaseFirestore.Firestore,
        uid: string,
        action: string
      ) => {
        rateLimitCalls.push(`${uid}:${action}`);
      },
      sendNotification: async (notification: FcmParams) => {
        notifications.push(notification);
      },
      serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
      runtimePublicId: () => "runtime_123456789012345678901234",
      deleteStoragePaths: async (paths: string[]) => {
        deletedStoragePaths.push(...paths);
      },
    },
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

function organizer(overrides: FakeData = {}): FakeData {
  return {
    hostUserId: "host-1",
    hostUserIds: ["host-1"],
    hostProfiles: [],
    location: "in-mh-mumbai",
    locationCityId: "in-mh-mumbai",
    locationMarketId: "in-mh-mumbai",
    ...overrides,
  };
}

function event(overrides: FakeData = {}): FakeData {
  return {
    organizerId: "club-1",
    startTime: ts("2026-05-02T01:30:00.000Z"),
    endTime: ts("2026-05-02T02:30:00.000Z"),
    meetingPoint: "Carter Road",
    meetingLocation: {
      name: "Carter Road",
      address: null,
      placeId: null,
      latitude: 19.07,
      longitude: 72.82,
      notes: null,
    },
    startingPointLat: 19.07,
    startingPointLng: 72.82,
    locationDetails: null,
    distanceKm: 5,
    pace: "easy",
    capacityLimit: 20,
    description: "Easy seaside event.",
    priceInPaise: 0,
    status: "active",
    cancelledAt: null,
    cancellationReason: null,
    constraints: {minAge: 0, maxAge: 99, maxMen: null, maxWomen: null},
    genderCounts: {},
    cohortCounts: {},
    waitlistedCohortCounts: {},
    ...overrides,
  };
}

function uploadedEventPhoto(id: string, position: number): FakeData {
  return {
    id,
    url: `https://example.com/${id}.jpg`,
    storagePath: `events/event-1/media/${id}/original.jpg`,
    thumbnailUrl: `https://example.com/${id}-thumb.jpg`,
    thumbnailStoragePath: `events/event-1/media/${id}/thumbnail.jpg`,
    position,
    createdAt: {_seconds: 1, _nanoseconds: 0},
    updatedAt: {_seconds: 1, _nanoseconds: 0},
  };
}

function payload(overrides: FakeData = {}): FakeData {
  return {
    eventId: "event-1",
    organizerId: "club-1",
    name: "Sunrise Social 5K",
    startTimeMillis: Date.parse("2026-05-02T01:30:00.000Z"),
    endTimeMillis: Date.parse("2026-05-02T02:30:00.000Z"),
    meetingPoint: "Carter Road",
    meetingLocation: {
      name: "Carter Road",
      address: null,
      placeId: null,
      latitude: 19.07,
      longitude: 72.82,
      notes: null,
    },
    startingPointLat: 19.07,
    startingPointLng: 72.82,
    locationDetails: null,
    distanceKm: 5,
    pace: "easy",
    capacityLimit: 20,
    description: "Easy seaside event.",
    priceInPaise: 0,
    constraints: {minAge: 21, maxAge: 35, maxMen: 10, maxWomen: null},
    ...overrides,
  };
}

function ts(iso: string): FirebaseFirestore.Timestamp {
  return admin.firestore.Timestamp.fromDate(new Date(iso));
}

function assertHttpsCode(error: unknown, code: string): boolean {
  return error instanceof HttpsError && error.code === code;
}

test("createEventHandler creates a server-owned event for the club host",
  async () => {
    const h = harness({"organizers/club-1": organizer()});

    const result = await createEventHandler(
      request("host-1", payload()),
      h.deps
    );

    assert.deepEqual(result, {eventId: "event-1"});
    assert.deepEqual(h.rateLimitCalls, ["host-1:createEvent"]);
    assert.deepEqual(h.firestore.get("events/event-1"), {
      organizerId: "club-1",
      name: "Sunrise Social 5K",
      publicationState: "published",
      eventOrigin: {
        mode: "catchNative",
        bookingAuthority: "catch",
        rosterAuthority: "catchProjection",
        provider: "catch",
        externalEventId: null,
        externalEventUrl: null,
        sourceExternalEventId: null,
        adapterVersion: null,
        connectedAt: null,
        connectedBy: null,
      },
      runtimeAccess: {
        enabled: false,
        publicRuntimeId: null,
        walkInPolicy: "deny",
        termsVersion: "event-runtime-v1",
      },
      startTime: ts("2026-05-02T01:30:00.000Z"),
      endTime: ts("2026-05-02T02:30:00.000Z"),
      meetingPoint: "Carter Road",
      meetingLocation: {
        name: "Carter Road",
        address: null,
        placeId: null,
        latitude: 19.07,
        longitude: 72.82,
        notes: null,
      },
      startingPointLat: 19.07,
      startingPointLng: 72.82,
      locationDetails: null,
      itinerary: [],
      photoUrl: null,
      eventPhotos: [],
      eventFormat: {
        version: 1,
        activityKind: "socialRun",
        interactionModel: "pacePods",
      },
      distanceKm: 5,
      pace: "easy",
      capacityLimit: 20,
      description: "Easy seaside event.",
      discoveryCityName: "mumbai",
      discoveryMarketId: "in-mh-mumbai",
      discoveryActivityKind: "socialRun",
      discoveryGeoCell: "238:910",
      discoveryHasOpenSpots: true,
      discoveryAvailability: "open",
      discoveryOpenCohorts: [
        "menInterestedInWomen",
        "womenInterestedInMen",
        "queerOrOpen",
        "nonBinaryOrOther",
      ],
      discoveryWaitlistCohorts: [],
      discoveryInviteRequired: false,
      discoveryMembershipRequired: false,
      discoveryManualApprovalRequired: false,
      discoveryMinAge: 21,
      discoveryMaxAge: 35,
      priceInPaise: 0,
      currency: "INR",
      bookedCount: 0,
      crossPathsPairHeldCount: 0,
      crossPathsPairConfirmedCount: 0,
      crossPathsPairHeldCohortCounts: {},
      checkedInCount: 0,
      waitlistedCount: 0,
      status: "active",
      cancelledAt: null,
      cancellationReason: null,
      constraints: {minAge: 21, maxAge: 35, maxMen: 10, maxWomen: null},
      eventPolicy: {
        version: 2,
        admission: {
          format: "fixedCohortCaps",
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
          cohortCapacityLimits: {menInterestedInWomen: 10},
          balancedRatioPolicy: null,
          crossPathsPairInventory: {
            enabled: false,
            reservedPairCapacity: 0,
            holdDurationMinutes: 15,
          },
        },
        pricing: {
          basePriceInPaise: 0,
          cohortAdjustmentsInPaise: {},
          demandPricingRules: [],
        },
        cancellation: {policyId: "notApplicable"},
        settlement: {hostPayoutTiming: "afterEventCompletion"},
      },
      genderCounts: {},
      cohortCounts: {},
      waitlistedCohortCounts: {},
    });
  }
);

test("createEventHandler persists only valid itinerary and route combinations",
  async () => {
    const itinerary = [
      {
        id: "gather",
        kind: "gather",
        offsetMinutes: 0,
        durationMinutes: 10,
        title: "  Gather at Carter Road  ",
      },
      {
        id: "run",
        kind: "activity",
        offsetMinutes: 10,
        title: "Social 5K",
        routeDistanceMeters: 5000,
      },
    ];
    const eventFormat = {
      version: 1,
      activityKind: "socialRun",
      interactionModel: "pacePods",
      activityDetails: {
        routePlan: {
          version: 2,
          movementMode: "run",
          routeShape: "loop",
          groupStrategy: "paceGroups",
          stopCadence: "continuous",
          stopKinds: ["water", "regroup"],
          roleKinds: ["routeLead", "sweep", "pacer"],
          path: [
            {latitude: 19.0608, longitude: 72.8365},
            {latitude: 19.0641, longitude: 72.8412},
          ],
          liveTrackingPolicy: {
            mode: "hostOnly",
            staleAfterSeconds: 120,
            retentionMinutes: 60,
          },
        },
      },
    };
    const h = harness({"organizers/club-1": organizer()});

    await createEventHandler(
      request("host-1", payload({itinerary, eventFormat})),
      h.deps
    );

    assert.deepEqual(h.firestore.get("events/event-1")?.itinerary, [
      {...itinerary[0], title: "Gather at Carter Road", description: null,
        location: null, routeDistanceMeters: null},
      {...itinerary[1], durationMinutes: null, description: null,
        location: null},
    ]);

    const duplicateHarness = harness({"organizers/club-1": organizer()});
    await assert.rejects(
      () => createEventHandler(
        request("host-1", payload({
          itinerary: [itinerary[0], {...itinerary[1], id: "gather"}],
          eventFormat,
        })),
        duplicateHarness.deps
      ),
      (error) => assertHttpsCode(error, "invalid-argument")
    );

    const missingPathHarness = harness({"organizers/club-1": organizer()});
    await assert.rejects(
      () => createEventHandler(
        request("host-1", payload({itinerary})),
        missingPathHarness.deps
      ),
      (error) => assertHttpsCode(error, "invalid-argument")
    );
  }
);

test("createEventHandler accepts client event-policy snapshots", async () => {
  const h = harness({"organizers/club-1": organizer()});

  const eventPolicy = {
    version: 1,
    admission: {
      format: "balancedRatio",
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
      balancedRatioPolicy: {
        leftCohortId: "menInterestedInWomen",
        rightCohortId: "womenInterestedInMen",
        maxSkew: 1,
        openingBufferPerCohort: 1,
        outOfRatioCohortPolicy: "admitWithinGeneralCapacity",
      },
      crossPathsPairInventory: {
        enabled: false,
        reservedPairCapacity: 0,
        holdDurationMinutes: 15,
      },
    },
    pricing: {
      basePriceInPaise: 40000,
      cohortAdjustmentsInPaise: {},
      demandPricingRules: [],
    },
    cancellation: {policyId: "strict"},
    settlement: {hostPayoutTiming: "afterEventCompletion"},
  };

  const result = await createEventHandler(
    request("host-1", payload({
      capacityLimit: 20,
      priceInPaise: 40000,
      constraints: {minAge: 0, maxAge: 99, maxMen: null, maxWomen: null},
      eventPolicy,
    })),
    h.deps
  );

  assert.deepEqual(result, {eventId: "event-1"});
  assert.deepEqual(h.firestore.get("events/event-1")?.eventPolicy, {
    ...eventPolicy,
    version: 2,
  });
  assert.equal(h.firestore.get("events/event-1")?.priceInPaise, 40000);
  assert.equal(h.firestore.get("events/event-1")?.capacityLimit, 20);
});

test("createEventHandler creates event success plans atomically", async () => {
  const h = harness({"organizers/club-1": organizer()});

  await createEventHandler(
    request("host-1", payload({
      eventSuccessDefaults: {
        enabled: true,
        playbookId: "social_run_light",
        selectedModuleIds: [
          "social_missions",
          "qr_check_in",
          "micro_pods",
          "host_analytics",
          "decomposed_feedback",
        ],
        structureConfig: {
          unitKind: "wholeGroup",
          unitSize: 20,
          unitCount: 1,
          rotationIntervalMinutes: null,
          revealCountdownSeconds: 10,
        },
        hostGoal: "Help everyone meet two new people.",
        wingmanRequestsEnabled: true,
        contextualOpenersEnabled: true,
        compatibilityAffectsRanking: false,
        questionnaireConfig: {templateId: "balanced"},
        attendeePrompt: "Ask what route they want to try next.",
      },
    })),
    h.deps
  );

  const eventDoc = h.firestore.get("events/event-1");
  const plan = h.firestore.get("eventSuccessPlans/event-1");
  assert.equal(eventDoc?.organizerId, "club-1");
  assert.deepEqual(eventDoc?.runtimeAccess, {
    enabled: true,
    publicRuntimeId: "runtime_123456789012345678901234",
    walkInPolicy: "deny",
    termsVersion: "event-runtime-v1",
  });
  assert.equal(plan?.eventId, "event-1");
  assert.equal(plan?.organizerId, "club-1");
  assert.equal(plan?.playbookId, "social_run_light");
  assert.deepEqual(plan?.selectedModuleIds, [
    "decomposed_feedback",
    "host_analytics",
    "micro_pods",
    "qr_check_in",
    "social_missions",
  ]);
  assert.equal(plan?.targetAttendeeCount, 20);
  assert.equal(plan?.hostGoal, "Help everyone meet two new people.");
  assert.equal(plan?.wingmanRequestsEnabled, false);
  assert.equal(plan?.contextualOpenersEnabled, false);
  assert.equal(plan?.compatibilityAffectsRanking, false);
  assert.equal(plan?.attendeePrompt, "Ask what route they want to try next.");
  assert.equal(plan?.status, "setup");
  assert.equal(plan?.createdAt, plan?.updatedAt);
});

test("createEventHandler creates companion-only external events", async () => {
  const h = harness({"organizers/club-1": organizer()});

  await createEventHandler(request("host-1", payload({
    priceInPaise: 40000,
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
      },
      pricing: {
        basePriceInPaise: 40000,
        cohortAdjustmentsInPaise: {},
        demandPricingRules: [],
      },
      cancellation: {policyId: "strict"},
      settlement: {hostPayoutTiming: "afterEventCompletion"},
    },
    externalOrigin: {
      provider: "luma",
      externalEventId: "evt_luma_123",
      externalEventUrl: "https://lu.ma/example",
      sourceExternalEventId: "evt_luma_123",
      adapterVersion: "luma-csv-v1",
    },
    runtimeWalkInPolicy: "hostApproval",
    eventSuccessDefaults: {enabled: true},
  })), h.deps);

  const created = h.firestore.get("events/event-1");
  assert.deepEqual(created?.eventOrigin, {
    mode: "externalCompanion",
    bookingAuthority: "external",
    rosterAuthority: "hostImport",
    provider: "luma",
    externalEventId: "evt_luma_123",
    externalEventUrl: "https://lu.ma/example",
    sourceExternalEventId: "evt_luma_123",
    adapterVersion: "luma-csv-v1",
    connectedAt: ts("2026-05-01T00:00:00.000Z"),
    connectedBy: "host-1",
  });
  assert.equal((created?.runtimeAccess as FakeData).enabled, true);
  assert.equal(
    (created?.runtimeAccess as FakeData).walkInPolicy,
    "hostApproval"
  );
  assert.equal(created?.priceInPaise, 0);
  assert.equal(
    ((created?.eventPolicy as FakeData).pricing as FakeData).basePriceInPaise,
    0
  );
  assert.equal(
    ((created?.eventPolicy as FakeData).cancellation as FakeData).policyId,
    "notApplicable"
  );
});

test("createEventHandler rejects external events without runtime tooling",
  async () => {
    const h = harness({"organizers/club-1": organizer()});
    await assert.rejects(
      () => createEventHandler(request("host-1", payload({
        externalOrigin: {provider: "generic"},
      })), h.deps),
      (error) => assertHttpsCode(error, "failed-precondition")
    );
  });

test(
  "createEventHandler derives event success booleans from modules",
  async () => {
    const h = harness({"organizers/club-1": organizer()});

    await createEventHandler(
      request("host-1", payload({
        eventSuccessDefaults: {
          enabled: true,
          selectedModuleIds: [
            "qr_check_in",
            "wingman_requests",
            "contextual_openers",
            "compatibility_questionnaire",
          ],
          wingmanRequestsEnabled: false,
          contextualOpenersEnabled: false,
          compatibilityAffectsRanking: true,
        },
      })),
      h.deps
    );

    const plan = h.firestore.get("eventSuccessPlans/event-1");
    assert.equal(plan?.wingmanRequestsEnabled, true);
    assert.equal(plan?.contextualOpenersEnabled, true);
    assert.equal(plan?.compatibilityAffectsRanking, true);
  }
);

test("createEventHandler defaults pub quiz teams from capacity", async () => {
  const h = harness({"organizers/club-1": organizer()});

  await createEventHandler(
    request("host-1", payload({
      capacityLimit: 50,
      distanceKm: 0,
      eventFormat: {
        version: 1,
        activityKind: "pubQuiz",
        interactionModel: "teamRotations",
        defaultPlaybookId: "pub_quiz_team_mixer",
      },
      eventSuccessDefaults: {
        enabled: true,
        playbookId: "pub_quiz_team_mixer",
        selectedModuleIds: ["qr_check_in", "micro_pods", "live_reveal"],
        structureConfig: {
          unitKind: "teams",
          unitSize: 5,
          unitCount: 3,
          rotationIntervalMinutes: null,
          revealCountdownSeconds: 10,
        },
        hostGoal: "Balance trivia teams.",
      },
    })),
    h.deps
  );

  const plan = h.firestore.get("eventSuccessPlans/event-1");
  assert.equal(plan?.targetAttendeeCount, 50);
  assert.deepEqual(plan?.structureConfig, {
    unitKind: "teams",
    unitSize: 5,
    unitCount: null,
    rotationIntervalMinutes: null,
    revealCountdownSeconds: 10,
  });
});

test("createEventHandler uses event-success primitives for custom formats",
  async () => {
    const h = harness({"organizers/club-1": organizer()});

    await createEventHandler(
      request("host-1", payload({
        capacityLimit: 40,
        distanceKm: 0,
        eventFormat: {
          version: 1,
          activityKind: "openActivity",
          interactionModel: "openFormat",
          customActivityLabel: "Trivia night",
          eventSuccessPrimitives: {
            phoneAvailability: "plannedPauses",
            rotationSuitability: "plannedBreaks",
            assignmentAlgorithm: "teamBalancer",
            compatibilityPolicy: "questionnaireClueOnly",
            matchingObjective: "spread",
            unitOutcome: "score",
            durationShape: "courses",
          },
        },
        eventSuccessDefaults: {
          enabled: true,
          hostGoal: "Balance trivia teams.",
        },
      })),
      h.deps
    );

    const eventDoc = h.firestore.get("events/event-1");
    const plan = h.firestore.get("eventSuccessPlans/event-1");
    assert.deepEqual(eventDoc?.eventFormat, {
      version: 1,
      activityKind: "openActivity",
      interactionModel: "openFormat",
      customActivityLabel: "Trivia night",
      eventSuccessPrimitives: {
        phoneAvailability: "plannedPauses",
        rotationSuitability: "plannedBreaks",
        assignmentAlgorithm: "teamBalancer",
        compatibilityPolicy: "questionnaireClueOnly",
        matchingObjective: "spread",
        unitOutcome: "score",
        durationShape: "courses",
      },
    });
    assert.equal(plan?.playbookId, "pub_quiz_team_mixer");
    assert.deepEqual(plan?.selectedModuleIds, [
      "contextual_openers",
      "decomposed_feedback",
      "host_analytics",
      "host_script",
      "live_reveal",
      "micro_pods",
      "social_missions",
      "wingman_requests",
    ]);
    assert.deepEqual(plan?.structureConfig, {
      unitKind: "teams",
      unitSize: 5,
      unitCount: null,
      rotationIntervalMinutes: null,
      revealCountdownSeconds: 10,
    });
    assert.equal(plan?.compatibilityAffectsRanking, false);
  }
);

test("createEventHandler rejects orphan-prone event success plan conflicts",
  async () => {
    const h = harness({
      "organizers/club-1": organizer(),
      "eventSuccessPlans/event-1": {eventId: "event-1"},
    });

    await assert.rejects(
      () => createEventHandler(
        request("host-1", payload({
          eventSuccessDefaults: {
            enabled: true,
            playbookId: "social_run_light",
            selectedModuleIds: ["qr_check_in"],
            hostGoal: "Help attendees meet.",
          },
        })),
        h.deps
      ),
      (error) => assertHttpsCode(error, "already-exists")
    );
    assert.equal(h.firestore.get("events/event-1"), undefined);
  }
);

test("createEventHandler stores invite codes in host-private access docs",
  async () => {
    const h = harness({"organizers/club-1": organizer()});
    const eventPolicy = {
      version: 1,
      admission: {
        format: "inviteOnly",
        capacityLimit: 12,
        waitlistPolicy: {mode: "rankedOffer", offerWindowMinutes: 20},
        inviteRequired: true,
        membershipRequired: false,
        manualApprovalRequired: false,
        privateAccessPolicy: {
          mode: "inviteCode",
          inviteCodeHint: "CA...HI",
          privateLinkEnabled: true,
        },
        cohortCapacityLimits: {},
        balancedRatioPolicy: null,
        crossPathsPairInventory: {
          enabled: false,
          reservedPairCapacity: 0,
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

    const result = await createEventHandler(
      request("host-1", payload({
        capacityLimit: 12,
        constraints: {minAge: 0, maxAge: 99, maxMen: null, maxWomen: null},
        eventPolicy,
        privateAccess: {inviteCode: " CATCH-DELHI "},
      })),
      h.deps
    );

    const createdEvent = h.firestore.get("events/event-1");
    const privateAccess = h.firestore.get("eventPrivateAccess/event-1");
    assert.deepEqual(result, {eventId: "event-1"});
    assert.deepEqual(createdEvent?.eventPolicy, {
      ...eventPolicy,
      version: 2,
      cancellation: {policyId: "notApplicable"},
    });
    assert.equal(JSON.stringify(createdEvent).includes("CATCH-DELHI"), false);
    assert.equal(privateAccess?.eventId, "event-1");
    assert.equal(privateAccess?.organizerId, "club-1");
    assert.equal(privateAccess?.inviteCode, "CATCH-DELHI");
    assert.notEqual(privateAccess?.createdAt, undefined);
  }
);

test("createEventHandler accepts an uploaded event photo URL", async () => {
  const h = harness({"organizers/club-1": organizer()});

  await createEventHandler(
    request("host-1", payload({
      photoUrl: "https://img.example/events/event-1.jpg",
    })),
    h.deps
  );

  assert.equal(
    h.firestore.get("events/event-1")?.photoUrl,
    "https://img.example/events/event-1.jpg"
  );
});

test("createEventHandler notifies active club members about a new event",
  async () => {
    const h = harness({
      "organizers/club-1": organizer({name: "Indore Striders"}),
      "organizerFollows/club-1_host-1": {
        organizerId: "club-1",
        uid: "host-1",
        status: "active",
      },
      "organizerFollows/club-1_runner-1": {
        organizerId: "club-1",
        uid: "runner-1",
        status: "active",
        pushNotificationsEnabled: true,
      },
      "organizerFollows/club-1_runner-2": {
        organizerId: "club-1",
        uid: "runner-2",
        status: "active",
        pushNotificationsEnabled: false,
      },
      "organizerFollows/club-1_runner-3": {
        organizerId: "club-1",
        uid: "runner-3",
        status: "left",
      },
      "users/runner-1": {fcmToken: "token-1", prefsOrganizerUpdates: true},
      "users/runner-2": {fcmToken: "token-2", prefsOrganizerUpdates: true},
      "users/runner-3": {fcmToken: "token-3", prefsOrganizerUpdates: true},
    });

    await createEventHandler(request("host-1", payload()), h.deps);

    const runner1Notification = h.firestore.get(
      "notifications/runner-1/items/organizerUpdate_event-1"
    );
    const runner2Notification = h.firestore.get(
      "notifications/runner-2/items/organizerUpdate_event-1"
    );
    const hostNotification = h.firestore.get(
      "notifications/host-1/items/organizerUpdate_event-1"
    );
    const leftMemberNotification = h.firestore.get(
      "notifications/runner-3/items/organizerUpdate_event-1"
    );

    assert.equal(runner1Notification?.uid, "runner-1");
    assert.equal(runner1Notification?.type, "organizerUpdate");
    assert.equal(runner1Notification?.title, "Indore Striders posted an event");
    assert.equal(runner1Notification?.body, "5 km from Carter Road.");
    assert.equal(runner1Notification?.eventId, "event-1");
    assert.equal(runner1Notification?.organizerId, "club-1");
    assert.equal(runner1Notification?.organizerId, "club-1");
    assert.equal(runner1Notification?.readAt, null);
    assert.equal(runner2Notification?.uid, "runner-2");
    assert.equal(hostNotification, undefined);
    assert.equal(leftMemberNotification, undefined);
    assert.deepEqual(h.notifications, [{
      token: "token-1",
      title: "Indore Striders posted an event",
      body: "5 km from Carter Road.",
      type: "organizerUpdate",
      eventId: "event-1",
      organizerId: "club-1",
    }]);
  }
);

test("createEventHandler rejects unsafe creation states", async () => {
  const h = harness({
    "organizers/club-1": organizer(),
    "events/existing": event(),
    "deletedUsers/deleted-host": {deletedAt: "now"},
  });

  await assert.rejects(
    () => createEventHandler(request(null, payload()), h.deps),
    (error) => assertHttpsCode(error, "unauthenticated")
  );
  await assert.rejects(
    () => createEventHandler(request("host-1", payload({
      eventId: "existing",
    })), h.deps),
    (error) => assertHttpsCode(error, "already-exists")
  );
  await assert.rejects(
    () => createEventHandler(request("runner-1", payload()), h.deps),
    (error) => assertHttpsCode(error, "permission-denied")
  );
  await assert.rejects(
    () => createEventHandler(request("deleted-host", payload()), h.deps),
    (error) => assertHttpsCode(error, "failed-precondition")
  );
  await assert.rejects(
    () => createEventHandler(request("host-1", payload({
      startingPointLng: null,
    })), h.deps),
    (error) => assertHttpsCode(error, "invalid-argument")
  );
});

test("createEventHandler rejects club schedule conflicts", async () => {
  const h = harness({
    "organizers/club-1": organizer(),
    "events/overlapping": event({
      startTime: ts("2026-05-02T01:00:00.000Z"),
      endTime: ts("2026-05-02T02:00:00.000Z"),
    }),
  });

  await assert.rejects(
    () => createEventHandler(request("host-1", payload()), h.deps),
    (error) => assertHttpsCode(error, "failed-precondition")
  );
});

test("private basics have no interval but malformed public schedules fail",
  async () => {
    const privateSetup = harness({
      "organizers/club-1": organizer(),
      "events/private-basics": event({endTime: undefined,
        publicationState: "private", setupRevision: 1}),
    });
    await createEventHandler(request("host-1", payload()), privateSetup.deps);
    assert.ok(privateSetup.firestore.get("events/event-1"));

    const malformedPublic = harness({
      "organizers/club-1": organizer(),
      "events/malformed-public": event({endTime: undefined,
        publicationState: "published"}),
    });
    await assert.rejects(
      createEventHandler(request("host-1", payload()), malformedPublic.deps),
      (error) => assertHttpsCode(error, "failed-precondition")
    );
    assert.equal(malformedPublic.firestore.get("events/event-1"), undefined);
  });

test("createEventHandler allows adjacent club schedules", async () => {
  const h = harness({
    "organizers/club-1": organizer(),
    "events/adjacent": event({
      startTime: ts("2026-05-02T02:30:00.000Z"),
      endTime: ts("2026-05-02T03:30:00.000Z"),
    }),
  });

  await createEventHandler(request("host-1", payload()), h.deps);

  assert.equal(h.firestore.get("events/event-1")?.organizerId, "club-1");
});

test("createEventHandler rejects events over the shared max duration", async (
) => {
  const h = harness({"organizers/club-1": organizer()});

  await assert.rejects(
    () => createEventHandler(request("host-1", payload({
      startTimeMillis: Date.parse("2026-05-02T01:30:00.000Z"),
      endTimeMillis: Date.parse("2026-05-02T05:31:00.000Z"),
    })), h.deps),
    (error) => assertHttpsCode(error, "invalid-argument")
  );
});

test("legacy rich mutations cannot edit progressive private basics",
  async () => {
    const h = harness({
      "organizers/club-1": organizer(),
      "events/event-1": {organizerId: "club-1", name: "Private basics", status: "active", publicationState: "private",
        setupRevision: 1, startTime: ts("2026-05-02T01:30:00.000Z")},
    });
    const changes = [
      updateEventHandler(request("host-1", {eventId: "event-1",
        fields: {name: "Public by accident"}}), h.deps),
      cancelEventHandler(request("host-1", {eventId: "event-1"}), h.deps),
      deleteEventHandler(request("host-1", {eventId: "event-1"}), h.deps),
    ];
    for (const change of changes) {
      await assert.rejects(change,
        (error) => assertHttpsCode(error, "failed-precondition"));
    }
    assert.equal(h.firestore.get("events/event-1")?.publicationState,
      "private");
    assert.equal(h.notifications.length, 0);
  });

function publishedProgressiveEvent(overrides: FakeData = {}): FakeData {
  return event({name: "Sunday run", publicationState: "published",
    setupRevision: 4, eventCityId: "in-mh-mumbai",
    eventMarketId: "in-mh-mumbai", eventLocalDate: "2026-05-02",
    eventLocalStartTime: "07:00", eventTimezone: "Asia/Kolkata",
    setupDefaults: {city: {value: {cityId: "in-mh-mumbai",
      marketId: "in-mh-mumbai"}, source: "event"},
    timezone: {value: "Asia/Kolkata", source: "event"},
    organizerDefaultsRevision: null, organizerDefaultsHash: "a".repeat(64)},
    ...overrides});
}

test("published progressive editing requires the current setup revision",
  async () => {
    for (const expectedSetupRevision of [undefined, 3, 5]) {
      const h = harness({"organizers/club-1": organizer(),
        "events/event-1": publishedProgressiveEvent()});
      await assert.rejects(updateEventHandler(request("host-1", {
        eventId: "event-1", ...(expectedSetupRevision === undefined ? {} :
          {expectedSetupRevision}), fields: {description: "New notes"},
      }), h.deps), (error) => assertHttpsCode(error, "aborted"));
      assert.equal(h.firestore.get("events/event-1")?.setupRevision, 4);
      assert.equal(h.firestore.get("events/event-1")?.description,
        "Easy seaside event.");
    }
  });

test("published edits synchronize civil time and fence subsequent edits",
  async () => {
    const h = harness({"organizers/club-1": organizer(),
      "events/event-1": publishedProgressiveEvent()});
    const edit = request("host-1", {eventId: "event-1",
      expectedSetupRevision: 4, fields: {
        startTimeMillis: Date.parse("2026-05-02T19:00:00Z"),
        endTimeMillis: Date.parse("2026-05-02T20:00:00Z"),
      }});
    await updateEventHandler(edit, h.deps);
    const updated = h.firestore.get("events/event-1")!;
    assert.equal(updated.setupRevision, 5);
    assert.equal(updated.eventLocalDate, "2026-05-03");
    assert.equal(updated.eventLocalStartTime, "00:30");
    assert.equal(updated.eventTimezone, "Asia/Kolkata");
    assert.equal(updated.publicationState, "published");
    assert.equal(updated.planChangeRevision, 1);
    await assert.rejects(updateEventHandler(edit, h.deps),
      (error) => assertHttpsCode(error, "aborted"));
  });

test("full form saves can change copy with guests when schedule is unchanged",
  async () => {
    const original = publishedProgressiveEvent();
    const h = harness({"organizers/club-1": organizer(),
      "events/event-1": original,
      "eventParticipations/event-1_runner-1": {eventId: "event-1",
        organizerId: "club-1", uid: "runner-1", status: "signedUp"},
      "users/runner-1": {fcmToken: "token-1", prefsRunStatusUpdates: true}});
    await updateEventHandler(request("host-1", {eventId: "event-1",
      expectedSetupRevision: 4, fields: {description: "Bring water.",
        name: original.name,
        startTimeMillis: ts("2026-05-02T01:30:00Z").toMillis(),
        endTimeMillis: ts("2026-05-02T02:30:00Z").toMillis(),
        meetingLocation: original.meetingLocation,
        capacityLimit: original.capacityLimit,
        constraints: original.constraints,
        priceInPaise: original.priceInPaise,
      }}), h.deps);
    assert.equal(h.firestore.get("events/event-1")?.description,
      "Bring water.");
    assert.equal(h.firestore.get("events/event-1")?.setupRevision, 5);
    assert.equal(h.firestore.get("events/event-1")?.planChangeRevision,
      undefined);
    assert.deepEqual(h.notifications, []);
  });

test("published progressive cancellation uses the shared idempotent lifecycle",
  async () => {
    const h = harness({"organizers/club-1": organizer(),
      "events/event-1": publishedProgressiveEvent()});
    const cancel = request("host-1", {eventId: "event-1", reason: "Weather"});
    await cancelEventHandler(cancel, h.deps);
    await cancelEventHandler(cancel, h.deps);
    assert.equal(h.firestore.get("events/event-1")?.status, "cancelled");
    assert.equal(h.firestore.get("events/event-1")?.cancellationReason,
      "Weather");
    assert.equal(h.firestore.get("events/event-1")?.setupRevision, 5);
  });

test("updateEventHandler updates only host-editable event fields", async () => {
  const h = harness({
    "organizers/club-1": organizer(),
    "events/event-1": event({capacityLimit: 12}),
  });

  const result = await updateEventHandler(
    request("host-1", {
      eventId: "event-1",
      fields: {
        startTimeMillis: Date.parse("2026-05-02T02:00:00.000Z"),
        endTimeMillis: Date.parse("2026-05-02T03:00:00.000Z"),
        meetingPoint: "Joggers Park",
        photoUrl: "https://img.example/events/event-1.jpg",
        description: "Updated route.",
      },
    }),
    h.deps
  );

  const updated = h.firestore.get("events/event-1");
  assert.deepEqual(result, {updated: true});
  assert.deepEqual(h.rateLimitCalls, ["host-1:updateEvent"]);
  assert.equal(updated?.meetingPoint, "Joggers Park");
  assert.equal(updated?.photoUrl, "https://img.example/events/event-1.jpg");
  assert.equal(updated?.description, "Updated route.");
  assert.equal(updated?.capacityLimit, 12);
  assert.equal(updated?.planChangeRevision, 1);
  const source = h.firestore.get(`${EVENT_PLAN_CHANGES}/` +
    eventPlanChangeSourceId("event-1", 1));
  assert.deepEqual(source?.changedFields, ["schedule", "meetingLocation"]);
  assert.equal(source?.meetingPoint, "Joggers Park");
  assert.equal(source?.revision, 1);
});

test("updateEventHandler cleans removed event media after commit", async () => {
  const kept = uploadedEventPhoto("keep", 0);
  const removed = uploadedEventPhoto("remove", 1);
  const h = harness({
    "organizers/club-1": organizer(),
    "events/event-1": event({eventPhotos: [kept, removed]}),
  });

  await updateEventHandler(request("host-1", {
    eventId: "event-1",
    fields: {eventPhotos: [kept]},
  }), h.deps);

  assert.deepEqual(h.deletedStoragePaths, [
    "events/event-1/media/remove/original.jpg",
    "events/event-1/media/remove/thumbnail.jpg",
  ]);
});

test(
  "updateEventHandler limits web registration to free open events",
  async () => {
    const eligible = harness({
      "organizers/club-1": organizer(),
      "events/event-1": event(),
    });
    await updateEventHandler(request("host-1", {
      eventId: "event-1",
      fields: {publicRegistrationEnabled: true},
    }), eligible.deps);
    assert.equal(
      eligible.firestore.get("events/event-1")?.publicRegistrationEnabled,
      true
    );

    const paid = harness({
      "organizers/club-1": organizer(),
      "events/event-1": event({priceInPaise: 50000}),
    });
    await assert.rejects(
      () => updateEventHandler(request("host-1", {
        eventId: "event-1",
        fields: {publicRegistrationEnabled: true},
      }), paid.deps),
      (error) => assertHttpsCode(error, "failed-precondition")
    );

    const cohortGated = harness({
      "organizers/club-1": organizer(),
      "events/event-1": event({
        constraints: {minAge: 0, maxAge: 99, maxMen: 10, maxWomen: 10},
      }),
    });
    await assert.rejects(
      () => updateEventHandler(request("host-1", {
        eventId: "event-1",
        fields: {publicRegistrationEnabled: true},
      }), cohortGated.deps),
      (error) => assertHttpsCode(error, "failed-precondition")
    );
  }
);

test("updateEventHandler notifies participants for location changes",
  async () => {
    const h = harness({
      "organizers/club-1": organizer(),
      "events/event-1": event(),
      "eventParticipations/event-1_runner-1": {
        eventId: "event-1",
        organizerId: "club-1",
        uid: "runner-1",
        status: "signedUp",
      },
      "eventParticipations/event-1_runner-2": {
        eventId: "event-1",
        organizerId: "club-1",
        uid: "runner-2",
        status: "waitlisted",
      },
      "eventParticipations/event-1_runner-3": {
        eventId: "event-1",
        organizerId: "club-1",
        uid: "runner-3",
        status: "cancelled",
      },
      "users/runner-1": {fcmToken: "token-1", prefsRunStatusUpdates: true},
      "users/runner-2": {fcmToken: "token-2", prefsRunStatusUpdates: false},
      "users/runner-3": {fcmToken: "token-3", prefsRunStatusUpdates: true},
    });

    await updateEventHandler(
      request("host-1", {
        eventId: "event-1",
        fields: {
          meetingPoint: "Joggers Park",
        },
      }),
      h.deps
    );

    const runner1Notification = h.firestore.get(
      "notifications/runner-1/items/eventUpdated_event-1"
    );
    const runner2Notification = h.firestore.get(
      "notifications/runner-2/items/eventUpdated_event-1"
    );
    const runner3Notification = h.firestore.get(
      "notifications/runner-3/items/eventUpdated_event-1"
    );

    assert.equal(runner1Notification?.uid, "runner-1");
    assert.equal(runner1Notification?.type, "eventUpdated");
    assert.equal(runner1Notification?.title, "Event details changed");
    assert.equal(
      runner1Notification?.body,
      "Check the latest time and meeting point for your 5 km event."
    );
    assert.equal(runner1Notification?.eventId, "event-1");
    assert.equal(runner1Notification?.organizerId, "club-1");
    assert.equal(runner2Notification?.uid, "runner-2");
    assert.equal(runner3Notification, undefined);
    assert.deepEqual(h.notifications, [{
      token: "token-1",
      title: "Event details changed",
      body: "Check the latest time and meeting point for your 5 km event.",
      type: "eventUpdated",
      eventId: "event-1",
      organizerId: "club-1",
    }]);
    const eventDoc = h.firestore.get("events/event-1");
    assert.equal(eventDoc?.planChangeRevision, 1);
    const source = h.firestore.get(`${EVENT_PLAN_CHANGES}/` +
      eventPlanChangeSourceId("event-1", 1));
    assert.deepEqual(source?.changedFields, ["meetingLocation"]);
    assert.equal(source?.meetingPoint, "Joggers Park");
  }
);

test("updateEventHandler rejects schedule changes once participants exist",
  async () => {
    const h = harness({
      "organizers/club-1": organizer(),
      "events/event-1": event(),
      "eventParticipations/event-1_runner-1": {
        eventId: "event-1",
        organizerId: "club-1",
        uid: "runner-1",
        status: "signedUp",
      },
    });

    await assert.rejects(
      () => updateEventHandler(
        request("host-1", {
          eventId: "event-1",
          fields: {
            startTimeMillis: Date.parse("2026-05-02T02:00:00.000Z"),
            endTimeMillis: Date.parse("2026-05-02T03:00:00.000Z"),
          },
        }),
        h.deps
      ),
      (error) => assertHttpsCode(error, "failed-precondition")
    );
    await assert.rejects(
      () => updateEventHandler(
        request("host-1", {
          eventId: "event-1",
          fields: {capacityLimit: 99},
        }),
        h.deps
      ),
      (error) => assertHttpsCode(error, "failed-precondition")
    );
  }
);

test("updateEventHandler skips participant notifications for copy-only edits",
  async () => {
    const h = harness({
      "organizers/club-1": organizer(),
      "events/event-1": event(),
      "eventParticipations/event-1_runner-1": {
        eventId: "event-1",
        organizerId: "club-1",
        uid: "runner-1",
        status: "signedUp",
      },
      "users/runner-1": {fcmToken: "token-1", prefsRunStatusUpdates: true},
    });

    await updateEventHandler(
      request("host-1", {
        eventId: "event-1",
        fields: {description: "New route notes."},
      }),
      h.deps
    );

    assert.equal(
      h.firestore.get("notifications/runner-1/items/eventUpdated_event-1"),
      undefined
    );
    assert.deepEqual(h.notifications, []);
    assert.equal(
      h.firestore.get("events/event-1")?.planChangeRevision,
      undefined
    );
    assert.equal(
      h.firestore.get(`${EVENT_PLAN_CHANGES}/` +
        eventPlanChangeSourceId("event-1", 1)),
      undefined
    );
  }
);

test("updateEventHandler advances immutable plan change revisions",
  async () => {
    const h = harness({
      "organizers/club-1": organizer(),
      "events/event-1": event({planChangeRevision: 4}),
    });

    await updateEventHandler(request("host-1", {
      eventId: "event-1",
      fields: {meetingPoint: "Joggers Park"},
    }), h.deps);

    const eventDoc = h.firestore.get("events/event-1");
    const source = h.firestore.get(`${EVENT_PLAN_CHANGES}/` +
      eventPlanChangeSourceId("event-1", 5));
    assert.equal(eventDoc?.planChangeRevision, 5);
    assert.equal(source?.revision, 5);
    assert.equal(source?.createdBy, "host-1");
  });

test("cancelEventHandler marks the event cancelled and notifies participants",
  async () => {
    const h = harness({
      "organizers/club-1": organizer(),
      "events/event-1": event(),
      "eventParticipations/event-1_runner-1": {
        eventId: "event-1",
        organizerId: "club-1",
        uid: "runner-1",
        status: "signedUp",
      },
      "eventParticipations/event-1_runner-2": {
        eventId: "event-1",
        organizerId: "club-1",
        uid: "runner-2",
        status: "waitlisted",
      },
      "users/runner-1": {fcmToken: "token-1", prefsRunStatusUpdates: true},
      "users/runner-2": {fcmToken: "token-2", prefsRunStatusUpdates: false},
    });

    const result = await cancelEventHandler(
      request("host-1", {
        eventId: "event-1",
        reason: "Storm warning.",
      }),
      h.deps
    );

    const updated = h.firestore.get("events/event-1");
    const runner1Notification = h.firestore.get(
      "notifications/runner-1/items/eventCancelled_event-1"
    );
    const runner2Notification = h.firestore.get(
      "notifications/runner-2/items/eventCancelled_event-1"
    );

    assert.deepEqual(result, {cancelled: true});
    assert.deepEqual(h.rateLimitCalls, ["host-1:cancelEvent"]);
    assert.equal(updated?.status, "cancelled");
    assert.equal(updated?.cancellationReason, "Storm warning.");
    assert.equal(runner1Notification?.uid, "runner-1");
    assert.equal(runner1Notification?.type, "eventCancelled");
    assert.equal(runner1Notification?.title, "Event cancelled");
    assert.equal(
      runner1Notification?.body,
      "Your 5 km event from Carter Road has been cancelled."
    );
    assert.equal(runner2Notification?.uid, "runner-2");
    assert.deepEqual(h.notifications, [{
      token: "token-1",
      title: "Event cancelled",
      body: "Your 5 km event from Carter Road has been cancelled.",
      type: "eventCancelled",
      eventId: "event-1",
      organizerId: "club-1",
    }]);

    await cancelEventHandler(
      request("host-1", {eventId: "event-1"}),
      h.deps
    );
    assert.equal(h.notifications.length, 1);
  }
);

test("deleteEventHandler hard-deletes only unused events", async () => {
  const photo = uploadedEventPhoto("delete", 0);
  const h = harness({
    "organizers/club-1": organizer(),
    "events/event-1": event({eventPhotos: [photo]}),
  });

  const result = await deleteEventHandler(
    request("host-1", {eventId: "event-1"}),
    h.deps
  );

  assert.deepEqual(result, {deleted: true});
  assert.deepEqual(h.rateLimitCalls, ["host-1:deleteEvent"]);
  assert.equal(h.firestore.get("events/event-1"), undefined);
  assert.deepEqual(h.deletedStoragePaths, [
    "events/event-1/media/delete/original.jpg",
    "events/event-1/media/delete/thumbnail.jpg",
  ]);
});

test("deleteEventHandler rejects events with user activity", async () => {
  const h = harness({
    "organizers/club-1": organizer(),
    "events/event-1": event(),
    "eventParticipations/event-1_runner-1": {
      eventId: "event-1",
      uid: "runner-1",
      status: "signedUp",
    },
  });

  await assert.rejects(
    () => deleteEventHandler(request("host-1", {eventId: "event-1"}), h.deps),
    (error) => assertHttpsCode(error, "failed-precondition")
  );
  assert.notEqual(h.firestore.get("events/event-1"), undefined);
});

test("updateEventHandler rejects non-host and server-owned field edits",
  async () => {
    const h = harness({
      "organizers/club-1": organizer(),
      "events/event-1": event(),
    });

    await assert.rejects(
      () => updateEventHandler(request("runner-1", {
        eventId: "event-1",
        fields: {description: "Nope."},
      }), h.deps),
      (error) => assertHttpsCode(error, "permission-denied")
    );
    await assert.rejects(
      () => updateEventHandler(request("host-1", {
        eventId: "event-1",
        fields: {bookedCount: 99},
      }), h.deps),
      (error) => assertHttpsCode(error, "invalid-argument")
    );
    await assert.rejects(
      () => updateEventHandler(request("host-1", {
        eventId: "event-1",
        fields: {
          startTimeMillis: Date.parse("2026-05-02T03:00:00.000Z"),
        },
      }), h.deps),
      (error) => assertHttpsCode(error, "invalid-argument")
    );
  }
);

test("updateEventHandler rejects cancelled events", async () => {
  const h = harness({
    "organizers/club-1": organizer(),
    "events/event-1": event({status: "cancelled"}),
  });

  await assert.rejects(
    () => updateEventHandler(request("host-1", {
      eventId: "event-1",
      fields: {description: "No changes allowed."},
    }), h.deps),
    (error) => assertHttpsCode(error, "failed-precondition")
  );
});

function readySeatDocs(occupied = 0): Record<string, FakeData> {
  const policy = deriveEventSeatPolicy(event());
  return {
    "eventSeatMigrationFences/event-1": {eventId: "event-1",
      migrationRevision: 1, state: "ready"},
    "eventSeatLedgers/event-1": {eventId: "event-1", capacity: 20,
      occupied, revision: 3, capacityRevision: 1, migrationRevision: 1,
      policyHash: policy.policyHash, policyVersion: policy.policyVersion,
      state: "ready"},
  };
}

test("Host roster and event offers prevent legacy policy or schedule edits",
  async () => {
    for (const collection of ["eventAttendees", "organizerEventOffers"]) {
      for (const fields of [{capacityLimit: 25},
        {startTimeMillis: Date.parse("2026-05-02T01:45:00Z")}]) {
        const h = harness({"organizers/club-1": organizer(),
          "events/event-1": event(),
          [`${collection}/guest-1`]: {eventId: "event-1",
            organizerId: "club-1", status: "registered"}});
        await assert.rejects(updateEventHandler(request("host-1",
          {eventId: "event-1", fields}), h.deps),
        (error) => assertHttpsCode(error, "failed-precondition"));
        assert.deepEqual(h.firestore.get("events/event-1"), event());
        assert.deepEqual(h.notifications, []);
      }
    }
  });

test("migration fence stops update, cancel and delete before any effects",
  async () => {
    for (const state of ["locked", "missing-ledger"]) {
      for (const handler of [updateEventHandler, cancelEventHandler,
        deleteEventHandler]) {
        const h = harness({"organizers/club-1": organizer(),
          "events/event-1": event(),
          "eventSeatMigrationFences/event-1": {eventId: "event-1",
            migrationRevision: 1, state}});
        await assert.rejects(handler(request("host-1", {
          eventId: "event-1",
          ...(handler === updateEventHandler ?
            {fields: {description: "Changed"}} : {}),
        }), h.deps), (error) => assertHttpsCode(error,
          "failed-precondition"));
        assert.deepEqual(h.firestore.get("events/event-1"), event());
        assert.deepEqual(h.notifications, []);
        assert.deepEqual(h.deletedStoragePaths, []);
      }
    }
  });

test("unused ready event capacity edits advance ledger atomically and replay",
  async () => {
    const h = harness({"organizers/club-1": organizer(),
      "events/event-1": event(), ...readySeatDocs()});
    const edit = request("host-1", {eventId: "event-1",
      fields: {capacityLimit: 25}});
    await updateEventHandler(edit, h.deps);
    const updated = h.firestore.get("events/event-1")!;
    const ledger = h.firestore.get("eventSeatLedgers/event-1")!;
    assert.equal(updated.capacityLimit, 25);
    assert.equal(ledger.capacity, 25);
    assert.equal(ledger.occupied, 0);
    assert.equal(ledger.revision, 4);
    assert.equal(ledger.capacityRevision, 2);
    assert.equal(ledger.policyHash, deriveEventSeatPolicy(updated).policyHash);
    await updateEventHandler(edit, h.deps);
    assert.deepEqual(h.firestore.get("eventSeatLedgers/event-1"), ledger);
  });

test("ready ledger occupancy or stale policy prevents unsafe capacity edit",
  async () => {
    for (const patch of [{occupied: 1}, {checkoutHeld: 1},
      {policyHash: "f".repeat(64)},
      {revision: Number.MAX_SAFE_INTEGER}, {capacityRevision: 0}]) {
      const docs = readySeatDocs();
      docs["eventSeatLedgers/event-1"] =
        {...docs["eventSeatLedgers/event-1"], ...patch};
      const h = harness({"organizers/club-1": organizer(),
        "events/event-1": event(), ...docs});
      await assert.rejects(updateEventHandler(request("host-1", {
        eventId: "event-1", fields: {capacityLimit: 25},
      }), h.deps), (error) => assertHttpsCode(error, "failed-precondition"));
      assert.deepEqual(h.firestore.get("events/event-1"), event());
      assert.deepEqual(h.firestore.get("eventSeatLedgers/event-1"),
        docs["eventSeatLedgers/event-1"]);
    }
  });

test("copy edits and cancellation preserve ready seats and roster history",
  async () => {
    const docs = readySeatDocs(1);
    const attendee = {eventId: "event-1", organizerId: "club-1",
      source: "import", status: "registered"};
    const h = harness({"organizers/club-1": organizer(),
      "events/event-1": event(), ...docs,
      "eventAttendees/guest-1": attendee});
    await updateEventHandler(request("host-1", {eventId: "event-1",
      fields: {description: "New description"}}), h.deps);
    await cancelEventHandler(request("host-1", {eventId: "event-1"}), h.deps);
    assert.equal(h.firestore.get("events/event-1")?.status, "cancelled");
    assert.deepEqual(h.firestore.get("eventSeatLedgers/event-1"),
      docs["eventSeatLedgers/event-1"]);
    assert.deepEqual(h.firestore.get("eventAttendees/guest-1"), attendee);
  });

test("delete preserves imported, offer, admission and migrated seat history",
  async () => {
    for (const history of [
      {"eventAttendees/guest": {eventId: "event-1", status: "cancelled"}},
      {"organizerEventOffers/offer": {eventId: "event-1"}},
      {"organizerFormAdmissions/admission": {eventId: "event-1"}},
      readySeatDocs(),
    ]) {
      const h = harness({"organizers/club-1": organizer(),
        "events/event-1": event(), ...history});
      await assert.rejects(deleteEventHandler(request("host-1",
        {eventId: "event-1"}), h.deps),
      (error) => assertHttpsCode(error, "failed-precondition"));
      assert.deepEqual(h.firestore.get("events/event-1"), event());
      assert.deepEqual(h.deletedStoragePaths, []);
    }
  });

test("schedule edit finishes conflict reads before plan-change writes",
  async () => {
    const h = harness({"organizers/club-1": organizer(),
      "events/event-1": event(), ...readySeatDocs()});
    await updateEventHandler(request("host-1", {eventId: "event-1",
      fields: {startTimeMillis: Date.parse("2026-05-02T01:45:00Z")},
    }), h.deps);
    assert.equal(h.firestore.get("events/event-1")?.planChangeRevision, 1);
    assert.ok(h.firestore.get(`${EVENT_PLAN_CHANGES}/` +
      eventPlanChangeSourceId("event-1", 1)));
  });


test("ledger occupancy fences schedule and price without roster projection",
  async () => {
    for (const fields of [{priceInPaise: 1000},
      {startTimeMillis: Date.parse("2026-05-02T01:45:00Z")}]) {
      const h = harness({"organizers/club-1": organizer(),
        "events/event-1": event(), ...readySeatDocs(1)});
      await assert.rejects(updateEventHandler(request("host-1",
        {eventId: "event-1", fields}), h.deps),
      (error) => assertHttpsCode(error, "failed-precondition"));
      assert.deepEqual(h.firestore.get("events/event-1"), event());
    }
  });

test("capacity edit keeps explicit event policy and ready ledger consistent",
  async () => {
    const h = harness({"organizers/club-1": organizer()});
    await createEventHandler(request("host-1", payload()), h.deps);
    const original = h.firestore.get("events/event-1")!;
    const docs = readySeatDocs();
    const policy = deriveEventSeatPolicy(original);
    docs["eventSeatLedgers/event-1"] = {
      ...docs["eventSeatLedgers/event-1"], policyHash: policy.policyHash,
      policyVersion: policy.policyVersion};
    for (const [path, value] of Object.entries(docs)) {
      h.firestore.set(path, value);
    }
    await updateEventHandler(request("host-1", {eventId: "event-1",
      fields: {capacityLimit: 25}}), h.deps);
    const updated = h.firestore.get("events/event-1")!;
    assert.equal(updated.capacityLimit, 25);
    assert.equal(((updated.eventPolicy as FakeData).admission as FakeData)
      .capacityLimit, 25);
    assert.equal(h.firestore.get("eventSeatLedgers/event-1")?.policyHash,
      deriveEventSeatPolicy(updated).policyHash);
  });

test("free website registration preserves external booking provenance",
  async () => {
    const origin = {mode: "externalCompanion", bookingAuthority: "external",
      rosterAuthority: "hostImport", provider: "luma",
      externalEventId: "evt_imported", externalEventUrl: "https://lu.ma/demo",
      sourceExternalEventId: "evt_imported", adapterVersion: "luma-csv-v1",
      connectedAt: ts("2026-05-01T00:00:00.000Z"), connectedBy: "host-1"};
    const h = harness({"organizers/club-1": organizer(),
      "events/event-1": event({eventOrigin: origin})});
    for (const enabled of [true, true, false]) {
      await updateEventHandler(request("host-1", {eventId: "event-1",
        fields: {publicRegistrationEnabled: enabled}}), h.deps);
      const saved = h.firestore.get("events/event-1")!;
      assert.equal(saved.publicRegistrationEnabled, enabled);
      assert.deepEqual(saved.eventOrigin, origin);
      assert.throws(() => requireCatchBookingAuthority(
        saved as unknown as EventDocument),
      (error) => assertHttpsCode(error, "failed-precondition"));
    }
  });


test("host cancellation replay retries staging without false refund success",
  async () => {
    const h = harness({"organizers/club-1": organizer(),
      "events/event-1": event(),
      "payments/payment-1": {status: "completed", eventId: "event-1"}});
    let calls = 0;
    const deps = {...h.deps, prepareCancellationRefunds: async () => {
      calls++;
      if (calls === 1) throw new Error("Interrupted staging");
    }};
    const command = request("host-1", {eventId: "event-1"});
    await cancelEventHandler(command, deps);
    assert.equal(h.firestore.get("events/event-1")?.status, "cancelled");
    assert.equal(h.firestore.get("payments/payment-1")?.status, "completed");
    await cancelEventHandler(command, deps);
    assert.equal(calls, 2);
    assert.equal(h.firestore.get("payments/payment-1")?.status, "completed");
  });


test("guest notes survive create and edit, can be cleared, and are bounded",
  async () => {
    const publicDetails = {
      accessibility: "Step-free entrance", included: "Water",
    };
    const eventFormat = {version: 1, activityKind: "dinner",
      interactionModel: "seatedTable", activityDetails: {publicDetails,
        privateNotes: "Host-only note"}};
    const h = harness({"organizers/club-1": organizer()});
    await createEventHandler(request("host-1", payload({eventFormat})), h.deps);
    const saved = h.firestore.get("events/event-1")?.eventFormat;
    assert.deepEqual((saved as typeof eventFormat).activityDetails,
      eventFormat.activityDetails);
    const updatedFormat = {...eventFormat, activityDetails: {
      ...eventFormat.activityDetails,
      publicDetails: {accessibility: "Lift at the rear", included: "Dinner"},
    }};
    await updateEventHandler(request("host-1", {eventId: "event-1",
      fields: {eventFormat: updatedFormat}}), h.deps);
    assert.deepEqual((h.firestore.get("events/event-1")?.eventFormat as
      typeof updatedFormat).activityDetails, updatedFormat.activityDetails);
    const clearedFormat = {...eventFormat, activityDetails: {
      privateNotes: "Host-only note",
    }};
    await updateEventHandler(request("host-1", {eventId: "event-1",
      fields: {eventFormat: clearedFormat}}), h.deps);
    assert.deepEqual((h.firestore.get("events/event-1")?.eventFormat as
      typeof clearedFormat).activityDetails, clearedFormat.activityDetails);
    for (const value of ["x".repeat(2001), {text: "Invalid"}]) {
      const invalidFormat = {...eventFormat, activityDetails: {
        publicDetails: {accessibility: value},
      }};
      await assert.rejects(() => updateEventHandler(request("host-1", {
        eventId: "event-1", fields: {eventFormat: invalidFormat},
      }), h.deps), (error) => assertHttpsCode(error, "invalid-argument"));
      await assert.rejects(() => createEventHandler(request("host-1",
        payload({eventFormat: invalidFormat})), h.deps),
      (error) => assertHttpsCode(error, "invalid-argument"));
    }
  });
