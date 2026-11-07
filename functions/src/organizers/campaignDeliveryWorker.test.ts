import assert from "node:assert/strict";
import test from "node:test";
import {createHash} from "node:crypto";
import * as admin from "firebase-admin";
import type {Firestore} from "firebase-admin/firestore";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {
  CampaignDeliveryWorker, campaignMessageIdFor,
  CAMPAIGN_WHATSAPP_DISPATCHES,
} from "./campaignDeliveryWorker";
import {CampaignWhatsappDeliveryStore} from
  "./campaignWhatsappDeliveryStore";
import type {CampaignDeliveryMessageDocument}
  from "../shared/generated/campaignDeliveryMessageDocument";
import type {CampaignWhatsappDispatchDocument}
  from "../shared/generated/campaignWhatsappDispatchDocument";
import type {OrganizerCampaignRecipientDocument}
  from "../shared/generated/firestoreAdminTypes";
import {whatsappStatusCorrelation} from
  "../eventSuccess/operations/whatsappDeliveryProtocol";
import {whatsappEndpointHash} from
  "../eventSuccess/operations/whatsappReplyProtocol";
import {MetaProviderError} from "./organizerWhatsappProvider";
import {dispatchCampaign, dispatchScheduledOrganizerCampaignsHandler} from
  "./organizerCampaignDispatcher";
import {
  hashCanonical, hashEndpoint, organizerContactChannelStateId,
} from "./organizerCampaignModel";
import {organizerCommunicationPreferenceId} from
  "../shared/organizerCommunicationPreferences";

const NOW_MS = 1_800_000_000_000;
const NOW = admin.firestore.Timestamp.fromMillis(NOW_MS);
const E164 = "+919800000009";
const VARIABLES = {"1": "Catch"};

const ts = (millis: number) => ({_seconds: Math.floor(millis / 1000),
  _nanoseconds: (millis % 1000) * 1_000_000});

function seedCrm(): Record<string, Record<string, unknown>> {
  return {
    "organizerCampaigns/camp-1": {
      organizerId: "org-1",
      status: "sending",
      connectionId: "conn-1",
      templateId: "tpl-1",
      eventId: null,
      templateVariables: VARIABLES,
      dispatchedAt: NOW,
      deliveryCounts: {pending: 1, accepted: 0, sent: 0, delivered: 0,
        read: 0, failed: 0, suppressed: 0, replied: 0, optedOut: 0},
      revision: 2,
      createdAt: NOW,
      updatedAt: NOW,
    },
    "organizerCampaignRecipients/rec-1": {
      organizerId: "org-1",
      campaignId: "camp-1",
      contactId: "contact-1",
      channel: "whatsapp",
      eligibility: "eligible",
      exclusionReason: null,
      endpointE164: E164,
      endpointHash: hashEndpoint(E164),
      renderedVariablesHash: hashCanonical(VARIABLES),
      inviteLinkId: null,
      status: "pending",
      providerMessageId: null,
      attemptCount: 0,
      retryEligible: true,
      leaseOwner: null,
      leaseExpiresAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
    "organizerContacts/contact-1": {
      organizerId: "org-1",
      phoneE164: E164,
      identityState: "verified",
      identityConfidence: "verified",
      linkedUid: "u-1",
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
  };
}

function worker(db: FakeFirestore, provider: unknown,
  clock: () => number = () => NOW_MS) {
  return new CampaignDeliveryWorker(
    db as unknown as Firestore,
    provider as never,
    {accessBound: async () => "test-token"},
    clock,
  );
}

function campaignOf(db: FakeFirestore) {
  return db.getDoc("organizerCampaigns/camp-1") as Record<string, unknown>;
}

function recipientOf(db: FakeFirestore) {
  return db.getDoc("organizerCampaignRecipients/rec-1") as unknown as
    OrganizerCampaignRecipientDocument;
}

function recordOf(db: FakeFirestore): CampaignDeliveryMessageDocument {
  const entries = [...db.docs.entries()]
    .filter(([path]) => path.startsWith("campaignDeliveryMessages/"));
  assert.equal(entries.length, 1);
  return entries[0][1] as unknown as CampaignDeliveryMessageDocument;
}

async function enqueueAndDispatch(
  db: FakeFirestore, provider: unknown,
  clock: () => number = () => NOW_MS,
) {
  const w = worker(db, provider, clock);
  const mid = await w.enqueueRecipient({
    campaign: campaignOf(db) as never,
    campaignId: "camp-1",
    recipientId: "rec-1",
  });
  assert.equal(mid, campaignMessageIdFor("org-1", "camp-1", "rec-1"));
  return {mid, result: await w.dispatch(mid)};
}

test("dispatch commits claim evidence atomically and mirrors the accept",
  async () => {
    const db = new FakeFirestore(seedCrm());
    const {result} = await enqueueAndDispatch(db,
      {sendTemplate: async () => ({providerMessageId: "wamid-1"})});
    assert.deepEqual(result, {kind: "submitted",
      outcome: {kind: "accepted", providerMessageId: "wamid-1"}});
    const recipient = recipientOf(db);
    assert.equal(recipient.status, "accepted");
    assert.equal(recipient.providerMessageId, "wamid-1");
    assert.equal(recipient.attemptCount, 1);
    assert.equal(recipient.leaseOwner, null);
    // Claim-time dispatch evidence exists for webhook correlation.
    const evidence = [...db.docs.entries()]
      .filter(([path]) => path.startsWith(CAMPAIGN_WHATSAPP_DISPATCHES + "/"));
    assert.equal(evidence.length, 1);
    const dispatch = evidence[0][1] as unknown as
      CampaignWhatsappDispatchDocument;
    assert.equal(dispatch.endpointHash, hashEndpoint(E164));
    assert.equal(dispatch.senderId, "conn-1");
    // Attempt recorded accepted in the durable record.
    assert.equal(recordOf(db).attempts[0].state.kind, "accepted");
    // Campaign counters and the CRM channel-state frequency record moved.
    const counts = campaignOf(db).deliveryCounts as Record<string, number>;
    assert.equal(counts.pending, 0);
    assert.equal(counts.accepted, 1);
    const stateId = organizerContactChannelStateId("org-1", "contact-1");
    const state = db.getDoc(`organizerContactChannelStates/${stateId}`) as
      Record<string, unknown>;
    assert.equal(state.campaignAcceptedCount, 1);
  },
);

test("an opted-out preference suppresses at claim time with the reason",
  async () => {
    const db = new FakeFirestore(seedCrm());
    db.updateDoc(
      `organizerCommunicationPreferences/${
        organizerCommunicationPreferenceId("org-1", "u-1")}`,
      {whatsappPurposes: {
        marketing: {status: "optedOut", updatedAt: NOW},
      }},
    );
    const calls: unknown[] = [];
    const {result} = await enqueueAndDispatch(db, {
      sendTemplate: async (args: unknown) => {
        calls.push(args);
        return {providerMessageId: "wamid-x"};
      },
    });
    assert.deepEqual(result, {kind: "suppressed", reason: "optedOut"});
    assert.equal(calls.length, 0);
    const recipient = recipientOf(db);
    assert.equal(recipient.status, "suppressed");
    assert.equal(recipient.exclusionReason, "optedOut");
    const counts = campaignOf(db).deliveryCounts as Record<string, number>;
    assert.equal(counts.pending, 0);
    assert.equal(counts.suppressed, 1);
  },
);

test("an ambiguous provider error parks the attempt as unknown — never resends",
  async () => {
    const db = new FakeFirestore(seedCrm());
    let sends = 0;
    const provider = {
      sendTemplate: async () => {
        sends += 1;
        throw new MetaProviderError("timeout", null, null,
          "outcomeUnknown");
      },
    };
    const {mid, result} = await enqueueAndDispatch(db, provider);
    assert.deepEqual(result, {kind: "submitted",
      outcome: {kind: "unknown"}});
    const attempt = recordOf(db).attempts[0];
    assert.equal(attempt.state.kind, "unknown");
    assert.equal(attempt.state.reason, "workerInterrupted");
    const recipient = recipientOf(db);
    // The row stays `sending` under the attempt's lease — awaiting evidence.
    assert.equal(recipient.status, "sending");
    assert.equal(recipient.leaseOwner, attempt.attemptId);
    assert.equal(campaignOf(db).deliveryCounts &&
      (campaignOf(db).deliveryCounts as Record<string, number>).accepted, 0);
    // Re-dispatch reconciles instead of retrying — the old dispatcher would
    // have reclaimed the expired lease and sent a duplicate.
    const again = await worker(db, provider).dispatch(mid);
    assert.deepEqual(again, {kind: "waiting", reason: "reconcile"});
    assert.equal(sends, 1, "no duplicate send while outcome is unknown");
  },
);

test("a proven-unsent request past its permit redispatches once",
  async () => {
    const db = new FakeFirestore(seedCrm());
    let clock = NOW_MS;
    let sends = 0;
    const provider = {
      sendTemplate: async () => {
        sends += 1;
        if (sends === 1) {
          // The claim already committed; the clock running past the permit
          // window inside the stub is the crashed/late-error boundary —
          // but the provider proves the request never left.
          clock += 10 * 60 * 1000;
          throw new MetaProviderError("not sent", 131000, 500,
            "requestNotSent");
        }
        return {providerMessageId: "wamid-retry"};
      },
    };
    const w = worker(db, provider, () => clock);
    const mid = await w.enqueueRecipient({
      campaign: campaignOf(db) as never,
      campaignId: "camp-1",
      recipientId: "rec-1",
    });
    const first = await w.dispatch(mid);
    assert.deepEqual(first, {kind: "withheld", reason: "permitExpired"});
    const closed = recordOf(db).attempts[0];
    assert.equal(closed.state.kind, "notDispatched");
    assert.equal(closed.state.reason, "permitExpired");
    clock += 120_000; // past the retry floor
    const second = await w.dispatch(mid);
    const rec = recordOf(db);
    assert.equal(rec.attempts.length, 2);
    assert.equal(rec.attempts[1].state.kind, "accepted");
    assert.deepEqual(second, {kind: "submitted",
      outcome: {kind: "accepted", providerMessageId: "wamid-retry"}});
    assert.equal(recipientOf(db).providerMessageId, "wamid-retry");
    assert.equal(sends, 2);
  },
);

/** Fabricate the signed-ingress pair for one status callback. */
function queuePair(db: FakeFirestore,
  dispatch: CampaignWhatsappDispatchDocument, status: "delivered" |
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

function dispatchDoc(db: FakeFirestore): CampaignWhatsappDispatchDocument {
  const entries = [...db.docs.entries()]
    .filter(([path]) => path.startsWith(CAMPAIGN_WHATSAPP_DISPATCHES + "/"));
  assert.equal(entries.length, 1);
  return entries[0][1] as unknown as CampaignWhatsappDispatchDocument;
}

test("a delayed WhatsApp status receipt merges into the campaign outbox",
  async () => {
    const db = new FakeFirestore(seedCrm());
    await enqueueAndDispatch(db,
      {sendTemplate: async () => ({providerMessageId: "wamid-1"})});
    const dispatch = dispatchDoc(db);
    const eventId = queuePair(db, dispatch, "delivered", NOW_MS + 60_000);
    const store = new CampaignWhatsappDeliveryStore(
      db as unknown as Firestore, () => NOW_MS + 60_000);
    const result = await store.consumeQueued(eventId);
    assert.deepEqual(result, {kind: "recorded",
      messageId: dispatch.messageId, disposition: "applied"});
    const attempt = recordOf(db).attempts[0];
    assert.equal(attempt.state.kind, "delivered");
    assert.equal(attempt.state.providerMessageId, "wamid-1");
  },
);

test("status evidence for a foreign attempt or endpoint is rejected",
  async () => {
    const db = new FakeFirestore(seedCrm());
    await enqueueAndDispatch(db,
      {sendTemplate: async () => ({providerMessageId: "wamid-1"})});
    const dispatch = dispatchDoc(db);
    const store = new CampaignWhatsappDeliveryStore(
      db as unknown as Firestore, () => NOW_MS + 60_000);
    const wrongEndpoint = queuePair(db, dispatch, "delivered",
      NOW_MS + 60_000,
      {endpointHash: whatsappEndpointHash("+911234567890")});
    assert.equal((await store.consumeQueued(wrongEndpoint)).kind,
      "rejected");
    const wrongCallback = queuePair(db, dispatch, "delivered",
      NOW_MS + 60_000, {callbackData: "ce-wa-status1." + "0".repeat(64) +
        "." + "1".repeat(64)});
    assert.equal((await store.consumeQueued(wrongCallback)).kind,
      "rejected");
    assert.equal(recordOf(db).attempts[0].state.kind, "accepted");
  },
);

test("a failed status receipt mirrors the recipient row on recovery",
  async () => {
    const db = new FakeFirestore(seedCrm());
    // The crash window: claim commits `sending`, submit outcome is unknown.
    let sends = 0;
    await enqueueAndDispatch(db, {
      sendTemplate: async () => {
        sends += 1;
        throw new MetaProviderError("timeout", null, null,
          "outcomeUnknown");
      },
    });
    const dispatch = dispatchDoc(db);
    const eventId = queuePair(db, dispatch, "failed", NOW_MS + 60_000, {
      providerErrorCode: 131016,
      providerErrorEvidence: {kind: "codes", codes: [131016]},
    });
    const store = new CampaignWhatsappDeliveryStore(
      db as unknown as Firestore, () => NOW_MS + 60_000);
    assert.equal((await store.consumeQueued(eventId)).kind, "recorded");
    assert.equal(recordOf(db).attempts[0].state.kind, "failed");
    // Campaign rows are terminal on any confirmed failure — the core's
    // technical-retry surface never reaches the provider a second time.
    const w = worker(db, {sendTemplate: async () => {
      sends += 1;
      return {providerMessageId: "wamid-2"};
    }}, () => NOW_MS + 60_000);
    const again = await w.dispatch(dispatch.messageId);
    assert.deepEqual(again, {kind: "terminal", reason: "providerFailed"});
    const recipient = recipientOf(db);
    assert.equal(recipient.status, "failed");
    assert.equal(recipient.providerErrorCategory, "provider");
    const counts = campaignOf(db).deliveryCounts as Record<string, number>;
    assert.equal(counts.pending, 0);
    assert.equal(counts.failed, 1);
    // Even past the retry floor the terminal row withholds the claim.
    const later = worker(db, {sendTemplate: async () => {
      sends += 1;
      return {providerMessageId: "wamid-3"};
    }}, () => NOW_MS + 400_000);
    const retried = await later.dispatch(dispatch.messageId);
    assert.deepEqual(retried, {kind: "terminal", reason: "providerFailed"});
    assert.equal(sends, 1, "terminal campaign rows never resend");
  },
);

test("a disputed older attempt keeps latest unknown held beyond intent expiry",
  async () => {
    const db = new FakeFirestore(seedCrm());
    let now = NOW_MS;
    let sends = 0;
    const w = worker(db, {sendTemplate: async () => {
      sends++;
      if (sends === 1) {
        now += 180_000;
        throw new MetaProviderError("expired before send", null, null,
          "requestNotSent");
      }
      throw new MetaProviderError("timeout", null, null, "outcomeUnknown");
    }}, () => now);
    const mid = await w.enqueueRecipient({campaign: campaignOf(db) as never,
      campaignId: "camp-1", recipientId: "rec-1"});
    assert.deepEqual(await w.dispatch(mid),
      {kind: "withheld", reason: "permitExpired"});
    const firstDispatch = dispatchDoc(db);
    assert.equal(recordOf(db).attempts[0].state.kind, "notDispatched");
    now += 180_000;
    assert.deepEqual(await w.dispatch(mid),
      {kind: "submitted", outcome: {kind: "unknown"}});
    const second = recordOf(db).attempts[1];
    assert.equal(second.state.kind, "unknown");
    assert.equal(recipientOf(db).leaseOwner, second.attemptId);
    // Contradictory but correctly correlated provider evidence for the older
    // proven-unsent attempt. The real ingress adapter sets the conflict flag.
    const eventId = queuePair(db, firstDispatch, "delivered", now);
    const store = new CampaignWhatsappDeliveryStore(
      db as unknown as Firestore, () => now);
    assert.deepEqual(await store.consumeQueued(eventId), {kind: "recorded",
      messageId: mid, disposition: "conflictingEvidence"});
    assert.equal(recordOf(db).deliveryConflict, true);
    assert.equal(recordOf(db).attempts[0].state.kind, "delivered");
    for (const elapsed of [60_000, 25 * 3_600_000, 48 * 3_600_000]) {
      now = NOW_MS + elapsed + 360_000;
      assert.deepEqual(await w.dispatch(mid),
        {kind: "waiting", reason: "conflicted"});
      assert.equal(recipientOf(db).status, "sending");
      assert.equal(recipientOf(db).leaseOwner, second.attemptId);
      assert.equal(recordOf(db).attempts[1].state.kind, "unknown");
    }
    assert.equal(sends, 2, "discovery must not authorize another send");
    // Compose that actual disputed outbox with bounded scheduler discovery.
    // The first recovery page contains99 held leases plus this conflict.
    db.updateDoc("organizerCampaigns/camp-1", {
      status: "blocked", leaseOwner: null, leaseExpiresAt: null,
    });
    for (let i = 0; i < 99; i++) {
      db.setDoc(`organizerCampaignRecipients/rec-${String(i).padStart(3, "0")}`,
        {organizerId: "org-1", campaignId: "camp-1", status: "sending",
          leaseOwner: "held", leaseExpiresAt:
            admin.firestore.Timestamp.fromMillis(now + 600_000)});
    }
    db.setDoc("organizerCampaignRecipients/rec-z", {
      organizerId: "org-1", campaignId: "camp-1", status: "sending",
      leaseOwner: "legacy", leaseExpiresAt: NOW,
    });
    const deps = {firestore: () => db as unknown as Firestore,
      runtimeProjectId: () => "demo-catch-rules",
      now: () => admin.firestore.Timestamp.fromMillis(now),
      checkRateLimit: async () => {},
      tokenStore: {accessBound: async () => "test-token"},
      provider: () => ({sendTemplate: async () => {
        sends++;
        throw new Error("Recovery must never send");
      }})};
    await dispatchScheduledOrganizerCampaignsHandler(deps);
    assert.equal(db.getDoc("organizerCampaignRecipients/rec-z")?.status,
      "sending");
    await dispatchScheduledOrganizerCampaignsHandler(deps);
    assert.equal(db.getDoc("organizerCampaignRecipients/rec-z")?.status,
      "failed", "later legacy recovery is discovered without resending");
    assert.equal(recipientOf(db).status, "sending");
    assert.equal(recordOf(db).attempts[1].state.kind, "unknown");
    assert.equal(sends, 2);
  });

test("ordinary credential withholding expires without permanent starvation",
  async () => {
    const db = new FakeFirestore(seedCrm());
    let now = NOW_MS;
    let sends = 0;
    const w = new CampaignDeliveryWorker(db as unknown as Firestore,
      {sendTemplate: async () => {
        sends++;
        return {providerMessageId: "must-not-send"};
      }}, {accessBound: async () => {
        throw new Error("unavailable");
      }},
      () => now);
    const mid = await w.enqueueRecipient({campaign: campaignOf(db) as never,
      campaignId: "camp-1", recipientId: "rec-1"});
    assert.deepEqual(await w.dispatch(mid),
      {kind: "withheld", reason: "resourceUnavailable"});
    now += 24 * 3_600_000;
    assert.deepEqual(await w.dispatch(mid),
      {kind: "waiting", reason: "expired"});
    assert.equal(recipientOf(db).status, "failed");
    assert.equal(sends, 0);
  });

for (const replace of [false, true]) {
  test(`paused campaign executor cannot renew or wrap after ${
    replace ? "owner replacement" : "lease expiry"}`, async () => {
    const db = new FakeFirestore(seedCrm());
    db.updateDoc("organizerCampaigns/camp-1", {
      status: "blocked", leaseOwner: null, leaseExpiresAt: null,
    });
    db.setDoc("organizerCampaignRecipients/rec-2", {...recipientOf(db)});
    let now = NOW_MS;
    let started!: () => void;
    const entered = new Promise<void>((resolve) => {
      started = resolve;
    });
    let resume!: () => void;
    const held = new Promise<void>((resolve) => {
      resume = resolve;
    });
    let sends = 0;
    const run = dispatchCampaign({db: db as unknown as Firestore,
      organizerId: "org-1", campaignId: "camp-1", expectedRevision: null,
      deps: {firestore: () => db as unknown as Firestore,
        runtimeProjectId: () => "demo-catch-rules",
        checkRateLimit: async () => {},
        tokenStore: {accessBound: async () => "test-token"},
        now: () => admin.firestore.Timestamp.fromMillis(now),
        provider: () => ({sendTemplate: async () => {
          sends++;
          started();
          await held;
          return {providerMessageId: "wamid-paused"};
        }})}});
    await entered;
    now += 180_000;
    if (replace) {
      db.updateDoc("organizerCampaigns/camp-1", {
        leaseOwner: "replacement-owner",
        leaseExpiresAt: admin.firestore.Timestamp.fromMillis(now + 100_000),
      });
    }
    const before = campaignOf(db).leaseExpiresAt;
    resume();
    await assert.rejects(run, /lease is no longer current/);
    assert.equal(campaignOf(db).leaseExpiresAt, before);
    assert.equal(campaignOf(db).status, "sending");
    if (replace) assert.equal(campaignOf(db).leaseOwner, "replacement-owner");
    assert.equal(recipientOf(db).status, "accepted",
      "receipt truth is preserved despite discovery lease loss");
    assert.equal(db.getDoc("organizerCampaignRecipients/rec-2")?.status,
      "pending");
    const cursor = [...db.docs.entries()].find(([key, value]) =>
      key.startsWith("organizerCampaignDiscoveryCursors/") &&
      value.queueKind === "pendingRecipients");
    assert.equal(cursor?.[1].cursor, "rec-2",
      "interrupted page keeps its checkpoint instead of wrapping");
    assert.equal(sends, 1);
  });
}
