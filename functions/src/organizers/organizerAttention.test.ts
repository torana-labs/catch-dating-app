import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError} from "firebase-functions/v2/https";
import {operationContentHash} from "../operations/durableActions";
import type {OperationWorkItem} from "../operations/models";
import {
  deliveryWorkBasis,
  deliveryWorkIds,
  deliveryWorkProjection,
} from "../eventSuccess/operations/deliveryWorkRecords";
import type {EventAssistanceCaseDocument} from
  "../shared/generated/eventAssistanceCaseDocument";
import type {
  EventDocument,
  EventParticipationDocument,
  HostPaymentAccountDocument,
  OrganizerApplicationDocument,
  OrganizerAttentionItemDocument,
  OrganizerDocument,
  OrganizerFormAutomationRuleDocument,
  OrganizerFormAutomationRunDocument,
  ProviderSyncRunDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  buildOrganizerAttentionProjectionPlan,
  listOrganizerAttentionItemsHandler,
  loadOrganizerAttentionSources,
  maxAttentionSourceRows,
  parseDeliveryReviewAttentionSource,
} from "./organizerAttention";
import {
  AttentionSourceRow,
  DeliveryReviewAttentionSource,
  deriveOrganizerAttentionItems,
  DesiredHostAttentionItem,
  hostAttentionCoverage,
  OfferAttentionSource,
  OrganizerAttentionSources,
} from "./organizerAttentionPolicy";

const nowMillis = Date.parse("2026-09-01T10:00:00.000Z");
const hourMillis = 60 * 60 * 1000;

test("derives independent source-ready server attention kinds", () => {
  const sources = sourceFixture();
  const items = deriveOrganizerAttentionItems({
    organizerId: "organizer-1",
    nowMillis,
    sources,
  });

  assert.deepEqual(new Set(items.map((item) => item.kind)), new Set([
    "eventLiveOperations",
    "eventWaitlistReview",
    "applicationReview",
    "providerSyncFailure",
    "formAutomationFailure",
    "payoutSetup",
  ]));
  assert.equal(items.find((item) =>
    item.kind === "eventLiveOperations")?.blocking, true);
  assert.equal(items.find((item) =>
    item.kind === "eventWaitlistReview")?.context.count, 4);
  assert.equal(items.find((item) =>
    item.kind === "applicationReview")?.assignedHostUid, "reviewer-1");
  assert.equal(items.find((item) =>
    item.kind === "payoutSetup")?.context.provider, "razorpay");
  assert.deepEqual(
    [...items].sort(compareExpected).map((item) => item.attentionId),
    items.map((item) => item.attentionId)
  );
});

test("projects staffAttention sends as one item per run", () => {
  const sources = emptySources();
  sources.momentAttentionSends = [
    row("send-1", {
      runId: "run-a",
      momentId: "moment-1",
      scopeKind: "event",
      scopeId: "event-1",
      duty: "door",
      severity: "urgent",
      title: "Door staffing gap",
      createdAtMillis: nowMillis - hourMillis,
    }, nowMillis - hourMillis),
    row("send-2", {
      runId: "run-a",
      momentId: "moment-1",
      scopeKind: "event",
      scopeId: "event-1",
      duty: "door",
      severity: "urgent",
      title: "Door staffing gap",
      createdAtMillis: nowMillis - hourMillis,
    }, nowMillis - hourMillis),
    row("send-3", {
      runId: "run-b",
      momentId: "moment-2",
      scopeKind: "program",
      scopeId: "program-1",
      duty: "communications",
      severity: "info",
      title: "Manifest ready",
      createdAtMillis: nowMillis - 2 * hourMillis,
    }, nowMillis - 2 * hourMillis),
  ];
  const items = deriveOrganizerAttentionItems({
    organizerId: "organizer-1",
    nowMillis,
    sources,
  }).filter((item) => item.kind === "momentStaffAttention");

  assert.equal(items.length, 2);
  const urgent = items.find((item) => item.scope === "event");
  assert.ok(urgent);
  assert.equal(urgent.eventId, "event-1");
  assert.equal(urgent.consequence, "risksGuestExperience");
  assert.equal(urgent.blocking, true);
  assert.equal(urgent.context.count, 2);
  assert.equal(urgent.context.subjectLabel, "Door staffing gap");
  assert.equal(urgent.dedupeKey, "momentStaffAttention:run-a");
  assert.equal(urgent.expiresAtMillis,
    nowMillis - hourMillis + 24 * hourMillis);
  const program = items.find((item) => item.scope === "organizer");
  assert.ok(program);
  assert.equal(program.consequence, "informational");
  assert.equal(program.blocking, false);
  assert.equal(program.destination.route, "hostProgramWork");
  assert.equal(program.destination.section, "moments");
});

test("unpaid offered offers group into one follow-up item per event", () => {
  const sources = emptySources();
  sources.events = [row("event-1", event({
    startMillis: nowMillis + 48 * hourMillis,
    endMillis: nowMillis + 51 * hourMillis,
  }), nowMillis - hourMillis)];
  sources.eventOffers = [
    row("offer-1", offer({
      offeredAtMillis: nowMillis - 30 * hourMillis,
    }), nowMillis - 2 * hourMillis),
    row("offer-2", offer({
      offerId: "offer-2",
      manualPaymentStatus: "evidenceSubmitted",
      expiresAtMillis: nowMillis + 40 * hourMillis,
    }), nowMillis - hourMillis),
    row("offer-3", offer({
      offerId: "offer-3",
      manualPaymentStatus: "hostAttestedReceived",
    }), nowMillis),
    row("offer-4", offer({offerId: "offer-4", expectedAmountMinor: 0}),
      nowMillis),
    row("offer-5", offer({
      offerId: "offer-5",
      expiresAtMillis: nowMillis - hourMillis,
    }), nowMillis),
    row("offer-6", offer({offerId: "offer-6", status: "withdrawn"}),
      nowMillis),
  ];
  const items = deriveOrganizerAttentionItems({
    organizerId: "organizer-1",
    nowMillis,
    sources,
  }).filter((item) => item.kind === "eventOfferPaymentFollowUp");

  assert.equal(items.length, 1);
  const item = items[0];
  assert.equal(item.eventId, "event-1");
  assert.equal(item.scope, "event");
  assert.equal(item.sourceOwner, "organizerEventOffers");
  assert.equal(item.consequence, "risksRevenue");
  assert.equal(item.blocking, false);
  assert.equal(item.context.count, 2);
  assert.equal(item.context.eventName, "Sunday Social Run");
  assert.equal(item.dedupeKey, "eventOfferPaymentFollowUp:event-1");
  assert.equal(item.destination.route, "hostEventManage");
  assert.equal(item.destination.section, "guests");
  assert.equal(item.dueAtMillis, nowMillis - 6 * hourMillis);
  assert.equal(item.expiresAtMillis, nowMillis + 40 * hourMillis);
});

test("settled, free, expired and non-offered offers raise no follow-up",
  () => {
    const sources = emptySources();
    sources.eventOffers = [
      row("offer-1", offer({
        manualPaymentStatus: "hostAttestedReceived",
      }), nowMillis),
      row("offer-2", offer({offerId: "offer-2", status: "withdrawn"}),
        nowMillis),
      row("offer-3", offer({offerId: "offer-3", status: "draft"}), nowMillis),
      row("offer-4", offer({offerId: "offer-4", status: "expired"}),
        nowMillis),
      row("offer-5", offer({offerId: "offer-5", expectedAmountMinor: 0}),
        nowMillis),
      row("offer-6", offer({
        offerId: "offer-6",
        expiresAtMillis: nowMillis - 1000,
      }), nowMillis),
    ];
    const items = deriveOrganizerAttentionItems({
      organizerId: "organizer-1",
      nowMillis,
      sources,
    });
    assert.equal(items.some((item) =>
      item.kind === "eventOfferPaymentFollowUp"), false);
  });

test("private basics do not create waitlist or payout obligations", () => {
  const sources = sourceFixture();
  sources.events = [row("event-1", {
    name: "Sunday Social Run",
    organizerId: "organizer-1",
    startTime: timestamp(nowMillis + hourMillis),
    status: "active",
    publicationState: "private",
    setupRevision: 1,
  } as EventDocument, nowMillis)];
  const items = deriveOrganizerAttentionItems({
    organizerId: "organizer-1", nowMillis, sources,
  });
  assert.equal(items.some((item) => item.kind === "eventLiveOperations" ||
    item.kind === "eventWaitlistReview" || item.kind === "payoutSetup"),
  false);
});

test("latest terminal outcomes resolve failures without weak proxies", () => {
  const base = sourceFixture();
  base.events[0].data = event({manualApprovalRequired: true});
  base.eventParticipations = [row(
    "event-1_requester-1",
    eventParticipation(),
    nowMillis - 25 * hourMillis
  )];
  base.paymentAccounts.razorpay = row(
    "owner-1_razorpay",
    paymentAccount({ready: true}),
    nowMillis
  );
  base.providerSyncRuns.push(
    row("provider-running", providerRun({
      status: "running",
      startedAtMillis: nowMillis - hourMillis,
    }), nowMillis - hourMillis)
  );

  let items = deriveOrganizerAttentionItems({
    organizerId: "organizer-1",
    nowMillis,
    sources: base,
  });
  assert.equal(items.some((item) =>
    item.kind === "eventWaitlistReview"), false);
  assert.equal(items.find((item) =>
    item.kind === "eventJoinRequestReview")?.context.count, 1);
  assert.equal(items.some((item) =>
    item.kind === "providerSyncFailure"), true,
  "a running retry must not hide the latest failed terminal run");
  assert.equal(items.some((item) => item.kind === "payoutSetup"), false);

  base.providerSyncRuns.push(
    row("provider-success", providerRun({
      status: "completed",
      startedAtMillis: nowMillis,
    }), nowMillis)
  );
  base.automationRuns.push(
    row("automation-success", automationRun({
      status: "succeeded",
      updatedAtMillis: nowMillis,
    }), nowMillis)
  );
  items = deriveOrganizerAttentionItems({
    organizerId: "organizer-1",
    nowMillis,
    sources: base,
  });
  assert.equal(items.some((item) =>
    item.kind === "providerSyncFailure"), false);
  assert.equal(items.some((item) =>
    item.kind === "formAutomationFailure"), false);

  base.automationRuns.pop();
  base.automationRules[0].data = automationRule({enabled: false});
  items = deriveOrganizerAttentionItems({
    organizerId: "organizer-1",
    nowMillis,
    sources: base,
  });
  assert.equal(items.some((item) =>
    item.kind === "formAutomationFailure"), false);
});

test("aggregates open practical help by active event", () => {
  const sources = emptySources();
  sources.events = [row("event-1", event(), nowMillis - hourMillis)];
  sources.eventAssistanceCases = [
    row("case-2", practicalCase({
      caseId: "case-2",
      receivedAt: nowMillis - 10 * 60 * 1000,
      assigneeUid: "manager-1",
    }), nowMillis - 5 * 60 * 1000),
    row("case-1", practicalCase({
      caseId: "case-1",
      receivedAt: nowMillis - 20 * 60 * 1000,
    }), nowMillis - 20 * 60 * 1000),
    row("case-resolved", practicalCase({
      caseId: "case-resolved",
      status: "resolved",
      receivedAt: nowMillis - 30 * 60 * 1000,
    }), nowMillis - 2 * 60 * 1000),
    row("case-safety", safetyCase(), nowMillis - 2 * 60 * 1000),
  ];

  const items = deriveOrganizerAttentionItems({
    organizerId: "organizer-1",
    nowMillis,
    sources,
  });
  const help = items.find((item) =>
    item.kind === "eventAssistanceCaseReview");
  assert.ok(help);
  assert.equal(help.context.count, 2);
  assert.equal(help.dueAtMillis, nowMillis - 20 * 60 * 1000);
  assert.equal(help.destination.section, "live");
  assert.equal(help.destination.eventId, "event-1");
  assert.equal(help.sourceOwner, "eventAssistanceCases");
  assert.equal(help.assignedHostUid, null,
    "an event-level aggregate must not claim one case assignee");
});

test("aggregates validated delivery reviews by active event", () => {
  const sources = emptySources();
  sources.events = [row("event-1", event(), nowMillis - hourMillis)];
  sources.deliveryReviewWorkItems = [
    row("work:delivery:one", deliveryReview({
      workItemId: "work:delivery:one",
      reviewDueAtMillis: nowMillis + 2 * hourMillis,
      reason: "noEligibleRoute",
    }), nowMillis - 5 * 60 * 1000),
    row("work:delivery:two", deliveryReview({
      workItemId: "work:delivery:two",
      reviewDueAtMillis: nowMillis + hourMillis,
      reason: "recipientNeedsReview",
    }), nowMillis - 10 * 60 * 1000),
  ];

  const items = deriveOrganizerAttentionItems({
    organizerId: "organizer-1",
    nowMillis,
    sources,
  });
  const review = items.find((item) =>
    item.kind === "eventAssistanceDeliveryReview");
  assert.ok(review);
  assert.equal(review.context.count, 2);
  assert.equal(review.dueAtMillis, nowMillis + hourMillis);
  assert.equal(review.destination.section, "live");
  assert.equal(review.sourceOwner, "operationWorkItems");
});

test("accepts only canonical Operations delivery review projections", () => {
  const source = deliveryReview({
    reviewDueAtMillis: nowMillis + hourMillis,
  });
  const payload = source.payload;
  const ids = deliveryWorkIds(payload.messageId);
  const projection = deliveryWorkProjection(payload);
  const item: OperationWorkItem = {
    schemaVersion: 1,
    ...ids,
    workflowId: "event-assistance",
    entityKind: "message_delivery",
    externalKey: payload.messageId,
    revision: source.revision,
    candidateHash: operationContentHash(deliveryWorkBasis(payload)),
    ...projection,
    warningCodes: [],
    priority: 0,
    attemptCount: source.revision,
    evidenceRefs: [],
    fieldProvenance: [],
    normalizedPayload: {...payload},
    decisionId: null,
    publicationPlanId: null,
    createdAt: new Date(payload.createdAt).toISOString(),
    updatedAt: new Date(nowMillis).toISOString(),
    staleAt: null,
    expiresAt: new Date(payload.expiresAt).toISOString(),
  };

  const parsed = parseDeliveryReviewAttentionSource(
    item,
    item.workItemId,
    nowMillis
  );
  assert.equal(parsed.reviewDueAtMillis, payload.checkpoint.dueAt);
  assert.equal(parsed.payload.checkpoint.phase, "review");
  assert.throws(
    () => parseDeliveryReviewAttentionSource(
      {...item, taskFlags: []},
      item.workItemId,
      nowMillis
    ),
    HttpsError
  );
});

test("applies the seven-day horizon and exposes all policy gaps", () => {
  const sources = emptySources();
  sources.events = [row("later-event", event({
    startMillis: nowMillis + 8 * 24 * hourMillis,
    endMillis: nowMillis + 8 * 24 * hourMillis + 2 * hourMillis,
    waitlistedCount: 8,
    priceInPaise: 0,
  }), nowMillis)];
  const items = deriveOrganizerAttentionItems({
    organizerId: "organizer-1",
    nowMillis,
    sources,
  });
  assert.deepEqual(items, []);

  const coverage = hostAttentionCoverage();
  assert.equal(coverage.length, 19);
  assert.equal(new Set(coverage.map((entry) => entry.kind)).size, 19);
  assert.equal(coverage.find((entry) =>
    entry.kind === "attendanceSync")?.state, "clientMergeRequired");
  assert.equal(coverage.find((entry) =>
    entry.kind === "dressRehearsal")?.state, "shortcutOnly");
  for (const kind of [
    "eventSuccessPreparation",
    "roomLayoutSetup",
    "eventStaffing",
    "formResponseReview",
    "inboxReply",
    "postEventReconciliation",
  ]) {
    assert.equal(coverage.find((entry) =>
      entry.kind === kind)?.state, "blockedMissingTruth");
  }
});

test(
  "keeps schedule-derived deadlines stable after they become overdue",
  () => {
    const sources = sourceFixture();
    const first = deriveOrganizerAttentionItems({
      organizerId: "organizer-1",
      nowMillis,
      sources,
    });
    const later = deriveOrganizerAttentionItems({
      organizerId: "organizer-1",
      nowMillis: nowMillis + 2 * hourMillis,
      sources,
    });

    for (const kind of ["eventWaitlistReview", "payoutSetup"] as const) {
      const firstItem = first.find((item) => item.kind === kind);
      const laterItem = later.find((item) => item.kind === kind);
      assert.ok(firstItem);
      assert.ok(laterItem);
      assert.equal(laterItem.dueAtMillis, firstItem.dueAtMillis);
      assert.equal(laterItem.sourceRevision, firstItem.sourceRevision);
    }
  }
);

test("projection planning avoids no-op writes and resolves stale opens", () => {
  const desired = deriveOrganizerAttentionItems({
    organizerId: "organizer-1",
    nowMillis,
    sources: sourceFixture(),
  }).slice(0, 1);
  const first = buildOrganizerAttentionProjectionPlan({
    organizerId: "organizer-1",
    now: timestamp(nowMillis),
    desired,
    existing: new Map(),
    openIds: [],
  });
  assert.equal(first.sets.length, 1);
  assert.equal(first.sets[0].document.purgeAt, null);

  const existing = new Map<string, OrganizerAttentionItemDocument>([[
    desired[0].attentionId,
    first.sets[0].document,
  ]]);
  const noChange = buildOrganizerAttentionProjectionPlan({
    organizerId: "organizer-1",
    now: timestamp(nowMillis + hourMillis),
    desired,
    existing,
    openIds: [desired[0].attentionId],
  });
  assert.equal(noChange.sets.length, 0);
  assert.equal(noChange.resolutions.length, 0);
  assert.equal(noChange.response[0].openedAtMillis, nowMillis);

  const resolved = buildOrganizerAttentionProjectionPlan({
    organizerId: "organizer-1",
    now: timestamp(nowMillis + 2 * hourMillis),
    desired: [],
    existing,
    openIds: [desired[0].attentionId],
  });
  assert.equal(resolved.resolutions.length, 1);
  assert.equal(resolved.resolutions[0].patch.status, "resolved");
  assert.equal(resolved.resolutions[0].patch.resolutionVersion, 2);
  assert.equal(
    (resolved.resolutions[0].patch.purgeAt as
      FirebaseFirestore.Timestamp).toMillis(),
    nowMillis + 2 * hourMillis + 30 * 24 * hourMillis
  );

  const priorResolved = {
    ...first.sets[0].document,
    status: "resolved" as const,
    resolutionVersion: 2,
    resolvedAt: timestamp(nowMillis + hourMillis),
    purgeAt: timestamp(nowMillis + 31 * 24 * hourMillis),
  };
  const reopened = buildOrganizerAttentionProjectionPlan({
    organizerId: "organizer-1",
    now: timestamp(nowMillis + 3 * hourMillis),
    desired,
    existing: new Map([[desired[0].attentionId, priorResolved]]),
    openIds: [],
  });
  assert.equal(reopened.sets[0].document.resolutionVersion, 3);
  assert.equal(
    reopened.sets[0].document.openedAt.toMillis(),
    nowMillis + 3 * hourMillis
  );
});

test(
  "callable enforces authority, rate limit, and complete coverage",
  async () => {
    const actions: string[] = [];
    const result = await listOrganizerAttentionItemsHandler(request(), {
      firestore: () => ({}) as FirebaseFirestore.Firestore,
      checkRateLimit: async (_db, uid, action) => {
        assert.equal(uid, "manager-1");
        actions.push(action);
      },
      requireManager: async ({organizerId, actorUid}) => {
        assert.equal(organizerId, "organizer-1");
        assert.equal(actorUid, "manager-1");
      },
      timestamp: () => timestamp(nowMillis),
      loadSources: async () => sourceFixture(),
      reconcile: async (_db, organizerId, _now, desired) => {
        assert.equal(organizerId, "organizer-1");
        return desired.map(withoutSourceTimestamp);
      },
    });
    assert.deepEqual(actions, ["listOrganizerAttentionItems"]);
    assert.equal(result.generatedAtMillis, nowMillis);
    assert.equal(result.coverage.length, 19);
    assert.equal(result.items.length, 6);
  }
);

test("callable fails closed instead of returning a partial queue", async () => {
  const sources = emptySources();
  sources.applications = Array.from(
    {length: maxAttentionSourceRows + 1},
    (_, index) => row(
      `application-${index}`,
      application({name: `Applicant ${index}`}),
      nowMillis
    )
  );
  await assert.rejects(
    listOrganizerAttentionItemsHandler(request(), {
      firestore: () => ({}) as FirebaseFirestore.Firestore,
      checkRateLimit: async () => undefined,
      requireManager: async () => undefined,
      timestamp: () => timestamp(nowMillis),
      loadSources: async () => sources,
      reconcile: async () => {
        assert.fail("reconciliation must not run after an over-cap derivation");
      },
    }),
    (error: unknown) => error instanceof HttpsError &&
      error.code === "resource-exhausted"
  );
});

// Exercise the real loader: selecting terminal state only in the policy
// cannot prevent a truncated organizer-wide history scan from failing first.
for (const historyCount of [400, 401, 1000]) {
  test(`loader keeps attention available with ${historyCount} successes`,
    async () => {
      const fixture = attentionLoaderFixture({
        organizerFormAutomationRules: [
          row("rule-1", automationRule(), nowMillis),
        ],
        organizerFormAutomationRuns: Array.from(
          {length: historyCount},
          (_, i) => row(
            `success-${String(i).padStart(4, "0")}`,
            automationRun({
              status: "succeeded", updatedAtMillis: nowMillis - i * 1000,
            }),
            nowMillis - i * 1000
          )),
        organizerApplications: [row("application-1", application(), nowMillis)],
      });
      const sources = await loadOrganizerAttentionSources(
        fixture.db, "organizer-1", timestamp(nowMillis)
      );
      const items = deriveOrganizerAttentionItems({
        organizerId: "organizer-1", nowMillis, sources,
      });
      assert.ok(items.some((item) => item.kind === "applicationReview"));
      assert.equal(items.some((item) => item.kind === "formAutomationFailure"),
        false);
      assert.equal(sources.automationRuns.length, 1);
      assert.equal(fixture.reads.filter((read) =>
        read.collection === "organizerFormAutomationRuns")
        .reduce((sum, read) => sum + read.rows, 0), 1);
    });
}

test("loader selects current terminal state by enabled rule, form and revision",
  async () => {
    const rule = automationRule();
    const run = automationRun();
    const fixture = attentionLoaderFixture({
      organizerFormAutomationRules: [
        row("rule-1", rule, nowMillis),
        row("disabled", {...rule, enabled: false}, nowMillis),
        row("no-terminal", rule, nowMillis),
      ],
      organizerFormAutomationRuns: [
        row("a-failure", {...run, status: "failed"}, nowMillis),
        row("z-success", {...run, status: "succeeded"}, nowMillis),
        row("newer-running", automationRun({
          status: "running", updatedAtMillis: nowMillis,
        }), nowMillis),
        row("wrong-form", {...run, formId: "other-form",
          updatedAt: timestamp(nowMillis + 1)}, nowMillis + 1),
        row("old-revision", {...run, ruleRevision: 1,
          updatedAt: timestamp(nowMillis + 1)}, nowMillis + 1),
        row("disabled-failure", {...run, ruleId: "disabled",
          updatedAt: timestamp(nowMillis + 1)}, nowMillis + 1),
        row("wrong-organizer", {...run, organizerId: "other",
          updatedAt: timestamp(nowMillis + 1)}, nowMillis + 1),
        row("pending-only", {...run, ruleId: "no-terminal", status: "pending"},
          nowMillis),
      ],
    });
    const sources = await loadOrganizerAttentionSources(
      fixture.db, "organizer-1", timestamp(nowMillis)
    );
    assert.deepEqual(sources.automationRules.map((rule) => rule.id),
      ["rule-1", "no-terminal"]);
    assert.deepEqual(sources.automationRuns.map((run) => run.id),
      ["z-success"]);
    assert.equal(deriveOrganizerAttentionItems({
      organizerId: "organizer-1", nowMillis, sources,
    }).some((item) => item.kind === "formAutomationFailure"), false);
    const reads = fixture.reads.filter((read) =>
      read.collection === "organizerFormAutomationRuns");
    assert.equal(reads.length, 2);
    assert.ok(reads.every((read) => read.limit === 1));
  });

for (const terminal of ["succeeded", "skipped"] as const) {
  test(`loader newer ${terminal} resolves an older failure`, async () => {
    const fixture = attentionLoaderFixture({
      organizerFormAutomationRules: [
        row("rule-1", automationRule(), nowMillis),
      ],
      organizerFormAutomationRuns: [
        row("z-failure", automationRun({status: "failed"}), nowMillis),
        row("a-resolution", automationRun({
          status: terminal, updatedAtMillis: nowMillis,
        }), nowMillis),
      ],
    });
    const sources = await loadOrganizerAttentionSources(
      fixture.db, "organizer-1", timestamp(nowMillis)
    );
    assert.deepEqual(sources.automationRuns.map((run) => run.id),
      ["a-resolution"]);
    assert.equal(deriveOrganizerAttentionItems({
      organizerId: "organizer-1", nowMillis, sources,
    }).some((item) => item.kind === "formAutomationFailure"), false);
  });
}

test("loader orders terminal state by update time rather than creation time",
  async () => {
    const fixture = attentionLoaderFixture({
      organizerFormAutomationRules: [
        row("rule-1", automationRule(), nowMillis),
      ],
      organizerFormAutomationRuns: [
        row("z-new-created-failure", automationRun({
          status: "failed", updatedAtMillis: nowMillis - 1000,
        }), nowMillis - 1000),
        row("a-retried-success", {...automationRun({
          status: "succeeded", updatedAtMillis: nowMillis,
        }), createdAt: timestamp(nowMillis - 3 * hourMillis)}, nowMillis),
      ],
    });
    const sources = await loadOrganizerAttentionSources(
      fixture.db, "organizer-1", timestamp(nowMillis)
    );
    assert.deepEqual(sources.automationRuns.map((run) => run.id),
      ["a-retried-success"]);
  });

test("loader retains tied winning failures and organizer-wide null-form rules",
  async () => {
    const fixture = attentionLoaderFixture({
      organizerFormAutomationRules: [row("rule-1", {
        ...automationRule(), formId: null,
      }, nowMillis)],
      organizerFormAutomationRuns: [
        row("a-success", {
          ...automationRun({status: "succeeded"}), formId: null,
        },
        nowMillis),
        row("z-failure", {...automationRun({status: "failed"}), formId: null},
          nowMillis),
      ],
    });
    const sources = await loadOrganizerAttentionSources(
      fixture.db, "organizer-1", timestamp(nowMillis)
    );
    const failures = deriveOrganizerAttentionItems({
      organizerId: "organizer-1", nowMillis, sources,
    }).filter((item) => item.kind === "formAutomationFailure");
    assert.equal(failures.length, 1);
    assert.equal(failures[0].sourceId, "z-failure");
    assert.equal(failures[0].scope, "organizer");
  });

test("loader bounds enabled rules and does not query historical disabled rules",
  async () => {
    const fixture = attentionLoaderFixture({
      organizerFormAutomationRules: Array.from({length: 1000}, (_, i) =>
        row(`disabled-${i}`, automationRule({enabled: false}), nowMillis)),
      organizerFormAutomationRuns: [row("failed", automationRun(), nowMillis)],
    });
    const sources = await loadOrganizerAttentionSources(
      fixture.db, "organizer-1", timestamp(nowMillis)
    );
    assert.deepEqual(sources.automationRules, []);
    assert.deepEqual(sources.automationRuns, []);
    assert.equal(fixture.reads.some((read) =>
      read.collection === "organizerFormAutomationRuns"), false);
    for (const count of [400, 401]) {
      const enabled = attentionLoaderFixture({
        organizerFormAutomationRules: Array.from({length: count}, (_, i) =>
          row(`rule-${i}`, automationRule(), nowMillis)),
      });
      if (count === 400) {
        const loaded = await loadOrganizerAttentionSources(
          enabled.db, "organizer-1", timestamp(nowMillis)
        );
        assert.equal(loaded.automationRules.length, 400);
        assert.equal(enabled.reads.filter((read) =>
          read.collection === "organizerFormAutomationRuns").length, 400);
        assert.equal(enabled.maxRunConcurrency, 10);
      } else {
        await assert.rejects(loadOrganizerAttentionSources(
          enabled.db, "organizer-1", timestamp(nowMillis)
        ), (error: unknown) => error instanceof HttpsError &&
          error.code === "resource-exhausted");
        assert.equal(enabled.reads.some((read) =>
          read.collection === "organizerFormAutomationRuns"), false);
      }
    }
  });

test("terminal query failure cannot reconcile or return complete coverage",
  async () => {
    const queryError = new Error("Required Firestore index is unavailable.");
    const fixture = attentionLoaderFixture({
      organizerFormAutomationRules: [
        row("rule-1", automationRule(), nowMillis),
      ],
    }, queryError);
    await assert.rejects(listOrganizerAttentionItemsHandler(request(), {
      firestore: () => fixture.db,
      checkRateLimit: async () => undefined,
      requireManager: async () => undefined,
      timestamp: () => timestamp(nowMillis),
      loadSources: loadOrganizerAttentionSources,
      reconcile: async () => {
        return assert.fail("incomplete source must not reconcile");
      },
    }), (error: unknown) => error === queryError);
  });

// An immutable query double applies filters, ordering and limits against
// history instead of returning an already-selected hand-built snapshot.
function attentionLoaderFixture(
  collections: Record<string, Array<AttentionSourceRow<unknown>>>,
  runError?: Error
) {
  type Read = {collection: string; limit: number; rows: number};
  const reads: Read[] = [];
  let activeRunReads = 0;
  let maxRunConcurrency = 0;
  type Filter = {field: string; operator: string; value: unknown};
  type Order = {field: string; direction: string};
  function valueAt(data: unknown, field: string): unknown {
    return field.split(".").reduce<unknown>((value, key) =>
      (value as Record<string, unknown> | undefined)?.[key], data);
  }
  function comparable(value: unknown): string | number | null {
    if (value &&
        typeof (value as {toMillis?: unknown}).toMillis === "function") {
      return (value as FirebaseFirestore.Timestamp).toMillis();
    }
    return value as string | number | null;
  }
  function query(collection: string, filters: Filter[] = [],
    orders: Order[] = [], limit = Number.POSITIVE_INFINITY): unknown {
    return {
      doc: (id: string) => ({get: async () => ({
        id, exists: collection === "organizers",
        data: () => ({}), updateTime: timestamp(nowMillis),
      })}),
      where: (field: string, operator: string, value: unknown) =>
        query(collection, [...filters, {field, operator, value}],
          orders, limit),
      orderBy: (field: string | FirebaseFirestore.FieldPath,
        direction = "asc") => query(collection, filters, [...orders, {
        field: typeof field === "string" ? field : "__name__", direction,
      }], limit),
      limit: (count: number) => query(collection, filters, orders, count),
      get: async () => {
        const isRunQuery = collection === "organizerFormAutomationRuns";
        if (isRunQuery) {
          activeRunReads++;
          maxRunConcurrency = Math.max(maxRunConcurrency, activeRunReads);
        }
        try {
          // A query remains in flight until the next event-loop turn, so the
          // 400-rule fixture measures the loader's actual parallel fanout.
          if (isRunQuery) {
            await new Promise<void>((resolve) => setImmediate(resolve));
          }
          if (collection === "organizerFormAutomationRuns" && runError) {
            throw runError;
          }
          let selected = (collections[collection] ?? []).filter((row) =>
            filters.every(({field, operator, value}) => {
              const actual = valueAt(row.data, field);
              if (operator === "==") return actual === value;
              if (operator === "in") {
                return (value as unknown[]).includes(actual);
              }
              if (operator === ">") {
                return comparable(actual)! > comparable(value)!;
              }
              throw new Error(`Unsupported operator ${operator}`);
            }));
          selected = [...selected].sort((a, b) => {
            for (const {field, direction} of orders) {
              const left = comparable(field === "__name__" ? a.id :
                valueAt(a.data, field));
              const right = comparable(field === "__name__" ? b.id :
                valueAt(b.data, field));
              const result = left === right ? 0 : left! > right! ? 1 : -1;
              if (result) return direction === "desc" ? -result : result;
            }
            return 0;
          }).slice(0, limit);
          reads.push({collection, limit, rows: selected.length});
          return {size: selected.length, docs: selected.map((row) => ({
            id: row.id, exists: true, data: () => row.data,
            updateTime: timestamp(row.sourceUpdatedAtMillis),
          }))};
        } finally {
          if (isRunQuery) activeRunReads--;
        }
      },
    };
  }
  return {
    db: {collection: (name: string) => query(name)} as unknown as
      FirebaseFirestore.Firestore,
    reads,
    get maxRunConcurrency() {
      return maxRunConcurrency;
    },
  };
}

function sourceFixture(): OrganizerAttentionSources {
  const sources = emptySources();
  sources.events = [row("event-1", event(), nowMillis - hourMillis)];
  sources.applications = [row(
    "application-1",
    application(),
    nowMillis - 2 * hourMillis
  )];
  sources.providerSyncRuns = [row(
    "provider-failed",
    providerRun(),
    nowMillis - 2 * hourMillis
  )];
  sources.automationRules = [row(
    "rule-1",
    automationRule(),
    nowMillis - 3 * hourMillis
  )];
  sources.automationRuns = [row(
    "automation-failed",
    automationRun(),
    nowMillis - 2 * hourMillis
  )];
  return sources;
}

function emptySources(): OrganizerAttentionSources {
  return {
    organizer: row("organizer-1", organizer(), nowMillis - 10 * hourMillis),
    events: [],
    eventAssistanceCases: [],
    deliveryReviewWorkItems: [],
    eventParticipations: [],
    applications: [],
    providerSyncRuns: [],
    automationRules: [],
    automationRuns: [],
    paymentAccounts: {},
    momentAttentionSends: [],
    eventOffers: [],
  };
}

function deliveryReview(overrides: {
  workItemId?: string;
  reviewDueAtMillis?: number;
  reason?: DeliveryReviewAttentionSource["payload"]["checkpoint"]["reason"];
} = {}): DeliveryReviewAttentionSource {
  const workItemId = overrides.workItemId ?? "work:delivery:one";
  const reviewDueAtMillis = overrides.reviewDueAtMillis ??
    nowMillis + hourMillis;
  return {
    workItemId,
    revision: 2,
    candidateHash: "e".repeat(64),
    reviewDueAtMillis,
    payload: {
      schemaVersion: 1,
      kind: "liveMessageDelivery",
      messageId: `outbox:${"f".repeat(64)}`,
      intentHash: "1".repeat(64),
      threadId: "thread-1",
      scope: {
        context: {
          mode: "live",
          eventId: "event-1",
          organizerId: "organizer-1",
        },
        attendeeId: "attendee-1",
        episodeId: "episode-1",
      },
      createdAt: nowMillis - 2 * hourMillis,
      expiresAt: reviewDueAtMillis,
      checkpoint: {
        phase: "review",
        reason: overrides.reason ?? "noEligibleRoute",
        dueAt: reviewDueAtMillis,
        messageRevision: 2,
        messageHash: "2".repeat(64),
        failures: 1,
        evaluations: 2,
      },
    },
  };
}

function practicalCase(overrides: {
  caseId?: string;
  status?: "open" | "resolved";
  receivedAt?: number;
  assigneeUid?: string | null;
} = {}): EventAssistanceCaseDocument {
  const status = overrides.status ?? "open";
  const receivedAt = overrides.receivedAt ?? nowMillis - hourMillis;
  const resolution = status === "resolved" ? {
    outcome: "resolved" as const,
    actorUid: "manager-1",
    at: nowMillis - 5 * 60 * 1000,
  } : null;
  return {
    schemaVersion: 1,
    caseId: overrides.caseId ?? "case-1",
    guestId: "guest-1",
    context: {
      mode: "live",
      eventId: "event-1",
      organizerId: "organizer-1",
    },
    attendeeId: "attendee-1",
    episodeId: "episode-1",
    responseId: "response-1",
    messageId: `outbox:${"a".repeat(64)}`,
    status,
    receivedAt,
    category: "eventLogistics",
    owner: "eventLead",
    sourceGeneration: "b".repeat(64),
    handling: {
      revision: 1,
      assigneeUid: overrides.assigneeUid ?? null,
      updatedAt: resolution?.at ?? receivedAt,
      resolution,
    },
    attendeeGeneration: "c".repeat(64),
  } as EventAssistanceCaseDocument;
}

function safetyCase(): EventAssistanceCaseDocument {
  return {
    schemaVersion: 1,
    caseId: "case-safety",
    guestId: "guest-safety",
    context: {
      mode: "live",
      eventId: "event-1",
      organizerId: "organizer-1",
    },
    attendeeId: "attendee-safety",
    episodeId: "episode-safety",
    responseId: "response-safety",
    messageId: `outbox:${"d".repeat(64)}`,
    status: "open",
    receivedAt: nowMillis - 40 * 60 * 1000,
    category: "comfortSafety",
    owner: "authorizedSafetyOperator",
  };
}

function event(overrides: {
  startMillis?: number;
  endMillis?: number;
  waitlistedCount?: number;
  manualApprovalRequired?: boolean;
  priceInPaise?: number;
} = {}): EventDocument {
  const startMillis = overrides.startMillis ?? nowMillis - hourMillis;
  const endMillis = overrides.endMillis ?? nowMillis + 3 * hourMillis;
  return {
    name: "Sunday Social Run",
    organizerId: "organizer-1",
    startTime: timestamp(startMillis),
    endTime: timestamp(endMillis),
    meetingPoint: "Bandra promenade",
    capacityLimit: 40,
    constraints: {},
    priceInPaise: overrides.priceInPaise ?? 120000,
    currency: "INR",
    waitlistedCount: overrides.waitlistedCount ?? 4,
    status: "active",
    eventPolicy: {
      version: 2,
      admission: {
        format: overrides.manualApprovalRequired ? "manualApproval" : "open",
        capacityLimit: 40,
        manualApprovalRequired:
          overrides.manualApprovalRequired ?? false,
      },
      pricing: {basePriceInPaise: overrides.priceInPaise ?? 120000},
      cancellation: {policyId: "standard"},
      settlement: {hostPayoutTiming: "afterEventCompletion"},
    },
  } as unknown as EventDocument;
}

function organizer(): OrganizerDocument {
  return {
    name: "Saket Run Club",
    hostUserId: "owner-1",
    ownerUserId: "owner-1",
    hostUserIds: ["owner-1", "manager-1"],
    hostProfiles: [],
  } as unknown as OrganizerDocument;
}

function eventParticipation(): EventParticipationDocument {
  return {
    eventId: "event-1",
    organizerId: "organizer-1",
    uid: "requester-1",
    status: "waitlisted",
    hostApprovalStatus: "pending",
    createdAt: timestamp(nowMillis - 26 * hourMillis),
    updatedAt: timestamp(nowMillis - 25 * hourMillis),
    waitlistedAt: timestamp(nowMillis - 26 * hourMillis),
  } as unknown as EventParticipationDocument;
}

function application(
  overrides: {name?: string} = {}
): OrganizerApplicationDocument {
  return {
    organizerId: "organizer-1",
    formId: "form-1",
    formVersionId: "form-1-v1",
    targetKind: "event",
    targetId: "event-1",
    applicantDisplayName: overrides.name ?? "Asha Singh",
    applicantDisplayNameNormalized: "asha singh",
    reviewStatus: "submitted",
    latestResponseId: "response-1",
    assignedReviewerUid: "reviewer-1",
    revision: 3,
    submittedAt: timestamp(nowMillis - 30 * hourMillis),
    updatedAt: timestamp(nowMillis - 2 * hourMillis),
  } as unknown as OrganizerApplicationDocument;
}

function providerRun(overrides: {
  status?: ProviderSyncRunDocument["status"];
  startedAtMillis?: number;
} = {}): ProviderSyncRunDocument {
  const startedAtMillis = overrides.startedAtMillis ??
    nowMillis - 2 * hourMillis;
  const terminal = overrides.status !== "running";
  return {
    organizerId: "organizer-1",
    eventId: "event-1",
    provider: "luma",
    inputHash: "a".repeat(64),
    status: overrides.status ?? "failed",
    errorCode: terminal ? "provider_timeout" : null,
    startedAt: timestamp(startedAtMillis),
    completedAt: terminal ? timestamp(startedAtMillis) : null,
    expiresAt: timestamp(nowMillis + 10 * 24 * hourMillis),
  } as unknown as ProviderSyncRunDocument;
}

function automationRule(overrides: {
  enabled?: boolean;
} = {}): OrganizerFormAutomationRuleDocument {
  return {
    organizerId: "organizer-1",
    formId: "form-1",
    name: "Add approved response to CRM",
    enabled: overrides.enabled ?? true,
    revision: 2,
  } as unknown as OrganizerFormAutomationRuleDocument;
}

function automationRun(overrides: {
  status?: OrganizerFormAutomationRunDocument["status"];
  updatedAtMillis?: number;
} = {}): OrganizerFormAutomationRunDocument {
  const updatedAtMillis = overrides.updatedAtMillis ??
    nowMillis - 2 * hourMillis;
  return {
    organizerId: "organizer-1",
    formId: "form-1",
    ruleId: "rule-1",
    ruleRevision: 2,
    status: overrides.status ?? "partiallyFailed",
    errorCode: "action_failed",
    createdAt: timestamp(updatedAtMillis),
    updatedAt: timestamp(updatedAtMillis),
    completedAt: timestamp(updatedAtMillis),
  } as unknown as OrganizerFormAutomationRunDocument;
}

function paymentAccount(params: {ready: boolean}): HostPaymentAccountDocument {
  return {
    userId: "owner-1",
    provider: "razorpay",
    chargesEnabled: params.ready,
    payoutsEnabled: params.ready,
    detailsSubmitted: params.ready,
    onboardingStatus: params.ready ? "complete" : "restricted",
    requirementsCurrentlyDue: params.ready ? [] : ["bank_account"],
    requirementsPastDue: [],
    requirementsPendingVerification: [],
    updatedAt: timestamp(nowMillis),
  } as unknown as HostPaymentAccountDocument;
}

function offer(overrides: Partial<OfferAttentionSource> = {}):
  OfferAttentionSource {
  return {
    offerId: "offer-1",
    eventId: "event-1",
    status: "offered",
    generation: 1,
    revision: 1,
    expiresAtMillis: nowMillis + 24 * hourMillis,
    offeredAtMillis: nowMillis - 2 * hourMillis,
    expectedAmountMinor: 150000,
    currency: "INR",
    manualPaymentStatus: "none",
    updatedAtMillis: nowMillis - 2 * hourMillis,
    ...overrides,
  };
}

function row<T>(
  id: string,
  data: T,
  sourceUpdatedAtMillis: number
): AttentionSourceRow<T> {
  return {id, data, sourceUpdatedAtMillis};
}

function timestamp(millis: number): FirebaseFirestore.Timestamp {
  return admin.firestore.Timestamp.fromMillis(millis);
}

function request(): CallableRequest<unknown> {
  return {
    data: {organizerId: " organizer-1 "},
    auth: {uid: "manager-1", token: {}},
  } as CallableRequest<unknown>;
}

function withoutSourceTimestamp(
  desired: DesiredHostAttentionItem
): Omit<DesiredHostAttentionItem, "sourceUpdatedAtMillis"> {
  const {sourceUpdatedAtMillis, ...item} = desired;
  void sourceUpdatedAtMillis;
  return item;
}

function compareExpected(
  left: DesiredHostAttentionItem,
  right: DesiredHostAttentionItem
): number {
  const rank = {immediate: 0, soon: 1, upcoming: 2} as const;
  return rank[left.urgency] - rank[right.urgency] ||
    Number(right.blocking) - Number(left.blocking) ||
    left.dueAtMillis - right.dueAtMillis ||
    left.attentionId.localeCompare(right.attentionId);
}
