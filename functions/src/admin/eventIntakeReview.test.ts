import assert from "node:assert/strict";
import test from "node:test";
import {CallableRequest} from "firebase-functions/v2/https";
import {
  adminRecordEventIntakeReviewDecisionHandler,
  decisionIdForEventIntakeTarget,
} from "./eventIntakeReview";

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
    sourceReviewed: true,
    dateReviewed: true,
    venueReviewed: true,
    copyReviewed: true,
    rightsReviewed: false,
    noCatchHostingImplied: true,
  };
}

function incompleteChecklist() {
  return {
    ...completeChecklist(),
    sourceReviewed: false,
  };
}

function approvalPayload(overrides: FakeData = {}) {
  return {
    targetType: "event_candidate",
    targetId: "mumbai-2026-06-rooftop-quiz-bandra",
    decision: "approve",
    runId: "mumbai-2026-06-22-weekly-event-guide",
    checklist: completeChecklist(),
    note: "Manual event intake QA complete.",
    edits: {
      title: {
        before: "Rooftop Quiz",
        after: "Rooftop Quiz Night",
      },
    },
    ...overrides,
  };
}

function assertHttpsCode(error: unknown, code: string): boolean {
  assert.equal((error as {code?: string}).code, code);
  return true;
}

test("adminRecordEventIntakeReviewDecisionHandler records approval decision",
  async () => {
    const h = harness();

    const result = await adminRecordEventIntakeReviewDecisionHandler(
      callableRequest("admin-1", approvalPayload(), {support: true}),
      h.deps
    );

    assert.deepEqual(result, {
      decisionId:
        "event-intake-event-candidate-mumbai-2026-06-rooftop-quiz-bandra",
      targetType: "event_candidate",
      targetId: "mumbai-2026-06-rooftop-quiz-bandra",
      decision: "approve",
      decisionStatus: "approved",
      decisionPath:
        "eventIntakeReviewDecisions/" +
        "event-intake-event-candidate-mumbai-2026-06-rooftop-quiz-bandra",
    });
    assert.deepEqual(
      h.firestore.get(
        "eventIntakeReviewDecisions/" +
          "event-intake-event-candidate-mumbai-2026-06-rooftop-quiz-bandra"
      ),
      {
        schemaVersion: 1,
        decisionId:
          "event-intake-event-candidate-mumbai-2026-06-rooftop-quiz-bandra",
        targetType: "event_candidate",
        targetId: "mumbai-2026-06-rooftop-quiz-bandra",
        decision: "approve",
        decisionStatus: "approved",
        runId: "mumbai-2026-06-22-weekly-event-guide",
        note: "Manual event intake QA complete.",
        checklist: completeChecklist(),
        edits: {
          title: {
            before: "Rooftop Quiz",
            after: "Rooftop Quiz Night",
          },
        },
        reviewedByUid: "admin-1",
        reviewedAt: "SERVER_TIMESTAMP",
        updatedAt: "SERVER_TIMESTAMP",
        effect: "decision_only_no_publish",
      }
    );
    assert.equal(h.firestore.auditLogs().length, 1);
  });

test("adminRecordEventIntakeReviewDecisionHandler rejects incomplete approval",
  async () => {
    const h = harness();

    await assert.rejects(
      () => adminRecordEventIntakeReviewDecisionHandler(
        callableRequest("admin-1", approvalPayload({
          checklist: incompleteChecklist(),
        }), {support: true}),
        h.deps
      ),
      (error) => assertHttpsCode(error, "failed-precondition")
    );
    assert.equal(
      h.firestore.get(
        "eventIntakeReviewDecisions/" +
          "event-intake-event-candidate-mumbai-2026-06-rooftop-quiz-bandra"
      ),
      undefined
    );
  });

test("adminRecordEventIntakeReviewDecisionHandler rejects export-ready",
  async () => {
    const h = harness();

    await assert.rejects(
      () => adminRecordEventIntakeReviewDecisionHandler(
        callableRequest("admin-1", approvalPayload({
          decision: "export_ready",
        }), {support: true}),
        h.deps
      ),
      (error) => assertHttpsCode(error, "invalid-argument")
    );
  });

test("adminRecordEventIntakeReviewDecisionHandler allows hold without checks",
  async () => {
    const h = harness();

    const result = await adminRecordEventIntakeReviewDecisionHandler(
      callableRequest("admin-1", approvalPayload({
        decision: "hold",
        checklist: incompleteChecklist(),
        note: "Needs source verification.",
      }), {support: true}),
      h.deps
    );

    assert.equal(result.decisionStatus, "held");
  });

test("adminRecordEventIntakeReviewDecisionHandler blocks viewer-only admins",
  async () => {
    const h = harness();

    await assert.rejects(
      () => adminRecordEventIntakeReviewDecisionHandler(
        callableRequest("admin-1", approvalPayload(), {salesStaff: true}),
        h.deps
      ),
      (error) => assertHttpsCode(error, "permission-denied")
    );
  });

test("adminRecordEventIntakeReviewDecisionHandler rate limits explicitly",
  async () => {
    const h = harness();
    const rateLimitCalls: string[] = [];

    await adminRecordEventIntakeReviewDecisionHandler(
      callableRequest("admin-1", approvalPayload(), {support: true}),
      {
        ...h.deps,
        checkRateLimit: async (_db, uid, action) => {
          rateLimitCalls.push(`${uid}:${action}`);
        },
      }
    );

    assert.deepEqual(rateLimitCalls, [
      "admin-1:adminRecordEventIntakeReviewDecision",
    ]);
  });

test("decisionIdForEventIntakeTarget bounds long target ids", () => {
  const decisionId = decisionIdForEventIntakeTarget(
    "event_candidate",
    `batch:${"x".repeat(300)}`
  );

  assert.equal(
    decisionId.startsWith("event-intake-event-candidate-batch"),
    true
  );
  assert.equal(decisionId.length <= 150, true);
});
