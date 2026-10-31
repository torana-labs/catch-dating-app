import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v2/https";
import {
  csvCell,
  listOrganizerContactsHandler,
  getOrganizerContactDetailHandler,
  exportOrganizerContactsHandler,
  createOrganizerContactRecord,
  buildContactTimeline,
  decodeContactCursor,
  encodeContactCursor,
  exactContactCountFromSummary,
  listContactsMatchCountResult,
  manualContactDetailsEditable,
  manualContactHasIdentityEndpoint,
  organizerContactReadCallableLimits,
  resolveManualTags,
  summarizeContactRevenue,
  summarizeContactRevenueFacts,
} from "./organizerContacts";
import {AudienceTestStore} from "./organizerAudienceTestStore";
import {organizerContactTraits} from "./organizerAudienceModel";
import type {
  OrganizerContactDocument,
  OrganizerAudienceSummaryDocument,
  OrganizerContactOutreachDocument,
  OrganizerContactTagVocabularyDocument,
  OrganizerManualSendTaskDocument,
  OrganizerWhatsappMessageDocument,
  PaymentDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {CreateOrganizerContactCallablePayload} from
  "../shared/generated/createOrganizerContactCallablePayload";
import {contractValidator} from "../shared/contractTestValidators";

const validateCreateOrganizerContactCallablePayload =
  contractValidator<CreateOrganizerContactCallablePayload>(
    "CreateOrganizerContactCallablePayload"
  );

test("customer timeline joins sources newest-first without overstating handoff",
  () => {
    const at = (millis: number) =>
      admin.firestore.Timestamp.fromMillis(millis);
    const manualTask = {
      organizerId: "organizer-1",
      taskId: "task-1",
      contactId: "contact-1",
      sourceKind: "individualConversation",
      sourceId: "contact-1",
      intent: "individualConversation",
      routeId: "personalWhatsappHandoff",
      deliveryMode: "byHand",
      status: "handoffOpened",
      active: true,
      revision: 2,
      idempotencyKey: "request-123",
      requestHash: "a".repeat(64),
      displayNameSnapshot: "Asha",
      endpointE164Snapshot: "+919876543210",
      endpointHash: "b".repeat(64),
      permissionSnapshot: {
        whatsappStatus: "optedIn",
        adminSuppressed: false,
        recordedAt: at(2_000),
      },
      capabilitySnapshot: {version: 1, managedRouteAvailable: false},
      prefillText: "Hello",
      prefillHash: "c".repeat(64),
      openCount: 1,
      createdByUid: "manager-1",
      updatedByUid: "manager-1",
      createdAt: at(2_000),
      updatedAt: at(4_000),
      openedAt: at(4_000),
      hostMarkedSentAt: null,
      skippedAt: null,
      cancelledAt: null,
      supersededAt: null,
      expiresAt: at(10_000),
    } satisfies OrganizerManualSendTaskDocument;
    const whatsappMessage = {
      schemaVersion: 1,
      messageId: "message-1",
      threadId: "thread-1",
      organizerId: "organizer-1",
      contactId: "contact-1",
      connectionId: "connection-1",
      direction: "inbound",
      body: "Thanks!",
      providerMessageId: "wamid.1",
      actorUid: null,
      occurredAt: at(5_000),
      createdAt: at(5_000),
      expiresAt: at(10_000),
    } satisfies OrganizerWhatsappMessageDocument;

    const result = buildContactTimeline({
      forms: [{
        kind: "form",
        timelineId: "form-1",
        responseId: "response-1",
        formId: "form-1",
        formTitle: "Quiz sign-up",
        action: "submitted",
        answeredQuestionCount: 4,
        occurredAtMillis: 1_000,
      }],
      events: [],
      sends: [],
      manualSendTasks: [manualTask],
      whatsappMessages: [whatsappMessage],
      catchReplies: [],
      outreach: [],
      formsCoverage: "exact",
      eventsCoverage: "exact",
      sendsCoverage: "exact",
      repliesCoverage: "partial",
      repliesTruncated: false,
      outreachCoverage: "exact",
    });

    assert.deepEqual(result.timeline.map((entry) => entry.kind), [
      "reply",
      "send",
      "form",
    ]);
    const manual = result.timeline[1];
    assert.equal(manual.kind, "send");
    if (manual.kind !== "send") throw new Error("Expected send entry.");
    assert.equal(manual.deliveryMode, "byHand");
    assert.equal(manual.observation, "hostOpened");
    assert.equal(manual.status, "handoffOpened");
    assert.equal(result.coverage.replies, "partial");
    assert.equal(
      result.coverage.replyObservation,
      "catchAndManagedWhatsappOnly"
    );
  });

test("customer timeline renders asserted outreach without note internals",
  () => {
    const at = (millis: number) =>
      admin.firestore.Timestamp.fromMillis(millis);
    const outreachDoc = (id: string, occurredAt: number) => ({
      id,
      data: {
        organizerId: "organizer-1",
        contactId: "contact-1",
        authorUid: "manager-1",
        channel: "phoneCall",
        outcome: "noAnswer",
        note: "  Try again after 6pm  ",
        occurredAt: at(occurredAt),
        revision: 1,
        createdAt: at(occurredAt),
        updatedAt: at(occurredAt),
        updatedByUid: "manager-1",
      } satisfies OrganizerContactOutreachDocument,
    });

    const result = buildContactTimeline({
      forms: [{
        kind: "form",
        timelineId: "form-1",
        responseId: "response-1",
        formId: "form-1",
        formTitle: "Quiz sign-up",
        action: "submitted",
        answeredQuestionCount: 4,
        occurredAtMillis: 1_000,
      }],
      events: [],
      sends: [],
      manualSendTasks: [],
      whatsappMessages: [],
      catchReplies: [],
      outreach: [
        outreachDoc("outreach-older", 3_000),
        outreachDoc("outreach-newer", 6_000),
      ],
      formsCoverage: "exact",
      eventsCoverage: "exact",
      sendsCoverage: "exact",
      repliesCoverage: "partial",
      repliesTruncated: false,
      outreachCoverage: "partial",
    });

    assert.deepEqual(result.timeline.map((entry) => entry.kind), [
      "outreach",
      "outreach",
      "form",
    ]);
    const newest = result.timeline[0];
    if (newest.kind !== "outreach") {
      throw new Error("Expected outreach entry.");
    }
    assert.equal(newest.channel, "phoneCall");
    assert.equal(newest.outcome, "noAnswer");
    assert.equal(newest.notePreview, "Try again after 6pm");
    assert.equal(newest.occurredAtMillis, 6_000);
    assert.equal(result.coverage.outreach, "partial");
    assert.equal(result.truncated, true);
  });

const callableResourceTestName =
  "contact read callables reserve startup memory and bounded concurrency";
test(callableResourceTestName, () => {
  assert.deepEqual(organizerContactReadCallableLimits, {
    timeoutSeconds: 60,
    memory: "512MiB",
    maxInstances: 20,
    concurrency: 20,
  });
});

test("contact cursors round trip every query plan", () => {
  for (const cursor of [
    {
      version: 2 as const,
      organizerId: "organizer-1",
      plan: "people" as const,
      sort: "lastSeen" as const,
      search: null,
      value: "1720000000000",
      contactId: "contact-1",
      segmentId: null,
      manualTagId: null,
    },
    {
      version: 2 as const,
      organizerId: "organizer-1",
      plan: "search" as const,
      sort: "name" as const,
      search: "asha",
      value: "asha",
      contactId: "contact-2",
      segmentId: null,
      manualTagId: null,
    },
    {
      version: 2 as const,
      organizerId: "organizer-1",
      plan: "segment" as const,
      sort: "mostAttended" as const,
      search: null,
      value: "7",
      contactId: "contact-3",
      segmentId: "repeat_attendee",
      manualTagId: null,
    },
    {
      version: 2 as const,
      organizerId: "organizer-1",
      plan: "manualTag" as const,
      sort: "name" as const,
      search: null,
      value: "zara",
      contactId: "contact-4",
      segmentId: null,
      manualTagId: "a".repeat(32),
    },
  ]) {
    assert.deepEqual(
      decodeContactCursor(encodeContactCursor(cursor)),
      cursor
    );
  }
});

test("legacy contact cursors fail instead of changing sort semantics", () => {
  const legacyCursor = Buffer.from(JSON.stringify({
    plan: "people",
    value: "1720000000000",
    contactId: "contact-1",
    segmentId: null,
    manualTagId: null,
  })).toString("base64url");

  assert.throws(
    () => decodeContactCursor(legacyCursor),
    (error: unknown) => error instanceof HttpsError &&
      error.code === "invalid-argument"
  );
});

test("manual tags reuse case-insensitive vocabulary entries", () => {
  const now = admin.firestore.Timestamp.fromMillis(1_000);
  const vocabulary: OrganizerContactTagVocabularyDocument = {
    organizerId: "organizer-1",
    tags: [{
      tagId: "a".repeat(32),
      label: "VIP",
      normalizedLabel: "vip",
      createdByUid: "manager-1",
      createdAt: now,
    }],
    updatedAt: now,
  };
  const resolved = resolveManualTags({
    organizerId: "organizer-1",
    labels: [" vip ", "Brings   friends"],
    vocabulary,
    actorUid: "manager-2",
    now,
  });

  assert.equal(resolved.vocabulary.tags.length, 2);
  assert.deepEqual(resolved.manualTags.map((tag) => tag.label), [
    "VIP",
    "Brings friends",
  ]);
  assert.equal(resolved.manualTags[0].tagId, "a".repeat(32));
});

test("manual tag caps fail with explicit organizer and contact errors", () => {
  const now = admin.firestore.Timestamp.fromMillis(1_000);
  assert.throws(
    () => resolveManualTags({
      organizerId: "organizer-1",
      labels: ["1", "2", "3", "4", "5", "6"],
      vocabulary: undefined,
      actorUid: "manager-1",
      now,
    }),
    (error: unknown) => error instanceof HttpsError &&
      error.code === "invalid-argument" &&
      error.message === "A contact can have at most 5 manual tags."
  );
  const vocabulary: OrganizerContactTagVocabularyDocument = {
    organizerId: "organizer-1",
    tags: Array.from({length: 20}, (_, index) => ({
      tagId: index.toString(16).padStart(32, "0"),
      label: `Tag ${index}`,
      normalizedLabel: `tag ${index}`,
      createdByUid: "manager-1",
      createdAt: now,
    })),
    updatedAt: now,
  };
  assert.throws(
    () => resolveManualTags({
      organizerId: "organizer-1",
      labels: ["New tag"],
      vocabulary,
      actorUid: "manager-1",
      now,
    }),
    (error: unknown) => error instanceof HttpsError &&
      error.code === "failed-precondition" &&
      error.message === "An organizer can have at most 20 manual tags."
  );
});

test("only unlinked organizer-created contacts expose endpoint editing", () => {
  assert.equal(manualContactDetailsEditable({
    primarySource: "hostManual",
    identityState: "unlinked",
  }), true);
  assert.equal(manualContactDetailsEditable({
    primarySource: "hostImport",
    identityState: "unlinked",
  }), false);
  assert.equal(manualContactDetailsEditable({
    primarySource: "hostManual",
    identityState: "verified",
  }), false);
});

test("manual contacts require at least one identity endpoint", () => {
  assert.equal(manualContactHasIdentityEndpoint({
    phoneE164: "+919876543210",
    email: null,
  }), true);
  assert.equal(manualContactHasIdentityEndpoint({
    phoneE164: null,
    email: "customer@example.com",
  }), true);
  assert.equal(manualContactHasIdentityEndpoint({
    phoneE164: null,
    email: null,
  }), false);

  assert.equal(validateCreateOrganizerContactCallablePayload({
    organizerId: "organizer-1",
    displayName: "Name only",
  }), false);
  assert.equal(validateCreateOrganizerContactCallablePayload({
    organizerId: "organizer-1",
    displayName: "Phone contact",
    phoneE164: "+919876543210",
  }), true);
  assert.equal(validateCreateOrganizerContactCallablePayload({
    organizerId: "organizer-1",
    displayName: "Email contact",
    email: "contact@example.com",
  }), true);
});

test("CRM CSV cells neutralize spreadsheet formulas and quote safely", () => {
  assert.equal(csvCell("=HYPERLINK(\"https://bad\")"),
    "\"'=HYPERLINK(\"\"https://bad\"\")\"");
  assert.equal(csvCell("Asha, Rao"), "\"Asha, Rao\"");
  assert.equal(csvCell("ordinary"), "ordinary");
});

test("contact cursor rejects malformed and unrecognized values", () => {
  assert.throws(
    () => decodeContactCursor("not-a-cursor"),
    (error: unknown) => error instanceof HttpsError &&
      error.code === "invalid-argument"
  );
  const unsupported = Buffer.from(JSON.stringify({
    plan: "all",
    value: "x",
    contactId: "contact-1",
    segmentId: null,
  })).toString("base64url");
  assert.throws(() => decodeContactCursor(unsupported));
});

test("contact match counts never present a lower bound as exact", () => {
  assert.deepEqual(listContactsMatchCountResult(37, 8), {
    matchCount: 37,
    matchCountCoverage: "exact",
  });
  assert.deepEqual(listContactsMatchCountResult(null, 8), {
    matchCount: 8,
    matchCountCoverage: "atLeast",
  });
  assert.equal(exactContactCountFromSummary(undefined), null);
  assert.equal(exactContactCountFromSummary({
    contactCount: 12,
    sourceCoverage: "partial",
  } as OrganizerAudienceSummaryDocument), null);
  assert.equal(exactContactCountFromSummary({
    contactCount: 12,
    sourceCoverage: "exact",
  } as OrganizerAudienceSummaryDocument), 12);
});

test("customer revenue includes completed organizer payments only", () => {
  const timestamp = {toMillis: () => 1700000000000} as
    FirebaseFirestore.Timestamp;
  const payment = (
    eventId: string,
    status: PaymentDocument["status"],
    amountMinor: number
  ): PaymentDocument => ({
    userId: "user-1",
    orderId: `${eventId}-${status}`,
    paymentId: `${eventId}-${status}`,
    eventId,
    amount: amountMinor,
    amountMinor,
    currency: "INR",
    status,
    signUpFailed: false,
    createdAt: timestamp,
  });
  const revenue = summarizeContactRevenue([
    payment("event-1", "completed", 25000),
    payment("event-1", "refunded", 25000),
    payment("other-event", "completed", 90000),
  ], new Set(["event-1"]), "exact");

  assert.deepEqual(revenue, {
    coverage: "exact",
    amounts: [{
      currency: "INR",
      amountMinor: 25000,
      factCount: 1,
      sources: [{
        source: "catchPayment",
        amountMinor: 25000,
        factCount: 1,
      }],
    }],
  });
});

const importedRevenueTestName =
  "customer revenue keeps imported and estimated provenance together";
test(importedRevenueTestName, () => {
  const result = summarizeContactRevenueFacts({
    coverage: "exact",
    facts: [
      {
        eventId: "event-1",
        currency: "INR",
        amountMinor: 120000,
        source: "hostImport",
        factCount: 1,
        allocation: "sharedOrder",
      },
      {
        eventId: "event-2",
        currency: "INR",
        amountMinor: 90000,
        source: "hostEstimate",
        factCount: 1,
        allocation: "perAttendee",
      },
    ],
  });

  assert.equal(result.revenue.amounts[0].amountMinor, 210000);
  assert.deepEqual(
    result.revenue.amounts[0].sources.map((source) => source.source),
    ["hostEstimate", "hostImport"]
  );
  assert.deepEqual(result.byEvent.get("event-1"), [{
    currency: "INR",
    amountMinor: 120000,
    source: "hostImport",
    factCount: 1,
    allocation: "sharedOrder",
  }]);
});

test("attested manual offer payments aggregate as reported revenue",
  () => {
    const result = summarizeContactRevenueFacts({
      coverage: "exact",
      facts: [{
        eventId: "event-1",
        currency: "INR",
        amountMinor: 500,
        source: "hostAttested",
        factCount: 1,
        allocation: "perAttendee",
      }],
    });
    assert.equal(result.revenue.amounts[0].amountMinor, 500);
    assert.equal(
      result.revenue.amounts[0].sources[0].source, "hostAttested");
    assert.deepEqual(result.byEvent.get("event-1"), [{
      currency: "INR",
      amountMinor: 500,
      source: "hostAttested",
      factCount: 1,
      allocation: "perAttendee",
    }]);
  });

test("directory detail and CSV share stored fields across account linking",
  async () => {
    const at = admin.firestore.Timestamp.fromMillis(1000);
    const store = new AudienceTestStore({
      "organizers/org-1": {ownerUserId: "host-1", hostUserIds: ["host-1"],
        hostProfiles: []},
      "users/uid-1": {email: "private@example.test", phone: "+911111111111"},
    });
    await createOrganizerContactRecord({db: store.asFirestore(),
      organizerId: "org-1", actorUid: "host-1", contactId: "person",
      displayName: "Submitted name", phoneE164: "+919999999999",
      email: "submitted@example.test", initialNote: null,
      identitySecret: "x".repeat(32), origin: {kind: "hostManual"}, now: at});
    const collections: string[] = [];
    const collection = store.collection.bind(store);
    store.collection = (name) => {
      collections.push(name); return collection(name);
    };
    const deps = {firestore: () => store.asFirestore(),
      checkRateLimit: async () => undefined, identitySecret: () => "unused"};
    const request = (data: object) => ({auth: {uid: "host-1"},
      data: {organizerId: "org-1", ...data}}) as
      import("firebase-functions/v2/https").CallableRequest<unknown>;
    for (const linkedUid of [null, "uid-1"]) {
      const person = store.docs["organizerContacts/person"] as unknown as
        OrganizerContactDocument;
      person.linkedUid = linkedUid;
      person.displayNameOverride = "Host label";
      person.identityState = linkedUid ? "verified" : "unlinked";
      store.docs["organizerContactTraits/person"] = {...organizerContactTraits({
        contactId: "person", contact: person, edges: [], now: at})!};
      const list = await listOrganizerContactsHandler(request({}), deps);
      const detail = await getOrganizerContactDetailHandler(request({
        contactId: "person", includeHistory: false}), deps);
      const exported = await exportOrganizerContactsHandler(request({}), deps);
      assert.equal(list.contacts[0].phoneE164, detail.phoneE164);
      assert.equal(list.contacts[0].email, detail.email);
      assert.equal(list.contacts[0].displayName, detail.displayName);
      assert.equal(detail.phoneE164, "+919999999999");
      assert.equal(detail.email, "submitted@example.test");
      assert.equal(detail.sourceDisplayName, "Submitted name");
      assert.ok(exported.csv.includes(csvCell(detail.phoneE164!)));
      assert.match(exported.csv, /Host label,.*submitted@example.test/);
      assert.doesNotMatch(exported.csv, /private@example.test|911111111111/);
    }
    assert.equal(collections.includes("users"), false);
  });
