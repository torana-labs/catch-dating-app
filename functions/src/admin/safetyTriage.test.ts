import assert from "node:assert/strict";
import test from "node:test";
import {CallableRequest, HttpsError} from "firebase-functions/v2/https";
import {
  adminAssignSafetyTriageItemHandler,
  adminDecideSafetyTriageItemHandler,
  adminGetSafetyTriageDetailsHandler,
  normalizeSafetyAssignmentPayload,
  normalizeSafetyDecisionPayload,
  normalizeSafetyDetailPayload,
  parseSafetyTarget,
} from "./safetyTriage";

type FakeData = Record<string, unknown>;

class FakeDocRef {
  constructor(readonly firestore: FakeFirestore, readonly path: string) {}

  async get(): Promise<FakeSnapshot> {
    return new FakeSnapshot(this.firestore, this.path);
  }

  async update(patch: FakeData): Promise<void> {
    const current = this.firestore.get(this.path);
    if (current === undefined) throw new Error(`Missing doc: ${this.path}`);
    this.firestore.set(this.path, applyPatch(current, patch));
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

  doc(docId?: string): FakeDocRef {
    return new FakeDocRef(
      this.firestore,
      `${this.path}/${docId ?? this.firestore.autoId()}`
    );
  }

  async add(data: FakeData): Promise<FakeDocRef> {
    const ref = this.doc();
    this.firestore.set(ref.path, data);
    return ref;
  }

  where(fieldPath: string, op: "==", value: unknown): FakeQuery {
    return new FakeQuery(this.firestore, this.path)
      .where(fieldPath, op, value);
  }

  limit(count: number): FakeQuery {
    return new FakeQuery(this.firestore, this.path).limit(count);
  }
}

class FakeQueryDocumentSnapshot {
  readonly id: string;
  readonly ref: {path: string};

  constructor(readonly path: string, private readonly value: FakeData) {
    this.id = path.split("/").at(-1) ?? "";
    this.ref = {path};
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

  where(fieldPath: string, op: "==", value: unknown): FakeQuery {
    const next = new FakeQuery(this.firestore, this.path);
    next.filters.push(...this.filters, {fieldPath, op, value});
    next.limitCount = this.limitCount;
    return next;
  }

  limit(count: number): FakeQuery {
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

  collection(collectionPath: string): FakeCollectionRef {
    return new FakeCollectionRef(this, collectionPath);
  }

  doc(path: string): FakeDocRef {
    return new FakeDocRef(this, path);
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

  set(path: string, data: FakeData): void {
    this.docs[path] = {...data};
  }

  async runTransaction<T>(
    callback: (tx: FakeTransaction) => Promise<T>
  ): Promise<T> {
    const tx = new FakeTransaction(this);
    const result = await callback(tx);
    tx.commit();
    return result;
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

  update(ref: FakeDocRef, patch: FakeData): void {
    this.writes.push(() => {
      const current = this.firestore.get(ref.path);
      if (current === undefined) {
        throw new Error(`Missing doc for update: ${ref.path}`);
      }
      this.firestore.set(ref.path, applyPatch(current, patch));
    });
  }

  set(ref: FakeDocRef, data: FakeData): void {
    this.writes.push(() => {
      this.firestore.set(ref.path, data);
    });
  }

  commit(): void {
    for (const write of this.writes) write();
  }
}

function applyPatch(current: FakeData, patch: FakeData): FakeData {
  return {...current, ...patch};
}

test("parseSafetyTarget allowlists safety queue document paths", () => {
  assert.deepEqual(parseSafetyTarget("reports/report-1"), {
    collection: "reports",
    docId: "report-1",
    kind: "report",
    targetPath: "reports/report-1",
  });
  assert.deepEqual(parseSafetyTarget("moderationFlags/flag-1").kind,
    "moderationFlag");
  assert.deepEqual(parseSafetyTarget("eventSafetyReports/event-1_user-1")
    .kind, "eventSafetyReport");
  assert.deepEqual(parseSafetyTarget(restrictedCasePath()).kind,
    "eventAssistanceCase");
  assert.throws(
    () => parseSafetyTarget("users/user-1"),
    (error) =>
      error instanceof HttpsError && error.code === "invalid-argument"
  );
  assert.throws(
    () => normalizeSafetyDetailPayload({targetPath: "reports/a/b"}),
    (error) =>
      error instanceof HttpsError && error.code === "invalid-argument"
  );
});

test("normalizeSafetyDecisionPayload trims and validates decisions", () => {
  assert.deepEqual(
    normalizeSafetyDecisionPayload({
      targetPath: " reports/report-1 ",
      decision: " review ",
      note: " Reviewed source. ",
    }),
    {
      targetPath: "reports/report-1",
      decision: "review",
      note: "Reviewed source.",
    }
  );
  assert.throws(
    () => normalizeSafetyDecisionPayload({
      targetPath: "reports/report-1",
      decision: "delete",
      note: "No destructive actions from triage.",
    }),
    (error) =>
      error instanceof HttpsError && error.code === "invalid-argument"
  );
  assert.throws(
    () => normalizeSafetyDecisionPayload({
      targetPath: "reports/report-1",
      decision: "dismiss",
      note: "",
    }),
    (error) =>
      error instanceof HttpsError && error.code === "invalid-argument"
  );
});

test("normalizeSafetyAssignmentPayload validates assignee and note", () => {
  assert.deepEqual(
    normalizeSafetyAssignmentPayload({
      targetPath: " reports/report-1 ",
      assigneeUid: " reviewer_1 ",
      note: " Taking ownership. ",
    }),
    {
      targetPath: "reports/report-1",
      assigneeUid: "reviewer_1",
      note: "Taking ownership.",
    }
  );
  assert.deepEqual(
    normalizeSafetyAssignmentPayload({
      targetPath: "reports/report-1",
      assigneeUid: "",
      note: "Clearing stale owner.",
    }),
    {
      targetPath: "reports/report-1",
      assigneeUid: null,
      note: "Clearing stale owner.",
    }
  );
  assert.throws(
    () => normalizeSafetyAssignmentPayload({
      targetPath: "reports/report-1",
      assigneeUid: "bad uid",
      note: "Invalid uid.",
    }),
    (error) =>
      error instanceof HttpsError && error.code === "invalid-argument"
  );
});

test("adminGetSafetyTriageDetailsHandler returns report details", async () => {
  const firestore = new FakeFirestore({
    "reports/report-1": {
      reporterUserId: "user-1",
      targetUserId: "user-2",
      reasonCode: "harassment",
      source: "chat",
      status: "open",
      contextId: "match-1",
      notes: "Unwanted messages after the event.",
      createdAt: new Date("2026-06-01T10:00:00.000Z"),
    },
    "reports/report-2": {
      reporterUserId: "user-4",
      targetUserId: "user-2",
      reasonCode: "harassment",
      source: "profile",
      status: "open",
      createdAt: new Date("2026-05-28T10:00:00.000Z"),
    },
    "moderationFlags/flag-1": {
      targetUserId: "user-2",
      flagType: "banned_text",
      source: "chat_message",
      status: "pending",
      createdAt: new Date("2026-05-29T10:00:00.000Z"),
    },
  });
  const rateLimitActions: string[] = [];

  const result = await adminGetSafetyTriageDetailsHandler(
    request({targetPath: "reports/report-1"}),
    deps(firestore, rateLimitActions)
  );

  assert.equal(result.item.kind, "report");
  assert.equal(result.item.title, "harassment");
  assert.equal(result.item.primaryUserId, "user-2");
  assert.equal(result.item.secondaryUserId, "user-1");
  assert.equal(result.item.contextId, "match-1");
  assert.equal(result.item.createdAt, "2026-06-01T10:00:00.000Z");
  assert.equal(result.item.assignment.ownerTeam, "Trust and safety");
  assert.equal(result.item.assignment.severity, "high");
  assert.equal(result.item.sla.dueAt, "2026-06-02T10:00:00.000Z");
  assert.equal(result.item.sla.state, "overdue");
  assert.deepEqual(
    result.item.priorHistory.map((signal) => [signal.id, signal.count]),
    [
      ["reportsAboutPrimaryUser", 1],
      ["moderationForPrimaryUser", 1],
    ]
  );
  assert.deepEqual(
    result.item.priorHistory.find((signal) =>
      signal.id === "reportsAboutPrimaryUser"
    )?.sampleTargetPaths,
    ["reports/report-2"]
  );
  assert.deepEqual(
    result.item.outcomeGuidance.map((item) => item.id),
    [
      "escalate_safety_lead",
      "review_prior_history",
      "restriction_requires_contract",
      "status_only_resolution",
    ]
  );
  assert.equal(
    result.item.evidence.find((item) => item.label === "Target user")
      ?.sourcePath,
    "users/user-2"
  );
  assert.deepEqual(rateLimitActions, ["adminGetSafetyTriageDetails"]);
  assert.equal(firestore.adminAuditLogs()[0].action,
    "adminGetSafetyTriageDetails");
  assert.equal(firestore.adminAuditLogs()[0].targetPath, "reports/report-1");
});

test(
  "adminGetSafetyTriageDetailsHandler returns moderation flag details",
  async () => {
    const firestore = new FakeFirestore({
      "moderationFlags/flag-1": {
        targetUserId: "user-3",
        flagType: "explicit_photo",
        source: "profile_photo",
        status: "pending",
        contextId: "users/user-3/profile/photo.jpg",
        safeSearchResults: {adult: "VERY_LIKELY", violence: "UNLIKELY"},
        createdAt: new Date("2026-06-01T11:00:00.000Z"),
      },
    });

    const result = await adminGetSafetyTriageDetailsHandler(
      request({targetPath: "moderationFlags/flag-1"}),
      deps(firestore)
    );

    assert.equal(result.item.kind, "moderationFlag");
    assert.equal(result.item.primaryUserId, "user-3");
    assert.equal(result.item.assignment.ownerTeam, "Moderation");
    assert.equal(result.item.assignment.severity, "high");
    assert.match(
      result.item.fields.find((field) => field.label === "SafeSearch")
        ?.value ?? "",
      /adult: VERY_LIKELY/u
    );
  }
);

test(
  "adminGetSafetyTriageDetailsHandler returns event safety details",
  async () => {
    const firestore = new FakeFirestore({
      "eventSafetyReports/event-1_user-1": {
        eventId: "event-1",
        organizerId: "club-1",
        reporterUserId: "user-1",
        feedbackId: "feedback-1",
        source: "event_success_feedback",
        status: "open",
        note: "The event felt unsafe near the exit.",
        createdAt: new Date("2026-06-01T12:00:00.000Z"),
        updatedAt: new Date("2026-06-01T12:05:00.000Z"),
      },
    });

    const result = await adminGetSafetyTriageDetailsHandler(
      request({targetPath: "eventSafetyReports/event-1_user-1"}),
      deps(firestore)
    );

    assert.equal(result.item.kind, "eventSafetyReport");
    assert.equal(result.item.eventId, "event-1");
    assert.equal(result.item.organizerId, "club-1");
    assert.equal(result.item.primaryUserId, "user-1");
    assert.equal(result.item.assignment.ownerTeam, "Event safety");
    assert.equal(result.item.assignment.severity, "high");
    assert.ok(result.item.outcomeGuidance.some((item) =>
      item.id === "route_event_owner"
    ));
    assert.equal(
      result.item.evidence.find((item) => item.label === "Event")?.sourcePath,
      "events/event-1"
    );
    assert.equal(result.item.updatedAt, "2026-06-01T12:05:00.000Z");
  }
);

test(
  "adminGetSafetyTriageDetailsHandler returns live restricted request details",
  async () => {
    const firestore = new FakeFirestore({
      [restrictedCasePath()]: restrictedCase(),
    });

    const result = await adminGetSafetyTriageDetailsHandler(
      request({targetPath: restrictedCasePath()}),
      deps(firestore)
    );

    assert.equal(result.item.kind, "eventAssistanceCase");
    assert.equal(result.item.eventId, "event-1");
    assert.equal(result.item.organizerId, "organizer-1");
    assert.equal(result.item.assignment.ownerTeam, "Event safety");
    assert.equal(result.item.assignment.severity, "high");
    assert.equal(result.item.contextId, "response:guest-1");
    assert.equal(result.item.createdAt, "2026-05-28T20:26:39.000Z");
    assert.ok(result.item.outcomeGuidance.some((item) =>
      item.id === "resolve_live_event_request"
    ));
  }
);

test(
  "adminGetSafetyTriageDetailsHandler blocks unsupported roles",
  async () => {
    await assert.rejects(
      () => adminGetSafetyTriageDetailsHandler(
        request(
          {targetPath: "reports/report-1"},
          {analyticsViewer: true}
        ),
        deps(new FakeFirestore({}))
      ),
      (error) =>
        error instanceof HttpsError && error.code === "permission-denied"
    );
  }
);

test("adminGetSafetyTriageDetailsHandler rejects missing docs", async () => {
  await assert.rejects(
    () => adminGetSafetyTriageDetailsHandler(
      request({targetPath: "reports/missing"}),
      deps(new FakeFirestore({}))
    ),
    (error) => error instanceof HttpsError && error.code === "not-found"
  );
});

test("adminDecideSafetyTriageItemHandler reviews an open report", async () => {
  const firestore = new FakeFirestore({
    "reports/report-1": {
      reporterUserId: "user-1",
      targetUserId: "user-2",
      source: "chat",
      status: "open",
      createdAt: new Date("2026-06-01T10:00:00.000Z"),
    },
  });
  const rateLimitActions: string[] = [];

  const result = await adminDecideSafetyTriageItemHandler(
    request({
      targetPath: "reports/report-1",
      decision: "review",
      note: "Reviewed chat context; no account action from this pass.",
    }),
    deps(firestore, rateLimitActions)
  );

  assert.deepEqual(result, {
    targetPath: "reports/report-1",
    decision: "review",
    status: "reviewed",
  });
  assert.equal(firestore.get("reports/report-1")?.status, "reviewed");
  assert.equal(firestore.get("reports/report-1")?.reviewedAt, undefined);
  assert.ok(firestore.get("reports/report-1")?.resolvedAt);
  assert.ok(firestore.get("reports/report-1")?.reporterNotifiedAt);
  assert.equal(firestore.get(
    "accountSafetyNotices/user-1/items/report-handled-report-1")?.kind,
  "reportHandled");
  assert.deepEqual(rateLimitActions, ["adminDecideSafetyTriageItem"]);
  assert.equal(
    firestore.adminAuditLogs()[0].action,
    "adminDecideSafetyTriageItem"
  );
  assert.equal(
    firestore.adminAuditLogs()[0].note,
    "Reviewed chat context; no account action from this pass."
  );
});

test(
  "adminDecideSafetyTriageItemHandler dismisses a pending moderation flag",
  async () => {
    const firestore = new FakeFirestore({
      "moderationFlags/flag-1": {
        targetUserId: "user-3",
        flagType: "banned_text",
        source: "chat_message",
        status: "pending",
        createdAt: new Date("2026-06-01T10:00:00.000Z"),
      },
    });

    const result = await adminDecideSafetyTriageItemHandler(
      request({
        targetPath: "moderationFlags/flag-1",
        decision: "dismiss",
        note: "False positive after context review.",
      }),
      deps(firestore)
    );

    assert.equal(result.status, "dismissed");
    assert.equal(firestore.get("moderationFlags/flag-1")?.status, "dismissed");
    assert.equal(
      firestore.get("moderationFlags/flag-1")?.reviewedAt,
      "SERVER_TIMESTAMP"
    );
  }
);

test(
  "adminDecideSafetyTriageItemHandler reviews an open event safety report",
  async () => {
    const firestore = new FakeFirestore({
      "eventSafetyReports/event-1_user-1": {
        eventId: "event-1",
        organizerId: "club-1",
        reporterUserId: "user-1",
        feedbackId: "feedback-1",
        source: "event_success_feedback",
        status: "open",
        createdAt: new Date("2026-06-01T10:00:00.000Z"),
        updatedAt: new Date("2026-06-01T10:05:00.000Z"),
      },
    });

    const result = await adminDecideSafetyTriageItemHandler(
      request({
        targetPath: "eventSafetyReports/event-1_user-1",
        decision: "review",
        note: "Reviewed event feedback and routed follow-up to host ops.",
      }),
      deps(firestore)
    );

    assert.equal(result.status, "reviewed");
    assert.equal(
      firestore.get("eventSafetyReports/event-1_user-1")?.status,
      "reviewed"
    );
    assert.equal(
      firestore.get("eventSafetyReports/event-1_user-1")?.updatedAt,
      "SERVER_TIMESTAMP"
    );
  }
);

test(
  "adminDecideSafetyTriageItemHandler resolves a restricted event request",
  async () => {
    const firestore = new FakeFirestore({
      [restrictedCasePath()]: restrictedCase(),
    });

    const result = await adminDecideSafetyTriageItemHandler(
      request({
        targetPath: restrictedCasePath(),
        decision: "review",
        note: "Reviewed the live request and confirmed the handoff.",
      }),
      deps(firestore)
    );

    assert.deepEqual(result, {
      targetPath: restrictedCasePath(),
      decision: "review",
      status: "resolved",
    });
    const saved = firestore.get(restrictedCasePath())!;
    assert.equal(saved.status, "resolved");
    assert.equal(saved.assigneeUid, undefined);
    assert.deepEqual(saved.handling, {
      revision: 1,
      assigneeUid: null,
      updatedAt: 1_780_488_000_000,
      resolution: {
        outcome: "resolved",
        actorUid: "admin-1",
        at: 1_780_488_000_000,
      },
    });
  }
);

test(
  "adminDecideSafetyTriageItemHandler rejects organizer-owned help cases",
  async () => {
    const practical = {
      ...restrictedCase(),
      category: "eventLogistics",
      owner: "eventLead",
    };
    const firestore = new FakeFirestore({
      [restrictedCasePath()]: practical,
    });

    await assert.rejects(
      () => adminDecideSafetyTriageItemHandler(
        request({
          targetPath: restrictedCasePath(),
          decision: "review",
          note: "The event lead owns this request.",
        }),
        deps(firestore)
      ),
      (error) =>
        error instanceof HttpsError && error.code === "failed-precondition"
    );
  }
);

test(
  "adminDecideSafetyTriageItemHandler rejects closed safety items",
  async () => {
    const firestore = new FakeFirestore({
      "reports/report-1": {
        reporterUserId: "user-1",
        targetUserId: "user-2",
        source: "chat",
        status: "reviewed",
        createdAt: new Date("2026-06-01T10:00:00.000Z"),
      },
    });

    await assert.rejects(
      () => adminDecideSafetyTriageItemHandler(
        request({
          targetPath: "reports/report-1",
          decision: "dismiss",
          note: "Already closed.",
        }),
        deps(firestore)
      ),
      (error) =>
        error instanceof HttpsError && error.code === "failed-precondition"
    );
  }
);

test(
  "adminDecideSafetyTriageItemHandler blocks support-only mutation roles",
  async () => {
    await assert.rejects(
      () => adminDecideSafetyTriageItemHandler(
        request({
          targetPath: "reports/report-1",
          decision: "review",
          note: "Support cannot mutate safety decisions.",
        }, {support: true}),
        deps(new FakeFirestore({}))
      ),
      (error) =>
        error instanceof HttpsError && error.code === "permission-denied"
    );
  }
);

test("adminAssignSafetyTriageItemHandler assigns an open report", async () => {
  const firestore = new FakeFirestore({
    "reports/report-1": {
      reporterUserId: "user-1",
      targetUserId: "user-2",
      source: "chat",
      status: "open",
      createdAt: new Date("2026-06-01T10:00:00.000Z"),
    },
  });
  const rateLimitActions: string[] = [];

  const result = await adminAssignSafetyTriageItemHandler(
    request({
      targetPath: "reports/report-1",
      assigneeUid: "reviewer_1",
      note: "Taking ownership for chat review.",
    }),
    deps(firestore, rateLimitActions)
  );

  assert.equal(result.assignment.assigneeUid, "reviewer_1");
  assert.equal(result.assignment.ownerTeam, "Trust and safety");
  assert.equal(firestore.get("reports/report-1")?.assigneeUid, "reviewer_1");
  assert.equal(
    firestore.get("reports/report-1")?.assignmentUpdatedAt,
    "SERVER_TIMESTAMP"
  );
  assert.equal(
    firestore.get("reports/report-1")?.assignmentUpdatedByUid,
    "admin-1"
  );
  assert.deepEqual(rateLimitActions, ["adminAssignSafetyTriageItem"]);
  assert.equal(
    firestore.adminAuditLogs()[0].action,
    "adminAssignSafetyTriageItem"
  );
});

test("adminAssignSafetyTriageItemHandler clears an assignment", async () => {
  const firestore = new FakeFirestore({
    "moderationFlags/flag-1": {
      targetUserId: "user-3",
      flagType: "banned_text",
      source: "chat_message",
      status: "pending",
      assigneeUid: "reviewer_2",
      createdAt: new Date("2026-06-01T10:00:00.000Z"),
    },
  });

  const result = await adminAssignSafetyTriageItemHandler(
    request({
      targetPath: "moderationFlags/flag-1",
      assigneeUid: null,
      note: "Clearing stale owner before reassignment.",
    }),
    deps(firestore)
  );

  assert.equal(result.assignment.assigneeUid, null);
  assert.equal(firestore.get("moderationFlags/flag-1")?.assigneeUid, null);
});

test(
  "adminAssignSafetyTriageItemHandler updates restricted case handling",
  async () => {
    const firestore = new FakeFirestore({
      [restrictedCasePath()]: restrictedCase(),
    });

    const result = await adminAssignSafetyTriageItemHandler(
      request({
        targetPath: restrictedCasePath(),
        assigneeUid: "reviewer_1",
        note: "Taking the live event request.",
      }),
      deps(firestore)
    );

    assert.equal(result.assignment.assigneeUid, "reviewer_1");
    const saved = firestore.get(restrictedCasePath())!;
    assert.equal(saved.assigneeUid, undefined);
    assert.deepEqual(saved.handling, {
      revision: 1,
      assigneeUid: "reviewer_1",
      updatedAt: 1_780_488_000_000,
      resolution: null,
    });
  }
);

test(
  "adminAssignSafetyTriageItemHandler rejects closed safety items",
  async () => {
    const firestore = new FakeFirestore({
      "reports/report-1": {
        reporterUserId: "user-1",
        targetUserId: "user-2",
        source: "chat",
        status: "reviewed",
        createdAt: new Date("2026-06-01T10:00:00.000Z"),
      },
    });

    await assert.rejects(
      () => adminAssignSafetyTriageItemHandler(
        request({
          targetPath: "reports/report-1",
          assigneeUid: "reviewer_1",
          note: "Cannot assign closed item.",
        }),
        deps(firestore)
      ),
      (error) =>
        error instanceof HttpsError && error.code === "failed-precondition"
    );
  }
);

test(
  "adminAssignSafetyTriageItemHandler blocks support-only mutation roles",
  async () => {
    await assert.rejects(
      () => adminAssignSafetyTriageItemHandler(
        request({
          targetPath: "reports/report-1",
          assigneeUid: "reviewer_1",
          note: "Support cannot assign safety decisions.",
        }, {support: true}),
        deps(new FakeFirestore({}))
      ),
      (error) =>
        error instanceof HttpsError && error.code === "permission-denied"
    );
  }
);

function request(
  data: unknown,
  claims: Record<string, unknown> = {safetyReviewer: true}
): CallableRequest<unknown> {
  return {
    auth: {
      uid: "admin-1",
      token: claims,
    },
    data,
    rawRequest: {headers: {}} as CallableRequest<unknown>["rawRequest"],
  } as CallableRequest<unknown>;
}

function deps(
  firestore: FakeFirestore,
  rateLimitActions: string[] = []
) {
  return {
    firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
    now: () => new Date("2026-06-03T12:00:00.000Z"),
    serverTimestamp: () => "SERVER_TIMESTAMP" as unknown as
      FirebaseFirestore.FieldValue,
    checkRateLimit: async (
      _db: FirebaseFirestore.Firestore,
      _uid: string,
      action: string
    ) => {
      rateLimitActions.push(action);
    },
  };
}

function restrictedCasePath(): string {
  return `eventAssistanceCases/case:${"a".repeat(64)}`;
}

function restrictedCase(): FakeData {
  return {
    schemaVersion: 1,
    caseId: `case:${"a".repeat(64)}`,
    guestId: `guest:${"b".repeat(64)}`,
    context: {
      mode: "live",
      eventId: "event-1",
      organizerId: "organizer-1",
    },
    attendeeId: "attendee-1",
    episodeId: "episode:guest-1",
    responseId: "response:guest-1",
    messageId: `outbox:${"c".repeat(64)}`,
    status: "open",
    receivedAt: 1_779_999_999_000,
    category: "comfortSafety",
    owner: "authorizedSafetyOperator",
    sourceGeneration: "d".repeat(64),
    attendeeGeneration: "e".repeat(64),
    handling: {
      revision: 0,
      assigneeUid: null,
      updatedAt: 1_780_000_000_000,
      resolution: null,
    },
  };
}
