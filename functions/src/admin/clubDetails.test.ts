import assert from "node:assert/strict";
import test from "node:test";
import {CallableRequest} from "firebase-functions/v2/https";
import {
  adminGetClubDetailsHandler,
  adminListClubDetailsHandler,
  adminUpdateClubDetailsHandler,
} from "./clubDetails";

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

function clubDoc(overrides: FakeData = {}): FakeData {
  return {
    name: "AFTER FLY",
    description: "Movement and music community in Indore.",
    location: "in-mp-indore",
    locationCityId: "in-mp-indore",
    locationMarketId: "in-mp-indore",
    area: "Indore",
    tags: ["run club"],
    instagramHandle: "afterfly.in",
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
      slug: "afterfly-run-club",
      citySlug: "indore",
      canonicalPath: "/organizers/indore/afterfly-run-club/",
      publishStatus: "qa",
      indexStatus: "noindex",
      robots: "noindex, follow",
      seoTitle: "AFTER FLY",
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
      headline: "AFTER FLY in Indore",
      summary: "A public event source connects AFTER FLY to Indore.",
      sourceSummary: "Luma event page confirmed.",
      formats: ["Run and rave"],
      facts: [],
      eventEvidence: [],
    },
    adminSearch: {
      tokens: [
        "afterfly",
        "after",
        "run",
        "club",
        "indore",
        "afterfly-run-club",
      ],
      sortKey: "afterfly",
      updatedAt: "SERVER_TIMESTAMP",
      updatedBySource: "adminUpdateClubDetails",
    },
    ...overrides,
  };
}

function assertHttpsCode(error: unknown, code: string): boolean {
  assert.equal((error as {code?: string}).code, code);
  return true;
}

test("adminGetClubDetailsHandler returns a review-safe club snapshot",
  async () => {
    const h = harness({
      "organizers/afterfly-run-club-indore": clubDoc(),
    });

    const result = await adminGetClubDetailsHandler(
      callableRequest("admin-1", {
        clubId: " afterfly-run-club-indore ",
      }, {support: true}),
      h.deps
    );

    assert.equal(result.club.clubId, "afterfly-run-club-indore");
    assert.equal(result.club.name, "AFTER FLY");
    assert.equal(result.club.publicPage.indexStatus, "noindex");
    assert.equal(result.club.provenance.sourceConfidence, "high");
    assert.deepEqual(result.club.publicProfile.formats, ["Run and rave"]);
    assert.equal("missingEvidence" in result.club.publicProfile, false);
  }
);

test("adminListClubDetailsHandler returns canonical organizer rows",
  async () => {
    const h = harness({
      "organizers/afterfly-run-club-indore": clubDoc(),
      "organizers/bandra-social-run": clubDoc({
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
          updatedBySource: "adminUpdateClubDetails",
        },
      }),
      "publicRouteReservations/organizers__mumbai__bandra-social-run": {
        status: "active",
        targetPath: "organizers/bandra-social-run",
        routePath: "/organizers/mumbai/bandra-social-run/",
      },
    });

    const result = await adminListClubDetailsHandler(
      callableRequest("admin-1", {
        citySlug: "in-mh-mumbai",
        query: "bandra",
        limit: 10,
      }, {support: true}),
      h.deps
    );

    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].clubId, "bandra-social-run");
    assert.equal(result.rows[0].routeStatus, "valid");
    assert.equal(result.rows[0].routeReservationStatus, "reserved");
    assert.equal(result.rows[0].searchIndexStatus, "indexed");
    assert.equal(result.rows[0].publishStatus, "published");
    assert.equal(result.generatedAt, "2026-06-25T08:30:00.000Z");
  }
);

test(
  "adminListClubDetailsHandler supports bounded launch-city filters",
  async () => {
    const h = harness({
      "organizers/afterfly-run-club-indore": clubDoc(),
      "organizers/bandra-social-run": clubDoc({
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
      "organizers/delhi-run-club": clubDoc({
        name: "Delhi Run Club",
        location: "in-dl-delhi-ncr",
        locationCityId: "in-dl-new-delhi",
        locationMarketId: "in-dl-delhi-ncr",
        cityName: "Delhi",
        publicPage: {
          slug: "delhi-run-club",
          citySlug: "delhi",
          canonicalPath: "/organizers/delhi/delhi-run-club/",
          publishStatus: "qa",
          indexStatus: "noindex",
          robots: "noindex, follow",
          seoTitle: "Delhi Run Club",
          seoDescription: "Delhi organizer profile.",
          lastRenderedAt: null,
        },
      }),
    });

    const result = await adminListClubDetailsHandler(
      callableRequest("admin-1", {
        citySlugs: [" in-mp-indore ", "in-mh-mumbai", "in-mp-indore"],
        limit: 10,
      }, {support: true}),
      h.deps
    );

    assert.deepEqual(
      result.rows.map((row) => row.clubId).sort(),
      ["afterfly-run-club-indore", "bandra-social-run"]
    );
  }
);

test("adminUpdateClubDetailsHandler saves allowed cleanup fields", async () => {
  const h = harness({
    "organizers/afterfly-run-club-indore": clubDoc(),
  });

  const result = await adminUpdateClubDetailsHandler(
    callableRequest("admin-1", {
      clubId: "afterfly-run-club-indore",
      fields: {
        name: " Afterfly Run Club ",
        tags: [" social run ", "social run", ""],
        email: "hello@afterfly.in ",
        publicPage: {
          seoTitle: "Afterfly Run Club | Indore organizer profile",
        },
        provenance: {
          sourceConfidence: "high",
          verificationStatus: "sourceBacked",
        },
        publicProfile: {
          headline: "Afterfly Run Club in Indore",
        },
      },
      reviewNote: "Cleaned up naming and owner contact.",
    }, {admin: true}),
    h.deps
  );

  assert.equal(result.clubId, "afterfly-run-club-indore");
  assert.equal(result.updatedFieldCount, 8);
  const club = h.firestore.get("organizers/afterfly-run-club-indore");
  assert.equal(club?.name, "Afterfly Run Club");
  assert.deepEqual(club?.tags, ["social run"]);
  assert.equal(club?.email, "hello@afterfly.in");
  assert.equal(
    (club?.publicPage as FakeData).seoTitle,
    "Afterfly Run Club | Indore organizer profile"
  );
  assert.equal(
    (club?.provenance as FakeData).lastVerifiedAt,
    "SERVER_TIMESTAMP"
  );
  assert.equal((club?.adminSearch as FakeData).updatedBySource,
    "adminUpdateClubDetails");
  assert.ok(((club?.adminSearch as FakeData).tokens as string[])
    .includes("afterfly"));
  assert.equal(h.firestore.auditLogs().length, 1);
});

test("adminUpdateClubDetailsHandler replaces the organizer page links",
  async () => {
    const h = harness({"organizers/afterfly-run-club-indore": clubDoc()});

    await adminUpdateClubDetailsHandler(
      callableRequest("admin-1", {
        clubId: "afterfly-run-club-indore",
        fields: {ownerLinks: [
          {id: "tickets", label: " Tickets ", subtitle: " ",
            url: " https://www.district.in/afterfly ", icon: "tickets",
            pinned: false, showUntil: null},
          {id: "drop", label: "Diwali run kit", subtitle: "Pre-order",
            url: "https://shop.afterfly.in/kit", icon: null, pinned: true,
            showUntil: "2026-11-14T12:00:00.000Z"},
        ]},
        reviewNote: "Owner sent their links over WhatsApp.",
      }, {admin: true}),
      h.deps
    );

    const links = h.firestore.get("organizers/afterfly-run-club-indore")
      ?.ownerLinks as FakeData[];
    assert.deepEqual(links[0], {id: "tickets", label: "Tickets",
      subtitle: null, url: "https://www.district.in/afterfly",
      icon: "tickets", pinned: false, showUntil: null});
    assert.equal(links[1].id, "drop");
    assert.equal((links[1].showUntil as {_seconds: number})._seconds,
      Date.parse("2026-11-14T12:00:00.000Z") / 1000);

    const read = await adminGetClubDetailsHandler(
      callableRequest("admin-1", {clubId: "afterfly-run-club-indore"},
        {support: true}),
      h.deps
    );
    assert.deepEqual(read.club.ownerLinks.map((link) => link.showUntil),
      [null, "2026-11-14T12:00:00.000Z"]);
  });

test("adminUpdateClubDetailsHandler refuses links the page may not show",
  async () => {
    const before = clubDoc();
    const h = harness({"organizers/afterfly-run-club-indore": before});
    const link = {id: "short", label: "Tickets", subtitle: null,
      url: "https://bit.ly/afterfly", icon: null, pinned: false,
      showUntil: null};
    for (const [ownerLinks, code] of [
      [[link], "invalid-argument"],
      [[{...link, url: "http://afterfly.in/"}], "invalid-argument"],
      [[{...link, url: "https://afterfly.in/",
        label: "Seed listing for owner review"}], "failed-precondition"],
    ] as const) {
      await assert.rejects(
        () => adminUpdateClubDetailsHandler(
          callableRequest("admin-1", {
            clubId: "afterfly-run-club-indore",
            fields: {ownerLinks},
            reviewNote: "Added the owner's links.",
          }, {admin: true}),
          h.deps
        ),
        (error) => assertHttpsCode(error, code),
        JSON.stringify(ownerLinks)
      );
    }
    assert.deepEqual(h.firestore.get("organizers/afterfly-run-club-indore"),
      before);
  });

test("first edit of source-seeded fields records immutable corrections",
  async () => {
    const source = {
      sourceProfileId: "organizer_discovery:officialWebsite",
      sourceWorkItemId: "work-afterfly",
      sourceCandidateId: "candidate-afterfly",
      seededFields: [
        {
          field: "name",
          extractedValue: "AFTER FLY",
          artifactId: "artifact-afterfly",
          contentHash: "a".repeat(64),
          locator: "candidate.title",
          extractedBy: "deterministic",
          extractorVersion: "supply-intake-v1",
          confidence: 0.9,
        },
        {
          field: "publicProfile.formats",
          extractedValue: ["Run and rave"],
          artifactId: "artifact-afterfly",
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
      "organizers/afterfly-run-club-indore": clubDoc({
        intakeLearningSource: source,
      }),
    });

    await adminUpdateClubDetailsHandler(
      callableRequest("admin-1", {
        clubId: "afterfly-run-club-indore",
        fields: {
          name: "Afterfly",
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

    await adminUpdateClubDetailsHandler(
      callableRequest("admin-1", {
        clubId: "afterfly-run-club-indore",
        fields: {name: "Afterfly Mumbai"},
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

test("adminUpdateClubDetailsHandler reserves changed canonical routes",
  async () => {
    const h = harness({
      "organizers/afterfly-run-club-indore": clubDoc(),
      "publicRouteReservations/organizers__indore__afterfly-run-club": {
        status: "active",
        targetPath: "organizers/afterfly-run-club-indore",
        routePath: "/organizers/indore/afterfly-run-club/",
      },
    });

    const result = await adminUpdateClubDetailsHandler(
      callableRequest("admin-1", {
        clubId: "afterfly-run-club-indore",
        fields: {
          publicPage: {
            slug: "afterfly",
            citySlug: "indore",
            canonicalPath: "/organizers/indore/afterfly/",
          },
        },
        reviewNote: "Updated route to the simpler public slug.",
      }, {admin: true}),
      h.deps
    );

    assert.equal(result.updatedFieldCount, 3);
    const newReservation = h.firestore.get(
      "publicRouteReservations/organizers__indore__afterfly"
    );
    assert.equal(newReservation?.status, "active");
    assert.equal(
      newReservation?.targetPath,
      "organizers/afterfly-run-club-indore"
    );
    assert.equal(newReservation?.routePath, "/organizers/indore/afterfly/");
    assert.deepEqual(newReservation?.routeSegments, [
      "organizers",
      "indore",
      "afterfly",
    ]);
    assert.equal(newReservation?.lastVerifiedByUid, "admin-1");
    assert.equal(newReservation?.lastVerifiedSource, "adminUpdateClubDetails");
    const previousReservation = h.firestore.get(
      "publicRouteReservations/organizers__indore__afterfly-run-club"
    );
    assert.equal(previousReservation?.status, "released");
    assert.equal(
      previousReservation?.replacementRoutePath,
      "/organizers/indore/afterfly/"
    );
  }
);

test("adminUpdateClubDetailsHandler rejects reserved route conflicts",
  async () => {
    const h = harness({
      "organizers/duplicate-afterfly": clubDoc({
        name: "Duplicate Afterfly",
        publicPage: {
          slug: "duplicate-afterfly",
          citySlug: "indore",
          canonicalPath: "/organizers/indore/duplicate-afterfly/",
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
      () => adminUpdateClubDetailsHandler(
        callableRequest("admin-1", {
          clubId: "duplicate-afterfly",
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

test("adminUpdateClubDetailsHandler rejects duplicate canonical paths",
  async () => {
    const h = harness({
      "organizers/afterfly-run-club-indore": clubDoc(),
      "organizers/duplicate-afterfly": clubDoc({
        name: "Duplicate Afterfly",
        publicPage: {
          slug: "duplicate-afterfly",
          citySlug: "indore",
          canonicalPath: "/organizers/indore/duplicate-afterfly/",
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
      () => adminUpdateClubDetailsHandler(
        callableRequest("admin-1", {
          clubId: "duplicate-afterfly",
          fields: {
            publicPage: {
              slug: "afterfly-run-club",
              citySlug: "indore",
              canonicalPath: "/organizers/indore/afterfly-run-club/",
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

test("adminUpdateClubDetailsHandler rejects path and slug mismatch",
  async () => {
    const h = harness({
      "organizers/afterfly-run-club-indore": clubDoc(),
    });

    await assert.rejects(
      () => adminUpdateClubDetailsHandler(
        callableRequest("admin-1", {
          clubId: "afterfly-run-club-indore",
          fields: {
            publicPage: {
              slug: "afterfly-run-club",
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

test("adminUpdateClubDetailsHandler rejects protected index fields",
  async () => {
    const h = harness({
      "organizers/afterfly-run-club-indore": clubDoc(),
    });

    await assert.rejects(
      () => adminUpdateClubDetailsHandler(
        callableRequest("admin-1", {
          clubId: "afterfly-run-club-indore",
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

test("adminUpdateClubDetailsHandler keeps operator text out of public fields",
  async () => {
    const before = clubDoc();
    const h = harness({"organizers/afterfly-run-club-indore": before});

    for (const fields of [
      {publicProfile: {
        summary: "This unclaimed profile summarizes verified public facts " +
          "for owner review and stays out of search until confirmed.",
      }},
      {description: "Source-backed seed listing pending admin review."},
      {publicPage: {seoDescription: "Noindex until verified."}},
    ]) {
      await assert.rejects(
        () => adminUpdateClubDetailsHandler(
          callableRequest("admin-1", {
            clubId: "afterfly-run-club-indore",
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
        () => adminUpdateClubDetailsHandler(
          callableRequest("admin-1", {
            clubId: "afterfly-run-club-indore",
            fields: {publicProfile: {[field]: ["Owner contact"]}},
            reviewNote: "Recorded intake findings.",
          }, {admin: true}),
          h.deps
        ),
        (error) => assertHttpsCode(error, "invalid-argument"),
        field
      );
    }
    assert.deepEqual(h.firestore.get("organizers/afterfly-run-club-indore"),
      before);
    assert.equal(h.firestore.auditLogs().length, 0);
  });

test("adminUpdateClubDetailsHandler refuses to publish operator content",
  async () => {
    const leaked = clubDoc({
      publicProfile: {
        ...(clubDoc().publicProfile as FakeData),
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
    const h = harness({"organizers/afterfly-run-club-indore": leaked});

    await assert.rejects(
      () => adminUpdateClubDetailsHandler(
        callableRequest("admin-1", {
          clubId: "afterfly-run-club-indore",
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
      ((h.firestore.get("organizers/afterfly-run-club-indore")
        ?.publicPage) as FakeData).publishStatus,
      "qa"
    );

    const clean = harness({
      "organizers/afterfly-run-club-indore": clubDoc(),
    });
    await adminUpdateClubDetailsHandler(
      callableRequest("admin-1", {
        clubId: "afterfly-run-club-indore",
        fields: {publicPage: {publishStatus: "published"}},
        reviewNote: "Publishing after review.",
      }, {admin: true}),
      clean.deps
    );
    assert.equal(
      ((clean.firestore.get("organizers/afterfly-run-club-indore")
        ?.publicPage) as FakeData).publishStatus,
      "published"
    );
  });

test("adminUpdateClubDetailsHandler requires review notes", async () => {
  const h = harness({
    "organizers/afterfly-run-club-indore": clubDoc(),
  });

  await assert.rejects(
    () => adminUpdateClubDetailsHandler(
      callableRequest("admin-1", {
        clubId: "afterfly-run-club-indore",
        fields: {name: "Afterfly"},
      }, {admin: true}),
      h.deps
    ),
    (error) => assertHttpsCode(error, "invalid-argument")
  );
});

test("adminUpdateClubDetailsHandler blocks viewer-only admins", async () => {
  const h = harness({
    "organizers/afterfly-run-club-indore": clubDoc(),
  });

  await assert.rejects(
    () => adminUpdateClubDetailsHandler(
      callableRequest("admin-1", {
        clubId: "afterfly-run-club-indore",
        fields: {name: "Afterfly"},
      }, {analyticsViewer: true}),
      h.deps
    ),
    (error) => assertHttpsCode(error, "permission-denied")
  );
});
