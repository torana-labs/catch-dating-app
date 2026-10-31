import assert from "node:assert/strict";
import test from "node:test";
import {CallableRequest} from "firebase-functions/v2/https";
import {adminRecordOrganizerCurationHandler} from "./organizerCuration";

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
    return this.value === undefined ? undefined : structuredClone(this.value);
  }
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

  set(path: string, data: FakeData) {
    this.docs[path] = structuredClone(data);
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

  async get(ref: FakeDocRef): Promise<FakeSnapshot> {
    return new FakeSnapshot(this.firestore.get(ref.path));
  }

  set(
    ref: FakeDocRef,
    data: FakeData,
    options?: {merge?: boolean}
  ) {
    this.writes.push(() => {
      if (options?.merge) {
        this.firestore.set(ref.path, {
          ...(this.firestore.get(ref.path) ?? {}),
          ...data,
        });
        return;
      }
      this.firestore.set(ref.path, data);
    });
  }

  commit() {
    for (const write of this.writes) write();
  }
}

function harness(initialDocs: Record<string, FakeData | undefined> = {}) {
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

function attachPayload(overrides: FakeData = {}) {
  return {
    operationType: "attach_surface",
    entityId: "afterfly",
    sourceCandidateId: "2026-06-17-afterfly-search:sort-my-scene",
    surface: surface(),
    reason: "Surface belongs to this organizer.",
    ...overrides,
  };
}

function surface(overrides: FakeData = {}) {
  return {
    surfaceId: "afterfly-sort-my-scene",
    platform: "sortMyScene",
    surfaceKind: "organizerProfile",
    url: "https://sortmyscene.com/organizer/afterfly",
    normalizedKey: "sortmyscene:organizer:afterfly",
    role: "secondary",
    status: "candidate",
    confidence: {
      city: "medium",
      entityMatch: "high",
      ownership: "medium",
    },
    crawl: {
      eventDiscoveryStatus: "disabled",
      policy: "manualOnly",
      supportsEventExtraction: false,
    },
    evidenceRefs: [],
    notes: "Search candidate title: Afterfly.",
    ...overrides,
  };
}

function assertHttpsCode(error: unknown, code: string): boolean {
  assert.equal((error as {code?: string}).code, code);
  return true;
}

test("adminRecordOrganizerCurationHandler records an attach-surface operation",
  async () => {
    const h = harness();

    const result = await adminRecordOrganizerCurationHandler(
      callableRequest("admin-1", attachPayload(), {support: true}),
      h.deps
    );

    assert.deepEqual(result, {
      operationId: "attach-afterfly-afterfly-sort-my-scene",
      operationType: "attach_surface",
      operationStatus: "active",
      decisionPath:
        "organizerIntakeCurationDecisions/" +
        "attach-afterfly-afterfly-sort-my-scene",
    });
    assert.deepEqual(
      h.firestore.get(
        "organizerIntakeCurationDecisions/" +
        "attach-afterfly-afterfly-sort-my-scene"
      ),
      {
        schemaVersion: 1,
        operationId: "attach-afterfly-afterfly-sort-my-scene",
        operationType: "attach_surface",
        operationStatus: "active",
        entityId: "afterfly",
        sourceCandidateId: "2026-06-17-afterfly-search:sort-my-scene",
        surfaceId: "afterfly-sort-my-scene",
        surface: surface(),
        reason: "Surface belongs to this organizer.",
        reviewedByUid: "admin-1",
        reviewedAt: "SERVER_TIMESTAMP",
        updatedAt: "SERVER_TIMESTAMP",
      }
    );
    assert.equal(h.firestore.auditLogs().length, 1);
  });

test("adminRecordOrganizerCurationHandler keeps crawl disabled for attachments",
  async () => {
    const h = harness();

    await assert.rejects(
      () => adminRecordOrganizerCurationHandler(
        callableRequest("admin-1", attachPayload({
          surface: surface({
            crawl: {
              eventDiscoveryStatus: "approved",
              policy: "manualOnly",
              supportsEventExtraction: false,
            },
          }),
        }), {support: true}),
        h.deps
      ),
      (error) => assertHttpsCode(error, "failed-precondition")
    );
  });

test("adminRecordOrganizerCurationHandler rejects self-merges", async () => {
  const h = harness();

  await assert.rejects(
    () => adminRecordOrganizerCurationHandler(
      callableRequest("admin-1", {
        operationType: "merge_entity",
        sourceEntityId: "afterfly",
        targetEntityId: "afterfly",
        reason: "Duplicate organizer.",
      }, {support: true}),
      h.deps
    ),
    (error) => assertHttpsCode(error, "invalid-argument")
  );
});

test("adminRecordOrganizerCurationHandler blocks viewer-only admins",
  async () => {
    const h = harness();

    await assert.rejects(
      () => adminRecordOrganizerCurationHandler(
        callableRequest("admin-1", attachPayload(), {salesStaff: true}),
        h.deps
      ),
      (error) => assertHttpsCode(error, "permission-denied")
    );
  });

test("adminRecordOrganizerCurationHandler uses explicit rate limit action",
  async () => {
    const h = harness();
    const rateLimitCalls: string[] = [];

    await adminRecordOrganizerCurationHandler(
      callableRequest("admin-1", attachPayload(), {support: true}),
      {
        ...h.deps,
        checkRateLimit: async (_db, uid, action) => {
          rateLimitCalls.push(`${uid}:${action}`);
        },
      }
    );

    assert.deepEqual(rateLimitCalls, ["admin-1:adminRecordOrganizerCuration"]);
  });
