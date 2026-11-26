import assert from "node:assert/strict";
import test from "node:test";
import {CallableRequest} from "firebase-functions/v2/https";
import {
  adminListExternalEventDetailsHandler,
} from "./externalEventDetails";

type FakeData = Record<string, unknown>;

class FakeSnapshot {
  constructor(private readonly value: FakeData | undefined) {}

  get exists(): boolean {
    return this.value !== undefined;
  }

  data(): FakeData | undefined {
    return this.value === undefined ? undefined : structuredClone(this.value);
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

  where(
    fieldPath: string,
    op: "==" | "in" | ">=" | "<",
    value: unknown
  ) {
    return new FakeQuery(this.firestore, this.path)
      .where(fieldPath, op, value);
  }

  limit(count: number) {
    return new FakeQuery(this.firestore, this.path).limit(count);
  }

  doc(id: string) {
    const path = `${this.path}/${id}`;
    const value = this.firestore.entries().find(([key]) => key === path)?.[1];
    this.firestore.pointReads.push(path);
    return {get: async () => Object.assign(new FakeSnapshot(value), {id})};
  }

  orderBy(fieldPath: string, direction: "asc" | "desc" = "asc") {
    return new FakeQuery(this.firestore, this.path)
      .orderBy(fieldPath, direction);
  }
}

class FakeQuery {
  private readonly filters: Array<{
    fieldPath: string;
    op: "==" | "in" | ">=" | "<";
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
    op: "==" | "in" | ">=" | "<",
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
  readonly pointReads: string[] = [];

  constructor(private readonly docs: Record<string, FakeData | undefined>) {}

  collection(collectionPath: string) {
    return new FakeCollectionRef(this, collectionPath);
  }

  entries(): Array<[string, FakeData | undefined]> {
    return Object.entries(this.docs).map(([path, value]) => [
      path,
      value === undefined ? undefined : structuredClone(value),
    ]);
  }
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
  const rateLimitCalls: string[] = [];
  return {
    firestore,
    rateLimitCalls,
    deps: {
      firestore: () =>
        firestore as unknown as FirebaseFirestore.Firestore,
      now: () => new Date("2026-06-25T08:30:00.000Z"),
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

function externalEventDoc(overrides: FakeData = {}): FakeData {
  return {
    schemaVersion: 1,
    eventId: "ext-moonmoth-future-run",
    canonicalHostId: "moonmoth",
    title: "Nightfall run",
    description: "Read-only external run.",
    startTime: new Date("2099-01-01T12:30:00.000Z"),
    endTime: new Date("2099-01-01T14:30:00.000Z"),
    timezone: "Asia/Kolkata",
    meetingPoint: "Nehru Park",
    meetingLocation: {
      name: "Nehru Park",
      address: "Indore",
      placeId: null,
      latitude: 22.7179,
      longitude: 75.8333,
      notes: "Use external source page.",
    },
    locationDetails: "Use external source page.",
    photoUrl: null,
    activity: {
      version: 1,
      activityKind: "socialRun",
      interactionModel: "openFormat",
      source: "heuristic",
    },
    price: {
      displayText: "0 INR",
      parsedPriceInPaise: 0,
      currency: "INR",
    },
    status: "active",
    publicationStatus: "public",
    booking: {
      mode: "external_outbound_only",
      catchBookingEnabled: false,
      catchPaymentsEnabled: false,
      catchReservationsEnabled: false,
      catchWaitlistEnabled: false,
      externalLinks: [{
        platform: "luma",
        url: "https://luma.com/mmoth26x",
        linkType: "booking_or_event_page",
        sourceEventKey: "luma:event:mmoth26x",
        candidateId: "candidate-1",
        primary: true,
      }],
    },
    discovery: {
      citySlug: "indore",
      countryCode: "IN",
      availability: "read_only_external",
      manualApprovalRequired: true,
    },
    dedupe: {
      normalizedEventKey: "moonmoth:2099-01-01:nightfall-run",
      primaryCandidateId: "candidate-1",
      duplicateCandidateIds: [],
      conflictPolicy: "single_read_only_event_with_multiple_outbound_links",
    },
    externalSource: {
      candidateId: "candidate-1",
      sourceEventKey: "luma:event:mmoth26x",
      sourceEventId: "mmoth26x",
      platform: "luma",
      eventUrl: "https://luma.com/mmoth26x",
      sourceUrl: "https://luma.com/mmoth26x",
    },
    review: {
      eventReviewBatchId: "2026-06-17-moonmoth-luma-events",
      reviewer: "admin-1",
      decidedAt: "2026-06-18",
      note: "Approved external read-only event.",
      importPolicyAcknowledged: true,
      ownerSafeCopyReviewed: true,
    },
    createdAt: new Date("2026-06-18T00:00:00.000Z"),
    updatedAt: new Date("2026-06-18T00:00:00.000Z"),
    ...overrides,
  };
}

function assertHttpsCode(error: unknown, code: string): boolean {
  assert.equal((error as {code?: string}).code, code);
  return true;
}

test(
  "adminListExternalEventDetailsHandler returns launch-city rows",
  async () => {
    const h = harness({
      "externalEvents/ext-moonmoth-future-run": externalEventDoc(),
      "externalEvents/ext-bandra-future-run": externalEventDoc({
        eventId: "ext-bandra-future-run",
        canonicalHostId: "sandbar-runners",
        title: "Bandra sunset run",
        startTime: new Date("2099-01-02T12:30:00.000Z"),
        discovery: {
          citySlug: "mumbai",
          countryCode: "IN",
          availability: "read_only_external",
          manualApprovalRequired: true,
        },
      }),
      "externalEvents/ext-delhi-future-run": externalEventDoc({
        eventId: "ext-delhi-future-run",
        title: "Delhi run",
        startTime: new Date("2099-01-03T12:30:00.000Z"),
        discovery: {
          citySlug: "delhi",
          countryCode: "IN",
          availability: "read_only_external",
          manualApprovalRequired: true,
        },
      }),
    });

    const result = await adminListExternalEventDetailsHandler(
      callableRequest("admin-1", {
        citySlugs: [" indore ", "mumbai", "indore"],
        publicationStatus: "public",
        status: "active",
        timeWindow: "upcoming",
        limit: 10,
      }, {support: true}),
      h.deps
    );

    assert.deepEqual(
      result.rows.map((row) => row.eventId),
      ["ext-moonmoth-future-run", "ext-bandra-future-run"]
    );
    assert.equal(
      result.rows[0].targetPath,
      "externalEvents/ext-moonmoth-future-run"
    );
    assert.equal(result.rows[0].availability, "read_only_external");
    assert.equal(
      result.rows[0].primaryExternalUrl,
      "https://luma.com/mmoth26x"
    );
    assert.deepEqual(
      h.rateLimitCalls,
      ["admin-1:adminListExternalEventDetails"]
    );
    assert.equal(result.generatedAt, "2026-06-25T08:30:00.000Z");
  }
);

test(
  "adminListExternalEventDetailsHandler searches source and dedupe text",
  async () => {
    const h = harness({
      "externalEvents/ext-moonmoth-future-run": externalEventDoc(),
      "externalEvents/ext-bandra-future-run": externalEventDoc({
        eventId: "ext-bandra-future-run",
        title: "Bandra sunset run",
        canonicalHostId: "sandbar-runners",
        externalSource: {
          candidateId: "candidate-2",
          sourceEventKey: "luma:event:bandra",
          sourceEventId: "bandra",
          platform: "luma",
          eventUrl: "https://luma.com/sandbar-sunsets",
          sourceUrl: "https://luma.com/sandbar-sunsets",
        },
        dedupe: {
          normalizedEventKey: "bandra:2099-01-02:sunset-run",
          primaryCandidateId: "candidate-2",
          duplicateCandidateIds: ["candidate-3"],
          conflictPolicy: "single_read_only_event_with_multiple_outbound_links",
        },
      }),
    });

    const result = await adminListExternalEventDetailsHandler(
      callableRequest("admin-1", {
        query: "bandra sunset",
        timeWindow: "all",
        limit: 10,
      }, {admin: true}),
      h.deps
    );

    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].eventId, "ext-bandra-future-run");
    assert.equal(result.rows[0].duplicateCandidateCount, 1);
  }
);

test(
  "adminListExternalEventDetailsHandler denies viewer-only admins",
  async () => {
    const h = harness({
      "externalEvents/ext-moonmoth-future-run": externalEventDoc(),
    });

    await assert.rejects(
      () => adminListExternalEventDetailsHandler(
        callableRequest("admin-1", {}, {salesStaff: true}),
        h.deps
      ),
      (error) => assertHttpsCode(error, "permission-denied")
    );
  }
);

test(
  "adminListExternalEventDetailsHandler reads one event by id, not a list",
  async () => {
    const h = harness({
      "externalEvents/ext-moonmoth-future-run": externalEventDoc(),
      // Past and archived: no default list would return it.
      "externalEvents/ext-moonmoth-old-run": externalEventDoc({
        eventId: "ext-moonmoth-old-run",
        title: "Old run",
        startTime: new Date("2020-01-01T12:30:00.000Z"),
        publicationStatus: "archived",
      }),
    });

    const found = await adminListExternalEventDetailsHandler(
      callableRequest("admin-1", {eventId: " ext-moonmoth-old-run "},
        {admin: true}),
      h.deps
    );
    assert.deepEqual(found.rows.map((row) => row.eventId),
      ["ext-moonmoth-old-run"]);
    assert.equal(found.rows[0].publicationStatus, "archived");
    assert.deepEqual(h.firestore.pointReads,
      ["externalEvents/ext-moonmoth-old-run"]);

    const missing = await adminListExternalEventDetailsHandler(
      callableRequest("admin-1", {eventId: "ext-nowhere"}, {admin: true}),
      h.deps
    );
    assert.deepEqual(missing.rows, []);
    assert.deepEqual(h.rateLimitCalls, [
      "admin-1:adminListExternalEventDetails",
      "admin-1:adminListExternalEventDetails",
    ]);
  }
);

test(
  "adminListExternalEventDetailsHandler refuses an event id with list filters",
  async () => {
    const h = harness({
      "externalEvents/ext-moonmoth-future-run": externalEventDoc(),
    });
    for (const filters of [{query: "nightfall"}, {limit: 5},
      {timeWindow: "all"}, {citySlug: "indore"}]) {
      await assert.rejects(
        () => adminListExternalEventDetailsHandler(
          callableRequest("admin-1",
            {eventId: "ext-moonmoth-future-run", ...filters}, {admin: true}),
          h.deps
        ),
        (error) => assertHttpsCode(error, "invalid-argument")
      );
    }
    await assert.rejects(
      () => adminListExternalEventDetailsHandler(
        callableRequest("admin-1", {eventId: "externalEvents/x"},
          {admin: true}),
        h.deps
      ),
      (error) => assertHttpsCode(error, "invalid-argument")
    );
    assert.deepEqual(h.firestore.pointReads, []);
  }
);

test(
  "adminListExternalEventDetailsHandler keeps the point read to its roles",
  async () => {
    const h = harness({
      "externalEvents/ext-moonmoth-future-run": externalEventDoc(),
    });
    await assert.rejects(
      () => adminListExternalEventDetailsHandler(
        callableRequest("admin-1", {eventId: "ext-moonmoth-future-run"},
          {salesStaff: true}),
        h.deps
      ),
      (error) => assertHttpsCode(error, "permission-denied")
    );
    assert.deepEqual(h.firestore.pointReads, []);
  }
);
