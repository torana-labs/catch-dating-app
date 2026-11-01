import assert from "node:assert/strict";
import test from "node:test";
import {CallableRequest} from "firebase-functions/v2/https";
import {InMemoryOperationsRepository} from
  "../operations/inMemoryRepository";
import {operationRun, operationWorkItem} from
  "../operations/testFixtures";
import {
  adminGetEventIntakeDashboardHandler,
  attachOrganizerCeilings,
  overlayEventIntakeDecisions,
} from "./eventIntakeDashboard";

const now = "2026-07-27T08:00:00.000Z";

async function harness() {
  const repository = new InMemoryOperationsRepository();
  const rateLimitCalls: string[] = [];
  const decisions: Array<Record<string, unknown>> = [];
  const deps = {
    firestore: () => ({}) as FirebaseFirestore.Firestore,
    repository,
    now: () => new Date(now),
    loadReviewDecisions: async () => decisions,
    loadOrganizerCeilings: async () => new Map(),
    checkRateLimit: async (
      _db: FirebaseFirestore.Firestore,
      uid: string,
      action: string
    ) => {
      rateLimitCalls.push(`${uid}:${action}`);
    },
  };
  return {repository, rateLimitCalls, decisions, deps};
}

test(
  "projects Event Intake from the latest completed Supply runs",
  async () => {
    const h = await harness();
    await seedCompletedRun(h.repository, {
      runId: "run:mumbai:old",
      market: "mumbai",
      updatedAt: "2026-07-20T08:00:00.000Z",
    });
    await seedCompletedRun(h.repository, {
      runId: "run:mumbai:current",
      market: "mumbai",
      updatedAt: "2026-07-27T07:00:00.000Z",
    });
    await seedCompletedRun(h.repository, {
      runId: "run:indore:current",
      market: "indore",
      updatedAt: "2026-07-27T06:00:00.000Z",
    });
    await seedCompletedRun(h.repository, {
      runId: "run:mumbai:organizer-only",
      market: "mumbai",
      updatedAt: "2026-07-27T07:30:00.000Z",
      intakeScope: "organizer",
    });
    await h.repository.createWorkItem(eventCandidateWorkItem({
      runId: "run:mumbai:old",
      id: "old-event",
    }));
    await h.repository.createWorkItem(eventCandidateWorkItem({
      runId: "run:mumbai:current",
      id: "mumbai-event",
    }));
    await h.repository.createWorkItem(eventCandidateWorkItem({
      runId: "run:indore:current",
      id: "indore-event",
    }));
    await h.repository.createWorkItem(sourceResultWorkItem({
      runId: "run:mumbai:current",
      id: "mumbai-source",
    }));
    await h.repository.createWorkItem(sourceProfileWorkItem({
      runId: "run:mumbai:current",
      id: "luma",
    }));

    const result = await adminGetEventIntakeDashboardHandler(
      callableRequest("admin-1", {support: true}),
      h.deps
    );

    assert.equal(result.bridge.bridgeSource, "operations");
    assert.equal(result.bridge.generatedAt, "2026-07-27T07:00:00.000Z");
    assert.deepEqual(
      (result.bridge.eventCandidates as Array<{id: string}>)
        .map((candidate) => candidate.id),
      ["indore-event", "mumbai-event"]
    );
    assert.deepEqual(
      (result.bridge.sourceResults as Array<{id: string}>)
        .map((result) => result.id),
      ["mumbai-source"]
    );
    assert.deepEqual(
      (result.bridge.sourceProfiles as Array<{id: string}>)
        .map((profile) => profile.id),
      ["luma"]
    );
    assert.equal(
      (result.bridge.summary as Record<string, unknown>).eventCandidates,
      2
    );
    assert.deepEqual(h.rateLimitCalls, [
      "admin-1:adminGetEventIntakeDashboard",
    ]);
    assert.equal(JSON.stringify(result.bridge).includes("old-event"), false);
  }
);

test("review decisions survive refresh and preserve projection ids",
  async () => {
    const h = await harness();
    await seedCompletedRun(h.repository, {
      runId: "run:mumbai:current",
      market: "mumbai",
      updatedAt: "2026-07-27T07:00:00.000Z",
    });
    await h.repository.createWorkItem(eventCandidateWorkItem({
      runId: "run:mumbai:current",
      id: "candidate-1",
    }));
    h.decisions.push({
      targetType: "event_candidate",
      targetId: "candidate-1",
      decision: "approve",
      decisionStatus: "approved",
      note: "Official source and venue verified.",
      edits: {
        id: {before: "candidate-1", after: "attempted-rewrite"},
        title: {before: "candidate-1", after: "Verified candidate"},
      },
      reviewedByUid: "admin-1",
      reviewedAt: "2026-07-27T07:30:00.000Z",
    });

    const result = await adminGetEventIntakeDashboardHandler(
      callableRequest("admin-1", {support: true}),
      h.deps
    );
    const candidate =
      (result.bridge.eventCandidates as Array<Record<string, unknown>>)[0];
    assert.equal(candidate.id, "candidate-1");
    assert.equal(candidate.title, "Verified candidate");
    assert.equal(candidate.reviewState, "approved");
    assert.equal(
      (result.bridge.summary as Record<string, unknown>)
        .approvedCandidates,
      1
    );
  });

test("Operations storage fails closed before an invalid projection is read",
  async () => {
    const h = await harness();
    await seedCompletedRun(h.repository, {
      runId: "run:mumbai:current",
      market: "mumbai",
      updatedAt: "2026-07-27T07:00:00.000Z",
    });
    await assert.rejects(
      h.repository.createWorkItem(operationWorkItem({
        workItemId: "work:invalid",
        runId: "run:mumbai:current",
        normalizedPayload: {
          intake: {
            recordType: "event_candidate",
            candidate: {title: "Missing id"},
          },
        },
      })),
      (error: unknown) => {
        assert.equal((error as {code?: string}).code, "invalid_entity");
        assert.match(
          (error as Error).message,
          /candidate\/id:schema_required/u
        );
        return true;
      }
    );
  });

test("returns an explicit empty Operations projection", async () => {
  const h = await harness();
  const result = await adminGetEventIntakeDashboardHandler(
    callableRequest("admin-1", {support: true}),
    h.deps
  );
  assert.equal(result.bridge.bridgeSource, "empty");
  assert.equal(result.bridge.generatedAt, now);
  assert.deepEqual(result.bridge.eventCandidates, []);
  assert.deepEqual(result.bridge.sourceResults, []);
  assert.deepEqual(result.bridge.commands, {});
});

test("overlayEventIntakeDecisions preserves source ids across edits", () => {
  const result = overlayEventIntakeDecisions({
    summary: {},
    sourceProfiles: [],
    queryTemplates: [],
    runPlan: {},
    sourceResults: [{id: "source-1", status: "needs_review"}],
    eventCandidates: [],
  }, [{
    targetType: "source_result",
    targetId: "source-1",
    decision: "needs_changes",
    decisionStatus: "needs_changes",
    note: "Replace the placeholder source.",
    edits: {
      id: {before: "source-1", after: "attempted-rewrite"},
      title: {before: "Source", after: "Needs a real source"},
    },
    reviewedByUid: "admin-1",
    reviewedAt: "2026-07-11T00:00:00.000Z",
  }]);
  const sourceResults = result.sourceResults as
    Array<Record<string, unknown>>;
  assert.equal(sourceResults[0].id, "source-1");
  assert.equal(sourceResults[0].status, "needs_changes");
});

test("attaches the attributed organizer app visibility ceiling", () => {
  const bridge = attachOrganizerCeilings({
    eventCandidates: [{
      id: "attributed",
      attribution: {
        state: "attributed",
        match: {matchedEntityId: "organizer-1"},
      },
    }, {
      id: "orphan",
      attribution: {
        state: "orphan",
        match: {matchedEntityId: null},
      },
    }],
  }, new Map([["organizer-1", {appVisibility: "hidden"}]]));
  const candidates =
    bridge.eventCandidates as Array<Record<string, unknown>>;
  assert.deepEqual(candidates[0].organizerCeiling, {
    organizerId: "organizer-1",
    appVisibility: "hidden",
    canAppDiscover: false,
    reason: "The attributed organizer is hidden in the app.",
  });
  assert.equal(
    (candidates[1].organizerCeiling as Record<string, unknown>)
      .canAppDiscover,
    false
  );
});

test("blocks viewer-only admins", async () => {
  const h = await harness();
  await assert.rejects(
    adminGetEventIntakeDashboardHandler(
      callableRequest("admin-1", {salesStaff: true}),
      h.deps
    ),
    (error: unknown) => {
      assert.equal((error as {code?: string}).code, "permission-denied");
      return true;
    }
  );
});

async function seedCompletedRun(
  repository: InMemoryOperationsRepository,
  {
    runId,
    market,
    updatedAt,
    intakeScope = "all",
  }: {
    runId: string;
    market: string;
    updatedAt: string;
    intakeScope?: "all" | "organizer";
  }
) {
  await repository.createRun(operationRun({
    runId,
    status: "completed",
    scope: {market, intakeScope},
    updatedAt,
    startedAt: updatedAt,
    finishedAt: updatedAt,
  }));
}

function eventCandidateWorkItem({
  runId,
  id,
}: {
  runId: string;
  id: string;
}) {
  return operationWorkItem({
    workItemId: `work:event:${id}`,
    runId,
    externalKey: id,
    normalizedPayload: {
      intake: {
        recordType: "event_candidate",
        candidate: eventCandidate(id),
      },
    },
  });
}

function sourceResultWorkItem({
  runId,
  id,
}: {
  runId: string;
  id: string;
}) {
  return operationWorkItem({
    workItemId: `work:source-result:${id}`,
    runId,
    entityKind: "source_result",
    externalKey: id,
    normalizedPayload: {
      intake: {
        recordType: "event_source_result",
        result: {
          id,
          sourceProfileId: "luma",
          sourceLabel: "Luma",
          queryTemplateId: "operations",
          resultType: "source_result",
          title: "Source",
          url: "https://lu.ma/source",
          snippet: "",
          observedAt: now,
          status: "needs_review",
          riskFlags: [],
          operatorNotes: "",
        },
      },
    },
  });
}

function sourceProfileWorkItem({
  runId,
  id,
}: {
  runId: string;
  id: string;
}) {
  return operationWorkItem({
    workItemId: `work:source-profile:${id}`,
    runId,
    entityKind: "source_profile",
    externalKey: id,
    normalizedPayload: {
      intake: {
        recordType: "event_source_profile",
        profile: {
          id,
          label: "Luma",
          type: "official_structured",
          status: "enabled",
          cadence: "daily",
          riskLevel: "low",
          allowedUse: "discovery_and_extraction",
          items: [],
        },
      },
    },
  });
}

function eventCandidate(id: string) {
  return {
    id,
    normalizedEventKey: id,
    title: id,
    category: "external_event",
    neighborhood: "Mumbai",
    venue: "Venue",
    startDate: "2026-07-28",
    endDate: "2026-07-28",
    time: "18:00",
    price: "Free",
    sourceResultIds: [],
    sourceUrl: "https://lu.ma/event",
    sourceLabel: "Luma",
    reviewState: "needs_changes",
    requiresVerification: true,
    explicitSinglesEvent: false,
    whySinglesFriendly: "",
    publicDescription: "Source-backed event.",
    scores: {},
    sourceCoverage: {
      sourceResultIds: [],
      matchedSourceResults: 0,
      hasSourceUrl: true,
      hasManualInstagramReference: false,
    },
    sourceStatus: "source_backed",
    publishability: "reviewable_needs_verification",
    score: 0,
    warnings: [],
    blockerCodes: [],
    publicationEligibility: "review_gated",
  };
}

function callableRequest(
  uid: string | null,
  token: Record<string, unknown> = {}
): CallableRequest<unknown> {
  return {
    auth: uid ? {uid, token} as CallableRequest["auth"] : undefined,
    data: {},
    rawRequest: {headers: {}} as CallableRequest["rawRequest"],
  } as CallableRequest<unknown>;
}
