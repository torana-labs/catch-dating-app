import assert from "node:assert/strict";
import test from "node:test";
import {CallableRequest} from "firebase-functions/v2/https";
import {
  adminPublishExternalEventHandler,
} from "./externalEventPublishing";

type FakeData = Record<string, unknown>;

class FakeDocRef {
  constructor(readonly firestore: FakeFirestore, readonly path: string) {}

  get id(): string {
    return this.path.split("/").at(-1) ?? "";
  }

  async get() {
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

class FakeTransaction {
  constructor(private readonly firestore: FakeFirestore) {}

  async get(ref: FakeDocRef) {
    return ref.get();
  }

  create(ref: FakeDocRef, value: FakeData) {
    if (this.firestore.get(ref.path) !== undefined) {
      const error = new Error("already exists") as Error & {code?: number};
      error.code = 6;
      throw error;
    }
    this.firestore.set(ref.path, value);
  }

  set(ref: FakeDocRef, value: FakeData) {
    this.firestore.set(ref.path, value);
  }
}

class FakeFirestore {
  private nextId = 0;

  constructor(private readonly docs: Record<string, FakeData | undefined>) {}

  collection(collectionPath: string) {
    return new FakeCollectionRef(this, collectionPath);
  }

  async runTransaction<T>(callback: (tx: FakeTransaction) => Promise<T>) {
    return callback(new FakeTransaction(this));
  }

  get(path: string): FakeData | undefined {
    const data = this.docs[path];
    return data === undefined ? undefined : structuredClone(data);
  }

  set(path: string, value: FakeData) {
    this.docs[path] = structuredClone(value);
  }

  autoId(): string {
    this.nextId += 1;
    return `audit-${this.nextId}`;
  }
}

function harness(initialDocs: Record<string, FakeData | undefined> = {}) {
  const firestore = new FakeFirestore(initialDocs);
  const rateLimitCalls: string[] = [];
  return {
    firestore,
    rateLimitCalls,
    deps: {
      firestore: () =>
        firestore as unknown as FirebaseFirestore.Firestore,
      serverTimestamp: () => ({serverTimestamp: true}) as unknown as
        FirebaseFirestore.FieldValue,
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

function publishPayload(overrides: FakeData = {}) {
  return {
    sourceActionId: "import-action-1",
    targetPath: "externalEvents/ext-afterfly-future-run",
    executionMode: "apply",
    idempotencyKey: "import-action-1:apply",
    reviewNote: "Reviewed external event publish.",
    checklist: {
      preflightActionReviewed: true,
      outboundLinksReviewed: true,
      noCatchBookingPaymentsWaitlist: true,
      ownerSafeCopyReviewed: true,
    },
    ...overrides,
  };
}

function readinessDoc(overrides: FakeData = {}) {
  return {
    generatedAt: "2026-06-25T00:00:00.000Z",
    importPlan: {
      policy: {
        writeEnabled: true,
        status: "enabled",
        reason: "External event import approved.",
      },
    },
    executionPlan: {
      policy: {
        writeEnabled: true,
        status: "enabled",
        authorityModel: "admin_import_service",
        reason: "Admin import service enabled.",
      },
      actions: [executionAction()],
    },
    ...overrides,
  };
}

function executionAction(overrides: FakeData = {}) {
  return {
    actionId: "preflight-import-action-1",
    sourceActionId: "import-action-1",
    sourceAction: "publish_read_only_external_event",
    status: "would_publish_read_only",
    candidateId: "candidate-1",
    entityId: "afterfly",
    targetWriter: "externalEventReadOnlyProjection",
    targetCallable: null,
    targetPath: "externalEvents/ext-afterfly-future-run",
    sourceStatus: "write_ready",
    sourceReviewStatus: "approved_for_import",
    blockerResolutions: [],
    blockers: [],
    projectionValidation: {valid: true, errors: []},
    payloadValidation: {valid: true, errors: []},
    readOnlyEventProjection: {},
    externalEventDocument: externalEventDocument(),
    ...overrides,
  };
}

function externalEventDocument(overrides: FakeData = {}) {
  return {
    schemaVersion: 1,
    eventId: "ext-afterfly-future-run",
    canonicalHostId: "afterfly",
    compatibilityClubId: "afterfly",
    title: "Takeoff run",
    description: "Read-only external run.",
    startTime: timestamp("2099-01-01T12:30:00.000Z"),
    endTime: timestamp("2099-01-01T14:30:00.000Z"),
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
    organizerCapabilities: unclaimedCapabilities(),
    booking: {
      mode: "external_outbound_only",
      catchBookingEnabled: false,
      catchPaymentsEnabled: false,
      catchReservationsEnabled: false,
      catchWaitlistEnabled: false,
      externalLinks: [{
        platform: "luma",
        url: "https://lu.ma/takeoff-run",
        linkType: "booking_or_event_page",
        sourceEventKey: "luma:takeoff-run",
        candidateId: "candidate-1",
        primary: true,
      }],
    },
    discovery: {
      citySlug: "indore",
      countryCode: "IN",
      availability: "read_only_external",
      manualApprovalRequired: true,
      appVisibility: "discoverable",
    },
    dedupe: {
      normalizedEventKey: "afterfly|takeoff-run|2099-01-01",
      primaryCandidateId: "candidate-1",
      duplicateCandidateIds: [],
      conflictPolicy: "single_read_only_event_with_multiple_outbound_links",
    },
    externalSource: {
      candidateId: "candidate-1",
      sourceEventKey: "luma:takeoff-run",
      sourceEventId: "takeoff-run",
      platform: "luma",
      eventUrl: "https://lu.ma/takeoff-run",
      sourceUrl: "https://lu.ma",
    },
    review: {
      eventReviewBatchId: "batch-1",
      reviewer: "ops",
      decidedAt: "2026-06-25",
      note: "Reviewed.",
      importPolicyAcknowledged: true,
      ownerSafeCopyReviewed: true,
      blockerResolutions: [],
    },
    createdAt: timestamp("2026-06-25T00:00:00.000Z"),
    updatedAt: timestamp("2026-06-25T00:00:00.000Z"),
    ...overrides,
  };
}

function unclaimedCapabilities() {
  return {
    mode: "unclaimed_read_only",
    bookable: false,
    paymentsEnabled: false,
    waitlistEnabled: false,
    hostContactEnabled: false,
    claimable: true,
    reviewPolicy: "after_event_end",
  };
}

function canonicalOrganizer(overrides: FakeData = {}) {
  return {
    locationMarketId: "in-mp-indore",
    appVisibility: "discoverable",
    ownership: {state: "programmatic"},
    claim: {state: "unclaimed"},
    supplyCapabilities: unclaimedCapabilities(),
    ...overrides,
  };
}

function timestamp(iso: string) {
  const millis = Date.parse(iso);
  return {
    _seconds: Math.floor(millis / 1000),
    _nanoseconds: (millis % 1000) * 1_000_000,
  };
}

function assertHttpsCode(error: unknown, code: string): boolean {
  assert.equal((error as {code?: string}).code, code);
  return true;
}

test("adminPublishExternalEventHandler publishes one gated external event",
  async () => {
    const h = harness({
      "eventSupplyReadiness/current": readinessDoc(),
      "organizers/afterfly": canonicalOrganizer(),
    });

    const result = await adminPublishExternalEventHandler(
      callableRequest("admin-1", publishPayload(), {support: true}),
      h.deps
    );

    assert.equal(result.eventId, "ext-afterfly-future-run");
    assert.equal(result.publicationStatus, "public");
    assert.equal(result.externalLinkCount, 1);
    assert.equal(result.executionMode, "apply");
    assert.equal(result.outcome, "published");
    assert.equal(result.writeApplied, true);
    assert.equal(result.idempotent, false);
    assert.deepEqual(h.rateLimitCalls, [
      "admin-1:adminPublishExternalEvent",
    ]);
    const written = h.firestore.get(
      "externalEvents/ext-afterfly-future-run"
    );
    assert.equal(written?.eventId, "ext-afterfly-future-run");
    assert.equal(
      (written?.booking as FakeData).mode,
      "external_outbound_only"
    );
    assert.ok(h.firestore.get("adminAuditLogs/audit-1"));
    assert.ok(h.firestore.get(result.receiptPath));
  });

test("adminPublishExternalEventHandler dry-runs without event write",
  async () => {
    const h = harness({
      "eventSupplyReadiness/current": readinessDoc(),
      "organizers/afterfly": canonicalOrganizer(),
    });

    const result = await adminPublishExternalEventHandler(
      callableRequest("admin-1", publishPayload({
        executionMode: "dry_run",
        idempotencyKey: "import-action-1:dry-run",
      }), {support: true}),
      h.deps
    );

    assert.equal(result.outcome, "would_publish");
    assert.equal(result.writeApplied, false);
    assert.equal(
      h.firestore.get("externalEvents/ext-afterfly-future-run"),
      undefined
    );
    assert.ok(h.firestore.get(result.receiptPath));
  });

test("adminPublishExternalEventHandler replays the same receipt idempotently",
  async () => {
    const h = harness({
      "eventSupplyReadiness/current": readinessDoc(),
      "organizers/afterfly": canonicalOrganizer(),
    });
    const request = callableRequest(
      "admin-1",
      publishPayload(),
      {support: true}
    );

    const first = await adminPublishExternalEventHandler(request, h.deps);
    const second = await adminPublishExternalEventHandler(request, h.deps);

    assert.equal(first.receiptPath, second.receiptPath);
    assert.equal(second.idempotent, true);
    assert.equal(second.externalLinkCount, 1);
  });

test("adminPublishExternalEventHandler rejects disabled import policy",
  async () => {
    const h = harness({
      "eventSupplyReadiness/current": readinessDoc({
        executionPlan: {
          policy: {
            writeEnabled: false,
            status: "disabled",
            authorityModel: "undecided",
            reason: "Preflight only.",
          },
          actions: [executionAction()],
        },
      }),
      "organizers/afterfly": canonicalOrganizer(),
    });

    await assert.rejects(
      () => adminPublishExternalEventHandler(
        callableRequest("admin-1", publishPayload(), {support: true}),
        h.deps
      ),
      (error) => assertHttpsCode(error, "failed-precondition")
    );
    assert.equal(h.firestore.get("externalEvents/ext-afterfly-future-run"),
      undefined);
  });

test("adminPublishExternalEventHandler rejects blocked preflight action",
  async () => {
    const h = harness({
      "eventSupplyReadiness/current": readinessDoc({
        executionPlan: {
          policy: {
            writeEnabled: true,
            status: "enabled",
            authorityModel: "admin_import_service",
            reason: "Admin import service enabled.",
          },
          actions: [executionAction({
            status: "blocked",
            blockers: ["external_event_import_execution_disabled"],
          })],
        },
      }),
      "organizers/afterfly": canonicalOrganizer(),
    });

    await assert.rejects(
      () => adminPublishExternalEventHandler(
        callableRequest("admin-1", publishPayload(), {support: true}),
        h.deps
      ),
      (error) => assertHttpsCode(error, "failed-precondition")
    );
  });

test("adminPublishExternalEventHandler rejects organizer market drift",
  async () => {
    const h = harness({
      "eventSupplyReadiness/current": readinessDoc(),
      "organizers/afterfly": canonicalOrganizer({
        locationMarketId: "in-mh-mumbai",
      }),
    });

    await assert.rejects(
      () => adminPublishExternalEventHandler(
        callableRequest("admin-1", publishPayload(), {support: true}),
        h.deps
      ),
      (error) => assertHttpsCode(error, "failed-precondition")
    );
  });

test("adminPublishExternalEventHandler requires accepted policy for waivers",
  async () => {
    const waiver = {
      blockerCode: "missing_end_time",
      outcome: "waived",
      policyGapDecisionId: "policy-external-event-defaults-policy",
      note: "Reviewed against the accepted defaults policy.",
    };
    const action = executionAction({
      blockerResolutions: [waiver],
      externalEventDocument: externalEventDocument({
        review: {
          eventReviewBatchId: "batch-1",
          reviewer: "ops",
          decidedAt: "2026-06-25",
          note: "Reviewed.",
          importPolicyAcknowledged: true,
          ownerSafeCopyReviewed: true,
          blockerResolutions: [waiver],
        },
      }),
    });
    const h = harness({
      "eventSupplyReadiness/current": readinessDoc({
        executionPlan: {
          policy: {
            writeEnabled: true,
            status: "enabled",
            authorityModel: "admin_import_service",
            reason: "Admin import service enabled.",
          },
          actions: [action],
        },
      }),
      "organizers/afterfly": canonicalOrganizer(),
      ["organizerPolicyGapReviewDecisions/" +
        "policy-external-event-defaults-policy"]: {
        decisionId: "policy-external-event-defaults-policy",
        decisionStatus: "accepted",
      },
    });

    const result = await adminPublishExternalEventHandler(
      callableRequest("admin-1", publishPayload(), {support: true}),
      h.deps
    );
    assert.equal(result.writeApplied, true);

    const rejected = harness({
      "eventSupplyReadiness/current": readinessDoc({
        executionPlan: {
          policy: {
            writeEnabled: true,
            status: "enabled",
            authorityModel: "admin_import_service",
            reason: "Admin import service enabled.",
          },
          actions: [action],
        },
      }),
      "organizers/afterfly": canonicalOrganizer(),
      ["organizerPolicyGapReviewDecisions/" +
        "policy-external-event-defaults-policy"]: {
        decisionId: "policy-external-event-defaults-policy",
        decisionStatus: "held",
      },
    });
    await assert.rejects(
      () => adminPublishExternalEventHandler(
        callableRequest("admin-1", publishPayload(), {support: true}),
        rejected.deps
      ),
      (error) => assertHttpsCode(error, "failed-precondition")
    );
  });
