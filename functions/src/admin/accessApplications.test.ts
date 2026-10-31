import assert from "node:assert/strict";
import test from "node:test";
import {CallableRequest, HttpsError} from "firebase-functions/v2/https";
import {
  adminDecideAccessApplicationHandler,
  adminGetAccessApplicationDetailsHandler,
  normalizeDetailsPayload,
  normalizeDecisionPayload,
} from "./accessApplications";

type FakeData = Record<string, unknown>;

class FakeDocRef {
  constructor(readonly firestore: FakeFirestore, readonly path: string) {}

  async get(): Promise<FakeSnapshot> {
    return new FakeSnapshot(this.firestore, this.path);
  }
}

class FakeSnapshot {
  constructor(
    private readonly firestore: FakeFirestore,
    readonly path: string
  ) {}

  get exists(): boolean {
    return this.firestore.get(this.path) !== undefined;
  }

  data(): FakeData | undefined {
    const value = this.firestore.get(this.path);
    return value === undefined ? undefined : {...value};
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

  where(fieldPath: string, op: "==", value: unknown) {
    return new FakeQuery(this.firestore, this.path)
      .where(fieldPath, op, value);
  }

  limit(count: number) {
    return new FakeQuery(this.firestore, this.path).limit(count);
  }
}

class FakeQueryDocumentSnapshot {
  readonly id: string;

  constructor(readonly path: string, private readonly value: FakeData) {
    this.id = path.split("/").at(-1) ?? "";
  }

  data(): FakeData {
    return {...this.value};
  }
}

class FakeQuerySnapshot {
  constructor(readonly docs: FakeQueryDocumentSnapshot[]) {}
}

class FakeQuery {
  private readonly filters: Array<{
    fieldPath: string;
    op: "==";
    value: unknown;
  }> = [];
  private limitCount = 1000;

  constructor(
    private readonly firestore: FakeFirestore,
    private readonly path: string
  ) {}

  where(fieldPath: string, op: "==", value: unknown) {
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
      value[filter.fieldPath] === filter.value
    );
  }
}

class FakeFirestore {
  private autoIdCounter = 0;

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
    this.autoIdCounter += 1;
    return `auto-${this.autoIdCounter}`;
  }

  get(path: string): FakeData | undefined {
    const value = this.docs[path];
    return value === undefined ? undefined : {...value};
  }

  entries(): Array<[string, FakeData | undefined]> {
    return Object.entries(this.docs).map(([path, value]) => [
      path,
      value === undefined ? undefined : {...value},
    ]);
  }

  merge(path: string, patch: FakeData): void {
    this.docs[path] = {...(this.docs[path] ?? {}), ...patch};
  }

  adminAuditLogs(): FakeData[] {
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
    return new FakeSnapshot(this.firestore, ref.path);
  }

  set(ref: FakeDocRef, data: FakeData, _options?: {merge: boolean}): void {
    void _options;
    this.writes.push(() => this.firestore.merge(ref.path, data));
  }

  commit(): void {
    for (const write of this.writes) write();
  }
}

test("normalizeDecisionPayload trims and validates decisions", () => {
  assert.deepEqual(
    normalizeDecisionPayload({
      applicationUid: " runner-1 ",
      decision: "approve",
      note: " welcome ",
      cohortId: " delhi-1 ",
    }),
    {
      applicationUid: "runner-1",
      decision: "approve",
      note: "welcome",
      cohortId: "delhi-1",
    }
  );
});

test("normalizeDetailsPayload validates exact application uids", () => {
  assert.deepEqual(
    normalizeDetailsPayload({applicationUid: " runner_1 "}),
    {applicationUid: "runner_1"}
  );
  assert.throws(
    () => normalizeDetailsPayload({
      applicationUid: "accessApplications/runner_1",
    }),
    (error) =>
      error instanceof HttpsError && error.code === "invalid-argument"
  );
});

test(
  "adminGetAccessApplicationDetailsHandler returns applicant and " +
    "overlap signals",
  async () => {
    const firestore = new FakeFirestore({
      "accessApplications/runner-1": {
        applicationVersion: 1,
        status: "pending",
        city: "in-mh-mumbai",
        role: "host",
        eventTypes: ["running", "singlesMixer"],
        availabilityWindows: ["weekdayEvening"],
        wantsToHost: true,
        inviteCode: "MUMBAI-FOUNDERS",
        instagramHandle: "@maya",
        referralSource: "founder WhatsApp",
        whyCatch: "I want to host better offline social runs.",
        submissionCount: 2,
        submittedAt: new Date("2026-06-01T02:11:00.000Z"),
      },
      "accessApplications/runner-2": {
        status: "pending",
        city: "in-mh-mumbai",
        role: "host",
        inviteCode: "MUMBAI-FOUNDERS",
        instagramHandle: "@other",
        referralSource: "founder WhatsApp",
      },
      "accessApplications/runner-3": {
        status: "pending",
        city: "in-mh-mumbai",
        role: "member",
        inviteCode: "OTHER",
        instagramHandle: "@maya",
      },
    });

    const result = await adminGetAccessApplicationDetailsHandler(
      request({applicationUid: "runner-1"}),
      deps(firestore)
    );

    assert.equal(result.application.uid, "runner-1");
    assert.equal(result.application.targetPath, "accessApplications/runner-1");
    assert.equal(result.application.city, "in-mh-mumbai");
    assert.equal(result.application.role, "host");
    assert.deepEqual(
      result.application.eventTypes,
      ["running", "singlesMixer"]
    );
    assert.equal(result.application.wantsToHost, true);
    assert.equal(
      result.application.submittedAt,
      "2026-06-01T02:11:00.000Z"
    );
    assert.deepEqual(
      Object.fromEntries(result.application.duplicateSignals.map((signal) => [
        signal.id,
        signal.count,
      ])),
      {
        inviteCode: 1,
        instagramHandle: 1,
        referralSource: 1,
        cityRole: 1,
      }
    );
    assert.deepEqual(
      result.application.duplicateSignals.find((signal) =>
        signal.id === "inviteCode"
      )?.sampleTargetPaths,
      ["accessApplications/runner-2"]
    );
  }
);

test(
  "adminGetAccessApplicationDetailsHandler denies viewer-only admins",
  async () => {
    const firestore = new FakeFirestore({
      "accessApplications/runner-3": {status: "pending"},
    });

    await assert.rejects(
      () => adminGetAccessApplicationDetailsHandler(
        request({applicationUid: "runner-3"}, {salesStaff: true}),
        deps(firestore)
      ),
      (error) =>
        error instanceof HttpsError && error.code === "permission-denied"
    );
  }
);

test("normalizeDecisionPayload rejects invalid decisions", () => {
  assert.throws(
    () => normalizeDecisionPayload({
      applicationUid: "runner-1",
      decision: "archive",
    }),
    (error) =>
      error instanceof HttpsError && error.code === "invalid-argument"
  );
});

test("normalizeDecisionPayload requires review notes", () => {
  assert.throws(
    () => normalizeDecisionPayload({
      applicationUid: "runner-1",
      decision: "approve",
    }),
    (error) =>
      error instanceof HttpsError && error.code === "invalid-argument"
  );
});

test(
  "adminDecideAccessApplicationHandler approves pending applications",
  async () => {
    const firestore = new FakeFirestore({
      "accessApplications/runner-1": {
        status: "pending",
        city: "in-dl-delhi-ncr",
      },
    });

    const result = await adminDecideAccessApplicationHandler(
      request({
        applicationUid: "runner-1",
        decision: "approve",
        note: "Strong founding cohort fit.",
        cohortId: "delhi-founders",
      }),
      deps(firestore)
    );

    assert.deepEqual(result, {
      applicationUid: "runner-1",
      decision: "approve",
      status: "approvedForProfile",
    });
    assert.equal(
      firestore.get("accessApplications/runner-1")?.status,
      "approvedForProfile"
    );
    assert.equal(
      firestore.get("accessApplications/runner-1")?.reviewerUid,
      "admin-1"
    );
    assert.equal(
      firestore.get("accessApplications/runner-1")?.cohortId,
      "delhi-founders"
    );
    assert.equal(firestore.adminAuditLogs().length, 1);
    assert.equal(
      firestore.adminAuditLogs()[0].action,
      "adminDecideAccessApplication"
    );
  }
);

test(
  "adminDecideAccessApplicationHandler denies pending applications",
  async () => {
    const firestore = new FakeFirestore({
      "accessApplications/runner-2": {status: "pending"},
    });

    const result = await adminDecideAccessApplicationHandler(
      request({
        applicationUid: "runner-2",
        decision: "deny",
        note: "Not a launch cohort fit.",
      }),
      deps(firestore)
    );

    assert.deepEqual(result, {
      applicationUid: "runner-2",
      decision: "deny",
      status: "notSelectedYet",
    });
    assert.equal(
      firestore.get("accessApplications/runner-2")?.status,
      "notSelectedYet"
    );
  }
);

test(
  "adminDecideAccessApplicationHandler blocks viewer-only admins",
  async () => {
    const firestore = new FakeFirestore({
      "accessApplications/runner-3": {status: "pending"},
    });

    await assert.rejects(
      () => adminDecideAccessApplicationHandler(
        request(
          {
            applicationUid: "runner-3",
            decision: "approve",
            note: "Reviewed for launch access.",
          },
          {salesStaff: true}
        ),
        deps(firestore)
      ),
      (error) =>
        error instanceof HttpsError && error.code === "permission-denied"
    );
  }
);

test(
  "adminDecideAccessApplicationHandler rejects reviewed applications",
  async () => {
    const firestore = new FakeFirestore({
      "accessApplications/runner-4": {status: "approvedForProfile"},
    });

    await assert.rejects(
      () => adminDecideAccessApplicationHandler(
        request({
          applicationUid: "runner-4",
          decision: "deny",
          note: "Already reviewed.",
        }),
        deps(firestore)
      ),
      (error) =>
        error instanceof HttpsError && error.code === "failed-precondition"
    );
  }
);

function request(
  data: Record<string, unknown>,
  token: Record<string, unknown> = {support: true}
): CallableRequest<unknown> {
  return {
    auth: {uid: "admin-1", token},
    data,
  } as unknown as CallableRequest<unknown>;
}

function deps(firestore: FakeFirestore) {
  return {
    firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
    serverTimestamp: () =>
      "SERVER_TIMESTAMP" as unknown as FirebaseFirestore.FieldValue,
  };
}
