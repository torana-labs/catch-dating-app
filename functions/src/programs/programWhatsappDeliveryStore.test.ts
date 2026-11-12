import {seedWorkspaceFieldAssertions} from
  "../workspaces/workspaceFieldFixture";
import assert from "node:assert/strict";
import test from "node:test";
import {createHash} from "node:crypto";
import type {Firestore} from "firebase-admin/firestore";
import {FakeFirestore} from "../shared/testing/programFirestore";
import type {AnchorFacts, MomentAction, MomentDefinition,
  RunRecord} from "../moments/momentModel";
import type {ResolvedRecipient} from "../moments/momentDocuments";
import type {ProgramDeliveryMessageDocument}
  from "../shared/generated/programDeliveryMessageDocument";
import type {ProgramWhatsappDispatchDocument}
  from "../shared/generated/programWhatsappDispatchDocument";
import {whatsappStatusCorrelation} from
  "../eventSuccess/operations/whatsappDeliveryProtocol";
import {whatsappEndpointHash} from
  "../eventSuccess/operations/whatsappReplyProtocol";
import {deliverProgramReminder} from "./programReminderDelivery";
import {PROGRAM_WHATSAPP_DISPATCHES} from "./programDeliveryWorker";
import {ProgramWhatsappDeliveryStore} from "./programWhatsappDeliveryStore";

const NOW = 1_000_000;

const moment: MomentDefinition = {
  momentId: "m_reminder",
  scope: {kind: "program", programId: "prog"},
  name: "Travel window opens soon",
  initiation: {kind: "scheduled", atMillis: NOW},
  sense: "audience",
  audience: {kind: "households", rsvpPendingOnly: false},
  action: {kind: "sendTemplate", connectionId: "conn1",
    templateId: "tpl1", variables: {}},
  status: "armed",
  approval: {approvedByUid: "mgr", approvedAtMillis: 1},
  origin: "organizer",
  revision: 3,
};

const run: RunRecord = {
  runId: "m_reminder_run_1",
  momentId: "m_reminder",
  dueAtMillis: NOW,
  anchorRevision: 1,
  status: "planned",
};

const facts: AnchorFacts = {
  scope: {startsAtMillis: NOW + 90 * 86_400_000, endsAtMillis: null,
    rsvpDeadlineAtMillis: null, revision: 1, messagingEnabled: true,
    cancelled: false, organizerId: "org-1"},
  functions: {},
  travelLegs: {},
};

const recipient: ResolvedRecipient = {
  recipientKey: "household:hh1",
  endpoint: {kind: "phone", e164: "+911234567001"},
  householdId: "hh1",
};

const action = moment.action as Extract<MomentAction,
  {kind: "sendTemplate"}>;

const ts = (millis: number) => ({_seconds: Math.floor(millis / 1000),
  _nanoseconds: (millis % 1000) * 1_000_000});

function seedProgram(db: FakeFirestore): void {
  db.setDoc("organizerPrograms/prog", {
    organizerId: "org-1", kind: "wedding", title: "Mehta × Rao",
    status: "active", revision: 2,
  });
  db.setDoc("organizerMoments/m_reminder", {...moment});
  db.setDoc("organizerSenderConnections/conn1", {
    organizerId: "org-1", status: "active", phoneNumberId: "2002",
    wabaId: "1001", secretVersionResource: "sec/1", revision: 2,
  });
  db.setDoc("organizerMessageTemplates/tpl1", {
    organizerId: "org-1", status: "APPROVED", name: "reminder",
    language: "en", parameterBindings: [],
  });
  db.setDoc("programHouseholds/hh1", {
    programId: "prog", organizerId: "org-1", label: "Sharma",
    primaryPhoneE164: "+911234567001", memberGuestIds: ["g1"],
    messagingConsent: {granted: true}, revision: 4,
  });
  const acquired = seedWorkspaceFieldAssertions(Object.fromEntries(db.docs));
  for (const [path, doc] of Object.entries(acquired)) db.setDoc(path, doc);
}

async function deliver(db: FakeFirestore) {
  const outcome = await deliverProgramReminder({
    db: db as unknown as Firestore,
    provider: {sendTemplate: async () =>
      ({providerMessageId: "wamid-1"})},
    credentials: {accessBound: async () => "token-1"},
    moment, run, facts, recipient, action, now: () => NOW,
  });
  assert.equal(outcome.kind, "sent");
  const [path, dispatchData] = [...db.docs.entries()].find(([p]) =>
    p.startsWith(PROGRAM_WHATSAPP_DISPATCHES + "/"))!;
  assert.ok(path, "claim must commit the dispatch evidence");
  return dispatchData as unknown as ProgramWhatsappDispatchDocument;
}

function record(db: FakeFirestore): ProgramDeliveryMessageDocument {
  const entries = [...db.docs.entries()]
    .filter(([path]) => path.startsWith("deliveryMessages/"));
  assert.equal(entries.length, 1);
  return entries[0][1] as unknown as ProgramDeliveryMessageDocument;
}

/** Fabricate the signed-ingress pair for one status callback. */
function queuePair(db: FakeFirestore,
  dispatch: ProgramWhatsappDispatchDocument, status: "delivered" |
    "failed" | "sent", at: number,
  overrides: Record<string, unknown> = {}): string {
  const providerEventId = `status:wamid-1:${status}:${at}`;
  const eventId = "omwe_" + createHash("sha256")
    .update(providerEventId).digest("hex").slice(0, 48);
  db.setDoc(`organizerMessagingWebhookEvents/${eventId}`, {
    provider: "metaCloudApi",
    providerEventId,
    organizerId: "org-1",
    connectionId: "conn1",
    eventKind: "status",
    providerMessageId: "wamid-1",
    contextProviderMessageId: null,
    providerAccountId: "1001",
    providerPhoneNumberId: "2002",
    callbackData: whatsappStatusCorrelation(dispatch.attemptId,
      dispatch.payloadHash),
    inboundReply: null,
    deliveryStatus: status,
    endpointHash: whatsappEndpointHash("+911234567001"),
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
    connectionId: "conn1",
    eventKind: "status",
    payloadHash: "f".repeat(64),
    createdAt: ts(at),
    expiresAt: ts(at + 3_600_000),
  });
  return eventId;
}

test("a delayed WhatsApp status receipt merges into the program outbox",
  async () => {
    const db = new FakeFirestore({});
    seedProgram(db);
    const dispatch = await deliver(db);
    const eventId = queuePair(db, dispatch, "delivered", NOW + 60_000);
    const store = new ProgramWhatsappDeliveryStore(
      db as unknown as Firestore, () => NOW + 60_000);
    const result = await store.consumeQueued(eventId);
    assert.deepEqual(result, {kind: "recorded",
      messageId: dispatch.messageId, disposition: "applied"});
    const attempt = record(db).attempts[0];
    assert.equal(attempt.state.kind, "delivered");
    assert.equal(attempt.state.providerMessageId, "wamid-1");
  });

test("mismatched endpoint evidence is rejected and the attempt stays",
  async () => {
    const db = new FakeFirestore({});
    seedProgram(db);
    const dispatch = await deliver(db);
    const eventId = queuePair(db, dispatch, "delivered", NOW + 60_000,
      {endpointHash: whatsappEndpointHash("+911234567009")});
    const store = new ProgramWhatsappDeliveryStore(
      db as unknown as Firestore, () => NOW + 60_000);
    assert.equal((await store.consumeQueued(eventId)).kind, "rejected");
    assert.equal(record(db).attempts[0].state.kind, "accepted");
  });

test("conflicting late evidence fences the record instead of rewriting",
  async () => {
    const db = new FakeFirestore({});
    seedProgram(db);
    const dispatch = await deliver(db);
    const store = new ProgramWhatsappDeliveryStore(
      db as unknown as Firestore, () => NOW + 120_000);
    const delivered = queuePair(db, dispatch, "delivered", NOW + 60_000);
    assert.equal((await store.consumeQueued(delivered)).kind, "recorded");
    // A contradictory failure for the same provider message must not
    // silently downgrade delivered truth.
    const failed = queuePair(db, dispatch, "failed", NOW + 90_000,
      {providerErrorCode: 131016,
        providerErrorEvidence: {kind: "codes", codes: [131016]}});
    const result = await store.consumeQueued(failed);
    assert.deepEqual(result, {kind: "recorded",
      messageId: dispatch.messageId, disposition: "conflictingEvidence"});
    assert.equal(record(db).deliveryConflict, true);
  });
