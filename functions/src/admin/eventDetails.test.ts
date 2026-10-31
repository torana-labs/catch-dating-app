import assert from "node:assert/strict";
import test from "node:test";
import {CallableRequest} from "firebase-functions/v2/https";
import {
  adminGetEventDetailsHandler,
  adminListEventDetailsHandler,
  adminUpdateEventDetailsHandler,
} from "./eventDetails";

type FakeData = Record<string, unknown>;

class FakeDocRef {
  readonly id: string;

  constructor(readonly firestore: FakeFirestore, readonly path: string) {
    this.id = path.split("/").at(-1) ?? "";
  }

  async get(): Promise<FakeSnapshot> {
    return new FakeSnapshot(this.firestore.get(this.path));
  }
}

class FakeSnapshot {
  constructor(private readonly value: FakeData | undefined) {}

  get exists(): boolean {
    return this.value !== undefined;
  }

  data(): FakeData | undefined {
    if (this.value === undefined) return undefined;
    const data = structuredClone(this.value);
    // Firestore returns Timestamp objects; this fake stores Date for queries.
    for (const field of ["startTime", "endTime"]) {
      const date = data[field];
      if (date instanceof Date) {
        data[field] = {
          toDate: () => date,
          toMillis: () => date.getTime(),
        };
      }
    }
    return data;
  }
}

class FakeQueryDocumentSnapshot extends FakeSnapshot {
  readonly id: string;

  constructor(readonly path: string, value: FakeData) {
    super(value);
    this.id = path.split("/").at(-1) ?? "";
  }
}

class FakeQuerySnapshot {
  constructor(readonly docs: FakeQueryDocumentSnapshot[]) {}
}

class FakeCollectionRef {
  constructor(
    private readonly firestore: FakeFirestore,
    private readonly path: string
  ) {}

  doc(docId?: string) {
    return new FakeDocRef(
      this.firestore,
      `${this.path}/${docId ?? this.firestore.autoId()}`
    );
  }

  where(
    fieldPath: string,
    op: "==" | "in" | "array-contains-any" | ">=" | "<",
    value: unknown
  ) {
    return new FakeQuery(this.firestore, this.path)
      .where(fieldPath, op, value);
  }

  limit(count: number) {
    return new FakeQuery(this.firestore, this.path).limit(count);
  }

  orderBy(fieldPath: string, direction: "asc" | "desc" = "asc") {
    return new FakeQuery(this.firestore, this.path)
      .orderBy(fieldPath, direction);
  }
}

class FakeQuery {
  private readonly filters: Array<{
    fieldPath: string;
    op: "==" | "in" | "array-contains-any" | ">=" | "<";
    value: unknown;
  }> = [];
  private readonly orderings: Array<{
    fieldPath: string;
    direction: "asc" | "desc";
  }> = [];
  private limitCount = 1000;

  constructor(
    private readonly firestore: FakeFirestore,
    private readonly path: string
  ) {}

  where(
    fieldPath: string,
    op: "==" | "in" | "array-contains-any" | ">=" | "<",
    value: unknown
  ) {
    const next = new FakeQuery(this.firestore, this.path);
    next.filters.push(...this.filters, {fieldPath, op, value});
    next.orderings.push(...this.orderings);
    next.limitCount = this.limitCount;
    return next;
  }

  orderBy(fieldPath: string, direction: "asc" | "desc" = "asc") {
    const next = new FakeQuery(this.firestore, this.path);
    next.filters.push(...this.filters);
    next.orderings.push(...this.orderings, {fieldPath, direction});
    next.limitCount = this.limitCount;
    return next;
  }

  limit(count: number) {
    const next = new FakeQuery(this.firestore, this.path);
    next.filters.push(...this.filters);
    next.orderings.push(...this.orderings);
    next.limitCount = count;
    return next;
  }

  async get(): Promise<FakeQuerySnapshot> {
    return this.execute();
  }

  execute(): FakeQuerySnapshot {
    const prefix = `${this.path}/`;
    const docs = this.firestore.entries()
      .filter(([path, value]) =>
        path.startsWith(prefix) &&
        path.slice(prefix.length).split("/").length === 1 &&
        value !== undefined
      )
      .filter(([, value]) => this.matches(value as FakeData))
      .sort((a, b) => this.compareDocs(a, b))
      .slice(0, this.limitCount)
      .map(([path, value]) =>
        new FakeQueryDocumentSnapshot(path, value as FakeData));
    return new FakeQuerySnapshot(docs);
  }

  private matches(value: FakeData): boolean {
    return this.filters.every((filter) => {
      const fieldValue = getPath(value, filter.fieldPath.split("."));
      if (filter.op === "array-contains-any") {
        assert.ok(Array.isArray(filter.value));
        if (!Array.isArray(fieldValue)) return false;
        return filter.value.some((item) => fieldValue.includes(item));
      }
      if (filter.op === "in") {
        assert.ok(Array.isArray(filter.value));
        return filter.value.includes(fieldValue);
      }
      if (filter.op === ">=") {
        return compareValues(fieldValue, filter.value) >= 0;
      }
      if (filter.op === "<") {
        return compareValues(fieldValue, filter.value) < 0;
      }
      return fieldValue === filter.value;
    });
  }

  private compareDocs(
    a: [string, FakeData | undefined],
    b: [string, FakeData | undefined]
  ): number {
    for (const ordering of this.orderings) {
      const aValue = getPath(a[1] as FakeData, ordering.fieldPath.split("."));
      const bValue = getPath(b[1] as FakeData, ordering.fieldPath.split("."));
      const result = compareValues(aValue, bValue);
      if (result !== 0) {
        return ordering.direction === "desc" ? -result : result;
      }
    }
    return a[0].localeCompare(b[0]);
  }
}

class FakeFirestore {
  private nextAutoId = 0;

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

  autoId(): string {
    this.nextAutoId += 1;
    return `auto-${this.nextAutoId}`;
  }

  get(path: string): FakeData | undefined {
    const data = this.docs[path];
    return data === undefined ? undefined : structuredClone(data);
  }

  entries(): Array<[string, FakeData | undefined]> {
    return Object.entries(this.docs).map(([path, value]) => [
      path,
      value === undefined ? undefined : structuredClone(value),
    ]);
  }

  set(path: string, data: FakeData) {
    this.docs[path] = data;
  }

  auditLogs(): FakeData[] {
    return Object.entries(this.docs)
      .filter(([path, value]) =>
        path.startsWith("adminAuditLogs/") && value !== undefined
      )
      .map(([, value]) => value as FakeData);
  }
}

class FakeTransaction {
  private readonly writes: Array<() => void> = [];

  constructor(private readonly firestore: FakeFirestore) {}

  async get(
    ref: FakeDocRef | FakeQuery
  ): Promise<FakeSnapshot | FakeQuerySnapshot> {
    if (ref instanceof FakeQuery) return ref.execute();
    return new FakeSnapshot(this.firestore.get(ref.path));
  }

  update(ref: FakeDocRef, patch: FakeData) {
    this.writes.push(() => {
      const current = this.firestore.get(ref.path);
      if (current === undefined) {
        throw new Error(`Missing doc for update: ${ref.path}`);
      }
      this.firestore.set(ref.path, applyPatch(current, patch));
    });
  }

  set(ref: FakeDocRef, patch: FakeData, options?: {merge?: boolean}) {
    this.writes.push(() => {
      const current = options?.merge ?
        this.firestore.get(ref.path) ?? {} :
        {};
      this.firestore.set(ref.path, applyPatch(current, patch));
    });
  }

  commit() {
    for (const write of this.writes) write();
  }
}

function applyPatch(current: FakeData, patch: FakeData): FakeData {
  const next = structuredClone(current);
  for (const [key, value] of Object.entries(patch)) {
    if (key.includes(".")) {
      setPath(next, key.split("."), value);
    } else {
      next[key] = value;
    }
  }
  return next;
}

function setPath(target: FakeData, path: string[], value: unknown) {
  let cursor: FakeData = target;
  for (let i = 0; i < path.length - 1; i += 1) {
    const segment = path[i];
    const child = cursor[segment];
    if (!child || typeof child !== "object") cursor[segment] = {};
    cursor = cursor[segment] as FakeData;
  }
  const finalSegment = path[path.length - 1];
  if (finalSegment) cursor[finalSegment] = value;
}

function getPath(target: FakeData, path: string[]): unknown {
  let cursor: unknown = target;
  for (const segment of path) {
    if (!cursor || typeof cursor !== "object") return undefined;
    cursor = (cursor as FakeData)[segment];
  }
  return cursor;
}

function compareValues(left: unknown, right: unknown): number {
  const leftValue = comparableValue(left);
  const rightValue = comparableValue(right);
  if (leftValue < rightValue) return -1;
  if (leftValue > rightValue) return 1;
  return 0;
}

function comparableValue(value: unknown): string | number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string") return value;
  return "";
}

function harness(initialDocs: Record<string, FakeData | undefined>) {
  const firestore = new FakeFirestore(initialDocs);
  return {
    firestore,
    deps: {
      firestore: () =>
        firestore as unknown as FirebaseFirestore.Firestore,
      serverTimestamp: () =>
        "SERVER_TIMESTAMP" as unknown as FirebaseFirestore.FieldValue,
      now: () => new Date("2026-06-25T08:30:00.000Z"),
    },
  };
}

function callableRequest(
  uid: string | null,
  data: Record<string, unknown>,
  token: Record<string, unknown> = {}
): CallableRequest<unknown> {
  return {
    auth: uid ? {uid, token} as CallableRequest["auth"] : undefined,
    data,
    rawRequest: {headers: {}} as CallableRequest["rawRequest"],
  } as CallableRequest<unknown>;
}

function organizerDoc(overrides: FakeData = {}): FakeData {
  return {
    name: "AFTER FLY",
    location: "in-mp-indore",
    locationCityId: "in-mp-indore",
    locationMarketId: "in-mp-indore",
    cityName: "Indore",
    ...overrides,
  };
}

function eventDoc(overrides: FakeData = {}): FakeData {
  const startTime = overrides.startTime instanceof Date ?
    overrides.startTime : new Date("2026-07-04T01:30:00.000Z");
  return {
    organizerId: "afterfly",
    startTime,
    endTime: new Date(startTime.getTime() + 2 * 60 * 60 * 1000),
    meetingPoint: "Nehru Park gate",
    meetingLocation: {
      name: "Nehru Park",
      address: "Race Course Road",
      latitude: 22.7179,
      longitude: 75.8333,
    },
    startingPointLat: 22.7179,
    startingPointLng: 75.8333,
    locationDetails: "Meet by the main gate.",
    photoUrl: null,
    distanceKm: 5,
    eventFormat: {
      version: 1,
      activityKind: "socialRun",
      interactionModel: "pacePods",
    },
    pace: "easy",
    capacityLimit: 30,
    description: "Source-backed social run.",
    priceInPaise: 15000,
    currency: "INR",
    bookedCount: 18,
    checkedInCount: 0,
    waitlistedCount: 2,
    status: "active",
    constraints: {minAge: 21, maxAge: 45},
    genderCounts: {},
    cohortCounts: {
      menInterestedInWomen: 9,
      womenInterestedInMen: 9,
    },
    waitlistedCohortCounts: {},
    crossPathsDiscoveryEnabled: false,
    discoveryCityName: "indore",
    discoveryMarketId: "in-mp-indore",
    discoveryActivityKind: "socialRun",
    discoveryAvailability: "open",
    adminSearch: {
      tokens: ["afterfly", "social", "run", "indore", "nehru"],
      sortKey: "social",
      updatedAt: "SERVER_TIMESTAMP",
      updatedBySource: "adminEventSearchBackfill",
    },
    ...overrides,
  };
}

function assertHttpsCode(error: unknown, code: string): boolean {
  assert.equal((error as {code?: string}).code, code);
  return true;
}

test("adminListEventDetailsHandler returns canonical event rows", async () => {
  const h = harness({
    "organizers/afterfly": organizerDoc(),
    "events/afterfly-social-run-1": eventDoc(),
    "events/bandra-run-1": eventDoc({
      organizerId: "bandra-runners",
      meetingPoint: "Bandra Bandstand",
      discoveryCityName: "mumbai",
      discoveryMarketId: "in-mh-mumbai",
      adminSearch: {
        tokens: ["bandra", "running", "mumbai"],
        sortKey: "bandra",
        updatedAt: "SERVER_TIMESTAMP",
        updatedBySource: "adminEventSearchBackfill",
      },
    }),
    "organizers/bandra-runners": organizerDoc({
      name: "Bandra Runners",
      location: "in-mh-mumbai",
      locationCityId: "in-mh-mumbai",
      locationMarketId: "in-mh-mumbai",
      cityName: "Mumbai",
    }),
  });

  const result = await adminListEventDetailsHandler(
    callableRequest("admin-1", {
      citySlug: "in-mp-indore",
      query: "afterfly",
      limit: 10,
    }, {support: true}),
    h.deps
  );

  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].eventId, "afterfly-social-run-1");
  assert.equal(result.rows[0].organizerName, "AFTER FLY");
  assert.equal(result.rows[0].citySlug, "in-mp-indore");
  assert.equal(result.rows[0].searchIndexStatus, "indexed");
  assert.equal(result.generatedAt, "2026-06-25T08:30:00.000Z");
});

test(
  "adminListEventDetailsHandler supports bounded launch-city filters",
  async () => {
    const h = harness({
      "organizers/afterfly": organizerDoc(),
      "events/afterfly-social-run-1": eventDoc(),
      "events/bandra-run-1": eventDoc({
        organizerId: "bandra-runners",
        meetingPoint: "Bandra Bandstand",
        discoveryCityName: "mumbai",
        discoveryMarketId: "in-mh-mumbai",
        adminSearch: {
          tokens: ["bandra", "running", "mumbai"],
          sortKey: "bandra",
          updatedAt: "SERVER_TIMESTAMP",
          updatedBySource: "adminEventSearchBackfill",
        },
      }),
      "events/delhi-run-1": eventDoc({
        organizerId: "delhi-runners",
        meetingPoint: "Lodhi Garden",
        discoveryCityName: "delhi",
        discoveryMarketId: "in-dl-delhi-ncr",
        adminSearch: {
          tokens: ["delhi", "running"],
          sortKey: "delhi",
          updatedAt: "SERVER_TIMESTAMP",
          updatedBySource: "adminEventSearchBackfill",
        },
      }),
      "organizers/bandra-runners": organizerDoc({
        name: "Bandra Runners",
        location: "in-mh-mumbai",
        locationCityId: "in-mh-mumbai",
        locationMarketId: "in-mh-mumbai",
        cityName: "Mumbai",
      }),
    });

    const result = await adminListEventDetailsHandler(
      callableRequest("admin-1", {
        citySlugs: [" in-mp-indore ", "in-mh-mumbai", "in-mp-indore"],
        limit: 10,
      }, {support: true}),
      h.deps
    );

    assert.deepEqual(
      result.rows.map((row) => row.eventId).sort(),
      ["afterfly-social-run-1", "bandra-run-1"]
    );
  }
);

test("adminListEventDetailsHandler applies upcoming time windows", async () => {
  const h = harness({
    "organizers/afterfly": organizerDoc(),
    "events/afterfly-old-run-1": eventDoc({
      startTime: new Date("2020-01-01T01:30:00.000Z"),
      discoveryCityName: "indore",
      discoveryMarketId: "in-mp-indore",
      adminSearch: {
        tokens: ["afterfly", "old", "indore"],
        sortKey: "old",
        updatedAt: "SERVER_TIMESTAMP",
        updatedBySource: "adminEventSearchBackfill",
      },
    }),
    "events/afterfly-future-run-1": eventDoc({
      startTime: new Date("2099-01-01T01:30:00.000Z"),
      discoveryCityName: "indore",
      discoveryMarketId: "in-mp-indore",
      adminSearch: {
        tokens: ["afterfly", "future", "indore"],
        sortKey: "future",
        updatedAt: "SERVER_TIMESTAMP",
        updatedBySource: "adminEventSearchBackfill",
      },
    }),
    "events/bandra-future-run-1": eventDoc({
      organizerId: "bandra-runners",
      startTime: new Date("2099-01-02T01:30:00.000Z"),
      discoveryCityName: "mumbai",
      discoveryMarketId: "in-mh-mumbai",
      adminSearch: {
        tokens: ["bandra", "future", "mumbai"],
        sortKey: "bandra",
        updatedAt: "SERVER_TIMESTAMP",
        updatedBySource: "adminEventSearchBackfill",
      },
    }),
    "events/delhi-future-run-1": eventDoc({
      startTime: new Date("2099-01-03T01:30:00.000Z"),
      discoveryCityName: "delhi",
      discoveryMarketId: "in-dl-delhi-ncr",
      adminSearch: {
        tokens: ["delhi", "future"],
        sortKey: "delhi",
        updatedAt: "SERVER_TIMESTAMP",
        updatedBySource: "adminEventSearchBackfill",
      },
    }),
  });

  const result = await adminListEventDetailsHandler(
    callableRequest("admin-1", {
      citySlugs: ["in-mp-indore", "in-mh-mumbai"],
      status: "active",
      timeWindow: "upcoming",
    }, {support: true}),
    h.deps
  );

  assert.deepEqual(
    result.rows.map((row) => row.eventId),
    ["afterfly-future-run-1", "bandra-future-run-1"]
  );
});

test("adminGetEventDetailsHandler returns editable event details", async () => {
  const h = harness({
    "organizers/afterfly": organizerDoc(),
    "events/afterfly-social-run-1": eventDoc(),
  });

  const result = await adminGetEventDetailsHandler(
    callableRequest("admin-1", {
      eventId: " afterfly-social-run-1 ",
    }, {support: true}),
    h.deps
  );

  assert.equal(result.event.eventId, "afterfly-social-run-1");
  assert.equal(result.event.organizerName, "AFTER FLY");
  assert.equal(result.event.description, "Source-backed social run.");
  assert.equal(result.event.eventFormat.activityKind, "socialRun");
  assert.equal(result.event.discovery.citySlug, "in-mp-indore");
  assert.equal(result.event.crossPathsDiscoveryEnabled, false);
});

test("rich admin details skip incomplete private basics", async () => {
  const h = harness({
    "organizers/afterfly": organizerDoc(),
    "events/private-1": eventDoc({
      name: "September meetup",
      publicationState: "private",
      setupRevision: 1,
      endTime: undefined,
      capacityLimit: undefined,
      priceInPaise: undefined,
    }),
  });
  const listed = await adminListEventDetailsHandler(
    callableRequest("admin-1", {limit: 10}, {support: true}), h.deps
  );
  assert.deepEqual(listed.rows, []);
  await assert.rejects(adminGetEventDetailsHandler(
    callableRequest("admin-1", {eventId: "private-1"},
      {support: true}), h.deps
  ), (error) => assertHttpsCode(error, "failed-precondition"));
});

test(
  "admin owners can select a bounded upcoming Mumbai pilot event",
  async () => {
    const h = harness({
      "organizers/bandra-runners": organizerDoc({
        name: "Bandra Runners",
        location: "in-mh-mumbai",
        locationCityId: "in-mh-mumbai",
        locationMarketId: "in-mh-mumbai",
        cityName: "Mumbai",
      }),
      "events/bandra-run-1": eventDoc({
        organizerId: "bandra-runners",
        discoveryCityName: "mumbai",
        discoveryMarketId: "in-mh-mumbai",
      }),
    });

    const result = await adminUpdateEventDetailsHandler(
      callableRequest("admin-1", {
        eventId: "bandra-run-1",
        fields: {crossPathsDiscoveryEnabled: true},
        reviewNote: "Selected for the approved Mumbai pilot.",
      }, {adminOwner: true}),
      h.deps
    );

    assert.equal(result.updatedFieldCount, 1);
    assert.equal(
      h.firestore.get("events/bandra-run-1")?.crossPathsDiscoveryEnabled,
      true
    );
    assert.equal(h.firestore.auditLogs().length, 1);
  }
);

test(
  "admin owners can select a Mumbai event with bounded pair inventory",
  async () => {
    const h = harness({
      "organizers/bandra-runners": organizerDoc({
        name: "Bandra Runners",
        location: "in-mh-mumbai",
        locationCityId: "in-mh-mumbai",
        locationMarketId: "in-mh-mumbai",
        cityName: "Mumbai",
      }),
      "events/bandra-run-1": eventDoc({
        organizerId: "bandra-runners",
        discoveryCityName: "mumbai",
        discoveryMarketId: "in-mh-mumbai",
        eventPolicy: {
          version: 1,
          admission: {
            format: "open",
            capacityLimit: 30,
            waitlistPolicy: {mode: "fifo", offerWindowMinutes: 20},
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
              reservedPairCapacity: 4,
              holdDurationMinutes: 15,
            },
          },
          pricing: {
            basePriceInPaise: 15000,
            cohortAdjustmentsInPaise: {},
            demandPricingRules: [],
          },
          cancellation: {policyId: "standard"},
          settlement: {hostPayoutTiming: "afterEventCompletion"},
        },
      }),
    });

    const result = await adminUpdateEventDetailsHandler(
      callableRequest("admin-1", {
        eventId: "bandra-run-1",
        fields: {crossPathsDiscoveryEnabled: true},
        reviewNote: "Selected with organizer-controlled pair capacity.",
      }, {adminOwner: true}),
      h.deps
    );

    assert.equal(result.updatedFieldCount, 1);
    assert.equal(
      h.firestore.get("events/bandra-run-1")?.crossPathsDiscoveryEnabled,
      true
    );
  }
);

test("support cannot change the Cross Paths selected-event gate", async () => {
  const h = harness({
    "organizers/bandra-runners": organizerDoc(),
    "events/bandra-run-1": eventDoc({
      discoveryMarketId: "in-mh-mumbai",
    }),
  });

  await assert.rejects(
    () => adminUpdateEventDetailsHandler(
      callableRequest("support-1", {
        eventId: "bandra-run-1",
        fields: {crossPathsDiscoveryEnabled: true},
        reviewNote: "Attempted pilot selection.",
      }, {support: true}),
      h.deps
    ),
    (error) => assertHttpsCode(error, "permission-denied")
  );
});

test(
  "the selected-event gate rejects non-Mumbai and over-broad pilots",
  async () => {
    const selected = Object.fromEntries([1, 2, 3].map((index) => [
      `events/mumbai-selected-${index}`,
      eventDoc({
        discoveryMarketId: "in-mh-mumbai",
        crossPathsDiscoveryEnabled: true,
        startTime: new Date(`2026-07-0${index + 4}T01:30:00.000Z`),
      }),
    ]));
    const overBroad = harness({
      "organizers/bandra-runners": organizerDoc(),
      ...selected,
      "events/bandra-run-1": eventDoc({
        discoveryMarketId: "in-mh-mumbai",
      }),
    });
    await assert.rejects(
      () => adminUpdateEventDetailsHandler(
        callableRequest("admin-1", {
          eventId: "bandra-run-1",
          fields: {crossPathsDiscoveryEnabled: true},
          reviewNote: "Would exceed the three-event pilot.",
        }, {admin: true}),
        overBroad.deps
      ),
      (error) => assertHttpsCode(error, "resource-exhausted")
    );

    const nonMumbai = harness({
      "organizers/afterfly": organizerDoc(),
      "events/afterfly-social-run-1": eventDoc(),
    });
    await assert.rejects(
      () => adminUpdateEventDetailsHandler(
        callableRequest("admin-1", {
          eventId: "afterfly-social-run-1",
          fields: {crossPathsDiscoveryEnabled: true},
          reviewNote: "Wrong market.",
        }, {admin: true}),
        nonMumbai.deps
      ),
      (error) => assertHttpsCode(error, "failed-precondition")
    );
  }
);

test("adminUpdateEventDetailsHandler saves audited safe fields", async () => {
  const h = harness({
    "organizers/afterfly": organizerDoc(),
    "events/afterfly-social-run-1": eventDoc({
      eventFormat: {
        version: 1,
        activityKind: "socialRun",
        interactionModel: "pacePods",
        defaultPlaybookId: "social-run-default",
        defaultModuleIds: ["arrival", "pairing"],
        eventSuccessPrimitives: {
          setupModules: ["arrival"],
          liveModules: ["pairing"],
          postEventModules: ["recap"],
        },
        activityDetails: {surface: "park"},
      },
    }),
  });

  const result = await adminUpdateEventDetailsHandler(
    callableRequest("admin-1", {
      eventId: "afterfly-social-run-1",
      fields: {
        description: "Updated app-facing event copy.",
        distanceKm: 4.5,
        pace: "moderate",
        eventFormat: {
          version: 1,
          activityKind: "yoga",
          interactionModel: "hostLedProgram",
          customActivityLabel: "Sunset Yoga",
        },
      },
      reviewNote: "Reviewed source page and app preview.",
    }, {support: true}),
    h.deps
  );

  assert.equal(result.eventId, "afterfly-social-run-1");
  assert.equal(result.updatedFieldCount, 4);
  const updated = h.firestore.get("events/afterfly-social-run-1");
  assert.equal(updated?.description, "Updated app-facing event copy.");
  assert.equal(updated?.distanceKm, 4.5);
  assert.equal(updated?.pace, "moderate");
  assert.equal(getPath(updated ?? {}, ["eventFormat", "activityKind"]), "yoga");
  assert.equal(
    getPath(updated ?? {}, ["eventFormat", "defaultPlaybookId"]),
    "social-run-default"
  );
  assert.deepEqual(
    getPath(updated ?? {}, ["eventFormat", "defaultModuleIds"]),
    ["arrival", "pairing"]
  );
  assert.deepEqual(
    getPath(updated ?? {}, ["eventFormat", "eventSuccessPrimitives"]),
    {
      setupModules: ["arrival"],
      liveModules: ["pairing"],
      postEventModules: ["recap"],
    }
  );
  assert.deepEqual(
    getPath(updated ?? {}, ["eventFormat", "activityDetails"]),
    {surface: "park"}
  );
  assert.equal(getPath(updated ?? {}, ["discoveryActivityKind"]), "yoga");
  assert.equal(
    getPath(updated ?? {}, ["adminSearch", "updatedBySource"]),
    "adminUpdateEventDetails"
  );
  const tokens = getPath(updated ?? {}, ["adminSearch", "tokens"]);
  assert.ok(Array.isArray(tokens));
  assert.ok(tokens.includes("afterfly"));
  assert.ok(tokens.includes("sunset"));
  assert.equal(h.firestore.auditLogs().length, 1);
  assert.equal(h.firestore.auditLogs()[0].action, "adminUpdateEventDetails");
});

test("adminUpdateEventDetailsHandler rejects cancelled events", async () => {
  const h = harness({
    "organizers/afterfly": organizerDoc(),
    "events/afterfly-social-run-1": eventDoc({status: "cancelled"}),
  });

  await assert.rejects(
    () => adminUpdateEventDetailsHandler(
      callableRequest("admin-1", {
        eventId: "afterfly-social-run-1",
        fields: {description: "Cannot update"},
        reviewNote: "Cancelled event guard.",
      }, {support: true}),
      h.deps
    ),
    (error) => assertHttpsCode(error, "failed-precondition")
  );
});

test("adminUpdateEventDetailsHandler requires review notes", async () => {
  const h = harness({
    "organizers/afterfly": organizerDoc(),
    "events/afterfly-social-run-1": eventDoc(),
  });

  await assert.rejects(
    () => adminUpdateEventDetailsHandler(
      callableRequest("admin-1", {
        eventId: "afterfly-social-run-1",
        fields: {description: "Missing audit context."},
      }, {support: true}),
      h.deps
    ),
    (error) => assertHttpsCode(error, "invalid-argument")
  );
});

test("adminGetEventDetailsHandler denies viewer-only admins", async () => {
  const h = harness({
    "organizers/afterfly": organizerDoc(),
    "events/afterfly-social-run-1": eventDoc(),
  });

  await assert.rejects(
    () => adminGetEventDetailsHandler(
      callableRequest("admin-1", {
        eventId: "afterfly-social-run-1",
      }, {salesStaff: true}),
      h.deps
    ),
    (error) => assertHttpsCode(error, "permission-denied")
  );
});

test("real pilot review is private, audited and rejects stale staff decisions",
  async () => {
    const h = harness({"organizers/afterfly": organizerDoc(),
      "events/afterfly-social-run-1": eventDoc()});
    const data = {eventId: "afterfly-social-run-1", reviewNote: "Real pilot",
      fields: {hostPilotReview: {realEvent: true, expectedRevision: 0}}};
    await assert.rejects(adminUpdateEventDetailsHandler(
      callableRequest("staff", data, {support: true}), h.deps),
    (error) => assertHttpsCode(error, "permission-denied"));
    await adminUpdateEventDetailsHandler(
      callableRequest("staff", data, {admin: true}), h.deps);
    const loaded = await adminGetEventDetailsHandler(callableRequest("staff",
      {eventId: data.eventId}, {admin: true}), h.deps);
    assert.equal(loaded.event.hostPilotReview?.realEvent, true);
    assert.equal(loaded.event.hostPilotReview?.revision, 1);
    await assert.rejects(adminUpdateEventDetailsHandler(
      callableRequest("staff", data, {admin: true}), h.deps),
    (error) => assertHttpsCode(error, "failed-precondition"));
  });

test("pilot review cannot recreate data after a Sales privacy restriction",
  async () => {
    const h = harness({"organizers/afterfly": organizerDoc(),
      "events/afterfly-social-run-1": eventDoc(),
      "salesPrivacyRestrictions/afterfly": {}});
    await assert.rejects(adminUpdateEventDetailsHandler(
      callableRequest("staff", {eventId: "afterfly-social-run-1",
        reviewNote: "Synthetic restricted organiser",
        fields: {hostPilotReview: {realEvent: true, expectedRevision: 0}}},
      {admin: true}), h.deps),
    (error) => assertHttpsCode(error, "failed-precondition"));
  });
