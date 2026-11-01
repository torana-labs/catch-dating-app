import assert from "node:assert/strict";
import test from "node:test";
import {CallableRequest} from "firebase-functions/v2/https";
import {
  adminDecideOrganizerPolicyGapHandler,
  decisionIdForPolicyGap,
} from "./organizerPolicyGap";

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
    requiredInputsReviewed: true,
    costAndSafetyReviewed: true,
    implementationOwnerReviewed: true,
    behaviorStillDisabledAcknowledged: true,
  };
}

function incompleteChecklist() {
  return {
    ...completeChecklist(),
    behaviorStillDisabledAcknowledged: false,
  };
}

function acceptancePayload(overrides: FakeData = {}) {
  return {
    gapId: "recurring_event_crawl_policy",
    decision: "accept",
    requiredInputsReviewed: [
      "platform allowlist and fallback order",
      "crawl frequency by platform and organizer tier",
    ],
    checklist: completeChecklist(),
    note: "Policy direction reviewed; implementation remains disabled.",
    ...overrides,
  };
}

function assertHttpsCode(error: unknown, code: string): boolean {
  assert.equal((error as {code?: string}).code, code);
  return true;
}

test("adminDecideOrganizerPolicyGapHandler records blocked acceptance",
  async () => {
    const h = harness();

    const result = await adminDecideOrganizerPolicyGapHandler(
      callableRequest("admin-1", acceptancePayload(), {support: true}),
      h.deps
    );

    assert.deepEqual(result, {
      gapId: "recurring_event_crawl_policy",
      decisionId: "policy-recurring-event-crawl-policy",
      decision: "accept",
      decisionStatus: "accepted",
      decisionPath:
        "organizerPolicyGapReviewDecisions/" +
        "policy-recurring-event-crawl-policy",
      operationalState: "blocked_until_policy_encoded",
    });
    assert.deepEqual(
      h.firestore.get(
        "organizerPolicyGapReviewDecisions/" +
          "policy-recurring-event-crawl-policy"
      ),
      {
        schemaVersion: 1,
        decisionId: "policy-recurring-event-crawl-policy",
        gapId: "recurring_event_crawl_policy",
        decision: "accept",
        decisionStatus: "accepted",
        requiredInputsReviewed: [
          "crawl frequency by platform and organizer tier",
          "platform allowlist and fallback order",
        ],
        checklist: completeChecklist(),
        note: "Policy direction reviewed; implementation remains disabled.",
        reviewedByUid: "admin-1",
        reviewedAt: "SERVER_TIMESTAMP",
        updatedAt: "SERVER_TIMESTAMP",
        operationalState: "blocked_until_policy_encoded",
      }
    );
    assert.equal(h.firestore.auditLogs().length, 1);
  });

test("adminDecideOrganizerPolicyGapHandler rejects incomplete acceptance",
  async () => {
    const h = harness();

    await assert.rejects(
      () => adminDecideOrganizerPolicyGapHandler(
        callableRequest("admin-1", acceptancePayload({
          checklist: incompleteChecklist(),
        }), {support: true}),
        h.deps
      ),
      (error) => assertHttpsCode(error, "failed-precondition")
    );
    assert.equal(
      h.firestore.get(
        "organizerPolicyGapReviewDecisions/" +
          "policy-recurring-event-crawl-policy"
      ),
      undefined
    );
  });

test("adminDecideOrganizerPolicyGapHandler records holds",
  async () => {
    const h = harness();

    const result = await adminDecideOrganizerPolicyGapHandler(
      callableRequest("admin-1", acceptancePayload({
        decision: "hold",
        requiredInputsReviewed: [],
        checklist: incompleteChecklist(),
        note: "Need crawl budget before accepting.",
      }), {support: true}),
      h.deps
    );

    assert.equal(result.decisionStatus, "held");
    assert.equal(result.operationalState, "blocked_until_policy_encoded");
  });

test("adminDecideOrganizerPolicyGapHandler blocks viewer-only admins",
  async () => {
    const h = harness();

    await assert.rejects(
      () => adminDecideOrganizerPolicyGapHandler(
        callableRequest("admin-1", acceptancePayload(), {
          salesStaff: true,
        }),
        h.deps
      ),
      (error) => assertHttpsCode(error, "permission-denied")
    );
  });

test("adminDecideOrganizerPolicyGapHandler rate limits explicitly",
  async () => {
    const h = harness();
    const rateLimitCalls: string[] = [];

    await adminDecideOrganizerPolicyGapHandler(
      callableRequest("admin-1", acceptancePayload(), {support: true}),
      {
        ...h.deps,
        checkRateLimit: async (_db, uid, action) => {
          rateLimitCalls.push(`${uid}:${action}`);
        },
      }
    );

    assert.deepEqual(rateLimitCalls, [
      "admin-1:adminDecideOrganizerPolicyGap",
    ]);
  });

test("decisionIdForPolicyGap keeps long ids deterministic and bounded", () => {
  const longId = `recurring_event_crawl_policy_${"very_".repeat(60)}`;
  const decisionId = decisionIdForPolicyGap(longId);

  assert.equal(decisionId, decisionIdForPolicyGap(longId));
  assert.ok(decisionId.length <= 150);
  assert.match(decisionId, /^policy-recurring-event-crawl-policy-/);
});
