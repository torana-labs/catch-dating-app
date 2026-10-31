import assert from "node:assert/strict";
import test from "node:test";
import {CallableRequest, HttpsError} from "firebase-functions/v2/https";
import {adminSetOrganizerIndexStatusHandler} from "./organizerIndexing";

type FakeData = Record<string, unknown>;

class FakeDocRef {
  readonly id: string;

  constructor(readonly firestore: FakeFirestore, readonly path: string) {
    this.id = path.split("/").at(-1) ?? "";
  }
}

class FakeSnapshot {
  constructor(private readonly value: FakeData | undefined) {}

  get exists(): boolean {
    return this.value !== undefined;
  }

  data(): FakeData | undefined {
    return this.value === undefined ? undefined : {...this.value};
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

  where(fieldPath: string, op: "==", value: unknown) {
    return new FakeQuery(this.firestore, this.path)
      .where(fieldPath, op, value);
  }

  limit(count: number) {
    return new FakeQuery(this.firestore, this.path).limit(count);
  }
}

class FakeQuery {
  private readonly filters: Array<{fieldPath: string; value: unknown}> = [];
  private limitCount = 1000;

  constructor(
    private readonly firestore: FakeFirestore,
    private readonly path: string
  ) {}

  where(fieldPath: string, op: "==", value: unknown) {
    assert.equal(op, "==");
    const next = new FakeQuery(this.firestore, this.path);
    next.filters.push(...this.filters, {fieldPath, value});
    next.limitCount = this.limitCount;
    return next;
  }

  limit(count: number) {
    const next = new FakeQuery(this.firestore, this.path);
    next.filters.push(...this.filters);
    next.limitCount = count;
    return next;
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
    return this.filters.every((filter) =>
      getPath(value, filter.fieldPath.split(".")) === filter.value
    );
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
    ...overrides,
  };
}

function completeChecklist() {
  return {
    sourceEvidenceVerified: true,
    mediaRightsVerified: true,
    cadenceVerified: true,
    ownerContactVerified: true,
  };
}

function assertHttpsCode(error: unknown, code: string): boolean {
  assert.equal((error as {code?: string}).code, code);
  return true;
}

test("adminSetOrganizerIndexStatusHandler marks a page index-ready",
  async () => {
    const h = harness({
      "organizers/afterfly-run-club-indore": organizerDoc(),
    });

    const result = await adminSetOrganizerIndexStatusHandler(
      callableRequest("admin-1", {
        organizerId: "afterfly-run-club-indore",
        indexStatus: "indexReady",
        checklist: completeChecklist(),
        reviewNote:
          "Sources, cadence, media rights, and owner contact checked.",
      }, {support: true}),
      h.deps
    );

    assert.deepEqual(result, {
      organizerId: "afterfly-run-club-indore",
      indexStatus: "indexReady",
      publishStatus: "published",
      robots: "index, follow",
    });
    assert.deepEqual(
      h.firestore.get("organizers/afterfly-run-club-indore")?.publicPage,
      {
        slug: "afterfly-run-club",
        citySlug: "indore",
        canonicalPath: "/organizers/indore/afterfly-run-club/",
        publishStatus: "published",
        indexStatus: "indexReady",
        robots: "index, follow",
        seoTitle: "AFTER FLY",
        seoDescription: "Indore organizer profile.",
        lastRenderedAt: null,
        indexReview: {
          reviewedAt: "SERVER_TIMESTAMP",
          reviewedByUid: "admin-1",
          indexStatus: "indexReady",
          checklist: completeChecklist(),
          reviewNote:
          "Sources, cadence, media rights, and owner contact checked.",
        },
      }
    );
    const reservation = h.firestore.get(
      "publicRouteReservations/organizers__indore__afterfly-run-club"
    );
    assert.equal(reservation?.status, "active");
    assert.equal(
      reservation?.targetPath,
      "organizers/afterfly-run-club-indore"
    );
    assert.equal(
      reservation?.routePath,
      "/organizers/indore/afterfly-run-club/"
    );
    assert.equal(reservation?.lastVerifiedByUid, "admin-1");
    assert.equal(
      reservation?.lastVerifiedSource,
      "adminSetOrganizerIndexStatus"
    );
    const search = h.firestore.get("organizers/afterfly-run-club-indore")
      ?.adminSearch as FakeData | undefined;
    assert.equal(search?.updatedBySource, "adminSetOrganizerIndexStatus");
    assert.ok((search?.tokens as string[]).includes("afterfly"));
    assert.equal(h.firestore.auditLogs().length, 1);
  });

test("adminSetOrganizerIndexStatusHandler rejects reserved route conflicts",
  async () => {
    const h = harness({
      "organizers/afterfly-run-club-indore": organizerDoc(),
      "publicRouteReservations/organizers__indore__afterfly-run-club": {
        status: "active",
        targetPath: "organizers/other-organizer",
        routePath: "/organizers/indore/afterfly-run-club/",
      },
    });

    await assert.rejects(
      () => adminSetOrganizerIndexStatusHandler(
        callableRequest("admin-1", {
          organizerId: "afterfly-run-club-indore",
          indexStatus: "indexReady",
          checklist: completeChecklist(),
          reviewNote: "Checked route before indexing.",
        }, {support: true}),
        h.deps
      ),
      (error) => assertHttpsCode(error, "already-exists")
    );
  }
);

test("adminSetOrganizerIndexStatusHandler rejects incomplete index checklist",
  async () => {
    const h = harness({
      "organizers/afterfly-run-club-indore": organizerDoc(),
    });

    await assert.rejects(
      () => adminSetOrganizerIndexStatusHandler(
        callableRequest("admin-1", {
          organizerId: "afterfly-run-club-indore",
          indexStatus: "indexReady",
          checklist: {
            ...completeChecklist(),
            mediaRightsVerified: false,
          },
        }, {support: true}),
        h.deps
      ),
      (error) => assertHttpsCode(error, "failed-precondition")
    );
  }
);

test("adminSetOrganizerIndexStatusHandler refuses to publish operator content",
  async () => {
    const leaked = organizerDoc({
      publicProfile: {
        summary: "This unclaimed profile stays out of search until verified.",
        facts: [{label: "Indexing", value: "Noindex until verified"}],
      },
    });
    const h = harness({"organizers/afterfly-run-club-indore": leaked});

    await assert.rejects(
      () => adminSetOrganizerIndexStatusHandler(
        callableRequest("admin-1", {
          organizerId: "afterfly-run-club-indore",
          indexStatus: "indexReady",
          checklist: completeChecklist(),
          reviewNote: "Sources, cadence, media rights, and owner contact.",
        }, {support: true}),
        h.deps
      ),
      (error) => {
        assertHttpsCode(error, "failed-precondition");
        assert.match((error as Error).message, /publicProfile\.summary/u);
        assert.match((error as Error).message, /publicProfile\.facts\[0\]/u);
        return true;
      }
    );
    assert.deepEqual(h.firestore.get("organizers/afterfly-run-club-indore"),
      leaked);

    await adminSetOrganizerIndexStatusHandler(
      callableRequest("admin-1", {
        organizerId: "afterfly-run-club-indore",
        indexStatus: "noindex",
        checklist: completeChecklist(),
        reviewNote: "Taking the page out of the index.",
      }, {support: true}),
      h.deps
    );
    assert.equal(
      ((h.firestore.get("organizers/afterfly-run-club-indore")
        ?.publicPage) as FakeData).publishStatus,
      "qa",
      "unpublishing stays available while content needs repair"
    );
  });

test("adminSetOrganizerIndexStatusHandler blocks viewer-only admins",
  async () => {
    const h = harness({
      "organizers/afterfly-run-club-indore": organizerDoc(),
    });

    await assert.rejects(
      () => adminSetOrganizerIndexStatusHandler(
        callableRequest("admin-1", {
          organizerId: "afterfly-run-club-indore",
          indexStatus: "noindex",
          checklist: completeChecklist(),
        }, {analyticsViewer: true}),
        h.deps
      ),
      (error) => assertHttpsCode(error, "permission-denied")
    );
  });

test("adminSetOrganizerIndexStatusHandler requires review notes", async () => {
  const h = harness({
    "organizers/afterfly-run-club-indore": organizerDoc(),
  });

  await assert.rejects(
    () => adminSetOrganizerIndexStatusHandler(
      callableRequest("admin-1", {
        organizerId: "afterfly-run-club-indore",
        indexStatus: "indexReady",
        checklist: completeChecklist(),
      }, {support: true}),
      h.deps
    ),
    (error) => assertHttpsCode(error, "invalid-argument")
  );
});

test(
  "adminSetOrganizerIndexStatusHandler enforces the rate limit before writing",
  async () => {
    const h = harness({
      "organizers/afterfly-run-club-indore": organizerDoc(),
    });
    const rateLimitCalls: string[] = [];

    await assert.rejects(
      () => adminSetOrganizerIndexStatusHandler(
        callableRequest("admin-1", {
          organizerId: "afterfly-run-club-indore",
          indexStatus: "indexReady",
          checklist: completeChecklist(),
          reviewNote: "Checked route before indexing.",
        }, {support: true}),
        {
          ...h.deps,
          checkRateLimit: async (
            _db: FirebaseFirestore.Firestore,
            uid: string,
            action: string
          ) => {
            rateLimitCalls.push(`${uid}:${action}`);
            throw new HttpsError("resource-exhausted", "Too many requests.");
          },
        }
      ),
      (error) => assertHttpsCode(error, "resource-exhausted")
    );

    assert.deepEqual(rateLimitCalls, ["admin-1:adminSetOrganizerIndexStatus"]);
    // The page must be untouched when the request is throttled.
    const page = h.firestore.get("organizers/afterfly-run-club-indore")
      ?.publicPage as {indexStatus?: string} | undefined;
    assert.equal(page?.indexStatus, "noindex");
    assert.equal(h.firestore.auditLogs().length, 0);
  }
);
