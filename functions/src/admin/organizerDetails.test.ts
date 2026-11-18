import assert from "node:assert/strict";
import test from "node:test";
import {CallableRequest} from "firebase-functions/v2/https";
import {
  adminGetOrganizerDetailsHandler,
  adminListOrganizerDetailsHandler,
  adminUpdateOrganizerDetailsHandler,
} from "./organizerDetails";

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

  doc(docId?: string) {
    return new FakeDocRef(
      this.firestore,
      `${this.path}/${docId ?? this.firestore.autoId()}`
    );
  }

  where(
    fieldPath: string,
    op: "==" | "in" | "array-contains-any",
    value: unknown
  ) {
    return new FakeQuery(this.firestore, this.path)
      .where(fieldPath, op, value);
  }

  limit(count: number) {
    return new FakeQuery(this.firestore, this.path).limit(count);
  }
}

class FakeQuery {
  private readonly filters: Array<{
    fieldPath: string;
    op: "==" | "in" | "array-contains-any";
    value: unknown;
  }> = [];
  private limitCount = 1000;

  constructor(
    private readonly firestore: FakeFirestore,
    private readonly path: string
  ) {}

  where(
    fieldPath: string,
    op: "==" | "in" | "array-contains-any",
    value: unknown
  ) {
    const next = new FakeQuery(this.firestore, this.path);
    next.filters.push(...this.filters, {fieldPath, op, value});
    next.limitCount = this.limitCount;
    return next;
  }

  limit(count: number) {
    const next = new FakeQuery(this.firestore, this.path);
    next.filters.push(...this.filters);
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
      return fieldValue === filter.value;
    });
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

  create(ref: FakeDocRef, data: FakeData) {
    this.writes.push(() => {
      if (this.firestore.get(ref.path) !== undefined) {
        throw new Error(`Existing doc for create: ${ref.path}`);
      }
      this.firestore.set(ref.path, structuredClone(data));
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
    if (!child || typeof child !== "object") {
      cursor[segment] = {};
    }
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
    name: "MOON MOTH",
    description: "Movement and music community in Indore.",
    location: "in-mp-indore",
    locationCityId: "in-mp-indore",
    locationMarketId: "in-mp-indore",
    area: "Indore",
    tags: ["run club"],
    instagramHandle: "moonmoth.example",
    phoneNumber: null,
    email: null,
    imageUrl: null,
    profileImageUrl: null,
    entityKind: "creatorCommunity",
    entitySubtypes: ["social run club"],
    displayCategory: "Run club",
    cityName: "Indore",
    regionName: "Madhya Pradesh",
    countryCode: "IN",
    countryName: "India",
    appVisibility: "hidden",
    ownership: {state: "programmatic"},
    claim: {state: "unclaimed"},
    publicPage: {
      slug: "moonmoth-run-club",
      citySlug: "indore",
      canonicalPath: "/organizers/indore/moonmoth-run-club/",
      publishStatus: "qa",
      indexStatus: "noindex",
      robots: "noindex, follow",
      seoTitle: "MOON MOTH",
      seoDescription: "Indore organizer profile.",
      lastRenderedAt: null,
    },
    provenance: {
      origin: "scraper",
      sourceConfidence: "high",
      verificationStatus: "sourceBacked",
      lastVerifiedAt: null,
    },
    publicProfile: {
      headline: "MOON MOTH in Indore",
      summary: "A public event source connects MOON MOTH to Indore.",
      sourceSummary: "Luma event page confirmed.",
      formats: ["Run and rave"],
      facts: [],
      eventEvidence: [],
    },
    adminSearch: {
      tokens: [
        "moonmoth",
        "after",
        "run",
        "club",
        "indore",
        "moonmoth-run-club",
      ],
      sortKey: "moonmoth",
      updatedAt: "SERVER_TIMESTAMP",
      updatedBySource: "adminUpdateOrganizerDetails",
    },
    ...overrides,
  };
}

function assertHttpsCode(error: unknown, code: string): boolean {
  assert.equal((error as {code?: string}).code, code);
  return true;
}

test("adminGetOrganizerDetailsHandler returns a review-safe club snapshot",
  async () => {
    const h = harness({
      "organizers/moonmoth-run-club-indore": organizerDoc(),
    });

    const result = await adminGetOrganizerDetailsHandler(
      callableRequest("admin-1", {
        organizerId: " moonmoth-run-club-indore ",
      }, {support: true}),
      h.deps
    );

    assert.equal(result.organizer.organizerId, "moonmoth-run-club-indore");
    assert.equal(result.organizer.name, "MOON MOTH");
    assert.equal(result.organizer.publicPage.indexStatus, "noindex");
    assert.equal(result.organizer.provenance.sourceConfidence, "high");
    assert.deepEqual(result.organizer.publicProfile.formats, ["Run and rave"]);
    assert.equal("missingEvidence" in result.organizer.publicProfile, false);
  }
);

test("adminListOrganizerDetailsHandler returns canonical organizer rows",
  async () => {
    const h = harness({
      "organizers/moonmoth-run-club-indore": organizerDoc(),
      "organizers/bandra-social-run": organizerDoc({
        name: "Bandra Social Run",
        location: "in-mh-mumbai",
        locationCityId: "in-mh-mumbai",
        locationMarketId: "in-mh-mumbai",
        cityName: "Mumbai",
        publicPage: {
          slug: "bandra-social-run",
          citySlug: "mumbai",
          canonicalPath: "/organizers/mumbai/bandra-social-run/",
          publishStatus: "published",
          indexStatus: "indexReady",
          robots: "index, follow",
          seoTitle: "Bandra Social Run",
          seoDescription: "Mumbai organizer profile.",
          lastRenderedAt: null,
        },
        adminSearch: {
          tokens: ["bandra", "social", "run", "mumbai"],
          sortKey: "bandra",
          updatedAt: "SERVER_TIMESTAMP",
          updatedBySource: "adminUpdateOrganizerDetails",
        },
      }),
      "publicRouteReservations/organizers__mumbai__bandra-social-run": {
        status: "active",
        targetPath: "organizers/bandra-social-run",
        routePath: "/organizers/mumbai/bandra-social-run/",
      },
    });

    const result = await adminListOrganizerDetailsHandler(
      callableRequest("admin-1", {
        citySlug: "in-mh-mumbai",
        query: "bandra",
        limit: 10,
      }, {support: true}),
      h.deps
    );

    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].organizerId, "bandra-social-run");
    assert.equal(result.rows[0].routeStatus, "valid");
    assert.equal(result.rows[0].routeReservationStatus, "reserved");
    assert.equal(result.rows[0].searchIndexStatus, "indexed");
    assert.equal(result.rows[0].publishStatus, "published");
    assert.equal(result.generatedAt, "2026-06-25T08:30:00.000Z");
  }
);

test(
  "adminListOrganizerDetailsHandler supports bounded launch-city filters",
  async () => {
    const h = harness({
      "organizers/moonmoth-run-club-indore": organizerDoc(),
      "organizers/bandra-social-run": organizerDoc({
        name: "Bandra Social Run",
        location: "in-mh-mumbai",
        locationCityId: "in-mh-mumbai",
        locationMarketId: "in-mh-mumbai",
        cityName: "Mumbai",
        publicPage: {
          slug: "bandra-social-run",
          citySlug: "mumbai",
          canonicalPath: "/organizers/mumbai/bandra-social-run/",
          publishStatus: "published",
          indexStatus: "indexReady",
          robots: "index, follow",
          seoTitle: "Bandra Social Run",
          seoDescription: "Mumbai organizer profile.",
          lastRenderedAt: null,
        },
      }),
      "organizers/daybreak-run-club": organizerDoc({
        name: "Daybreak Run Club",
        location: "in-dl-delhi-ncr",
        locationCityId: "in-dl-new-delhi",
        locationMarketId: "in-dl-delhi-ncr",
        cityName: "Delhi",
        publicPage: {
          slug: "daybreak-run-club",
          citySlug: "delhi",
          canonicalPath: "/organizers/delhi/daybreak-run-club/",
          publishStatus: "qa",
          indexStatus: "noindex",
          robots: "noindex, follow",
          seoTitle: "Daybreak Run Club",
          seoDescription: "Delhi organizer profile.",
          lastRenderedAt: null,
        },
      }),
    });

    const result = await adminListOrganizerDetailsHandler(
      callableRequest("admin-1", {
        citySlugs: [" in-mp-indore ", "in-mh-mumbai", "in-mp-indore"],
        limit: 10,
      }, {support: true}),
      h.deps
    );

    assert.deepEqual(
      result.rows.map((row) => row.organizerId).sort(),
      ["moonmoth-run-club-indore", "bandra-social-run"]
    );
  }
);

test("adminUpdateOrganizerDetailsHandler saves allowed cleanup fields",
  async () => {
    const h = harness({
      "organizers/moonmoth-run-club-indore": organizerDoc(),
    });

    const result = await adminUpdateOrganizerDetailsHandler(
      callableRequest("admin-1", {
        organizerId: "moonmoth-run-club-indore",
        fields: {
          name: " Moonmoth Run Club ",
          tags: [" social run ", "social run", ""],
          email: "hello@moonmoth.example ",
          publicPage: {
            seoTitle: "Moonmoth Run Club | Indore organizer profile",
          },
          provenance: {
            sourceConfidence: "high",
            verificationStatus: "sourceBacked",
          },
          publicProfile: {
            headline: "Moonmoth Run Club in Indore",
          },
        },
        reviewNote: "Cleaned up naming and owner contact.",
      }, {admin: true}),
      h.deps
    );

    assert.equal(result.organizerId, "moonmoth-run-club-indore");
    assert.equal(result.updatedFieldCount, 8);
    const organizer = h.firestore.get("organizers/moonmoth-run-club-indore");
    assert.equal(organizer?.name, "Moonmoth Run Club");
    assert.deepEqual(organizer?.tags, ["social run"]);
    assert.equal(organizer?.email, "hello@moonmoth.example");
    assert.equal(
      (organizer?.publicPage as FakeData).seoTitle,
      "Moonmoth Run Club | Indore organizer profile"
    );
    assert.equal(
      (organizer?.provenance as FakeData).lastVerifiedAt,
      "SERVER_TIMESTAMP"
    );
    assert.equal((organizer?.adminSearch as FakeData).updatedBySource,
      "adminUpdateOrganizerDetails");
    assert.ok(((organizer?.adminSearch as FakeData).tokens as string[])
      .includes("moonmoth"));
    assert.equal(h.firestore.auditLogs().length, 1);
  });

test("admins set, clear and release the organizer women-led label",
  async () => {
    const id = "moonmoth-run-club-indore";
    const h = harness({[`organizers/${id}`]: organizerDoc({womenLed: {
      value: true, setByUid: "host-1", setByRole: "owner",
      setAt: "EARLIER", lockedByAdmin: false}})});
    const moderate = (womenLed: string, token: FakeData = {admin: true}) =>
      adminUpdateOrganizerDetailsHandler(callableRequest("admin-1", {
        organizerId: id, fields: {womenLed},
        reviewNote: "Report: the label does not match the hosts.",
      }, token), h.deps);

    const result = await moderate("clear");
    assert.equal(result.updatedFieldCount, 1);
    assert.deepEqual(h.firestore.get(`organizers/${id}`)?.womenLed, {
      value: false, setByUid: "admin-1", setByRole: "admin",
      setAt: "SERVER_TIMESTAMP", lockedByAdmin: true});
    const [audit] = h.firestore.auditLogs();
    assert.deepEqual((audit.after as FakeData).updatedFields,
      ["adminSearch", "womenLed"]);
    assert.equal(((audit.before as FakeData).organizer as FakeData)
      .womenLed && (((audit.before as FakeData).organizer as FakeData)
      .womenLed as FakeData).value, true);

    await moderate("release", {support: true});
    assert.deepEqual(h.firestore.get(`organizers/${id}`)?.womenLed, {
      value: false, setByUid: "admin-1", setByRole: "admin",
      setAt: "SERVER_TIMESTAMP", lockedByAdmin: false});
    await moderate("set");
    assert.equal((h.firestore.get(`organizers/${id}`)?.womenLed as FakeData)
      .value, true);
    assert.equal(h.firestore.auditLogs().length, 3);

    await assert.rejects(() => moderate("clear", {salesStaff: true}),
      (error) => assertHttpsCode(error, "permission-denied"));
  });

test("adminUpdateOrganizerDetailsHandler replaces the organizer page links",
  async () => {
    const h = harness({"organizers/moonmoth-run-club-indore": organizerDoc()});

    await adminUpdateOrganizerDetailsHandler(
      callableRequest("admin-1", {
        organizerId: "moonmoth-run-club-indore",
        fields: {ownerLinks: [
          {id: "tickets", label: " Tickets ", subtitle: " ",
            url: " https://www.district.in/moonmoth ", icon: "tickets",
            pinned: false, showUntil: null},
          {id: "drop", label: "Diwali run kit", subtitle: "Pre-order",
            url: "https://shop.moonmoth.example/kit", icon: null, pinned: true,
            showUntil: "2026-11-14T12:00:00.000Z"},
        ]},
        reviewNote: "Owner sent their links over WhatsApp.",
      }, {admin: true}),
      h.deps
    );

    const links = h.firestore.get("organizers/moonmoth-run-club-indore")
      ?.ownerLinks as FakeData[];
    assert.deepEqual(links[0], {id: "tickets", label: "Tickets",
      subtitle: null, url: "https://www.district.in/moonmoth",
      icon: "tickets", pinned: false, showUntil: null});
    assert.equal(links[1].id, "drop");
    assert.equal((links[1].showUntil as {_seconds: number})._seconds,
      Date.parse("2026-11-14T12:00:00.000Z") / 1000);

    const read = await adminGetOrganizerDetailsHandler(
      callableRequest("admin-1", {organizerId: "moonmoth-run-club-indore"},
        {support: true}),
      h.deps
    );
    assert.deepEqual(read.organizer.ownerLinks.map((link) => link.showUntil),
      [null, "2026-11-14T12:00:00.000Z"]);
  });

test("adminUpdateOrganizerDetailsHandler refuses links the page may not show",
  async () => {
    const before = organizerDoc();
    const h = harness({"organizers/moonmoth-run-club-indore": before});
    const link = {id: "short", label: "Tickets", subtitle: null,
      url: "https://bit.ly/moonmoth", icon: null, pinned: false,
      showUntil: null};
    for (const [ownerLinks, code] of [
      [[link], "invalid-argument"],
      [[{...link, url: "http://moonmoth.example/"}], "invalid-argument"],
      [[{...link, url: "https://moonmoth.example/",
        label: "Seed listing for owner review"}], "failed-precondition"],
    ] as const) {
      await assert.rejects(
        () => adminUpdateOrganizerDetailsHandler(
          callableRequest("admin-1", {
            organizerId: "moonmoth-run-club-indore",
            fields: {ownerLinks},
            reviewNote: "Added the owner's links.",
          }, {admin: true}),
          h.deps
        ),
        (error) => assertHttpsCode(error, code),
        JSON.stringify(ownerLinks)
      );
    }
    assert.deepEqual(h.firestore.get("organizers/moonmoth-run-club-indore"),
      before);
  });

test("first edit of source-seeded fields records immutable corrections",
  async () => {
    const source = {
      sourceProfileId: "organizer_discovery:officialWebsite",
      sourceWorkItemId: "work-moonmoth",
      sourceCandidateId: "candidate-moonmoth",
      seededFields: [
        {
          field: "name",
          extractedValue: "MOON MOTH",
          artifactId: "artifact-moonmoth",
          contentHash: "a".repeat(64),
          locator: "candidate.title",
          extractedBy: "deterministic",
          extractorVersion: "supply-intake-v1",
          confidence: 0.9,
        },
        {
          field: "publicProfile.formats",
          extractedValue: ["Run and rave"],
          artifactId: "artifact-moonmoth",
          contentHash: "a".repeat(64),
          locator: "candidate.reviewContext.formats",
          extractedBy: "human",
          extractorVersion: "supply-intake-v1",
          confidence: 0.8,
        },
      ],
      capturedAt: "SERVER_TIMESTAMP",
    };
    const h = harness({
      "organizers/moonmoth-run-club-indore": organizerDoc({
        intakeLearningSource: source,
      }),
    });

    await adminUpdateOrganizerDetailsHandler(
      callableRequest("admin-1", {
        organizerId: "moonmoth-run-club-indore",
        fields: {
          name: "Moonmoth",
          publicProfile: {formats: ["Social run", "Dance"]},
        },
        reviewNote: "Corrected the official name and current formats.",
      }, {admin: true}),
      h.deps
    );

    const corrections = h.firestore.entries()
      .filter(([path]) =>
        path.startsWith("organizerIntakeFieldCorrections/"))
      .map(([, value]) => value as FakeData);
    assert.equal(corrections.length, 2);
    assert.deepEqual(
      corrections.map((correction) => correction.field).sort(),
      ["name", "publicProfile.formats"]
    );
    assert.ok(corrections.every((correction) =>
      correction.sourceProfileId ===
        "organizer_discovery:officialWebsite" &&
      typeof correction.fixtureId === "string" &&
      correction.reviewNote ===
        "Corrected the official name and current formats."));

    await adminUpdateOrganizerDetailsHandler(
      callableRequest("admin-1", {
        organizerId: "moonmoth-run-club-indore",
        fields: {name: "Moonmoth Mumbai"},
        reviewNote: "Subsequent editorial change.",
      }, {admin: true}),
      h.deps
    );
    assert.equal(
      h.firestore.entries().filter(([path]) =>
        path.startsWith("organizerIntakeFieldCorrections/")).length,
      2
    );
  });

test("adminUpdateOrganizerDetailsHandler reserves changed canonical routes",
  async () => {
    const h = harness({
      "organizers/moonmoth-run-club-indore": organizerDoc(),
      "publicRouteReservations/organizers__indore__moonmoth-run-club": {
        status: "active",
        targetPath: "organizers/moonmoth-run-club-indore",
        routePath: "/organizers/indore/moonmoth-run-club/",
      },
    });

    const result = await adminUpdateOrganizerDetailsHandler(
      callableRequest("admin-1", {
        organizerId: "moonmoth-run-club-indore",
        fields: {
          publicPage: {
            slug: "moonmoth",
            citySlug: "indore",
            canonicalPath: "/organizers/indore/moonmoth/",
          },
        },
        reviewNote: "Updated route to the simpler public slug.",
      }, {admin: true}),
      h.deps
    );

    assert.equal(result.updatedFieldCount, 3);
    const newReservation = h.firestore.get(
      "publicRouteReservations/organizers__indore__moonmoth"
    );
    assert.equal(newReservation?.status, "active");
    assert.equal(
      newReservation?.targetPath,
      "organizers/moonmoth-run-club-indore"
    );
    assert.equal(newReservation?.routePath, "/organizers/indore/moonmoth/");
    assert.deepEqual(newReservation?.routeSegments, [
      "organizers",
      "indore",
      "moonmoth",
    ]);
    assert.equal(newReservation?.lastVerifiedByUid, "admin-1");
    assert.equal(newReservation?.lastVerifiedSource,
      "adminUpdateOrganizerDetails");
    const previousReservation = h.firestore.get(
      "publicRouteReservations/organizers__indore__moonmoth-run-club"
    );
    assert.equal(previousReservation?.status, "released");
    assert.equal(
      previousReservation?.replacementRoutePath,
      "/organizers/indore/moonmoth/"
    );
  }
);

test("adminUpdateOrganizerDetailsHandler rejects reserved route conflicts",
  async () => {
    const h = harness({
      "organizers/duplicate-moonmoth": organizerDoc({
        name: "Duplicate Moonmoth",
        publicPage: {
          slug: "duplicate-moonmoth",
          citySlug: "indore",
          canonicalPath: "/organizers/indore/duplicate-moonmoth/",
          publishStatus: "qa",
          indexStatus: "noindex",
          robots: "noindex, follow",
          seoTitle: "Duplicate",
          seoDescription: "Duplicate profile.",
          lastRenderedAt: null,
        },
      }),
      "publicRouteReservations/organizers__indore__claimed-route": {
        status: "active",
        targetPath: "organizers/other-organizer",
        routePath: "/organizers/indore/claimed-route/",
      },
    });

    await assert.rejects(
      () => adminUpdateOrganizerDetailsHandler(
        callableRequest("admin-1", {
          organizerId: "duplicate-moonmoth",
          fields: {
            publicPage: {
              slug: "claimed-route",
              citySlug: "indore",
              canonicalPath: "/organizers/indore/claimed-route/",
            },
          },
          reviewNote: "Checked route before publish.",
        }, {admin: true}),
        h.deps
      ),
      (error) => assertHttpsCode(error, "already-exists")
    );
  }
);

test("adminUpdateOrganizerDetailsHandler rejects duplicate canonical paths",
  async () => {
    const h = harness({
      "organizers/moonmoth-run-club-indore": organizerDoc(),
      "organizers/duplicate-moonmoth": organizerDoc({
        name: "Duplicate Moonmoth",
        publicPage: {
          slug: "duplicate-moonmoth",
          citySlug: "indore",
          canonicalPath: "/organizers/indore/duplicate-moonmoth/",
          publishStatus: "qa",
          indexStatus: "noindex",
          robots: "noindex, follow",
          seoTitle: "Duplicate",
          seoDescription: "Duplicate profile.",
          lastRenderedAt: null,
        },
      }),
    });

    await assert.rejects(
      () => adminUpdateOrganizerDetailsHandler(
        callableRequest("admin-1", {
          organizerId: "duplicate-moonmoth",
          fields: {
            publicPage: {
              slug: "moonmoth-run-club",
              citySlug: "indore",
              canonicalPath: "/organizers/indore/moonmoth-run-club/",
            },
          },
          reviewNote: "Checked duplicate route before publish.",
        }, {admin: true}),
        h.deps
      ),
      (error) => assertHttpsCode(error, "already-exists")
    );
  }
);

test("adminUpdateOrganizerDetailsHandler rejects path and slug mismatch",
  async () => {
    const h = harness({
      "organizers/moonmoth-run-club-indore": organizerDoc(),
    });

    await assert.rejects(
      () => adminUpdateOrganizerDetailsHandler(
        callableRequest("admin-1", {
          organizerId: "moonmoth-run-club-indore",
          fields: {
            publicPage: {
              slug: "moonmoth-run-club",
              canonicalPath: "/organizers/indore/wrong-slug/",
            },
          },
          reviewNote: "Checked route shape before publish.",
        }, {admin: true}),
        h.deps
      ),
      (error) => assertHttpsCode(error, "invalid-argument")
    );
  }
);

test("adminUpdateOrganizerDetailsHandler rejects protected index fields",
  async () => {
    const h = harness({
      "organizers/moonmoth-run-club-indore": organizerDoc(),
    });

    await assert.rejects(
      () => adminUpdateOrganizerDetailsHandler(
        callableRequest("admin-1", {
          organizerId: "moonmoth-run-club-indore",
          fields: {
            publicPage: {
              indexStatus: "indexReady",
            },
          },
        }, {admin: true}),
        h.deps
      ),
      (error) => assertHttpsCode(error, "invalid-argument")
    );
  }
);

test(
  "adminUpdateOrganizerDetailsHandler keeps operator text out of public fields",
  async () => {
    const before = organizerDoc();
    const h = harness({"organizers/moonmoth-run-club-indore": before});

    for (const fields of [
      {publicProfile: {
        summary: "This unclaimed profile summarizes verified public facts " +
          "for owner review and stays out of search until confirmed.",
      }},
      {description: "Source-backed seed listing pending admin review."},
      {publicPage: {seoDescription: "Noindex until verified."}},
    ]) {
      await assert.rejects(
        () => adminUpdateOrganizerDetailsHandler(
          callableRequest("admin-1", {
            organizerId: "moonmoth-run-club-indore",
            fields,
            reviewNote: "Recorded intake findings.",
          }, {admin: true}),
          h.deps
        ),
        (error) => assertHttpsCode(error, "failed-precondition"),
        JSON.stringify(fields)
      );
    }
    // Operator-only lists left the contract, so the payload schema rejects
    // them before any policy check.
    for (const field of ["fitNotes", "missingEvidence"]) {
      await assert.rejects(
        () => adminUpdateOrganizerDetailsHandler(
          callableRequest("admin-1", {
            organizerId: "moonmoth-run-club-indore",
            fields: {publicProfile: {[field]: ["Owner contact"]}},
            reviewNote: "Recorded intake findings.",
          }, {admin: true}),
          h.deps
        ),
        (error) => assertHttpsCode(error, "invalid-argument"),
        field
      );
    }
    assert.deepEqual(h.firestore.get("organizers/moonmoth-run-club-indore"),
      before);
    assert.equal(h.firestore.auditLogs().length, 0);
  });

test("adminUpdateOrganizerDetailsHandler refuses to publish operator content",
  async () => {
    const leaked = organizerDoc({
      publicProfile: {
        ...(organizerDoc().publicProfile as FakeData),
        facts: [{label: "Claim state", value: "Unclaimed"}],
      },
      publicSources: [{
        type: "user_supplied",
        label: "Request",
        detail: "Requested by a teammate.",
        href: null,
        confidence: "medium",
        lastCheckedAt: null,
      }],
    });
    const h = harness({"organizers/moonmoth-run-club-indore": leaked});

    await assert.rejects(
      () => adminUpdateOrganizerDetailsHandler(
        callableRequest("admin-1", {
          organizerId: "moonmoth-run-club-indore",
          fields: {publicPage: {publishStatus: "published"}},
          reviewNote: "Publishing after review.",
        }, {admin: true}),
        h.deps
      ),
      (error) => {
        assertHttpsCode(error, "failed-precondition");
        assert.match((error as Error).message,
          /publicProfile\.facts\[0\].*publicSources\[0\]\.href/u);
        return true;
      }
    );
    assert.equal(
      ((h.firestore.get("organizers/moonmoth-run-club-indore")
        ?.publicPage) as FakeData).publishStatus,
      "qa"
    );

    const clean = harness({
      "organizers/moonmoth-run-club-indore": organizerDoc(),
    });
    await adminUpdateOrganizerDetailsHandler(
      callableRequest("admin-1", {
        organizerId: "moonmoth-run-club-indore",
        fields: {publicPage: {publishStatus: "published"}},
        reviewNote: "Publishing after review.",
      }, {admin: true}),
      clean.deps
    );
    assert.equal(
      ((clean.firestore.get("organizers/moonmoth-run-club-indore")
        ?.publicPage) as FakeData).publishStatus,
      "published"
    );
  });

test("adminUpdateOrganizerDetailsHandler requires review notes", async () => {
  const h = harness({
    "organizers/moonmoth-run-club-indore": organizerDoc(),
  });

  await assert.rejects(
    () => adminUpdateOrganizerDetailsHandler(
      callableRequest("admin-1", {
        organizerId: "moonmoth-run-club-indore",
        fields: {name: "Moonmoth"},
      }, {admin: true}),
      h.deps
    ),
    (error) => assertHttpsCode(error, "invalid-argument")
  );
});

test("adminUpdateOrganizerDetailsHandler blocks viewer-only admins",
  async () => {
    const h = harness({
      "organizers/moonmoth-run-club-indore": organizerDoc(),
    });

    await assert.rejects(
      () => adminUpdateOrganizerDetailsHandler(
        callableRequest("admin-1", {
          organizerId: "moonmoth-run-club-indore",
          fields: {name: "Moonmoth"},
        }, {salesStaff: true}),
        h.deps
      ),
      (error) => assertHttpsCode(error, "permission-denied")
    );
  });
