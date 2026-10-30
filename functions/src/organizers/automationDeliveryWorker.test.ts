import assert from "node:assert/strict";
import test from "node:test";
import {createHash} from "node:crypto";
import * as admin from "firebase-admin";
import type {Firestore, Transaction} from "firebase-admin/firestore";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {
  AutomationDeliveryWorker, AUTOMATION_WHATSAPP_DISPATCHES,
} from "./automationDeliveryWorker";
import {AutomationWhatsappDeliveryStore} from
  "./automationWhatsappDeliveryStore";
import {
  automationCompanionMomentId,
  automationInviteLinkId,
  automationMomentRunId,
  handoffAutomationMessage,
  syncAutomationCompanionMoments,
} from "./organizerAutomationHandoff";
import type {OrganizerAutomationEvent} from "./organizerAutomationSource";
import {deliverAutomationMessage} from "./automationMomentDelivery";
import {whatsappStatusCorrelation} from
  "../eventSuccess/operations/whatsappDeliveryProtocol";
import {whatsappEndpointHash} from
  "../eventSuccess/operations/whatsappReplyProtocol";
import {MetaProviderError} from "./organizerWhatsappProvider";
import {
  hashEndpoint, organizerContactChannelStateId,
} from "./organizerCampaignModel";
import {organizerCommunicationPreferenceId} from
  "../shared/organizerCommunicationPreferences";
import {organizerContactOriginId} from "../shared/organizerContactOrigins";
import {runFromDocument} from "../moments/momentDocuments";
import type {AutomationDeliveryMessageDocument}
  from "../shared/generated/automationDeliveryMessageDocument";
import type {AutomationWhatsappDispatchDocument}
  from "../shared/generated/automationWhatsappDispatchDocument";
import type {
  OrganizerFormAutomationRuleDocument,
} from "../shared/generated/firestoreAdminTypes";
import {BRAND} from "../shared/generated/brand";

const NOW_MS = 1_800_000_000_000;
const NOW = admin.firestore.Timestamp.fromMillis(NOW_MS);
const E164 = "+919800000009";
const RUN_ID = "formrun_abc123";

const ts = (millis: number) => admin.firestore.Timestamp.fromMillis(millis);

const ORIGIN_ID = organizerContactOriginId({
  organizerId: "org-1",
  sourceKind: "hostForm",
  sourceEntityKind: "hostFormResponse",
  sourceEntityId: "resp-1",
});

function ruleDoc(overrides: Record<string, unknown> = {}) {
  return {
    organizerId: "org-1",
    enabled: true,
    revision: 1,
    name: "Welcome automation",
    formId: "form-1",
    trigger: {kind: "formResponse", eventKind: "submitted"},
    delayMinutes: 0,
    updatedByUid: "host",
    actions: [
      {
        actionId: "welcome",
        kind: "campaignHandoff",
        campaignId: "recipe-1",
        campaignRevision: 1,
      },
    ],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function seedAutomation(
  overrides: Record<string, Record<string, unknown>> = {},
): Record<string, Record<string, unknown>> {
  return {
    "organizers/org-1": {
      hostUserId: "host",
      ownerUserId: "host",
      hostUserIds: ["host"],
      hostProfiles: [],
    },
    "organizerFormAutomationRules/rule-1": ruleDoc(),
    "organizerCampaigns/recipe-1": {
      organizerId: "org-1",
      name: "Welcome recipe",
      status: "previewed",
      connectionId: "conn-1",
      templateId: "tpl-1",
      eventId: null,
      templateVariables: {"1": "Catch"},
      scheduledAt: null,
      savedAudienceId: null,
      inviteDestinationKind: "event",
      revision: 1,
      createdAt: NOW,
      updatedAt: NOW,
    },
    "organizerSenderConnections/conn-1": {
      organizerId: "org-1",
      provider: "metaCloudApi",
      status: "active",
      secretVersionResource: "projects/p/secrets/s/versions/1",
      phoneNumberId: "110000000000001",
      wabaId: "110000000000002",
      revision: 1,
    },
    "organizerMessageTemplates/tpl-1": {
      organizerId: "org-1",
      connectionId: "conn-1",
      status: "APPROVED",
      variableNames: ["1"],
      parameterBindings: [],
      contentHash: null,
    },
    "organizerForms/form-1": {organizerId: "org-1"},
    "organizerFormResponses/resp-1": {
      organizerId: "org-1",
      formId: "form-1",
      status: "submitted",
      submittedAt: NOW,
    },
    [`organizerContactOrigins/${ORIGIN_ID}`]: {
      organizerId: "org-1",
      currentContactId: "contact-1",
    },
    "organizerContacts/contact-1": {
      organizerId: "org-1",
      displayName: "Ada",
      linkedUid: "u-1",
      phoneE164: E164,
      identityState: "verified",
      identityConfidence: "verified",
      mergedIntoContactId: null,
      deletedAt: null,
      hiddenAt: null,
    },
    ["organizerCommunicationPreferences/" +
      organizerCommunicationPreferenceId("org-1", "u-1")]: {
      organizerId: "org-1",
      uid: "u-1",
      whatsappPurposes: {
        marketing: {
          status: "optedIn",
          endpointE164: E164,
          evidenceStatus: "complete",
          currentReceiptId: "rcpt-1",
          source: "manualImport",
          termsVersion: "v1",
          updatedAt: NOW,
        },
      },
      whatsapp: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
    ...overrides,
  };
}

const rule = () =>
  ruleDoc() as unknown as OrganizerFormAutomationRuleDocument;
const action = () => rule().actions[0];

const automationEvent = (
  overrides: Partial<OrganizerAutomationEvent> = {},
): OrganizerAutomationEvent => ({
  sourceId: "resp-1",
  kind: "submitted",
  organizerId: "org-1",
  formId: "form-1",
  eventId: null,
  contactId: "contact-1",
  occurredAt: NOW,
  eventEndAt: null,
  response: null,
  ...overrides,
});

function worker(db: FakeFirestore, provider: unknown,
  clock: () => number = () => NOW_MS) {
  return new AutomationDeliveryWorker(
    db as unknown as Firestore,
    provider as never,
    {accessBound: async () => "test-token"},
    clock,
  );
}

async function handoff(db: FakeFirestore,
  event = automationEvent(),
  overrides: Record<string, unknown> = {}) {
  const result = await handoffAutomationMessage({
    db: db as unknown as Firestore,
    automationRunId: RUN_ID,
    ruleId: "rule-1",
    event,
    rule: {...rule(), ...overrides} as OrganizerFormAutomationRuleDocument,
    action: action(),
    nowMillis: () => NOW_MS,
  });
  assert.equal(result.kind, "delegated");
  return result;
}

function recordOf(db: FakeFirestore): AutomationDeliveryMessageDocument {
  const entries = [...db.docs.entries()]
    .filter(([path]) => path.startsWith("automationDeliveryMessages/"));
  assert.equal(entries.length, 1);
  return entries[0][1] as unknown as AutomationDeliveryMessageDocument;
}

function dispatchDoc(db: FakeFirestore): AutomationWhatsappDispatchDocument {
  const entries = [...db.docs.entries()]
    .filter(([path]) =>
      path.startsWith(AUTOMATION_WHATSAPP_DISPATCHES + "/"));
  assert.equal(entries.length, 1);
  return entries[0][1] as unknown as AutomationWhatsappDispatchDocument;
}

test("handoff mints the companion moment, run, and durable intent " +
  "atomically", async () => {
  const db = new FakeFirestore(seedAutomation());
  const result = await handoff(db);
  const momentId = automationCompanionMomentId("rule-1", "welcome");
  const runId = automationMomentRunId(momentId, RUN_ID);
  assert.equal(result.momentRunId, runId);
  const moment = db.getDoc(`organizerMoments/${momentId}`)!;
  assert.equal(moment.origin, "formAutomation");
  assert.equal(moment.status, "armed");
  assert.deepEqual(moment.scope, {kind: "organizer", organizerId: "org-1"});
  const run = db.getDoc(`organizerMomentRuns/${runId}`)!;
  assert.equal(run.status, "planned");
  assert.equal(run.subjectId, "contact-1");
  const automation = run.automation as Record<string, unknown>;
  assert.equal(automation.ruleId, "rule-1");
  assert.equal(automation.deliveryMessageId, result.deliveryMessageId);
  const record = recordOf(db);
  assert.equal(record.messageId, result.deliveryMessageId);
  assert.equal(record.intent.context.ruleRevision, 1);
  assert.equal(record.intent.context.contactId, "contact-1");
  assert.equal(record.intent.workflow.momentId, momentId);
  assert.equal(record.intent.whatsapp.connectionId, "conn-1");
});

test("a recipe with an event destination mints a per-occurrence invite " +
  "link with truthful provenance", async () => {
  const db = new FakeFirestore(seedAutomation({
    "organizerCampaigns/recipe-1": {
      organizerId: "org-1",
      name: "Welcome recipe",
      status: "previewed",
      connectionId: "conn-1",
      templateId: "tpl-1",
      eventId: "ev-1",
      templateVariables: {},
      scheduledAt: null,
      savedAudienceId: null,
      inviteDestinationKind: "event",
      revision: 1,
      createdAt: NOW,
      updatedAt: NOW,
    },
    "organizerMessageTemplates/tpl-1": {
      organizerId: "org-1",
      connectionId: "conn-1",
      status: "APPROVED",
      variableNames: ["invite_url"],
      parameterBindings: [],
      contentHash: null,
    },
    "events/ev-1": {
      organizerId: "org-1",
      clubId: "org-1",
      status: "active",
      startTime: ts(NOW_MS + 86_400_000),
      endTime: ts(NOW_MS + 90_000_000),
    },
  }));
  const result = await handoff(db);
  const linkId = automationInviteLinkId(RUN_ID, "welcome", "contact-1");
  const link = db.getDoc(`eventInviteLinks/${linkId}`)!;
  assert.equal(link.issuanceChannel, "formAutomation");
  assert.equal(link.source, "formAutomation");
  assert.equal(link.intendedRecipientContactId, "contact-1");
  assert.equal(link.campaignId, null);
  const secret = db.getDoc(`eventInviteLinkSecrets/${linkId}`)!;
  assert.equal(typeof secret.token, "string");
  const record = recordOf(db);
  assert.equal(record.intent.whatsapp.inviteLinkId, linkId);
  assert.ok(record.intent.whatsapp.variables.invite_url
    .startsWith(`${BRAND.web.origin}/invite/`));
  // Retry reuses the minted secret — the rendered variable is stable.
  const again = await handoff(db);
  assert.equal(again.deliveryMessageId, result.deliveryMessageId);
  assert.equal(
    (db.getDoc(`eventInviteLinkSecrets/${linkId}`)!.token as string),
    secret.token);
},
);

test("a retried handoff converges on the same run and message ids",
  async () => {
    const db = new FakeFirestore(seedAutomation());
    const first = await handoff(db);
    const second = await handoff(db);
    assert.equal(second.momentRunId, first.momentRunId);
    assert.equal(second.deliveryMessageId, first.deliveryMessageId);
    const runs = [...db.docs.entries()].filter(([path]) =>
      path.startsWith("organizerMomentRuns/"));
    assert.equal(runs.length, 1);
    assert.equal(db.transactionCommits >= 2, true);
  },
);

test("dispatch claims, submits, and binds dispatch evidence atomically",
  async () => {
    const db = new FakeFirestore(seedAutomation());
    const {deliveryMessageId} = await handoff(db);
    const calls: Array<Record<string, unknown>> = [];
    const result = await worker(db, {
      sendTemplate: async (args: Record<string, unknown>) => {
        calls.push(args);
        return {providerMessageId: "wamid-1"};
      },
    }).dispatch(deliveryMessageId);
    assert.deepEqual(result, {kind: "submitted",
      outcome: {kind: "accepted", providerMessageId: "wamid-1"}});
    assert.equal(calls.length, 1);
    assert.equal(calls[0].toE164, E164);
    const dispatch = dispatchDoc(db);
    assert.equal(dispatch.endpointHash, hashEndpoint(E164));
    assert.equal(dispatch.senderId, "conn-1");
    assert.equal(dispatch.context.ruleId, "rule-1");
    assert.equal(dispatch.context.contactId, "contact-1");
    assert.equal(recordOf(db).attempts[0].state.kind, "accepted");
    // The shared seven-day frequency ledger moved — campaigns and
    // automation sends draw on one counter.
    const state = db.getDoc(`organizerContactChannelStates/${
      organizerContactChannelStateId("org-1", "contact-1")}`)!;
    assert.equal(state.campaignAcceptedCount, 1);
  },
);

test("a rule edit between handoff and claim stops the intent superseded",
  async () => {
    const db = new FakeFirestore(seedAutomation());
    const {deliveryMessageId} = await handoff(db);
    db.updateDoc("organizerFormAutomationRules/rule-1", {revision: 2});
    const calls: unknown[] = [];
    const result = await worker(db, {
      sendTemplate: async () => {
        calls.push(1);
        return {providerMessageId: "wamid-x"};
      },
    }).dispatch(deliveryMessageId);
    assert.deepEqual(result, {kind: "waiting", reason: "superseded"});
    assert.equal(calls.length, 0);
    assert.equal(recordOf(db).attempts.length, 0);
  },
);

test("a disabled rule withholds the claim without dispatching", async () => {
  const db = new FakeFirestore(seedAutomation());
  const {deliveryMessageId} = await handoff(db);
  db.updateDoc("organizerFormAutomationRules/rule-1", {enabled: false});
  const calls: unknown[] = [];
  const result = await worker(db, {
    sendTemplate: async () => {
      calls.push(1);
      return {providerMessageId: "wamid-x"};
    },
  }).dispatch(deliveryMessageId);
  assert.deepEqual(result, {kind: "waiting", reason: "ruleEnded"});
  assert.equal(calls.length, 0);
});

test("a recipe revision bump stops the intent superseded", async () => {
  const db = new FakeFirestore(seedAutomation());
  const {deliveryMessageId} = await handoff(db);
  db.updateDoc("organizerCampaigns/recipe-1", {revision: 2});
  const result = await worker(db, {
    sendTemplate: async () => ({providerMessageId: "wamid-x"}),
  }).dispatch(deliveryMessageId);
  assert.deepEqual(result, {kind: "waiting", reason: "superseded"});
});

test("an opted-out contact suppresses at eligibility — no provider call",
  async () => {
    const db = new FakeFirestore(seedAutomation());
    const {deliveryMessageId} = await handoff(db);
    db.updateDoc(
      `organizerCommunicationPreferences/${
        organizerCommunicationPreferenceId("org-1", "u-1")}`,
      {whatsappPurposes: {
        marketing: {status: "optedOut", updatedAt: NOW},
      }},
    );
    const calls: unknown[] = [];
    const result = await worker(db, {
      sendTemplate: async () => {
        calls.push(1);
        return {providerMessageId: "wamid-x"};
      },
    }).dispatch(deliveryMessageId);
    assert.deepEqual(result, {kind: "suppressed", reason: "optedOut"});
    assert.equal(calls.length, 0);
  },
);

test("an ambiguous provider outcome parks unknown and never resends",
  async () => {
    const db = new FakeFirestore(seedAutomation());
    const {deliveryMessageId} = await handoff(db);
    let sends = 0;
    const provider = {
      sendTemplate: async () => {
        sends += 1;
        throw new MetaProviderError("timeout", null, null,
          "outcomeUnknown");
      },
    };
    const w = worker(db, provider);
    const first = await w.dispatch(deliveryMessageId);
    assert.deepEqual(first, {kind: "submitted",
      outcome: {kind: "unknown"}});
    assert.equal(recordOf(db).attempts[0].state.kind, "unknown");
    const second = await w.dispatch(deliveryMessageId);
    assert.deepEqual(second, {kind: "waiting", reason: "reconcile"});
    assert.equal(sends, 1, "an unknown outcome never resends");
  },
);

test("a moved event end defers the claim to the live due time",
  async () => {
    const attendedAt = NOW_MS - 3_600_000;
    const movedEnd = NOW_MS + 3_600_000;
    const db = new FakeFirestore(seedAutomation({
      "organizerContactEventEdges/edge-1": {
        organizerId: "org-1",
        eventId: "ev-1",
        contactId: "contact-1",
        checkedIn: true,
        cancelled: false,
        checkedInAt: ts(attendedAt),
      },
      "events/ev-1": {
        organizerId: "org-1",
        clubId: "org-1",
        status: "active",
        startTime: ts(attendedAt - 3_600_000),
        endTime: ts(movedEnd),
      },
    }));
    const event = automationEvent({
      sourceId: "edge-1",
      kind: "eventAttended",
      formId: null,
      eventId: "ev-1",
      occurredAt: admin.firestore.Timestamp.fromMillis(attendedAt),
      eventEndAt: admin.firestore.Timestamp.fromMillis(movedEnd),
    });
    const {deliveryMessageId, dueAtMillis} = await handoff(db, event);
    assert.equal(dueAtMillis, movedEnd);
    const calls: unknown[] = [];
    const result = await worker(db, {
      sendTemplate: async () => {
        calls.push(1);
        return {providerMessageId: "wamid-x"};
      },
    }).dispatch(deliveryMessageId);
    assert.deepEqual(result, {kind: "notDue", notBefore: movedEnd});
    assert.equal(calls.length, 0);
  },
);

test("a contact merge moves the send to the surviving identity",
  async () => {
    const db = new FakeFirestore(seedAutomation({
      "organizerContacts/contact-1": {
        organizerId: "org-1",
        linkedUid: null,
        phoneE164: E164,
        identityState: "merged",
        identityConfidence: "verified",
        mergedIntoContactId: "contact-2",
        deletedAt: null,
        hiddenAt: null,
      },
      "organizerContacts/contact-2": {
        organizerId: "org-1",
        linkedUid: "u-2",
        phoneE164: "+919800000010",
        identityState: "verified",
        identityConfidence: "verified",
        mergedIntoContactId: null,
        deletedAt: null,
        hiddenAt: null,
      },
      ["organizerCommunicationPreferences/" +
        organizerCommunicationPreferenceId("org-1", "u-2")]: {
        organizerId: "org-1",
        uid: "u-2",
        whatsappPurposes: {
          marketing: {
            status: "optedIn",
            endpointE164: "+919800000010",
            evidenceStatus: "complete",
            currentReceiptId: "rcpt-2",
            source: "manualImport",
            termsVersion: "v1",
            updatedAt: NOW,
          },
        },
        whatsapp: null,
        createdAt: NOW,
        updatedAt: NOW,
      },
    }));
    const {deliveryMessageId} = await handoff(db);
    const calls: Array<Record<string, unknown>> = [];
    const result = await worker(db, {
      sendTemplate: async (args: Record<string, unknown>) => {
        calls.push(args);
        return {providerMessageId: "wamid-merged"};
      },
    }).dispatch(deliveryMessageId);
    assert.deepEqual(result, {kind: "submitted",
      outcome: {kind: "accepted", providerMessageId: "wamid-merged"}});
    assert.equal(calls[0].toE164, "+919800000010");
    const dispatch = dispatchDoc(db);
    assert.equal(dispatch.endpointHash, hashEndpoint("+919800000010"));
  },
);

/** Fabricate the signed-ingress pair for one status callback. */
function queuePair(db: FakeFirestore,
  dispatch: AutomationWhatsappDispatchDocument, status: "delivered" |
    "failed" | "sent", at: number,
  overrides: Record<string, unknown> = {}): string {
  const providerEventId = `status:wamid-1:${status}:${at}`;
  const eventId = "omwe_" + createHash("sha256")
    .update(providerEventId).digest("hex").slice(0, 48);
  db.setDoc(`organizerMessagingWebhookEvents/${eventId}`, {
    provider: "metaCloudApi",
    providerEventId,
    organizerId: "org-1",
    connectionId: "conn-1",
    eventKind: "status",
    providerMessageId: "wamid-1",
    contextProviderMessageId: null,
    providerAccountId: "110000000000002",
    providerPhoneNumberId: "110000000000001",
    callbackData: whatsappStatusCorrelation(dispatch.attemptId,
      dispatch.payloadHash),
    inboundReply: null,
    deliveryStatus: status,
    endpointHash: whatsappEndpointHash(E164),
    isStop: false,
    hasReply: false,
    inboundBody: null,
    providerErrorCode: null,
    providerErrorEvidence: {kind: "none"},
    providerOccurredAt: ts(at),
    processingStatus: "pending",
    attemptCount: 0,
    createdAt: ts(at),
    processedAt: null,
    expiresAt: ts(at + 3_600_000),
    ...overrides,
  });
  db.setDoc(`organizerCampaignWebhookReceipts/${eventId}`, {
    provider: "metaCloudApi",
    providerEventId,
    organizerId: "org-1",
    connectionId: "conn-1",
    eventKind: "status",
    payloadHash: "f".repeat(64),
    createdAt: ts(at),
    expiresAt: ts(at + 3_600_000),
  });
  return eventId;
}

test("a delayed status receipt merges into the automation outbox",
  async () => {
    const db = new FakeFirestore(seedAutomation());
    const {deliveryMessageId} = await handoff(db);
    await worker(db,
      {sendTemplate: async () => ({providerMessageId: "wamid-1"})})
      .dispatch(deliveryMessageId);
    const dispatch = dispatchDoc(db);
    const eventId = queuePair(db, dispatch, "delivered", NOW_MS + 60_000);
    const store = new AutomationWhatsappDeliveryStore(
      db as unknown as Firestore, () => NOW_MS + 60_000);
    const result = await store.consumeQueued(eventId);
    assert.deepEqual(result, {kind: "recorded",
      messageId: dispatch.messageId, disposition: "applied"});
    assert.equal(recordOf(db).attempts[0].state.kind, "delivered");
  },
);

test("a failed receipt makes the automation send terminal — no redispatch",
  async () => {
    const db = new FakeFirestore(seedAutomation());
    const {deliveryMessageId} = await handoff(db);
    let sends = 0;
    await worker(db, {
      sendTemplate: async () => {
        sends += 1;
        return {providerMessageId: "wamid-1"};
      },
    }).dispatch(deliveryMessageId);
    const dispatch = dispatchDoc(db);
    const eventId = queuePair(db, dispatch, "failed", NOW_MS + 60_000, {
      providerErrorCode: 131016,
      providerErrorEvidence: {kind: "codes", codes: [131016]},
    });
    const store = new AutomationWhatsappDeliveryStore(
      db as unknown as Firestore, () => NOW_MS + 60_000);
    assert.equal((await store.consumeQueued(eventId)).kind, "recorded");
    assert.equal(recordOf(db).attempts[0].state.kind, "failed");
    const again = await worker(db, {
      sendTemplate: async () => {
        sends += 1;
        return {providerMessageId: "wamid-2"};
      },
    }, () => NOW_MS + 400_000).dispatch(deliveryMessageId);
    assert.deepEqual(again, {kind: "terminal", reason: "providerFailed"});
    assert.equal(sends, 1, "a confirmed failure never resends");
  },
);

test("the moments seam journals the worker outcome with delivery linkage",
  async () => {
    const db = new FakeFirestore(seedAutomation());
    const {deliveryMessageId, momentRunId} = await handoff(db);
    const run = runFromDocument(
      db.getDoc(`organizerMomentRuns/${momentRunId}`)!);
    const momentDoc = db.getDoc(
      `organizerMoments/${run.momentId}`)!;
    const outcome = await deliverAutomationMessage({
      db: db as unknown as Firestore,
      provider: {
        sendTemplate: async () => ({providerMessageId: "wamid-1"}),
      },
      credentials: {accessBound: async () => "test-token"},
      moment: {
        momentId: run.momentId,
        scope: {kind: "organizer", organizerId: "org-1"},
        name: "Welcome",
        initiation: {
          kind: "triggered", triggerKind: "formAutomation",
          functionId: null,
          automation: {
            ruleId: "rule-1", ruleRevision: 1, actionId: "welcome",
            recipeCampaignId: "recipe-1", recipeRevision: 1,
          },
        },
        sense: "individual",
        audience: {kind: "subject"},
        action: {
          kind: "sendTemplate", connectionId: "conn-1",
          templateId: "tpl-1", variables: {},
        },
        status: "armed",
        approval: {approvedByUid: "host", approvedAtMillis: NOW_MS},
        origin: "formAutomation",
        revision: (momentDoc.revision as number) ?? 1,
      },
      run,
      recipient: {
        recipientKey: "contact:contact-1",
        endpoint: {kind: "phone", e164: E164},
        householdId: null,
      },
      action: {
        kind: "sendTemplate", connectionId: "conn-1",
        templateId: "tpl-1", variables: {},
      },
      now: () => NOW_MS,
    });
    assert.deepEqual(outcome, {
      kind: "sent", deliveryMessageId, deliveryState: "accepted"});
  },
);

test("companion sync pauses on disable and re-plans skipped runs on " +
  "re-enable", async () => {
  const db = new FakeFirestore(seedAutomation());
  const momentId = automationCompanionMomentId("rule-1", "welcome");
  // First sync materializes the companion for the enabled rule.
  await db.runTransaction(async (tx) => {
    await syncAutomationCompanionMoments({
      tx: tx as unknown as Transaction,
      db: db as unknown as Firestore,
      ruleId: "rule-1",
      rule: rule(),
      actorUid: "host",
      nowMillis: NOW_MS,
    });
  });
  let moment = db.getDoc(`organizerMoments/${momentId}`)!;
  assert.equal(moment.status, "armed");
  // Disable: the companion pauses.
  await db.runTransaction(async (tx) => {
    await syncAutomationCompanionMoments({
      tx: tx as unknown as Transaction,
      db: db as unknown as Firestore,
      ruleId: "rule-1",
      rule: {...rule(), enabled: false, revision: 2} as
          unknown as OrganizerFormAutomationRuleDocument,
      actorUid: "host",
      nowMillis: NOW_MS + 1_000,
    });
  });
  moment = db.getDoc(`organizerMoments/${momentId}`)!;
  assert.equal(moment.status, "paused");
  // A run skipped only because the companion was paused re-plans when
  // the rule re-enables at the same revision the run pinned — but a
  // rule edit bumps the revision, leaving stale runs skipped.
  const runId = automationMomentRunId(momentId, RUN_ID);
  db.setDoc(`organizerMomentRuns/${runId}`, {
    runId,
    momentId,
    dueAtMillis: NOW_MS,
    anchorRevision: 1,
    status: "skipped",
    reason: "skip:momentNotArmed",
    expiresAtMillis: NOW_MS + 3_600_000,
    subjectId: "contact-1",
    automation: {
      ruleId: "rule-1", ruleRevision: 3, actionId: "welcome",
      eventKind: "submitted", sourceId: "resp-1",
      occurredAtMillis: NOW_MS, dueAtMillis: NOW_MS,
      contactId: "contact-1", deliveryMessageId: "outbox:" + "0".repeat(64),
    },
  });
  await db.runTransaction(async (tx) => {
    await syncAutomationCompanionMoments({
      tx: tx as unknown as Transaction,
      db: db as unknown as Firestore,
      ruleId: "rule-1",
      rule: {...rule(), enabled: true, revision: 3} as
          unknown as OrganizerFormAutomationRuleDocument,
      actorUid: "host",
      nowMillis: NOW_MS + 2_000,
    });
  });
  moment = db.getDoc(`organizerMoments/${momentId}`)!;
  assert.equal(moment.status, "armed");
  const run = db.getDoc(`organizerMomentRuns/${runId}`)!;
  assert.equal(run.status, "planned",
    "re-enable re-arms a run withheld only by the pause");
  assert.equal(run.reason, null);
},
);
