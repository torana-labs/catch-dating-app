import assert from "node:assert/strict";
import test from "node:test";
import {createHash} from "node:crypto";
import * as admin from "firebase-admin";
import type {Firestore} from "firebase-admin/firestore";
import {FakeFirestore} from "../../shared/testing/programFirestore";
import {now} from "../../shared/testing/programFixtures";
import {contractValidator} from "../../shared/contractTestValidators";
import {MetaProviderError} from "../../organizers/organizerWhatsappProvider";
import {whatsappStatusCorrelation} from
  "../../eventSuccess/operations/whatsappDeliveryProtocol";
import type {ProgramWhatsappDispatchDocument} from
  "../../shared/generated/firestoreAdminTypes";
import {ProgramWhatsappDeliveryStore} from "../programWhatsappDeliveryStore";
import {routeProgramWhatsappInbound} from "./inbound";
import {
  sendProgramServiceReply,
  sendProgramWhatsappText,
  type ProgramReplyDeps,
} from "./replies";
import {guestHash, guestPhone, inboundEvent, whatsappSeed} from
  "./testFixtures";

const validateDispatch = contractValidator("ProgramWhatsappDispatchDocument");
const validateOperation =
  contractValidator("ProgramWhatsappReplyOperationDocument");
const threadPath = "programWhatsappThreads/program-1_household-1";
const code = (expected: string) => (err: unknown) =>
  (err as {code?: string}).code === expected;
const ts = (millis: number) => ({_seconds: Math.floor(millis / 1000),
  _nanoseconds: (millis % 1000) * 1_000_000});

async function setup(sendText?: ProgramReplyDeps["provider"]) {
  const db = new FakeFirestore(whatsappSeed());
  await routeProgramWhatsappInbound(db as unknown as Firestore,
    inboundEvent({}), now);
  const sent: {toE164: string; body: string; callbackData?: string}[] = [];
  let clock = now.toMillis() + 60_000;
  const deps: ProgramReplyDeps = {
    firestore: () => db as unknown as Firestore,
    now: () => admin.firestore.Timestamp.fromMillis(clock),
    provider: sendText ?? (() => ({sendText: async (params) => {
      sent.push(params);
      return {providerMessageId: `wamid.out${sent.length}`};
    }})),
    tokenStore: {accessBound: async () => "token-1"},
  };
  return {db, deps, sent, setClock: (millis: number) => {
    clock = millis;
  }};
}

const plannerReply = (overrides: Record<string, unknown> = {}) => ({
  programId: "program-1", threadId: "program-1_household-1",
  text: "Yes, buses leave the lobby at 6.", idempotencyKey: "reply-key-0001",
  author: "planner" as const, actorUid: "manager-1", runId: null,
  cannedReplyId: null, expectedLastInboundAtMillis: now.toMillis(),
  ...overrides,
});

test("a planner reply is reserved, sent with a correlation and recorded",
  async () => {
    const ctx = await setup();
    const result = await sendProgramWhatsappText(ctx.deps, plannerReply());
    assert.equal(result.replayed, false);
    assert.equal(ctx.sent.length, 1);
    assert.equal(ctx.sent[0].toE164, guestPhone);
    assert.match(ctx.sent[0].callbackData!, /^ce-wa-status1\./);
    const thread = ctx.db.getDoc(threadPath)!;
    assert.equal(thread.state, "handled");
    assert.equal(thread.handledBy, "planner");
    assert.equal(thread.takenOverByUid, "manager-1");
    assert.equal(thread.lastMessageAuthor, "planner");
    const operation = [...ctx.db.docs.entries()].find(([path]) =>
      path.startsWith("programWhatsappReplyOperations/"))![1];
    assert.equal(validateOperation(operation), true,
      JSON.stringify(validateOperation.errors));
    assert.equal(operation.state, "completed");
    const dispatch = [...ctx.db.docs.entries()].find(([path]) =>
      path.startsWith("whatsappDispatches/"))![1];
    assert.equal(validateDispatch(dispatch), true,
      JSON.stringify(validateDispatch.errors));
    assert.equal(dispatch.kind, "service");
    assert.equal(dispatch.templateDocumentId, null);
    // The same key replays the stored message without a second send.
    const replay = await sendProgramWhatsappText(ctx.deps, plannerReply());
    assert.equal(replay.replayed, true);
    assert.equal(replay.messageId, result.messageId);
    assert.equal(ctx.sent.length, 1);
    await assert.rejects(sendProgramWhatsappText(ctx.deps,
      plannerReply({text: "Something else"})), code("already-exists"));
  });

test("the window, a newer guest message and a changed phone fail closed",
  async () => {
    const ctx = await setup();
    await assert.rejects(sendProgramWhatsappText(ctx.deps, plannerReply({
      expectedLastInboundAtMillis: now.toMillis() - 1})), code("aborted"));
    ctx.db.setDoc("programHouseholds/household-1", {
      ...ctx.db.getDoc("programHouseholds/household-1")!,
      primaryPhoneE164: "+919876509999"});
    await assert.rejects(sendProgramWhatsappText(ctx.deps, plannerReply()),
      code("failed-precondition"));
    ctx.setClock(now.toMillis() + 24 * 60 * 60 * 1000);
    await assert.rejects(sendProgramWhatsappText(ctx.deps, plannerReply({
      idempotencyKey: "reply-key-0002"})), code("failed-precondition"));
    assert.equal(ctx.sent.length, 0);
    // Nothing was left reserved by the refused attempts.
    assert.equal([...ctx.db.docs.keys()].some((path) =>
      path.startsWith("programWhatsappReplyOperations/")), false);
  });

test("an uncertain provider outcome holds the key as unknown", async () => {
  const ctx = await setup(() => ({sendText: async () => {
    throw new MetaProviderError("timeout", null, null, "outcomeUnknown");
  }}));
  await assert.rejects(sendProgramWhatsappText(ctx.deps, plannerReply()),
    code("unavailable"));
  await assert.rejects(sendProgramWhatsappText(ctx.deps, plannerReply()),
    code("failed-precondition"));
});

test("the assistant's service reply answers the thread without taking it",
  async () => {
    const ctx = await setup();
    const result = await sendProgramServiceReply({programId: "program-1",
      householdId: "household-1", text: "Bus at 6 from the lobby.",
      author: "assistant", runId: "run-1"}, ctx.deps);
    const thread = ctx.db.getDoc(threadPath)!;
    assert.equal(thread.handledBy, "assistant");
    assert.equal(thread.state, "handled");
    const message = ctx.db.getDoc(
      `programWhatsappMessages/${result.messageId}`)!;
    assert.equal(message.author, "assistant");
    assert.equal(message.runId, "run-1");
    const again = await sendProgramServiceReply({programId: "program-1",
      householdId: "household-1", text: "Bus at 6 from the lobby.",
      author: "assistant", runId: "run-1"}, ctx.deps);
    assert.equal(again.replayed, true);
  });

test("a delivery status moves the service reply forward", async () => {
  const ctx = await setup();
  const result = await sendProgramWhatsappText(ctx.deps, plannerReply());
  const dispatch = [...ctx.db.docs.entries()].find(([path]) =>
    path.startsWith("whatsappDispatches/"))![1] as unknown as
    ProgramWhatsappDispatchDocument;
  const at = now.toMillis() + 120_000;
  const providerEventId = `status:wamid.out1:delivered:${at}`;
  const eventId = "omwe_" + createHash("sha256").update(providerEventId)
    .digest("hex").slice(0, 48);
  ctx.db.setDoc(`organizerMessagingWebhookEvents/${eventId}`, {
    provider: "metaCloudApi", providerEventId, organizerId: "org-1",
    connectionId: "conn-1", eventKind: "status",
    providerMessageId: "wamid.out1", contextProviderMessageId: null,
    providerAccountId: "1111", providerPhoneNumberId: "2222",
    callbackData: whatsappStatusCorrelation(dispatch.attemptId,
      dispatch.payloadHash),
    inboundReply: null, deliveryStatus: "delivered", endpointHash: guestHash,
    isStop: false, hasReply: false, inboundBody: null,
    providerErrorCode: null, providerErrorEvidence: {kind: "none"},
    providerOccurredAt: ts(at), processingStatus: "pending",
    attemptCount: 0, createdAt: ts(at), processedAt: null,
    expiresAt: ts(at + 3_600_000)});
  ctx.db.setDoc(`organizerCampaignWebhookReceipts/${eventId}`, {
    provider: "metaCloudApi", providerEventId, organizerId: "org-1",
    connectionId: "conn-1", eventKind: "status", payloadHash: "f".repeat(64),
    createdAt: ts(at), expiresAt: ts(at + 3_600_000)});
  const store = new ProgramWhatsappDeliveryStore(
    ctx.db as unknown as Firestore, () => at + 1000);
  assert.deepEqual(await store.consumeQueued(eventId), {kind: "recorded",
    messageId: result.messageId, disposition: "applied"});
  assert.equal(ctx.db.getDoc(
    `programWhatsappMessages/${result.messageId}`)!.status, "delivered");
  assert.equal((await store.consumeQueued(eventId)).kind, "recorded");
});
