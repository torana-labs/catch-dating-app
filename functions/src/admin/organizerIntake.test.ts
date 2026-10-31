import assert from "node:assert/strict";
import test from "node:test";
import {CallableRequest} from "firebase-functions/v2/https";
import {adminDecideOrganizerIntakeHandler} from "./organizerIntake";

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

function completeChecklist() {
  return {
    identityReviewed: true,
    surfaceInventoryReviewed: true,
    ownerSafeCopyReviewed: true,
    marketScopeReviewed: true,
    mediaRightsReviewed: true,
    crawlDisabledReviewed: true,
  };
}

function incompleteChecklist() {
  return {
    ...completeChecklist(),
    mediaRightsReviewed: false,
  };
}

function approvalPayload(overrides: FakeData = {}) {
  return {
    entityId: "afterfly",
    decision: "approve_public",
    publishStatus: "draft",
    indexStatus: "noindex",
    appVisibility: "hidden",
    checklist: completeChecklist(),
    note: "Manual QA complete.",
    ...overrides,
  };
}

function assertHttpsCode(error: unknown, code: string): boolean {
  assert.equal((error as {code?: string}).code, code);
  return true;
}

test("adminDecideOrganizerIntakeHandler records an approval decision",
  async () => {
    const h = harness();

    const result = await adminDecideOrganizerIntakeHandler(
      callableRequest("admin-1", approvalPayload(), {support: true}),
      h.deps
    );

    assert.deepEqual(result, {
      entityId: "afterfly",
      decision: "approve_public",
      decisionStatus: "approved_public",
      publishStatus: "draft",
      indexStatus: "noindex",
      appVisibility: "hidden",
      decisionPath: "organizerIntakeReviewDecisions/afterfly",
      projectionState: "pending_static_generation",
    });
    assert.deepEqual(
      h.firestore.get("organizerIntakeReviewDecisions/afterfly"),
      {
        schemaVersion: 1,
        entityId: "afterfly",
        decision: "approve_public",
        decisionStatus: "approved_public",
        publishStatus: "draft",
        indexStatus: "noindex",
        appVisibility: "hidden",
        checklist: completeChecklist(),
        note: "Manual QA complete.",
        reviewedByUid: "admin-1",
        reviewedAt: "SERVER_TIMESTAMP",
        updatedAt: "SERVER_TIMESTAMP",
        projectionState: "pending_static_generation",
      }
    );
    assert.equal(h.firestore.auditLogs().length, 1);
  });

test("adminDecideOrganizerIntakeHandler persists manual report acknowledgement",
  async () => {
    const h = harness();

    await adminDecideOrganizerIntakeHandler(
      callableRequest("admin-1", approvalPayload({
        checklist: {
          ...completeChecklist(),
          manualReportsReviewed: true,
        },
      }), {support: true}),
      h.deps
    );

    assert.equal(
      (h.firestore.get("organizerIntakeReviewDecisions/afterfly")
        ?.checklist as Record<string, unknown>).manualReportsReviewed,
      true
    );
  });

test("adminDecideOrganizerIntakeHandler rejects incomplete public approval",
  async () => {
    const h = harness();

    await assert.rejects(
      () => adminDecideOrganizerIntakeHandler(
        callableRequest("admin-1", approvalPayload({
          checklist: incompleteChecklist(),
        }), {support: true}),
        h.deps
      ),
      (error) => assertHttpsCode(error, "failed-precondition")
    );
    assert.equal(
      h.firestore.get("organizerIntakeReviewDecisions/afterfly"),
      undefined
    );
  });

test("adminDecideOrganizerIntakeHandler keeps holds app-hidden", async () => {
  const h = harness();

  await assert.rejects(
    () => adminDecideOrganizerIntakeHandler(
      callableRequest("admin-1", approvalPayload({
        decision: "hold",
        publishStatus: "draft",
        indexStatus: "noindex",
        appVisibility: "discoverable",
        checklist: incompleteChecklist(),
      }), {support: true}),
      h.deps
    ),
    (error) => assertHttpsCode(error, "failed-precondition")
  );
});

test("adminDecideOrganizerIntakeHandler stores independent surface switches",
  async () => {
    const h = harness();
    const checklist = {
      ...completeChecklist(),
      claimTargetReviewed: true,
      takedownPathReviewed: true,
      impersonationReviewed: true,
    };

    const result = await adminDecideOrganizerIntakeHandler(
      callableRequest("admin-1", approvalPayload({
        publishStatus: "published",
        indexStatus: "noindex",
        appVisibility: "hidden",
        checklist,
      }), {support: true}),
      h.deps
    );

    assert.equal(result.publishStatus, "published");
    assert.equal(result.indexStatus, "noindex");
    assert.equal(result.appVisibility, "hidden");
  });

test("adminDecideOrganizerIntakeHandler requires app-specific gates",
  async () => {
    const h = harness();

    await assert.rejects(
      () => adminDecideOrganizerIntakeHandler(
        callableRequest("admin-1", approvalPayload({
          appVisibility: "discoverable",
          checklist: {
            ...completeChecklist(),
            claimTargetReviewed: true,
            takedownPathReviewed: true,
            impersonationReviewed: true,
          },
        }), {support: true}),
        h.deps
      ),
      (error) => assertHttpsCode(error, "failed-precondition")
    );
  });

test("adminDecideOrganizerIntakeHandler suppresses every surface", async () => {
  const h = harness();

  const result = await adminDecideOrganizerIntakeHandler(
    callableRequest("admin-1", approvalPayload({
      decision: "suppress",
      publishStatus: "suppressed",
      indexStatus: "noindex",
      appVisibility: "hidden",
      checklist: incompleteChecklist(),
    }), {support: true}),
    h.deps
  );

  assert.equal(result.publishStatus, "suppressed");
  assert.equal(result.indexStatus, "noindex");
  assert.equal(result.appVisibility, "hidden");
});

test("adminDecideOrganizerIntakeHandler cannot downgrade a claimed organizer",
  async () => {
    const h = harness({
      "organizers/afterfly": {
        ownership: {state: "claimed"},
        claim: {state: "claimed"},
        appVisibility: "discoverable",
        publicPage: {
          publishStatus: "published",
          indexStatus: "indexed",
        },
      },
    });

    await assert.rejects(
      () => adminDecideOrganizerIntakeHandler(
        callableRequest("admin-1", approvalPayload(), {support: true}),
        h.deps
      ),
      (error) => assertHttpsCode(error, "failed-precondition")
    );
  });

test("adminDecideOrganizerIntakeHandler blocks viewer-only admins",
  async () => {
    const h = harness();

    await assert.rejects(
      () => adminDecideOrganizerIntakeHandler(
        callableRequest("admin-1", approvalPayload(), {salesStaff: true}),
        h.deps
      ),
      (error) => assertHttpsCode(error, "permission-denied")
    );
  });

test("adminDecideOrganizerIntakeHandler uses explicit rate limit action",
  async () => {
    const h = harness();
    const rateLimitCalls: string[] = [];

    await adminDecideOrganizerIntakeHandler(
      callableRequest("admin-1", approvalPayload({
        entityId: "bhag",
      }), {support: true}),
      {
        ...h.deps,
        checkRateLimit: async (_db, uid, action) => {
          rateLimitCalls.push(`${uid}:${action}`);
        },
      }
    );

    assert.deepEqual(rateLimitCalls, ["admin-1:adminDecideOrganizerIntake"]);
  });
