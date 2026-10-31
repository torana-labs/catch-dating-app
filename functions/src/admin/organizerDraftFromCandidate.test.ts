import assert from "node:assert/strict";
import test from "node:test";
import {CallableRequest} from "firebase-functions/v2/https";
import {
  adminCreateOrganizerDraftFromCandidateHandler,
} from "./organizerDraftFromCandidate";
import {
  organizerPublicContentIssues,
  type OrganizerPublicContent,
} from "../organizers/organizerPublicContent";
import type {AdminCreateOrganizerDraftFromCandidateCallableResponse} from
  "../shared/generated/adminCreateOrganizerDraftFromCandidateCallableResponse";
import type {OrganizerDocument} from "../shared/generated/organizerDocument";
import type {OrganizerIntakeCurationDecisionDocument} from
  "../shared/generated/organizerIntakeCurationDecisionDocument";
import {schemaErrorMessages} from "../shared/generated/schemaValidationRuntime";
import {contractValidator} from "../shared/contractTestValidators";

const validateAdminCreateOrganizerDraftFromCandidateCallableResponse =
  contractValidator<AdminCreateOrganizerDraftFromCandidateCallableResponse>(
    "AdminCreateOrganizerDraftFromCandidateCallableResponse"
  );
const validateOrganizerDocument =
  contractValidator<OrganizerDocument>("OrganizerDocument");
const validateOrganizerIntakeCurationDecisionDocument =
  contractValidator<OrganizerIntakeCurationDecisionDocument>(
    "OrganizerIntakeCurationDecisionDocument"
  );

type FakeData = Record<string, unknown>;

class FakeDocRef {
  readonly id: string;

  constructor(readonly firestore: FakeFirestore, readonly path: string) {
    this.id = path.split("/").at(-1) ?? "";
  }
}

class FakeSnapshot {
  constructor(
    readonly ref: FakeDocRef,
    private readonly value: FakeData | undefined
  ) {}

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
    return `autoId${String(this.nextAutoId).padStart(14, "0")}`;
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
    return new FakeSnapshot(ref, this.firestore.get(ref.path));
  }

  create(ref: FakeDocRef, data: FakeData) {
    if (this.firestore.get(ref.path) !== undefined) {
      throw new Error(`Document ${ref.path} already exists.`);
    }
    this.writes.push(() => this.firestore.set(ref.path, data));
  }

  set(
    ref: FakeDocRef,
    data: FakeData,
    options?: {merge?: boolean}
  ) {
    this.writes.push(() => {
      this.firestore.set(ref.path, options?.merge ? {
        ...(this.firestore.get(ref.path) ?? {}),
        ...data,
      } : data);
    });
  }

  commit() {
    for (const write of this.writes) write();
  }
}

function harness(
  initialDocs: Record<string, FakeData | undefined> = {}
) {
  const firestore = new FakeFirestore(initialDocs);
  const reservedRoutes: FakeData[] = [];
  return {
    firestore,
    reservedRoutes,
    deps: {
      firestore: () =>
        firestore as unknown as FirebaseFirestore.Firestore,
      serverTimestamp: () =>
        ({_seconds: 1784881800, _nanoseconds: 0}) as unknown as
          FirebaseFirestore.FieldValue,
      sourceTimestamp: () =>
        ({_seconds: 1784851200, _nanoseconds: 0}) as unknown as
          FirebaseFirestore.Timestamp,
      reserveCanonicalRoute: async (
        _tx: FirebaseFirestore.Transaction,
        _db: FirebaseFirestore.Firestore,
        options: unknown
      ) => {
        const serializableOptions = Object.fromEntries(
          Object.entries(options as FakeData).filter(([key]) =>
            key !== "serverTimestamp")
        );
        reservedRoutes.push(structuredClone(serializableOptions));
      },
    },
  };
}

function callableRequest(
  data: FakeData,
  token: FakeData = {support: true}
): CallableRequest<unknown> {
  return {
    auth: {
      uid: "admin-1",
      token,
    } as CallableRequest["auth"],
    data,
    rawRequest: {headers: {}} as CallableRequest["rawRequest"],
  } as CallableRequest<unknown>;
}

function payload(overrides: FakeData = {}) {
  return {
    workItemId: "work-courtside",
    candidateId: "candidate-courtside",
    publicSlug: "courtside",
    name: "Courtside",
    organizerType: "community",
    reviewNote: "Reviewed the official source before creating this draft.",
    ...overrides,
  };
}

function candidateFieldProvenance(): FakeData[] {
  return [
    "title",
    "canonicalUrl",
    "snippet",
    "queryIntent.marketSlug",
    "reviewContext.formats",
    "reviewContext.reviewNotes",
    "reviewContext.verifiedAt",
  ].map((field) => ({
    field: `intake.candidate.${field}`,
    artifactId: "artifact-organizer-candidates",
    contentHash: "a".repeat(64),
    locator:
      "firestore:organizerSearchCandidates/courtside" +
      `#normalizedPayload.intake.candidate.${field}`,
    extractedBy: "deterministic",
    extractorVersion: "supply-intake-v0.1.1",
    confidence: 0.9,
  }));
}

function workItem(overrides: FakeData = {}): FakeData {
  return {
    schemaVersion: 1,
    workItemId: "work-courtside",
    workflowId: "supply-intake",
    runId: "organizer-mumbai-2026-07-24",
    entityKind: "organizer",
    externalKey: "candidate-courtside",
    revision: 0,
    candidateHash: "b".repeat(64),
    primaryStage: "incoming",
    lifecycleStatus: "queued",
    outcome: null,
    taskFlags: ["human_review_required"],
    blockerCodes: [],
    warningCodes: [],
    priority: 10,
    attemptCount: 1,
    evidenceRefs: [{
      artifactId: "artifact-organizer-candidates",
      contentHash: "a".repeat(64),
      observedAt: "2026-07-24T08:00:00.000Z",
      locator: "firestore:organizerSearchCandidates/courtside",
    }],
    fieldProvenance: candidateFieldProvenance(),
    normalizedPayload: {
      intake: {
        recordType: "organizer_search_candidate",
        candidate: {
          candidateId: "candidate-courtside",
          canonicalUrl: "https://courtside.example/",
          normalizedKey: "domain:courtside.example",
          platform: "officialWebsite",
          snippet: "Sports and social community in Mumbai.",
          title: "Courtside",
          queryIntent: {marketSlug: "mumbai"},
          existingEntityMatches: [],
          reviewContext: {
            formats: ["Racket sports", "Socials"],
            reviewNotes: "Verify event cadence before publication.",
            verifiedAt: "2026-07-24",
          },
        },
      },
    },
    decisionId: null,
    publicationPlanId: null,
    createdAt: "2026-07-24T08:00:00.000Z",
    updatedAt: "2026-07-24T08:00:00.000Z",
    staleAt: null,
    expiresAt: null,
    ...overrides,
  };
}

function assertHttpsCode(error: unknown, code: string): boolean {
  assert.equal((error as {code?: string}).code, code);
  return true;
}

test("creates a fail-closed organizer draft and curation receipt", async () => {
  const h = harness({
    "operationWorkItems/work-courtside": workItem(),
  });

  const result = await adminCreateOrganizerDraftFromCandidateHandler(
    callableRequest(payload()),
    h.deps
  );

  assert.equal(result.organizerId, "autoId00000000000001");
  assert.equal(result.created, true);
  assert.equal(
    validateAdminCreateOrganizerDraftFromCandidateCallableResponse(result),
    true,
    schemaErrorMessages(
      validateAdminCreateOrganizerDraftFromCandidateCallableResponse
    ).join("; ")
  );
  assert.deepEqual({
    appVisibility: result.appVisibility,
    ownershipState: result.ownershipState,
    claimState: result.claimState,
    publishStatus: result.publishStatus,
    indexStatus: result.indexStatus,
    crawlStatus: result.crawlStatus,
  }, {
    appVisibility: "hidden",
    ownershipState: "programmatic",
    claimState: "unclaimed",
    publishStatus: "draft",
    indexStatus: "noindex",
    crawlStatus: "disabled",
  });
  const organizer = h.firestore.get(`organizers/${result.organizerId}`);
  assert.equal(
    validateOrganizerDocument(organizer),
    true,
    schemaErrorMessages(validateOrganizerDocument).join("; ")
  );
  assert.equal(organizer?.appVisibility, "hidden");
  assert.deepEqual(organizer?.ownership, {
    state: "programmatic",
    ownerUserId: null,
    primaryHostUserId: null,
    hostUserIds: [],
    claimedAt: null,
    claimedByUid: null,
  });
  assert.equal((organizer?.claim as FakeData).state, "unclaimed");
  assert.equal((organizer?.publicPage as FakeData).publishStatus, "draft");
  assert.equal((organizer?.publicPage as FakeData).indexStatus, "noindex");
  assert.equal((organizer?.provenance as FakeData).verificationStatus,
    "sourceBacked");
  assert.deepEqual((organizer?.provenance as FakeData).lastVerifiedAt,
    {_seconds: 1784851200, _nanoseconds: 0});
  assert.equal(organizer?.description, "");
  assert.equal(organizer?.area, "");
  assert.equal(organizer?.publicCategoryLabel, null);
  assert.equal(
    ((organizer?.publicProfile as FakeData).sourceSummary),
    "Sports and social community in Mumbai."
  );
  assert.equal("missingEvidence" in (organizer?.publicProfile as FakeData),
    false);
  assert.deepEqual(
    organizerPublicContentIssues(organizer as OrganizerPublicContent),
    []
  );
  assert.deepEqual(
    ((organizer?.publicSources as FakeData[])[0] as FakeData).lastCheckedAt,
    {_seconds: 1784851200, _nanoseconds: 0}
  );
  assert.equal((organizer?.adminSearch as FakeData).updatedBySource,
    "adminCreateOrganizerDraftFromCandidate");
  const learningSource = organizer?.intakeLearningSource as FakeData;
  assert.equal(
    learningSource.sourceProfileId,
    "organizer_discovery:officialWebsite"
  );
  assert.equal(learningSource.sourceWorkItemId, "work-courtside");
  assert.equal(learningSource.sourceCandidateId, "candidate-courtside");
  assert.deepEqual(
    (learningSource.seededFields as FakeData[]).map((entry) => entry.field),
    [
      "name",
      "location",
      "publicSources[0].href",
      "publicProfile.sourceSummary",
      "publicProfile.formats",
      "tags",
    ]
  );
  const curation = h.firestore.get(result.curationPath);
  assert.equal(
    validateOrganizerIntakeCurationDecisionDocument(curation),
    true,
    schemaErrorMessages(
      validateOrganizerIntakeCurationDecisionDocument
    ).join("; ")
  );
  assert.equal(curation?.operationType, "create_entity_draft");
  assert.equal(curation?.sourceWorkItemId, "work-courtside");
  assert.equal(curation?.sourceCandidateId, "candidate-courtside");
  assert.equal(curation?.entityId, result.organizerId);
  assert.equal(curation?.publicSlug, "courtside");
  assert.deepEqual(
    (curation?.fieldProvenance as FakeData[]).map((entry) => entry.field),
    [
      "name",
      "location",
      "publicSources[0].href",
      "publicProfile.sourceSummary",
      "publicProfile.formats",
      "tags",
    ]
  );
  assert.equal(h.reservedRoutes.length, 1);
  assert.equal(h.reservedRoutes[0].canonicalPath, "/organizers/courtside/");
  assert.equal(h.firestore.auditLogs().length, 1);
});

test("refuses a draft whose seeded public copy carries intake wording",
  async () => {
    const candidate = ((workItem().normalizedPayload as FakeData)
      .intake as FakeData).candidate as FakeData;
    const h = harness({
      "operationWorkItems/work-courtside": workItem({
        normalizedPayload: {
          intake: {
            recordType: "organizer_search_candidate",
            candidate: {
              ...candidate,
              snippet: "Unclaimed seed listing kept out of search.",
            },
          },
        },
      }),
    });

    await assert.rejects(
      adminCreateOrganizerDraftFromCandidateHandler(
        callableRequest(payload()),
        h.deps
      ),
      (error) => {
        assertHttpsCode(error, "failed-precondition");
        assert.match(
          (error as Error).message,
          /publicProfile\.sourceSummary .*publicSources\[0\]\.detail/u
        );
        return true;
      }
    );
    assert.equal(h.firestore.get("organizers/autoId00000000000001"),
      undefined);
    assert.equal(h.reservedRoutes.length, 0);
    assert.equal(h.firestore.auditLogs().length, 0);
  });

test("uses an explicit low-volume admin mutation rate limit", async () => {
  const h = harness({
    "operationWorkItems/work-courtside": workItem(),
  });
  const checked: unknown[] = [];
  await adminCreateOrganizerDraftFromCandidateHandler(
    callableRequest(payload()),
    {
      ...h.deps,
      checkRateLimit: async (...args: unknown[]) => {
        checked.push(args.slice(2));
      },
    }
  );
  assert.deepEqual(checked, [[
    "adminCreateOrganizerDraftFromCandidate",
    {maxRequests: 10, windowMs: 60 * 1000},
  ]]);
});

test("exact retry reuses the organizer without duplicate audit", async () => {
  const h = harness({
    "operationWorkItems/work-courtside": workItem(),
  });

  await adminCreateOrganizerDraftFromCandidateHandler(
    callableRequest(payload()),
    h.deps
  );
  const retry = await adminCreateOrganizerDraftFromCandidateHandler(
    callableRequest(payload()),
    h.deps
  );

  assert.equal(retry.created, false);
  assert.equal(h.firestore.auditLogs().length, 1);
});

test("blocks matched, unreviewed, and viewer-only candidate creation",
  async () => {
    const renamed = harness({
      "operationWorkItems/work-courtside": workItem(),
    });
    await assert.rejects(
      adminCreateOrganizerDraftFromCandidateHandler(
        callableRequest(payload({name: "Courtside Mumbai"})),
        renamed.deps
      ),
      (error) => assertHttpsCode(error, "failed-precondition")
    );

    const matched = harness({
      "operationWorkItems/work-courtside": workItem({
        normalizedPayload: {
          intake: {
            recordType: "organizer_search_candidate",
            candidate: {
              ...((workItem().normalizedPayload as FakeData)
                .intake as FakeData).candidate as FakeData,
              existingEntityMatches: [{entityId: "existing-courtside"}],
            },
          },
        },
      }),
    });
    await assert.rejects(
      adminCreateOrganizerDraftFromCandidateHandler(
        callableRequest(payload()),
        matched.deps
      ),
      (error) => assertHttpsCode(error, "failed-precondition")
    );

    const unreviewed = harness({
      "operationWorkItems/work-courtside": workItem({
        normalizedPayload: {
          intake: {
            recordType: "organizer_search_candidate",
            candidate: {
              ...((workItem().normalizedPayload as FakeData)
                .intake as FakeData).candidate as FakeData,
              reviewContext: null,
            },
          },
        },
      }),
    });
    await assert.rejects(
      adminCreateOrganizerDraftFromCandidateHandler(
        callableRequest(payload()),
        unreviewed.deps
      ),
      (error) => assertHttpsCode(error, "failed-precondition")
    );

    const viewer = harness({
      "operationWorkItems/work-courtside": workItem(),
    });
    await assert.rejects(
      adminCreateOrganizerDraftFromCandidateHandler(
        callableRequest(payload(), {salesStaff: true}),
        viewer.deps
      ),
      (error) => assertHttpsCode(error, "permission-denied")
    );

    const missingExactProvenance = harness({
      "operationWorkItems/work-courtside": workItem({
        fieldProvenance: [],
      }),
    });
    await assert.rejects(
      adminCreateOrganizerDraftFromCandidateHandler(
        callableRequest(payload()),
        missingExactProvenance.deps
      ),
      (error) => assertHttpsCode(error, "failed-precondition")
    );
  });
